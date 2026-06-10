const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace images
content = content.replace(/\/images\/icon_paptag_1781084037411\.png/g, '/images/icon_paptag_v2_1781084313665.png');
content = content.replace(/\/images\/icon_tegl_1781083952519\.png/g, '/images/icon_tegl_v2_1781084324346.png');

// Remove "Stråtag" lines
const lines = content.split('\n');
const newLines = lines.filter(line => !line.includes('Stråtag (tækket tag)'));
content = newLines.join('\n');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated images and removed Stråtag!');
