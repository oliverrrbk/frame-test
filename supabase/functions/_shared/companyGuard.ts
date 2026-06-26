// Tenant-spærre for regnskabs-funktionerne.
//
// PROBLEM (før): funktionerne valgte hvilket firmas regnskabsnøgle der skulle
// bruges ud fra et felt i request-body (`lead.carpenter_id` eller `companyId`).
// Da nøglen hentes med service-role (uden om RLS), kunne en hvilken som helst
// indlogget bruger sende ET ANDET firmas id og dermed fakturere/bogføre i det
// firmas e-conomic/Dinero.
//
// LØSNING: udled altid firma-id'et server-side fra den indloggede bruger selv,
// og IGNORÉR klientens værdi. For en legitim bruger er de to identiske, så
// adfærden er uændret (samme nøgle hentes som hidtil) — kun krydstenant-misbrug
// blokeres. Logger en advarsel hvis klienten sendte et afvigende id (synlighed).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

type SupabaseClient = ReturnType<typeof createClient>

// Firma-id = coalesce(company_id, id) — samme konvention som my_company_id() i DB.
export async function resolveOwnCompanyId(supabaseClient: SupabaseClient, userId: string): Promise<string> {
    const { data } = await supabaseClient
        .from('carpenters')
        .select('id, company_id')
        .eq('id', userId)
        .single()
    return (data?.company_id || data?.id || userId) as string
}

// Returnér det server-udledte firma-id; advar hvis klienten bad om et andet.
export function ownCompanyOrWarn(requested: unknown, ownCompanyId: string, label = ''): string {
    if (requested != null && String(requested) !== String(ownCompanyId)) {
        console.warn(`[tenant-guard${label ? ' ' + label : ''}] Ignorerer klient-leveret firma-id (${requested}) — bruger kalderens eget (${ownCompanyId}).`)
    }
    return ownCompanyId
}
