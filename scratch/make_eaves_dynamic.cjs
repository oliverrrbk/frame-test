const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// 1. Add getDynamicEavesImage
const eavesFuncStr = `
const getDynamicEavesImage = (material, eavesType) => {
    const matKey = material ? material.toLowerCase().replace(/[^a-zæøå]/g, '') : 'default';
    
    let matGroup = 'paptag'; // default to paptag as that's what we have currently
    if (matKey.includes('paptag')) matGroup = 'paptag';
    if (matKey.includes('eternit') || matKey.includes('tagplader')) matGroup = 'eternit';
    // Add other materials later when we generate them
    // if (matKey.includes('tegl')) matGroup = 'tegl';

    const map = {
        'paptag_wood': '/images/icon_eaves_wood_1781085022695.png',
        'paptag_zinc': '/images/icon_eaves_zinc_1781085031300.png',
        'paptag_eternit': '/images/icon_eaves_eternit_1781085041058.png',
        'paptag_copper': '/images/icon_eaves_copper_1781085052563.png',
        
        // Eternit images (to be generated)
        'eternit_wood': '/images/icon_eaves_eternit_wood.png',
        'eternit_zinc': '/images/icon_eaves_eternit_zinc.png',
        'eternit_eternit': '/images/icon_eaves_eternit_eternit.png',
        'eternit_copper': '/images/icon_eaves_eternit_copper.png',
    };

    const key = \`\${matGroup}_\${eavesType}\`;
    return map[key] || map[\`paptag_\${eavesType}\`] || '/images/placeholder.jpg';
};
`;

// Insert it right after getDynamicRoofImage
if (!content.includes('getDynamicEavesImage')) {
    content = content.replace(/(const getDynamicRoofImage = [\s\S]*?\n\};\n)/, `$1\n${eavesFuncStr}\n`);
}

// 2. Update eavesMaterial options to use the function
const newEavesOptions = `options: (d) => [
                { label: 'Træ', img: getDynamicEavesImage(d.material, 'wood') },
                { label: 'Zink', img: getDynamicEavesImage(d.material, 'zinc') },
                { label: 'Eternit', img: getDynamicEavesImage(d.material, 'eternit') },
                { label: 'Kobber', img: getDynamicEavesImage(d.material, 'copper') }
            ]`;

// Find the eavesMaterial block and replace its static options array
const oldEavesOptionsRegex = /options:\s*\[[\s\S]*?\](?=\s*\})/m;
content = content.replace(oldEavesOptionsRegex, newEavesOptions);

fs.writeFileSync(configPath, content, 'utf8');
console.log('Successfully made eavesMaterial dynamic!');
