const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

const dynamicImageFunc = `
const getDynamicRoofImage = (material, feature) => {
    const matKey = material ? material.toLowerCase().replace(/[^a-zæøå]/g, '') : 'default';
    
    // Mapping af det valgte materiale til en hovedgruppe (indtil vi har billeder til alt)
    let matGroup = 'default';
    if (matKey.includes('paptag')) matGroup = 'paptag';
    if (matKey.includes('tegl')) matGroup = 'tegl';

    const map = {
        'paptag_pitch_flat': '/images/roof_paptag_pitch_flat_1781082286953.png',
        'paptag_pitch_pitched': '/images/roof_paptag_pitch_pitched_1781082296906.png',
        'paptag_type_saddle': '/images/roof_paptag_pitch_pitched_1781082296906.png', // Paptag med høj rejsning er typisk saddel
        'paptag_type_valm': '/images/roof_paptag_type_valm_1781082314605.png',
        
        'tegl_pitch_flat': '/images/roof_pitch_flat.png', // Tegl på fladt tag findes ikke, vi viser bare default fladt
        'tegl_pitch_pitched': '/images/roof_tegl_pitch_pitched_1781082326395.png',
        'tegl_type_saddle': '/images/roof_tegl_pitch_pitched_1781082326395.png',
        'tegl_type_valm': '/images/roof_tegl_type_valm_1781082344704.png',

        'default_pitch_flat': '/images/roof_pitch_flat.png',
        'default_pitch_pitched': '/images/roof_pitch_pitched.png',
        'default_type_saddle': '/images/roof_type_saddle.png',
        'default_type_valm': '/images/roof_type_valm.png',
    };

    return map[\`\${matGroup}_\${feature}\`] || map[\`default_\${feature}\`];
};

export const QUESTIONS = {
`;

// Insert the function before export const QUESTIONS
content = content.replace('export const QUESTIONS = {', dynamicImageFunc);

// Replace roofPitch options
const oldRoofPitchOptions = `            options: [
                { label: 'Fladt tag / Meget lav hældning', img: '/images/roof_pitch_flat.png' },
                { label: 'Høj rejsning / Normal hældning', img: '/images/roof_pitch_pitched.png' }
            ] `;
const newRoofPitchOptions = `            options: (d) => [
                { label: 'Fladt tag / Meget lav hældning', img: getDynamicRoofImage(d.material, 'pitch_flat') },
                { label: 'Høj rejsning / Normal hældning', img: getDynamicRoofImage(d.material, 'pitch_pitched') }
            ] `;
content = content.replace(oldRoofPitchOptions, newRoofPitchOptions);

// Replace roofType options
const oldRoofTypeOptions = `            options: [
                { label: 'Saddeltag (Almindeligt tag med 2 gavle)', img: '/images/roof_type_saddle.png' },
                { label: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)', img: '/images/roof_type_valm.png' }
            ] `;
const newRoofTypeOptions = `            options: (d) => [
                { label: 'Saddeltag (Almindeligt tag med 2 gavle)', img: getDynamicRoofImage(d.material, 'type_saddle') },
                { label: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)', img: getDynamicRoofImage(d.material, 'type_valm') }
            ] `;
content = content.replace(oldRoofTypeOptions, newRoofTypeOptions);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully applied dynamic options!');
