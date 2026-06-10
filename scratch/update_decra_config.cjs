const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// 1. Update matGroup for decra in getDynamicRoofImage
content = content.replace(
    /if \(matKey\.includes\('stl'\) \|\| matKey\.includes\('decra'\) \|\| matKey\.includes\('metal'\)\) matGroup = 'metal';/,
    `if (matKey.includes('stl') || matKey.includes('metal')) matGroup = 'metal';\n    if (matKey.includes('decra')) matGroup = 'decra';`
);

// 2. Add decra keys to getDynamicRoofImage map
const roofMapInsert = `
        'decra_pitch_flat': '/images/icon_decra_pitch_flat.png',
        'decra_pitch_pitched': '/images/icon_decra_pitch_pitched.png',
        'decra_type_saddle': '/images/icon_decra_pitch_pitched.png',
        'decra_type_valm': '/images/icon_decra_type_valm.png',
`;
content = content.replace(/(const map = \{)/, `$1${roofMapInsert}`);

// 3. Update matGroup for decra in getDynamicEavesImage
content = content.replace(
    /\/\/ Add other materials later when we generate them/,
    `if (matKey.includes('decra')) matGroup = 'decra';\n    // Add other materials later when we generate them`
);

// 4. Add decra keys to getDynamicEavesImage map
const eavesMapInsert = `
        // Decra images
        'decra_wood': '/images/icon_eaves_decra_wood.png',
        'decra_zinc': '/images/icon_eaves_decra_zinc.png',
        'decra_eternit': '/images/icon_eaves_decra_eternit.png',
        'decra_copper': '/images/icon_eaves_decra_copper.png',
`;
content = content.replace(/(\/\/ Eternit images \(to be generated\))/, `${eavesMapInsert}\n        $1`);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated questionsConfig.js for Decra!');
