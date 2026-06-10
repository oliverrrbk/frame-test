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
    'Træloft (listeloft/paneler/rustikloft)': 120
};

(async () => {
    console.log("=== Beboeligt rum (Opvarmet etage) ===");
    let res1 = await performCalculation({ category: 'ceilings', details: {
        amount: 50,
        material: 'Træloft (listeloft/paneler/rustikloft)',
        vaporAndInsulation: 'Beboeligt rum (Opvarmet etage)',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    }}, {}, dbSettings, formula, indexCat);
    console.log(res1.breakdownArr.filter(s => s.includes('dampspærre') || s.includes('isolering') || s.includes('Dampspærre')));

    console.log("\n=== Ikke beboeligt (Koldt tagrum) ===");
    let res2 = await performCalculation({ category: 'ceilings', details: {
        amount: 50,
        material: 'Træloft (listeloft/paneler/rustikloft)',
        vaporAndInsulation: 'Ikke beboeligt (Koldt tagrum)',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    }}, {}, dbSettings, formula, indexCat);
    console.log(res2.breakdownArr.filter(s => s.includes('dampspærre') || s.includes('isolering') || s.includes('Dampspærre')));

    console.log("\n=== Ved ikke (Tømreren vurderer) ===");
    let res3 = await performCalculation({ category: 'ceilings', details: {
        amount: 50,
        material: 'Træloft (listeloft/paneler/rustikloft)',
        vaporAndInsulation: 'Ved ikke (Tømreren vurderer)',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    }}, {}, dbSettings, formula, indexCat);
    console.log(res3.breakdownArr.filter(s => s.includes('dampspærre') || s.includes('isolering') || s.includes('Dampspærre')));
})();
