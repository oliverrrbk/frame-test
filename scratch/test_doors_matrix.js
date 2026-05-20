import { performCalculation } from '../src/utils/calculator.js';
import { MATERIAL_INDEX } from '../src/prices.js';

// Mock databaser
const mockDbSettings = {
    hourly_rate: 550,
    material_markup: 1.25, // 25% avance
    crew_size: 2,
    driving_calc_method: 'fast',
    driving_flat_rate: 750
};

const mockCarpenter = {
    address: 'Vesterbrogade 1, 1620 København V'
};

const mockCustomer = {
    street: 'Nørrebrogade 100',
    zip: '2200',
    city: 'København N'
};

const mockDbMaterials = MATERIAL_INDEX; // Vi bruger den eksporterede database direkte

// Ekstrem Matrix Simulering (SOP-regel 1)
const testCases = [
    {
        name: "Standard indvendig dør - Enkelt",
        data: {
            amount: 1,
            doorStyle: "Indvendig dør",
            doorModel: "Standard indvendig dør",
            electricLock: "Nej, vi ønsker standard lås/greb"
        }
    },
    {
        name: "Special indvendig dør - Mange døre (Skaleringstest 1 vs 10)",
        data: {
            amount: 10,
            doorStyle: "Indvendig dør",
            doorModel: "Special indvendig dør",
            electricLock: "Nej, vi ønsker standard lås/greb"
        }
    },
    {
        name: "Robust standard hoveddør - Træ/Alu",
        data: {
            amount: 1,
            doorStyle: "Hoveddør (Udvendig)",
            doorModel: "Robust standard hoveddør",
            material: "Træ / Alu (Kombination)",
            electricLock: "Nej, vi ønsker standard lås/greb"
        }
    },
    {
        name: "Premium/High-End Hoveddør - Aluminium med Yale Doorman",
        data: {
            amount: 1,
            doorStyle: "Hoveddør (Udvendig)",
            doorModel: "Premium/High-End hoveddør",
            material: "Aluminium",
            electricLock: "Ja, tømreren skal levere og montere elektrisk lås"
        }
    },
    {
        name: "Special/Dobbelt terrassedør - Massivt træ og glas - Yale Doorman",
        data: {
            amount: 2,
            doorStyle: "Terrassedør",
            doorModel: "Special/Dobbelt terrassedør",
            material: "Massivt træ og glas",
            electricLock: "Ja, tømreren skal levere og montere elektrisk lås"
        }
    }
];

console.log("=== KØRER EKSTREM MATRIX SIMULERING (DØRE SOP) ===");

for (const tc of testCases) {
    console.log(`\nTestcase: ${tc.name}`);
    try {
        const projectData = {
            category: 'doors',
            details: tc.data
        };
        
        const result = await performCalculation(
            projectData,
            mockCustomer,
            mockDbSettings,
            mockDbMaterials,
            mockCarpenter,
            null
        );
        
        console.log("Result object:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(`FEJL i testcase ${tc.name}:`, e);
    }
}
