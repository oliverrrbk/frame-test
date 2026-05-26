import { QUESTIONS } from '../components/Wizard/questionsConfig.js';

export const generateTaskDescription = (category, details) => {
    if (!details || ['special', 'extensions', 'carport', 'kitchen'].includes(category)) return [];
    let tasks = [];
    
    let qty = details.amount || details.kvm || '';
    if (qty) qty = qty + ' ';

    if (category === 'windows') {
        // 1. Nedrivning / Bortskaffelse
        tasks.push('Afmontering og bortskaffelse af eksisterende vindueselementer');
        
        // 2. Klargøring / Underlag
        tasks.push('Klargøring af murhuller (false/sålbænke) og montering af fugtspærre');
        
        const obstacleWindowsCount = details.windowsConfig.reduce((acc, w) => acc + (w.obstacles ? (parseInt(w.count) || 1) : 0), 0);
        if (obstacleWindowsCount > 0) {
            tasks.push(`Klargøringstillæg ved ${obstacleWindowsCount} element(er) pga. begrænset plads/beplantning`);
        }
        
        // 3. Montering / Levering
        let typeStr = details.material || 'nye';
        let groupsStr = '';
        if (details.windowsConfig && Array.isArray(details.windowsConfig) && details.windowsConfig.length > 0) {
            groupsStr = ' fordelt på: ' + details.windowsConfig.map((w, idx) => {
                const count = w.count || 1;
                const wType = w.type === 'Standard' ? 'facadevindue' : w.type === 'Tagvindue' ? 'ovenlysvindue' : w.type === 'Panorama' ? 'panorama/gulv-til-loft' : 'skydedør/terrassedør';
                const openable = w.isOpenable !== false ? 'oplukkeligt' : 'fastkarm';
                const safety = w.safetyGlass ? ' med sikkerhedsglas' : '';
                const obstacles = w.obstacles ? ' (med adgangshindringer)' : '';
                return `${count}x ${wType} (${w.width}x${w.height} cm, ${openable}${safety}${obstacles})`;
            }).join(' + ');
        }
        tasks.push(`Levering og montering af ${details.amount || 'nye'} stk. BR18/DVV-godkendte ${typeStr} elementer${groupsStr}`);
        
        // 4. Finish
        if (details.finish && (details.finish.startsWith('Ja') || details.finish === 'yes' || details.finish === 'true' || details.finish === true)) {
            tasks.push('Komplet finish (ind-/udvendig): 3-lags tætning, isolering samt montering af fabriksmalede lister');
        } else {
            tasks.push('Udvendig tætning: Isolering af vinduesfals og elastisk fugning mod murværk');
        }
    }
    
    else if (category === 'doors') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Afmontering og bortskaffelse af eksisterende døre og karme');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Klargøring af dørhuller, opretning og montering af fugtspærre');
        
        // 3. Montering / Levering
        let doorStyleStr = details.doorStyle ? details.doorStyle.toLowerCase() : 'døre';
        if (details.doorType === 'Blanding') {
            tasks.push(`Levering og montering af ${details.exteriorAmount || 0} yderdør(e) og ${details.interiorAmount || 0} indvendige døre`);
        } else {
            tasks.push(`Levering og montering af ${details.amount || 1} stk. ${doorStyleStr} i ${details.material || 'standard'}`);
        }
        
        if (details.thresholds && details.thresholds.startsWith('Ja')) {
            tasks.push('Montering af slidstærke hårdttræs-bundstykker (eg/mahogni)');
        }
        if (details.hardware && details.hardware.includes('Standard')) {
            tasks.push('Montering af dørgreb, låsecylindre og tilhørende hardware');
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af gerigter, isolering og støjreducerende fugning');
    }

    else if (category === 'floor') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            let floorTypeStr = details.oldFloorType ? details.oldFloorType.toLowerCase() : 'gulv';
            tasks.push(`Nedbrydning og bortskaffelse af eksisterende ${floorTypeStr} og fodpaneler`);
        }
        
        // 2. Klargøring / Underlag
        let foundationText = '';
        if (details.floorFoundation === 'Beton / Støbt dæk') {
            foundationText = 'Opretning/slibning af betonundergulv samt underlag med dampspærre';
        } else if (details.floorFoundation === 'Strøer / Trækonstruktion') {
            foundationText = 'Opretning, nivellering og forstærkning af bjælkelag/strøer';
        } else {
            foundationText = 'Planheds-/fugtkontrol af undergulv samt trykfast underlag';
        }
        tasks.push(foundationText);
        
        if (details.underfloorHeating && details.underfloorHeating.includes('tømreren skal opbygge nyt gulvvarme')) {
            tasks.push('Opbygning af nyt tørt gulvvarmesystem med sporplader/varmefordelingsplader');
        } else if (details.underfloorHeating && details.underfloorHeating.includes('kun specialunderlag kræves')) {
            tasks.push('Udlægning af specialunderlag egnet til eksisterende gulvvarme');
        }

        // 3. Montering / Levering
        let patternStr = (details.floorPattern && details.floorPattern.includes('mønster')) ? ' lagt i specialmønster (Sildeben)' : '';
        tasks.push(`Levering og lægning af ${qty}m² ${details.material || 'gulvbelægning'}${patternStr}`);

        // 4. Finish
        const hasSkirting = (details.skirting && details.skirting.startsWith('Ja')) || 
                            (details.finish === 'yes' || details.finish === 'Ja' || details.finish === true);
        if (hasSkirting) {
            tasks.push('Afsluttende finish: Montering og geringsskæring af nye fodlister samt fugning');
        } else {
            tasks.push('Afsluttende finish og præcis tilpasning mod vægge og karme');
        }

        if (details.floorDoorsNear === 'Ja') {
            tasks.push(`Afkortning af ${details.floorDoorsCount || 1} indvendige døre i bunden`);
        }
    }

    else if (category === 'roof') {
        // 1. Nedrivning / Bortskaffelse
        let oldRoofStr = details.oldRoofType ? details.oldRoofType.toLowerCase() : 'tag';
        let asbText = '';
        if (oldRoofStr.includes('asbest') || oldRoofStr.includes('vides ikke')) {
            asbText = ' (inkl. asbestsanering og deponering efter gældende regler)';
        }
        tasks.push(`Forsvarlig nedtagning og bortskaffelse af eksisterende ${oldRoofStr}, lægter og tagrender${asbText}`);
        
        // 2. Klargøring / Underlag
        tasks.push('Gennemgang af spær, påforing samt efterisolering (200 mm)');
        tasks.push('Montering af undertag (diffusionsåbent eller fast) med klemlister');

        // 3. Montering / Levering
        tasks.push(`Levering og professionel oplægning af ${qty}m² nyt tag i ${details.material || 'tagmateriale'}`);
        
        const eavesMatStr = details.eavesMaterial ? ` i ${details.eavesMaterial.toLowerCase()}` : '';
        tasks.push(`Udskiftning af stern og underbeklædning${eavesMatStr}`);

        if (details.skotrender === 'Ja') {
            tasks.push(`Etablering og montering af ${details.skotrenderMeters || 0} meter zink-skotrender`);
        }
        if (details.roofType === 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)' && details.grater === 'Ja') {
            tasks.push(`Etablering og montering af ${details.graterMeters || 0} meter zink-grater`);
        }
        
        if (details.chimney && details.chimney.startsWith('Ja')) {
            tasks.push(`Etablering af bly- eller zinkinddækninger omkring ${details.chimneyAmount || 1} skorsten(e)`);
        }
        if (details.skylightReplace === 'Ja') {
            const replCount = parseInt(details.skylightReplaceAmount) || 0;
            if (replCount > 0) {
                tasks.push(`Udskiftning af ${replCount} eksisterende ovenlysvindue(r) (Velux) inkl. ny inddækning og undertagskrave`);
            }
        }
        if (details.skylightNew === 'Ja') {
            const newCount = parseInt(details.skylightNewAmount) || 0;
            if (newCount > 0) {
                tasks.push(`Nyetablering af ${newCount} ovenlysvindue(r) (Velux) inkl. tømrer-konstruktionsændring af spærlag (spærudveksling), undertagstilkobling og dampspærrekrave`);
            }
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af rygsten, vindskeder, tagrender og nedløb');
    }

    else if (category === 'kitchen') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Nedtagning og bortskaffelse af eksisterende køkken, bordplader og vask');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Opmåling, afsætning af modullinje og klargøring af væg/gulv');

        // 3. Montering / Levering
        if (details.ownMaterials && details.ownMaterials.startsWith('Ja')) {
            tasks.push(`Montering og tilpasning af ${qty}stk. køkkenelementer (kundens egne materialer)`);
        } else {
            tasks.push(`Levering, samling og montering af ${qty}stk. nye køkkenelementer`);
        }
        if (details.assembly && details.assembly.includes('Flat-pack')) {
            tasks.push('Komplet samling af flade kasser (skabe, skuffer og indmad)');
        }
        if (details.worktop && details.worktop.startsWith('Ja')) {
            tasks.push('Montering af bordplade med udskæring til vask og kogeplade');
        }
        if (details.integratedAppliances && details.integratedAppliances.startsWith('Ja')) {
            tasks.push('Montering af integrerede hvidevarer med fronter og greb');
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af dæksider, sokkel, tilpasninger og greb');
    }

    else if (category === 'terrace') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Nedbrydning og bortskaffelse af eksisterende terrasse');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Opmåling, terrænregulering og udlægning af ukrudtsdug');
        tasks.push('Udgravning og etablering af punktfundamenter i frostfri dybde');

        // 3. Montering / Levering
        tasks.push(`Opbygning af bjælkelag i trykimprægneret træ og montering af ${qty}m² ${details.material || 'terrassebrædder'}`);
        if (details.railing && details.railing.startsWith('Ja')) {
            tasks.push(`Opbygning af ${details.railingMeters || 'tilhørende'} meter rækværk (${(details.railingMaterial || 'træ rækværk').toLowerCase()})`);
        }
        if (details.awning && details.awning.startsWith('Ja')) {
            tasks.push(`Montering af ${details.awningType ? details.awningType.toLowerCase() : 'markise'} til overdækning`);
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Symmetrisk kantskæring og montering af dækbrædder');
    }

    else if (category === 'ceilings') {
        // 1. Nedrivning / Bortskaffelse
        const oldType = details.oldCeilingType && details.oldCeilingType !== 'Ved ikke' 
            ? `eksisterende ${details.oldCeilingType.toLowerCase()}` 
            : 'eksisterende loft';
        tasks.push(`Afmontering og bortskaffelse af ${oldType}`);
        
        // 2. Klargøring / Underlag
        const hasVapor = details.vaporAndInsulation && (
            details.vaporAndInsulation.includes('Koldt tagrum') ||
            details.vaporAndInsulation.includes('Ved ikke') ||
            details.vaporAndInsulation.includes('Uvist')
        );
        const hasIso = details.vaporAndInsulation && details.vaporAndInsulation.includes('Isolering');

        if (hasVapor) {
            if (hasIso) {
                tasks.push('Etablering af dampspærre samt efterisolering af loftkonstruktionen');
            } else {
                tasks.push('Opsætning og tætning af plast-dampspærre efter gældende regler');
            }
        }
        tasks.push('Nivellering og montering af ny forskalling');

        // 3. Montering / Levering
        tasks.push(`Levering og montering af ${qty}m² ${details.material || 'nyt loft'}`);

        // 4. Finish / Elektriker & Maler
        const plasterable = [
            'Gipsloft (standard 2-lag)',
            'Lydgipsloft (lyddæmpende gips)',
            'Fibergipsloft (Fermacel)',
            'Gipsloft'
        ];
        
        if (plasterable.includes(details.material)) {
            tasks.push('Malerarbejde: Komplet fuldspartling med armeringstape, filt og to gange maling (Maler altid inkluderet)');
        }

        const spotsAmount = parseInt(details.spotsAmount) || 0;
        if (details.spots === 'Ja' && spotsAmount > 0) {
            tasks.push(`Etablering af spots/lampesteder: Præcis opmåling og udskæring til ${spotsAmount} spots inkl. elektrikerforberedelse`);
        }

        if (details.material === 'Træloft (listeloft/paneler/rustikloft)' || details.material === 'Troldtekt (akustikloft)') {
            tasks.push('Afsluttende finish: Montering af skygge- eller dæklister langs vægge');
        }
    }

    else if (category === 'facades') {
        // 1. Nedrivning / Bortskaffelse
        if (details.oldFacadeMaterial && details.oldFacadeMaterial.includes('rives ned')) {
            tasks.push('Nedtagning og bortskaffelse af eksisterende facadebeklædning');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Opsætning af vindspærre og ventileret underkonstruktion med klemlister');
        if (details.oldFacadeMaterial && details.oldFacadeMaterial.includes('Mursten')) {
            tasks.push('Forboring og fastgørelse af underkonstruktion i eksisterende murværk/beton');
        }

        // 3. Montering / Levering
        let styleStr = details.mountingStyle ? ` (${details.mountingStyle.toLowerCase()})` : '';
        tasks.push(`Levering og montering af ${qty}m² facadebeklædning i ${details.material || 'træ'}${styleStr}`);
        if (details.openings && parseInt(details.openings) > 0) {
            tasks.push(`Etablering af lysninger og lister omkring ${details.openings} åbninger`);
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af hjørnelister, drypnæser samt stilladsopsætning');
    }

    else if (category === 'fence') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Nedtagning af det gamle hegn og opgravning af fundamenter inkl. bortskaffelse');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Opmåling, snorlige linjeføring og nivellering af terræn');
        tasks.push('Støbning af stolper i tørbeton til frostfri dybde (ca. 90 cm)');

        // 3. Montering / Levering
        tasks.push(`Levering og opsætning af ${qty} m hegn i ${details.material || 'træ/komposit'} (højde: ${details.fenceHeight || 'standard'})`);

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af stolpehatte/afdækninger og bundbrædder');
    }

    else if (category === 'carport') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Nedrivning og bortskaffelse af eksisterende carport/skur');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Opmåling, afsætning af stolper og udgravning til fundamenter');
        tasks.push('Etablering af solide punktfundamenter støbt i frostfri dybde');

        // 3. Montering / Levering
        let typeStr = details.carportType ? details.carportType.split(' (')[0] : 'carport';
        tasks.push(`Levering og opbygning af ${typeStr.toLowerCase()} i ${details.material || 'træ'} med bjælkespær`);
        if (details.roofType) {
            tasks.push(`Montering af tagkonstruktion og tagplader/trapeztag: ${details.roofType.split(' (')[0]}`);
        }
        if (details.shedType && details.shedType !== 'Nej') {
            tasks.push(`Opbygning af integreret redskabsskur (${details.shedType.toLowerCase()})`);
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Montering af sternbrædder, vindskeder, tagrender og nedløbsrør');
    }

    else if (category === 'annex') {
        // 1. Nedrivning / Bortskaffelse
        if (details.disposal && details.disposal.startsWith('Ja')) {
            tasks.push('Nedrivning og bortskaffelse af eksisterende skur/anneks');
        }
        
        // 2. Klargøring / Underlag
        tasks.push('Terrænregulering og etablering af punkt- eller skruefundamenter');
        tasks.push('Opbygning af isoleret bjælkelag with undergulv (sporplader)');

        // 3. Montering / Levering
        let annexTypeStr = details.annexType ? details.annexType.toLowerCase() : 'skur/anneks';
        tasks.push(`Levering og opbygning af ${qty}m² ${annexTypeStr} i ${details.material || 'træ'}`);
        if (details.roofType) {
            tasks.push(`Montering af tagkonstruktion med ${details.roofType.split(' (')[0].toLowerCase()} og undertag`);
        }
        if (details.annexType && details.annexType.includes('Isoleret')) {
            tasks.push('Etablering af 100-150 mm isolering i gulv, væg og loft samt dampspærre');
        } else if (details.annexType && details.annexType.includes('beboeligt')) {
            tasks.push('Komplet BR18-isolering (vinterisoleret), dampspærre og indvendig beklædning');
        }

        // 4. Finish
        tasks.push('Afsluttende finish: Stern, vindskeder og indvendige gerigter omkring åbninger');
    }
    
    // 5. Kørsel og Oprydning (Standard på tværs af alle beregnede fag)
    tasks.push('Kørsel, logistik, professionelt værktøj samt løbende og afsluttende oprydning (vi efterlader altid dit hjem pænt og ryddeligt)');
    return tasks;
};

