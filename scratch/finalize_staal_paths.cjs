const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with actual generated filenames
content = content.replace(/icon_staal_pitch_flat\.png/g, 'icon_staal_pitch_flat_1781089942615.png');
content = content.replace(/icon_staal_pitch_pitched\.png/g, 'icon_staal_pitch_pitched_1781089951042.png');
content = content.replace(/icon_staal_type_valm\.png/g, 'icon_staal_type_valm_1781089961075.png');

content = content.replace(/icon_eaves_staal_wood\.png/g, 'icon_eaves_staal_wood_1781089985129.png');
content = content.replace(/icon_eaves_staal_zinc\.png/g, 'icon_eaves_staal_zinc_1781089993896.png');
content = content.replace(/icon_eaves_staal_eternit\.png/g, 'icon_eaves_staal_eternit_1781090005201.png');
content = content.replace(/icon_eaves_staal_copper\.png/g, 'icon_eaves_staal_copper_1781090015037.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully finalized Stålplader image paths!');
