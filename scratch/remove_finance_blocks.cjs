const fs = require('fs');

const path = 'src/components/Dashboard/CaseManagement.jsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Delete lines 1625 to 1711 (0-indexed: 1624 to 1710)
// But to be safe, let's find the exact indices by looking for the comments.
const startBtn = lines.findIndex(l => l.includes('{/* 2. Økonomi / Ekstraarbejde */}'));
let endBtn = -1;
if (startBtn !== -1) {
    // Find the closing )} for the button, roughly 36 lines down
    endBtn = startBtn + 36;
}

const startContent = lines.findIndex(l => l.includes('{/* TAB: ØKONOMI & FAKTURERING */}'));
let endContent = -1;
if (startContent !== -1) {
    endContent = lines.findIndex((l, i) => i > startContent && l.includes('{/* TAB 4: TIMEREGISTRERING */}'));
}

if (startContent !== -1 && endContent !== -1) {
    // Remove content first (so line numbers of the button don't shift... oh wait, button is before content)
    lines.splice(startContent, endContent - startContent);
}

if (startBtn !== -1 && endBtn !== -1) {
    lines.splice(startBtn, endBtn - startBtn + 1);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Removed finance blocks from CaseManagement.jsx');
