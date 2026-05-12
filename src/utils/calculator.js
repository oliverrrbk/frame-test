import { WORK_FORMULAS } from '../prices';

export const fetchGoogleDistance = async (origin, destination) => {
    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
            console.warn("Google Maps tog for lang tid! Bruger fallback.");
            resolve({ km: 25, hours: 0.5 });
        }, 4000);

        if (!window.google || !window.google.maps) {
            console.error("Google Maps script blev ikke indlæst.");
            clearTimeout(timeoutId);
            return resolve({ km: 25, hours: 0.5 }); // Fallback
        }

        try {
            const service = new window.google.maps.DistanceMatrixService();
            
            if (!origin || origin.trim().length < 4 || !destination || destination.trim().length < 4) {
                throw new Error("Mangler gyldige adresser");
            }

            service.getDistanceMatrix(
                {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: 'DRIVING',
                    unitSystem: window.google.maps.UnitSystem.METRIC,
                },
                (response, status) => {
                    clearTimeout(timeoutId);
                    if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                        const element = response.rows[0].elements[0];
                        const distanceKm = element.distance.value / 1000;
                        const durationHours = element.duration.value / 3600;
                        resolve({ km: distanceKm, hours: durationHours });
                    } else {
                        console.error("Fejl fra Google Maps:", status, response?.rows?.[0]?.elements?.[0]?.status);
                        resolve({ km: 25, hours: 0.5 }); // Fallback
                    }
                }
            );
        } catch (error) {
            console.error("Crash under kald til Google Maps: ", error);
            clearTimeout(timeoutId);
            resolve({ km: 25, hours: 0.5 });
        }
    });
};

