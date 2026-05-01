const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f8fafc;
    color: #0f172a;
    line-height: 1.6;
    margin: 0;
    padding: 40px 20px;
`;

const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    border: 1px solid #e2e8f0;
`;

const headerStyle = `
    background: #0f172a;
    color: #ffffff;
    padding: 32px 40px;
    text-align: center;
`;

const contentStyle = `
    padding: 40px;
`;

const buttonStyle = `
    display: inline-block;
    background-color: #10b981;
    color: #ffffff;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 8px;
    font-weight: 600;
    margin: 24px 0;
    text-align: center;
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
`;

const footerStyle = `
    padding: 24px 40px;
    background-color: #f1f5f9;
    color: #64748b;
    font-size: 14px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
`;

const getBaseTemplate = (title, content, preheader = "", carpenter = null) => {
    // Dynamisk Header: Logo eller Firmanavn
    const headerContent = carpenter?.logo_url 
        ? `<img src="${carpenter.logo_url}" alt="${carpenter.company_name}" style="max-height: 60px; max-width: 200px; display: inline-block; vertical-align: middle;" />`
        : `<h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">${carpenter?.company_name || 'Bison Frame'}</h1>`;

    // Dynamisk Footer
    const footerContent = carpenter
        ? `
            <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-weight: 600; color: #334155;">${carpenter.company_name}</p>
                <p style="margin: 2px 0; color: #64748b;">${carpenter.phone || ''} | ${carpenter.email || ''}</p>
                <p style="margin: 2px 0; color: #64748b;">${carpenter.address || ''}</p>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px;">Dette tilbudssystem er leveret af Bison Frame - Din sikkerhed for en professionel byggeproces.</p>
          `
        : `<p style="margin: 0 0 8px 0;">Denne e-mail er sendt via Bison Frame - Din professionelle tilbudsplatform.</p>`;

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
    <div style="${containerStyle}">
        <div style="${headerStyle}">
            ${headerContent}
        </div>
        <div style="${contentStyle}">
            ${content}
        </div>
        <div style="${footerStyle}">
            ${footerContent}
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Bison Frame. Alle rettigheder forbeholdes.</p>
        </div>
    </div>
</body>
</html>
`;
};

export const getCustomerRequestReceivedTemplate = (customerName, categoryName, carpenter) => {
    const carpenterName = carpenter?.company_name || 'Tømreren';
    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Kære ${customerName},</h2>
        <p style="color: #334155;">Mange tak for din henvendelse vedrørende dit byggeprojekt: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Jeg har modtaget dine oplysninger her hos <strong>${carpenterName}</strong>, og jeg glæder mig til at kigge dit materiale igennem.</p>
        <p style="color: #334155;">Såfremt jeg har brug for at få uddybet nogle detaljer for at kunne give dig det bedst mulige tilbud, vil jeg kontakte dig inden for de dage, du har valgt i formularen. Jeg vil tage dig trygt i hånden, og måske aftaler vi at jeg kommer ud og kigger fysisk på dit projekt, så vi kan få en rigtig god og personlig snak om dine drømme og muligheder.</p>
        <p style="color: #334155;">Jeg ser frem til et rigtig godt samarbejde!</p>
        <br/>
        
        <div style="background-color: #f8fafc; padding: 12px; border-left: 3px solid #cbd5e1; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic; line-height: 1.4;">
                <strong>Vigtig information:</strong> Prisestimatet genereret på vores hjemmeside er udelukkende vejledende og udgør ikke et juridisk bindende tilbud. En endelig pris aftales altid efter en fysisk besigtigelse eller personlig dialog.
            </p>
        </div>

        <p style="color: #334155; margin-bottom: 0;">De bedste hilsner,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${carpenterName}</p>
    `;
    return getBaseTemplate("Tak for din forespørgsel", content, "Jeg glæder mig til at kigge på dit projekt.", carpenter);
};

export const getCarpenterNewRequestTemplate = (carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl = 'https://app.bisonframe.dk', leadId = null) => {
    // Til tømreren selv bruger vi bare standard Bison Frame header
    const content = `
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hej ${carpenterName},</h2>
        <p style="color: #334155;">Du har netop modtaget en ny forespørgsel fra en potentiel kunde via din overslagsberegner.</p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Opgavedetaljer:</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0; color: #334155;">
                <li style="margin-bottom: 8px;"><strong>Kunde:</strong> ${customerName}</li>
                <li style="margin-bottom: 8px;"><strong>Opgave:</strong> ${categoryName}</li>
                <li style="margin-bottom: 8px;"><strong>Telefon:</strong> ${customerPhone}</li>
                <li style="margin-bottom: 0;"><strong>E-mail:</strong> ${customerEmail}</li>
            </ul>
        </div>
        
        <p style="color: #334155;">Log ind på dit Bison Frame dashboard for at se alle detaljer og udarbejde et tilbud til kunden.</p>
        
        <div style="text-align: center;">
            <a href="${appUrl}/dashboard?tab=leads${leadId ? `&leadId=${leadId}` : ''}" style="${buttonStyle}">Gå til dit Dashboard</a>
        </div>
    `;
    return getBaseTemplate("Ny forespørgsel på Bison Frame", content, `Ny opgave: ${categoryName} fra ${customerName}`);
};

