import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let qContent = fs.readFileSync(qPath, 'utf8');

const pPath = path.join(__dirname, '../src/prices.js');
let pContent = fs.readFileSync(pPath, 'utf8');

let materialsFromPrices = [];
const matRegex = /export const MATERIAL_INDEX = (\{[\s\S]*?\});/m;
const match = pContent.match(matRegex);
if (match) {
    const rawObj = match[1];
    const keyRegex = /'([^']+)'\s*:/g;
    let kMatch;
    while ((kMatch = keyRegex.exec(rawObj)) !== null) {
        materialsFromPrices.push(kMatch[1]);
    }
}

// only look at options arrays for specific fields
const materialKeys = [
    'material', 'roofMaterial', 'facadeMaterial', 'eavesMaterial',
    'floorType', 'terraceWood', 'facadeWood', 'ceilingMaterial',
    'doorModel', 'windowType', 'postMaterial'
];

let materialsFromQuestions = new Set();
const qsRegex = /id:\s*'([^']+)'[\s\S]*?options:\s*\[([\s\S]*?)\]/g;
let qsMatch;
while ((qsMatch = qsRegex.exec(qContent)) !== null) {
    if (materialKeys.includes(qsMatch[1])) {
        const labelsRegex = /label:\s*'([^']+)'/g;
        let lMatch;
        while ((lMatch = labelsRegex.exec(qsMatch[2])) !== null) {
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

console.log("Missing material keys:");
console.log(missing);
