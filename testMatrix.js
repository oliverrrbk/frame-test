import { performCalculation } from './src/utils/calculator.js';
import { CARPENTER_SETTINGS, MATERIAL_INDEX } from './src/prices.js';

// Mock window for Node.js to avoid ReferenceError in calculator.js Google Maps fallback
global.window = {};

const dbSettings = {
    hourly_rate: CARPENTER_SETTINGS.hourlyRate,
    material_markup: CARPENTER_SETTINGS.materialMarkup,
    driving_fee: CARPENTER_SETTINGS.drivingFee,
    trailer_disposal_fee: CARPENTER_SETTINGS.trailerDisposalFee,
    container_disposal_fee: CARPENTER_SETTINGS.containerDisposalFee,
    risk_margin: CARPENTER_SETTINGS.riskMargin
};

const testScenarios = [
    {
        name: "Annex: 10m2, Punktfundament, Let materiale nedrivning",
        cat: "annex",
        data: { amount: 10, annexType: "Uisoleret skur til opbevaring", disposal: "Ja", oldMaterial: "Træ", foundationType: "Punktfundament / Trægulv", access: "Ja" }
    },
    {
        name: "Annex: 20m2, Støbt, Beton nedrivning, Ingen maskinadgang",
        cat: "annex",
        data: { amount: 20, annexType: "Fuldt beboeligt anneks", disposal: "Ja", oldMaterial: "Beton", foundationType: "Støbt terrændæk (Beton)", access: "Nej" }
    },
    {
        name: "Carport: 1 stk, Fladt tag, Ingen nedrivning",
        cat: "carport",
        data: { amount: 1, carportType: "Enkelt carport (Oftest 1 bil)", disposal: "Nej", roofType: "Fladt tag", access: "Ja" }
    },
    {
        name: "Carport: 1 stk, Sadel tag, Beton nedrivning, Ingen maskinadgang",
        cat: "carport",
        data: { amount: 1, carportType: "Dobbelt carport (Plads til 2 biler)", disposal: "Ja", oldMaterial: "Beton", roofType: "Sadel tag", access: "Nej" }
    },
    {
        name: "Hegn: 10 meter, Hæk fjernelse",
        cat: "fence",
        data: { amount: 10, disposal: "Ja", oldMaterial: "Hæk", material: "Klinkehegn (Træ)" }
    },
    {
        name: "Tag: 100m2, 2-plan (Stillads), Asbest nedrivning",
        cat: "roof",
        data: { amount: 100, disposal: "Ja", oldRoofType: "Tagplader (asbest)", floors: "1½-plan / 2-plan / Mere" }
    },
    {
        name: "Køkken: 10 moduler, Flat-pack, Nedrivning, Bordplade, Hvidevarer",
        cat: "kitchen",
        data: { amount: 10, assembly: "Flat-pack", disposal: "Ja, tømreren skal afmontere og afskaffe det", worktop: "Ja", integratedAppliances: "Ja" }
    },
    {
        name: "Tilbygning: 30m2, Vådrum, Stor gennembrydning",
        cat: "extensions",
        data: { amount: 30, wetRoom: "Ja", breakthrough: "Ja, stor åbning" }
    },
    {
        name: "Vinduer: 5 stk, Specialmål, 2-plan (Stillads)",
        cat: "windows",
        data: { windowType: "Facadevinduer", amount: 5, windowMeasurementType: "Ja, store specialmål / panorama", floors: "1½-plan / 2-plan / Mere" }
    },
    {
        name: "Terrasse: 20m2, Tagterrasse, Hardwood, Skjult montering",
        cat: "terrace",
        data: { amount: 20, elevation: "Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)", roofTerraceFeet: "Ja", material: "Hardwood / Hårdttræ", fastening: "Skjult montering" }
    }
];

async function runTests() {
    console.log("==========================================");
    console.log("   BISON FRAME - AUTOMATED TEST MATRIX    ");
    console.log("==========================================\n");

    for (const scenario of testScenarios) {
        try {
            const projectData = { category: scenario.cat, details: scenario.data };
            const customerDetails = { zip: "8000" }; // Dummy
            const result = await performCalculation(projectData, customerDetails, dbSettings, MATERIAL_INDEX, null);
            console.log(`[TEST] ${scenario.name}`);
            console.log(`       Kategori: ${scenario.cat.toUpperCase()}`);
            console.log(`       Timer:    ${result.calcData.laborHours.toFixed(1)} t`);
            console.log(`       Mat.pris: ${result.calcData.materialCost.toFixed(2)} DKK`);
            console.log(`       Total:    ${result.calcData.strictPrice.toFixed(2)} DKK`);
            console.log(`       Breakdown highlights:`);
            // Print max 3 lines of breakdown to keep it readable
            const highlights = result.breakdownArr.slice(-3).map(b => `         - ${b}`);
            console.log(highlights.join('\n'));
            console.log("------------------------------------------");
        } catch (error) {
            console.error(`[ERROR] Fejl i scenario: ${scenario.name}`);
            console.error(error);
        }
    }
    console.log("\n[!] Matrix Kørsel Fuldført.");
}

runTests();
