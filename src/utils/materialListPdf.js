// ============================================================================
// materialListPdf.js — genererer en ren LEVERANDØR-materialeliste som PDF.
// Det er en indkøbsliste til fx Davidsen: vare · mængde · enhed (INGEN priser).
// Samme jsPDF-mønster som buildQuotePdf (quotePdf.js) og buildOrderPdf
// (MaterialList.jsx), men uden beløb — leverandøren udfylder selv priserne.
// jsPDF hentes dynamisk (udskudt), så den ikke tynger app-skallen.
// ============================================================================

// Kendte beregner-/tilbuds-sektioner i fast rækkefølge, så listen altid er
// pænt grupperet. Ukendte (fx etape-sektioner) tilføjes til sidst.
const KNOWN_SECTIONS = ['Hovedmaterialer', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Underlag & Tilbehør', 'Afslutning', 'Forbrugsstoffer & Værktøj'];

const fmtDate = (d) => {
    try {
        if (!d) return '';
        return new Date(d).toLocaleDateString('da-DK');
    } catch { return ''; }
};

// items = [{ item, qty, unit, section }]. carpenter = profil.
// opts = { title, dateStr, caseNumber, note, deliveryInfo: { address, date, notes } }
export async function buildMaterialListPdf(items = [], carpenter, opts = {}) {
    const { jsPDF } = await import('jspdf');

    const brand = [15, 23, 42];      // #0f172a
    const muted = [100, 116, 139];   // #64748b
    const line = [226, 232, 240];    // #e2e8f0
    const headerBg = [243, 241, 237];

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const left = 14;
    const right = pageW - 14;

    const title = (opts.title || '').trim();
    const dateStr = opts.dateStr || fmtDate(new Date());
    const delivery = opts.deliveryInfo || {};

    const docTitle = ['Materialeliste', title, dateStr].filter(Boolean).join(' – ');
    pdf.setProperties({ title: docTitle, subject: title || 'Materialeliste', author: carpenter?.company_name || '' });

    // ---- Header ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(...brand);
    pdf.text('MATERIALELISTE', left, 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...muted);
    let y = 27;
    pdf.text(`Firma: ${carpenter?.company_name || carpenter?.owner_name || ''}`, left, y); y += 5;
    if (title) { pdf.text(`Opgave: ${title}`, left, y); y += 5; }
    pdf.text(`Dato: ${dateStr}`, left, y); y += 5;
    if (opts.caseNumber) { pdf.text(`Sagsnummer: ${opts.caseNumber}`, left, y); y += 5; }

    y += 2;
    pdf.setDrawColor(...line);
    pdf.setLineWidth(0.5);
    pdf.line(left, y, right, y);
    y += 8;

    // ---- Leveringsoplysninger (hvis udfyldt) ----
    if (delivery.address || delivery.date || delivery.notes) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(...brand);
        pdf.text('Leveringsoplysninger', left, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...muted);
        if (delivery.address) { pdf.text(`Leveringsadresse: ${delivery.address}`, left, y); y += 5; }
        pdf.text(`Ønsket levering: ${delivery.date ? fmtDate(delivery.date) : 'Hurtigst muligt'}`, left, y); y += 5;
        if (delivery.notes) {
            const noteLines = pdf.splitTextToSize(`Bemærkninger: ${delivery.notes}`, right - left);
            pdf.text(noteLines, left, y); y += noteLines.length * 5;
        }
        y += 3;
        pdf.line(left, y, right, y);
        y += 8;
    }

    // ---- Evt. personlig note til leverandøren ----
    const note = (opts.note || '').trim();
    if (note) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...muted);
        const nLines = pdf.splitTextToSize(note, right - left);
        pdf.text(nLines, left, y);
        y += nLines.length * 5 + 4;
    }

    // ---- Kolonne-header ----
    const qtyX = 132;   // mængde
    const unitX = 158;  // enhed
    const drawColHead = () => {
        pdf.setFillColor(...headerBg);
        pdf.rect(left, y, right - left, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...brand);
        pdf.text('Varebeskrivelse / Varenavn', left + 2, y + 5.5);
        pdf.text('Mængde', qtyX, y + 5.5);
        pdf.text('Enhed', unitX, y + 5.5);
        y += 8;
    };
    drawColHead();

    // ---- Sektioner (kendte først, derefter ukendte) ----
    const present = [...new Set(items.map(m => m.section || 'Hovedmaterialer'))];
    const sections = [
        ...KNOWN_SECTIONS.filter(s => present.includes(s)),
        ...present.filter(s => !KNOWN_SECTIONS.includes(s)),
    ];

    const ensureSpace = (need = 12) => {
        if (y > 285 - need) { pdf.addPage(); y = 20; drawColHead(); }
    };

    sections.forEach(sec => {
        const secItems = items.filter(m => (m.section || 'Hovedmaterialer') === sec);
        if (secItems.length === 0) return;

        ensureSpace(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...brand);
        pdf.text(sec.toUpperCase(), left, y + 6);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(left, y + 8, right, y + 8);
        y += 10;

        secItems.forEach(item => {
            ensureSpace(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(50, 50, 50);
            const splitTitle = pdf.splitTextToSize(String(item.item || ''), qtyX - left - 4);
            pdf.text(splitTitle, left + 2, y + 4);
            pdf.text(String(item.qty ?? ''), qtyX, y + 4);
            pdf.text(String(item.unit || ''), unitX, y + 4);
            const rowHeight = Math.max(splitTitle.length * 5, 8);
            y += rowHeight;
            pdf.setDrawColor(240, 240, 240);
            pdf.line(left, y, right, y);
            y += 2;
        });
        y += 4;
    });

    // ---- Footer på sidste side ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(
        `${carpenter?.company_name || ''}${carpenter?.phone ? ' · ' + carpenter.phone : ''}${carpenter?.email ? ' · ' + carpenter.email : ''}`,
        pageW / 2, 290, { align: 'center' }
    );

    const filename = `Materialeliste_${(title || carpenter?.company_name || 'liste').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const blob = pdf.output('blob');
    return { pdf, blob, filename };
}
