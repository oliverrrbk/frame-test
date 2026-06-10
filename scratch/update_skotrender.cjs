const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Update skotrender images
content = content.replace(/\/images\/skotrender_no\.png/g, '/images/skotrender_no_v2_1781088025886.png');
content = content.replace(/\/images\/skotrender_yes\.png/g, '/images/skotrender_yes_v2_1781088016428.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated skotrender images!');
