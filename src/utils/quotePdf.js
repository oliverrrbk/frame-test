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
// Understøtter: afsnit, overskrifter, linjeskift, fed, kursiv, understregning,
// skriftstørrelser, punkt-/nummererede lister, TABELLER og justering. HTML'en er
// på forhånd normaliseret af sanitizeHtml: p/h2/h3/ul/ol/li/b/i/u/br/table/tr/td
// + style="text-align:…" + style="font-size:…pt".
function parseRichBlocks(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const blocks = [];
    const sizeOf = (el) => {
        const m = ((el.getAttribute && el.getAttribute('style')) || '').match(/font-size:\s*([\d.]+)pt/);
        return m ? parseFloat(m[1]) : null;
    };
    const inline = (node, style) => {
        const runs = [];
        node.childNodes.forEach((ch) => {
            if (ch.nodeType === 3) {
                const t = ch.textContent.replace(/\s+/g, ' ');
                if (t) runs.push({ text: t, bold: !!style.bold, italic: !!style.italic, underline: !!style.underline, size: style.size || null });
            } else if (ch.nodeType === 1) {
                const tag = ch.tagName;
                if (tag === 'BR') { runs.push({ br: true }); return; }
                const cs = sizeOf(ch);
                runs.push(...inline(ch, {
                    bold: style.bold || tag === 'B' || tag === 'STRONG',
                    italic: style.italic || tag === 'I' || tag === 'EM',
                    underline: style.underline || tag === 'U',
                    size: cs != null ? cs : style.size,
                }));
            }
        });
        return runs;
    };
    const alignOf = (el) => {
        const m = ((el.getAttribute && el.getAttribute('style')) || '').match(/text-align:\s*(center|right|justify)/);
        return m ? (m[1] === 'justify' ? 'left' : m[1]) : 'left';
    };
    doc.body.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) {
            if (ch.textContent.trim()) blocks.push({ type: 'para', align: 'left', runs: [{ text: ch.textContent.replace(/\s+/g, ' ') }] });
            return;
        }
        if (ch.nodeType !== 1) return;
        const tag = ch.tagName;
        if (tag === 'TABLE') {
            const rows = [];
            ch.querySelectorAll('tr').forEach((tr) => {
                const cells = [];
                Array.from(tr.children).forEach((cell) => {
                    if (cell.tagName === 'TD' || cell.tagName === 'TH') {
                        cells.push({ runs: inline(cell, {}), head: cell.getAttribute('data-th') === '1' || cell.tagName === 'TH' });
                    }
                });
                if (cells.length) rows.push(cells);
            });
            if (rows.length) blocks.push({ type: 'table', rows });
        } else if (tag === 'UL' || tag === 'OL') {
            const items = [];
            ch.childNodes.forEach((li) => { if (li.nodeType === 1 && li.tagName === 'LI') items.push(inline(li, {})); });
            if (items.length) blocks.push({ type: 'list', ordered: tag === 'OL', items });
        } else if (tag === 'H1' || tag === 'H2') {
            const runs = inline(ch, {});
            if (runs.length) blocks.push({ type: 'heading', level: 2, align: alignOf(ch), runs });
        } else if (tag === 'H3' || tag === 'H4') {
            const runs = inline(ch, {});
            if (runs.length) blocks.push({ type: 'heading', level: 3, align: alignOf(ch), runs });
        } else {
            const runs = inline(ch, {});
            if (runs.length) blocks.push({ type: 'para', align: alignOf(ch), runs });
        }
    });
    return blocks;
}

