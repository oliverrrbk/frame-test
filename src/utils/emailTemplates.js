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
        : `<p style="margin: 0 0 8px 0;">Denne e-mail er sendt via Bison Frame - Din professionelle tilbudsplatform.</p>
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
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Vi er super glade for at have dig ombord. Din nye tilbuds- og ordrestyringsportal er nu oprettet. Vi har bygget systemet for at gøre din hverdag nemmere, spare dig for kontortid og give dine kunder en professionel oplevelse fra første klik til færdig opgave.</p>
        
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #e2e8f0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px;">Kom godt fra start i 3 nemme trin:</h3>
            <ol style="margin: 0; color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                <li style="margin-bottom: 12px;"><strong>Tilpas din profil:</strong> Indstil din timepris og upload dit logo i kontrolpanelet.</li>
                <li style="margin-bottom: 12px;"><strong>Kopiér din beregner:</strong> Sæt linket på din hjemmeside eller send det direkte til kunden.</li>
                <li style="margin-bottom: 0;"><strong>Styr dine sager:</strong> Administrer tilbud, bilag og aftalesedler ét og samme sted.</li>
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
            <p style="color: #0f172a; font-weight: 600; margin-top: 4px; font-size: 15px;">Mads Brunsbjerg Christensen</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 2px;">Ejer & Udvikler, Bison Frame</p>
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
    const economicLink = `<a href="https://secure.e-conomic.com/sales/invoices/drafts" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-left: 10px; margin-top: 10px;">Åbn E-conomic</a>`;
    const dineroLink = `<a href="https://dinero.dk/app/sales/drafts" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-left: 10px; margin-top: 10px;">Åbn Dinero</a>`;
    
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 16px; color: #10b981;">✓</div>
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">En kunde har accepteret dit tilbud!</h2>
        </div>
        
        <p style="color: #334155;">Hej ${carpenterName},</p>
        <p style="color: #334155;">Gode nyheder! <strong>${customerName}</strong> har netop accepteret dit tilbud på opgaven: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Opgaven er nu bekræftet og klar til at blive sat i gang. Har du tilknyttet dit regnskabsprogram eller sagsstyringssystem, ligger sagen allerede klar til dig som en kladde!</p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/dashboard?tab=Bekræftet+opgave${leadId ? `&leadId=${leadId}` : ''}" style="${buttonStyle}">Gå til Dashboard</a>
            <br/><br/>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">Hurtig adgang til dit regnskabsprogram:</p>
            ${economicLink}
            ${dineroLink}
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
