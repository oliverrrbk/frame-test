const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// 1. Remove the Delivery block from top
const deliveryStart = `            {/* LEVERINGSOPLYSNINGER (Kun for ordrestyring) */}`;
const deliveryEndStr = `                )}
            </div>
            )}`;

let startIndex = content.indexOf(deliveryStart);
if (startIndex !== -1) {
    let endIndex = content.indexOf(deliveryEndStr, startIndex) + deliveryEndStr.length;
    let deliveryBlock = content.substring(startIndex, endIndex);
    
    // Remove it from its current position
    content = content.substring(0, startIndex) + content.substring(endIndex);

    // 2. Find the Budget Dashboard and insert it right above it
    const budgetStart = `            {/* BUDGET DASHBOARD */}`;
    const budgetIndex = content.indexOf(budgetStart);
    if (budgetIndex !== -1) {
        content = content.substring(0, budgetIndex) + deliveryBlock + '\n\n' + content.substring(budgetIndex);
    }
}

// 3. Fix minWidth: '300px'
content = content.replace(/minWidth: '300px'/g, "minWidth: '0'");

// 4. Also add textOverflow: 'ellipsis' to the input just in case
// Replace `readOnly={isLead}` with `readOnly={isLead}` and add `textOverflow: 'ellipsis'` to style.
content = content.replace(/minWidth: '0' }}>\s*<input/g, "minWidth: '0' }}>\n                                        <input");
content = content.replace(/flex: 1, minWidth: '0' }}>/g, "flex: 1, minWidth: '0', overflow: 'hidden' }}>");

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
console.log("MaterialList patched successfully.");
