const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

// Extract the eavesMaterial block
const eavesRegex = /(\{\s*id:\s*'eavesMaterial'[\s\S]*?\]\s*\},\n?)/;
const match = content.match(eavesRegex);

if (match) {
    const eavesBlock = match[0];
    // Remove the block from its current location
    content = content.replace(eavesBlock, '');
    
    // Find where roofType block ends
    const roofTypeRegex = /(\{\s*id:\s*'roofType'[\s\S]*?\]\s*\},\n?)/;
    
    // Insert eavesBlock right after roofType block
    content = content.replace(roofTypeRegex, `$1${eavesBlock}`);
    
    fs.writeFileSync(configPath, content, 'utf8');
    console.log('Moved eavesMaterial block up!');
} else {
    console.log('Could not find eavesMaterial block');
}
