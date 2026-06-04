const fs = require('fs');

// 1. Dashboard.jsx padding reduction
let dashContent = fs.readFileSync('src/components/Dashboard/Dashboard.jsx', 'utf8');
const oldPadding = `marginBottom: '24px', padding: '24px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column'`;
const newPadding = `marginBottom: '24px', padding: '12px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column'`;
dashContent = dashContent.replace(oldPadding, newPadding);
fs.writeFileSync('src/components/Dashboard/Dashboard.jsx', dashContent);


// 2. MaterialList.jsx modifications
let mlContent = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// A. Fix minWidth: '300px' which causes overflow
mlContent = mlContent.replace(/minWidth: '300px'/g, "minWidth: '0'");

// B. Move Delivery Info.
// We need to extract the block from `            {!isLead && (` that wraps Delivery Info, up to the end of that block.
// Wait, the delivery info starts at:
/*
            {/* LEVERINGSOPLYSNINGER (Kun for ordrestyring) * /}
            {!isLead && (
                <div style={{ ... }}>
                    {/* ACCORDION HEADER * /}
                    <div ...
*/
// Let's use regex to extract it safely or string manipulation.
