const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #e0f2fe 0%, #fce7f3 50%, #ffedd5 100%);
    background-color: #f8fafc;
    color: #0f172a;
    line-height: 1.6;
    margin: 0;
    padding: 60px 20px;
    min-height: 100vh;
`;

const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.5);
`;

const contentStyle = `
    padding: 40px;
`;

const buttonStyle = `
    display: inline-block;
    padding: 14px 28px;
    background-color: #10b981;
    color: #ffffff;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
`;

// ---------------------------------------------------------------------------
// Personlig afsender-signatur (Mads) til interne Bison-mails.
// TEAM_PHOTO_URL: indsæt en ABSOLUT URL til det professionelle portrætfoto, når
// det er klart (fx 'https://bisonframe.dk/mads.jpg'). Mail kan ikke vise lokale
// filer. Så længe den er tom, viser signaturen automatisk en cirkel med
// initialer i stedet — så mailen aldrig viser et brækket billede.
const TEAM_PHOTO_URL = '';

// Bygger en signatur-blok: rundt foto (eller initial-cirkel) til venstre,
// navn/titel til højre. Bordbaseret layout for at virke i alle mailklienter.
const getSignatureBlock = (name, title, photoUrl = TEAM_PHOTO_URL) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const avatar = photoUrl
        ? `<img src="${photoUrl}" alt="${name}" width="64" height="64" style="display: block; width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0;" />`
        : `<div style="width: 64px; height: 64px; border-radius: 50%; background-color: #0f172a; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 64px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${initials}</div>`;
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
            <tr>
                <td style="vertical-align: middle; padding-right: 16px;">${avatar}</td>
                <td style="vertical-align: middle;">
                    <p style="color: #0f172a; font-weight: 600; margin: 0; font-size: 15px;">${name}</p>
                    <p style="color: #64748b; font-size: 13px; margin: 2px 0 0 0;">${title}</p>
                </td>
            </tr>
        </table>
    `;
};

export const getCarpenterSenderName = (carpenter) => {
    const companyName = carpenter?.company_name || 'Tømreren';
    const fullName = carpenter?.owner_name || carpenter?.contact_person || '';
    const firstName = fullName.split(' ')[0];
    return firstName ? `${firstName} fra ${companyName}` : companyName;
};

const footerStyle = `
    padding: 24px 40px;
    background-color: #f1f5f9;
    color: #64748b;
    font-size: 14px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
`;

const getBaseTemplate = (title, content, preheader = "", carpenter = null) => {
    // Dynamisk Header: Logo eller Firmanavn (Udenfor kortet, mørk tekst).
    // White-label: når mailen er fra en tømrer (carpenter sat), viser vi KUN
    // tømrerens logo/firmanavn — intet Bison-logo. Kun rene interne mails
    // (carpenter = null) falder tilbage til Bison-branding.
    const headerContent = carpenter?.logo_url
        ? `<img src="${carpenter.logo_url}" alt="${carpenter.company_name || ''}" style="max-height: 60px; max-width: 200px; display: inline-block; vertical-align: middle;" />${carpenter.company_name ? `<div style="margin-top: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; color: #0f172a;">${carpenter.company_name}</div>` : ''}`
        : `<h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #0f172a;">${carpenter?.company_name || 'BISON FRAME'}</h1>`;

    // Dynamisk Footer (white-label: ingen "leveret af Bison Frame" til kunden).
    const footerContent = carpenter
        ? `
            <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-weight: 600; color: #334155;">${carpenter.company_name || ''}</p>
                <p style="margin: 2px 0; color: #64748b;">${carpenter.phone || ''} | ${carpenter.email || ''}</p>
                <p style="margin: 2px 0; color: #64748b;">${carpenter.address || ''}</p>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; font-style: italic;">Denne e-mail indeholder persondata. Ønsker du at gøre brug af din ret til at få slettet dine oplysninger (GDPR), kan du blot besvare denne e-mail direkte til virksomheden.</p>
          `
        : `<div style="text-align: center; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a;">Bison Company</div>
                <div style="width: 28px; height: 2px; background-color: #0f172a; margin: 10px auto; border-radius: 2px;"></div>
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #475569;">Med ærlighed kommer man længst</p>
                <p style="margin: 8px 0 0 0; font-size: 11px; letter-spacing: 0.04em; color: #94a3b8;">CVR 45899713</p>
           </div>
           <p style="margin: 0 0 8px 0;">Denne e-mail er sendt via Bison Frame - Din professionelle tilbudsplatform.</p>
           <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; font-style: italic;">Denne e-mail indeholder persondata. Ønsker du at gøre brug af din ret til at få slettet dine oplysninger (GDPR), kan du blot besvare denne e-mail direkte til virksomheden.</p>`;

    // Copyright: tømrerens eget navn til kunden, ellers Bison (interne mails).
    const copyrightName = carpenter?.company_name || 'Bison Frame';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="${baseStyle}">
    <span style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>
    
    <div style="max-width: 600px; margin: 0 auto 24px auto; text-align: center;">
        ${headerContent}
    </div>

    <div style="${containerStyle}">
        <div style="${contentStyle}">
            ${content}
        </div>
        <div style="${footerStyle}">
            ${footerContent}
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} ${copyrightName}. Alle rettigheder forbeholdes.</p>
        </div>
    </div>
