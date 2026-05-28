import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read questionsConfig.js
const qPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let qContent = fs.readFileSync(qPath, 'utf8');

// Read prices.js
const pPath = path.join(__dirname, '../src/prices.js');
let pContent = fs.readFileSync(pPath, 'utf8');

// Extract MATERIAL_INDEX keys
// We'll just do a dirty regex or eval for MATERIAL_INDEX
let materialsFromPrices = [];
const matRegex = /export const MATERIAL_INDEX = (\{[\s\S]*?\});/m;
const match = pContent.match(matRegex);
if (match) {
    const rawObj = match[1];
    // Simple parsing of keys from object string
    const keyRegex = /'([^']+)'\s*:/g;
    let kMatch;
    while ((kMatch = keyRegex.exec(rawObj)) !== null) {
        materialsFromPrices.push(kMatch[1]);
    }
}

// Extract materials from questionsConfig.js
// Find all objects with id: 'material', 'roofMaterial', 'facadeMaterial', 'floorType', 'oldFloorType', 'underlayment', 'terraceWood', 'facadeWood', 'ceilingMaterial' etc
let materialsFromQuestions = new Set();
const optionsRegex = /options:\s*\[([\s\S]*?)\]/g;
let optMatch;
while ((optMatch = optionsRegex.exec(qContent)) !== null) {
    const labelsRegex = /label:\s*'([^']+)'/g;
    let lMatch;
    while ((lMatch = labelsRegex.exec(optMatch[1])) !== null) {
        // Exclude generic responses
        if (!['Ja', 'Nej', 'Ved ikke', 'Standard', 'Premium'].includes(lMatch[1])) {
            materialsFromQuestions.add(lMatch[1]);
        }
    }
}

let missing = [];
for (let mat of materialsFromQuestions) {
    if (!materialsFromPrices.includes(mat)) {
        missing.push(mat);
    }
}

console.log("Missing materials in prices.js:");
console.log(missing);