function renderRich(pdf, blocks, o) {
    const fontOf = (r) => (r.bold && r.italic) ? 'bolditalic' : r.bold ? 'bold' : r.italic ? 'italic' : 'normal';
    const headingColor = o.headingColor || o.color;
    const tableBorder = [203, 213, 225];
    let y = o.y;
    // Største skriftstørrelse i en blok (så vi kan give nok luft over store overskrifter).
    const blockMaxSize = (b, base) => {
        let mx = base;
        (b.runs || []).forEach((r) => { if (r.size && r.size > mx) mx = r.size; });
        return mx;
    };

    // Bryd runs op i wrappede linjer (måler ord for ord, pr. skriftstørrelse) inden for maxW.
    // Hver linje: { segs:[{text,font,underline,size,w}], width, maxSize }.
    const layout = (runs, maxW, baseSize) => {
        const lines = [];
        let cur = { segs: [], width: 0, maxSize: baseSize };
        const pushLine = () => { lines.push(cur); cur = { segs: [], width: 0, maxSize: baseSize }; };
        (runs || []).forEach((r) => {
            if (r.br) { pushLine(); return; }
            const rs = r.size || baseSize;
            const font = fontOf(r);
            pdf.setFont('helvetica', font);
            pdf.setFontSize(rs);
            const sp = pdf.getTextWidth(' ');
            (r.text || '').split(' ').forEach((word) => {
                if (word === '') return;
                const ww = pdf.getTextWidth(word);
                if (cur.width > 0 && cur.width + sp + ww > maxW) pushLine();
                const atStart = cur.width === 0;
                const segW = (atStart ? 0 : sp) + ww;
                cur.segs.push({ text: (atStart ? '' : ' ') + word, font, underline: !!r.underline, size: rs, w: segW });
                cur.width += segW;
                if (rs > cur.maxSize) cur.maxSize = rs;
            });
        });
        if (cur.segs.length || lines.length === 0) pushLine();
        return lines;
    };

    // Tegn de wrappede linjer fra x, justeret efter align inden for [x, maxX].
    const drawLines = (lines, x, maxX, baseSize, baseGap, color, align) => {
        const maxW = maxX - x;
        lines.forEach((line) => {
            const gap = Math.max(baseGap, (line.maxSize || baseSize) * 0.46);
            let cx = x;
            if (align === 'center') cx = x + Math.max(0, (maxW - line.width) / 2);
            else if (align === 'right') cx = x + Math.max(0, maxW - line.width);
            line.segs.forEach((seg) => {
                pdf.setFont('helvetica', seg.font);
                pdf.setFontSize(seg.size || baseSize);
                pdf.setTextColor(...color);
                pdf.text(seg.text, cx, y);
                if (seg.underline) {
                    const tw = pdf.getTextWidth(seg.text);
                    pdf.setDrawColor(...color);
                    pdf.setLineWidth(0.35);
                    pdf.line(cx, y + 1.1, cx + tw, y + 1.1);
                }
                cx += seg.w;
            });
            y += gap;
        });
    };

    // Tegn en tabel som et rigtigt gitter med rammer og ombrudt celletekst.
    const drawTable = (rows) => {
        const cols = Math.max(1, ...rows.map((r) => r.length));
        const colW = (o.maxX - o.x) / cols;
        const padX = 2.2, padY = 2.2, cellSize = Math.min(o.size, 9.5);
        const cellGap = Math.max(4.4, cellSize * 0.5);
        const ascent = cellSize * 0.3528 * 0.82;
        y += 1.5;
        rows.forEach((row) => {
            const cellLines = [];
            for (let ci = 0; ci < cols; ci++) {
                cellLines.push(row[ci] ? layout(row[ci].runs, colW - 2 * padX, cellSize) : [{ segs: [], width: 0, maxSize: cellSize }]);
            }
            const maxLines = Math.max(1, ...cellLines.map((ls) => ls.length));
            const rowH = maxLines * cellGap + 2 * padY;
            let cx = o.x;
            for (let ci = 0; ci < cols; ci++) {
                const isHead = row[ci] && row[ci].head;
                if (isHead) { pdf.setFillColor(241, 245, 249); pdf.rect(cx, y, colW, rowH, 'F'); }
                pdf.setDrawColor(...tableBorder);
                pdf.setLineWidth(0.3);
                pdf.rect(cx, y, colW, rowH);
                let ty = y + padY + ascent;
                cellLines[ci].forEach((linerow) => {
                    let tx = cx + padX;
                    linerow.segs.forEach((seg) => {
                        const font = isHead ? (seg.font.includes('italic') ? 'bolditalic' : 'bold') : seg.font;
                        pdf.setFont('helvetica', font);
                        pdf.setFontSize(seg.size || cellSize);
                        pdf.setTextColor(...o.color);
                        pdf.text(seg.text, tx, ty);
                        tx += seg.w;
                    });
                    ty += cellGap;
                });
                cx += colW;
            }
            y += rowH;
        });
        y += 2.5;
    };

    // Luft over toppen, så en (evt. stor) første overskrift ikke rammer indholdet/stregen ovenfor.
    if (blocks.length) {
        const b0 = blocks[0];
        const base0 = b0.type === 'heading' ? (b0.level === 2 ? 12.5 : 11) : o.size;
        const mx0 = b0.type === 'table' ? o.size : blockMaxSize(b0, base0);
        y += mx0 * 0.34;
    }

    blocks.forEach((b, idx) => {
        if (b.type === 'heading') {
            const size = b.level === 2 ? 12.5 : 11;
            const realMax = blockMaxSize(b, size);
            const gap = Math.max(b.level === 2 ? 6.2 : 5.6, realMax * 0.46);
            if (idx > 0) y += realMax * 0.26;
            const runs = b.runs.map((r) => (r.br ? r : { ...r, bold: true }));
            drawLines(layout(runs, o.maxX - o.x, size), o.x, o.maxX, size, gap, headingColor, b.align);
            y += 1.5;
        } else if (b.type === 'table') {
            drawTable(b.rows);
        } else if (b.type === 'list') {
            let n = 1;
            b.items.forEach((item) => {
                const marker = b.ordered ? `${n}.` : '•';
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(o.size);
                pdf.setTextColor(...o.color);
                pdf.text(marker, o.x, y);
                const indent = o.x + (b.ordered ? Math.max(6, pdf.getTextWidth(`${n}. `)) : 5);
                drawLines(layout(item, o.maxX - indent, o.size), indent, o.maxX, o.size, o.lineGap, o.color, 'left');
                n++;
            });
            y += 1.5;
        } else {
            drawLines(layout(b.runs, o.maxX - o.x, o.size), o.x, o.maxX, o.size, o.lineGap, o.color, b.align);
            y += 1.5;
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
        y = renderRich(pdf, parseRichBlocks(quote.workHtml), { x: left, maxX: right, y, lineGap: 5, size: 10, color: muted, headingColor: brand });
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
