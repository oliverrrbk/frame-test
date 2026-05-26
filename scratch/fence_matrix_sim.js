import { performCalculation } from '../src/utils/calculator.js';
import { MATERIAL_INDEX } from '../src/prices.js';

// Mock browser globals for DistanceMatrix
globalThis.window = {
    google: undefined
};

const defaultSettings = {
    hourly_rate: 550,
    material_markup: 1.15,
    container_disposal_fee: 2500,
    trailer_disposal_fee: 800,
    risk_margin: 1.25,
    driving_calc_method: 'fast',
    vehicle_cost_per_km: 3.8,
    crew_size: 2
};

const defaultCustomer = {
    street: 'Testgade 123',
    zip: '8000',
    city: 'Aarhus C'
};

const defaultCarpenter = {
    name: 'Mester William',
    company_name: 'Bison Frame',
    address: 'Uranusvej 4, 8700 Horsens'
};

const fenceTestCases = [
    {
        name: "Standard raftehegn uden noget ekstra",
        data: {
            category: 'fence',
            details: {
                amount: 25,
                material: 'Raftehegn (Træ)',
                postMaterial: 'Træstolper (støbt i beton)',
                disposal: 'Nej, der er frit',
                fenceHeight: 'Under 1,8 meter'
            }
        }
    },
    {
        name: "Ekstremt modstridende valg: Komposithegn, betonstolper, fjerne gammel hæk, ekstra højde, 1 meter hegn",
        data: {
            category: 'fence',
            details: {
                amount: 1,
                material: 'Komposithegn',
                postMaterial: 'Betonstolper (mest robuste løsning)',
                disposal: 'Ja, tømreren skal fjerne det OG bortskaffe det',
                oldMaterial: 'Hæk / Buske / Levende hegn (Rødder opgraves)',
                fenceHeight: 'Op til 2,0 meter'
            }
        }
    },
    {
        name: "Stort hegnsprojekt med listehegn, stålstolper, bortskaffelse af gammelt raftehegn, ekstra højde",
        data: {
            category: 'fence',
            details: {
                amount: 80,
                material: 'Listehegn (Træ)',
                postMaterial: 'Metal/Stålstolper (slankt og moderne)',
                disposal: 'Ja, tømreren skal fjerne det OG bortskaffe det',
                oldMaterial: 'Kraftigt raftehegn / Stammer',
                fenceHeight: 'Op til 2,0 meter'
            }
        }
    },
    {
        name: "Lille opgave (Minimumsfaktureringstest): 3m lamelhegn, træstolper",
        data: {
            category: 'fence',
            details: {
                amount: 3,
                material: 'Lamelhegn (Træ)',
                postMaterial: 'Træstolper (støbt i beton)',
                disposal: 'Nej, der er frit',
                fenceHeight: 'Under 1,8 meter'
            }
        }
    }
];

async function runFenceMatrix() {
    console.log("=========================================");
    console.log("🛡️ AUTOMATISK FENCE MATRIX-SIMULERING (RULE 1)");
    console.log("=========================================\n");

    for (const tc of fenceTestCases) {
        console.log(`▶ Ekstrem-test: "${tc.name}"`);
        console.log(`  Parametre: ${tc.data.details.amount}m ${tc.data.details.material} med ${tc.data.details.postMaterial}`);
        
        try {
            const res = await performCalculation(
                tc.data,
                defaultCustomer,
                defaultSettings,
                MATERIAL_INDEX,
                defaultCarpenter
            );

            console.log(`  ---------------------------------------`);
            console.log(`  Beregnet pris:   ${res.priceRange}`);
            console.log(`  Arbejdstimer:    ${res.calcData.laborHours} timer`);
            console.log(`  Materialeomkost: ${Math.round(res.calcData.materialCost)} DKK`);
            console.log(`  Kørsel:          ${Math.round(res.calcData.drivingCost)} DKK`);
            console.log(`  ---------------------------------------`);
            console.log(`  Detaljeret specifikation:`);
            res.breakdownArr.forEach(line => console.log(`   - ${line}`));
            
            // Verificer at der ikke er ulovlige NaN værdier
            const checkNaN = (val) => typeof val === 'number' && isNaN(val);
            if (checkNaN(res.calcData.finalEstimateIncVat) || checkNaN(res.calcData.laborHours) || checkNaN(res.calcData.materialCost)) {
                throw new Error("Fejl: Beregningen producerede en NaN værdi!");
            }
            
            console.log(`  ---------------------------------------`);
            console.log(`  ✅ Bestået uden fejl eller NaN-værdier!`);
            
        } catch (err) {
            console.error(`  ❌ CRASHEDE / FEJLEDE:`, err.message);
            process.exit(1);
        }
        console.log("\n");
    }
    
    console.log("=========================================");
    console.log("🎉 MATRIX-SIMULERING AFSLUTTET MED SUCESS!");
    console.log("=========================================");
}

runFenceMatrix();
