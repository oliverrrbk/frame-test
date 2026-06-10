const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace the older Tegl image that was missed
content = content.replace(/\/images\/roof_tile_1776270239163\.png/g, '/images/icon_tegl_v2_1781084324346.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Replaced lingering Tegl image!');
