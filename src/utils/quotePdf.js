// ============================================================================
// quotePdf.js — genererer et rent tilbuds-PDF for et MANUELT "Hurtigt tilbud".
// Samme jsPDF-mønster som buildOrderPdf i MaterialList, men for et tilbud.
// jsPDF hentes dynamisk (udskudt), så den ikke tynger app-skallen.
// ============================================================================

const kr = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---- Rich-text fra arbejdsbeskrivelsen (HTML) → blokke jsPDF kan tegne ----
// Understøtter: afsnit, linjeskift, fed, kursiv og punktlister.
function parseRichBlocks(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const blocks = [];
    const inline = (node, style) => {
        const runs = [];
        node.childNodes.forEach((ch) => {
            if (ch.nodeType === 3) {
                const t = ch.textContent.replace(/\s+/g, ' ');
                if (t) runs.push({ text: t, bold: !!style.bold, italic: !!style.italic });
            } else if (ch.nodeType === 1) {
                const tag = ch.tagName;
                if (tag === 'BR') { runs.push({ br: true }); return; }
                runs.push(...inline(ch, {
                    bold: style.bold || tag === 'B' || tag === 'STRONG' || /^H[1-6]$/.test(tag),
                    italic: style.italic || tag === 'I' || tag === 'EM',
                }));
            }
        });
        return runs;
    };
    const pushPara = (runs) => { if (runs.length) blocks.push({ type: 'para', runs }); };
    doc.body.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) {
            if (ch.textContent.trim()) pushPara([{ text: ch.textContent.replace(/\s+/g, ' '), bold: false, italic: false }]);
        } else if (ch.nodeType === 1) {
            const tag = ch.tagName;
            if (tag === 'UL' || tag === 'OL') {
                const items = [];
                ch.childNodes.forEach((li) => { if (li.nodeType === 1 && li.tagName === 'LI') items.push(inline(li, {})); });
                if (items.length) blocks.push({ type: 'list', items });
            } else {
                pushPara(inline(ch, {}));
            }
        }
    });
    return blocks;
}

function renderRich(pdf, blocks, o) {
    const fontOf = (r) => (r.bold && r.italic) ? 'bolditalic' : r.bold ? 'bold' : r.italic ? 'italic' : 'normal';
    let y = o.y;
    // Tilbuddet tegnes på ÉN lang side (ingen sideskift) — derfor ingen paginering her.
    const ensure = () => {};
    const spaceW = () => pdf.getTextWidth(' ');
    const drawRuns = (runs, startX, hangX) => {
        let cx = startX;
        ensure();
        runs.forEach((r) => {
            if (r.br) { y += o.lineGap; cx = hangX; ensure(); return; }
            pdf.setFont('helvetica', fontOf(r));
            r.text.split(' ').forEach((word) => {
                if (word === '') return;
                const w = pdf.getTextWidth(word);
                if (cx > hangX && cx + w > o.maxX) { y += o.lineGap; cx = hangX; ensure(); pdf.setFont('helvetica', fontOf(r)); }
                pdf.text(word, cx, y);
                cx += w + spaceW();
            });
        });
        y += o.lineGap;
    };
    blocks.forEach((b) => {
        pdf.setFontSize(o.size);
        pdf.setTextColor(...o.color);
        if (b.type === 'para') {
            drawRuns(b.runs, o.x, o.x);
        } else if (b.type === 'list') {
            b.items.forEach((item) => {
                ensure();
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(...o.color);
                pdf.text('•', o.x, y);
                drawRuns(item, o.x + 5, o.x + 5);
            });
        }
    });
    return y;
}

