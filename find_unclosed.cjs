const fs = require('fs');
const content = fs.readFileSync('src/components/Dashboard/CustomProjectCreator.jsx', 'utf8');
let openTags = [];
let idx = 0;
while (idx < content.length) {
    let openIdx = content.indexOf('<', idx);
    if (openIdx === -1) break;
    // skip comments
    if (content.substr(openIdx, 4) === '<!--') {
        idx = content.indexOf('-->', openIdx) + 3;
        continue;
    }
    // skip jsx comments
    if (content.substr(openIdx, 4) === '{/*') {
        idx = content.indexOf('*/}', openIdx) + 3;
        continue;
    }
    
    let isClosing = content[openIdx + 1] === '/';
    let spaceIdx = content.indexOf(' ', openIdx);
    let closeBracketIdx = content.indexOf('>', openIdx);
    if (closeBracketIdx === -1) break;
    
    let endTagIdx = spaceIdx !== -1 && spaceIdx < closeBracketIdx ? spaceIdx : closeBracketIdx;
    let tagName = content.substring(openIdx + (isClosing ? 2 : 1), endTagIdx).replace(/[\n\r]/g, '');
    
    // Ignore < style=...
    if (!/^[a-zA-Z0-9]+$/.test(tagName)) {
        idx = closeBracketIdx + 1;
        continue;
    }
    
    let isSelfClosing = content[closeBracketIdx - 1] === '/';
    
    if (!isSelfClosing) {
        if (isClosing) {
            let last = openTags.pop();
            if (last && last.name !== tagName) {
                console.log(`Mismatch! Expected ${last.name} but got ${tagName} at char ${openIdx}`);
                console.log(content.substr(openIdx - 100, 200));
            }
        } else {
            // Ignore specific tags
            if (!['input', 'img', 'br', 'hr', 'path'].includes(tagName.toLowerCase())) {
                openTags.push({name: tagName, pos: openIdx});
            }
        }
    }
    idx = closeBracketIdx + 1;
}

console.log('Unclosed tags:', openTags.map(t => `${t.name} at line ${content.substr(0, t.pos).split('\n').length}`));
