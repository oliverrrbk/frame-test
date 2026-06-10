import { performCalculation } from '../src/utils/calculator.js';

// Dummy settings and formula to mock db
const dbSettings = {
    hourly_rate: 550,
    material_markup: 1.15,
    equipment_markup: 1.05
};

const dbMaterials = [
    { category: 'terrace', material_name: 'Trykimprægneret', price: 150, is_base_formula: false },
    { category: 'terrace', material_name: 'Thermowood', price: 350, is_base_formula: false },
    { category: 'terrace', material_name: 'Cedertræ / Hardwood', price: 500, is_base_formula: false },
    { category: 'terrace', material_name: 'Komposit (vedligeholdelsesfrit biomateriale)', price: 450, is_base_formula: false },
    { category: 'terrace', material_name: 'Montagematerialer (Skruer, beslag, kiler/murpap) pr m2', price: 70, is_base_formula: false },
    { category: 'terrace', material_name: 'Punktfundament og støbemix (pr m2 overslag)', price: 150, is_base_formula: false },
    { category: 'terrace', material_name: 'Ukrudtsdug inkl. pløkker (pr m2)', price: 25, is_base_formula: false },
    { category: 'terrace', material_name: 'Leje af motoriseret pælebor', price: 600, is_base_formula: false },
    { category: 'terrace', material_name: 'Dækbrædder / Kant-finish (pr løbende meter)', price: 150, is_base_formula: false },
    { category: 'terrace', material_name: 'Beslag til skjult montering (pr m2 overslag)', price: 120, is_base_formula: false },
    { category: 'terrace', material_name: 'Tagterrasse plastfødder (pr m2 overslag)', price: 90, is_base_formula: false },
    { category: 'terrace', material_name: 'Leje af materialehejs (Tagterrasse)', price: 1500, is_base_formula: false },
    { category: 'terrace', material_name: 'Hævet terrasse materialer (pr m2)', price: 250, is_base_formula: false },
    
    // Formula mock
    { category: 'terrace', material_name: 'terrace', is_base_formula: true, hours_per_unit: 0.8, price: 0, 
      custom_data: { 
          roofTerraceHours: 0.4, elevatedHours: 0.6, groundFoundationHours: 0.8, 
          weedMembraneHours: 0.1, fasciaHoursPerMeter: 0.4, hiddenFasteningHours: 0.3, railingHoursPerMeter: 1.2,
          disposalHoursByOldType: {
             'Gammel træterrasse': 0.5,
             'Fliser / Belægning': 0.8,
             'Sten / Beton': 1.0
          }
      } 
    }
];

const mockCarpenter = {
    address: 'Vej 1, 8000 Aarhus',
    is_admin: true
};

const mockCustomer = {
    address: 'Vej 2, 8000 Aarhus' // keep distance 0
};

async function runTest(desc, data) {
    const res = await performCalculation({ category: 'terrace', ...data }, mockCustomer, dbSettings, dbMaterials, mockCarpenter);
    console.log("=== " + desc + " ===");
    console.log("Price Range: " + res.priceRange);
    console.log("Labor Hours: " + res.calcData.laborHours);
    console.log("Material Cost (inkl markup): " + res.calcData.materialCost.toFixed(2));
    console.log("Total Est Ex VAT: " + res.calcData.finalEstimateExVat);
    console.log("Breakdown:");
    res.breakdownArr.forEach(b => console.log(" - " + b));
    console.log("");
}

(async () => {
    // 1. User's case: 15 m2 komposit, jordniveau, skal fjernes (disposal)
    await runTest("15 m2 Komposit, Jordniveau, Fuld afmontering & bortskaffelse", {
        amount: "15",
        elevation: "Jordniveau",
        disposal: "Ja, vi skal afmontere og bortskaffe den",
        material: "Komposit (vedligeholdelsesfrit biomateriale)",
        fastening: "Skjult montering (clips system)",
        terraceComplexity: "Nej, primært standard firkantet (eller ikke relevant)"
    });

    // 2. Standard 50m2 trykimp
    await runTest("50 m2 Trykimprægneret, Hævet, Ingen afskaffelse", {
        amount: "50",
        elevation: "Hævet terrasse",
        disposal: "Nej",
        material: "Trykimprægneret",
        terraceComplexity: "Nej, primært standard firkantet (eller ikke relevant)"
    });
})();
