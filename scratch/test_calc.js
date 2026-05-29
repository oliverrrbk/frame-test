import { performCalculation } from '../src/utils/calculator.js';

async function run() {
    const projectData = {
        category: 'floor',
        details: {
            material: 'Massivt træ',
            amount: 20,
            disposal: 'Ja, vi skal afmontere OG bortskaffe det',
            oldFloorType: 'Gulvtæppe / Linoleum / Vinyl'
        }
    };
    const customerDetails = {};
    const dbSettings = { hourly_rate: 550, material_markup: 1.15, container_disposal_fee: 2500, trailer_disposal_fee: 800, risk_margin: 1.25, driving_calc_method: 'fast', vehicle_cost_per_km: 3.8, crew_size: 2 };
    const dbMaterials = {};
    const carpenter = { address: 'Aarhus' };
    const calibration = null;

    const res = await performCalculation(projectData, customerDetails, dbSettings, dbMaterials, carpenter, calibration);
    console.log("breakdownArr length:", res.breakdownArr.length);
    console.log(res.breakdownArr);
}
run();
