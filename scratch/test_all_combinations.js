// Test-script for robusthedsanalyse af performCalculation
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

const testCases = [
    // 1. TERRACE CASES
    {
        name: "Standard trykimprægneret terrasse 30m2",
        data: {
            category: 'terrace',
            details: {
                amount: 30,
                material: 'Trykimprægneret',
                disposal: 'Nej',
                elevation: 'Jordniveau',
                fastening: 'Synlige skruer (standard)',
                railing: 'Nej'
            }
        }
    },
    {
        name: "Lille terrasse (afprøvning af 4-timers minimumsfakturering)",
        data: {
            category: 'terrace',
            details: {
                amount: 2,
                material: 'Thermowood',
                disposal: 'Nej',
                elevation: 'Jordniveau'
            }
        }
    },
    {
        name: "Ekstrem terrasse (Hardwood + Tagterrasse + Bortskaffelse + Skjult montering + Rækværk)",
        data: {
            category: 'terrace',
            details: {
                amount: 80,
                material: 'Cedertræ / Hardwood',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                elevation: 'Tagterrasse',
                roofTerraceFeet: 'Ja',
                fastening: 'Skjult montering (med specielle sidebeslag/propper)',
                railing: 'Ja',
                railingMeters: 25,
                terraceComplexity: 'Ja, komplekst design'
            }
        }
    },
    {
        name: "Terrasse med range amount ('40-60' m2) og overdækning",
        data: {
            category: 'terrace',
            details: {
                amount: '40-60',
                material: 'Komposit',
                disposal: 'Nej',
                elevation: 'Jordniveau',
                roofing: 'Ja',
                roofingAmount: 15,
                roofingType: 'Fast tag (med tagpap)'
            }
        }
    },

    // 2. ROOF CASES
    {
        name: "Standard paptag 120m2 med let hældning",
        data: {
            category: 'roof',
            details: {
                amount: 120,
                material: 'Paptag',
                roofPitch: 'Fladt tag / Let hældning (<15 grader)',
                disposal: 'Nej',
                floors: '1-plan (Stueplan)'
            }
        }
    },
    {
        name: "Ekstremt tag (Tegl + Høj rejsning + 2. etage + Asbest-bortskaffelse + Ovenlysvinduer + Stern + Tagrender + Skorsten)",
        data: {
            category: 'roof',
            details: {
                amount: 180,
                material: 'Tegl',
                roofPitch: 'Høj rejsning / Normal hældning',
                roofType: 'Saddeltag (Almindeligt tag med 2 gavle)',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldRoofType: 'Tagplader (asbest)',
                floors: '1½-plan / 2-plan / Mere',
                eaves: 'Ja',
                gables: 'Ja',
                chimney: 'Ja',
                chimneyAmount: 2,
                insulation: 'Ja',
                extensions: 'Ja',
                extensionsAmount: 2,
                skylightReplace: 'Ja',
                skylightReplaceAmount: 2,
                skylightNew: 'Ja',
                skylightNewAmount: 1,
                trailerAccess: 'Nej, den skal stå langt væk'
            }
        }
    },

    // 3. WINDOWS CASES
    {
        name: "Vinduer standard 8 stk. med fuge og bortskaffelse",
        data: {
            category: 'windows',
            details: {
                amount: 8,
                material: 'Træ/alu (kombination)',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe dem',
                housingType: 'Helårsbolig',
                pcbCheck: 'Nej, bygget/skiftet efter 1977',
                finish: 'Ja',
                floors: 'Stueplan (Jordniveau)'
            }
        }
    },
    {
        name: "Blanding yder/tagvinduer og lift-leje",
        data: {
            category: 'windows',
            details: {
                amount: 6,
                windowType: 'Blanding',
                roofAmount: 2,
                facadeAmount: 4,
                roofMaterial: 'Ovenlysvindue / Velux (pr. stk)',
                facadeMaterial: 'Aluminium',
                disposal: 'Nej',
                floors: '2-sal eller højere (Kræver lift/stillads)'
            }
        }
    },
    {
        name: "Vindues-konfigurator med tungt glas og personsikkerhed",
        data: {
            category: 'windows',
            details: {
                amount: 3,
                windowsConfig: [
                    { type: 'Standard', width: 120, height: 120, isOpenable: true },
                    { type: 'Panorama', width: 250, height: 200, safetyGlass: true },
                    { type: 'Skydedør', width: 300, height: 220, hasSlidingDoor: true }
                ],
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe dem',
                pcbCheck: 'Ja, det er fra før 1977 (Risiko for miljøsanering)',
                finish: 'Ja',
                floors: '1. sal (Kræver evt. rullestillads/ekstra bæring)'
            }
        }
    },

    // 4. FLOOR & CEILING CASES
    {
        name: "Massivt trægulv sildeben med gulvvarme (sporplader) og underlag",
        data: {
            category: 'floor',
            details: {
                amount: 45,
                material: 'Massivt træ',
                floorFoundation: 'Strøer / Trækonstruktion',
                floorPattern: 'Ja, i mønster (fx Sildeben / Chevron)',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldFloorType: 'Klinker / Fliser',
                underfloorHeating: 'Ja, i sporplader (tørt system)',
                skirting: 'Ja'
            }
        }
    },
    {
        name: "Gulv med 'Ved ikke / Andet' underlag (Skal give samme worst-case pris som Strøer)",
        data: {
            category: 'floor',
            details: {
                amount: 45,
                material: 'Massivt træ',
                floorFoundation: 'Ved ikke / Andet',
                floorPattern: 'Ja, i mønster (fx Sildeben / Chevron)',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldFloorType: 'Klinker / Fliser',
                underfloorHeating: 'Ja, i sporplader (tørt system)',
                skirting: 'Ja'
            }
        }
    },
    {
        name: "Gulv med forenklet dørflow (3 døre)",
        data: {
            category: 'floor',
            details: {
                amount: 40,
                material: 'Laminat',
                floorFoundation: 'Beton / Støbt dæk',
                floorDoorsNear: 'Ja',
                floorDoorsCount: 3
            }
        }
    },
    {
        name: "Gulv med faste forhindringer (køkkenø, rør osv.)",
        data: {
            category: 'floor',
            details: {
                amount: 40,
                material: 'Laminat',
                floorFoundation: 'Beton / Støbt dæk',
                floorObstacles: 'Ja, det er der (køkkenø, søjler, skorsten eller rør)'
            }
        }
    },
    {
        name: "Troldtekt akustikloft med forskalling, dampspærre, isolering og kip-højde",
        data: {
            category: 'ceilings',
            details: {
                amount: 60,
                material: 'Troldtekt (akustikloft)',
                oldCeilingType: 'Nedhængt loft (systemloft)',
                vaporAndInsulation: 'Koldt tagrum inkl. ny isolering (Dampspærre + Isolering)',
                ceilingHeight: 'Ja, loft-til-kip eller højere end 2,5m',
                spots: 'Nej'
            }
        }
    },
    {
        name: "Standard Gipsloft med automatisk malerspartling og afmontering af træloft",
        data: {
            category: 'ceilings',
            details: {
                amount: 50,
                material: 'Gipsloft (standard 2-lag)',
                oldCeilingType: 'Træloft (listeloft/paneler/rustikloft)',
                vaporAndInsulation: 'Opvarmet etage (Ingen dampspærre nødvendig)',
                ceilingHeight: 'Nej, standard lofthøjde',
                spots: 'Nej'
            }
        }
    },
    {
        name: "Premium Lydgipsloft med spots, elektriker og 'Ved ikke' dampspærresikkerhed",
        data: {
            category: 'ceilings',
            details: {
                amount: 70,
                material: 'Lydgipsloft (lyddæmpende gips)',
                oldCeilingType: 'Gipsloft (standard 2-lag)',
                vaporAndInsulation: 'Ved ikke / Uvist (Beregner dampspærre som sikkerhed)',
                ceilingHeight: 'Nej, standard lofthøjde',
                spots: 'Ja',
                spotsAmount: 12
            }
        }
    },

    // 5. DOORS CASES
    {
        name: "Døre blanding med dørtrin og greb",
        data: {
            category: 'doors',
            details: {
                doorType: 'Blanding',
                exteriorAmount: 2,
                interiorAmount: 6,
                exteriorMaterial: 'Massivt træ og glas',
                interiorMaterial: 'Finér',
                thresholds: 'Ja',
                hardware: 'Tømreren skal levere standard greb/låse',
                finish: 'Ja',
                doorMeasurementType: 'Ja, der er dobbeltdøre/specialmål iblandt'
            }
        }
    },

    // 6. CARPORT & ANNEX & FENCE
    {
        name: "Dobbelt carport med saddeltag, asbest-nedrivning og isoleret skur (Besigtigelse)",
        data: {
            category: 'carport',
            details: {
                notes: 'Dobbelt carport i Thermowood med saddeltag og integreret isoleret skur.'
            }
        }
    },
    {
        name: "Fuldt beboeligt anneks på betonfundament (Kompleks - skal give Besigtigelse)",
        data: {
            category: 'annex',
            details: {
                amount: 25,
                material: 'Cedertræ / Hardwood',
                annexType: 'Fuldt beboeligt anneks',
                roofType: 'Sadel tag (Høj rejsning)',
                disposal: 'Nej'
            }
        }
    },
    {
        name: "Simpelt uisoleret skur med standard trækonstruktion",
        data: {
            category: 'annex',
            details: {
                amount: 10,
                material: 'Trykimprægneret',
                annexType: 'Uisoleret skur til opbevaring',
                roofType: 'Fladt tag / ensidig hældning (Tagpap)',
                disposal: 'Nej',
                foundationType: 'Trækonstruktion / Punktfundament (standard robust underlag)'
            }
        }
    },
    {
        name: "Simpelt uisoleret skur med HardiePlank og betonsokkel",
        data: {
            category: 'annex',
            details: {
                amount: 12,
                material: 'HardiePlank',
                annexType: 'Uisoleret skur til opbevaring',
                roofType: 'Fladt tag / ensidig hældning (Tagpap)',
                disposal: 'Nej',
                foundationType: 'Støbt betondæk / sokkel (kræver jord-/betonarbejde)'
            }
        }
    },
    {
        name: "Listehegn med ekstra højde, stålstolper på stolpesko og fældning af levende hæk",
        data: {
            category: 'fence',
            details: {
                amount: 40,
                material: 'Listehegn (Træ)',
                postMaterial: 'Metal/Stålstolper',
                postAnchoringWoodMetal: 'Stolpesko i støbt punktfundament (Træ fri af jord)',
                fenceHeight: 'Op til 2,0 meter',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldMaterial: 'Hæk / Levende planter'
            }
        }
    },

    // 7. FACADES & EXTENSIONS
    {
        name: "Træfacade med efterisolering, lodret montering, åbninger og stillads",
        data: {
            category: 'facades',
            details: {
                amount: 90,
                material: 'Superwood',
                mountingStyle: 'Lodret listebeklædning',
                openings: 8,
                floors: '1½-plan / 2-plan / Mere',
                oldFacadeMaterial: 'Mursten / Beton (kræver plugs)'
            }
        }
    },
    {
        name: "Tilbygning med stor gennembrydning og vådrumspakke (skal ende som 'Besigtigelse kræves')",
        data: {
            category: 'extensions',
            details: {
                amount: 40,
                material: 'Hardwood / Cedertræ',
                breakthrough: 'Ja, stor åbning',
                wetRoom: 'Ja',
                windowsDoors: 4
            }
        }
    },

    // 8. SPECIAL & ERROR-PRONE EDGE CASES
    {
        name: "AI Specialopgave med gyldige timer og priser",
        data: {
            category: 'special',
            details: {
                aiLaborHours: 35,
                aiMaterialCost: 20000
            }
        }
    },
    {
        name: "AI Specialopgave som er kompleks (0 timer, 0 materialer)",
        data: {
            category: 'special',
            details: {
                aiLaborHours: 0,
                aiMaterialCost: 0
            }
        }
    },
    {
        name: "Ugyldige input (NaN/null/undefined og negative værdier)",
        data: {
            category: 'floor',
            details: {
                amount: -10, // negative amount
                material: 'UgyldigtMateriale', // non-existent material
                disposal: null,
                floorFoundation: undefined
            }
        }
    },

    // 9. KOMBI-PROJEKT CASES
    {
        name: "Standard Kombi-projekt (Terrasse + Vinduer med mængderabat & delt kørsel)",
        data: {
            category: 'Kombi-projekt',
            projects: [
                {
                    id: 'proj-1',
                    category: 'terrace',
                    details: {
                        amount: 30,
                        material: 'Trykimprægneret',
                        disposal: 'Nej',
                        elevation: 'Jordniveau',
                        fastening: 'Synlige skruer (standard)',
                        railing: 'Nej'
                    }
                },
                {
                    id: 'proj-2',
                    category: 'windows',
                    details: {
                        amount: 8,
                        material: 'Træ/alu (kombination)',
                        disposal: 'Ja, tømreren skal afmontere OG bortskaffe dem',
                        housingType: 'Helårsbolig',
                        pcbCheck: 'Nej, bygget/skiftet efter 1977',
                        finish: 'Ja',
                        floors: 'Stueplan (Jordniveau)'
                    }
                }
            ]
        }
    },
    {
        name: "Kompleks Kombi-projekt med AI Specialopgave (Skal ende som 'Besigtigelse kræves')",
        data: {
            category: 'Kombi-projekt',
            projects: [
                {
                    id: 'proj-3',
                    category: 'terrace',
                    details: {
                        amount: 30,
                        material: 'Trykimprægneret',
                        disposal: 'Nej',
                        elevation: 'Jordniveau'
                    }
                },
                {
                    id: 'proj-4',
                    category: 'special',
                    details: {
                        aiLaborHours: 0,
                        aiMaterialCost: 0
                    }
                }
            ]
        }
    }
];