</body>
</html>
`;
};

// Intern anmodning til Bison om gratis hjælp til DNS/leverbarhed (SPF/DMARC).
// Bison Frame-brandet (carpenter = null) — lækker, overskuelig skabelon, selvom
// den er til os selv. Viser firma-kort, KUN de records der mangler (med den konkrete
// DNS-record) og en trin-for-trin-guide til den gættede udbyder.
// data = { firm, ownerName, domain, email, phone, checks, guide }
export const getDnsHelpRequestTemplate = (data = {}) => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const { firm, ownerName, domain, email, phone, checks = {}, guide } = data;

    const labelFor = (k) => ({ spf: 'SPF', dmarc: 'DMARC', mx: 'MX (mailserver)', dkim: 'DKIM' }[k] || k);
    const statusText = (st) => ({ pass: 'OK', warn: 'Anbefales', fail: 'Mangler', info: 'Info' }[st] || 'Ukendt');
    const statusColor = (st) => ({ pass: '#16a34a', warn: '#b45309', fail: '#b91c1c', info: '#64748b' }[st] || '#64748b');

    // Kun de records der kræver handling (warn/fail) — med den konkrete DNS-record.
    const todo = Object.entries(checks).filter(([, c]) => c && (c.status === 'warn' || c.status === 'fail'));
    const todoHtml = todo.length ? todo.map(([k, c]) => `
        <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:#0f172a;">${labelFor(k)}</strong>
                <span style="font-size:12px;font-weight:700;color:${statusColor(c.status)};">${statusText(c.status)}</span>
            </div>
            <div style="font-size:13px;color:#92400e;margin-top:4px;">${esc(c.message)}</div>
            ${c.suggestion ? `<div style="margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#0f172a;color:#e2e8f0;padding:8px 10px;border-radius:8px;word-break:break-all;">${esc(c.suggestion)}</div>` : ''}
        </div>`).join('') : `<p style="color:#334155;">Alt ser umiddelbart fint ud — brugeren vil bare gerne have det gennemgået.</p>`;

    const stepsHtml = guide?.steps?.length ? `
        <h3 style="margin:24px 0 6px;color:#0f172a;font-size:16px;">Sådan sætter man det op — ${esc(guide.label)}</h3>
        ${guide.intro ? `<p style="color:#475569;font-size:13px;margin:0 0 8px;">${esc(guide.intro)}</p>` : ''}
        <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
            ${guide.steps.map(s => `<li style="margin-bottom:4px;">${esc(s)}</li>`).join('')}
        </ol>` : '';

    const content = `
        <h2 style="margin-top:0;color:#0f172a;font-size:20px;">Anmodning om gratis hjælp</h2>
        <p style="color:#334155;">En Bison Frame-bruger vil gerne have hjælp til at sætte SPF/DMARC op, så tilbud ikke ender i spam.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:18px 0;">
            <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse;">
                <tr><td style="padding:3px 0;color:#64748b;width:90px;">Firma</td><td style="padding:3px 0;font-weight:600;color:#0f172a;">${esc(firm)}${ownerName ? ` (${esc(ownerName)})` : ''}</td></tr>
                <tr><td style="padding:3px 0;color:#64748b;">Domæne</td><td style="padding:3px 0;font-weight:600;color:#0f172a;">${esc(domain) || '—'}</td></tr>
                <tr><td style="padding:3px 0;color:#64748b;">E-mail</td><td style="padding:3px 0;"><a href="mailto:${esc(email)}" style="color:#2563eb;">${esc(email) || '—'}</a></td></tr>
                <tr><td style="padding:3px 0;color:#64748b;">Telefon</td><td style="padding:3px 0;">${phone ? `<a href="tel:${esc(phone).replace(/\s/g, '')}" style="color:#2563eb;">${esc(phone)}</a>` : '—'}</td></tr>
            </table>
        </div>

        <h3 style="margin:20px 0 8px;color:#0f172a;font-size:16px;">Hvad mangler</h3>
        ${todoHtml}
        ${stepsHtml}

        <p style="color:#334155;margin-top:24px;">Svar direkte på denne mail eller ring til brugeren og hjælp dem gratis i gang.</p>
    `;
    return getBaseTemplate('Anmodning om gratis DNS-hjælp', content, `Gratis DNS-hjælp ønskes — ${firm || ''}`, null);
};

export const getCustomerRequestReceivedTemplate = (customerName, categoryName, carpenter, projectDetailsHtml = '') => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Kære ${customerName},</h2>
        <p style="color: #334155;">Mange tak for din henvendelse vedrørende dit byggeprojekt: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Vi har modtaget dine oplysninger her hos <strong>${carpenterCompanyName}</strong>, og vi glæder os til at kigge dit materiale igennem.</p>
        <p style="color: #334155;">Såfremt vi har brug for at få uddybet nogle detaljer for at kunne give dig det bedst mulige tilbud, vil vi kontakte dig inden for de dage, du har valgt i formularen. Vi vil tage dig trygt i hånden, og måske aftaler vi at vi kommer ud og kigger fysisk på dit projekt, så vi kan få en rigtig god og personlig snak om dine drømme og muligheder.</p>
        <p style="color: #334155;">Vi ser frem til et rigtig godt samarbejde!</p>
        <br/>
        
        ${projectDetailsHtml ? `
        <div style="margin-bottom: 24px;">
            ${projectDetailsHtml}
        </div>
        ` : ''}

        <div style="background-color: #f8fafc; padding: 12px; border-left: 3px solid #cbd5e1; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic; line-height: 1.4;">
                <strong>Vigtig information:</strong> Prisestimatet genereret på vores hjemmeside er udelukkende vejledende og udgør ikke et juridisk bindende tilbud. En endelig pris aftales altid efter en fysisk besigtigelse eller personlig dialog.
            </p>
        </div>

        <p style="color: #334155; margin-bottom: 0;">De bedste hilsner,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Tak for din forespørgsel", content, "Vi glæder os til at kigge på dit projekt.", carpenter);
};

// Materialeliste sendt til en LEVERANDØR (fx Davidsen) med anmodning om pris.
// Mailen er bevidst KORT: en hilsen, en kort besked og en tydelig "PDF vedhæftet"-boks.
// Selve listen (og leveringsoplysninger) står KUN i den vedhæftede PDF — ikke i mail-teksten.
// opts = { customMessage, caseNumber, title, contactName }.
export const getSupplierMaterialRequestTemplate = (supplierName, carpenter, items = [], opts = {}) => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const signatureName = getCarpenterSenderName(carpenter);
    // Hilsen: kontaktperson hvis udfyldt ("Hej Kenneth,"), ellers neutral "Hej,".
    const greetName = (opts.contactName && String(opts.contactName).trim())
        ? String(opts.contactName).trim()
        : '';

    const defaultIntro = 'Vi vil gerne bede om en pris på følgende materialer. I finder den fulde materialeliste i den vedhæftede PDF.';
    const rawIntro = (opts.customMessage != null && String(opts.customMessage).trim()) ? String(opts.customMessage) : defaultIntro;
    const introHtml = esc(rawIntro).replace(/\n/g, '<br/>');

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej${greetName ? ` ${esc(greetName)}` : ''},</h2>
        <p style="color: #334155;">${introHtml}</p>
        ${opts.title ? `<p style="color: #334155;"><strong>Opgave:</strong> ${esc(opts.title)}</p>` : ''}

        <div style="display: flex; align-items: center; gap: 12px; background-color: #f8fafc; padding: 16px 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <span style="font-size: 22px; line-height: 1;">📎</span>
            <span style="color: #0f172a; font-size: 14px; font-weight: 600;">Materialeliste er vedhæftet som PDF${opts.caseNumber ? ` · sagsnr. ${esc(opts.caseNumber)}` : ''}</span>
        </div>

        <p style="color: #334155;">I er velkomne til at svare direkte på denne mail med jeres pris.</p>

        <p style="color: #334155; margin-bottom: 0;">På forhånd tak,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Anmodning om materialepris", content, "Materialeliste – anmodning om pris (PDF vedhæftet)", carpenter);
};

// Aftaleseddel sendt til kunden. Hvis confirmUrl er angivet (sedlen er ikke bekræftet
// endnu), vises en "Bekræft aftale"-knap til den sikre bekræftelses-side. Ellers sendes
// blot en kopi. PDF'en vedhæftes altid mailen.
export const getAgreementEmailTemplate = (customerName, agreementTitle, carpenter, confirmUrl = null, customMessage = null) => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    // Personlig besked (redigerbar i preview). Escapes + linjeskift bevares.
    const defaultIntro = 'Som aftalt sender vi hermed en aftaleseddel på det ekstraarbejde, vi har talt om:';
    const rawIntro = (customMessage != null && String(customMessage).trim()) ? String(customMessage) : defaultIntro;
    const introHtml = rawIntro
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

    const confirmBlock = confirmUrl ? `
        <p style="color: #334155;">Du bedes bekræfte aftalen ved at trykke på knappen nedenfor. Så er vi enige om det aftalte, og beløbet medtages på den endelige faktura fra <strong>${carpenterCompanyName}</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}; padding: 18px 36px; font-size: 18px;">Bekræft aftale her</a>
            <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Den fulde aftaleseddel er også vedhæftet som PDF.</p>
        </div>
    ` : `
        <p style="color: #334155;">Du finder den fulde aftaleseddel som PDF vedhæftet denne mail. Den indeholder beskrivelsen og den aftalte pris.</p>
        <p style="color: #334155;">Beløbet medtages på den endelige faktura fra <strong>${carpenterCompanyName}</strong>. Har du spørgsmål, er du altid velkommen til at svare direkte på denne mail.</p>
    `;

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${customerName},</h2>
        <p style="color: #334155;">${introHtml}</p>

        <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #ddd6fe;">
            <p style="margin: 0; color: #6d28d9; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Ekstraarbejde</p>
            <p style="margin: 6px 0 0 0; color: #0f172a; font-size: 18px; font-weight: 700;">${agreementTitle}</p>
        </div>

        ${confirmBlock}

        <p style="color: #334155; margin-bottom: 0;">De bedste hilsner,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate(
        confirmUrl ? "Bekræft din aftaleseddel" : "Din aftaleseddel",
        content,
        confirmUrl ? `Bekræft aftale: ${agreementTitle}` : `Aftaleseddel: ${agreementTitle}`,
        carpenter
    );
};

export const getCustomerEstimateTemplate = (customerName, categoryName, priceEstimate, carpenter, quoteUrl, projectDetailsHtml = '') => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${customerName},</h2>
        <p style="color: #334155;">Mange tak for din interesse. Du har netop brugt vores beregner til at få et overslag på dit byggeprojekt: <strong>${categoryName}</strong>.</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Dit vejledende overslag</p>
            <h1 style="margin: 0; color: #0f172a; font-size: 32px; font-weight: 900;">${priceEstimate}</h1>
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">Dækker arbejdsløn og materialer</p>
        </div>
        
        <p style="color: #334155;">Vores erfaring er, at det endelige, bindende tilbud ofte lander lidt lavere – men med denne pris har du et realistisk og stærkt udgangspunkt.</p>
        <p style="color: #334155;">Du kan bruge dette overslag til at sammenligne, og du har altid adgang til det via knappen nedenfor.</p>

        ${projectDetailsHtml ? `
        <div style="margin: 32px 0;">
            ${projectDetailsHtml}
        </div>
        ` : ''}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}; padding: 16px 32px; font-size: 18px;">Vælg ${carpenterCompanyName} til opgaven</a>
            <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Tryk på knappen for at gå videre og anmode om det endelige tilbud.</p>
        </div>

        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Dit overslag er klar", content, `Her er dit vejledende overslag på ${categoryName}`, carpenter);
};

export const getCustomerUpdatedEstimateTemplate = (customerName, categoryName, priceEstimate, carpenter, quoteUrl, projectDetailsHtml = '') => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${customerName},</h2>
        <p style="color: #334155;">Du har netop rettet i detaljerne for dit projekt: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Her er dit opdaterede overslag baseret på dine nye valg.</p>
        
        <div style="background-color: #eff6ff; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #bfdbfe; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Dit opdaterede overslag</p>
            <h1 style="margin: 0; color: #1e3a8a; font-size: 32px; font-weight: 900;">${priceEstimate}</h1>
            <p style="margin: 8px 0 0 0; color: #3b82f6; font-size: 13px;">Dækker arbejdsløn og materialer</p>
        </div>
        
        <p style="color: #334155;">Du har altid adgang til din opgave via knappen nedenfor.</p>

        ${projectDetailsHtml ? `
        <div style="margin: 32px 0;">
            ${projectDetailsHtml}
        </div>
        ` : ''}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}; padding: 16px 32px; font-size: 18px;">Vælg ${carpenterCompanyName} til opgaven</a>
            <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Tryk på knappen for at gå videre og anmode om det endelige tilbud.</p>
        </div>

        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Dit opdaterede overslag er klar", content, `Her er dit nye vejledende overslag på ${categoryName}`, carpenter);
};

export const getCustomerComplexProjectTemplate = (customerName, categoryName, carpenter, quoteUrl) => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${customerName},</h2>
        <p style="color: #334155;">Tak for din henvendelse vedrørende dit projekt: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Da dette er en større og mere kompleks opgave, kan vi ikke give et præcist automatisk estimat. For at sikre, at vi giver dig den absolut bedste pris og løsning, kræver det en professionel besigtigelse.</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
            <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px;">Hvad sker der nu?</h3>
            <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Vi har modtaget din beskrivelse og vil kigge den igennem. Vi kontakter dig hurtigst muligt for at aftale et tidspunkt, hvor vi kan komme forbi, høre om dine idéer og besigtige forholdene. Derefter vil du modtage et skræddersyet, uforpligtende tilbud.
            </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}; padding: 16px 32px; font-size: 18px;">Se din opgave</a>
        </div>

        <p style="color: #334155; margin-bottom: 0;">Vi glæder os til at høre mere om dit projekt!</p>
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Tak for din henvendelse", content, `Vi har modtaget din forespørgsel på ${categoryName}`, carpenter);
};

export const getCustomerFastTrackTemplate = (customerName, categoryName, carpenter, notesText) => {
    const signatureName = getCarpenterSenderName(carpenter);

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${customerName},</h2>
        <p style="color: #334155;">Tak for din beskrivelse vedrørende dit projekt: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Vi har nu modtaget dine oplysninger direkte i vores system. En tilbygning er en stor opgave, som altid kræver en fysisk besigtigelse og grundig dialog, før vi kan give en retvisende pris.</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: left;">
            <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Hvad sker der nu?</h3>
            <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Vi kigger din beskrivelse igennem og kontakter dig hurtigst muligt, så vi kan aftale et tidspunkt at besigtige projektet på din adresse.
            </p>
            
            <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; border-top: 1px solid #cbd5e1; padding-top: 16px;">Din beskrivelse:</h3>
            <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6; white-space: pre-wrap; font-style: italic;">"${notesText || 'Ingen yderligere beskrivelse angivet.'}"</p>
        </div>

        <p style="color: #334155; margin-bottom: 0;">Vi glæder os til at snakke med dig om dine byggedrømme!</p>
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Tak for din henvendelse", content, `Vi har modtaget din forespørgsel på ${categoryName}`, carpenter);
};


export const getCarpenterWelcomeTemplate = (companyName, loginUrl) => {
    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Velkommen til Bison Frame, ${companyName}!</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Vi er super glade for at have dig ombord. Dit nye tømrer-system er nu oprettet. Vi har bygget systemet for at gøre din hverdag nemmere, spare dig for kontortid og give dine kunder en professionel oplevelse fra første klik til færdig opgave.</p>
        
        <div style="background-color: #eff6ff; padding: 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #dbeafe; border-left: 4px solid #3b82f6;">
            <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Vi sætter det op sammen med jer</h3>
            <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.65;">Du skal ikke stå alene med opsætningen. Vi kommer gerne ud — eller mødes online — og sætter Frame op sammen med jer, og vi bliver ved, indtil det passer til jeres virksomhed og bare kører. Vil du hellere selv i gang, klarer de tre trin herunder det meste — og vi hjælper med det hele, hvis der er bøvl.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #e2e8f0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px;">Kom godt fra start i 3 trin:</h3>
            <ol style="margin: 0; color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                <li style="margin-bottom: 12px;"><strong>Tilpas din profil:</strong> Indstil din timepris og upload dit logo i kontrolpanelet.</li>
                <li style="margin-bottom: 12px;"><strong>Byg dit hold:</strong> Opret dit hold under Team &amp; Medarbejdere og tilføj de medarbejdere, du har valgt. Du kan altid tilføje flere senere.</li>
                <li style="margin-bottom: 0;"><strong>Tilføj kunder &amp; sager:</strong> Gå ind under Kunder og opret dine nuværende kunder og sager.</li>
            </ol>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <a href="${loginUrl}" style="${buttonStyle}; padding: 16px 32px; font-size: 18px; background-color: #10b981;">Log ind på din portal</a>
        </div>

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #334155; margin-bottom: 12px; font-size: 15px; line-height: 1.6;">
                <strong>P.S. Personlig hotline fra ejer til mester</strong><br/>
                Systemet er bygget til at gøre din hverdag nemmere. Hvis du oplever problemer, er det mindste i tvivl, eller har forslag til forbedringer, så ring direkte til mig på <strong>40 26 50 02</strong> – uanset hvilken dag på ugen det er. Jeg tager telefonen, og vi tager hånd om det med det samme.
            </p>
            <p style="color: #334155; margin-bottom: 0; font-size: 15px;">Med venlig hilsen,</p>
            ${getSignatureBlock('Mads Brunsbjerg Christensen', 'Medejer &amp; Udvikler, Bison Frame')}
        </div>
    `;
    return getBaseTemplate("Velkommen til Bison Frame!", content);
};

