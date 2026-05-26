// Diagnostiserings- og Matrix-simulering for Indvendige Lofter (Ceilings)
import { performCalculation } from '../src/utils/calculator.js';
import { MATERIAL_INDEX } from '../src/prices.js';

console.log("=========================================");
console.log("🔍 STARTER DIAGNOSTICERINGS- OG MATRIX-SIMULERING FOR LOFTER");
console.log("=========================================");

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

// Definer 5 extreme og representative matrix-scenarier
const scenarios = [
    {
        name: "Scenario A: Minimalt standard gipsloft (10m2, Ved ikke dampspærre, ingen spots)",
        data: {
            category: 'ceilings',
            details: {
                amount: 10,
                material: 'Gipsloft (standard 2-lag)',
                oldCeilingType: 'Ved ikke',
                vaporAndInsulation: 'Ved ikke / Uvist (Beregner dampspærre som sikkerhed)',
                ceilingHeight: 'Nej, standard lofthøjde',
                spots: 'Nej'
            }
        }
    },
    {
        name: "Scenario B: Mellemstort Lydgipsloft (50m2, Koldt tagrum + isolering, 10 spots, afmontering af gipsloft)",
        data: {
            category: 'ceilings',
            details: {
                amount: 50,
                material: 'Lydgipsloft (lyddæmpende gips)',
                oldCeilingType: 'Gipsloft (standard 2-lag)',
                vaporAndInsulation: 'Koldt tagrum inkl. ny isolering (Dampspærre + Isolering)',
                ceilingHeight: 'Nej, standard lofthøjde',
                spots: 'Ja',
                spotsAmount: 10
            }
        }
    },
    {
        name: "Scenario C: Stort Fermacell loft (150m2, Opvarmet etage, 20 spots, kip-højde, afmontering af træloft)",
        data: {
            category: 'ceilings',
            details: {
                amount: 150,
                material: 'Fibergipsloft (Fermacel)',
                oldCeilingType: 'Træloft (listeloft/paneler/rustikloft)',
                vaporAndInsulation: 'Opvarmet etage (Ingen dampspærre nødvendig)',
                ceilingHeight: 'Ja, loft-til-kip eller højere end 2,5m',
                spots: 'Ja',
                spotsAmount: 20
            }
        }
    },
    {
        name: "Scenario D: Troldtekt akustikloft (80m2, afmontering af systemloft, spots=Ja men 0 spotsAmount, ingen dampspærre)",
        data: {
            category: 'ceilings',
            details: {
                amount: 80,
                material: 'Troldtekt (akustikloft)',
                oldCeilingType: 'Nedhængt loft (systemloft)',
                vaporAndInsulation: 'Opvarmet etage (Ingen dampspærre nødvendig)',
                ceilingHeight: 'Nej, standard lofthøjde',
                spots: 'Ja',
                spotsAmount: 0 // Bør ikke crashe eller tilføje el-udgifter
            }
        }
    },
    {
        name: "Scenario E: Ekstremt Troldtekt loft (120m2, Ved ikke dampspærre, 30 spots, kip-højde, afmontering af lameller)",
        data: {
            category: 'ceilings',
            details: {
                amount: 120,
                material: 'Troldtekt (akustikloft)',
                oldCeilingType: 'Akustikpaneler (lameller)',
                vaporAndInsulation: 'Ved ikke / Uvist (Beregner dampspærre som sikkerhed)',
                ceilingHeight: 'Ja, loft-til-kip eller højere end 2,5m',
                spots: 'Ja',
                spotsAmount: 30
            }
        }
    }
];

async function runDiagnostics() {
    let successCount = 0;

    for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        console.log(`\n▶ [${i+1}/${scenarios.length}] ${sc.name}`);
        
        try {
            const res = await performCalculation(
                sc.data,
                defaultCustomer,
                defaultSettings,
                MATERIAL_INDEX,
                null
            );

            const calculatedData = res.calcData;
            console.log(`   - Kvm-antal: ${sc.data.details.amount} m² | Loftstype: ${sc.data.details.material}`);
            console.log(`   - Samlet pris (med moms): ${res.priceRange}`);
            console.log(`   - Arbejdstimer: ${calculatedData.laborHours.toFixed(1)} t (Løn: ${Math.round(calculatedData.totalLaborCost)} DKK)`);
            console.log(`   - Rå materialer (med markup): ${Math.round(calculatedData.materialCost - (calculatedData.externalLeaseCost || 0))} DKK`);
            console.log(`   - Eksterne underleverandører (uden markup): ${Math.round(calculatedData.externalLeaseCost || 0)} DKK`);
            console.log(`   - Kørsel: ${Math.round(calculatedData.drivingCost)} DKK`);
            console.log(`   - Beregnet fast pris (ex moms): ${Math.round(calculatedData.strictPrice)} DKK`);

            // Verificer at intet returnerer NaN
            const hasNaN = Object.values(calculatedData).some(v => typeof v === 'number' && isNaN(v));
            if (hasNaN) {
                console.log("   ❌ FEJL: Fandt NaN værdier i beregningen!");
                continue;
            }

            // Tjek for dobbeltkonfekt: Både maler og troldtekt-finish
            const isTroldtekt = sc.data.details.material.includes('Troldtekt');
            const hasPlasteringBreakdown = res.breakdownArr.some(b => b.includes('spartling, filt og maling'));
            if (isTroldtekt && hasPlasteringBreakdown) {
                console.log("   ❌ FEJL: Dobbeltkonfekt! Troldtekt (akustik) har fejlagtigt fået tilføjet malerarbejde!");
                continue;
            }

            // Tjek for markup på eksterne spots, maler og bortskaffelse
            const spotCount = sc.data.details.spots === 'Ja' ? (parseInt(sc.data.details.spotsAmount) || 0) : 0;
            const isPlasterable = sc.data.details.material.includes('Gips') || 
                                  sc.data.details.material.includes('gips') || 
                                  sc.data.details.material.includes('Fermacel');
            const plasteringCost = isPlasterable 
                ? (sc.data.details.amount * 250 + 5000) 
                : 0;
            const disposalFee = sc.data.details.amount >= 150 ? 2500 : 800;
            const expectedExternalLease = spotCount * 950 + plasteringCost + disposalFee;
            const actualExternalLease = calculatedData.externalLeaseCost || 0;
            
            if (Math.round(actualExternalLease) !== Math.round(expectedExternalLease)) {
                console.log(`   ❌ FEJL: Eksterne omkostninger matcher ikke! Forventet: ${expectedExternalLease}, Faktisk: ${actualExternalLease}`);
                continue;
            }

            console.log("   ✅ OK: Beregning og breakdown verificeret.");
            successCount++;
        } catch (err) {
            console.error(`   💥 CRASHET med fejl: ${err.message}`);
        }
    }

    console.log("\n=========================================");
    console.log(`📊 SIMULERINGSSTATUS: ${successCount} ud af ${scenarios.length} bestået.`);
    console.log("=========================================");
}

runDiagnostics();
