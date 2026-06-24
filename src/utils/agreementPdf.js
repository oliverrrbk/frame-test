// ============================================================================
// agreementPdf.js — genererer aftaleseddel-PDF'en (ekstraarbejde med underskrift).
// Samme jsPDF-mønster og layout som tidligere lå inline i AftalesedlerTab, men
// trukket ud så den kan genbruges tre steder:
//   1) når sedlen oprettes og gemmes,
//   2) når "Hent PDF" trykkes (regenereres hvis pdf_data mangler),
//   3) når sedlen sendes til kunden på mail som vedhæftning.
// jsPDF hentes dynamisk (udskudt), så den ikke tynger app-skallen.
// ============================================================================

// agreement = { title, description, priceType, amount, signature_data, date }
// carpenter  = profil-objektet (company_name, cvr)
// customer   = { name, address, caseNumber }
export async function buildAgreementPdf(agreement, carpenter, customer = {}) {
    const { jsPDF } = await import('jspdf'); // udskudt: hentes først ved PDF-generering
    const pdf = new jsPDF('p', 'mm', 'a4');
    const brandColor = [15, 23, 42];

    const dateObj = agreement?.date ? new Date(agreement.date) : new Date();

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    pdf.text('AFTALESEDDEL', 20, 30);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Dato: ${dateObj.toLocaleDateString('da-DK')}`, 150, 30);

    // Company Info (Tenant Branding)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(carpenter?.company_name || 'Håndværkerfirmaet', 20, 50);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`CVR: ${carpenter?.cvr || 'Ikke oplyst'}`, 20, 55);

    // Customer Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Kunde:', 120, 50);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${customer?.name || 'Ukendt'}`, 120, 55);
    pdf.text(`${customer?.address || ''}`, 120, 60);
    pdf.text(`Sag: ${customer?.caseNumber || ''}`, 120, 65);

    // Divider
    pdf.setDrawColor(226, 232, 240);
    pdf.line(20, 75, 190, 75);

    // Agreement Details
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Ekstraarbejde', 20, 90);

    pdf.setFontSize(12);
    pdf.text(agreement?.title || '', 20, 100);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const splitDescription = pdf.splitTextToSize(agreement?.description || '', 170);
    pdf.text(splitDescription, 20, 110);

    const descHeight = splitDescription.length * 5;

    // Price Details — beskriver prisvilkårene, så aftalesedlen er juridisk klar.
    const priceY = 110 + descHeight + 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Prisaftale:', 20, priceY);

    pdf.setFont('helvetica', 'normal');
    const priceLines = [];
    if (agreement?.priceType === 'fast_pris') {
        const amountStr = typeof agreement.amount === 'number'
            ? agreement.amount.toLocaleString('da-DK')
            : agreement.amount;
        priceLines.push(`Fast pris: ${amountStr} kr. inkl. moms.`);
        priceLines.push('Dette er en bindende, fast pris for det beskrevne ekstraarbejde.');
    } else {
        // Bevidst INGEN konkret timepris — kun "gældende timepris".
        priceLines.push('Udføres efter regning (medgået tid og materialer) til gældende timepris.');
        priceLines.push('Materialer afregnes til kostpris med tillæg af sædvanlig avance.');
        if (agreement?.amount) priceLines.push(`Vejledende estimat (ikke bindende): ${agreement.amount}.`);
        const hasFinal = agreement?.final_amount != null && agreement?.final_amount !== '';
        priceLines.push(hasFinal
            ? `Endelig pris: ${Number(agreement.final_amount).toLocaleString('da-DK')} kr. inkl. moms.`
            : 'Den endelige pris opgøres efter udført arbejde og fremgår af fakturaen.');
    }
    let py = priceY + 7;
    priceLines.forEach(l => {
        const wrapped = pdf.splitTextToSize(l, 170);
        pdf.text(wrapped, 20, py);
        py += wrapped.length * 5;
    });

    // Bekræftelses-/underskrifts-sektion.
    // VIGTIGT: underskriftslinjen vises KUN hvis sedlen rent faktisk er underskrevet
    // på pladsen. Sendes den til digital bekræftelse, må der ikke stå en underskriftslinje
    // (så tror kunden, de skal skrive under) — i stedet beskrives den digitale bekræftelse.
    const signed = !!agreement?.signature_data;
    const emailConfirmed = !signed && agreement?.confirmation?.method === 'email';

    const sigY = py + 22;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(20, sigY - 10, 190, sigY - 10);

    pdf.setFont('helvetica', 'bold');
    pdf.text(signed ? 'Underskrift' : 'Bekræftelse', 20, sigY);

    pdf.setFont('helvetica', 'normal');
    pdf.text('Kunden bekræfter hermed bestilling af ovenstående ekstraarbejde.', 20, sigY + 7);

    if (signed) {
        // Fysisk underskrift på pladsen.
        pdf.addImage(agreement.signature_data, 'PNG', 20, sigY + 15, 80, 40);
        pdf.setDrawColor(15, 23, 42);
        pdf.line(20, sigY + 60, 100, sigY + 60);
        pdf.text(customer?.name || 'Kundens underskrift', 20, sigY + 65);
    } else if (emailConfirmed) {
        // Digitalt bekræftet via mail — vis dokumentationen, ingen underskriftslinje.
        const at = agreement.confirmation?.at
            ? new Date(agreement.confirmation.at).toLocaleString('da-DK')
            : '';
        pdf.text(`Bekræftet digitalt af kunden via e-mail${at ? ` den ${at}` : ''}.`, 20, sigY + 16);
        if (agreement.confirmation?.ip) {
            pdf.setTextColor(100, 116, 139);
            pdf.text(`IP-adresse: ${agreement.confirmation.ip}`, 20, sigY + 22);
            pdf.setTextColor(15, 23, 42);
        }
    } else {
        // Endnu ikke bekræftet: ingen underskriftslinje — bekræftes digitalt af kunden.
        pdf.text('Bekræftes digitalt af kunden via e-mail.', 20, sigY + 16);
    }

    // Betingelses-linje nederst (samme standard som tilbud).
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const terms = pdf.splitTextToSize(
        'Arbejdet udføres i henhold til AB Forbruger. Aftalen er bindende ved kundens bekræftelse (underskrift eller digital bekræftelse).',
        170
    );
    pdf.text(terms, 20, 285);
    pdf.setTextColor(15, 23, 42);

    const dataUri = pdf.output('datauristring');
    const base64 = dataUri.substring(dataUri.indexOf(',') + 1); // ren base64 til mail-vedhæftning
    const blob = pdf.output('blob');

    return { pdf, blob, dataUri, base64 };
}
