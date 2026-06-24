// Runder ethvert "HH:MM" (eller "HH.MM") til nærmeste kvarter, så gamle/skæve
// tider altid vises og gemmes som et lovligt kvarter.
export const snapToQuarter = (timeStr) => {
    if (!timeStr) return timeStr;
    const [h, m] = String(timeStr).replace('.', ':').split(':').map(Number);
    if (Number.isNaN(h)) return timeStr;
    let total = h * 60 + (Number.isNaN(m) ? 0 : m);
    total = Math.round(total / 15) * 15;
    if (total >= 24 * 60) total = 24 * 60 - 15; // hold inden for samme døgn
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};
