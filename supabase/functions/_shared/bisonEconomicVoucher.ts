// ============================================================================
// Bison Company's EGET regnskab — bogfør Stripe-abonnementsindtægter automatisk.
// ============================================================================
// Kaldes fra stripe-webhook når en abonnementsfaktura betales (invoice.paid).
// Opretter et KLADDE-bilag i BISONS egen e-conomic-aftale med tre posteringer:
//
//   1) Omsætning (ekskl. moms)   → krediteres omsætningskontoen
//   2) Salgsmoms 25 %            → krediteres momskontoen
//   3) Stripe-gebyr (udgift)     → debiteres gebyr-udgiftskontoen (evt. omvendt moms)
//
// Alle tre posteres MOD en "Stripe-mellemregning"-konto, så saldoen på den konto
// præcist svarer til det nettobeløb Stripe senere udbetaler til banken → nem
// bankafstemning. Bilaget er en KLADDE — revisoren tjekker og trykker "Bogfør".
//
// Alt styres af server-secrets (single-tenant = Bison selv). Ingen hardkodede
// kontonumre. Kaster ved manglende opsætning, så vi ALDRIG bogfører forkert.
// ============================================================================

export interface BisonBooking {
  invoiceId: string        // Stripe-faktura-id (til idempotens/audit)
  number: string | null    // Stripe-fakturanummer (til bilagsteksten)
  description: string       // tekst på bilaget
  date: string              // 'YYYY-MM-DD' (fakturaens betalingsdato)
  currency: string          // fx 'DKK'
  gross: number             // bruttobeløb kunden betalte (inkl. moms)
  vat: number               // salgsmoms-andelen (0 hvis momsfrit)
  fee: number               // Stripe-gebyr trukket fra betalingen (udgift)
  pdfBytes: Uint8Array | null // Stripe-fakturaens PDF (bilag), hvis hentet
  pdfName: string
}

export interface BisonBookingResult {
  voucherNumber: number | string | null
  accountingYear: string | null
  attachmentUploaded: boolean
  attachmentError: string | null
}

