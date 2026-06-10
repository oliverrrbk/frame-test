const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// The replacement should strictly target the label "Komplet tagudskiftning (Nyt tag)"
content = content.replace(
    /\{ label: 'Komplet tagudskiftning \(Nyt tag\)', img: '\/images\/icon_paptag_v2_1781084313665\.png' \}/g, 
    "{ label: 'Komplet tagudskiftning (Nyt tag)', img: '/images/icon_roof_replacement_1781084632892.png' }"
);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Updated Komplet tagudskiftning image!');
