import { performCalculation } from '../src/utils/calculator.js';

const dbSettings = { material_markup: 1.15, price_markup: 1.25 };
const formula = { 
    battenHours: 0.2, 
    insulationHours: 0.2,
    baseDriveCost: 500,
    hourlyRate: 500
};
const indexCat = {
    'Isolering (50-100mm)': 85,
    'Forskalling': 50
};

async function test() {
    let res = await performCalculation({
        category: 'roof',
        details: {
            roofTaskType: 'Loft-opgaver (Efterisolering & Gangbro)',
            atticSubTask: 'Både efterisolering og ny gangbro',
            amount: 100, // Grundplan
            floors: '1-plan (Stueplan)',
            houseAge: 1970,
            insulationAmount: '100 mm',
            ventilationPlates: 'Ja, det skal der',
            removeOldWalkway: 'Ja, fjern og bortskaf gammelt gulv',
            walkwayM2: 20,
            newAtticHatch: 'Ja',
            userSuppliesMaterials: false,
            distanceRoundTrip: 20
        }
    }, {}, dbSettings, formula, indexCat);

    console.log("=== Isolering og gangbro (Etape 1.5) ===");
    res.breakdownArr.forEach(b => console.log(" - " + b));
    console.log("Hours: " + res.calcData.laborHours);
}

test();
