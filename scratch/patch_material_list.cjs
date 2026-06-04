const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// The block to extract
const startMarker = `            {/* LEVERINGSINFO (ACCORDION) */}`;
const endMarker = `            )}

            {/* MATERIALELISTER (ACCORDIONS) */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // We want to extract up to the start of endMarker, and include the `            )}` 
    // Wait, endMarker starts with `            )}`!
    // We want to include that `            )}` in the extracted block.
    // So the block ends at endIndex + `            )}`.length + 1 for newline.
    
    const firstEndBrace = `            )}`;
    const actualEndIndex = endIndex + firstEndBrace.length;
    
    let blockToMove = content.substring(startIndex, actualEndIndex);
    
    // Remove the block from original place
    content = content.substring(0, startIndex) + content.substring(actualEndIndex);
    
    // Clean up empty lines
    content = content.replace(/\n\s*\n\s*{\/\* MATERIALELISTER/g, '\n\n            {/* MATERIALELISTER');
    
    // Insert point
    const insertPoint = `            {/* BUDGET DASHBOARD */}`;
    const insertIndex = content.indexOf(insertPoint);
    
    if (insertIndex !== -1) {
        content = content.substring(0, insertIndex) + blockToMove + '\n\n' + content.substring(insertIndex);
    }
}

// 2. Fix the flex minWidth issue
content = content.replace(/flex: 1, minWidth: '300px'/g, "flex: 1, minWidth: '0', overflow: 'hidden'");

// 3. Fix the Mangler leveringsadresse word wrap issue
// The paragraph:
const oldP = `<p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? '#ef4444' : '#64748b', fontWeight: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? 'bold' : 'normal' }}>`;
const newP = `<p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? '#ef4444' : '#64748b', fontWeight: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? 'bold' : 'normal', wordBreak: 'break-word', whiteSpace: 'normal' }}>`;
content = content.replace(oldP, newP);

// 4. Input ellipsis
const oldInput = `                                            readOnly={isLead}
                                            onChange={(e) => {`;
const newInput = `                                            readOnly={isLead}
                                            onChange={(e) => {`;
// Actually we can add textOverflow: 'ellipsis' to the input style
content = content.replace(/borderRadius: '6px',/g, "borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden',");

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
console.log("Patched MaterialList");
