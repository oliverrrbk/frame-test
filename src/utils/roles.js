// Pæne danske rolle-labels. Brug ALTID denne i UI — vis aldrig de rå rolle-nøgler
// ('sales', 'worker', ...). 'sales' = Projektleder.
const ROLE_LABELS = {
    admin: 'Mester',
    boss: 'Mester',
    sales: 'Projektleder',
    lead: 'Projektleder',   // ældre/legacy nøgle
    pm: 'Projektleder',     // ældre/legacy nøgle
    worker: 'Svend',
    apprentice: 'Lærling',
    accountant: 'Bogholder',
    subcontractor: 'Underleverandør',
    guest: 'Gæst',
    super_admin: 'Admin',
};

const ROLE_SHORT = {
    admin: 'Mester',
    boss: 'Mester',
    sales: 'PL',
    lead: 'PL',
    pm: 'PL',
    worker: 'Svend',
    apprentice: 'Lærling',
    accountant: 'Bogholder',
    subcontractor: 'UL',
    guest: 'Gæst',
    super_admin: 'Admin',
};

export function getRoleLabel(role) {
    if (!role) return 'Medarbejder';
    return ROLE_LABELS[role] || 'Medarbejder';
}

export function getRoleShort(role) {
    if (!role) return 'Medarbejder';
    return ROLE_SHORT[role] || 'Medarbejder';
}
