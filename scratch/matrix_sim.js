import { performCalculation } from '../src/utils/calculator.js';
import { generateTaskDescription } from '../src/utils/taskDescription.js';

// Definerer standard indstillinger svarende til Supabase DB settings
const dbSettings = {
    material_markup: 1.15,
    hourly_rate: 450,
    risk_margin: 1.25,
    vehicle_cost_per_km: 3.8
};

// Henter standardmaterialer til test
const dbMaterials = {
    floor: {
        'Massivt træ': 1200,
        'Fodlister (pr. m2 gulvareal proxy)': 50,
        'Limning (Fuldlimning af mønstergulv)': 60,
        'Bærende undergulv (Spånplader)': 120,
        'Gulvvarme (Sporplader)': 450
    },
    doors: {
        'Massivt træ og glas': 15500,
        'Gerigter (sæt)': 300
    },
    windows: {
        'Indvendig finish (Gerigter/Fuge) proxy': 200
    }
};

const main = async () => {
    console.log("=== EKSTREM MATRIX SIMULERING & VERIFICERING ===");

    // 1. Simulerer den dummeste/mest komplekse kombination for gulv:
    // Massivt træ + Strøer + Sildebensmønster + Gulvvarme (Sporplader) + Faste forhindringer + Dørtilpasning
    const floorProject = {
        category: 'floor',
        details: {
            amount: 50,
            disposal: 'Nej, vi har selv afmonteret det / der er tomt',
            floorFoundation: 'Strøer / Trækonstruktion',
            underfloorHeating: 'Ja, tømreren skal opbygge nyt gulvvarme (sporplader/varmefordeling)',
            material: 'Massivt træ',
            floorPattern: 'Ja, i mønster (fx Sildeben / Chevron)',
            floorObstacles: 'Ja, det er der (køkkenø, søjler, skorsten eller rør)',
            floorDoorsNear: 'Ja',
            floorDoorsCount: 3,
            finish: 'yes' // Skirting / finish valgt i wizarden
        }
    };

    const floorResult = await performCalculation(floorProject, {}, dbSettings, dbMaterials, null);
    const floorTasks = generateTaskDescription(floorProject.category, floorProject.details);

    console.log("\n[TESTCASE A: EKSTREM GULVSIMULERING (Sildeben + Strøer + Gulvvarme)]");
    console.log(`- Samlet pris: ${floorResult.calcData.finalEstimateIncVat.toLocaleString('da-DK')} kr. (netto timer: ${floorResult.calcData.laborHours} t, materialer: ${floorResult.calcData.materialCost.toLocaleString('da-DK')} kr)`);
    console.log("- Overslaget inkluderer:");
    floorTasks.forEach(task => console.log(`  ✓ ${task}`));

    // 2. Simulerer Døre med og uden finish for at sikre, at 'Komplet kvalitetsfinish' altid fremgår
    const doorProjectWithFinish = {
        category: 'doors',
        details: {
            amount: 2,
            doorStyle: 'Hoveddør (Udvendig)',
            doorModel: 'Premium/High-End hoveddør',
            material: 'Massivt træ og glas',
            electricLock: 'Ja, tømreren skal levere og montere elektrisk lås',
            doorHinge: 'Højrehængt indadgående',
            finish: 'yes'
        }
    };

    const doorProjectNoFinish = {
        category: 'doors',
        details: {
            amount: 2,
            doorStyle: 'Hoveddør (Udvendig)',
            doorModel: 'Premium/High-End hoveddør',
            material: 'Massivt træ og glas',
            electricLock: 'Ja, tømreren skal levere og montere elektrisk lås',
            doorHinge: 'Højrehængt indadgående',
            finish: 'no'
        }
    };

    const doorWithFinishTasks = generateTaskDescription(doorProjectWithFinish.category, doorProjectWithFinish.details);
    const doorNoFinishTasks = generateTaskDescription(doorProjectNoFinish.category, doorProjectNoFinish.details);

    console.log("\n[TESTCASE B: DØRE MED FINISH VS UDEN FINISH]");
    console.log("- Dør med finish 'yes' (Overslaget inkluderer):");
    doorWithFinishTasks.forEach(task => console.log(`  ✓ ${task}`));
    console.log("- Dør med finish 'no' (Overslaget inkluderer):");
    doorNoFinishTasks.forEach(task => console.log(`  ✓ ${task}`));

    // 3. Simulerer Vinduer med 'Ja' (Ja) og 'yes' (wizard) og 'Nej' (no)
    const winProjectJa = { category: 'windows', details: { amount: 4, finish: 'Ja' } };
    const winProjectYes = { category: 'windows', details: { amount: 4, finish: 'yes' } };
    const winProjectNo = { category: 'windows', details: { amount: 4, finish: 'no' } };

    console.log("\n[TESTCASE C: VINDUER MED BÅDE JA/YES OG NO]");
    console.log("- Finish: 'Ja':", generateTaskDescription(winProjectJa.category, winProjectJa.details).filter(t => t.includes('finish')));
    console.log("- Finish: 'yes':", generateTaskDescription(winProjectYes.category, winProjectYes.details).filter(t => t.includes('finish')));
    console.log("- Finish: 'no':", generateTaskDescription(winProjectNo.category, winProjectNo.details).filter(t => t.includes('finish')));

    console.log("\n=== MATRIX SIMULERING SLUT ===");
};

main().catch(console.error);