export const generateTaskAndQaHtml = (projectData, includeBreakdownForCarpenter = false) => {
    if (!projectData) return '';
    const { category, details } = projectData;
    
    if (category === 'special' || category === 'extensions' || category === 'carport' || category === 'kitchen') {
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
                        <strong style="display: block; color: #b45309; margin-bottom: 8px; font-size: 16px;">OBS / Særlige Forbehold:</strong>
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

    if (category === 'roof' && includeBreakdownForCarpenter) {
        finalHtml += `
            <div style="background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                <strong style="display: block; color: #b45309; margin-bottom: 8px; font-size: 16px;">OBS TIL MESTER (Stilladsovervejelser):</strong>
                <span style="color: #92400e; line-height: 1.6; font-size: 14px; display: block;">
                    Overvej om opgaven kræver stillads med totaloverdækning (tag over tag) for at beskytte mod vejrliget under nedrivningen og genopbygningen.
                </span>
            </div>
        `;
    }

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
                displayValue = value.map(v => `${v.count || 1}x ${v.type || 'Standard'} (${v.width}x${v.height} cm)${v.isOpenable === false ? ' (fastkarm)' : ''}${v.safetyGlass ? ' (sikkerhedsglas)' : ''}${v.hasSlidingDoor ? ' (m. skydedør)' : ''}`).join(', ');
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
