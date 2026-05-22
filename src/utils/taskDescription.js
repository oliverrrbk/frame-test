import { QUESTIONS } from '../components/Wizard/questionsConfig';

export const generateTaskDescription = (category, details) => {
    if (!details || ['special', 'extensions'].includes(category)) return [];
    let tasks = [];
    
    // 1. Nedrivning / Bortskaffelse
    if (details.disposal && details.disposal.startsWith('Ja')) {
        let text = 'Afmontering af eksisterende';
        if (category === 'floor') text += ' gulv';
        else if (category === 'roof') text += ' tag';
        else if (category === 'windows') text += ' vinduer/døre';
        else if (category === 'kitchen') text += ' køkken';
        else if (category === 'terrace') text += ' terrasse';
        else if (category === 'doors') text += ' døre';
        else if (category === 'ceilings') text += ' loft';
        else if (category === 'facades') text += ' beklædning';
        else if (category === 'fence') text = 'Nedtagning af eksisterende hegn';
        else if (category === 'carport') text = 'Nedrivning af eksisterende carport';
        else if (category === 'annex') text = 'Nedrivning af eksisterende skur/anneks';
        
        if (details.disposal.toLowerCase().includes('bortskaffe')) {
            text += ' inkl. miljøgebyr, bortskaffelse og kørsel til genbrugsplads';
        } else {
            text += ' (Kunden står selv for bortskaffelse)';
        }
        tasks.push(text);
    } else if (details.disposal && details.disposal.includes('rives ned')) {
         let text = 'Nedrivning af eksisterende konstruktion';
         if (details.disposal.toLowerCase().includes('bortskaffe')) {
            text += ' inkl. miljøgebyr og bortskaffelse';
         } else {
            text += ' (Kunden står selv for bortskaffelse)';
         }
         tasks.push(text);
    }
    
    // 2. Klargøring / Underlag
    if (category === 'floor') {
        if (details.underfloorHeating && details.underfloorHeating.includes('tømreren skal opbygge nyt gulvvarme')) {
            tasks.push('Opbygning af nyt gulvvarme-system (sporplader/varmefordeling)');
        } else if (details.underfloorHeating && details.underfloorHeating.includes('kun specialunderlag kræves')) {
            tasks.push('Udlægning af specialunderlag egnet til eksisterende gulvvarme');
        }

        if (details.material === 'Massivt træ' && details.floorFoundation === 'Strøer / Trækonstruktion') {
            tasks.push('Opklodsning og nivellering af strøer før montering af gulv');
        } else {
            tasks.push('Opretning af undergulv og udlægning af trinlydsdæmpende underlag (foam/pap)');
        }
    } else if (category === 'roof') {
        if (details.insulation && details.insulation.includes('200mm')) {
            tasks.push('Gennemgang af spær samt efterisolering (ca. 200mm) udefra');
        } else {
            tasks.push('Gennemgang og klargøring af eksisterende spær/lægter');
        }
    } else if (category === 'ceilings') {
        if (details.vaporAndInsulation && details.vaporAndInsulation.includes('Dampspærre + Isolering')) {
            tasks.push('Opsætning af ny dampspærre samt efterisolering af loft');
        } else if (details.vaporAndInsulation && details.vaporAndInsulation.includes('plast-dampspærre')) {
            tasks.push('Lovpligtig opsætning af tæt dampspærre (plastdug)');
        } else {
            tasks.push('Klargøring af eksisterende underlag/forskalling');
        }
    } else if (category === 'fence') {
        tasks.push('Opmåling, afsætning af linjeføring og nivellering af terræn');
        tasks.push('Nedgravning og støbning af stolper med stabiliserende tørbeton i korrekt frostfri dybde');
    } else if (category === 'carport') {
        tasks.push('Opmåling, afsætning og udgravning til punktfundamenter');
        tasks.push('Etablering af punktfundamenter (støbning af stolper i frostfri dybde)');
    } else if (category === 'annex') {
        tasks.push('Udgravning, afretning af jord og etablering af punktfundamenter/skruefundamenter');
        tasks.push('Opbygning af solidt, isoleret bjælkelag og stabil bundramme');
    }
    
    // 3. Montering / Levering
    let qty = details.amount || details.kvm || '';
    if (qty) qty = qty + ' ';
    
    if (category === 'floor') {
        let patternStr = (details.floorPattern && details.floorPattern.includes('mønster')) ? ' i specialmønster' : '';
        tasks.push(`Levering og professionel montering af ${qty}m² ${details.material || 'nyt gulv'}${patternStr}`);
    } else if (category === 'windows') {
        let typeStr = details.material || 'nye';
        if (details.twoTone && details.twoTone.includes('2-farvede')) typeStr += ' 2-farvede';
        tasks.push(`Levering og isætning af ${details.amount || 'nye'} elementer (${typeStr}) efter gældende standarder`);
    } else if (category === 'roof') {
        tasks.push(`Levering og montering af ${qty}m² ${details.material || 'nyt tag'}`);
    } else if (category === 'doors') {
        if (details.doorType === 'Blanding') {
            tasks.push(`Montering og justering af ${details.exteriorAmount || 0} yderdør(e) og ${details.interiorAmount || 0} indvendig(e) dør(e)`);
        } else {
            tasks.push(`Montering og justering af ${details.amount || 'nye'} døre (${details.material || details.doorType || 'Standard'})`);
        }
        if (details.thresholds && details.thresholds.startsWith('Ja')) {
            tasks.push('Tilpasning og montering af nye dørtrin (bundstykker)');
        }
        if (details.hardware && details.hardware.includes('Standard')) {
            tasks.push('Montering af standard dørgreb og låse');
        }
    } else if (category === 'kitchen') {
        if (details.ownMaterials && details.ownMaterials.startsWith('Ja')) {
            tasks.push(`Montering, samling og tilpasning af ${qty}køkkenelementer (kunden har selv indkøbt materialer)`);
        } else {
            tasks.push(`Levering, samling og montering af ${qty}nye køkkenelementer i vater`);
        }
        if (details.assembly && details.assembly.includes('Flat-pack')) {
            tasks.push('Samling af flade kasser (skabe og skuffer)');
        }
    } else if (category === 'terrace') {
        let typeStr = details.elevation || 'terrasse';
        tasks.push(`Opbygning af bærende konstruktion og lægning af ${qty}m² ${details.material || 'brædder'} (${typeStr})`);
        if (details.fastening && details.fastening.includes('Skjult')) {
            tasks.push('Udført med skjult montering (uden synlige skruehuller i overfladen)');
        }
        if (details.railing && details.railing.startsWith('Ja')) {
            tasks.push(`Opbygning af ${details.railingMeters || 'tilhørende'} meter rækværk/gelænder`);
        }
        if (details.roofing && details.roofing.startsWith('Ja')) {
            tasks.push(`Etablering af overdækning/tag over ${details.roofingAmount || ''} m² (${details.roofingType || 'Tag'})`);
        }
    } else if (category === 'ceilings') {
        tasks.push(`Opsætning af ${qty}m² ${details.material || 'nyt loft'} inkl. tilpasninger`);
    } else if (category === 'facades') {
        tasks.push(`Montering af ${qty}m² ${details.material || 'ny facadebeklædning'}`);
    } else if (category === 'fence') {
        let mat = details.material || 'nyt hegn';
        tasks.push(`Levering og professionel opsætning af ${qty}løbende meter ${mat.toLowerCase()}`);
        if (details.fenceHeight) {
            tasks.push(`Opbygning af hegn i højde: ${details.fenceHeight.toLowerCase()}`);
        }
    } else if (category === 'carport') {
        let typeStr = details.carportType ? details.carportType.split(' (')[0] : 'carport';
        let mat = details.material || 'træ';
        let count = details.amount && !isNaN(details.amount) ? details.amount : 1;
        let countStr = count > 1 ? `${count}x ` : '';
        tasks.push(`Levering og professionel tømreropbygning af ${countStr}${typeStr.toLowerCase()} i premium ${mat.toLowerCase()}`);
        
        if (details.roofType) {
            let roof = details.roofType.split(' (')[0];
            tasks.push(`Etablering af solid tagkonstruktion: ${roof}`);
        }
        
        if (details.shedType && details.shedType !== 'Nej') {
            tasks.push(`Opbygning af integreret redskabsskur (${details.shedType.toLowerCase()})`);
        }
    } else if (category === 'annex') {
        let typeStr = details.annexType ? details.annexType.toLowerCase() : 'skur/anneks';
        let mat = details.material || 'træ';
        tasks.push(`Levering og professionel opbygning af ${qty}m² ${typeStr} med facadebeklædning i ${mat.toLowerCase()}`);
        
        if (details.roofType) {
            let roof = details.roofType.split(' (')[0];
            tasks.push(`Etablering af tagkonstruktion med ${roof.toLowerCase()}`);
        }
    }
    
    // 4. Finish
    if (category === 'floor') {
        const hasSkirting = (details.skirting && details.skirting.startsWith('Ja')) || 
                            (details.finish === 'yes' || details.finish === 'Ja' || details.finish === true);
        if (hasSkirting) {
            tasks.push('Komplet indvendig kvalitetsfinish med levering, præcis tilpasning og montering af nye fodlister samt professionelt fugearbejde');
        } else {
            tasks.push('Kvalitetsfinish af gulvfladen med nøjagtig tilpasning (ekskl. montering af fodlister jf. valg)');
        }
    } else if (category === 'windows') {
        if (details.finish && (details.finish.startsWith('Ja') || details.finish === 'yes' || details.finish === 'true' || details.finish === true)) {
            tasks.push('Komplet kvalitetsfinish (professionel ind- og udvendig fugning, grundig isolering samt præcis montering af indvendige lister/gerigter for et fejlfrit resultat)');
        } else {
            tasks.push('Professionel udvendig finish (komplet isolering, elastisk fugearbejde og vejrbestandig tætning — ekskl. indvendige lister og fuge)');
        }
    } else if (category === 'doors') {
        tasks.push('Komplet kvalitetsfinish (professionel montering af indvendige gerigter/lister, grundig isolering samt præcis ind- og udvendig fugning for et perfekt resultat)');
    } else if (category === 'roof') {
        if (details.eaves && details.eaves.startsWith('Ja')) {
            tasks.push('Udskiftning af træværk og montering af ny stern og udhæng');
        }
        if (details.chimney && details.chimney.startsWith('Ja')) {
            tasks.push(`Bly/zink inddækning af ${details.chimneyAmount || 1} skorsten(e)`);
        }
        if (details.skylights && details.skylights.startsWith('Ja')) {
            tasks.push(`Montering af ${details.skylightAmount || 1} nye ovenlysvinduer`);
        }
        tasks.push('Færdiggørelse med rygning, vindskeder og nødvendige inddækninger');
    } else if (category === 'kitchen') {
        if (details.worktop && details.worktop.startsWith('Ja')) {
            tasks.push('Tilpasning, udskæring og montering af træ/laminat bordplade');
        }
        if (details.integratedAppliances && details.integratedAppliances.startsWith('Ja')) {
            tasks.push('Finjustering og montering af træfronter på integrerede hvidevarer');
        }
        tasks.push('Montering af paneler, greb og finish-lister (bemærk: ekskl. VVS/EL-tilslutning)');
    } else if (category === 'fence') {
        tasks.push('Komplet finish med montering af stolpehatte og evt. afsluttende dækskinner');
        if (details.material && details.material.includes('Træ')) {
            tasks.push('Afsluttende tilpasning og finpudsning af trækonstruktionen');
        }
    } else if (category === 'carport') {
        tasks.push('Montering af vindskeder, sternbrædder samt tagrender/afløb jf. aftale');
        if (details.shedType && details.shedType.includes('isoleret')) {
            tasks.push('Montering af isolering, dampspærre og indvendig beklædning i skurdel');
        }
        tasks.push('Afsluttende dæklister og komplet tømrerfinish');
    } else if (category === 'annex') {
        if (details.annexType && details.annexType.includes('Isoleret')) {
            tasks.push('Etablering af 100-150mm isolering i gulv, vægge og loft samt dampspærre');
        } else if (details.annexType && details.annexType.includes('beboeligt')) {
            tasks.push('Komplet isolering efter BR18 (vinterisoleret), dampspærre samt indvendig beklædning (gips/træ)');
        }
        tasks.push('Montering af sternbrædder, vindskeder, døre, vinduer og afsluttende dæklister');
    }
    
    // 5. Kørsel og Oprydning
    tasks.push('Kørsel til og fra adressen, anvendelse af professionelt tømrerværktøj samt komplet oprydning og pæn aflevering af arbejdsområdet');
    
    return tasks;
};

