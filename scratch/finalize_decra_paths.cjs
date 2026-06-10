const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with actual generated filenames
content = content.replace(/icon_decra_pitch_flat\.png/g, 'icon_decra_pitch_flat_1781089421097.png');
content = content.replace(/icon_decra_pitch_pitched\.png/g, 'icon_decra_pitch_pitched_1781089431863.png');
content = content.replace(/icon_decra_type_valm\.png/g, 'icon_decra_type_valm_1781089442868.png');

content = content.replace(/icon_eaves_decra_wood\.png/g, 'icon_eaves_decra_wood_1781089465423.png');
content = content.replace(/icon_eaves_decra_zinc\.png/g, 'icon_eaves_decra_zinc_1781089473085.png');
content = content.replace(/icon_eaves_decra_eternit\.png/g, 'icon_eaves_decra_eternit_1781089482592.png');
content = content.replace(/icon_eaves_decra_copper\.png/g, 'icon_eaves_decra_copper_1781089490428.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully finalized Decra image paths!');
