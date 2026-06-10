const fs = require('fs');
const path = require('path');

const calcPath = path.join(__dirname, '../src/utils/calculator.js');
let content = fs.readFileSync(calcPath, 'utf8');

// Replace the string
content = content.replace(/Kun efterisolering og\/eller etablering af gangbro på eksisterende loft/g, 'Loft-opgaver (Efterisolering & Gangbro)');

const oldLogic = `                // Kun efterisolering og gangbro logik
                if (d.insulationOnlyAmount && d.insulationOnlyAmount !== 'Ingen (Kun gangbro)') {
                    let insulHours = formula.insulationHours || 0.2;
                    let insulPrice = indexCat['Isolering (50-100mm)'] || 85;
                    
                    if (d.insulationOnlyAmount.includes('200')) {
                        insulHours = 0.3;
                        insulPrice = 170;
                    } else if (d.insulationOnlyAmount.includes('300')) {
                        insulHours = 0.4;
                        insulPrice = 250;
                    }

                    laborHours += numericAmount * insulHours;
                    
                    if (!userSuppliesMaterials) {
                        materialCost += (numericAmount * insulPrice) * dbSettings.material_markup;
                    }
                    bArr.push(\`Efterisolering: Udlægning af \${d.insulationOnlyAmount} ekstra isolering på loftet (anvendt på grundplan: \${numericAmount} m2)\`);
                }

                if (d.insulationWalkway && d.insulationWalkway.startsWith('Ja')) {
                    let walkwayM2 = d.insulationWalkway.includes('stor') ? 20 : 10;
                    laborHours += walkwayM2 * (formula.battenHours || 0.4) * 2; // Arbejdstid til opklodsning og gangbrædder
                    
                    if (!userSuppliesMaterials) {
                        let walkwayPrice = indexCat['Forskalling'] ? (indexCat['Forskalling'] * 3) : 150; // Skønnet m2-pris for brædder/spånplader til gangbro
                        materialCost += (walkwayM2 * walkwayPrice) * dbSettings.material_markup;
                    }
                    bArr.push(\`Gangbro: Etablering/hævning af \${walkwayM2} m2 gangbro på loftet\`);
                }`;

const newLogic = `                // Detaljeret Loft-opgaver logik (Etape 1.5)
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
                    }

                    const walkwayM2 = parseFloat(d.walkwayM2) || 0;
                    if (walkwayM2 > 0) {
                        laborHours += walkwayM2 * (formula.battenHours || 0.4) * 2; // Arbejdstid til opklodsning og gangbrædder
                        if (!userSuppliesMaterials) {
                            let walkwayPrice = indexCat['Forskalling'] ? (indexCat['Forskalling'] * 3) : 150; // Skønnet m2-pris for brædder/spånplader til gangbro
                            materialCost += (walkwayM2 * walkwayPrice) * dbSettings.material_markup;
                        }
                        bArr.push(\`Gangbro: Opbygning/hævning af \${walkwayM2} m2 ny gangbro på loftet\`);
                    }
                }

                if (d.newAtticHatch === 'Ja') {
                    laborHours += 4.0; // Ca 4 timer til at skifte lem og tilpasse hul
                    if (!userSuppliesMaterials) {
                        materialCost += (indexCat['Isoleret loftlem (stk)'] || 3500) * dbSettings.material_markup;
                    }
                    bArr.push(\`Loftlem: Levering og montering af ny, isoleret loftlem inkl. foldestige\`);
                }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(calcPath, content, 'utf8');
console.log('Successfully updated calculator.js!');
