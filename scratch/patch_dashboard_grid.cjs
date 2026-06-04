const fs = require('fs');
const file = 'src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}`;
const replacementStr = `div className="quote-triple-grid"`;

const targetStr2 = `div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'end', marginTop: '8px' }}`;
const replacementStr2 = `div className="quote-triple-grid" style={{ marginTop: '8px', gap: '8px' }}`;

content = content.replace(targetStr, replacementStr);
content = content.replace(targetStr2, replacementStr2);

fs.writeFileSync(file, content);
console.log("Dashboard grid patch success");
