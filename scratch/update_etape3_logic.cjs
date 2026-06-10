const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

const oldFuncRegex = /const getDynamicRoofImage = \([\s\S]*?\};\n/m;

const newFunc = `const getDynamicRoofImage = (material, feature) => {
    const matKey = material ? material.toLowerCase().replace(/[^a-zæøå]/g, '') : 'default';
    
    // Mapping af det valgte materiale til en hovedgruppe (indtil vi har billeder til alt)
    let matGroup = 'default';
    if (matKey.includes('paptag')) matGroup = 'paptag';
    if (matKey.includes('tegl')) matGroup = 'tegl';
    if (matKey.includes('eternit')) matGroup = 'eternit';
    if (matKey.includes('stl') || matKey.includes('decra') || matKey.includes('metal')) matGroup = 'metal'; // stål, decra, metal

    const map = {
        // PAPTAG
        'paptag_pitch_flat': '/images/roof_paptag_pitch_flat_1781082286953.png',
        'paptag_pitch_pitched': '/images/roof_paptag_pitch_pitched_1781082296906.png',
        'paptag_type_saddle': '/images/roof_paptag_pitch_pitched_1781082296906.png', 
        'paptag_type_valm': '/images/roof_paptag_type_valm_danish_1781082657746.png', // OPDATERET (Dansk stil)
        
        // TEGL
        'tegl_pitch_flat': '/images/roof_pitch_flat.png', // Tegl på fladt tag findes ikke, vi viser bare default fladt
        'tegl_pitch_pitched': '/images/roof_tegl_pitch_pitched_1781082326395.png',
        'tegl_type_saddle': '/images/roof_tegl_pitch_pitched_1781082326395.png',
        'tegl_type_valm': '/images/roof_tegl_type_valm_1781082344704.png',

        // ETERNIT
        'eternit_pitch_flat': '/images/roof_pitch_flat.png',
        'eternit_pitch_pitched': '/images/roof_eternit_pitch_pitched_1781082667709.png',
        'eternit_type_saddle': '/images/roof_eternit_pitch_pitched_1781082667709.png',
        'eternit_type_valm': '/images/roof_eternit_type_valm_1781082687859.png',

        // STÅL / DECRA / METAL
        'metal_pitch_flat': '/images/roof_pitch_flat.png',
        'metal_pitch_pitched': '/images/roof_metal_pitch_pitched_1781082699843.png',
        'metal_type_saddle': '/images/roof_metal_pitch_pitched_1781082699843.png',
        'metal_type_valm': '/images/roof_metal_type_valm_1781082719765.png',

        // DEFAULT (Fallback for skiffer, stråtag etc.)
        'default_pitch_flat': '/images/roof_pitch_flat.png',
        'default_pitch_pitched': '/images/roof_pitch_pitched.png',
        'default_type_saddle': '/images/roof_type_saddle.png',
        'default_type_valm': '/images/roof_type_valm.png',
    };

    return map[\`\${matGroup}_\${feature}\`] || map[\`default_\${feature}\`];
};
`;

content = content.replace(oldFuncRegex, newFunc);
fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully updated getDynamicRoofImage!');
