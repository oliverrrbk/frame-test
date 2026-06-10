const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// The original Monaco villa had a slightly different filename than the one we replaced
content = content.replace(/\/images\/roof_felt_1776270223442\.png/g, '/images/icon_paptag_v2_1781084313665.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Replaced Monaco villa!');
