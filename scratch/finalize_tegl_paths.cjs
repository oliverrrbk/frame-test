const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with actual generated filenames
content = content.replace(/icon_tegl_pitch_flat\.png/g, 'icon_tegl_pitch_flat_1781090448014.png');
content = content.replace(/icon_tegl_pitch_pitched\.png/g, 'icon_tegl_pitch_pitched_1781090458578.png');
content = content.replace(/icon_tegl_type_valm\.png/g, 'icon_tegl_type_valm_1781090468579.png');

content = content.replace(/icon_eaves_tegl_wood\.png/g, 'icon_eaves_tegl_wood_1781090496168.png');
// We don't have the remaining 3 yet due to quota limit. We temporarily point them to the paptag versions so the UI doesn't break with 404s.
content = content.replace(/icon_eaves_tegl_zinc\.png/g, 'icon_eaves_zinc_1781085031300.png');
content = content.replace(/icon_eaves_tegl_eternit\.png/g, 'icon_eaves_eternit_1781085041058.png');
content = content.replace(/icon_eaves_tegl_copper\.png/g, 'icon_eaves_copper_1781085052563.png');

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully finalized partial Tegl image paths!');