export const getCarpenterNewRequestTemplate = (carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl = 'https://app.bisonframe.dk', leadId = null, projectDetailsHtml = '', priceEstimate = '', contactPreference = '') => {
    // Til tømreren selv bruger vi bare standard Bison Frame header
    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${carpenterName},</h2>
        <p style="color: #334155;">Du har netop modtaget en ny forespørgsel fra en potentiel kunde via din overslagsberegner.</p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">Kundens Kontaktinfo</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0; color: #334155;">
                <li style="margin-bottom: 8px;"><strong>Kunde:</strong> ${customerName}</li>
                <li style="margin-bottom: 8px;"><strong>Telefon:</strong> <a href="tel:${customerPhone}" style="color: #2563eb; text-decoration: none;">${customerPhone}</a></li>
                <li style="margin-bottom: 8px;"><strong>E-mail:</strong> <a href="mailto:${customerEmail}" style="color: #2563eb; text-decoration: none;">${customerEmail}</a></li>
                ${contactPreference ? `<li style="margin-bottom: 0;"><strong>Ønsket kontakt:</strong> ${contactPreference}</li>` : ''}
            </ul>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">Opgaven: ${categoryName}</h3>
            ${priceEstimate ? `<div style="margin-bottom: 20px; padding: 12px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0;"><strong style="color: #065f46;">Overslag sendt til kunde:</strong> <span style="color: #047857; font-weight: bold;">${priceEstimate}</span></div>` : ''}
            ${projectDetailsHtml && projectDetailsHtml.includes('<li') 
                ? `<ul style="list-style-type: none; padding: 0; margin: 0; color: #334155;">${projectDetailsHtml}</ul>`
                : projectDetailsHtml || '<ul style="list-style-type: none; padding: 0; margin: 0; color: #334155;"><li style="color: #64748b; font-style: italic;">Ingen specifikke detaljer valgt.</li></ul>'}
        </div>
        
        <p style="color: #334155;">Log ind på dit Bison Frame dashboard for at udarbejde et tilbud til kunden.</p>
        
        <div style="text-align: center; margin-top: 32px;">
            <a href="${appUrl}/dashboard?tab=leads${leadId ? `&leadId=${leadId}` : ''}" style="${buttonStyle}">Åbn i Dashboard</a>
        </div>
    `;
    return getBaseTemplate("Ny forespørgsel på Bison Frame", content, `Ny opgave: ${categoryName} fra ${customerName}`);
};

export const getAdminNewSignupTemplate = (companyName, cvr, ownerName, email, phone) => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">Ny Tømrer på Platformen!</h2>
        </div>
        
        <p style="color: #334155; font-size: 16px;">Hej Mads,</p>
        <p style="color: #334155; font-size: 16px;">Der er netop oprettet en ny tømrer/bruger på Bison Frame. Her er detaljerne, så du kan gribe knoglen og byde dem velkommen:</p>
        
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%;"><strong>Virksomhed:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 500;">${companyName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>CVR:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 500;">${cvr}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Ejer:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 500;">${ownerName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>E-mail:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 500;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;"><strong>Telefon:</strong></td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 500;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td>
                </tr>
            </table>
        </div>
        
        <p style="color: #334155; font-size: 16px;">Ring til dem nu og vind point på den personlige service!</p>
    `;
    return getBaseTemplate("Ny Tømrer Oprettet", content, `Ny bruger: ${companyName}`);
};

