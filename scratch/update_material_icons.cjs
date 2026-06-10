const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

const replacements = [
  { search: /\/images\/roof_felt_1776270233481\.png/g, replace: '/images/mat_paptag_1781083136045.png' },
  { search: /\/images\/roof_tile_1776270243468\.png/g, replace: '/images/mat_tegl_1781083155329.png' },
  { search: /\/images\/roof_eternit_1777277162521\.png/g, replace: '/images/mat_eternit_1781083144175.png' },
  { search: /\/images\/roof_decra_1777277191170\.png/g, replace: '/images/mat_decra_1781083190369.png' },
  { search: /\/images\/roof_steel_1776270253782\.png/g, replace: '/images/mat_staal_1781083200070.png' },
  { search: /\/images\/roof_concrete_tile_1777277204797\.png/g, replace: '/images/mat_beton_1781083165981.png' },
  { search: /\/images\/roof_slate_1777277221463\.png/g, replace: '/images/mat_skiffer_1781083209537.png' },
  { search: /\/images\/roof_thatch_1777277238724\.png/g, replace: '/images/mat_straa_1781083219566.png' },
  { search: /\/images\/roof_zinc_1777277255328\.png/g, replace: '/images/mat_zink_1781083229051.png' }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated material option images!');
