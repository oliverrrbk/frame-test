const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Update placeholder
content = content.replace(/placeholder: 'fx 1970'/g, "placeholder: 'Eksempel: 1970'");

// Update images
content = content.replace(/\/images\/eaves_wood\.png/g, '/images/icon_eaves_wood_1781085022695.png');
content = content.replace(/\/images\/eaves_zinc\.png/g, '/images/icon_eaves_zinc_1781085031300.png');
content = content.replace(/\/images\/eaves_eternit\.png/g, '/images/icon_eaves_eternit_1781085041058.png');
content = content.replace(/\/images\/eaves_copper\.png/g, '/images/icon_eaves_copper_1781085052563.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated placeholder and eaves images!');