// quote = manual_quote-objektet (se QuickQuoteBuilder). carpenter = profil. customer = { name, email, phone, address }.
export async function buildQuotePdf(quote, carpenter, customer, opts = {}) {
    const { jsPDF } = await import('jspdf');

    const brand = [15, 23, 42];      // #0f172a
    const muted = [100, 116, 139];   // #64748b
    const line = [226, 232, 240];    // #e2e8f0
    const pageW = 210;
    const left = 16;
    const right = pageW - 16;

    // Sæt en relevant dokument-titel — vises i PDF-viewerens hjørne og foreslås ved "gem som".
    const docTitle = [
        'Tilbud',
        (customer?.name || '').trim(),
        opts.title ? opts.title.trim() : (opts.dateStr || ''),
    ].filter(Boolean).join(' – ');

    // Hele tilbuddet tegnes på ÉN sammenhængende side uden sideskift, så det aldrig
    // "hopper" ned på en ny side. Vi tegner derfor i to gennemløb: først måles den
    // samlede højde på en høj kladde-side, så oprettes den endelige side i præcis den
    // højde (A4-bredde). drawBody returnerer slut-y (bunden af indholdet).
    const drawBody = (pdf) => {
    let y = 20;

    // ---- Header: firmanavn (venstre) + TILBUD (højre) ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...brand);
    pdf.text((carpenter?.company_name || 'Tilbud').toUpperCase(), left, y);

    pdf.setFontSize(22);
    pdf.text('TILBUD', right, y, { align: 'right' });
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...muted);
    if (carpenter?.owner_name) pdf.text(carpenter.owner_name, left, y);
    const dateStr = opts.dateStr || '';
    if (dateStr) pdf.text(`Dato: ${dateStr}`, right, y, { align: 'right' });
    y += 4.5;
    if (carpenter?.email) { pdf.text(carpenter.email, left, y); y += 4.5; }
    if (carpenter?.phone) { pdf.text(carpenter.phone, left, y); y += 4.5; }

    y += 3;
    pdf.setDrawColor(...line);
    pdf.setLineWidth(0.4);
    pdf.line(left, y, right, y);
    y += 8;

    // ---- Kunde ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...brand);
    pdf.text('Til kunde', left, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...muted);
    if (customer?.name) { pdf.text(customer.name, left, y); y += 4.5; }
    if (customer?.address) { pdf.text(customer.address, left, y); y += 4.5; }
    if (customer?.email) { pdf.text(customer.email, left, y); y += 4.5; }
    if (customer?.phone) { pdf.text(customer.phone, left, y); y += 4.5; }

    // ---- Opgavetitel ----
    if (opts.title) {
        y += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...brand);
        pdf.text(opts.title, left, y);
        y += 4;
    }

    // ---- Evt. personlig besked (rich-text hvis udfyldt i editoren) ----
    const noteText = (quote?.noteHtml || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (noteText) {
        y += 4;
        y = renderRich(pdf, parseRichBlocks(quote.noteHtml), { x: left, maxX: right, y, lineGap: 5, size: 10, color: muted });
    } else if (quote?.note) {
        y += 4;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...muted);
        const noteLines = pdf.splitTextToSize(quote.note, right - left);
        pdf.text(noteLines, left, y);
        y += noteLines.length * 5;
    }

    y += 6;

    // ---- Linje-tabel (beskrivelse + beløb ekskl. moms) ----
    const rowsCol = right - 40;
    const drawRow = (label, amount, bold = false) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...(bold ? brand : muted));
        const wrapped = pdf.splitTextToSize(label, rowsCol - left);
        pdf.text(wrapped, left, y);
        pdf.text(`${kr(amount)} kr`, right, y, { align: 'right' });
        y += Math.max(wrapped.length * 5, 6);
    };

    // tabel-header — kun beskrivelse. Kunden ser ÉN samlet pris (ekskl. moms) nedenfor,
    // ikke opdelingen i materialer/arbejde/timer.
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...muted);
    pdf.text('BESKRIVELSE', left, y);
    y += 3;
    pdf.setDrawColor(...line);
    pdf.line(left, y, right, y);
    y += 6;

    // Samlet opgavebeskrivelse. Rich-text (fed/punkter/afsnit) hvis udfyldt i editoren,
    // ellers fald tilbage til de simple linjer / en neutral tekst.
    const richText = (quote?.workHtml || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (richText) {
        y = renderRich(pdf, parseRichBlocks(quote.workHtml), { x: left, maxX: right, y, lineGap: 5, size: 10, color: muted });
        y += 3;
    } else {
        const scopeLines = (quote?.workLines || []).filter(t => (t || '').trim());
        const scopeText = scopeLines.length
            ? scopeLines.map(t => `•  ${t}`).join('\n')
            : 'Udførelse af aftalt arbejde inkl. materialer.';
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...muted);
        const scopeWrapped = pdf.splitTextToSize(scopeText, right - left);
        pdf.text(scopeWrapped, left, y);
        y += scopeWrapped.length * 5 + 5;
    }

    pdf.setDrawColor(...line);
    pdf.line(left, y, right, y);
    y += 7;

    // ---- Totaler ----
    drawRow('I alt ekskl. moms', quote?.totalExVat, true);
    drawRow('Moms (25%)', quote?.vat);
    y += 1;
    pdf.setDrawColor(...brand);
    pdf.setLineWidth(0.6);
    pdf.line(left, y, right, y);
    y += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...brand);
    pdf.text('I ALT INKL. MOMS', left, y);
    pdf.text(`${kr(quote?.totalIncVat)} kr`, right, y, { align: 'right' });

    // ---- Betingelser & forbehold (samme ordlyd som det rigtige tilbud + kunde-accept-siden) ----
    const validityDays = quote?.validityDays || 14;
    y += 9;
    pdf.setDrawColor(...line);
    pdf.line(left, y, right, y);
    y += 7;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...brand);
    pdf.text(`Tak for tilliden. Dette tilbud er gældende i ${validityDays} dage fra ovenstående dato.`, left, y);
    y += 6;

    // Estimeret varighed vises kun når der er angivet timer (timepris-tilbud).
    const laborHours = Number(quote?.laborHours) || 0;
    if (laborHours > 0) {
        const weeks = Math.max(1, Math.ceil(laborHours / 37));
        const durText = `Estimeret varighed for udførelse: Ca. ${weeks} arbejdsuger. Den præcise opstartsdato aftales nærmere, når tilbuddet er bekræftet.`;
        const durLines = pdf.splitTextToSize(durText, right - left);
        pdf.text(durLines, left, y);
        y += durLines.length * 5 + 1;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    const abText = 'Arbejdet udføres i henhold til AB Forbruger (Almindelige Betingelser for byggearbejder), hvilket sikrer klare og trygge rammer for aftalen. Eventuelle uforudsete forhindringer (f.eks. skjult råd, svamp, ulovlige installationer eller asbest), der ikke med rimelighed kunne forudses ved tilbudsgivningen, er ikke inkluderet og vil blive udbedret i samråd til gældende timepris.';
    const abLines = pdf.splitTextToSize(abText, right - left);
    pdf.text(abLines, left, y);
    y += abLines.length * 4;

    return y; // bunden af indholdet
    };

    // ---- Pass 1: mål den samlede højde på en høj kladde-side ----
    const scratch = new jsPDF({ orientation: 'p', unit: 'mm', format: [pageW, 6000] });
    const contentBottom = drawBody(scratch);

    // ---- Pass 2: opret den endelige side i præcis den nødvendige højde (mindst A4) ----
    // Footeren skal have plads i bunden, så vi lægger lidt luft til.
    const footerY = Math.max(297, Math.ceil(contentBottom) + 18) - 10;
    const pageH = footerY + 10;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [pageW, pageH] });
    pdf.setProperties({ title: docTitle, subject: opts.title || 'Tilbud', author: carpenter?.company_name || '' });
    drawBody(pdf);

    // ---- Footer (i bunden af den lange side) ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(
        `${carpenter?.company_name || ''}${carpenter?.phone ? ' · ' + carpenter.phone : ''}${carpenter?.email ? ' · ' + carpenter.email : ''}`,
        pageW / 2, footerY, { align: 'center' }
    );

    const filename = `Tilbud_${(customer?.name || 'kunde').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const blob = pdf.output('blob');
    return { pdf, blob, filename };
}
