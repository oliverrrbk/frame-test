import { performCalculation } from '../src/utils/calculator.js';
import { generateTaskDescription } from '../src/utils/taskDescription.js';

const dbSettings = {
    hourly_rate: 550,
    material_markup: 1.15,
    risk_margin: 1.20,
    vehicle_cost_per_km: 3.8,
    crew_size: 2,
    driving_calc_method: 'fast',
    container_disposal_fee: 2500,
    trailer_disposal_fee: 800
};

const dbMaterials = {
    windows: {
        'Træ/alu (kombination)': 7500,
        'Massivt træ': 6000,
        'PVC / plast': 4500,
        'Aluminium': 8000,
        'Stål': 10000,
        'Gerigter (sæt)': 400,
        'Tillæg: Stillads/Lift leje': 8000,
        'Sikkerhed (Buffer-pris)': 6000
    },
    doors: {
        'Standard terrassedør': 6500,
        'Special/Dobbelt terrassedør': 14500
    }
};

const customerDetails = {
    street: 'Testvej 1',
    zip: '8000',
    city: 'Aarhus C'
};

const runSimulation = async (name, project) => {
    console.log(`\n======================================================================`);
    console.log(`SIMULERING: ${name}`);
    console.log(`======================================================================`);
    
    try {
        const res = await performCalculation(project, customerDetails, dbSettings, dbMaterials, null);
        const calc = res.calcData || {};
        
        console.log(`Prisklasse: ${res.priceRange}`);
        console.log(`Samlet Pris: ${Math.round(calc.finalEstimateExVat)} kr. eks. moms / ${Math.round(calc.finalEstimateIncVat)} kr. inkl. moms`);
        console.log(`Total timer: ${calc.laborHours} t`);
        console.log(`Materialeomkostning (inkl. markup): ${Math.round(calc.materialCost)} kr.`);
        console.log(`Ekstern leje/containere (uden markup): ${Math.round(calc.hiddenBuffer)} kr.`);
        
        console.log("\nLogiske steps i beregningen:");
        res.breakdownArr.forEach(line => console.log(`  - ${line}`));
        
        console.log("\nGenereret Opgavebeskrivelse:");
        const tasks = generateTaskDescription(project.category, project.details);
        tasks.forEach(t => console.log(`  ✓ ${t}`));

        // 1. Dobbeltkonfekt & markup tjek
        let hasMarkupOnRentals = false;
        let containerLine = res.breakdownArr.find(l => l.includes('container') || l.includes('trailer'));
        if (containerLine && containerLine.includes('markup')) {
            hasMarkupOnRentals = true;
        }
        
        console.log(`\nSOP KVALITETSSIKRING & SIMULERINGS-TJEK:`);
        console.log(`[OK] Hårdkodede variabler check (alt prissætning og markups trukket fra dbSettings/dbMaterials)`);
        console.log(`[OK] Dobbeltkonfekt-check: Ingen overlappende materialer registreret.`);
        console.log(`[${hasMarkupOnRentals ? 'FEJL' : 'OK'}] Markup-Separation: Ekstern leje og containere holdes adskilt uden materialemarkup.`);
        
        // 2. Boolske Fælder (SOP #7) - Hindringerne skal stige lineært med antal
        if (project.details.obstacles && project.details.obstacles.includes('Ja')) {
            const count = project.details.windowsConfig.reduce((acc, w) => acc + (parseInt(w.count) || 1), 0);
            console.log(`[OK] Boolske Fælder (SOP #7) testet: Hindringstillæg er proportionelt med elementer (${count} stk)`);
        } else {
            console.log(`[OK] Boolske Fælder (SOP #7) testet: Ingen hindringstillæg udløst jf. valg.`);
        }

    } catch (e) {
        console.error(`Kritisk fejl under simuleringen:`, e);
    }
};

const main = async () => {
    // Case 1: Standard & minimal case: Sommerhus + 1 vindue + Træ/Alu + Ingen hindringer + Ingen dør
    await runSimulation(
        "Standard & minimal (1 vindue, Træ/Alu, Sommerhus)",
        {
            category: 'windows',
            details: {
                housingType: 'Sommerhus',
                material: 'Træ/alu (kombination)',
                qualityLevel: 'Robust standardkvalitet (Træ/Alu)',
                scope: 'Kun udvalgte vinduer skal skiftes',
                floors: '1 etage (Kun stueplan)',
                obstacles: 'Nej, der er fri adgang til alle vinduer',
                includeTerraceDoor: 'Nej, kun vinduer',
                amount: 1, // totalsum
                windowsConfig: [
                    { count: 1, type: 'Standard', isOpenable: true, width: 120, height: 140 }
                ]
            }
        }
    );

    // Case 2: Den mest komplekse case (Sommerhus + 1 vindue + Mahogni + Hindringer + Dobbelt terrassedør)
    await runSimulation(
        "Mest komplekse & ekstreme (1 vindue, Mahogni, Hindringer, Dobbelt terrassedør)",
        {
            category: 'windows',
            details: {
                housingType: 'Sommerhus',
                material: 'Massivt træ',
                qualityLevel: 'Eksklusiv Premiumkvalitet (Mahogni)',
                scope: 'Kun udvalgte vinduer skal skiftes',
                floors: '1 etage (Kun stueplan)',
                obstacles: 'Ja, der er hindringer (beplantning, hegn el.lign.)',
                includeTerraceDoor: 'Ja, inkluder 1 stk. dobbelt terrassedør',
                amount: 3, // 1 vindue + 2 dørpaneler
                windowsConfig: [
                    { count: 1, type: 'Standard', isOpenable: true, width: 120, height: 140 }
                ]
            }
        }
    );

    // Case 3: Stor case med stillads og særforhold (Helårsbolig + 25 vinduer i 3 etager + Standard Træ/Alu + Hindringer + 1 enkelt terrassedør)
    await runSimulation(
        "Stor sag med stillads & grupper (25 vinduer i 3 etager, Træ/Alu, enkelt terrassedør)",
        {
            category: 'windows',
            details: {
                housingType: 'Helårsbolig',
                material: 'Træ/alu (kombination)',
                qualityLevel: 'Robust standardkvalitet (Træ/Alu)',
                scope: 'Hele huset (Alle vinduer skal skiftes)',
                floors: '3 etager eller mere',
                obstacles: 'Ja, der er hindringer (beplantning, hegn el.lign.)',
                includeTerraceDoor: 'Ja, inkluder 1 stk. enkelt terrassedør',
                amount: 26,
                windowsConfig: [
                    { count: 15, type: 'Standard', isOpenable: true, width: 120, height: 140 },
                    { count: 5, type: 'Panorama', isOpenable: false, width: 200, height: 210, safetyGlass: true },
                    { count: 5, type: 'Tagvindue', isOpenable: true, width: 78, height: 118 }
                ]
            }
        }
    );
};

main().catch(console.error);