export const getCustomerOfferSentTemplate = (customerName, quoteUrl, categoryName, carpenter, pdfUrl = null, isUpdate = false, caseNumber = null, customMessage = null, validityDays = 14) => {
    const signatureName = getCarpenterSenderName(carpenter);
    // Personlig besked fra tømreren (manuelle tilbud). Newlines → <br>.
    const personalHtml = (customMessage && String(customMessage).trim())
        ? String(customMessage).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        : null;

    const title = isUpdate ? "Dit opdaterede tilbud er klar!" : "Dit tilbud er klar!";
    const headerTitle = isUpdate ? `Opdateret tilbud${caseNumber ? ` (Sag ${caseNumber})` : ''}` : `Dit tilbud er klar${caseNumber ? ` (Sag ${caseNumber})` : ''}`;
    const subtext = isUpdate ? "Vi har opdateret dit tilbud med de seneste ændringer." : "Vi har sendt et tilbud til dig.";

    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 24px;">${title}</h2>
        </div>
        
        ${isUpdate ? `<div style="background-color: #fffbeb; padding: 12px; border-left: 3px solid #f59e0b; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #b45309; font-weight: 500;">
                Bemærk: Dette er en opdateret version af dit tidligere tilbud.
            </p>
        </div>` : ''}

        <p style="color: #334155;">Hej ${customerName},</p>
        ${personalHtml
            ? `<p style="color: #334155; line-height: 1.6;">${personalHtml}</p>`
            : `<p style="color: #334155;">Vi har nu gennemgået dine ønsker vedrørende dit projekt (<strong>${categoryName}</strong>) og har udarbejdet et officielt tilbud til dig.</p>`}

        <div style="text-align: center; margin: 32px 0;">
            ${pdfUrl ? `<div style="margin-bottom: 16px;"><a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #f1f5f9; color: #334155; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; border: 1px solid #cbd5e1;">Se som PDF</a></div>` : ''}
            <div><a href="${quoteUrl}" style="${buttonStyle}; padding: 18px 36px; font-size: 18px;">Bekræft tilbud her</a></div>
        </div>
        
        <p style="color: #334155; font-size: 14px;"><em>Linket fører dig til en sikker portal, hvor du kan læse hele tilbuddet og bekræfte opgaven direkte til os, når du er klar.</em></p>

        <p style="color: #64748b; font-size: 13px; text-align: center;">Tilbuddet er gyldigt i <strong>${validityDays} dage</strong> fra dato.</p>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 32px 0; text-align: left;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">Har du spørgsmål eller ændringer?</h3>
            <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">
                Hvis der er noget i tilbuddet, vi skal have rettet til, eller hvis vi snakkede om noget andet, <strong>kan du blot besvare denne e-mail</strong>. Så kigger vi på det og sender en opdateret version til dig.
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate(headerTitle, content, subtext, carpenter);
};

