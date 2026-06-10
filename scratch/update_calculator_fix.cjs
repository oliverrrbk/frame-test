const fs = require('fs');
const path = require('path');

const calcPath = path.join(__dirname, '../src/utils/calculator.js');
let content = fs.readFileSync(calcPath, 'utf8');

const oldLogic = `                // Detaljeret Loft-opgaver logik (Etape 1.5)
                const isInsulation = d.atticSubTask && (d.atticSubTask.includes('Både efterisolering') || d.atticSubTask.includes('Kun efterisolering'));
                const isWalkway = d.atticSubTask && (d.atticSubTask.includes('Både efterisolering') || d.atticSubTask.includes('Kun etablering af gangbro'));

                if (isInsulation && d.insulationAmount && !d.insulationAmount.includes('Ingen')) {
                    let insulHours = formula.insulationHours || 0.2;
                    let insulPrice = indexCat['Isolering (50-100mm)'] || 85;
                    
                    if (d.insulationAmount.includes('200')) {
                        insulHours = 0.3;
                        insulPrice = 170;
                    } else if (d.insulationAmount.includes('300')) {
                        insulHours = 0.4;
                        insulPrice = 250;
                    } else if (d.insulationAmount.includes('Ved ikke')) {
                        insulHours = 0.3;
                        insulPrice = 170; // Fallback til 200mm hvis tømreren skal vurdere det
                    }

                    laborHours += numericAmount * insulHours;
                    
                    if (!userSuppliesMaterials) {
                        materialCost += (numericAmount * insulPrice) * dbSettings.material_markup;
                    }
                    bArr.push(\`Efterisolering: Udlægning af \${d.insulationAmount} ekstra isolering på loftet (anvendt på grundplan: \${numericAmount} m2)\`);
                }

                if (isInsulation && d.ventilationPlates && d.ventilationPlates.includes('Ja')) {
                    const perimeterMeters = Math.round(4.08 * Math.sqrt(Math.max(1, numericAmount)));
                    laborHours += perimeterMeters * (formula.ventilationPlatesHours || 0.4);
                    if (!userSuppliesMaterials) {
                        materialCost += perimeterMeters * (indexCat['Vindplader (pr m)'] || 65) * dbSettings.material_markup;
                    }
                    bArr.push(\`Vindplader: Etablering af vindplader ved tagfoden for korrekt ventilation (\${perimeterMeters} løbende meter)\`);
                }

                if (isWalkway) {
                    if (d.removeOldWalkway && d.removeOldWalkway.includes('Ja')) {
                        laborHours += numericAmount * (formula.disposalWalkwayHours || 0.15); // Gæt på timer pr m2 grundplan for at fjerne gangbro
                        // Tilføjer et lille bortskaffelsesgebyr
                        materialCost += 1500; 
                        bArr.push(\`Nedbrydning: Fjernelse og bortskaffelse af eksisterende gangbro/gulv inkluderet\`);
                    }`;

const newLogic = `                // Detaljeret Loft-opgaver logik (Etape 1.5)
                const isInsulation = d.atticSubTask && (d.atticSubTask.includes('Både efterisolering') || d.atticSubTask.includes('Kun efterisolering'));
                const isWalkway = d.atticSubTask && (d.atticSubTask.includes('Både efterisolering') || d.atticSubTask.includes('Kun etablering af gangbro'));

                // VIGTIGT: For loftopgaver bruger vi roofGrundplanM2 (rent bebygget areal uden taghældning/udhæng)
                const floorArea = (typeof roofGrundplanM2 !== 'undefined' ? roofGrundplanM2 : numericAmount);

                if (isInsulation && d.insulationAmount && !d.insulationAmount.includes('Ingen')) {
                    let insulHours = formula.insulationHours || 0.2;
                    let insulPrice = indexCat['Isolering (50-100mm)'] || 85;
                    
                    if (d.insulationAmount.includes('200')) {
                        insulHours = 0.3;
                        insulPrice = 170;
                    } else if (d.insulationAmount.includes('300')) {
                        insulHours = 0.4;
                        insulPrice = 250;
                    } else if (d.insulationAmount.includes('Ved ikke')) {
                        insulHours = 0.3;
                        insulPrice = 170; // Fallback til 200mm hvis tømreren skal vurdere det
                    }

                    laborHours += floorArea * insulHours;
                    
                    if (!userSuppliesMaterials) {
                        materialCost += (floorArea * insulPrice) * dbSettings.material_markup;
                    }
                    bArr.push(\`Efterisolering: Udlægning af \${d.insulationAmount} ekstra isolering på loftet (anvendt på grundplan: \${floorArea.toFixed(1)} m2)\`);
                }

                if (isInsulation && d.ventilationPlates && d.ventilationPlates.includes('Ja')) {
                    const perimeterMeters = Math.round(4.08 * Math.sqrt(Math.max(1, floorArea)));
                    laborHours += perimeterMeters * (formula.ventilationPlatesHours || 0.4);
                    if (!userSuppliesMaterials) {
                        materialCost += perimeterMeters * (indexCat['Vindplader (pr m)'] || 65) * dbSettings.material_markup;
                    }
                    bArr.push(\`Vindplader: Etablering af vindplader ved tagfoden for korrekt ventilation (\${perimeterMeters} løbende meter)\`);
                }

                if (isWalkway) {
                    if (d.removeOldWalkway && d.removeOldWalkway.includes('Ja')) {
                        laborHours += floorArea * (formula.disposalWalkwayHours || 0.15); // Gæt på timer pr m2 grundplan for at fjerne gangbro
                        // Tilføjer et lille bortskaffelsesgebyr
                        materialCost += 1500; 
                        bArr.push(\`Nedbrydning: Fjernelse og bortskaffelse af eksisterende gangbro/gulv inkluderet\`);
                    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(calcPath, content, 'utf8');
console.log('Successfully fixed numericAmount -> floorArea!');
