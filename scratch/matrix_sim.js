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
    facades: {
        'Trykimprægneret': 280,
        'Vindspærre og Klemlister': 150,
        'Tillæg: Facadestilladsleje': 15000
    }
};

const main = async () => {
    const facadeProject = {
        category: 'facades',
        details: {
            amount: 80,
            material: 'Trykimprægneret',
            oldFacadeMaterial: 'Ingen (Nybyg / Råt træskelet)',
            mountingStyle: 'Vandret (fx Klinkbeklædning)',
            openings: 0,
            floors: '1½-plan / 2-plan / Mere'
        }
    };

    const customerDetails = {
        street: 'Testvej 1',
        zip: '8000',
        city: 'Aarhus C'
    };

    const res = await performCalculation(facadeProject, customerDetails, dbSettings, dbMaterials, null);
    
    console.log("=== BEREGNING FOR TRÆFACADE PROJEKT MED STAGE/STILLADS ===");
    console.log(`Prisklasse: ${res.priceRange}`);
    console.log("Rå beregningsdata (calcData):", JSON.stringify(res.calcData, null, 2));
    console.log("\nLogiske steps i beregningen (breakdownArr):");
    res.breakdownArr.forEach(line => console.log(`- ${line}`));
    
    console.log("\nOpgavebeskrivelse-punkter:");
    const tasks = generateTaskDescription(facadeProject.category, facadeProject.details);
    tasks.forEach(t => console.log(`✓ ${t}`));
};

main().catch(console.error);
