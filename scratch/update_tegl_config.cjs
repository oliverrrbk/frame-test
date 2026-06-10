const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// 1. Update matGroup for tegl in getDynamicRoofImage (It's already there)
// `if (matKey.includes('tegl')) matGroup = 'tegl';`

// 2. Add tegl keys to getDynamicRoofImage map
const roofMapInsert = `
        'tegl_pitch_flat': '/images/icon_tegl_pitch_flat.png',
        'tegl_pitch_pitched': '/images/icon_tegl_pitch_pitched.png',
        'tegl_type_saddle': '/images/icon_tegl_pitch_pitched.png',
        'tegl_type_valm': '/images/icon_tegl_type_valm.png',
`;
// Replace the old tegl keys
content = content.replace(
    /'tegl_pitch_flat': '.*?',\s*'tegl_pitch_pitched': '.*?',\s*'tegl_type_saddle': '.*?',\s*'tegl_type_valm': '.*?',/g,
    roofMapInsert.trim() + ','
);

// 3. Update matGroup for tegl in getDynamicEavesImage
content = content.replace(
    /\/\/ Add other materials later when we generate them/,
    `if (matKey.includes('tegl')) matGroup = 'tegl';\n    // Add other materials later when we generate them`
);

// 4. Add tegl keys to getDynamicEavesImage map
const eavesMapInsert = `
        // Tegl images
        'tegl_wood': '/images/icon_eaves_tegl_wood.png',
        'tegl_zinc': '/images/icon_eaves_tegl_zinc.png',
        'tegl_eternit': '/images/icon_eaves_tegl_eternit.png',
        'tegl_copper': '/images/icon_eaves_tegl_copper.png',
`;
content = content.replace(/(\/\/ Stålplader images)/, `${eavesMapInsert}\n        $1`);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated questionsConfig.js for Tegl!');
