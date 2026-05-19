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

    // Sanity defaults så manglende DB-værdier ikke producerer NaN gennem hele pris-beregningen.
    // Vigtigt: vi må IKKE bruge spread direkte, fordi en NULL-værdi i DB ellers overskriver fallback'en
    // og hele pris-beregningen ender med NaN.
    const SETTINGS_DEFAULTS = {
        hourly_rate: 550,
        material_markup: 1.15,
        container_disposal_fee: 2500,
        trailer_disposal_fee: 800,
        risk_margin: 1.25,
        driving_calc_method: 'fast',
        vehicle_cost_per_km: 3.8,
        crew_size: 2
    };
    const incoming = dbSettings || {};
    const merged = { ...SETTINGS_DEFAULTS };
    for (const key of Object.keys(SETTINGS_DEFAULTS)) {
        const v = incoming[key];
        if (typeof SETTINGS_DEFAULTS[key] === 'number') {
            if (typeof v === 'number' && Number.isFinite(v)) merged[key] = v;
        } else if (v !== null && v !== undefined && v !== '') {
            merged[key] = v;
        }
    }
    // Bevar evt. ekstra felter fra DB (som ikke har en default), men kun hvis de ikke er null
    for (const key of Object.keys(incoming)) {
        if (!(key in SETTINGS_DEFAULTS) && incoming[key] !== null && incoming[key] !== undefined) {
            merged[key] = incoming[key];
        }
    }
    dbSettings = merged;

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
        const parsedMat = parseFloat(d.aiMaterialCost);

        if (parsedHours === 0 && parsedMat === 0) {
            bArr.push(`Kompleks specialopgave: Projektet kræver besigtigelse.`);
            bArr.push(`AI vurdering: Opgavens omfang eller karakter gør det ikke muligt at beregne et retvisende overslag via chat.`);
            return {
                priceRange: "Besigtigelse kræves",
                breakdownArr: bArr,
                calcData: {
                    laborHours: 0,
                    drivingHours: 0,
                    hourlyRate: dbSettings.hourly_rate || 500,
                    totalLaborCost: 0,
                    materialCost: 0,
                    drivingCost: 0,
                    hiddenBuffer: 0,
                    strictPrice: 0,
                    calibrationFactor: 1.0,
                    totalPriceVat: 0
                }
            };
        }

        laborHours = (Number.isFinite(parsedHours) && parsedHours > 0) ? parsedHours : 10;
        const rawMat = (Number.isFinite(parsedMat) && parsedMat >= 0) ? parsedMat : 5000;
        // AI-estimat antages at indeholde tømrerens avance allerede (prompten beder om kundepris).
        // Vi undgår derfor dobbelt-markup her.
        materialCost = rawMat;
        bArr.push(`Opgaven er estimeret automatisk via AI Assistent.`);
        bArr.push(`AI vurdering: ${laborHours} arbejdstimer`);
        bArr.push(`AI vurdering af materialer: ${rawMat} kr.`);
    } else if (cat === 'extensions') {
        bArr.push(`Tilbygning/Kompleks opgave: Der foretages ingen automatisk prisudregning.`);
        bArr.push(`Kunden har indsendt en beskrivelse, og afventer kontakt for besigtigelse.`);
        return {
            priceRange: "Besigtigelse kræves",
            breakdownArr: bArr,
            calcData: {
                laborHours: 0,
                drivingHours: 0,
                hourlyRate: dbSettings.hourly_rate || 500,
                totalLaborCost: 0,
                materialCost: 0,
                drivingCost: 0,
                hiddenBuffer: 0,
                strictPrice: 0,
                calibrationFactor: 1.0,
                finalEstimateIncVat: 0,
                finalEstimateExVat: 0
            }
        };
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
            let heavyWindowCount = 0;
            d.windowsConfig.forEach((w) => {
                let h = formula.hoursPerUnit || 3.0; // standard vindue tid
                if (w.type === 'Panorama') h += 3.0;
                else if (w.type === 'Skydedør') h += 4.0;
                else if (w.type === 'Tagvindue') h += 5.0; // Tagvinduer tager længere tid
                // Tjek om der er brug for to mand / sugekop pga tunge partier
                if (w.width && w.height) {
                    const areaM2 = (parseFloat(w.width) / 100) * (parseFloat(w.height) / 100);
                    if (areaM2 >= 2.5) {
                        heavyWindowCount += 1;
                    }
                }

                if (w.hasSlidingDoor) h += 4.0;
                winHours += h;
            });
            laborHours += winHours;
            bArr.push(`Basis montering: ${d.windowsConfig.length} elementer udregnet til ca. ${laborHours.toFixed(1)} arbejdstimer`);

            if (heavyWindowCount > 0) {
                const heavyFeeHours = heavyWindowCount * 3.0; // 3 timer ekstra pr. tungt vindue for 2 mand
                laborHours += heavyFeeHours;
                bArr.push(`Tillæg: Ekstra bemanding til ${heavyWindowCount} tunge partier (> 2.5 kvm) vurderet til ca. ${heavyFeeHours} arbejdstimer`);
                
                // Vi gemmer countet til at udregne maskinleje (glasløfter) senere i logikken for at undgå BR18 markup
                d._heavyWindowCount = heavyWindowCount;
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
                        base += indexCat['Sikkerhedsglas (Personsikkerhed BR18)'] || 1500; // Ekstra tillæg for lamineret/hærdet personsikkerhedsglas iht. BR18
                    }
                    
                    if (w.hasSlidingDoor) base += indexCat['Skydedørsbeslag/Mekanisme'] || 8000;
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
            materialCost += (numericAmount * 350); // Special deponi (INGEN markup på miljø/sikkerhed)
            bArr.push(`Miljøtillæg: Miljøsanering forventet (Fuger/vinduer før 1977 kræver specialhåndtering af PCB/Bly) - Uden avance`);
        }
        // Automatisk nedrivnings-tjek (SOP)
        let needsDisposalLabor = false;
        let needsDisposalFee = false;

        if (d.disposal && d.disposal.startsWith('Ja')) {
            needsDisposalLabor = true;
            if (d.disposal.toLowerCase().includes('bortskaffe')) {
                needsDisposalFee = true;
            }
        }
        
        if (cat === 'facades' && d.oldFacadeMaterial && d.oldFacadeMaterial.includes('rives ned')) {
            needsDisposalLabor = true;
            needsDisposalFee = true;
        }

        if (needsDisposalLabor) {
            // Generisk nedrivnings-sats (som kan overskrives hvis der er asbest/andet specielt)
            let disposalRate = formula.disposalHours;
            if (cat === 'roof' && formula.disposalHoursByOldType && formula.disposalHoursByOldType[d.oldRoofType]) {
                disposalRate = formula.disposalHoursByOldType[d.oldRoofType];
            }
            
            // SOP #3 & #7: Alt nedrivning skal skaleres med mængden! 
            let dispTime = (disposalRate * numericAmount);
            laborHours += dispTime;

            if (needsDisposalFee) {
                let threshold = formula.containerThreshold;
                if (threshold && threshold > 0 && numericAmount >= threshold) {
                    // Skalér containere: 1 container pr. fuld threshold. (fx 150 m2 tag kræver 1, 300 m2 kræver 2).
                    let containerCount = Math.ceil(numericAmount / threshold);
                    // Sikkerhedsgrænse, så fejlindtastninger på fx 1000m2 ikke sprænger tilbuddet fuldstændig ud af proportioner.
                    if (containerCount > 5) containerCount = 5; 
                    
                    materialCost += dbSettings.container_disposal_fee * containerCount;
                    bArr.push(`Miljøtillæg: Bortskaffelse af stort volumen (${containerCount}x Containerleje/afhentning + ${dispTime.toFixed(1)} arbejdstimer) - Uden avance`);
                } else {
                    materialCost += dbSettings.trailer_disposal_fee;
                    bArr.push(`Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ ${dispTime.toFixed(1)} arbejdstimer incl. sortering) - Uden avance`);
                }
            } else {
                bArr.push(`Nedrivning: ${dispTime.toFixed(1)} arbejdstimer (Kunden forestår selv bortskaffelse)`);
            }
        }

        // Risikomargin for ældre huse (tag) – ældre huse har ofte skjulte problemer.
        // Brug initialInstallHours i stedet for laborHours for ikke at compound oven på
        // alle øvrige tag-tillæg (asbest, stillads, undertag, tagrender, kviste osv.)
        if (cat === 'roof' && d.houseAge) {
            const buildYear = parseInt(d.houseAge);
            if (!isNaN(buildYear) && buildYear > 1000) {
                const currentYear = new Date().getFullYear();
                const age = Math.max(0, currentYear - buildYear);
                if (age > 40) {
                    laborHours += initialInstallHours * (dbSettings.risk_margin - 1);
                    bArr.push(`Risikoramme (+${(dbSettings.risk_margin * 100 - 100).toFixed(0)}% tid på basis-monteringen) lagt til pga. husets alder (ca. ${age} år gammelt) – ældre huse har ofte skjulte konstruktionsproblemer`);
                }
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
                let disposalHours = 0.2; // default
                if (d.oldFloorType.includes('Klinker')) {
                    disposalHours = 0.6;
                    bArr.push(`Tillæg: Tung nedrivning af eksisterende klinker/fliser`);
                } else if (d.oldFloorType.includes('Beton')) {
                    disposalHours = 1.0;
                    bArr.push(`Tillæg: Tung nedrivning og ophugning af betongulv`);
                } else if (d.oldFloorType.includes('Gulvtæppe') || d.oldFloorType.includes('Linoleum')) {
                    disposalHours = 0.15;
                    bArr.push(`Tillæg: Fjernelse af fuldlimet gulvtæppe/linoleum/vinyl`);
                } else if (d.oldFloorType.includes('Trægulv')) {
                    disposalHours = 0.25;
                    bArr.push(`Tillæg: Nedbrydning af eksisterende trægulv/parket/laminat`);
                }
                laborHours += numericAmount * disposalHours;

                // SOP #2: Usynlige Omkostninger (Containerleje/bortskaffelse)
                if (!userSuppliesMaterials && d.disposal.toLowerCase().includes('bortskaffe')) {
                    let disposalFeePerM2 = indexCat['Bortskaffelse af gulv (pr m2)'] || 50;
                    if (d.oldFloorType.includes('Beton') || d.oldFloorType.includes('Klinker')) {
                        disposalFeePerM2 = indexCat['Bortskaffelse af tungt gulv (pr m2)'] || 120;
                    }
                    materialCost += numericAmount * disposalFeePerM2; // Ingen markup på affaldsgebyr
                    bArr.push(`Miljøtillæg: Containerleje og affaldsgebyrer for bortskaffelse af eksisterende gulv (Uden avance)`);
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
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Limning (Fuldlimning af mønstergulv)'] || 60) * dbSettings.material_markup;
                bArr.push(`Tillæg: Forøget tidsforbrug (+100%) samt dyr speciallim til fuldlimning af mønstergulv`);
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
            // SOP #7: Løst Boolesk Fælde.
            // Hvis kunden har "Ja" til dobbeltdøre/specialmål, må vi ikke gange ALLE deres 20 døre med 50%
            // Vi estimerer matematisk, at ca. hver fjerde dør er en dobbeltdør (men mindst 1)
            let specialDoorsCount = Math.ceil(numericAmount / 4); 
            if (specialDoorsCount > numericAmount) specialDoorsCount = numericAmount;
            
            // +50% tid pr. specialdør
            laborHours += specialDoorsCount * (formula.hoursPerUnit || 3.0) * 0.5;
            
            if (!userSuppliesMaterials) {
                // +50% materialepris KUN for de estimerede specialdøre
                let singleDoorPrice = (doorBodyMatCost / numericAmount);
                materialCost += specialDoorsCount * singleDoorPrice * 0.5;
            }
            bArr.push(`Tillæg: Beregnet forøget tids- og materialeforbrug (+50%) for ca. ${specialDoorsCount} dobbeltdøre/specialmål`);
        }

        if (cat === 'windows') {
            let scaffoldPrice = 0;
            let scaffoldText = '';
            
            if (numericAmount <= 3) {
                scaffoldPrice = (indexCat['Leje af rullestillads (lille opgave)'] || 1500);
                scaffoldText = `leje af rullestillads`;
            } else {
                scaffoldPrice = (indexCat['Tillæg: Stillads/Lift leje'] || 8000);
                scaffoldText = `lift/facadestillads-leje`;
            }

            if (d.floors && d.floors.includes('1. sal')) {
                laborHours += initialInstallHours * 0.2;
                if (!userSuppliesMaterials) materialCost += scaffoldPrice; // INGEN markup på stillads/materiel!
                bArr.push(`Tillæg: 1. sal – ekstra tidsforbrug (+20% tid) samt ${scaffoldText}`);
            } else if (d.floors && d.floors.includes('2. sal')) {
                laborHours += initialInstallHours * 0.4;
                if (!userSuppliesMaterials) materialCost += scaffoldPrice * 1.5; // Lift/Stillads til 2. sal er ca. 50% dyrere
                bArr.push(`Tillæg: 2. sal eller højere – ekstra tidsforbrug (+40% tid) samt højde-${scaffoldText}`);
            }

            if (d._heavyWindowCount > 0 && !userSuppliesMaterials) {
                let liftPrice = d._heavyWindowCount * (indexCat['Leje af glasløfter/sugekop (pr. tungt vindue)'] || 750);
                materialCost += liftPrice; // INGEN markup på materielleje!
                bArr.push(`Tillæg: Maskinleje (glasløfter/sugekop) til montering af ${d._heavyWindowCount} tunge partier`);
            }
        }

        if (cat === 'terrace') {
            if (!userSuppliesMaterials) {
                // SOP #2: Spild (afskær). Træterrasser kræver altid ca. 10% ekstra materiale til afskær, uanset kompleksitet.
                let baseMatPrice = indexCat[d.material] || 400;
                let spildM2 = numericAmount * 0.10; 
                materialCost += (spildM2 * baseMatPrice) * dbSettings.material_markup;
                
                // SOP #2: Usynlige udgifter. Skruer (rustfri A4), vinkelbeslag, murpap og plastikkiler koster ca. 60-80 kr. pr. m2 i sig selv.
                // Uden dette æder skruerne tømrerens dækningsbidrag på selve træet.
                let monteringsMat = indexCat['Montagematerialer (Skruer, beslag, kiler/murpap) pr m2'] || 70;
                materialCost += (numericAmount * monteringsMat) * dbSettings.material_markup;
                
                bArr.push(`Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (A4-skruer, beslag og kiler)`);
            }

            if (d.elevation === 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)') {
                laborHours += numericAmount * (formula.roofTerraceHours || 0.4);
                if (d.roofTerraceFeet && d.roofTerraceFeet.startsWith('Ja')) {
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Tagterrasse plastfødder (pr m2 overslag)'] || 90) * dbSettings.material_markup;
                }
                if (!userSuppliesMaterials) {
                    // SOP #2 + #4: Maskinleje (Materialehejs) til at få brædder op på taget. Uden material_markup!
                    materialCost += (indexCat['Leje af materialehejs (Tagterrasse)'] || 1500);
                }
                bArr.push(`Tillæg: Tagterrasse-montering (inkl. materialehejs og skånsom opklodsning)`);
            } else if (d.elevation && d.elevation.startsWith('Hævet terrasse')) {
                laborHours += numericAmount * (formula.elevatedHours || 0.6);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Hævet terrasse materialer (pr m2)'] || 250) * dbSettings.material_markup;
                bArr.push(`Tillæg: Hævet terrasse (kræver forstærket underkonstruktion, kraftige stolper og evt. stillads)`);
            }

            if (d.elevation !== 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)') {
                laborHours += numericAmount * (formula.groundFoundationHours || 0.8);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Punktfundament og støbemix (pr m2 overslag)'] || 150) * dbSettings.material_markup;
                bArr.push(`Standard tillæg: Etablering af bærende underlag (Udgravning, dug, stabilisering og opklodsning/punktfundament)`);
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
            if (!userSuppliesMaterials) {
                // SOP #2: Spild (afskær) og Montagematerialer (skruer, rygning)
                let baseMatPrice = indexCat[d.material] || 200;
                let spildM2 = numericAmount * 0.10; 
                materialCost += (spildM2 * baseMatPrice) * dbSettings.material_markup;
                
                let monteringsMat = indexCat['Montagematerialer (Skruer, fugleklodser, rygning) pr m2'] || 75;
                materialCost += (numericAmount * monteringsMat) * dbSettings.material_markup;
                
                bArr.push(`Standard tillæg: Forventet materialespild (+10%) samt tag-montagematerialer (skruer, fugleklodser, rygningskit)`);
            }

            let scaffoldCost = 0;
            // SOP #3: Stillads skal skaleres med arealet (perimeter/grundplan), ellers straffes små huse og store huse under-faktureres.
            if (d.floors === '1-plan (Stueplan)') {
                scaffoldCost += roofGrundplanM2 * (indexCat['Kant-sikring / Rullestillads 1-plan (pr m2 grundplan)'] || 45);
            } else if (d.floors === '1½-plan / 2-plan / Mere') {
                scaffoldCost += roofGrundplanM2 * (indexCat['Stilladsleje 1½-plan/2-plan (pr m2 grundplan)'] || 150); 
                laborHours += initialInstallHours * 0.3; // Changed to additive
            }
            if (d.roofPitch === 'Høj rejsning / Normal hældning') {
                scaffoldCost += roofGrundplanM2 * (indexCat['Stilladsleje høj rejsning (pr m2 grundplan)'] || 100);
                laborHours += initialInstallHours * 0.2; // Changed to additive
            }
            if (scaffoldCost > 0) {
                // SOP #4: Markup-Separation. Stillads er ekstern maskinleje og skal ikke have material_markup!
                materialCost += scaffoldCost;
                bArr.push(`Tillæg: Omfattende stillads/materiel-leje (skaleret efter m2) og forøget arbejdstid pga. husets plan/hældning`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldRoofType) {
                // Bemærk: Arbejdstiden (disposalHoursByOldType) er allerede lagt til ovenfor i linje 300-307!
                // Så vi skal KUN håndtere de materielle miljø-udgifter (deponi/container) her, UDEN markup.
                if ((d.oldRoofType.includes('asbest') || d.oldRoofType.includes('vides ikke')) && !d.oldRoofType.includes('fri')) {
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Miljødeponi asbest (pr m2)'] || 150); 
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af potentielt asbestholdigt tag (Uden avance)`);
                } else if (d.oldRoofType === 'Stråtag (tækket tag)') {
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Bortskaffelse af stråtag (ekstra volumen pr m2)'] || 200); 
                    bArr.push(`Miljøtillæg: Stor container-volumen og ekstra deponi til bortskaffelse af stråtag (Uden avance)`);
                }
            }
            
            // Obligatorisk spæropretning og undertag for skrå tage
            if (d.roofPitch === 'Høj rejsning / Normal hældning') {
                laborHours += numericAmount * (formula.levelingHours || 0.6);
                laborHours += numericAmount * (formula.underroofHours || 0.3);
                if (!userSuppliesMaterials) {
                    materialCost += numericAmount * (indexCat['Opretning af spær (Påforing)'] || 80) * dbSettings.material_markup;
                    materialCost += numericAmount * (indexCat['Undertag (dug)'] || 120) * dbSettings.material_markup;
                }
                bArr.push(`Standard: Påforing/opretning af eksisterende spærlag samt montering af nyt undertag er obligatorisk inkluderet.`);
            }

            if (d.eaves && d.eaves.startsWith('Ja')) {
                // Stern måles i løbende meter (hele tagomkredsen), ikke m² roof
                laborHours += estimatedSternMeters * (formula.eavesHoursPerMeter || 0.4);
                if (!userSuppliesMaterials) materialCost += estimatedSternMeters * (indexCat['Stern træværk (pr løbende meter)'] || 150) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udskiftning af stern/udhæng (estimeret ${estimatedSternMeters} løbende meter omkreds)`);
            }

            // Gavlsider (Træbeklædning)
            if (d.roofType === 'Saddeltag (Almindeligt tag med 2 gavle)' && d.gables && d.gables.startsWith('Ja')) {
                // Et skønnet gavlareal. En simpel tommelfingerregel: gavltrekant areal = ca. 15% af grundplanet samlet for 2 gavle.
                const estimatedGableArea = roofGrundplanM2 * 0.15; 
                laborHours += estimatedGableArea * (formula.gableHours || 0.8);
                if (!userSuppliesMaterials) {
                    materialCost += estimatedGableArea * (indexCat['Gavlbeklædning i træ (pr m2 gavl)'] || 500) * dbSettings.material_markup;
                }
                bArr.push(`Tillæg: Udskiftning af træ-/facadebeklædning på 2 gavltrekanter (estimeret ${estimatedGableArea.toFixed(1)} m2).`);
            }

            // Obligatoriske tagrender for alle tagudskiftninger
            let actualGutterMeters = estimatedGutterMeters;
            if (d.roofType === 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)') {
                actualGutterMeters = estimatedSternMeters; // Valmtag har tagrender hele vejen rundt
            }
            
            laborHours += actualGutterMeters * (formula.guttersHoursPerMeter || 0.35);
            if (!userSuppliesMaterials) {
                materialCost += actualGutterMeters * (indexCat['Tagrender og nedløb (pr løbende meter)'] || 250) * dbSettings.material_markup;
            }
            bArr.push(`Standard: Udskiftning til nye tagrender og nedløbsrør er inkluderet (estimeret ${actualGutterMeters} løbende meter).`);
            if (d.chimney && d.chimney.startsWith('Ja')) {
                const chimneyCount = parseInt(d.chimneyAmount) || 1;
                laborHours += chimneyCount * (formula.chimneyHours || 6.0);
                if (!userSuppliesMaterials) materialCost += chimneyCount * (indexCat['Skorstensinddækning (Zink/Bly)'] || 3500) * dbSettings.material_markup;
                bArr.push(`Tillæg: Special-inddækning af ${chimneyCount} skorsten(e)/hætte(r) (kræver bly/zink-arbejde)`);
            }

            if (d.insulation && d.insulation.startsWith('Ja')) {
                laborHours += numericAmount * (formula.insulationHours || 0.4);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Efterisolering af tag (pr m2)'] || 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Arbejdstid og eventuelle materialer til 200mm efterisolering af taget`);
            }
            if (d.extensions === 'Ja') {
                const extAmount = parseInt(d.extensionsAmount) || 1;
                // SOP #7: Skalér timer og udgifter baseret på antal kviste, i stedet for en flad sats!
                laborHours += extAmount * (formula.extensionHours || 15);
                if (!userSuppliesMaterials) materialCost += extAmount * (indexCat['Kvist (Inddækning og montering pr stk)'] || 12000) * dbSettings.material_markup;
                bArr.push(`Tillæg: Arbejdstid og inddæknings-materialer afsat til ${extAmount} kvist(e)/tilbygning(er) på taget`);
            }

            // Tillæg for utilgængelig container-placering (Bæretillæg)
            if (d.trailerAccess && d.trailerAccess.includes('langt væk')) {
                laborHours += numericAmount * (formula.trailerAccessHours || 0.15); // Ekstra bæretid pr m2
                bArr.push(`Tillæg: Containeren kan ikke stå ved huset – ekstra bæretid for affaldssortering og trillebør`);
            }

            if (d.skylights === 'Ja') {
                const skyAmount = parseInt(d.skylightAmount) || 1;
                laborHours += skyAmount * (formula.roofWindowHours || 8.0);
                
                let skylightPrice = indexCat['Ovenlysvindue / Velux (pr. stk)'] || 8500;
                if (d.roofPitch && d.roofPitch.includes('Fladt tag')) {
                    skylightPrice = indexCat['Ovenlysvindue fladt tag (pr. stk)'] || 14000;
                }
                
                if (!userSuppliesMaterials) materialCost += skyAmount * skylightPrice * dbSettings.material_markup;
                bArr.push(`Tillæg: ${skyAmount} ovenlysvindue(r) inkl. inddækning og montering`);
            }
        }

        if (cat === 'ceilings') {
            // SOP: Spots er nu automatisk inkluderet i standardprisen
            laborHours += numericAmount * 0.1;
            bArr.push(`Standard: Udskæring og tilpasning til spots og lampesteder er medregnet i tidsforbruget`);

            // SOP: Forskalling er nu altid obligatorisk (inkluderer standard opretning)
            laborHours += numericAmount * (formula.battenHours || 0.3);
            if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Forskalling'] || 50) * dbSettings.material_markup;
            bArr.push(`Standard: Forskalling (træskelet) til underlag for det nye loft`);

            if (d.vaporAndInsulation && d.vaporAndInsulation.includes('Koldt tagrum')) {
                laborHours += numericAmount * (formula.vaporBarrierHours || 0.2);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Dampspærre inkl tape'] || 35) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af plast-dampspærre mod koldt tagrum`);

                if (d.vaporAndInsulation.includes('Isolering')) {
                    laborHours += numericAmount * (formula.insulationHours || 0.2);
                    if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Isolering (50-100mm)'] || 85) * dbSettings.material_markup;
                    bArr.push(`Tillæg: Montering af ekstra isolering`);
                }
            }

            // SOP: Maler håndteres eksternt, og William tildeles ikke arbejdstimer
            if (d.plastering && d.plastering.includes('Ja')) {
                let malerKvmPris = indexCat['Maler: Spartel, filt og maling (pr m2)'] || 250;
                let malerCoord = indexCat['Maler: Koordineringsgebyr (Fast pris)'] || 5000;
                
                if (!userSuppliesMaterials) {
                    materialCost += (numericAmount * malerKvmPris); // Ingen tømrer-avance på malerens arbejdsløn/materialer
                    materialCost += malerCoord; 
                }
                bArr.push(`Håndværker-tillæg: Komplet spartling, fugning og maling af gipsloft (Udføres af professionel maler - Uden tømrer-avance). Inkl. koordinering (${malerCoord} kr)`);
            }

            // SOP: Automatiseret finish baseret på loftstype
            if (d.material === 'Træloft (listeloft/paneler/rustikloft)' || d.material === 'Troldtekt (akustikloft)') {
                laborHours += numericAmount * (formula.mouldingHours || 0.2);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Skyggelister / Fuge'] || 45) * dbSettings.material_markup;
                bArr.push(`Standard: Opsætning af skyggelister langs vægge (inkl. tid og materiale)`);
            }
            
            if (d.ceilingHeight === 'Ja, loft-til-kip eller højere end 2,5m') {
                laborHours += initialInstallHours * 0.3; 
                bArr.push(`Tillæg: Forøget tidsforbrug til loftsopsætning pga. loftshøjde/kip (+30%)`);
            }
        }

        if (cat === 'facades') {
            // SOP: Obligatorisk underkonstruktion for træfacader
            laborHours += numericAmount * (formula.windBarrierHours || 0.4);
            if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Vindspærre og Klemlister'] || 150) * dbSettings.material_markup;
            bArr.push(`Standard: Montering af ny underkonstruktion (vindspærre og klemlister/afsætning)`);

            // SOP: Montering uden på eksisterende murværk kræver lidt ekstra tid til forboring/plugs
            if (d.oldFacadeMaterial && d.oldFacadeMaterial.includes('Mursten')) {
                laborHours += numericAmount * 0.15;
                bArr.push(`Tillæg: Forøget tidsforbrug til forboring og fastgørelse af underkonstruktion i eksisterende murværk/puds`);
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

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                if (d.oldMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 0.5;
                    let eternitDisposal = indexCat['Miljøtillæg: Eternit nedrivning (pr m2)'] || 100;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * eternitDisposal); // INGEN MARKUP på miljødeponi
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdig bygning/tag (Uden avance)`);
                } else if (d.oldMaterial.includes('Mursten') || d.oldMaterial.includes('Beton')) {
                    laborHours += numericAmount * 1.0;
                    let tungDisposal = indexCat['Tillæg: Tung nedrivning Mursten/Beton (pr m2)'] || 200;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * tungDisposal); // INGEN MARKUP på container/deponi
                    bArr.push(`Tillæg: Tung nedrivning af bygning i mursten/beton inkl. byggeaffald/container (Uden avance)`);
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
                let beboPris = indexCat['Tillæg: Fuldt beboeligt/BR18 (pr m2)'] || 3500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * beboPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Opgaven udregnet som fuldt beboeligt (Krav til isolering iht. bygningsreglementet, ekstra finish)`);
            }
            if (d.roofType === 'Sadel tag (Høj rejsning)') {
                laborHours += initialInstallHours * 0.2;
                let sadelPris = indexCat['Tillæg: Sadel tag (pr m2)'] || 500;
                if (!userSuppliesMaterials) materialCost += (numericAmount * sadelPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag`);
            }
            
            // SOP #2: Spild (afskær) og Montagematerialer
            // Tømreren har altid afskær på facadebrædder, reglar, mv. + skruer, fuge, beslag.
            if (!userSuppliesMaterials) {
                let baseMatPrice = indexCat[d.material] || 500;
                let spildM2 = numericAmount * 0.10; 
                materialCost += (spildM2 * baseMatPrice) * dbSettings.material_markup;
                bArr.push(`Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, beslag, fuge)`);
            }
        }

        if (cat === 'carport') {
            if (d.roofType && d.roofType.includes('Sadel tag')) {
                laborHours += initialInstallHours * 0.4;
                let carportSadelPris = d.carportType && d.carportType.includes('Dobbelt') ? 
                    (indexCat['Tillæg: Sadel tag dobbelt (fast pris)'] || 15000) : 
                    (indexCat['Tillæg: Sadel tag enkelt (fast pris)'] || 8000);
                if (!userSuppliesMaterials) materialCost += (numericAmount * carportSadelPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                // numericAmount er antal carporte (ikke m²), så satserne er sat pr. carport
                // ud fra en standard-størrelse på ca. 25 m². Asbest var tidligere kraftigt undervurderet.
                if (d.oldMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 8.0;
                    let eternitPris = indexCat['Miljøtillæg: Eternit nedrivning (fast pris)'] || 8000;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * eternitPris); // INGEN MARKUP på miljødeponi
                    bArr.push(`Miljøtillæg: Sikker nedtagning og specialdeponi af asbestholdig carport/tag (Uden avance)`);
                } else if (d.oldMaterial.includes('Mursten') || d.oldMaterial.includes('Beton')) {
                    laborHours += numericAmount * 8.0;
                    let tungPris = indexCat['Tillæg: Tung nedrivning Mursten/Beton (fast pris)'] || 2500;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * tungPris); // INGEN MARKUP på container/deponi
                    bArr.push(`Tillæg: Tung nedrivning af carport i mursten/beton inkl. byggeaffald/container (Uden avance)`);
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
            
            // SOP #2: Spild (afskær) og Montagematerialer for carport
            if (!userSuppliesMaterials) {
                let baseMatPrice = indexCat[d.material] || 500;
                let spildStyk = numericAmount * 0.10; // 10% tillæg af basismaterialerne
                materialCost += (spildStyk * baseMatPrice) * dbSettings.material_markup;
                bArr.push(`Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, beslag, stolpesko)`);
            }
        }

        if (cat === 'fence') {
            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                if (d.oldMaterial.includes('Hæk') || d.oldMaterial.includes('Levende')) {
                    laborHours += numericAmount * 0.5;
                    let rodPris = indexCat['Miljøtillæg: Rodfræsning/deponi af hæk (pr m)'] || 50;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * rodPris); // INGEN MARKUP på miljødeponi/maskinleje
                    bArr.push(`Tillæg: Fældning, rodfræsning/opgravning af hæk inkl. deponi og maskinleje (Uden avance)`);
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

            // SOP #7: Skalering og arbejdsbyrde baseret på stil
            if (d.material) {
                if (d.material.includes('Listehegn')) {
                    laborHours += numericAmount * 0.4; // 1.2 timer/m total
                    bArr.push(`Tillæg: Øget tidsforbrug til opskruning af hundredvis af enkelte trælister`);
                } else if (d.material.includes('Lamelhegn')) {
                    laborHours -= numericAmount * 0.4; // 0.4 timer/m total
                    bArr.push(`Besparelse: Hurtigere montage af præfabrikerede hegnselementer`);
                } else if (d.material.includes('Raftehegn')) {
                    laborHours += numericAmount * 0.2; // 1.0 timer/m total
                    bArr.push(`Tillæg: Øget tidsforbrug pga. tung og mere omstændig håndtering af rafter`);
                }
            }
            
            // SOP #2: Spild (afskær) og Montagematerialer for hegn
            if (!userSuppliesMaterials) {
                let baseMatPrice = indexCat[d.material] || 500;
                let spildM = numericAmount * 0.10; // 10% tillæg af basismaterialerne
                materialCost += (spildM * baseMatPrice) * dbSettings.material_markup;
                bArr.push(`Standard tillæg: Forventet materialespild (+10%) samt montagematerialer (skruer, stolpebeton, beslag)`);
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

        if ((cat === 'windows' || cat === 'doors') && !userSuppliesMaterials) {
            // SOP #2: Tilføj grundlæggende montagematerialer for vinduer/døre (karmskruer, fuge, kiler), som tømreren altid skal bruge uanset indvendig finish
            materialCost += numericAmount * (indexCat['Montagematerialer (Udvendig fuge/skruer/kiler)'] || 150) * dbSettings.material_markup;
            bArr.push(`Standard tillæg: Montagematerialer (skruer, kiler og fuge)`);
        }

        if ((cat === 'windows' || cat === 'doors') && (d.finish === 'Ja' || d.finish === 'yes')) {
             if(formula.finishHoursPerUnit) {
                 laborHours += numericAmount * formula.finishHoursPerUnit;
                 if (cat === 'doors' && !userSuppliesMaterials) {
                     materialCost += numericAmount * (indexCat['Gerigter (sæt)'] || 300) * dbSettings.material_markup;
                 } else if (cat === 'windows' && !userSuppliesMaterials) {
                     materialCost += numericAmount * (indexCat['Indvendig finish (Gerigter/Fuge) proxy'] || 200) * dbSettings.material_markup;
                 }
                 bArr.push(`Tid og materiale inkluderet til indvendig finish (fuger og lister/gerigter)`);
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
