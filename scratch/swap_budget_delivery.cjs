const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// Extract the budget dashboard
const budgetRegex = /(\{\/\* BUDGET DASHBOARD \*\/\}[\s\S]*?<\/div>\n\s*\)\})/;
const budgetMatch = content.match(budgetRegex);
if (budgetMatch) {
    const budgetCode = budgetMatch[1];
    
    // Remove it from its current position
    content = content.replace(budgetRegex, '');
    
    // Insert it before LEVERINGSINFO
    const deliveryRegex = /(\{\/\* LEVERINGSINFO \(Skjult for svende\) \*\/\})/;
    content = content.replace(deliveryRegex, budgetCode + '\n\n            $1');
    
    fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
    console.log("Successfully swapped!");
} else {
    console.log("Budget dashboard not found.");
}
