const fs = require('fs');
const path = './src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldOnCancel = `onCancel={() => { setIsCreateLeadModalOpen(false); setCreateLeadMode(null); }}`;
const newOnCancel = `onCancel={() => setShowCreateLeadCancelConfirm(true)}`;

content = content.replace(oldOnCancel, newOnCancel);

fs.writeFileSync(path, content);
console.log('Fixed onCancel in Dashboard.jsx');