export const getCustomerOfferRevokedTemplate = (customerName, carpenter, customMessage = null, caseNumber = null) => {
    const signatureName = getCarpenterSenderName(carpenter);
    const phone = carpenter?.phone || '';
    const email = carpenter?.email || '';

    // Tømrerens egen (redigerbare) besked. Newlines → <br>, HTML escapes.
    const bodyText = (customMessage && String(customMessage).trim())
        ? String(customMessage).trim()
        : 'Vi har trukket vores tidligere fremsendte tilbud tilbage, og det er derfor ikke længere gældende. Ønsker du et opdateret tilbud, er du meget velkommen til at sige til.';
    const bodyHtml = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    const contactHtml = (phone || email) ? `
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 32px 0; text-align: left;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">Har du spørgsmål?</h3>
            <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">
                Du er altid velkommen til at kontakte os${phone ? ` på <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a>` : ''}${email ? `${phone ? ' eller' : ' på'} <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>` : ''} — eller blot besvare denne e-mail.
            </p>
        </div>` : '';

    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 24px;">Tilbuddet er trukket tilbage</h2>
        </div>

        <p style="color: #334155;">Hej ${customerName},</p>
        <p style="color: #334155; line-height: 1.6;">${bodyHtml}</p>

        <div style="background-color: #fffbeb; padding: 12px 16px; border-left: 3px solid #f59e0b; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #b45309; font-weight: 500;">
                Bemærk: Det tidligere tilbudslink er ikke længere gyldigt.
            </p>
        </div>

        ${contactHtml}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate(`Tilbud trukket tilbage${caseNumber ? ` (Sag ${caseNumber})` : ''}`, content, 'Dit tidligere tilbud er ikke længere gældende.', carpenter);
};

