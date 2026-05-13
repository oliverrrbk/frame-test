import { performCalculation } from '../src/utils/calculator.js';

async function test() {
    const projectData = {
        category: 'fence',
        details: { amount: 30, material: 'Klinkehegn (Træ)', disposal: 'Nej' }
    };
    const customerDetails = {
        fullName: 'Mads', email: 'mads@test.dk', phone: '12345678', street: 'Peter Fabers Vej 4', zip: '8210', city: 'Aarhus V'
    };
    const dbSettings = { hourly_rate: 550, material_markup: 1.15, vehicle_cost_per_km: 3.8, driving_calc_method: 'fast' };
    const dbMaterials = { fence: { 'Klinkehegn (Træ)': 400 } };
    const carpenter = { address: 'Aarhus C' };
    
    try {
        const res = await performCalculation(projectData, customerDetails, dbSettings, dbMaterials, carpenter, null);
        console.log("SUCCESS:", res);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
