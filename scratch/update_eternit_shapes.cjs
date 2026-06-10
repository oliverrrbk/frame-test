const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Update eternit images
content = content.replace(/\/images\/roof_eternit_pitch_flat_1781082361664\.png/g, '/images/icon_eternit_pitch_flat_1781088095577.png');
content = content.replace(/\/images\/roof_eternit_pitch_pitched_1781082370776\.png/g, '/images/icon_eternit_pitch_pitched_1781088105145.png');
content = content.replace(/\/images\/roof_eternit_type_valm_1781082387190\.png/g, '/images/icon_eternit_type_valm_1781088114156.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated eternit shape images!');
