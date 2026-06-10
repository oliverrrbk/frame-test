import { performCalculation } from '../src/utils/calculator.js';

const dbSettings = { material_markup: 1.15, price_markup: 1.25 };
const formula = { 
    battenHours: 0.2, 
    vaporBarrierHours: 0.2, 
    insulationHours: 0.2,
    mouldingHours: 0.2,
    baseDriveCost: 500,
    hourlyRate: 500
};
const indexCat = {
    'Forskalling': 50,
    'Dampspærre inkl tape': 35,
    'Isolering (50-100mm)': 85,
    'Skyggelister / Fuge': 45,
    'Maler: Spartel, filt og maling (pr m2)': 250,
    'Maler: Koordineringsgebyr (Fast pris)': 5000,
    'Elektriker: Etablering af spot/lampested (pr. stk)': 950,
    'Gipsloft (standard 2-lag)': 100,
    'Lydgipsloft (lyddæmpende gips)': 150,
    'Fibergipsloft (Fermacel)': 180,
    'Træloft (listeloft/paneler/rustikloft)': 120,
    'Troldtekt (akustikloft)': 130,
    'Nedhængt loft (systemloft)': 200,
    'Akustikpaneler (lameller)': 400,
    'Akustikpaneler (standard plader)': 250
};

async function runTest(desc, details) {
    console.log("=== " + desc + " ===");
    let res = await performCalculation({ category: 'ceilings', details: details }, {}, dbSettings, formula, indexCat);
    console.log("Price Range: " + res.priceRange);
    console.log("Labor Hours: " + res.calcData.laborHours);
    console.log("Material Cost (inkl markup): " + res.calcData.materialCost.toFixed(2));
    console.log("Total Est Ex VAT: " + res.calcData.finalEstimateExVat);
    console.log("Breakdown:");
    res.breakdownArr.forEach(b => console.log(" - " + b));
    console.log("");
}

(async () => {
    await runTest("1. Gipsloft, Opvarmet, Spots, Almindelig højde (Maler test)", {
        amount: 50,
        material: 'Gipsloft (standard 2-lag)',
        vaporAndInsulation: 'Beboeligt rum (Opvarmet etage)',
        ceilingHeight: 'Nej, almindelig loftshøjde',
        spots: 'Ja',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    });

    await runTest("2. Træloft, Koldt tagrum, Loft-til-kip, Ingen spots", {
        amount: 50,
        material: 'Træloft (listeloft/paneler/rustikloft)',
        vaporAndInsulation: 'Ikke beboeligt (Koldt tagrum)',
        ceilingHeight: 'Ja, loft-til-kip eller højere end 2,5m',
        spots: 'Nej',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    });

    await runTest("3. Akustikpaneler (standard plader), Ved ikke, Almindelig højde", {
        amount: 50,
        material: 'Akustikpaneler (standard plader)',
        vaporAndInsulation: 'Ved ikke (Tømreren vurderer)',
        ceilingHeight: 'Nej, almindelig loftshøjde',
        spots: 'Nej',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    });

    await runTest("4. Ekstrem lille opgave: 1 m2 Lydgipsloft, Spots", {
        amount: 1,
        material: 'Lydgipsloft (lyddæmpende gips)',
        vaporAndInsulation: 'Beboeligt rum (Opvarmet etage)',
        ceilingHeight: 'Nej, almindelig loftshøjde',
        spots: 'Ja',
        userSuppliesMaterials: false,
        disposal: 'Nej',
        distanceRoundTrip: 50
    });
})();
