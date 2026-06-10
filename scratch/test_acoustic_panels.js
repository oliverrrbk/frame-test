import { performCalculation } from '../src/utils/calculator.js';

const dbSettings = { material_markup: 1.15, price_markup: 1.25 };
const formula = { 
    battenHours: 0.2, 
    vaporBarrierHours: 0.2, 
    insulationHours: 0.2,
    baseDriveCost: 500,
    hourlyRate: 500
};
const indexCat = {
    'Forskalling': 50,
    'Dampspærre inkl tape': 35,
    'Isolering (50-100mm)': 85,
    'Træloft (listeloft/paneler/rustikloft)': 120,
    'Akustikpaneler (standard plader)': 250
};

(async () => {
    console.log("=== Akustikpaneler (standard plader) ===");
    let res = await performCalculation({ category: 'ceilings', details: {
        amount: 50,
        material: 'Akustikpaneler (standard plader)',
        vaporAndInsulation: 'Beboeligt rum (Opvarmet etage)',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    }}, {}, dbSettings, formula, indexCat);
    console.log("Breakdown:");
    res.breakdownArr.forEach(b => console.log(" - " + b));
})();