// Venlig opfølgning på et sendt, endnu ikke bekræftet tilbud. Bruges af "Send
// opfølgningsmail"-knappen. daysLeft = antal dage til tilbuddet udløber (kan være null).
export const getCustomerFollowUpTemplate = (customerName, quoteUrl, categoryName, carpenter, daysLeft = null, caseNumber = null, customMessage = null) => {
    const signatureName = getCarpenterSenderName(carpenter);
    const phone = carpenter?.phone || '';
    const email = carpenter?.email || '';

    const expiryLine = (typeof daysLeft === 'number' && daysLeft > 0)
        ? `Jeg kan se, at du endnu ikke har bekræftet tilbuddet${categoryName ? ` på <strong>${categoryName}</strong>` : ''}. Det udløber om <strong>${daysLeft} ${daysLeft === 1 ? 'dag' : 'dage'}</strong>.`
        : `Jeg kan se, at du endnu ikke har bekræftet tilbuddet${categoryName ? ` på <strong>${categoryName}</strong>` : ''}.`;

    const introHtml = (customMessage && String(customMessage).trim())
        ? String(customMessage).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        : `${expiryLine} Er det stadig aktuelt, eller er der noget, du er i tvivl om, så er vi klar til at hjælpe — svar blot på denne mail.`;

    const contactHtml = (phone || email) ? `
        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 24px;">
            Du er også velkommen til at kontakte os${phone ? ` på <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a>` : ''}${email ? `${phone ? ' eller' : ' på'} <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>` : ''}.
        </p>` : '';

    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 24px;">En hurtig opfølgning</h2>
        </div>

        <p style="color: #334155;">Hej ${customerName},</p>
        <p style="color: #334155; line-height: 1.6;">${introHtml}</p>

        ${quoteUrl ? `<div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}">Se og bekræft tilbud her</a>
        </div>` : ''}

        ${contactHtml}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate(`Opfølgning på dit tilbud${caseNumber ? ` (Sag ${caseNumber})` : ''}`, content, 'En hurtig opfølgning på dit tilbud.', carpenter);
};

