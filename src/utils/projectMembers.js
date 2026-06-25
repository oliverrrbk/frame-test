// Data-lag for gæste-/projekt-medlemskaber (Ghost → Guest → Netværk).
// Tabel + RLS defineres i setup_guest_access.sql.
import { supabase } from '../supabaseClient';
import { mutateTimeEntries } from './timeEntries';

// Pæne danske labels for medlems-rollen PÅ en sag (project_members.role).
// Adskilt fra carpenters.role ('guest') — her er det fagrollen mester gav dem.
export const PROJECT_MEMBER_ROLE_LABELS = {
    subcontractor_owner: 'Underentreprenør (mester)',
    journeyman: 'Svend',
    apprentice: 'Lærling',
    project_manager: 'Projektleder',
};

export function getMemberRoleLabel(role) {
    return PROJECT_MEMBER_ROLE_LABELS[role] || 'Underentreprenør';
}

// Hent de medlemskaber den indloggede gæst selv har (RLS: "Gæst kan se sit eget medlemskab").
// Returnerer en map fra lead_id -> medlemskabs-række, så UI hurtigt kan slå rolle/firma op.
export async function fetchMyMemberships(authUserId) {
    if (!authUserId) return {};
    const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('status', 'active');
    if (error) {
        console.error('Kunne ikke hente projekt-medlemskaber:', error);
        return {};
    }
    const byLead = {};
    (data || []).forEach(m => { byLead[String(m.lead_id)] = m; });
    return byLead;
}

// Log gæstens egne timer på en sag. Tagges `external: true` + identitet, så Mester
// kan vise dem som "eksterne timer" og HOLDE DEM UDE af lønkørslen.
// Skrivningen går gennem mutate_time_entries (atomisk) + RLS-grenen is_project_member,
// og protect_lead_sensitive_fields() sikrer at kun time_entries reelt ændres.
export async function logGuestTimeEntry({ leadId, profile, entry }) {
    const full = {
        ...entry,
        id: entry.id || `guest-time-${Date.now()}`,
        external: true,
        employeeId: profile?.id,
        employeeName: profile?.owner_name || profile?.company_name || profile?.email || 'Gæst',
        companyName: profile?.company_name || null,
    };
    return mutateTimeEntries({ table: 'leads', id: leadId, add: [full] });
}
