const fs = require('fs');
let content = fs.readFileSync('src/components/Wizard/questionsConfig.js', 'utf8');

// 1. Remove all ownMaterials and materialLink objects (they are on single lines)
content = content.replace(/\n\s*\{\s*id:\s*'ownMaterials'.*?\},/g, '');
content = content.replace(/\n\s*\{\s*id:\s*'materialLink'.*?\},/g, '');

// 2. Remove simple condition: (d) => d.ownMaterials === '...',
content = content.replace(/\n\s*condition:\s*\(d\)\s*=>\s*d\.ownMaterials\s*===[^\,]+,/g, '');

// 3. Clean up compound conditions (e.g. && d.ownMaterials === ...)
content = content.replace(/ && d\.ownMaterials\s*===[^,']+'[^,']+'/g, '');

// Wait, the regex `[^,']+'[^,']+'` might be tricky. Let's just use:
content = content.replace(/ && d\.ownMaterials === '[^']+'/g, '');

// 4. Add ownMaterials to Kitchen
const kitchenInsertPoint = "        { id: 'kitchenBrand', type: 'text', label: 'Hvilket mærke/leverandør er det nye køkken fra (fx IKEA, HTH, Kvik)?' },";
const kitchenQuestions = `\n        { id: 'ownMaterials', type: 'select', label: 'Står du selv for indkøb af selve køkkenet?', options: ['Ja, jeg har allerede købt det (kun pris på montering)', 'Nej, tømreren skal stå for indkøb'] },\n        { id: 'materialLink', type: 'text', label: 'Indsæt evt. et link til det køkken du har købt:', condition: { field: 'ownMaterials', value: 'Ja, jeg har allerede købt det (kun pris på montering)' } },`;
content = content.replace(kitchenInsertPoint, kitchenInsertPoint + kitchenQuestions);

// Save
fs.writeFileSync('src/components/Wizard/questionsConfig.js', content, 'utf8');
console.log('Update complete');
