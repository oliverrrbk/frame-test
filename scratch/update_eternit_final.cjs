const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Update eternit flat roof to the new version
content = content.replace(/\/images\/icon_eternit_pitch_flat_1781088095577\.png/g, '/images/icon_eternit_pitch_flat_v2_1781088483466.png');

// Update eternit eaves images
content = content.replace(/\/images\/icon_eaves_eternit_wood\.png/g, '/images/icon_eaves_eternit_wood_1781088504704.png');
content = content.replace(/\/images\/icon_eaves_eternit_zinc\.png/g, '/images/icon_eaves_eternit_zinc_1781088513627.png');
content = content.replace(/\/images\/icon_eaves_eternit_eternit\.png/g, '/images/icon_eaves_eternit_eternit_1781088523121.png');
content = content.replace(/\/images\/icon_eaves_eternit_copper\.png/g, '/images/icon_eaves_eternit_copper_1781088532058.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated eternit final images!');
