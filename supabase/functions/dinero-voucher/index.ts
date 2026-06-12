import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import { corsHeadersFor } from "../_shared/cors.ts"
import { getValidDineroToken } from "../_shared/dineroToken.ts"

// Opretter et købs-bilag (udgift) i Dinero og vedhæfter billedet af kvitteringen,
// så det står klar til bogføring. Samme princip som economic-voucher.
//
// Flow: upload fil -> få FileGuid -> opret købsbilag med beløb + FileGuid.
// Returnerer rigtige fejl — ingen falsk "success".
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
    const { companyId, amount, description, date, fileData, filePath, fileName } = body

    if (!amount || Number(amount) <= 0) throw new Error("Mangler et gyldigt beløb på bilaget")

    const voucherDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().split('T')[0]
    const targetCarpenterId = companyId || user.id

    // 1a. Konto-opsætning fra firma-profilen
    const { data: companyRow } = await supabaseClient
      .from('carpenters').select('raw_data').eq('id', targetCarpenterId).single()
    const cfg = companyRow?.raw_data?.dinero_voucher_config || {}
    const accountNumber = cfg.expenseAccount
    const vatCode = cfg.vatCode || null
    if (!accountNumber) {
      throw new Error("Manglende konto-opsætning. Vælg udgiftskonto under Indstillinger → Dinero, før bilag kan overføres.")
    }

    // 1b. Hent et gyldigt Dinero access token (forny automatisk hvis udløbet)
    const accessToken = await getValidDineroToken(supabaseClient, targetCarpenterId)

    const fetchDinero = async (method: string, path: string, data: unknown = null) => {
      const options: RequestInit = { method, headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      if (data) options.body = JSON.stringify(data)
      const res = await fetch(`https://api.dinero.dk/v1${path}`, options)
      const text = await res.text()
      if (!res.ok) {
        console.error(`Dinero fejl (${method} ${path}):`, res.status, text)
        throw new Error(`Dinero API fejl (${res.status}) på ${path}: ${text}`)
      }
      return text ? JSON.parse(text) : null
    }

    // 2. Find organisation
    const orgs = await fetchDinero('GET', '/organizations')
    if (!orgs?.length) throw new Error("Ingen virksomhed fundet på Dinero kontoen")
    const orgId = orgs[0].id

    // 3. Klargør filen (base64 fra body eller download fra privat 'bilag'-bucket)
    let blob: Blob | null = null
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

    // 4. Upload filen til Dinero (multipart) -> FileGuid
    let fileGuid: string | null = null
    if (blob) {
      const form = new FormData()
      form.append('file', blob, fileName || 'bilag')
      const uploadRes = await fetch(`https://api.dinero.dk/v1/${orgId}/files/?fileName=${encodeURIComponent(fileName || 'bilag')}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }, // ingen Content-Type — boundary sættes automatisk
        body: form,
      })
      const upText = await uploadRes.text()
      if (!uploadRes.ok) throw new Error(`Dinero fil-upload fejl (${uploadRes.status}): ${upText}`)
      let parsed: unknown = null
      try { parsed = upText ? JSON.parse(upText) : null } catch { parsed = upText }
      fileGuid = (typeof parsed === 'string') ? parsed
        : ((parsed as Record<string, string>)?.FileGuid || (parsed as Record<string, string>)?.Guid || (parsed as Record<string, string>)?.fileGuid || null)
      if (!fileGuid) throw new Error("Dinero returnerede ingen FileGuid efter upload")
    }

    // 5. Opret købsbilag med beløb + vedhæftet fil
    const voucherPayload: Record<string, unknown> = {
      ExternalReference: description || (fileName || 'Bilag'),
      VoucherDate: voucherDate,
      Lines: [{
        Description: description || 'Udgift',
        AccountNumber: Number(accountNumber),
        Amount: Number(amount),
        ...(vatCode ? { VatCode: vatCode } : {})
      }]
    }
    if (fileGuid) voucherPayload.FileGuid = fileGuid

    const created = await fetchDinero('POST', `/${orgId}/vouchers/purchase`, voucherPayload)
    const voucherNumber = created?.VoucherNumber ?? created?.Guid ?? created?.voucherGuid ?? null

    return json({
      success: true,
      attachmentUploaded: !!fileGuid,
      voucherNumber,
      message: fileGuid
        ? `Bilag oprettet i Dinero${voucherNumber ? ` (nr ${voucherNumber})` : ''} med kvittering vedhæftet.`
        : `Bilag oprettet i Dinero${voucherNumber ? ` (nr ${voucherNumber})` : ''} (ingen fil var vedhæftet).`,
    })
  } catch (error) {
    console.error("Fejl i dinero-voucher function:", (error as Error).message)
    return json({ success: false, error: (error as Error).message })
  }
})