async function runTests() {
    console.log("=========================================");
    console.log("🧪 KØRER AUTOMATISK ROBUSTHEDS- OG SIKKERHEDSTEST PÅ PRISBEREGNEREN");
    console.log("=========================================\n");

    let passedCount = 0;
    let failedCount = 0;

    for (const tc of testCases) {
        console.log(`▶ Test: "${tc.name}" [Kategori: ${tc.data.category}]`);
        try {
            const res = await performCalculation(
                tc.data,
                defaultCustomer,
                defaultSettings,
                MATERIAL_INDEX,
                defaultCarpenter
            );

            // Tjek for ulovlige værdier
            const finalPrice = res.calcData?.finalEstimateIncVat;
            const finalPriceEx = res.calcData?.finalEstimateExVat;
            const laborHours = res.calcData?.laborHours;
            const materialCost = res.calcData?.materialCost;
            const drivingCost = res.calcData?.drivingCost;

            let failed = false;
            let errors = [];

            if (res.priceRange !== "Besigtigelse kræves") {
                if (typeof finalPrice !== 'number' || isNaN(finalPrice) || !isFinite(finalPrice)) {
                    failed = true;
                    errors.push(`finalEstimateIncVat er ikke et gyldigt tal: ${finalPrice}`);
                }
                if (typeof finalPriceEx !== 'number' || isNaN(finalPriceEx) || !isFinite(finalPriceEx)) {
                    failed = true;
                    errors.push(`finalEstimateExVat er ikke et gyldigt tal: ${finalPriceEx}`);
                }
                if (typeof laborHours !== 'number' || isNaN(laborHours) || laborHours < 0) {
                    failed = true;
                    errors.push(`Arbejdstimer er ugyldige: ${laborHours}`);
                }
                if (typeof materialCost !== 'number' || isNaN(materialCost) || materialCost < 0) {
                    failed = true;
                    errors.push(`Materialepris er ugyldig: ${materialCost}`);
                }
                if (typeof drivingCost !== 'number' || isNaN(drivingCost) || drivingCost < 0) {
                    failed = true;
                    errors.push(`Kørselsudgift er ugyldig: ${drivingCost}`);
                }
                if (finalPrice <= 0 && res.priceRange !== "Besigtigelse kræves") {
                    failed = true;
                    errors.push(`Slutpris er 0 eller negativ: ${finalPrice}`);
                }
            }

            if (failed) {
                console.error(`❌ FEJLEDE:`, errors.join(", "));
                failedCount++;
            } else {
                console.log(`✅ OK: Pris = ${res.priceRange}, Timer = ${laborHours || 0} t, Materiale = ${materialCost || 0} kr`);
                passedCount++;
            }
        } catch (err) {
            console.error(`💥 CRASHEDE:`, err.message);
            failedCount++;
        }
        console.log("-----------------------------------------");
    }

    console.log(`\n=========================================`);
    console.log(`📊 SIMULERINGSRESULTAT:`);
    console.log(`Gennemført: ${passedCount} tests`);
    console.log(`Fejlet/Crashed: ${failedCount} tests`);
    console.log(`=========================================`);
    
    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