// Læs et påkrævet kontonummer fra miljøet. Kaster med en tydelig besked hvis
// det mangler eller ikke er et tal — så en fejlkonfiguration stopper bogføringen
// i stedet for at lave et skævt bilag.
function requiredAccount(name: string): number {
  const raw = Deno.env.get(name)
  if (!raw) throw new Error(`Mangler kontonummer i servermiljøet: ${name}`)
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`${name} er ikke et gyldigt kontonummer: "${raw}"`)
  return n
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export async function bookStripeIncomeToEconomic(b: BisonBooking): Promise<BisonBookingResult> {
  const grantToken = Deno.env.get('BISON_ECONOMIC_GRANT_TOKEN')
  const appSecretToken = Deno.env.get('E_CONOMIC_APP_SECRET')
  if (!grantToken) throw new Error('Mangler BISON_ECONOMIC_GRANT_TOKEN (Bisons egen e-conomic-aftale)')
  if (!appSecretToken) throw new Error('Mangler E_CONOMIC_APP_SECRET i servermiljøet')

  // Kontoplan + moms fra secrets. Alle er påkrævede undtagen moms-koden på gebyret.
  const revenueAccount  = requiredAccount('BISON_ECONOMIC_REVENUE_ACCOUNT')   // omsætning
  const vatAccount      = requiredAccount('BISON_ECONOMIC_VAT_ACCOUNT')       // salgsmoms
  const feeAccount      = requiredAccount('BISON_ECONOMIC_FEE_ACCOUNT')       // Stripe-gebyr (udgift)
  const clearingAccount = requiredAccount('BISON_ECONOMIC_CLEARING_ACCOUNT')  // Stripe-mellemregning
  const feeVatCode      = Deno.env.get('BISON_ECONOMIC_FEE_VATCODE') || null  // fx 'I25' (omvendt betalingspligt)
  const journalOverride = Deno.env.get('BISON_ECONOMIC_JOURNAL_NUMBER')       // valgfrit

  const baseHeaders = {
    'X-AppSecretToken': appSecretToken,
    'X-AgreementGrantToken': grantToken,
  }

  const fetchEconomic = async (method: string, path: string, data: unknown = null) => {
    const options: RequestInit = { method, headers: { ...baseHeaders, 'Content-Type': 'application/json' } }
    if (data) options.body = JSON.stringify(data)
    const res = await fetch(`https://restapi.e-conomic.com${path}`, options)
    const text = await res.text()
    if (!res.ok) {
      console.error(`e-conomic fejl (${method} ${path}):`, res.status, text)
      throw new Error(`e-conomic API fejl (${res.status}) på ${path}: ${text}`)
    }
    return text ? JSON.parse(text) : null
  }

  // 1. Find kassekladden (journal) — enten den valgte eller den første.
  const journals = await fetchEconomic('GET', '/journals?pagesize=50')
  if (!journals?.collection?.length) {
    throw new Error('Fandt ingen kassekladde (journal) i Bisons e-conomic. Opret en kassekladde først.')
  }
  const journalNumber = journalOverride
    ? Number(journalOverride)
    : journals.collection[0].journalNumber

  // 2. Find regnskabsåret der dækker bilagsdatoen.
  const years = await fetchEconomic('GET', '/accounting-years?pagesize=200')
  let accountingYear: string | null = null
  for (const y of (years?.collection || [])) {
    if (y.fromDate && y.toDate && b.date >= y.fromDate.substring(0, 10) && b.date <= y.toDate.substring(0, 10)) {
      accountingYear = y.year
      break
    }
  }
  if (!accountingYear && years?.collection?.length) accountingYear = years.collection[0].year
  if (!accountingYear) throw new Error('Kunne ikke finde et regnskabsår der dækker fakturadatoen')

  const currency = { code: (b.currency || 'DKK').toUpperCase() }
  const netRevenue = round2(b.gross - b.vat) // omsætning ekskl. moms
  const vat = round2(b.vat)
  const fee = round2(b.fee)
  const label = b.number ? `Stripe ${b.number}` : `Stripe ${b.invoiceId}`

  // 3. Byg posteringerne som account/contraAccount-par (samme mønster som
  //    economic-voucher, der er kendt at virke). Positivt beløb = DEBIT account,
  //    CREDIT contraAccount. Alt posteres mod mellemregningskontoen.
  //
  //    Nettoeffekt på mellemregningen = netRevenue + vat - fee = brutto - gebyr
  //    = præcis det Stripe udbetaler til banken.
  const financeVouchers: Record<string, unknown>[] = []

  // 3a) Omsætning: DEBIT mellemregning, CREDIT omsætning (netto ekskl. moms).
  if (netRevenue > 0) {
    financeVouchers.push({
      text: `${label} — omsætning`,
      amount: netRevenue,
      account: { accountNumber: clearingAccount },
      contraAccount: { accountNumber: revenueAccount },
      currency,
      date: b.date,
    })
  }

  // 3b) Salgsmoms: DEBIT mellemregning, CREDIT momskonto.
  if (vat > 0) {
    financeVouchers.push({
      text: `${label} — salgsmoms`,
      amount: vat,
      account: { accountNumber: clearingAccount },
      contraAccount: { accountNumber: vatAccount },
      currency,
      date: b.date,
    })
  }

  // 3c) Stripe-gebyr (udgift): DEBIT gebyrkonto, CREDIT mellemregning.
  //     Sæt evt. omvendt-betalingspligt-momskode — den er momsneutral, så
  //     bilaget balancerer stadig.
  if (fee > 0) {
    const feeEntry: Record<string, unknown> = {
      text: `${label} — Stripe-gebyr`,
      amount: fee,
      account: { accountNumber: feeAccount },
      contraAccount: { accountNumber: clearingAccount },
      currency,
      date: b.date,
    }
    if (feeVatCode) feeEntry.vatAccount = { vatCode: feeVatCode }
    financeVouchers.push(feeEntry)
  }

  if (financeVouchers.length === 0) {
    throw new Error('Intet at bogføre (beløb er 0)')
  }

  // 4. Opret kladde-bilaget.
  const voucherPayload = [{
    accountingYear: { year: accountingYear },
    journal: { journalNumber },
    entries: { financeVouchers },
  }]

  const created = await fetchEconomic('POST', `/journals/${journalNumber}/vouchers`, voucherPayload)
  console.log('Bison kladde-bilag oprettet:', JSON.stringify(created))

  const first = Array.isArray(created) ? created[0] : created
  const voucherNumber = first?.voucherNumber
    ?? first?.entries?.financeVouchers?.[0]?.voucherNumber
    ?? first?.financeVouchers?.[0]?.voucherNumber
    ?? first?.entries?.financeVouchers?.[0]?.voucher?.voucherNumber
    ?? null
  const respYear = first?.accountingYear?.year ?? accountingYear

  // 5. Vedhæft Stripe-fakturaens PDF som bilag (hvis vi har den og et bilagsnr).
  let attachmentUploaded = false
  let attachmentError: string | null = null
  if (b.pdfBytes && voucherNumber) {
    try {
      const form = new FormData()
      form.append('file', new Blob([b.pdfBytes], { type: 'application/pdf' }), b.pdfName || 'stripe.pdf')
      const attachPath = `/journals/${journalNumber}/vouchers/${respYear}-${voucherNumber}/attachment/file`
      const attachRes = await fetch(`https://restapi.e-conomic.com${attachPath}`, {
        method: 'POST',
        headers: baseHeaders, // ingen Content-Type — fetch sætter multipart-boundary selv
        body: form,
      })
      if (!attachRes.ok) {
        attachmentError = `${attachRes.status}: ${await attachRes.text()}`
        console.error('Vedhæftning af Stripe-PDF fejlede:', attachmentError)
      } else {
        attachmentUploaded = true
      }
    } catch (err) {
      attachmentError = (err as Error).message
      console.error('Vedhæftning-undtagelse:', attachmentError)
    }
  } else if (!b.pdfBytes) {
    attachmentError = 'Ingen Stripe-PDF at vedhæfte'
  } else if (!voucherNumber) {
    attachmentError = 'Bilag oprettet, men voucher-nummer ikke fundet i svaret'
  }

  return { voucherNumber, accountingYear: String(respYear), attachmentUploaded, attachmentError }
}
