// Fælles udløbslogik for tilbud — bruges både i dashboardet (mester) og på den
// offentlige bekræftelses-side (kunde), så de altid er enige om gyldigheden.
//
// Gyldigheden løber fra det tidspunkt tilbuddet blev SENDT (quote_sent_at),
// med fallback til lead.created_at for gamle tilbud uden afsendt-stempel.
// En eksplicit forlængelse (quote_settings.validUntil, ISO-streng) vinder altid.

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_VALIDITY_DAYS = 14;

const toDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Beregn udløbsstatus for et tilbud.
 * @param {object} lead - lead-objektet (med raw_data)
 * @param {Date} [now] - referencetidspunkt (default: nu)
 * @returns {{ expiresAt: Date|null, isExpired: boolean, daysLeft: number|null,
 *            validityDays: number, isExtended: boolean }}
 */
export const computeQuoteExpiry = (lead, now = new Date()) => {
    const settings = lead?.raw_data?.quote_settings || {};
    const validityDays = Number(settings.validityDays) || DEFAULT_VALIDITY_DAYS;

    const validUntil = toDate(settings.validUntil);
    const sentAt = toDate(lead?.raw_data?.quote_sent_at) || toDate(lead?.created_at);

    let expiresAt = null;
    if (validUntil) {
        expiresAt = validUntil;
    } else if (sentAt) {
        expiresAt = new Date(sentAt.getTime() + validityDays * DAY_MS);
    }

    const isExpired = expiresAt ? now.getTime() > expiresAt.getTime() : false;
    const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS)
        : null;

    return {
        expiresAt,
        isExpired,
        daysLeft,
        validityDays,
        isExtended: !!validUntil
    };
};
