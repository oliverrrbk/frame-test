const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// The block to extract
const startMarker = `            {/* LEVERINGSINFO (ACCORDION) */}`;
const endMarker = `            )}

            {/* MATERIALELISTER (ACCORDIONS) */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    let blockToMove = content.substring(startIndex, endIndex);
    
    // Remove the block from the original location
    content = content.substring(0, startIndex) + content.substring(endIndex);

    // Find where to insert it: right above the Budget Dashboard
    const insertPoint = `            {/* BUDGET DASHBOARD */}`;
    const insertIndex = content.indexOf(insertPoint);
    
    if (insertIndex !== -1) {
        content = content.substring(0, insertIndex) + blockToMove + '\n' + content.substring(insertIndex);
    } else {
        console.log("Could not find insert point");
    }
} else {
    console.log("Could not find block boundaries");
}

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
console.log("Done swap");
