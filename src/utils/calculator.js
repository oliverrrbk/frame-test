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

export const performCalculation = async (projectData, customerDetails, dbSettings, dbMaterials, carpenter) => {
    const cat = projectData.category;
    const d = projectData.details;
    
    let laborHours = 0;
    let materialCost = 0;
    let bArr = [];

    const indexCat = dbMaterials[cat] || {};
    const formula = WORK_FORMULAS[cat] || { hoursPerUnit: 1.0, disposalHours: 0 };
    
    let numericAmount = d.amount || 1;
    if (typeof numericAmount === 'string') {
        numericAmount = parseInt(numericAmount.split('-')[1] || numericAmount.replace(/[^0-9]/g, '')) || 5;
    }

    if (cat === 'doors' && d.doorType === 'Blanding') {
        numericAmount = (parseInt(d.exteriorAmount) || 0) + (parseInt(d.interiorAmount) || 0);
    } else if (cat === 'windows' && d.windowType === 'Blanding') {
        numericAmount = (parseInt(d.roofAmount) || 0) + (parseInt(d.facadeAmount) || 0);
    }

    if (cat === 'special') {
        laborHours = parseFloat(d.aiLaborHours) || 10;
        const rawMat = parseFloat(d.aiMaterialCost) || 5000;
        materialCost = rawMat * dbSettings.material_markup;
        bArr.push(`Opgaven er estimeret automatisk via AI Assistent.`);
        bArr.push(`AI vurdering: ${laborHours} arbejdstimer`);
        bArr.push(`AI vurdering af materialer: ${rawMat} kr. (før din avance)`);
    } else if (cat === 'doors' && d.frameOrLeaf === 'Kun dørpladen (genbrug af eksisterende karm)') {
        laborHours += numericAmount * (formula.leafOnlyHours || 0.3);
        bArr.push(`Hurtig udskiftning (kun dørplader): ca. ${laborHours.toFixed(1)} arbejdstimer`);
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
        if (d.windowType === 'Blanding') {
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
        laborHours += numericAmount * formula.hoursPerUnit;
        bArr.push(`Basis montering vurderet til ca. ${laborHours.toFixed(1)} arbejdstimer`);
    }
    
    let initialInstallHours = laborHours;
    const userSuppliesMaterials = d.ownMaterials === 'Ja, jeg har dem allerede (kun pris på montering)';
    
    if (cat !== 'special') {
        if (userSuppliesMaterials) {
            bArr.push(`Materialer er ikke medregnet i prisen (Kunden leverer selv)`);
        } else {
            if (cat === 'doors' && d.doorType === 'Blanding') {
                let extCost = indexCat[d.exteriorMaterial] || indexCat['Sikkerhed (Buffer-pris)'] || 500;
                let intCost = indexCat[d.interiorMaterial] || indexCat['Sikkerhed (Buffer-pris)'] || 500;
                const extA = parseInt(d.exteriorAmount) || 0;
                const intA = parseInt(d.interiorAmount) || 0;
                
                materialCost += ((extA * extCost) + (intA * intCost)) * dbSettings.material_markup;
                bArr.push(`Materialer udregnet (Blanding af yder/indre): ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else if (cat === 'windows' && d.windowType === 'Blanding') {
                let roofCost = indexCat[d.roofMaterial] || indexCat['Sikkerhed (Buffer-pris)'] || 500;
                let facadeCost = indexCat[d.facadeMaterial] || indexCat['Sikkerhed (Buffer-pris)'] || 500;
                const roofA = parseInt(d.roofAmount) || 0;
                const facadeA = parseInt(d.facadeAmount) || 0;
                
                materialCost += ((roofA * roofCost) + (facadeA * facadeCost)) * dbSettings.material_markup;
                bArr.push(`Materialer udregnet (Blanding af tag/facade): ${(dbSettings.material_markup * 100 - 100).toFixed(0)}% avance`);
            } else {
                let matPriceDb = indexCat[d.material] || indexCat['Sikkerhed (Buffer-pris)'] || 500;
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

        if (d.disposal && d.disposal.startsWith('Ja')) {
            let dispTime = (cat === 'kitchen') ? formula.disposalHours : (formula.disposalHours * numericAmount);
            laborHours += dispTime;
            
            if (numericAmount > formula.containerThreshold) {
                materialCost += dbSettings.container_disposal_fee;
                bArr.push(`Bortskaffelse af stort volumen (Containerleje/afhentning + ${dispTime.toFixed(1)} arbejdstimer)`);
            } else {
                materialCost += dbSettings.trailer_disposal_fee;
                bArr.push(`Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ ${dispTime.toFixed(1)} arbejdstimer incl. sortering)`);
            }
        }

        let riskApplied = false;
        if (d.rafterDimKnown === 'Nej, vides ikke') {
            laborHours += laborHours * (dbSettings.risk_margin - 1);
            riskApplied = true;
        }

        if (riskApplied) {
            bArr.push(`Risikoramme (+${(dbSettings.risk_margin * 100 - 100).toFixed(0)}% tid) lagt til pga. ubekendte faktorer`);
        }

        if (cat === 'floor') {
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

            if (d.subfloor && d.subfloor.startsWith('Nej')) {
                laborHours += numericAmount * (formula.levelingHours || 0.6);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Opretning af undergulv'] || 120) * dbSettings.material_markup;
                bArr.push(`Tillæg: Opretning af skævt undergulv (strøer/flydespartel)`);
            }

            if (d.underlay === 'Ja') {
                laborHours += numericAmount * (formula.underlayHours || 0.1);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Trinlydsunderlag (Foam)'] || 45) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af trinlydsdæmpende underlag (foam/pap)`);
            }

            if (d.skirting === 'Ja') {
                laborHours += numericAmount * (formula.skirtingHoursPerUnit || 0.15);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Fodlister (pr. m2 gulvareal proxy)'] || 50) * dbSettings.material_markup;
                bArr.push(`Tillæg: Levering og montering af nye fodlister`);
            }
            
            if (d.floorPattern === 'Ja, i mønster (fx Sildeben / Chevron)') {
                laborHours += initialInstallHours * 0.5; // Changed from *1.5 total replacement to addition to avoid compounding errors
                bArr.push(`Tillæg: Beregnes ud fra forøget tidsforbrug ved specialmønster (fx Sildeben) på gulv (+50% tid)`);
            }

            if (d.underfloorHeating === 'Ja') {
                laborHours += initialInstallHours * 0.3;
                if (!userSuppliesMaterials) materialCost += (numericAmount * 80) * dbSettings.material_markup; 
                bArr.push(`Tillæg: Montering over/med gulvvarme kræver forøget arbejdstid og specialunderlag`);
            }
        }

        if (cat === 'doors' && d.doorMeasurementType === 'Ja, der er dobbeltdøre/specialmål iblandt') {
            laborHours += initialInstallHours * 0.5;
            if (!userSuppliesMaterials) {
                materialCost += materialCost * 0.5; 
            }
            bArr.push(`Tillæg: Beregnes ud fra forøget tids- og materialeforbrug ved dobbeltdøre/specialmål (+50%)`);
        }

        if (cat === 'windows' && d.windowMeasurementType === 'Ja, store specialmål / panorama') {
            laborHours += initialInstallHours * 1.0; 
            if (!userSuppliesMaterials) {
                let baseMat = indexCat[d.material] || 6000;
                let matMarkup = dbSettings.material_markup || 1.1;
                materialCost += (numericAmount * baseMat * 1.5) * matMarkup; 
            }
            bArr.push(`Tillæg: Store panoramavinduer / specialmål kræver specialhåndtering (maskine/glaskran og ekstra mandsopdækning)`);
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
            } else if (d.keepFoundation === 'Udskiftes / Bygges forfra') {
                laborHours += (numericAmount * (formula.foundationHoursPerUnit || 0.5));
                if (!userSuppliesMaterials) materialCost += (numericAmount * (indexCat['Udskiftning/Opbygning fundament (pr m2)'] || 150)) * dbSettings.material_markup;
                bArr.push(`Opbygning af ny underkonstruktion (fundament/strøer) beregnet`);
            }

            if (d.material === 'Hardwood / Hårdttræ') {
                laborHours += initialInstallHours * 1.0; 
                bArr.push(`Tillæg: Forøget tidsforbrug til Hardwood/Hårdttræ (krav om forboring og undersænkning af hver skrue)`);
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
                laborHours += numericAmount * (formula.eavesHours || 0.5);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Udhæng/Stern træværk (pr m2 overslag)'] || 150) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udskiftning af træværk ved gavl og udhæng (stern/underbeklædning)`);
            }
            
            if (d.gutters && d.gutters.startsWith('Ja')) {
                laborHours += numericAmount * (formula.guttersHours || 0.4);
                if (!userSuppliesMaterials) materialCost += numericAmount * (indexCat['Tagrender og nedløb (pr m2 overslag)'] || 180) * dbSettings.material_markup;
                bArr.push(`Tillæg: Montering af nye tagrender og nedløbsrør`);
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
                bArr.push(`Tillæg: Overordnet basis-pulje af timer afsat til tilbygning/kviste (bliver præciseret i endeligt tilbud)`);
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
                laborHours += initialInstallHours * 0.4;
                bArr.push(`Tillæg: Lodret montering (fx listebeklædning) kræver øget præcision og mere tidsforbrug`);
            }
            if (d.openings && parseInt(d.openings) > 0) {
                let count = parseInt(d.openings);
                laborHours += count * (formula.openingHours || 1.5);
                if (!userSuppliesMaterials) materialCost += count * (indexCat['Inddækning/Lister (pr åbning)'] || 400) * dbSettings.material_markup;
                bArr.push(`Tillæg: Udskæring og inddækning/lister omkring ${count} vinduer/døre`);
            }
            
            if (d.floors === '1½-plan / 2-plan / Mere') {
                materialCost += (indexCat['Tillæg: Facadestilladsleje'] || 12000) * dbSettings.material_markup; 
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
                if (!userSuppliesMaterials) materialCost += (indexCat['Tillæg: Vådrumspakke'] || 45000) * dbSettings.material_markup;
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
                laborHours += initialInstallHours * 0.5;
                let isoPris = indexCat['Tillæg: Isolering/værksted (pr m2)'] || 1200;
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
                let carportSadelPris = d.carportType === 'Dobbelt carport' ? 15000 : 8000;
                if (!userSuppliesMaterials) materialCost += (numericAmount * carportSadelPris) * dbSettings.material_markup;
                bArr.push(`Tillæg: Sadel tag med rejsning i stedet for simpelt fladt tag`);
            }

            if (d.disposal && d.disposal.startsWith('Ja') && d.oldMaterial) {
                if (d.oldMaterial.includes('Eternit')) {
                    laborHours += numericAmount * 4.0;
                    if (!userSuppliesMaterials) materialCost += (numericAmount * 1000) * dbSettings.material_markup;
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

            if (d.carportType === 'Dobbelt carport') {
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
    } 

    if(d.notes && d.notes.trim() !== "") {
        bArr.push(`Beregningen er standard - Jeg tjekker dine personlige noter før et tilbud gives.`);
    }

    // --- OPTIMIZATION 3: MINIMUM TIME BOUNDARY ---
    if (laborHours < 4) {
        bArr.push(`Minimumsfakturering på 4 arbejdstimer (En halv arbejdsdag) er anvendt, da opgaven var meget lille.`);
        laborHours = 4;
    }

    let totalLaborCost = laborHours * dbSettings.hourly_rate;
    
    const companyFullAddress = carpenter?.address || '';
    const customerFullAddress = `${customerDetails.street || ''}, ${customerDetails.zip || ''} ${customerDetails.city || ''}`;
    
    const { km, hours } = await fetchGoogleDistance(companyFullAddress, customerFullAddress);
    
    let totalDriving = 0;
    let drivingMaterialCost = 0;
    let drivingLaborCost = 0;
    let drivingHoursBilled = 0;

    if (dbSettings.driving_calc_method === 'timer') {
        const exactHoursRoundTrip = hours * 2;
        drivingHoursBilled = Math.max(1, Math.ceil(exactHoursRoundTrip)); 
        drivingLaborCost = drivingHoursBilled * dbSettings.hourly_rate;
        
        bArr.push(`Kørsel & Logistik (${companyFullAddress.split(',')[0]} ➜ Kundens adresse): ${km.toFixed(1)} km hver vej.`);
        bArr.push(`Transport faktureres som ren timepris: ${drivingHoursBilled} time(r) á ${dbSettings.hourly_rate} kr. i alt: ${drivingLaborCost.toFixed(0)} kr`);
        
        laborHours += drivingHoursBilled;
        totalLaborCost += drivingLaborCost;
        totalDriving = 0; 
    } else {
        drivingMaterialCost = (km * 2) * (dbSettings.vehicle_cost_per_km || 3.8); 
        drivingLaborCost = (hours * 2) * dbSettings.hourly_rate; 
        totalDriving = drivingMaterialCost + drivingLaborCost;
        
        bArr.push(`Kørsel & Logistik (${companyFullAddress.split(',')[0]} ➜ Kundens adresse): ${km.toFixed(1)} km hver vej.`);
        bArr.push(`Slitage-takst (bil) samt lukkede timer under transport udregnet til i alt: ${totalDriving.toFixed(0)} kr`);
    }

    const strictPrice = totalLaborCost + materialCost + totalDriving;
    const marginFactor = 1.25; 
    const priceTop = strictPrice * marginFactor;

    let minPrice = Math.floor(strictPrice / 1000) * 1000;
    let maxPrice = Math.ceil(priceTop / 1000) * 1000;
    
    minPrice = minPrice * 1.25;
    maxPrice = maxPrice * 1.25;
    
    const fmtMin = new Intl.NumberFormat('da-DK').format(minPrice);
    const fmtMax = new Intl.NumberFormat('da-DK').format(maxPrice);

    return {
        priceRange: `${fmtMin} - ${fmtMax} kr. inkl. moms`,
        breakdownArr: bArr,
        calcData: {
            laborHours: Math.ceil(laborHours),
            hourlyRate: dbSettings.hourly_rate,
            totalLaborCost: Math.ceil(totalLaborCost),
            materialCost: Math.ceil(materialCost),
            drivingCost: Math.ceil(totalDriving),
            strictPrice: Math.ceil(strictPrice)
        }
    };
};
