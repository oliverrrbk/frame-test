const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace images for ceilings
const replacements = [
  { search: /\/images\/ceiling_wood_1776270268417\.png/g, replace: '/images/ceil_wood_1781083315165.png' },
  { search: /\/images\/ceiling_drywall_1776270282269\.png/g, replace: '/images/ceil_gypsum_1781083325455.png' }, // Default gips
  { search: /\{ label: 'Lydgipsloft \(lyddæmpende gips\)', img: '\/images\/ceil_gypsum_1781083325455\.png' \}/g, replace: "{ label: 'Lydgipsloft (lyddæmpende gips)', img: '/images/ceil_sound_gypsum_1781083334939.png' }" }, // Specifik lydgips (after replacing the generic one)
  { search: /\/images\/ceiling_fermacell_1776270315915\.png/g, replace: '/images/ceil_fiber_gypsum_1781083365011.png' },
  { search: /\/images\/ceiling_troldtekt_1776270333057\.png/g, replace: '/images/ceil_troldtekt_1781083375390.png' }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

// Add the new Akustikpaneler (ikke lameller) option
const newOption = `                { label: 'Akustikpaneler (glatte plader)', img: '/images/ceil_acoustic_panel_1781083384703.png' },\n                { label: 'Akustikpaneler (lameller)'`;

content = content.replace(/                \{ label: 'Akustikpaneler \(lameller\)'/g, newOption);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated ceiling option images and added glatte akustikpaneler!');
