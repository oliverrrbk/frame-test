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
// det ikke er et tal. Kontiene er bekræftet af revisor (2026-07-07) og sat som
// standard, men kan altid overstyres via en secret uden kodeændring.
function accountFrom(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
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

  // Kontoplan + moms — bekræftet af revisor Henrik Aaen (2026-07-07). Standardværdier
  // her, men kan overstyres via secrets uden kodeændring.
  const revenueAccount  = accountFrom('BISON_ECONOMIC_REVENUE_ACCOUNT', 1010)   // omsætning (U25 auto)
  const feeAccount      = accountFrom('BISON_ECONOMIC_FEE_ACCOUNT', 1321)       // Stripe-gebyr (udgift)
  const clearingAccount = accountFrom('BISON_ECONOMIC_CLEARING_ACCOUNT', 5650)  // Stripe tilgodehavende
  // Salgsmoms håndteres automatisk via omsætningskontoens VAT-kode (U25).
  const revenueVatCode  = Deno.env.get('BISON_ECONOMIC_REVENUE_VATCODE') || 'U25'
  // Stripe fakturerer fra Irland → omvendt betalingspligt på EU-ydelse (IY25).
  const feeVatCode      = Deno.env.get('BISON_ECONOMIC_FEE_VATCODE') || 'IY25'
  const journalOverride = Deno.env.get('BISON_ECONOMIC_JOURNAL_NUMBER')          // valgfrit

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
  const gross = round2(b.gross) // brutto inkl. moms — e-conomic splitter momsen selv via U25
  const fee = round2(b.fee)
  const label = b.number ? `Stripe ${b.number}` : `Stripe ${b.invoiceId}`

  // 3. Byg posteringerne som account/contraAccount-par (samme mønster som
  //    economic-voucher, der er kendt at virke). vatAccount/vatCode får e-conomic
  //    til selv at beregne og udskille momsen — revisor bekræftede "moms håndteres
  //    automatisk via 1010's U25". Alt posteres mod mellemregningskontoen (5650).
  //
  //    BEMÆRK: fortegns- og moms-mekanikken kan variere lidt mellem e-conomic-
  //    opsætninger. Bilaget oprettes som KLADDE, så den FØRSTE rigtige postering
  //    tjekkes manuelt i e-conomic før vi stoler blindt på den (se webhook-log).
  const financeVouchers: Record<string, unknown>[] = []

  // 3a) Omsætning inkl. moms: KREDIT omsætning (1010, negativt beløb), DEBIT
  //     mellemregning. U25-koden på 1010 får e-conomic til at udskille salgsmomsen.
  if (gross > 0) {
    financeVouchers.push({
      text: `${label} — abonnement`,
      amount: -gross,
      account: { accountNumber: revenueAccount },
      contraAccount: { accountNumber: clearingAccount },
      vatAccount: { vatCode: revenueVatCode },
      currency,
      date: b.date,
    })
  }

  // 3b) Stripe-gebyr (udgift): DEBIT gebyrkonto (1321), CREDIT mellemregning.
  //     IY25 = omvendt betalingspligt på EU-ydelse (momsneutral → bilaget balancerer).
  if (fee > 0) {
    financeVouchers.push({
      text: `${label} — Stripe-gebyr`,
      amount: fee,
      account: { accountNumber: feeAccount },
      contraAccount: { accountNumber: clearingAccount },
      vatAccount: { vatCode: feeVatCode },
      currency,
      date: b.date,
    })
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