export const generateTaskAndQaHtml = (projectData, includeBreakdownForCarpenter = false) => {
    if (!projectData) return '';
    const { category, details } = projectData;
    
    if (category === 'special' || category === 'extensions') {
        let aiHtml = '';

        if (details?.aiBreakdown && details.aiBreakdown.length > 0) {
            if (includeBreakdownForCarpenter) {
                aiHtml += `
                    <div style="background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; padding: 24px; margin-bottom: 24px;">
                        <strong style="display: block; color: #166534; font-size: 18px; margin-bottom: 16px;">Systemets Udregning / Opgavedele (KUN TIL TØMRER):</strong>
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 15px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #bbf7d0; color: #166534;">
                                    <th style="padding: 8px 4px;">Opgavedel</th>
                                    <th style="padding: 8px 4px; text-align: right;">Timer</th>
                                    <th style="padding: 8px 4px; text-align: right;">Materialer</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${details.aiBreakdown.map(item => `
                                    <tr style="border-bottom: 1px solid #e2e8f0; color: #334155;">
                                        <td style="padding: 8px 4px; font-weight: 500;">${item.item}</td>
                                        <td style="padding: 8px 4px; text-align: right;">${item.hours} t</td>
                                        <td style="padding: 8px 4px; text-align: right;">${item.materials.toLocaleString('da-DK')} kr.</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                aiHtml += `
                    <div style="background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; padding: 24px; margin-bottom: 24px;">
                        <strong style="display: block; color: #166534; font-size: 18px; margin-bottom: 16px;">Overslaget inkluderer:</strong>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            ${details.aiBreakdown.map(t => `
                                <li style="display: flex; align-items: flex-start; margin-bottom: 12px; color: #166534; line-height: 1.5;">
                                    <span style="color: #22c55e; margin-right: 12px; font-weight: bold;">✓</span>
                                    <span>${t.item}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        if (details?.summaryBullets && details.summaryBullets.length > 0) {
            const summaryTitle = includeBreakdownForCarpenter 
                ? 'Opsummering af kundens ønsker:' 
                : 'Opsummering af dine ønsker:';

            aiHtml += `
                <div style="background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
                    <strong style="display: block; color: #0f172a; margin-bottom: 12px; font-size: 16px;">${summaryTitle}</strong>
                    <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.6;">
                        ${details.summaryBullets.map(b => `<li style="margin-bottom: 8px;">${b}</li>`).join('')}
                    </ul>
                </div>
            `;
            if (includeBreakdownForCarpenter && details?.obsNotes && details.obsNotes.toLowerCase() !== 'ingen særlige forbehold') {
                aiHtml += `
                    <div style="background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                        <strong style="display: block; color: #b45309; margin-bottom: 8px; font-size: 16px;">⚠️ OBS / Særlige Forbehold:</strong>
                        <span style="color: #92400e; line-height: 1.6;">${details.obsNotes}</span>
                    </div>
                `;
            }
        } else {
            aiHtml += `
                <div style="background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
                    <strong style="display: block; color: #0f172a; margin-bottom: 8px; font-size: 16px;">Opsummering af projektet:</strong>
                    <span style="color: #334155; line-height: 1.6;">${details?.aiProjectTitle || 'Specialopgave'}</span>
                </div>
            `;
        }

        return aiHtml;
    }

    let finalHtml = '';

    // Task List Section
    const taskList = generateTaskDescription(category, details);
    if (taskList.length > 0) {
        finalHtml += `
            <div style="background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; padding: 24px; margin-bottom: 24px;">
                <strong style="display: block; color: #166534; font-size: 18px; margin-bottom: 16px;">Overslaget inkluderer:</strong>
                <ul style="margin: 0; padding: 0; list-style: none;">
                    ${taskList.map(t => `
                        <li style="display: flex; align-items: flex-start; margin-bottom: 12px; color: #166534; line-height: 1.5;">
                            <span style="color: #22c55e; margin-right: 12px; font-weight: bold;">✓</span>
                            <span>${t}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // Q&A Section
    const categoryQuestions = QUESTIONS[category] || [];
    const qaItemsHtml = Object.entries(details || {})
        .map(([key, value]) => {
            const question = categoryQuestions.find(q => q.id === key);
            if (!question || value === undefined || value === null || value === '') return '';
            if (question.type === 'file') return '';
            
            let displayValue = value;
            if (question.type === 'window_configurator' && Array.isArray(value)) {
                displayValue = value.map(v => `${v.type || 'Standard'} (${v.width}x${v.height} cm)`).join(', ');
            } else if (typeof value === 'boolean') {
                displayValue = value ? 'Ja' : 'Nej';
            }

            return `
                <li style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="display: block; color: #475569; margin-bottom: 4px; font-size: 14px;">${question.label}</strong>
                    <span style="color: #0f172a; white-space: pre-wrap; font-weight: 500;">${displayValue}</span>
                </li>
            `;
        })
        .join('');

    if (qaItemsHtml) {
        finalHtml += `
            <div style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 24px;">
                <strong style="display: block; color: #0f172a; font-size: 18px; margin-bottom: 20px;">Dine indtastede valg:</strong>
                <ul style="margin: 0; padding: 0; list-style: none;">
                    ${qaItemsHtml}
                </ul>
            </div>
        `;
    }

    return finalHtml;
};