export const getCustomerOfferAcceptedTemplate = (customerName, categoryName, carpenter, quoteUrl, caseNumber = null) => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);
    
    const phone = carpenter?.phone || '';
    const email = carpenter?.email || '';

    const contactHtml = (phone || email) ? `
        <p style="color: #64748b; margin: 0; font-size: 14px;">Har du spørgsmål i mellemtiden, kan du kontakte os direkte på:<br/>
        <strong>${phone}</strong> | <strong>${email}</strong></p>
    ` : `<p style="color: #64748b; margin: 0; font-size: 14px;">Har du spørgsmål i mellemtiden, er du altid velkommen til at kontakte os direkte.</p>`;

    const quoteButtonHtml = quoteUrl ? `
        <div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}">Åbn dit PDF-tilbud her</a>
            <p style="color: #64748b; font-size: 13px; margin-top: 12px;">Gem denne mail, så du altid har adgang til aftalen.</p>
        </div>
    ` : '';

    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">Tilbud bekræftet</h2>
        </div>
        
        <p style="color: #334155;">Hej ${customerName},</p>
        <p style="color: #334155;">Fantastisk! Du har nu formelt accepteret tilbuddet på dit projekt (<strong>${categoryName}</strong>).</p>
        <p style="color: #334155;">Vi har fået direkte besked i vores system her hos <strong>${carpenterCompanyName}</strong>. Vi vil nu planlægge det videre forløb og kontakte dig snarest for at aftale de nærmere detaljer, såsom opstartsdato og bestilling af materialer.</p>
        
        ${quoteButtonHtml}

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
            ${contactHtml}
        </div>
        
        <p style="color: #334155; margin-bottom: 0;">Tak for tilliden. Vi glæder os til samarbejdet!</p>
        <br/>
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate(`Dit tilbud er bekræftet${caseNumber ? ` (Sag ${caseNumber})` : ''}`, content, "Tillykke! Din opgave er bekræftet og sat i gang.", carpenter);
};

export const getCarpenterOfferAcceptedTemplate = (carpenterName, customerName, categoryName, appUrl = 'https://app.bisonframe.dk', carpenter = null, leadId = null) => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 16px; color: #10b981;">✓</div>
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">En kunde har accepteret dit tilbud!</h2>
        </div>

        <p style="color: #334155;">Hej ${carpenterName},</p>
        <p style="color: #334155;">Gode nyheder! <strong>${customerName}</strong> har netop accepteret dit tilbud på opgaven: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Opgaven er nu bekræftet og klar til at blive sat i gang. Åbn den i ordrestyringssystemet for at komme videre. Bruger du et regnskabsprogram, kan du derfra vælge at overføre sagen — det er helt valgfrit.</p>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/dashboard?tab=Bekræftet+opgave${leadId ? `&leadId=${leadId}` : ''}" style="${buttonStyle}">Åbn i ordrestyringssystemet</a>
        </div>
    `;
    return getBaseTemplate("Et tilbud er blevet accepteret", content, `${customerName} har accepteret dit tilbud!`, carpenter);
};

export const getFeedbackTemplate = (carpenter, feedbackText) => {
    const carpenterName = carpenter?.company_name || 'Ukendt Firma';
    const phone = carpenter?.phone || 'Ikke angivet';
    const email = carpenter?.email || 'Ikke angivet';
    const contactPerson = carpenter?.owner_name || carpenter?.contact_person || 'Ikke angivet';

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Ny feedback fra systemet</h2>
        <p style="color: #334155;">Du har modtaget en ny besked eller et udviklingsforslag fra en tømrer i Bison Frame.</p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Afsender (Tømrer):</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0; color: #334155;">
                <li style="margin-bottom: 8px;"><strong>Firma:</strong> ${carpenterName}</li>
                <li style="margin-bottom: 8px;"><strong>Kontaktperson:</strong> ${contactPerson}</li>
                <li style="margin-bottom: 8px;"><strong>Telefon:</strong> ${phone}</li>
                <li style="margin-bottom: 0;"><strong>E-mail:</strong> ${email}</li>
            </ul>
        </div>

        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #fcd34d;">
            <h3 style="margin-top: 0; font-size: 16px; color: #b45309;">Feedback / Besked:</h3>
            <p style="margin: 0; color: #92400e; white-space: pre-wrap;">${feedbackText}</p>
        </div>
        
        <p style="color: #334155;">Grib knoglen og ring til ${contactPerson !== 'Ikke angivet' ? contactPerson.split(' ')[0] : 'vedkommende'}, hvis det kræver en uddybning!</p>
    `;
    return getBaseTemplate("System Feedback: " + carpenterName, content, `Feedback fra ${carpenterName}`);
};

