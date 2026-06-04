const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// 1. Extract Delivery Info
const delStart = `            {/* LEVERINGSINFO (ACCORDION) */}`;
const delEnd = `                )}
            </div>
            )}`;
let ds = content.indexOf(delStart);
let de = content.indexOf(delEnd, ds) + delEnd.length;
let deliveryBlock = content.substring(ds, de);
content = content.substring(0, ds) + content.substring(de);

// 2. Extract Budget Dashboard
const budStart = `            {/* BUDGET DASHBOARD */}`;
const budEnd = `                </div>
            )}`;
let bs = content.indexOf(budStart);
let be = content.indexOf(budEnd, bs) + budEnd.length;
let budgetBlock = content.substring(bs, be);
content = content.substring(0, bs) + content.substring(be);

// Clean up extra newlines
content = content.replace(/\n\s*\n\s*{\/\* MATERIALELISTER/g, '\n\n            {/* MATERIALELISTER');

// 3. Find insertion point (After Opret ny liste knap, before SLET LISTE MODAL)
// Actually, let's insert it before GLOBAL GEM KNAP
const insertStart = `            {/* GLOBAL GEM KNAP */}`;
let is = content.indexOf(insertStart);
content = content.substring(0, is) + deliveryBlock + '\n\n' + budgetBlock + '\n\n' + content.substring(is);

// 4. Fix flex: 1, minWidth: '0' issue in the title
// The input has flex: 1 and minWidth: '0', but the parent div is also flex: 1.
// If the input doesn't have a minimum width, it can shrink to 0 if the right side items take space.
// In the screenshot, the "AFVENTER" button is pushing it.
// To fix it, we should let the input have a minWidth of something small like '100px', or remove flex: 1 from the AFVENTER button container.
// Wait, the title input is in:
/*
<div style={{ flex: 1, minWidth: '0', overflow: 'hidden' }}>
    <input style={{ ... textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' ... }} />
</div>
*/
// Let's remove overflow: 'hidden' from the div, and just use minWidth: '0' on it.
content = content.replace(/<div style={{ flex: 1, minWidth: '0', overflow: 'hidden' }}>/g, "<div style={{ flex: 1, minWidth: '0' }}>");
content = content.replace(/flex: 1, minWidth: '0'/g, "flex: 1, minWidth: '100px'");

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
console.log("Layout fixed");