export const performCalculation = async (projectData, customerDetails, dbSettings, dbMaterials, carpenter, calibration = null) => {
    const cat = projectData.category;
    const d = projectData.details;

    // Sanity defaults så manglende DB-værdier ikke producerer NaN gennem hele pris-beregningen
    dbSettings = {
        hourly_rate: 550,
        material_markup: 1.15,
        container_disposal_fee: 2500,
        trailer_disposal_fee: 800,
        risk_margin: 1.25,
        driving_calc_method: 'fast',
        vehicle_cost_per_km: 3.8,
        crew_size: 2,
        ...(dbSettings || {})
    };

    let laborHours = 0;
    let materialCost = 0;
    let bArr = [];

    const indexCat = (dbMaterials && dbMaterials[cat]) || {};
    const formula = WORK_FORMULAS[cat] || { hoursPerUnit: 1.0, disposalHours: 0 };

    // Robust parsing af d.amount: tager midten af et range (fx "5-10" => 7) i stedet for upper bound,
    // og lader være med at falde tilbage til magisk tal 5 ved ugyldig input
    let numericAmount = d.amount;
    if (typeof numericAmount === 'string') {
        const nums = numericAmount.split('-')
            .map(s => parseInt(s.replace(/[^0-9]/g, ''), 10))
            .filter(n => Number.isFinite(n));
        if (nums.length >= 2) {
            numericAmount = Math.round((nums[0] + nums[1]) / 2);
        } else if (nums.length === 1) {
            numericAmount = nums[0];
        } else {
            numericAmount = 1;
        }
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) numericAmount = 1;

    if (cat === 'doors' && d.doorType === 'Blanding') {
        numericAmount = (parseInt(d.exteriorAmount) || 0) + (parseInt(d.interiorAmount) || 0);
    } else if (cat === 'windows' && d.windowType === 'Blanding') {
        numericAmount = (parseInt(d.roofAmount) || 0) + (parseInt(d.facadeAmount) || 0);
    }

    // Omregn grundplan til faktisk tag-overfladeareal pga. hældning og udhæng.
    // Vi husker den oprindelige grundplan til at estimere LØBENDE METER (tagrender, stern).
    let roofGrundplanM2 = numericAmount;
    if (cat === 'roof') {
        if (d.roofPitch === 'Høj rejsning / Normal hældning') {
            numericAmount = numericAmount * 1.45; // ~45 graders hældning + udhæng = ca. +45% mere areal end grundplan
            bArr.push(`Areal: Omregnet grundplan til anslået faktisk tagareal: ca. ${numericAmount.toFixed(1)} m2`);
        } else {
            numericAmount = numericAmount * 1.10; // Fladt tag / let hældning + udhæng = ca. +10% mere areal end grundplan
            bArr.push(`Areal: Omregnet grundplan til anslået faktisk tagareal (inkl. udhæng): ca. ${numericAmount.toFixed(1)} m2`);
        }
    }
    // Heuristik: omkreds af typisk parcelhus-grundplan (1.5:1 aspekt) ≈ 4.08 * √areal.
    // Halvdelen er gavle, halvdelen er langside (= tagrender). Til stern bruges hele omkredsen.
    const sqrtGp = Math.sqrt(Math.max(1, roofGrundplanM2));
    const estimatedGutterMeters = Math.round(2.04 * sqrtGp);
    const estimatedSternMeters = Math.round(4.08 * sqrtGp);

    if (cat === 'special') {
        const parsedHours = parseFloat(d.aiLaborHours);
        laborHours = (Number.isFinite(parsedHours) && parsedHours > 0) ? parsedHours : 10;
        const parsedMat = parseFloat(d.aiMaterialCost);
        const rawMat = (Number.isFinite(parsedMat) && parsedMat >= 0) ? parsedMat : 5000;
        // AI-estimat antages at indeholde tømrerens avance allerede (prompten beder om kundepris).
        // Vi undgår derfor dobbelt-markup her.
        materialCost = rawMat;
        bArr.push(`Opgaven er estimeret automatisk via AI Assistent.`);
        bArr.push(`AI vurdering: ${laborHours} arbejdstimer`);
        bArr.push(`AI vurdering af materialer: ${rawMat} kr.`);
    } else if (cat === 'doors') {
        if (d.doorType === 'Blanding') {
            let eAmount = parseInt(d.exteriorAmount) || 0;
            let iAmount = parseInt(d.interiorAmount) || 0;
            laborHours += (eAmount * (formula.exteriorDoorHours || 5.5)) + (iAmount * formula.hoursPerUnit);
            bArr.push(`Basis montering: ${eAmount} yderdøre og ${iAmount} indvendige døre beregnet`);
        } else if (d.doorType === 'Ude/fordøre') {
            laborHours += numericAmount * (formula.exteriorDoorHours || 5.5);
            bArr.push(`Basis montering: ${numericAmount} yderdøre vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
        } else {
            laborHours += numericAmount * formula.hoursPerUnit;
            bArr.push(`Basis montering: ${numericAmount} indvendige døre vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
        }
    } else if (cat === 'windows') {
        if (d.windowsConfig && d.windowsConfig.length > 0) {
            let winHours = 0;
            let hasHeavyWindow = false;
            d.windowsConfig.forEach((w) => {
                let h = formula.hoursPerUnit || 3.0; // standard vindue tid
                if (w.type === 'Panorama') h += 3.0;
                else if (w.type === 'Skydedør') h += 4.0;
                else if (w.type === 'Tagvindue') h += 5.0; // Tagvinduer tager længere tid
                // Tjek om der er brug for to mand / sugekop pga tunge partier
                if (w.width && w.height) {
                    const areaM2 = (parseFloat(w.width) / 100) * (parseFloat(w.height) / 100);
                    if (areaM2 >= 2.5) {
                        hasHeavyWindow = true;
                    }
                }

                if (w.hasSlidingDoor) h += 4.0;
                winHours += h;
            });
            laborHours += winHours;
            bArr.push(`Basis montering: ${d.windowsConfig.length} elementer udregnet til ca. ${laborHours.toFixed(1)} arbejdstimer`);

            if (hasHeavyWindow) {
                const heavyFeeHours = 6.0; // Fast tillæg på 6 timer for at have to mand på opgaven den halve/hele dag
                laborHours += heavyFeeHours;
                bArr.push(`Tillæg: Ekstra bemanding / sugekop til tunge partier (> 2.5 kvm) vurderet til ca. ${heavyFeeHours} arbejdstimer`);
            }
        } else if (d.windowType === 'Blanding') {
            let rAmount = parseInt(d.roofAmount) || 0;
            let fAmount = parseInt(d.facadeAmount) || 0;
            laborHours += (rAmount * (formula.roofWindowHours || 8.0)) + (fAmount * formula.hoursPerUnit);
            bArr.push(`Basis montering: ${rAmount} tagvinduer og ${fAmount} facadevinduer beregnet`);
        } else if (d.windowType === 'Tagvinduer') {
            laborHours += numericAmount * (formula.roofWindowHours || 8.0);
            bArr.push(`Basis montering: ${numericAmount} tagvinduer vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
        } else {
            laborHours += numericAmount * formula.hoursPerUnit;
            bArr.push(`Basis montering: ${numericAmount} facadevinduer vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
        }
    } else {
        // For tag: brug materiale-specifik timer-sats (paptag er ~halvt så langsomt som tegl)
        let hpu = formula.hoursPerUnit;
        if (cat === 'roof' && formula.hoursPerUnitByMaterial && formula.hoursPerUnitByMaterial[d.material]) {
            hpu = formula.hoursPerUnitByMaterial[d.material];
        }
        laborHours += numericAmount * hpu;
        bArr.push(`Basis montering vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
    }
    
    let initialInstallHours = laborHours;
    const userSuppliesMaterials = d.ownMaterials === 'Ja, jeg har allerede købt det (kun pris på montering)';
    // Snapshot bruges til at undgå compound bugs (fx dobbeltdør-tillæg) når
    // dørmaterialer skal regnes oveni base, men IKKE oveni hardware/dørtrin/finish.
    let doorBodyMatCost = 0;

    if (cat !== 'special') {
        if (userSuppliesMaterials) {
            bArr.push(`Materialer er ikke medregnet i prisen (Kunden leverer selv)`);
        } else {
            if (cat === 'doors' && d.doorType === 'Blanding') {
                let extCost = indexCat[d.exteriorMaterial] || 500;
                let intCost = indexCat[d.interiorMaterial] || 500;
                const extA = parseInt(d.exteriorAmount) || 0;
                const intA = parseInt(d.interiorAmount) || 0;

                doorBodyMatCost = ((extA * extCost) + (intA * intCost)) * dbSettings.material_markup;
                materialCost += doorBodyMatCost;
                bArr.push(`Materialer udregnet (Blanding af yder/indre): ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else if (cat === 'windows' && d.windowsConfig && d.windowsConfig.length > 0) {
                // Udregn materiale-omkostninger baseret på de individuelle vinduer
                let winMatCost = 0;
                let matDb = indexCat[d.material] || 5000;
                
                d.windowsConfig.forEach((w) => {
                    let base = matDb; // start with selected material base
                    let expectedArea = 1.44; // ca 1.2m x 1.2m

                    if (w.type === 'Panorama') {
                        base = indexCat['Panorama/Specialmål'] || 12000;
                        expectedArea = 4.0; // ca 2x2m
                    }
                    else if (w.type === 'Skydedør') {
                        base = indexCat['Skydedør'] || 15000;
                        expectedArea = 4.2; // ca 2.1x2m
                    }
                    else if (w.type === 'Tagvindue') {
                        base = indexCat['Ovenlysvindue / Velux (pr. stk)'] || 8500;
                        expectedArea = 0.9; // ca 0.78x1.18m
                    }
                    
                    // Skaler prisen efter arealet
                    if (w.width && w.height) {
                        const areaM2 = (parseFloat(w.width) / 100) * (parseFloat(w.height) / 100);
                        // Beregn arealfaktor, men sæt grænser, så ekstreme inputs ikke ødelægger prisen (mellem 0.5 og 3.5 gange prisen)
                        const areaFactor = Math.min(Math.max(areaM2 / expectedArea, 0.5), 3.5);
                        
                        // Prisen ganges med arealfaktoren. Men vi beholder 30% som en "fast" grundpris for ramme, beslag osv. 
                        // og skalerer kun de resterende 70% med arealet.
                        base = (base * 0.30) + (base * 0.70 * areaFactor);
                    }

                    // Fixed windows (fastkarm) are usually cheaper than openable
                    if (w.isOpenable === false && w.type === 'Standard') {
                        base = base * 0.75; 
                    }

                    // Sikkerhedsglas (hærdet/lamineret)
                    if (w.type === 'Panorama' || w.type === 'Skydedør' || w.safetyGlass) {
                        base += 1500; // Ekstra tillæg for lamineret/hærdet personsikkerhedsglas iht. BR18
                    }
                    
                    if (w.hasSlidingDoor) base += 8000;
                    winMatCost += base;
                });
                
                if (d.twoTone && d.twoTone.startsWith('Ja')) {
                    winMatCost *= 1.15; // 15% tillæg for 2-farvede vinduer
                    bArr.push(`Tillæg: 2-farvede vinduer (fx sort ude / hvid inde) (+15% på materialer)`);
                }

                materialCost += winMatCost * dbSettings.material_markup;
                bArr.push(`Materialer udregnet (Individuel specifikation af ${d.windowsConfig.length} vinduer/døre): ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else if (cat === 'windows' && d.windowType === 'Blanding') {
                let roofCost = indexCat[d.roofMaterial] || 500;
                let facadeCost = indexCat[d.facadeMaterial] || 500;
                const roofA = parseInt(d.roofAmount) || 0;
                const facadeA = parseInt(d.facadeAmount) || 0;

                materialCost += ((roofA * roofCost) + (facadeA * facadeCost)) * dbSettings.material_markup;
                bArr.push(`Materialer udregnet (Blanding af tag/facade): ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else if (cat === 'doors') {
                let matPriceDb = indexCat[d.material] || 500;
                doorBodyMatCost = (numericAmount * matPriceDb) * dbSettings.material_markup;
                materialCost += doorBodyMatCost;
                bArr.push(`Materialer afregnet inkl. tillæg: ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else {
                let matPriceDb = indexCat[d.material] || 500;
                materialCost += (numericAmount * matPriceDb) * dbSettings.material_markup;
                bArr.push(`Materialer afregnet inkl. tillæg: ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            }
        }
    }
    
    if (cat !== 'special') {
        if (cat === 'windows' && d.housingType === 'Helårsbolig' && !userSuppliesMaterials) {
            materialCost = materialCost * 1.20; 
            bArr.push(`Tillæg: 3-lags energiruder (Krav: Helårsbolig / BR18) lagt til materialeprisen (+20%)`);
        }

        if (cat === 'windows' && d.pcbCheck && d.pcbCheck.startsWith('Ja')) {
            laborHours += numericAmount * 1.5; // Ekstra nedrivningstid pga. asbestdragter/afskærmning
            materialCost += (numericAmount * 350) * dbSettings.material_markup; // Special deponi
            bArr.push(`Miljøtillæg: Miljøsanering forventet (Fuger/vinduer før 1977 kræver specialhåndtering af PCB/Bly)`);
        }

        if (d.disposal && d.disposal.startsWith('Ja')) {
            // For tag: brug gammelt-tag-materiale specifik disposal-sats (asbest-/strå-tillæg
            // håndteres separat længere nede, så her er det den generiske nedrivningstid)
            let disposalRate = formula.disposalHours;
            if (cat === 'roof' && formula.disposalHoursByOldType && formula.disposalHoursByOldType[d.oldRoofType]) {
                disposalRate = formula.disposalHoursByOldType[d.oldRoofType];
            }
            let dispTime = (cat === 'kitchen') ? disposalRate : (disposalRate * numericAmount);
            laborHours += dispTime;

            if (numericAmount > formula.containerThreshold) {
                materialCost += dbSettings.container_disposal_fee;
                bArr.push(`Bortskaffelse af stort volumen (Containerleje/afhentning + ${dispTime.toFixed(1)} arbejdstimer)`);
            } else {
                materialCost += dbSettings.trailer_disposal_fee;
                bArr.push(`Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ ${dispTime.toFixed(1)} arbejdstimer incl. sortering)`);
            }
        }

        // Risikomargin for ældre huse (tag) – ældre huse har ofte skjulte problemer.
        // Brug initialInstallHours i stedet for laborHours for ikke at compound oven på
        // alle øvrige tag-tillæg (asbest, stillads, undertag, tagrender, kviste osv.)
        if (cat === 'roof' && d.houseAge) {
            const age = parseInt(d.houseAge);
            if (age && age < 1960) {
                laborHours += initialInstallHours * (dbSettings.risk_margin - 1);
                bArr.push(`Risikoramme (+${(dbSettings.risk_margin * 100 - 100).toFixed(0)}% tid på basis-monteringen) lagt til pga. husets alder (${age}) – ældre huse har ofte skjulte konstruktionsproblemer`);
            }
        }

        if (cat === 'floor') {
            // Tilføj materialespild (afskær), da tømreren altid skal købe mere ind end det reelle m²-areal
            if (!userSuppliesMaterials) {
                let matPriceDb = indexCat[d.material] || 400;
                let baseFloorCost = (numericAmount * matPriceDb) * dbSettings.material_markup;
                if (d.floorPattern === 'Ja, i mønster (fx Sildeben / Chevron)') {
                    materialCost += baseFloorCost * 0.15; // 15% spild til sildeben
                    bArr.push(`Tillæg: 15% materialespild (afskær) medregnet til specialmønster (Sildeben)`);
                } else {
                    materialCost += baseFloorCost * 0.07; // 7% spild til standard
                    bArr.push(`Tillæg: 7% materialespild (afskær) medregnet til gulvbrædderne`);
                }
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldFloorType) {
                if (d.oldFloorType.includes('Klinker')) {
                    laborHours += numericAmount * 0.6;
                    bArr.push(`Tillæg: Tung nedrivning af eksisterende klinker/fliser`);
                } else if (d.oldFloorType.includes('Beton')) {
                    laborHours += numericAmount * 1.0;
                    bArr.push(`Tillæg: Tung nedrivning og ophugning af betongulv`);
                } else if (d.oldFloorType.includes('Gulvtæppe')) {
                    laborHours += numericAmount * 0.1;
                    bArr.push(`Tillæg: Fjernelse af fuldlimet gulvtæppe/linoleum`);
                }
            }

            // Altid inkluder opretning af undergulv og trinlydsdæmpende underlag som standard
            laborHours += numericAmount * (formula.levelingHours || 0.6);
            if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Opretning af undergulv'] || 120) * dbSettings.material_markup;
            bArr.push(`Standard: Opretning af undergulv (inkl. tid og materialer)`);

            // Tilføj kun almindelig foam, hvis der slet ikke er gulvvarme. Både sporplader og støbt gulvvarme kræver eget/special underlag!
            if (!(d.underfloorHeating && d.underfloorHeating.startsWith('Ja'))) {
                // Massivt træ lagt direkte på strøer svømmer ikke, og bruger derfor ikke et fuldt lag foam/pap, kun evt. strimler.
                if (!(d.material === 'Massivt træ' && d.floorFoundation === 'Strøer / Trækonstruktion')) {
                    laborHours += numericAmount * (formula.underlayHours || 0.1);
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Trinlydsunderlag (Foam)'] || 45) * dbSettings.material_markup;
                    bArr.push(`Standard: Montering af trinlydsdæmpende underlag (foam/pap)`);
                }
            }

            if (d.floorFoundation === 'Strøer / Trækonstruktion') {
                // Undgå dobbeltkonfekt: Hvis de også får sporplader (gulvvarme), fungerer sporpladen som det bærende undergulv!
                if (d.underfloorHeating && d.underfloorHeating.includes('sporplader')) {
                    laborHours += numericAmount * 0.2; // Kun lidt ekstra tid til tilpasning af selve strøerne
                    bArr.push(`Tillæg: Tilpasning af strøer (bærende materialepris dækkes af sporpladerne)`);
                } else if (d.material === 'Massivt træ' && d.floorPattern !== 'Ja, i mønster (fx Sildeben / Chevron)') {
                    laborHours += numericAmount * 0.2; // Lidt tid til strø-tilpasning før plankerne lægges
                    bArr.push(`Tillæg: Montering af massive træplanker direkte på strøer (kræver ikke bærende spånplade-undergulv)`);
                } else {
                    laborHours += numericAmount * 0.4; // Øget tid til lægning af bærende undergulv på strøer for flydende gulve
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Bærende undergulv (Spånplader)'] || 120) * dbSettings.material_markup; // Pris for bærende gulvspånplader
                    bArr.push(`Tillæg: Opbygning af bærende undergulv (fx spånplader) på strøer forud for svømmende/mønster gulv`);
                }
            }

            if (d.specificFloorWishes === 'Ja, jeg har specifikke ønsker' && d.specificFloorDetails) {
                bArr.push(`Kundens note om gulvvalg: ${d.specificFloorDetails}`);
            }

            if (d.skirting === 'Ja') {
                laborHours += numericAmount * (formula.skirtingHoursPerUnit || 0.15);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Fodlister (pr. m2 gulvareal proxy)'] || 50) * dbSettings.material_markup;
                bArr.push(`Tillæg: Levering og montering af nye fodlister`);
            }
            
            if (d.floorPattern === 'Ja, i mønster (fx Sildeben / Chevron)') {
                laborHours += initialInstallHours * 1.0; // Sildeben tager oftest dobbelt så lang tid pga. præcision, limning og mange skæringer
                bArr.push(`Tillæg: Forøget tidsforbrug ved specialmønster (fx Sildeben/Chevron) på gulv (+100% tid)`);
            }

            if (d.underfloorHeating && d.underfloorHeating.includes('sporplader')) {
                laborHours += initialInstallHours * 0.8;
                if (!userSuppliesMaterials) materialCost += (numericAmount * (indexCat['Gulvvarme (Sporplader)'] || 450)) * dbSettings.material_markup; 
                bArr.push(`Tillæg: Opbygning af nyt gulvvarme (sporplader/varmefordelingsplader)`);
            } else if (d.underfloorHeating && d.underfloorHeating.includes('allerede støbt')) {
                laborHours += initialInstallHours * 0.3;
                if (!userSuppliesMaterials) materialCost += (numericAmount * (indexCat['Gulvvarme (Specialunderlag)'] || 80)) * dbSettings.material_markup; 
                bArr.push(`Tillæg: Montering over eksisterende gulvvarme kræver forøget arbejdstid og specialunderlag`);
            }
        }

        if (cat === 'doors' && d.doorMeasurementType === 'Ja, der er dobbeltdøre/specialmål iblandt') {
            laborHours += initialInstallHours * 0.5;
            // Tillæg lægges KUN på dørens egen materialepris (snapshot),
            // ikke på hardware/dørtrin/finish/disposal-fees der måtte være tilføjet før eller efter.
            if (!userSuppliesMaterials) {
                materialCost += doorBodyMatCost * 0.5;
            }
            bArr.push(`Tillæg: Beregnes ud fra forøget tids- og materialeforbrug ved dobbeltdøre/specialmål (+50%)`);
        }

        if (cat === 'windows') {
            if (d.floors && d.floors.includes('1. sal')) {
                laborHours += initialInstallHours * 0.2;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Stillads/Lift leje'] || 8000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Rullestillads/Ekstra bæring og forøget tidsforbrug til montering på 1. sal (+20% tid)`);
            } else if (d.floors && d.floors.includes('2. sal')) {
                laborHours += initialInstallHours * 0.4;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Stillads/Lift leje'] || 8000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Lift/Stillads-leje og forøget tidsforbrug til montering på 2. sal eller højere (+40% tid)`);
            }
        }

        if (cat === 'terrace') {
            if (d.elevation === 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)') {
                laborHours += numericAmount * (formula.roofTerraceHours || 0.4);
                if (d.roofTerraceFeet && d.roofTerraceFeet.startsWith('Ja')) {
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Tagterrasse plastfødder (pr m2 overslag)'] || 90) * dbSettings.material_markup;
                }
                bArr.push(`Tillæg: Tagterrasse-montering (opklodsning på tagpap kræver præcision og specialfødder)`);
            } else if (d.elevation && d.elevation.startsWith('Hævet terrasse')) {
                laborHours += numericAmount * (formula.elevatedHours || 0.6);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Hævet terrasse materialer (pr m2)'] || 250) * dbSettings.material_markup;
                bArr.push(`Tillæg: Hævet terrasse (kræver forstærket underkonstruktion, kraftige stolper og evt. stillads)`);
            }

            if (d.terrain && d.terrain.startsWith('Græs/Jord')) {
                laborHours += numericAmount * (formula.groundFoundationHours || 0.8);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Punktfundament og støbemix (pr m2 overslag)'] || 150) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udgravning, udlægning af dug og etablering af punktfundamenter/støbning`);
            }

            if (d.material === 'Hardwood / Hårdttræ') {
                laborHours += initialInstallHours * 0.5; // +50% ekstra tid pga. forboring og undersænkning af hver skrue
                bArr.push(`Tillæg: Forøget tidsforbrug til Hardwood/Hårdttræ (krav om forboring og undersænkning af hver skrue) (+50%)`);
            }
            if (d.fastening && d.fastening.startsWith('Skjult montering')) {
                laborHours += numericAmount * (formula.hiddenFasteningHours || 0.3);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Beslag til skjult montering (pr m2 overslag)'] || 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Skjult montering (kræver specialbeslag/propper og tager længere tid pr. bræt)`);
            }

            if (d.railing && d.railing.startsWith('Ja') && d.railingMeters) {
                let meters = parseFloat(d.railingMeters);
                laborHours += meters * (formula.railingHoursPerMeter || 1.2);
                if (!userSuppliesMaterials) materialCost += meters * (indexCat['Rækværk/Gelænder træ (pr løbende meter)'] || 400) * dbSettings.material_markup;
                bArr.push(`Tillæg: Bygning af ${meters} meter rækværk/gelænder`);
            }

            if (d.terraceComplexity && d.terraceComplexity.startsWith('Ja')) {
                laborHours += initialInstallHours * 0.5;
                if (!userSuppliesMaterials) {
                    let baseMat = indexCat[d.material] || 400;
                    materialCost += (numericAmount * baseMat * 0.2) * dbSettings.material_markup;
                }
                bArr.push(`Tillæg: Forøget bygge-kompleksitet (trapper, rundinger, plantekasser) tager mere tid og giver mere spild`);
            }
            
            if (d.roofing === 'Ja') {
                let roofArea = parseInt(d.roofingAmount) || 10;
                laborHours += roofArea * 1.5; 
                if (!userSuppliesMaterials) {
                    let roofMatPrice = d.roofingType === 'Fast tag (med tagpap)' ? (indexCat['Fast tag (med tagpap)'] || 800) : (indexCat['Termotag / Plast'] || 400);
                    materialCost += (roofArea * roofMatPrice) * dbSettings.material_markup;
                }
                bArr.push(`Tillæg: Overdækning på ${roofArea} m2 (${d.roofingType || 'Termo'}) lagt til prisen`);
            }
        }
        
        if (cat === 'roof') {
            let scaffoldCost = 0;
            if (d.floors === '1½-plan / 2-plan / Mere') {
                scaffoldCost += (indexCat['Tillæg: Stillads 1½-plan / 2-plan'] || 15000); 
                laborHours += initialInstallHours * 0.3; // Changed to additive
            }
            if (d.roofPitch === 'Høj rejsning / Normal hældning') {
                scaffoldCost += (indexCat['Tillæg: Stillads (Høj rejsning)'] || 10000);
                laborHours += initialInstallHours * 0.2; // Changed to additive
            }
            if (scaffoldCost > 0) {
                materialCost += scaffoldCost * dbSettings.material_markup;
                bArr.push(`Tillæg: Omfattende stillads/materiel-leje og forøget arbejdstid pga. husets plan og/eller tagets hældning`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldRoofType) {
                if (d.oldRoofType.includes('asbest') && !d.oldRoofType.includes('fri')) {
                    laborHours += numericAmount * 0.5; 
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 150) * dbSettings.material_markup; 
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdigt tag`);
                } else if (d.oldRoofType === 'Stråtag (tækket tag)') {
                    laborHours += numericAmount * 1.0; 
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 200) * dbSettings.material_markup; 
                    bArr.push(`Miljøtillæg: Nedtagning og bortskaffelse af stråtag (kræver mange arbejdstimer og meget stor container-volumen)`);
                }
            }
            
            if (d.leveling && d.leveling.startsWith('Ja')) {
                laborHours += numericAmount * (formula.levelingHours || 0.6);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Opretning af spær (Påforing)'] || 80) * dbSettings.material_markup;
                bArr.push(`Tillæg: Påforing og præcis opretning af eksisterende spærlag`);
            }
            if (d.underroof && d.underroof.startsWith('Ja')) {
                laborHours += numericAmount * (formula.underroofHours || 0.3);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Undertag (dug)'] || 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Levering og montering af nyt undertag`);
            }
            if (d.eaves && d.eaves.startsWith('Ja')) {
                // Stern måles i løbende meter (hele tagomkredsen), ikke m² roof
                laborHours += estimatedSternMeters * (formula.eavesHoursPerMeter || 0.4);
                if (!userSuppliesMaterials) materialCost += estimatedSternMeters * (indexCat['Stern træværk (pr løbende meter)'] || 150) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udskiftning af stern/udhæng (estimeret ${estimatedSternMeters} løbende meter omkreds)`);
            }

            if (d.gutters && d.gutters.startsWith('Ja')) {
                // Tagrender sidder på de to langside-eaves, halvdelen af omkredsen
                laborHours += estimatedGutterMeters * (formula.guttersHoursPerMeter || 0.35);
                if (!userSuppliesMaterials) materialCost += estimatedGutterMeters * (indexCat['Tagrender og nedløb (pr løbende meter)'] || 250) * dbSettings.material_markup;
                bArr.push(`Tillæg: Nye tagrender og nedløbsrør (estimeret ${estimatedGutterMeters} løbende meter)`);
            }
            if (d.chimney && d.chimney.startsWith('Ja')) {
                laborHours += (formula.chimneyHours || 6.0);
                if (!userSuppliesMaterials) materialCost += (indexCat['Skorstensinddækning (Zink/Bly)'] || 3500) * dbSettings.material_markup;
                bArr.push(`Tillæg: Special-inddækning af skorsten/hætter (kræver bly/zink-arbejde)`);
            }

            if (d.insulation && d.insulation.startsWith('Ja')) {
                laborHours += numericAmount * 0.4;
                if (!userSuppliesMaterials) materialCost += (numericAmount * 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Arbejdstid og eventuelle materialer til efterisolering af taget (50-100mm)`);
            }
            if (d.extensions === 'Ja') {
                laborHours += 15;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Kvist (Inddækning)'] || 10000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Overordnet basis-pulje af timer/materialer afsat til tilbygning/kviste på taget`);
            }

            // Tillæg for utilgængelig container-placering (Bæretillæg)
            if (d.trailerAccess && d.trailerAccess.includes('langt væk')) {
                laborHours += numericAmount * 0.15; // ~0.15 timer pr m2 ekstra bæretid
                bArr.push(`Tillæg: Containeren kan ikke stå ved huset – ekstra bæretid for affaldssortering og trillebør`);
            }

            if (d.skylights === 'Ja') {
                const skyAmount = parseInt(d.skylightAmount) || 1;
                laborHours += skyAmount * (formula.roofWindowHours || 8.0);
                if (!userSuppliesMaterials) materialCost += skyAmount * (indexCat['Ovenlysvindue / Velux (pr. stk)'] || 8500) * dbSettings.material_markup;
                bArr.push(`Tillæg: ${skyAmount} ovenlysvindue(r) inkl. inddækning og montering`);
            }
        }

        if (cat === 'ceilings') {
            if (d.spots === 'Ja, der skal bores ud til spots (fx 1 stk. pr 2. m2)') {
                let estimatedSpots = Math.floor(numericAmount / 2); 
                laborHours += estimatedSpots * 0.25; 
                bArr.push(`Tillæg: Arbejdstid afsat til præcis opmåling og udskæring til ca. ${estimatedSpots} spots`);
            }
            
            if (d.battensAndLeveling && d.battensAndLeveling.startsWith('Ja')) {
                laborHours += numericAmount * (formula.battenHours || 0.3);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Forskalling'] || 50) * dbSettings.material_markup;
                bArr.push(`Tillæg: Forskalling (træskelet) til loft`);
                
                if (d.battensAndLeveling.includes('opretning')) {
                    laborHours += numericAmount * (formula.levelingHours || 0.5);
                    bArr.push(`Tillæg: Stor opretning af skævt loft (ekstra tid)`);
                }
            }

            if (d.vaporAndInsulation && d.vaporAndInsulation.startsWith('Ja')) {
                laborHours += numericAmount * (formula.vaporBarrierHours || 0.2);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Dampspærre inkl tape'] || 35) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af dampspærre`);

                if (d.vaporAndInsulation.includes('isolering')) {
                    laborHours += numericAmount * (formula.insulationHours || 0.2);
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Isolering (50-100mm)'] || 85) * dbSettings.material_markup;
                    bArr.push(`Tillæg: Montering af isolering (50-100mm)`);
                }
            }

            if (d.plastering && d.plastering.startsWith('Ja')) {
                laborHours += numericAmount * (formula.plasteringHours || 0.6);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Spartelmasse og tape'] || 30) * dbSettings.material_markup;
                bArr.push(`Tillæg: Fuldspartling og armering af gips/fibergips (Klar til maler)`);
            }

            if (d.mouldings && d.mouldings !== 'Ingen afslutning / Gør det selv') {
                laborHours += numericAmount * (formula.mouldingHours || 0.2);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Skyggelister / Fuge'] || 45) * dbSettings.material_markup;
                bArr.push(`Tillæg: Afslutning mod væg (${d.mouldings})`);
            }
            
            if (d.ceilingHeight === 'Ja, loft-til-kip eller højere end 2,5m') {
                laborHours += initialInstallHours * 0.3; 
                bArr.push(`Tillæg: Forøget tidsforbrug til loftsopsætning pga. loftshøjde/kip (+30%)`);
            }
        }

        if (cat === 'facades') {
            if (d.disposal && d.disposal.startsWith('Ja') && d.oldFacadeMaterial) {
                if (d.oldFacadeMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 0.4;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 50) * dbSettings.material_markup; 
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdig facade`);
                } else if (d.oldFacadeMaterial.includes('Pudset') || d.oldFacadeMaterial.includes('Mursten')) {
                    laborHours += numericAmount * 0.8;
                    bArr.push(`Tillæg: Tung nedrivning af pudset facade / mursten`);
                }
            }

            if (d.windBarrier === 'Ja') {
                laborHours += numericAmount * (formula.windBarrierHours || 0.4);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Vindspærre og Klemlister'] || 150) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af ny underkonstruktion (vindspærre og klemlister)`);
            }
            if (d.insulation && d.insulation.startsWith('Ja')) {
                laborHours += numericAmount * (formula.insulationHours || 0.3);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Efterisolering (50-100mm)'] || 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Efterisolering af facade (50-100mm)`);
            }
            if (d.mountingStyle && d.mountingStyle.startsWith('Lodret')) {
                laborHours += initialInstallHours * 0.4; // 40% ekstra af basis-montage tid
                bArr.push(`Tillæg: Lodret montering (fx listebeklædning) kræver øget præcision og mere tidsforbrug`);
            }
            if (d.openings && parseInt(d.openings) > 0) {
                let count = parseInt(d.openings);
                laborHours += count * (formula.openingHours || 1.5);
                if (!userSuppliesMaterials) materialCost += count * (indexCat['Inddækning/Lister (pr åbning)'] || 400) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udskæring og inddækning/lister omkring ${count} vinduer/døre`);
            }
            
            if (d.floors === '1½-plan / 2-plan / Mere') {
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Facadestilladsleje'] || 12000) * dbSettings.material_markup; 
                laborHours += initialInstallHours * 0.25;
                bArr.push(`Tillæg: Facadestilladsleje samt forsinket arbejdsgang pga. husets højde (flere etager)`);
            }
        }
        
        if (cat === 'kitchen') {
            if (d.assembly && d.assembly.startsWith('Flat-pack')) {
                laborHours += numericAmount * (formula.assemblyHours || 0.8);
                bArr.push(`Tillæg: Samling af flat-pack / usamlede køkkenelementer`);
            }
            if (d.worktop && d.worktop.startsWith('Ja')) {
                laborHours += (formula.worktopHours || 4.0);
                bArr.push(`Tillæg: Tilpasning og fræsning af træ/laminat bordplade inkl. vask/kogeplade`);
            }
            if (d.integratedAppliances && d.integratedAppliances.startsWith('Ja')) {
                laborHours += (formula.applianceHours || 1.5);
                bArr.push(`Tillæg: Montering af træfronter på integrerede hvidevarer`);
            }
        }

        if (cat === 'extensions') {
            let baseExtMatCost = materialCost; 
            
            // Breakthrough
            if (d.breakthrough && d.breakthrough.includes('stor åbning')) {
                laborHours += formula.breakthroughLargeHours || 30;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Stor gennembrydning'] || 12000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Stor gennembrydning til hus (inkl. ståldrager, afstivning og støvafskærmning)`);
            } else if (d.breakthrough && d.breakthrough.includes('almindelig')) {
                laborHours += formula.breakthroughSmallHours || 8;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Lille gennembrydning'] || 2500) * dbSettings.material_markup;
                bArr.push(`Tillæg: Alm. dør-gennembrydning til eksisterende hus`);
            }

            // Wet room
            if (d.wetRoom && d.wetRoom.startsWith('Ja')) {
                laborHours += formula.wetRoomHours || 45;
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Vådrumspakke'] || 120000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Vådrumspakke udregnet (VVS, kloak, membran, forstærkninger og evt. murer)`);
            }

            // Windows and Doors
            if (d.windowsDoors && parseInt(d.windowsDoors) > 0) {
                let elems = parseInt(d.windowsDoors);
                laborHours += elems * (formula.windowDoorHours || 4);
                if (!userSuppliesMaterials) materialCost += elems * (indexCat['Tillæg: Element (Vindue/Dør)'] || 4000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Indkøb og montering af ${elems} udvendige vinduer/døre (inkl. lysninger/inddækning)`);
            }

            // Access / Digging
            if (d.access && d.access.startsWith('Nej')) {
                laborHours += formula.manualDiggingHours || 25;
                bArr.push(`Tillæg: Forøget tidsforbrug til fundament pga. manglende maskin-adgang (håndkraft/trillebør)`);
            }

            // Interior Finish
            if (d.interiorFinish && d.interiorFinish.startsWith('Råhus')) {
                laborHours -= initialInstallHours * 0.4;
                if (!userSuppliesMaterials) materialCost -= baseExtMatCost * 0.4;
                bArr.push(`Fradrag: Opgaven beregnes som RÅHUS (kunden står selv for indvendige vægge, lofter og gulve)`);
            }

            if (d.foundationType && d.foundationType.includes('Krybekælder')) {
                laborHours += initialInstallHours * 0.2;
                let krybekaelderPris = indexCat['Tillæg: Krybekælder (pr m2)'] || 500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * krybekaelderPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Fundament som krybekælder er medregnet (+ tid og materiel)`);
            } else if (d.foundationType && d.foundationType.includes('Støbt terrændæk')) {
                laborHours += numericAmount * 1.5;
                let betonPris = indexCat['Tillæg: Støbt terrændæk (pr m2)'] || 1500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * betonPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Støbt terrændæk (Beton) fundament er medregnet`);
            }

            if (d.underfloorHeating === 'Ja') {
                laborHours += numericAmount * 0.5;
                let varmePris = indexCat['Tillæg: Gulvvarme etablering (pr m2)'] || 450;
                if (!userSuppliesMaterials) materialCost += (numericAmount * varmePris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Etablering af gulvvarme i tilbygning`);
            }
            if (d.floors === '1½-plan') {
                laborHours += initialInstallHours * 0.5;
                if (!userSuppliesMaterials) materialCost += baseExtMatCost * 0.4;
                bArr.push(`Tillæg: 1½-plan udregnet (Forøget mængde spærtræ, tagflade, stillads)`);
            } else if (d.floors === '2-plan') {
                laborHours += initialInstallHours * 0.8;
                if (!userSuppliesMaterials) materialCost += baseExtMatCost * 0.8;
                bArr.push(`Tillæg: 2-plan udregnet (Tung konstruktion, etageadskillelse, stillads)`);
            }
            if (d.roofType === 'Tag med hældning (Tegl/Stål/Pap)') {
                laborHours += numericAmount * 1.5;
                let tagHaeldningPris = indexCat['Tillæg: Tag med hældning (pr m2)'] || 1000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * tagHaeldningPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Høj rejsning på tag (spærkonstruktion og tagbelægning)`);
            }
        }

        if (cat === 'annex') {
            if (d.access && d.access.startsWith('Nej')) {
                laborHours += 15;
                bArr.push(`Tillæg: Forøget tidsforbrug til udgravning pga. manglende maskin-adgang (håndkraft/trillebør)`);
            }
            if (d.foundationType && d.foundationType.includes('Støbt')) {
                laborHours += numericAmount * 1.5;
                let betonPris = indexCat['Tillæg: Støbt terrændæk (pr m2)'] || 1500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * betonPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udregnet med støbt terrændæk/beton fundament (inkl. isolering)`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                if (d.oldMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 0.5;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 100) * dbSettings.material_markup;
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdig bygning/tag`);
                } else if (d.oldMaterial.includes('Mursten') || d.oldMaterial.includes('Beton')) {
                    laborHours += numericAmount * 1.0;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 200) * dbSettings.material_markup;
                    bArr.push(`Tillæg: Tung nedrivning af bygning i mursten/beton inkl. byggeaffald/container`);
                }
            }

            if (d.annexType === 'Isoleret skur/værksted') {
                // +35% i stedet for +50% — isolering og indvendig beklædning er reelt en mindre operation
                // når basis-skuret allerede er bygget. Reducerer overprising på små annekser.
                laborHours += initialInstallHours * 0.35;
                let isoPris = indexCat['Tillæg: Isolering/værksted (pr m2)'] || 800;
                if (!userSuppliesMaterials) materialCost += (numericAmount * isoPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Fuld isolering og beklædning indvendigt medregnet`);
            } else if (d.annexType === 'Fuldt beboeligt anneks') {
                laborHours += initialInstallHours * 1.2;
                let beboPris = indexCat['Tillæg: Fuldt beboeligt/BR18 (pr m2)'] || 4000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * beboPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Opgaven udregnet som fuldt beboeligt (Krav til isolering iht. bygningsreglementet, ekstra finish)`);
            }
            if (d.roofType === 'Sadel tag (Høj rejsning)') {
                laborHours += initialInstallHours * 0.2;
                let sadelPris = indexCat['Tillæg: Sadel tag (pr m2)'] || 500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * sadelPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag`);
            }
        }

        if (cat === 'carport') {
            if (d.access && d.access.startsWith('Nej')) {
                laborHours += 10;
                bArr.push(`Tillæg: Forøget tidsforbrug til stolpehuller pga. manglende maskin-adgang (manuel gravning)`);
            }
            if (d.roofType && d.roofType.includes('Sadel tag')) {
                laborHours += initialInstallHours * 0.4;
                let carportSadelPris = d.carportType && d.carportType.includes('Dobbelt') ? 15000 : 8000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * carportSadelPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                // numericAmount er antal carporte (ikke m²), så satserne er sat pr. carport
                // ud fra en standard-størrelse på ca. 25 m². Asbest var tidligere kraftigt undervurderet.
                if (d.oldMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 8.0;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 8000) * dbSettings.material_markup;
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdig carport/tag`);
                } else if (d.oldMaterial.includes('Mursten') || d.oldMaterial.includes('Beton')) {
                    laborHours += numericAmount * 8.0;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 2500) * dbSettings.material_markup;
                    bArr.push(`Tillæg: Tung nedrivning af carport i mursten/beton inkl. byggeaffald/container`);
                } else if (d.oldMaterial.includes('Stål') || d.oldMaterial.includes('Alu')) {
                    laborHours += numericAmount * 2.0;
                    bArr.push(`Tillæg: Nedrivning og afskaffelse af stål/alu carport`);
                }
            }

            if (d.carportType && d.carportType.includes('Dobbelt')) {
                laborHours += initialInstallHours * 0.5;
                let dobbeltPris = indexCat['Tillæg: Dobbelt carport (fast pris)'] || 15000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * dobbeltPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udregnet som dobbelt carport (Bredere spænd og kraftigere dimensionering)`);
            }
            if (d.shedType === 'Ja - uisoleret') {
                laborHours += (numericAmount * 15);
                let uisoleretSkurPris = indexCat['Tillæg: Redskabsskur uisoleret (fast pris)'] || 8000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * uisoleretSkurPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Indbygget uisoleret redskabsskur`);
            } else if (d.shedType === 'Ja - isoleret') {
                laborHours += (numericAmount * 25);
                let isoleretSkurPris = indexCat['Tillæg: Redskabsskur isoleret (fast pris)'] || 15000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * isoleretSkurPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Indbygget isoleret redskabsskur`);
            }
        }

        if (cat === 'fence') {
            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                if (d.oldMaterial.includes('Hæk') || d.oldMaterial.includes('Levende')) {
                    laborHours += numericAmount * 0.5;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 50) * dbSettings.material_markup;
                    bArr.push(`Tillæg: Fældning, rodfræsning/opgravning af hæk inkl. deponi og maskinleje`);
                } else if (d.oldMaterial.includes('raftehegn') || d.oldMaterial.includes('Stammer')) {
                    laborHours += numericAmount * 0.2;
                    bArr.push(`Tillæg: Tung opgravning af gl. raftehegn/stammer`);
                }
            }

            if (d.fenceHeight === 'Op til 2,0 meter') {
                laborHours += initialInstallHours * 0.2;
                let ekstraHøjdePris = indexCat['Tillæg: Ekstra højde >1,8m (pr m)'] || 200;
                if (!userSuppliesMaterials) materialCost += (numericAmount * ekstraHøjdePris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Ekstra højde på hegn (kræver dybere huller og mere materiale)`);
            }
        }
        
        if (cat === 'doors') {
            if (d.thresholds === 'Ja') {
                laborHours += numericAmount * (formula.thresholdHours || 0.2);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Dørtrin / Bundstykke'] || 250) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af nye dørtrin / bundstykker`);
            }
            if (d.hardware === 'Tømreren skal levere standard greb/låse') {
                laborHours += numericAmount * (formula.hardwareHours || 0.3);
                if (d.doorType === 'Blanding') {
                    let eAmount = parseInt(d.exteriorAmount) || 0;
                    let iAmount = parseInt(d.interiorAmount) || 0;
                    let extHw = indexCat['Sikkerhedslås (Yderdør)'] || 1200;
                    let intHw = indexCat['Dørgreb inkl roset'] || 350;
                    if (!userSuppliesMaterials) materialCost += ((eAmount * extHw) + (iAmount * intHw)) * dbSettings.material_markup;
                } else {
                    let hwCost = d.doorType === 'Indvendige døre' ? (indexCat['Dørgreb inkl roset'] || 350) : (indexCat['Sikkerhedslås (Yderdør)'] || 1200);
                    if (!userSuppliesMaterials) materialCost += numericAmount * hwCost * dbSettings.material_markup;
                }
                bArr.push(`Tillæg: Montering og levering af dørgreb / låse`);
            } else if (d.hardware === 'Vi køber selv greb/låse (tømreren skal montere)') {
                laborHours += numericAmount * (formula.hardwareHours || 0.3);
                bArr.push(`Tillæg: Montering af jeres egne indkøbte dørgreb / låse`);
            } else if (d.hardware && d.hardware.includes('Special/Elektrisk lås')) {
                bArr.push(`Bemærk: Kunden ønsker elektrisk/special lås. Dette kræver elektriker og specialdele, pris for dette tillægges særskilt i endeligt tilbud.`);
            }
        }

        if ((cat === 'windows' || cat === 'doors') && (d.finish === 'Ja' || d.finish === 'yes')) {
             if(formula.finishHoursPerUnit) {
                 laborHours += numericAmount * formula.finishHoursPerUnit;
                 if (cat === 'doors' && !userSuppliesMaterials) {
                     materialCost += numericAmount * (indexCat['Gerigter (sæt)'] || 300) * dbSettings.material_markup;
                 }
                 bArr.push(`Tid og evt. materiale inkluderet til indvendig finish (fuger og gerigter)`);
             }
        }
         
         // Læg sikkerhedsbuffer til som fast sum for at dække uforudsete udgifter (Gælder ikke special, da AI selv prissætter)
         if (indexCat['Sikkerhed (Buffer-pris)']) {
             materialCost += indexCat['Sikkerhed (Buffer-pris)'] * dbSettings.material_markup;
             bArr.push(`Sikkerhedsbuffer tillagt prisen for at dække uforudsete forhindringer/udgifter`);
         }
    } 

    if(d.notes && d.notes.trim() !== "") {
        bArr.push(`Beregningen er standard - Jeg tjekker dine personlige noter før et tilbud gives.`);
    }

    // --- OPTIMIZATION 3: MINIMUM TIME BOUNDARY ---
    if (laborHours < 4) {
        bArr.push(`Minimumsfakturering på 4 arbejdstimer (En halv arbejdsdag) er anvendt, da opgaven var meget lille.`);
        laborHours = 4;
    }

    // workHours = rene arbejdstimer på pladsen (uden kørsel). Vi holder dem adskilt fra
    // driving for at undgå at "kørselstimer" forvirrer brugeren under "arbejdstimer".
    const workHours = laborHours;
    let totalLaborCost = workHours * dbSettings.hourly_rate;

    const companyFullAddress = carpenter?.address || '';
    const customerFullAddress = `${customerDetails.street || ''}, ${customerDetails.zip || ''} ${customerDetails.city || ''}`;

    const { km, hours } = await fetchGoogleDistance(companyFullAddress, customerFullAddress);

    let totalDriving = 0;
    let drivingMaterialCost = 0;
    let drivingLaborCost = 0;
    let drivingHoursBilled = 0;

    // Estimer antallet af arbejdsdage på pladsen.
    // En fuld svendedag = 7,5 effektive timer. Tømreren har som regel et hold med sig
    // (default 2 mand) på alt der varer mere end ca. 2 dages soloarbejde — så de timer
    // udføres parallelt, og det antal dage kunden ses (og kørsel pålægges) falder tilsvarende.
    // Små opgaver (< 20 t) udføres typisk solo og bruger derfor ikke crew-multiplier.
    const baseCrew = Math.max(1, dbSettings.crew_size || 2);
    const effectiveCrew = workHours < 20 ? 1 : baseCrew;
    const effectiveCapacityPerDay = 7.5 * effectiveCrew;
    const estimatedDays = Math.max(1, Math.ceil((workHours - 1.5) / effectiveCapacityPerDay));

    if (dbSettings.driving_calc_method === 'timer') {
        const exactHoursRoundTrip = (hours * 2) * estimatedDays;
        drivingHoursBilled = Math.max(1, Math.ceil(exactHoursRoundTrip));
        drivingLaborCost = drivingHoursBilled * dbSettings.hourly_rate;

        bArr.push(`Kørsel & Logistik (${companyFullAddress.split(',')[0]} ➜ Kundens adresse): ${km.toFixed(1)} km hver vej.`);
        bArr.push(`Transport faktureres som ren timepris: Estimeret ${estimatedDays} arbejdsdag(e) x ca. ${Math.ceil(hours*2)} time(r) á ${dbSettings.hourly_rate} kr. i alt: ${drivingLaborCost.toFixed(0)} kr`);

        totalLaborCost += drivingLaborCost;
        totalDriving = 0;
    } else {
        drivingMaterialCost = (km * 2) * estimatedDays * (dbSettings.vehicle_cost_per_km || 3.8);
        drivingLaborCost = (hours * 2) * estimatedDays * dbSettings.hourly_rate;
        totalDriving = drivingMaterialCost + drivingLaborCost;

        bArr.push(`Kørsel & Logistik (${companyFullAddress.split(',')[0]} ➜ Kundens adresse): ${km.toFixed(1)} km hver vej.`);
        bArr.push(`Slitage-takst (bil) samt lukkede timer under transport (Estimeret ${estimatedDays} dag(e)) udregnet til i alt: ${totalDriving.toFixed(0)} kr`);
    }

    const strictPrice = totalLaborCost + materialCost + totalDriving;

    // Rabat for selv-opmåling af vinduer
    let opmaalingRabat = 0;
    if (cat === 'windows' && d.waiveMeasurement) {
        opmaalingRabat = 1500;
        bArr.push(`Rabat: Kunden har påtaget sig opmålingsansvaret. Fradrag på opmålingsbesøg: -1.500 kr.`);
    }

    // --- OPTIMIZATION: SKJULT BUFFER I STEDET FOR FLAD MULTIPLIER ---
    // Vi fjerner "marginFactor = 1.25", da det giver dobbelt-avance på materialer og absurde tillæg på store opgaver.
    // I stedet lægger vi et fast, dynamisk beløb til den rå pris. Kunden ser ikke dette tillæg direkte,
    // men det sikrer at tømrerens rigtige tilbud næsten altid kan lande lidt under systemets pris.
    let hiddenBuffer = 5000;
    if (strictPrice > 150000) {
        hiddenBuffer = 15000;
    } else if (strictPrice > 50000) {
        hiddenBuffer = 10000;
    }

    // --- AUTO-LÆRING: KALIBRERING ---
    // Anvend tømrer-specifik (eller branche-aggregat) kalibreringsfaktor KUN på ikke-materiale-delen.
    // Materialeprisen er hellig — tømreren har sat den efter sine egne leverandøraftaler,
    // og den må aldrig "lære" sig op eller ned bag tømrerens ryg.
    // Kalibreringen er bevidst stille — tømreren skal opleve at systemet "bare virker",
    // ikke tænke over hvordan. Faktoren registreres dog i calcData så admin kan auditere.
    const calibFactor = (calibration && Number.isFinite(calibration.factor)) ? calibration.factor : 1.0;
    const nonMaterialRaw = totalLaborCost + totalDriving + hiddenBuffer;
    const nonMaterialCalibrated = nonMaterialRaw * calibFactor;

    let priceTop = materialCost + nonMaterialCalibrated - opmaalingRabat;
    if (priceTop < 0) priceTop = 0;

    // Rund ex-moms op til nærmeste 1.000 kr og udregn moms derfra. På den måde får
    // BÅDE ex-moms og inkl-moms pæne, runde tal (modsat før hvor ex-moms blev afledt
    // af et rundet inkl-momstal og endte med skæve kroner).
    let maxPriceExVat = Math.ceil(priceTop / 1000) * 1000;
    let maxPrice = Math.round(maxPriceExVat * 1.25);

    const fmtMax = new Intl.NumberFormat('da-DK').format(maxPrice);

    return {
        priceRange: `${fmtMax} kr. inkl. moms`,
        breakdownArr: bArr,
        calcData: {
            laborHours: Math.ceil(workHours),
            drivingHours: Math.ceil(drivingHoursBilled),
            hourlyRate: dbSettings.hourly_rate,
            totalLaborCost: Math.ceil(totalLaborCost),
            materialCost: Math.ceil(materialCost),
            drivingCost: Math.ceil(totalDriving),
            hiddenBuffer: hiddenBuffer,
            strictPrice: Math.ceil(strictPrice),
            calibrationFactor: calibFactor,
            calibrationSource: calibration?.source || 'none',
            calibrationSampleSize: calibration?.sampleSize || 0,
            finalEstimateIncVat: maxPrice,
            finalEstimateExVat: maxPriceExVat
        }
    };
};
