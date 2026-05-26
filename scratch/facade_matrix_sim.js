import { performCalculation } from '../src/utils/calculator.js';

// Definerer database-indstillinger svarende til Supabase DB settings
const dbSettings = {
    hourly_rate: 450,
    material_markup: 1.15,
    container_disposal_fee: 2500,
    trailer_disposal_fee: 800,
    risk_margin: 1.25,
    driving_calc_method: 'fast',
    vehicle_cost_per_km: 3.8,
    crew_size: 2
};

// Harmoniseret database-materialebibliotek
const dbMaterials = {
    facades: {
        'Trykimprægneret': 300,
        'Almindeligt træ (Malet)': 310,
        'Superwood': 550,
        'Cedertræ / Hardwood': 950,
        'Thermowood': 650,
        'HardiePlank': 720,
        'Cembrit / Cedral': 780,
        'Krydsforskalling (tillæg til lodret)': 45,
        'Efterisolering 50mm': 120,
        'Efterisolering 100mm': 175,
        'Efterisolering 150mm': 250,
        'Vindspærre og Klemlister': 150,
        'Inddækning/Lister (pr åbning)': 500,
        'Tillæg: Facadestilladsleje': 12000,
        'Sikkerhed (Buffer-pris)': 450
    },
    ceilings: {
        'Træloft (listeloft/paneler/rustikloft)': 300,
        'Gipsloft (standard 2-lag)': 250,
        'Lydgipsloft (lyddæmpende gips)': 290,
        'Fibergipsloft (Fermacel)': 350,
        'Troldtekt (akustikloft)': 380,
        'Nedhængt loft (systemloft)': 450,
        'Akustikpaneler (lameller)': 750,
        'Forskalling': 50,
        'Dampspærre inkl tape': 35,
        'Isolering (50-100mm)': 85,
        'Skyggelister / Fuge': 45,
        'Maler: Spartel, filt og maling (pr m2)': 250,
        'Maler: Koordineringsgebyr (Fast pris)': 5000,
        'Elektriker: Etablering af spot/lampested (pr. stk)': 950,
        'Sikkerhed (Buffer-pris)': 350
    }
};

console.log("=== EKSTREM STRESSTEST MATRIX SIMULERING ===");

const testCases = [
    // --- STRESSTEST: ABSURDE MÆNGDER ---
    {
        name: "Stresstest 1: Ekstremt lille facade (1 m² - Trykimprægneret, stueplan)",
        category: 'facades',
        details: {
            amount: 1,
            oldFacadeMaterial: 'Ingen (Nybyg / Råt træskelet)',
            material: 'Trykimprægneret',
            mountingStyle: 'Vandret (fx Klinkbeklædning)',
            insulation: 'Nej tak (Behold nuværende isolering)',
            openings: 0,
            floors: '1-plan (Stueplan)'
        }
    },
    {
        name: "Stresstest 2: Ekstremt stor facade (1000 m² - Cembrit, lodret, 150mm efterisolering, fleretagers, 20 åbninger)",
        category: 'facades',
        details: {
            amount: 1000,
            oldFacadeMaterial: 'Gammel træbeklædning (Skal rives ned og fjernes)',
            material: 'Cembrit / Cedral',
            mountingStyle: 'Lodret (fx Listebeklædning - tager lidt længere tid)',
            insulation: 'Ja, 150 mm efterisolering (Maksimal energibesparelse)',
            openings: 20,
            floors: '1½-plan / 2-plan / Mere'
        }
    },
    {
        name: "Stresstest 3: Loft med 100 spots (40 m² standardgips)",
        category: 'ceilings',
        details: {
            amount: 40,
            oldCeilingType: 'Gipsloft (standard 2-lag)',
            vaporAndInsulation: 'Opvarmet etage (Ingen dampspærre nødvendig)',
            material: 'Gipsloft (standard 2-lag)',
            spots: 'Ja',
            spotsAmount: 100,
            ceilingHeight: 'Nej, standard lofthøjde'
        }
    },
    {
        name: "Stresstest 4: Ekstremt stort akustikloft (800 m² Troldtekt, dampspærre + isolering, loft-til-kip)",
        category: 'ceilings',
        details: {
            amount: 800,
            oldCeilingType: 'Træloft (listeloft/paneler/rustikloft)',
            vaporAndInsulation: 'Koldt tagrum inkl. ny isolering (Dampspærre + Isolering)',
            material: 'Troldtekt (akustikloft)',
            spots: 'Nej',
            ceilingHeight: 'Ja, loft-til-kip eller højere end 2,5m'
        }
    }
];

async function runSim() {
    for (const tc of testCases) {
        console.log(`\n\n[${tc.name}]`);
        const res = await performCalculation(tc, {}, dbSettings, dbMaterials, null);
        
        console.log(`- M² / Enheder: ${tc.details.amount} m²`);
        console.log(`- Basistid: ${res.calcData.laborHours} timer`);
        console.log(`- Materialepris (inkl. markup): ${res.calcData.materialCost.toLocaleString('da-DK')} DKK`);
        console.log(`- Ekstern underentreprenør/leje (Maler/elektriker/stillads): ${res.calcData.externalLeaseCost.toLocaleString('da-DK')} DKK`);
        console.log(`- Samlet overslagspris (inkl. moms): ${res.calcData.finalEstimateIncVat.toLocaleString('da-DK')} DKK`);
        console.log(`- Prisspecifikation (breakdownArr):`);
        res.breakdownArr.forEach(detail => console.log(`  ✓ ${detail}`));
    }
    console.log("\n=== STRESSTEST MATRIX SIMULERING SLUT ===");
}

runSim().catch(console.error);
