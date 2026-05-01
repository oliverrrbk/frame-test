const fs = require('fs');
let content = fs.readFileSync('src/components/Wizard/questionsConfig.js', 'utf8');

content = content.replace(/,\s*jeg ønsker et samlet tilbud inkl\. materialer',/g, ',');
content = content.replace(/,\s*jeg ønsker et samlet tilbud inkl\. alt materiale',/g, ',');
content = content.replace(/,\s*jeg ønsker et samlet tilbud inkl\. alle materialer',/g, ',');

fs.writeFileSync('src/components/Wizard/questionsConfig.js', content, 'utf8');
console.log('Fixed syntax error');