export const getCustomerBookingConfirmationTemplate = (customerName, categoryName, carpenter, contactPreference) => {
    const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
    const signatureName = getCarpenterSenderName(carpenter);

    const contactText = contactPreference === 'Hurtigst muligt' 
        ? 'hurtigst muligt' 
        : `på dit valgte tidspunkt: ${contactPreference}`;

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Kære ${customerName},</h2>
        <p style="color: #334155;">Mange tak fordi du har valgt <strong>${carpenterCompanyName}</strong> til at kigge nærmere på din opgave vedrørende <strong>${categoryName}</strong>.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #065f46;">Hvad sker der nu?</h3>
            <p style="margin: 0; color: #047857; line-height: 1.6;">
                Vi har modtaget dine kontaktoplysninger i vores system. Vi ringer dig op <strong>${contactText}</strong> for at tage en kort indledende snak. 
                Ofte aftaler vi her et tidspunkt, hvor vi kan komme forbi og besigtige forholdene fysisk. På den måde sikrer vi, at du får et præcist, skræddersyet og bindende tilbud på din opgave.
            </p>
        </div>

        <p style="color: #334155;">Vi glæder os meget til at høre mere om dine byggedrømme!</p>
        <br/>
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${signatureName}</p>
    `;
    return getBaseTemplate("Tak for din bekræftelse", content, `Vi kontakter dig ${contactText}`, carpenter);
};

export const getEmployeeInviteTemplate = (employeeName, loginEmail, loginPassword, carpenter) => {
    const carpenterCompanyName = carpenter?.company_name || 'Virksomheden';

    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${employeeName},</h2>
        <p style="color: #334155;">Du er netop blevet oprettet som bruger af <strong>${carpenterCompanyName}</strong> på Bison Frame.</p>
        <p style="color: #334155;">Du kan nu logge ind og få hurtig adgang til dine sager, uploade bilag og meget mere.</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Dine midlertidige login-oplysninger</p>
            <p style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">Brugernavn: <strong>${loginEmail}</strong></p>
            <p style="margin: 0; color: #0f172a; font-size: 16px;">Adgangskode: <strong style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; letter-spacing: 1px;">${loginPassword}</strong></p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; font-style: italic; text-align: center;">Bemærk: Første gang du logger ind, vil du blive bedt om at ændre adgangskoden til din egen personlige.</p>
        
        <div style="margin-top: 32px; text-align: center;">
            <a href="https://bisonframe.dk/login" style="${buttonStyle}">Gå til Login</a>
        </div>
    `;
    return getBaseTemplate("Velkommen til Bison Frame", content, "Dine login oplysninger er klar.", carpenter);
};

// Gæste-invitation: en underentreprenør tilføjes på ÉT projekt og vælger selv sin
// adgangskode + godkender vilkår via det personlige link (actionLink).
export const getGuestInviteTemplate = (firstName, inviterCompanyName, projectTitle, actionLink) => {
    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${firstName || 'der'},</h2>
        <p style="color: #334155;"><strong>${inviterCompanyName || 'En virksomhed'}</strong> har tilføjet dig som underentreprenør på projektet <strong>${projectTitle || 'et byggeprojekt'}</strong> i Bison Frame.</p>
        <p style="color: #334155;">Du får adgang til projektets tegninger, beskrivelse og bygge-to-do — og kan nemt registrere dine egne timer direkte fra mobilen. Det er <strong>gratis</strong> for dig.</p>

        <div style="margin: 32px 0; text-align: center;">
            <a href="${actionLink}" style="${buttonStyle}">Opret adgang &amp; vælg adgangskode</a>
        </div>

        <p style="color: #64748b; font-size: 13px; text-align: center;">Linket er personligt. Når du klikker, vælger du din egen adgangskode og godkender vilkårene. Har du ikke forventet denne mail, kan du roligt ignorere den.</p>
    `;
    return getBaseTemplate(`Du er tilføjet på ${projectTitle || 'et projekt'}`, content, `${inviterCompanyName || ''} har tilføjet dig i Bison Frame.`, null);
};
