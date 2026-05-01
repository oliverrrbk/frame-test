const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/Dashboard.jsx', 'utf8');

// Add import if missing
if (!content.includes("import toast from 'react-hot-toast';")) {
    content = content.replace("import { supabase } from '../../supabaseClient';", "import { supabase } from '../../supabaseClient';\nimport toast from 'react-hot-toast';");
}

// Exact match for the long success message
content = content.replace(
    /alert\(`SUCCES! PDF'en er uploadet og tilbuddet er sendt til kunden via e-mail\.[\s\S]*?\${leadId}`\);/,
    'toast.success("Tilbuddet er nu sendt afsted til kunden!");'
);

// Replace ✅ Succes alerts
content = content.replace(/alert\(`✅ Succes: (.*?)`\);/g, 'toast.success(`$1`);');

// Replace error alerts
content = content.replace(/alert\((["'`])(Fejl|Der skete en fejl|Der opstod en fejl|Kunne ikke)(.*?)\1\);/g, 'toast.error($1$2$3$1);');

// Replace remaining succes alerts (case insensitive)
content = content.replace(/alert\((["'`])(.*?(?:succes|succesfuldt).*?)\1\);/gi, 'toast.success($1$2$1);');

// Replace any remaining generic alerts with a standard toast error or toast (some are info, some are warnings)
// Let's just use toast() or toast.error()
// E.g. "Du skal vedhæfte en PDF..." -> error
content = content.replace(/alert\('Du skal vedhæfte en PDF, før du kan udsende tilbuddet!'\);/g, "toast.error('Du skal vedhæfte en PDF, før du kan udsende tilbuddet!');");
// E.g. "Vælg venligst en gyldig billedfil" -> error
content = content.replace(/alert\('Vælg venligst en gyldig billedfil \(JPG\/PNG\)\.'\);/g, "toast.error('Vælg venligst en gyldig billedfil (JPG/PNG).');");
// Kunde-linket er kopieret -> success
content = content.replace(/alert\('Kunde-linket er kopieret til din udklipsholder!.*?'\);/g, "toast.success('Kunde-linket er kopieret til din udklipsholder!');");
// Forbind dit regnskabsprogram -> info
content = content.replace(/alert\("Forbind dit regnskabsprogram for at overføre kundeoplysninger\. Du bliver nu sendt til integrations-indstillingerne\."\);/g, "toast('Forbind dit regnskabsprogram for at overføre. Du sendes til indstillinger.', { icon: 'ℹ️' });");
// Hov! Der skete en uventet fejl ifm PDF -> error
content = content.replace(/alert\("Hov! Der skete en uventet fejl ifm PDF oprettelsen\."\);/g, 'toast.error("Hov! Der skete en uventet fejl ifm PDF oprettelsen.");');

fs.writeFileSync('src/components/Dashboard/Dashboard.jsx', content);
