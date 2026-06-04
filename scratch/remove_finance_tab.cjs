const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/CaseManagement.jsx', 'utf8');

// The Økonomi tab is roughly lines 1076 to 1113. Let's use a regex to grab and remove it.
const cardRegex = /\{\/\* 2\. Økonomi \/ Ekstraarbejde \*\/\}\n\s*\{!\['worker', 'apprentice', 'sales'\].includes\(profile\?\.role\) && \(\n\s*<div\n\s*onClick=\{\(\) => setActiveSubTab\('finance'\)\}[\s\S]*?\}\n\s*<\/div>\n\s*\)\}/;

content = content.replace(cardRegex, '');

// The finance content block is later down, labeled {/* TAB: ØKONOMI & FAKTURERING */}
const contentRegex = /\{\/\* TAB: ØKONOMI & FAKTURERING \*\/\}\n\s*\{activeSubTab === 'finance' && \([\s\S]*?\}\)\}/;
// Note: activeSubTab === 'finance' && ( ... ) could be large. We need a careful match.
// Let's do string replacement.
const startStr = "{/* TAB: ØKONOMI & FAKTURERING */}";
const endStr = "{/* TAB: TIMEREGISTRERING */}";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
}

fs.writeFileSync('src/components/Dashboard/CaseManagement.jsx', content);
