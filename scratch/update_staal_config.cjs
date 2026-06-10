const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// 1. Update matGroup for staal in getDynamicRoofImage
content = content.replace(
    /if \(matKey\.includes\('stl'\) \|\| matKey\.includes\('metal'\)\) matGroup = 'metal';/,
    `if (matKey.includes('metal')) matGroup = 'metal';\n    if (matKey.includes('stål') || matKey.includes('stl') || matKey.includes('stålplader')) matGroup = 'staal';`
);

// 2. Add staal keys to getDynamicRoofImage map
const roofMapInsert = `
        'staal_pitch_flat': '/images/icon_staal_pitch_flat.png',
        'staal_pitch_pitched': '/images/icon_staal_pitch_pitched.png',
        'staal_type_saddle': '/images/icon_staal_pitch_pitched.png',
        'staal_type_valm': '/images/icon_staal_type_valm.png',
`;
content = content.replace(/(const map = \{)/, `$1${roofMapInsert}`);

// 3. Update matGroup for staal in getDynamicEavesImage
content = content.replace(
    /\/\/ Add other materials later when we generate them/,
    `if (matKey.includes('stål') || matKey.includes('stl') || matKey.includes('stålplader')) matGroup = 'staal';\n    // Add other materials later when we generate them`
);

// 4. Add staal keys to getDynamicEavesImage map
const eavesMapInsert = `
        // Stålplader images
        'staal_wood': '/images/icon_eaves_staal_wood.png',
        'staal_zinc': '/images/icon_eaves_staal_zinc.png',
        'staal_eternit': '/images/icon_eaves_staal_eternit.png',
        'staal_copper': '/images/icon_eaves_staal_copper.png',
`;
content = content.replace(/(\/\/ Decra images)/, `${eavesMapInsert}\n        $1`);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated questionsConfig.js for Stålplader!');
