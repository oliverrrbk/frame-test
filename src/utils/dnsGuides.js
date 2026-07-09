// ============================================================================
// dnsGuides.js — trin-for-trin-vejledning til at sætte DMARC/SPF-DNS-records op,
// tilpasset den mail-/domæneudbyder vi kan gætte ud fra SMTP-serveren.
//
// DMARC/SPF er TXT-records der sættes hos den udbyder der styrer domænets DNS.
// Det er ikke altid det samme som mail-udbyderen, men SMTP-serveren er det bedste
// signal vi har — så vi giver målrettede trin for de kendte udbydere og en generisk
// fallback ellers. Bruges både i hjælpe-mailen (emailTemplates) og kan vises i UI.
// ============================================================================

// Fælles: sådan tilføjes selve records (bruges i alle guides).
const dmarcStepFor = (email) => `Tilføj en ny TXT-record: Navn/host = "_dmarc", Værdi = "v=DMARC1; p=none; rua=mailto:${email || 'din@mail.dk'}".`;

export function getDnsProviderGuide(smtpHost, email) {
    const h = String(smtpHost || '').toLowerCase();

    if (/office365|outlook|microsoft/.test(h)) {
        return {
            key: 'microsoft',
            label: 'Microsoft 365 / Outlook',
            intro: 'Dit domænes DNS styres ofte af den udbyder, hvor domænet er købt — men hvis det er flyttet ind i Microsoft 365, gøres det i Microsoft Admin Center:',
            steps: [
                'Log ind på admin.microsoft.com med din administrator-konto.',
                'Gå til Indstillinger → Domæner, og vælg dit domæne.',
                'Åbn fanen "DNS-records" (eller "Administrer DNS").',
                dmarcStepFor(email),
                'Gem. Er domænets DNS hos en anden udbyder (fx One.com), skal recorden i stedet tilføjes dér.',
            ],
        };
    }
    if (/gmail|google/.test(h)) {
        return {
            key: 'google',
            label: 'Google Workspace',
            intro: 'Google Workspace bruger typisk din domæneudbyders DNS. Tilføj recorden dér, hvor domænet er registreret:',
            steps: [
                'Log ind hos den udbyder, hvor domænet er købt (fx One.com, Simply, GoDaddy).',
                'Find "DNS", "DNS-indstillinger" eller "Avanceret DNS".',
                dmarcStepFor(email),
                'Gem. Google signerer selv DKIM, når SPF/DMARC er på plads.',
            ],
        };
    }
    if (/one\.com/.test(h)) {
        return {
            key: 'onecom',
            label: 'One.com',
            intro: 'Sådan gør du hos One.com:',
            steps: [
                'Log ind på one.com og vælg dit domæne.',
                'Gå til "DNS-indstillinger" → "DNS-records".',
                dmarcStepFor(email),
                'Tryk "Tilføj record" og gem.',
            ],
        };
    }
    if (/simply\.com/.test(h)) {
        return {
            key: 'simply',
            label: 'Simply.com',
            intro: 'Sådan gør du hos Simply.com:',
            steps: [
                'Log ind på simply.com og vælg dit domæne.',
                'Gå til "DNS" → "Avanceret DNS / DNS-records".',
                dmarcStepFor(email),
                'Gem ændringen.',
            ],
        };
    }
    if (/dandomain/.test(h)) {
        return {
            key: 'dandomain',
            label: 'DanDomain',
            intro: 'Sådan gør du hos DanDomain:',
            steps: [
                'Log ind på DanDomains kontrolpanel og vælg dit domæne.',
                'Find "DNS" / "Navneservere og DNS".',
                dmarcStepFor(email),
                'Gem.',
            ],
        };
    }

    // Generisk fallback — virker uanset udbyder.
    return {
        key: 'generic',
        label: 'Din domæneudbyder',
        intro: 'DNS-records tilføjes hos den udbyder, hvor dit domæne er registreret (fx One.com, Simply, DanDomain, GoDaddy eller din webmaster):',
        steps: [
            'Log ind hos din domæneudbyder.',
            'Find menupunktet "DNS", "DNS-indstillinger" eller "Avanceret DNS".',
            dmarcStepFor(email),
            'Gem. Der kan gå op til et par timer, før ændringen slår igennem.',
        ],
    };
}
