const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

const replacements = [
  { search: /\/images\/mat_paptag_1781083136045\.png/g, replace: '/images/icon_paptag_1781084037411.png' },
  { search: /\/images\/mat_tegl_1781083155329\.png/g, replace: '/images/icon_tegl_1781083952519.png' },
  { search: /\/images\/mat_eternit_1781083144175\.png/g, replace: '/images/icon_eternit_1781084005360.png' },
  { search: /\/images\/mat_decra_1781083190369\.png/g, replace: '/images/icon_decra_1781084015600.png' },
  { search: /\/images\/mat_staal_1781083200070\.png/g, replace: '/images/icon_staal_1781084026597.png' },
  { search: /\/images\/mat_beton_1781083165981\.png/g, replace: '/images/icon_beton_1781083962338.png' },
  { search: /\/images\/mat_skiffer_1781083209537\.png/g, replace: '/images/icon_skiffer_1781083973083.png' },
  { search: /\/images\/mat_straa_1781083219566\.png/g, replace: '/images/icon_straa_1781084061029.png' },
  { search: /\/images\/mat_zink_1781083229051\.png/g, replace: '/images/icon_zink_1781083981812.png' }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated material option icons to full houses!');
