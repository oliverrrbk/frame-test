import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import { corsHeadersFor } from "../_shared/cors.ts"
import { resolveOwnCompanyId, ownCompanyOrWarn } from "../_shared/companyGuard.ts"

// Opretter et KLADDE-bilag (udgift) i e-conomics kassekladde og uploader
// billedet af kvitteringen som vedhæftning, så bogholderen kan tjekke og bogføre.
//
// Bruger samme auth som economic-invoice (X-AppSecretToken + grant token fra
// carpenter_secrets). Returnerer rigtige fejl — ingen falsk "success".
serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Mangler Authorization header')
    const jwt = authHeader.replace('Bearer ', '')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) throw new Error("Bruger ikke logget ind")

    const body = await req.json()
    const {
      companyId,                 // firma-id (token-ejer); fallback til brugerens eget id
      amount,                    // bruttobeløb på bilaget (inkl. moms)
      description,               // tekst på bilaget
      date,                      // 'YYYY-MM-DD' (default: i dag)
      fileData,                  // data-URL (base64) af billedet/PDF'en (gammelt format)
      filePath,                  // sti i privat 'bilag'-bucket (nyt format)
      fileName                   // filnavn
    } = body

    if (!amount || Number(amount) <= 0) throw new Error("Mangler et gyldigt beløb på bilaget")

    const voucherDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().split('T')[0]

    // SIKKERHED: firma-id udledes server-side fra kalderen; klientens companyId
    // bruges ikke til at vælge nøgle (forhindrer bogføring i et andet firmas e-conomic).
    const ownCompanyId = await resolveOwnCompanyId(supabaseClient, user.id)
    const targetCarpenterId = ownCompanyOrWarn(companyId, ownCompanyId, 'economic-voucher')

    // 1a. Hent konto-opsætningen fra firma-profilen (sat under Indstillinger → e-conomic)
    const { data: companyRow } = await supabaseClient
      .from('carpenters')
      .select('raw_data')
      .eq('id', targetCarpenterId)
      .single()
    const cfg = companyRow?.raw_data?.economic_voucher_config || {}
    let accountNumber = cfg.expenseAccount
    let contraAccountNumber = cfg.contraAccount
    const vatCode = cfg.vatCode || null
    // Auto-valg af konti sker længere nede (efter fetchEconomic er defineret), hvis de mangler.

    // 1b. Hent grant token
    const { data: secret, error: dbError } = await supabaseClient
      .from('carpenter_secrets')
      .select('economic_api_key')
      .eq('carpenter_id', targetCarpenterId)
      .single()

    if (dbError || !secret?.economic_api_key) throw new Error("Ingen e-conomic-forbindelse fundet for profilen")

    const economicToken = secret.economic_api_key
    const appSecretToken = Deno.env.get('E_CONOMIC_APP_SECRET')
    if (!appSecretToken) throw new Error("Mangler e-conomic App Secret Token i servermiljøet (E_CONOMIC_APP_SECRET)")

    const baseHeaders = {
      'X-AppSecretToken': appSecretToken,
      'X-AgreementGrantToken': economicToken,
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

    // 1c. Auto-vælg standardkonti hvis de ikke er sat i Indstillinger.
    //     Bilaget oprettes som en KLADDE i kassekladden (ikke bogført), så det er trygt
    //     at vælge fornuftige konti automatisk og lade brugeren rette dem bagefter.
    if (!accountNumber || !contraAccountNumber) {
      const accountsRes = await fetchEconomic('GET', '/accounts?pagesize=1000')
      const accounts = (accountsRes?.collection || []).filter((a: any) => a.barred !== true)
      const pickByName = (list: any[], keys: string[]) =>
        list.find((a) => keys.some((k) => String(a.name || '').toLowerCase().includes(k)))
      const pl = accounts.filter((a: any) => a.accountType === 'profitAndLoss')
      const st = accounts.filter((a: any) => a.accountType === 'status')

      if (!accountNumber) {
        const exp = pickByName(pl, ['vareforbrug', 'varekøb', 'materialer', 'fremmedarbejde', 'underleverand', 'håndværker', 'køb', 'driftsomkostning']) || pl[0]
        accountNumber = exp?.accountNumber
      }
      if (!contraAccountNumber) {
        const contra = pickByName(st, ['skyldige', 'kreditor', 'mellemregning', 'kassekredit', 'bank']) || st[0]
        contraAccountNumber = contra?.accountNumber
      }
      if (!accountNumber || !contraAccountNumber) {
        throw new Error("Kunne ikke finde standardkonti automatisk. Vælg udgiftskonto og modkonto under Indstillinger → e-conomic.")
      }

      // Gem valget, så fremtidige bilag automatisk bruger samme konti.
      try {
        const baseRaw = companyRow?.raw_data || {}
        await supabaseClient.from('carpenters').update({
          raw_data: { ...baseRaw, economic_voucher_config: { expenseAccount: String(accountNumber), contraAccount: String(contraAccountNumber), vatCode: vatCode || '' } }
        }).eq('id', targetCarpenterId)
        console.log('Auto-valgte bilagskonti:', accountNumber, contraAccountNumber)
      } catch (e) {
        console.error('Kunne ikke gemme auto-valgte konti:', (e as Error).message)
      }
    }

    // 2. Find en kassekladde (journal)
    const journals = await fetchEconomic('GET', '/journals?pagesize=50')
    if (!journals?.collection?.length) {
      throw new Error("Fandt ingen kassekladde (journal) i e-conomic. Opret en kassekladde i e-conomic først.")
    }
    const journalNumber = journals.collection[0].journalNumber
    console.log("Bruger journalNumber:", journalNumber)

    // 3. Find regnskabsåret der dækker bilagsdatoen
    const years = await fetchEconomic('GET', '/accounting-years?pagesize=200')
    let accountingYear: string | null = null
    for (const y of (years?.collection || [])) {
      if (y.fromDate && y.toDate && voucherDate >= y.fromDate.substring(0, 10) && voucherDate <= y.toDate.substring(0, 10)) {
        accountingYear = y.year
        break
      }
    }
    if (!accountingYear && years?.collection?.length) accountingYear = years.collection[0].year
    if (!accountingYear) throw new Error("Kunne ikke finde et regnskabsår der dækker bilagsdatoen")

    // 4. Opret kladde-bilaget (én finansbilags-postering: udgiftskonto mod modkonto)
    const financeVoucher: Record<string, unknown> = {
      text: description || `Bilag: ${fileName || 'udgift'}`,
      amount: Math.round((Number(amount) || 0) * 100) / 100,
      account: { accountNumber: Number(accountNumber) },
      contraAccount: { accountNumber: Number(contraAccountNumber) },
      currency: { code: "DKK" },
      date: voucherDate,
    }
    if (vatCode) financeVoucher.vatAccount = { vatCode }

    // e-conomic kræver at posteringer ligger i et "entries"-objekt (fejl E04040 ellers).
    const voucherPayload = [{
      accountingYear: { year: accountingYear },
      journal: { journalNumber },
      entries: {
        financeVouchers: [financeVoucher],
      },
    }]

    const created = await fetchEconomic('POST', `/journals/${journalNumber}/vouchers`, voucherPayload)
    console.log("Kladde-bilag oprettet:", JSON.stringify(created))

    // Træk voucher-nummer + regnskabsår ud af svaret (e-conomic kan svare som array eller objekt)
    const first = Array.isArray(created) ? created[0] : created
    const voucherNumber = first?.voucherNumber
      ?? first?.entries?.financeVouchers?.[0]?.voucherNumber
      ?? first?.financeVouchers?.[0]?.voucherNumber
      ?? first?.entries?.financeVouchers?.[0]?.voucher?.voucherNumber
    // Brug årstallet fra svaret hvis det findes (mest præcist til vedhæftnings-URL'en).
    const respYear = first?.accountingYear?.year ?? accountingYear
    if (!voucherNumber) {
      // Bilaget er oprettet, men vi kunne ikke finde nummeret til at vedhæfte billedet.
      return json({ success: true, attachmentUploaded: false, voucherNumber: null,
        message: "Bilag oprettet i e-conomic, men billedet kunne ikke vedhæftes automatisk (voucher-nummer ikke fundet). Tjek bilaget i kassekladden.", raw: created })
    }

    // 5. Find filen (enten base64 fra body eller download fra privat 'bilag'-bucket)
    let attachmentUploaded = false
    let attachmentError: string | null = null
    let blob: Blob | null = null
    try {
      if (fileData) {
        const m = /^data:([^;]+);base64,(.*)$/.exec(fileData)
        if (!m) throw new Error("Ugyldigt filformat (forventede data-URL base64)")
        const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0))
        blob = new Blob([bytes], { type: m[1] })
      } else if (filePath) {
        const { data: dl, error: dlErr } = await supabaseClient.storage.from('bilag').download(filePath)
        if (dlErr) throw new Error("Kunne ikke hente bilagsfil fra storage: " + dlErr.message)
        blob = dl
      }
    } catch (err) {
      attachmentError = (err as Error).message
      console.error("Kunne ikke klargøre fil:", attachmentError)
    }

    // 6. Upload som vedhæftning (multipart/form-data)
    if (blob) {
      try {
        const form = new FormData()
        form.append('file', blob, fileName || 'bilag')

        const attachPath = `/journals/${journalNumber}/vouchers/${respYear}-${voucherNumber}/attachment/file`
        const attachRes = await fetch(`https://restapi.e-conomic.com${attachPath}`, {
          method: 'POST',
          headers: baseHeaders, // BEMÆRK: ingen Content-Type — fetch sætter multipart-boundary selv
          body: form,
        })
        if (!attachRes.ok) {
          attachmentError = `${attachRes.status}: ${await attachRes.text()}`
          console.error("Vedhæftning fejlede:", attachmentError)
        } else {
          attachmentUploaded = true
        }
      } catch (err) {
        attachmentError = (err as Error).message
        console.error("Vedhæftning-undtagelse:", attachmentError)
      }
    } else if (!attachmentError) {
      attachmentError = "Ingen fil fundet på bilaget"
    }

    return json({
      success: true,
      attachmentUploaded,
      voucherNumber,
      accountingYear,
      message: attachmentUploaded
        ? `Bilag oprettet i e-conomic (bilagsnr ${voucherNumber}) med kvittering vedhæftet.`
        : `Bilag oprettet i e-conomic (bilagsnr ${voucherNumber}), men kvitteringsbilledet kunne ikke vedhæftes: ${attachmentError || 'ukendt fejl'}`,
    })
  } catch (error) {
    console.error("Fejl i economic-voucher function:", (error as Error).message)
    // Status 200 så frontenden pænt kan vise fejlteksten
    return json({ success: false, error: (error as Error).message })
  }
})
