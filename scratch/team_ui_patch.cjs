const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/CaseManagement.jsx', 'utf8');

// The replacement logic is quite large, so I will replace everything from `{/* MANDSKABS DELEGERING BAR */}`
// down to `<div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>` (which is the tabs).

const startToken = "{/* MANDSKABS DELEGERING BAR */}";
const endToken = "<div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>";
// Let me grep the exact end token first just to be safe.