export const getAdminNewSignupTemplate = (companyName, cvr, ownerName, email, phone) => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">🎉 Ny Tømrer på Platformen!</h2>
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
        
        <p style="color: #334155; font-size: 16px;">Ring til dem nu og vind point på den personlige service! 🚀</p>
    `;
    return getBaseTemplate("Ny Tømrer Oprettet", content, `Ny bruger: ${companyName}`);
};

export const getCustomerOfferSentTemplate = (customerName, quoteUrl, categoryName, carpenter) => {
    const carpenterName = carpenter?.company_name || 'Tømreren';
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 24px;">Dit tilbud er klar!</h2>
        </div>
        
        <p style="color: #334155;">Hej ${customerName},</p>
        <p style="color: #334155;">Jeg har nu gennemgået dine ønsker vedrørende dit projekt (<strong>${categoryName}</strong>) og har udarbejdet et officielt tilbud til dig.</p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${quoteUrl}" style="${buttonStyle}">Se dit personlige tilbud her</a>
        </div>
        
        <p style="color: #334155; font-size: 14px;"><em>Linket fører dig til en sikker portal, hvor du kan læse hele tilbuddet og bekræfte opgaven direkte til mig, når du er klar.</em></p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${carpenterName}</p>
    `;
    return getBaseTemplate("Dit tilbud er klar", content, `Jeg har sendt et tilbud til dig.`, carpenter);
};

export const getCustomerOfferAcceptedTemplate = (customerName, categoryName, carpenter, quoteUrl) => {
    const carpenterName = carpenter?.company_name || 'Tømreren';
    const phone = carpenter?.phone || '';
    const email = carpenter?.email || '';

    const contactHtml = (phone || email) ? `
        <p style="color: #64748b; margin: 0; font-size: 14px;">Har du spørgsmål i mellemtiden, kan du kontakte mig direkte på:<br/>
        <strong>${phone}</strong> | <strong>${email}</strong></p>
    ` : `<p style="color: #64748b; margin: 0; font-size: 14px;">Har du spørgsmål i mellemtiden, er du altid velkommen til at kontakte mig direkte.</p>`;

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
        <p style="color: #334155;">Jeg har fået direkte besked i mit system her hos <strong>${carpenterName}</strong>. Jeg vil nu planlægge det videre forløb og kontakte dig snarest for at aftale de nærmere detaljer, såsom opstartsdato og bestilling af materialer.</p>
        
        ${quoteButtonHtml}

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
            ${contactHtml}
        </div>
        
        <p style="color: #334155; margin-bottom: 0;">Tak for tilliden. Jeg glæder mig til samarbejdet!</p>
        <br/>
        <p style="color: #334155; margin-bottom: 0;">Med venlig hilsen,</p>
        <p style="color: #0f172a; font-weight: 600; margin-top: 4px;">${carpenterName}</p>
    `;
    return getBaseTemplate("Dit tilbud er bekræftet", content, "Tillykke! Din opgave er bekræftet og sat i gang.", carpenter);
};

export const getCarpenterOfferAcceptedTemplate = (carpenterName, customerName, categoryName, appUrl = 'https://app.bisonframe.dk') => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h2 style="margin: 0; color: #10b981; font-size: 24px;">En kunde har accepteret dit tilbud!</h2>
        </div>
        
        <p style="color: #334155;">Hej ${carpenterName},</p>
        <p style="color: #334155;">Gode nyheder! <strong>${customerName}</strong> har netop accepteret dit tilbud på opgaven: <strong>${categoryName}</strong>.</p>
        <p style="color: #334155;">Opgaven er nu bekræftet og klar til at blive sat i gang. Du kan nu logge ind og få overblik, eller kontakte kunden for at aftale opstartsdato.</p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/dashboard" style="${buttonStyle}">Gå til dit Dashboard</a>
        </div>
    `;
    return getBaseTemplate("Et tilbud er blevet accepteret", content, `${customerName} har accepteret dit tilbud!`);
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
