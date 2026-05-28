export const generateMaterialList = (category, details = {}, amount = 0) => {
    let list = [];
    const numAmount = parseFloat(amount) || 0;

    // Oversæt eventuelle danske kategorinavne fra databasen til engelske switch-keys
    const categoryMap = {
        'Nyt Gulv': 'floor',
        'Gulv': 'floor',
        'Nye Vinduer': 'windows',
        'Vinduer': 'windows',
        'Nye Døre': 'doors',
        'Døre': 'doors',
        'Træterrasse': 'terrace',
        'Terrasse': 'terrace',
        'Tagprojekt': 'roof',
        'Tag': 'roof',
        'Nyt Køkken': 'kitchen',
        'Køkken': 'kitchen',
        'Nye Lofter': 'ceilings',
        'Lofter': 'ceilings',
        'Ny Facadebeklædning': 'facades',
        'Facader': 'facades',
        'Tilbygning': 'extensions',
        'Anneks': 'annex',
        'Annekser & Skure': 'annex',
        'Carport': 'carport',
        'Hegn': 'fence'
    };

    const activeCategory = categoryMap[category] || category;

    // Hvis det er et kombi-projekt, hente underprojekter og aggregere dem
    if (activeCategory === 'Kombi-projekt' || details.isKombi) {
        const combinedList = [];
        const projects = details.projects || [];
        
        if (Array.isArray(projects) && projects.length > 0) {
            projects.forEach(p => {
                const subQty = p.details?.amount || p.details?.area || p.details?.qty || p.details?.amountVal || 0;
                const subList = generateMaterialList(p.category, p.details || {}, subQty);
                
                subList.forEach(subItem => {
                    // Skip standard/forbrugsstoffer undervejs for at undgå gentagelser
                    if (subItem.section === 'Forbrugsstoffer & Værktøj') return;
                    
                    const existing = combinedList.find(x => x.item === subItem.item && x.section === subItem.section);
                    if (existing) {
                        existing.qty += subItem.qty;
                    } else {
                        combinedList.push({ ...subItem });
                    }
                });
            });
            list.push(...combinedList);
        } else {
            // Fallback hvis Kombi er tomt
            list.push({ item: 'Standard bygningsmaterialer', qty: 1, unit: 'sæt', section: 'Hovedmaterialer' });
            list.push({ item: 'Diverse skruer og fastgørelse', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
        }
    } else {
        // Enkeltstående projekter
        switch (activeCategory) {
            case 'terrace': {
                const mat = details.material || 'Trykimprægneret fyr';
                const lbmBoards = Math.ceil(numAmount * 1.05 / 0.145); // 5% waste
                list.push({ item: `Terrassebrædder (${mat} - Inkl. 5% spild)`, qty: lbmBoards, unit: 'lbm', section: 'Hovedmaterialer' });
                
                const lbmReglar = Math.ceil(numAmount * 2.8 * 1.05); // 5% waste
                list.push({ item: 'Reglar 45x95 C18 (Underkonstruktion - Inkl. 5% spild)', qty: lbmReglar, unit: 'lbm', section: 'Underkonstruktion' });
                
                const posts = Math.ceil(numAmount * 0.4) || 4;
                list.push({ item: 'Stolper 95x95 Trykimprægneret (3,0m - Bæring pr. ~1,5m)', qty: posts, unit: 'stk', section: 'Underkonstruktion' });
                
                const screws = Math.ceil(numAmount * 35);
                list.push({ item: 'Terrasseskruer A4 Rustfri (5,0x60mm - Beregnet 35 stk/m²)', qty: screws, unit: 'stk', section: 'Fastgørelse & Beslag' });
                
                const concrete = Math.ceil(posts * 1.5);
                list.push({ item: 'Stolpebeton (25 kg poser - 1,5 pose pr. stolpe)', qty: concrete, unit: 'poser', section: 'Fastgørelse & Beslag' });
                
                list.push({ item: 'Vinkelbeslag 90x90 heavy (inkl. kamsøm - 1,2 stk/m²)', qty: Math.ceil(numAmount * 1.2), unit: 'stk', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'floor': {
                const mat = details.material || 'Træ';
                const sqMBboards = Math.ceil(numAmount * 1.08); // 8% waste
                list.push({ item: `Gulvbrædder (${mat} - Inkl. 8% spild)`, qty: sqMBboards, unit: 'm²', section: 'Hovedmaterialer' });
                
                const underlay = Math.ceil(numAmount * 1.02);
                list.push({ item: 'Akustik- og trinlydsdæmpende underlag (Inkl. 2% spild)', qty: underlay, unit: 'm²', section: 'Underlag & Tilbehør' });
                
                const skirting = Math.ceil(Math.sqrt(numAmount) * 4 * 1.1) || 10;
                list.push({ item: 'Fodpaneler (Hvidmalet fyr, 15x65mm - Inkl. 10% spild)', qty: skirting, unit: 'm', section: 'Afslutning' });
                
                // Carpenter protection: extra underlay/support for joists
                if (details.floorFoundation && details.floorFoundation.includes('Strøer')) {
                    const joistsLbm = Math.ceil(numAmount * 2.5 * 1.05); // 5% waste
                    list.push({ item: 'Strøer og kiler (Træundergulv - Inkl. 5% spild)', qty: joistsLbm, unit: 'lbm', section: 'Underkonstruktion' });
                }
                
                // Heating components
                if (details.underfloorHeating && details.underfloorHeating.includes('sporplader')) {
                    list.push({ item: 'Gulvvarmesporplader (22mm - Inkl. 5% spild)', qty: Math.ceil(numAmount * 1.05), unit: 'm²', section: 'Underlag & Tilbehør' });
                    list.push({ item: 'Aluminium varmefordelingsplader (Beregnet 3,2 stk/m²)', qty: Math.ceil(numAmount * 0.8 * 4), unit: 'stk', section: 'Underlag & Tilbehør' });
                }
                
                if (mat.toLowerCase().includes('sildeben') || (details.floorPattern && details.floorPattern.includes('Sildeben'))) {
                    list.push({ item: 'Gulvlim / Parketlim (elastisk - Beregnet 0,8 kg/m²)', qty: Math.ceil(numAmount * 0.8), unit: 'kg', section: 'Fastgørelse & Beslag' });
                }
                
                list.push({ item: 'Monteringsclips / Gulv-søm (kasse à 250 stk)', qty: Math.ceil(numAmount / 15) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'ceilings': {
                const mat = details.material || 'Gips';
                const boards = Math.ceil(numAmount * 1.05); // 5% waste
                list.push({ item: `Loftsplader (${mat} - Inkl. 5% spild)`, qty: boards, unit: 'm²', section: 'Hovedmaterialer' });
                
                const batten = Math.ceil(numAmount * 3.3 * 1.05); // 5% waste
                list.push({ item: 'Forskallingsbrædder 22x95mm (Inkl. 5% spild)', qty: batten, unit: 'lbm', section: 'Underkonstruktion' });
                
                const vapor = Math.ceil(numAmount * 1.15); // 15% overlap/waste
                list.push({ item: 'Dampspærrefolie (PE-folie 0,20mm - Inkl. 15% overlap/spild)', qty: vapor, unit: 'm²', section: 'Underkonstruktion' });
                
                list.push({ item: 'Dampspærre tape (Blå, 50m rulle - Beregnet 1 rulle pr. 60m²)', qty: Math.ceil(numAmount / 60) || 1, unit: 'ruller', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Gips/Troldtektskruer (kasse à 1000 stk - 20 stk/m²)', qty: Math.ceil(numAmount / 50) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Akustikfuge / Malerfuge (300ml)', qty: Math.ceil(Math.sqrt(numAmount) * 0.4) || 2, unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'facades': {
                const mat = details.material || 'Superwood';
                const cladding = Math.ceil(numAmount * 1.10); // 10% waste
                list.push({ item: `Facadebeklædning (${mat} - Inkl. 10% spild)`, qty: cladding, unit: 'm²', section: 'Hovedmaterialer' });
                
                const wind = Math.ceil(numAmount * 1.15); // 15% overlap
                list.push({ item: 'Vindspærrefolie / Facadedug (Inkl. 15% overlap/spild)', qty: wind, unit: 'm²', section: 'Underkonstruktion' });
                
                const batten = Math.ceil(numAmount * 2.5 * 1.05); // 5% waste
                list.push({ item: 'Klemlister 21x45mm Trykimprægneret (Inkl. 5% spild)', qty: batten, unit: 'lbm', section: 'Underkonstruktion' });
                
                const screws = Math.ceil(numAmount * 30);
                list.push({ item: 'Facadeskruer Rustfri A4 (4,5x50mm - Beregnet 30 stk/m²)', qty: screws, unit: 'stk', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'fence': {
                const mat = details.material || 'Klinkehegn (Træ)';
                list.push({ item: `Hegnspaneler / Brædder (${mat} - Inkl. 5% spild)`, qty: Math.ceil(numAmount * 1.05), unit: 'lbm', section: 'Hovedmaterialer' });
                
                const posts = Math.ceil(numAmount / 1.8) + 1;
                const postMat = details.postMaterial || 'Træstolper';
                list.push({ item: `Hegnsstolper (${postMat} - Bæring pr. ~1,8m)`, qty: posts, unit: 'stk', section: 'Underkonstruktion' });
                
                list.push({ item: 'Stolpebeton (25 kg poser - 2 poser pr. stolpe)', qty: posts * 2, unit: 'poser', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Hegnsbeslag L-formede m/skruer (4 stk. pr. stolpe)', qty: Math.ceil(posts * 4), unit: 'stk', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'roof': {
                const mat = details.material || 'Betontagsten';
                list.push({ item: `Tagbeklædning/sten (${mat} - Inkl. 8% spild)`, qty: Math.ceil(numAmount * 1.08), unit: 'm²', section: 'Hovedmaterialer' });
                
                list.push({ item: 'Undertag (dug/plader - Inkl. 15% overlap/spild)', qty: Math.ceil(numAmount * 1.15), unit: 'm²', section: 'Underkonstruktion' });
                
                const lbmLægter = Math.ceil(numAmount * 3.2 * 1.05); // 5% waste
                list.push({ item: 'Taglægter 38x73 T1 (Inkl. 5% spild)', qty: lbmLægter, unit: 'lbm', section: 'Underkonstruktion' });
                
                list.push({ item: 'Tagrender (plast/zink, 3m)', qty: Math.ceil(Math.sqrt(numAmount) * 0.8) || 3, unit: 'stk', section: 'Afslutning' });
                list.push({ item: 'Rendejern og nedløbsrør', qty: Math.ceil(Math.sqrt(numAmount) * 1.2) || 4, unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'windows':
            case 'doors': {
                const qty = Math.ceil(numAmount) || 1;
                list.push({ item: `Elementer (${category === 'windows' ? 'Vinduer' : 'Døre'})`, qty: qty, unit: 'stk', section: 'Hovedmaterialer' });
                
                list.push({ item: 'Karmskruer (7,5x132mm - Beregnet 8 stk. pr. element)', qty: qty * 8, unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Monteringsskum / Fugebagstop (2 stk. pr. element)', qty: qty * 2, unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Byggefuge MS-Polymer (Hvid/Grå - 1,5 tube pr. element)', qty: Math.ceil(qty * 1.5), unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'kitchen': {
                const qty = Math.ceil(numAmount / 1.5) || 6;
                list.push({ item: 'Køkkenmoduler (elementer til opstilling)', qty: qty, unit: 'stk', section: 'Hovedmaterialer' });
                
                const boards = Math.ceil(numAmount * 0.6) || 3;
                list.push({ item: 'Køkkenbordplade (laminat/træ, 3m - Inkl. spild)', qty: boards, unit: 'stk', section: 'Hovedmaterialer' });
                
                list.push({ item: 'Samleskruer og koblingsbeslag (kasse)', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Monteringsskinner og ophæng', qty: Math.ceil(qty / 2) || 3, unit: 'stk', section: 'Underkonstruktion' });
                list.push({ item: 'Sanitets-silikone (skimmelhæmmende, klar - 2 stk.)', qty: 2, unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'carport': {
                const posts = Math.ceil(numAmount * 0.15) || 6;
                list.push({ item: 'Stolper 95x95 Trykimprægneret (3,0m)', qty: posts, unit: 'stk', section: 'Hovedmaterialer' });
                
                const sqMBboards = Math.ceil(numAmount * 1.1); // 10% waste
                list.push({ item: 'Trapezplader (tagbeklædning, plast - Inkl. 10% spild)', qty: sqMBboards, unit: 'm²', section: 'Hovedmaterialer' });
                
                const lbmSpær = Math.ceil(numAmount * 2.2 * 1.05); // 5% waste
                list.push({ item: 'Spærtræ 45x195 C24 (Reglar/Spær - Inkl. 5% spild)', qty: lbmSpær, unit: 'lbm', section: 'Underkonstruktion' });
                
                list.push({ item: 'Stolpebeton (25 kg poser - 2 poser pr. stolpe)', qty: posts * 2, unit: 'poser', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Trapezskruer rustfri m/pakning (kasse)', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Vinkelbeslag 90x90 heavy', qty: posts * 2, unit: 'stk', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'annex':
            case 'extensions': {
                const isExtension = category === 'extensions';
                const multiplier = isExtension ? 1.5 : 1.0;
                
                const posts = Math.ceil(numAmount * 0.25 * multiplier) || 6;
                list.push({ item: 'Stolper 95x95 Trykimprægneret (3,0m)', qty: posts, unit: 'stk', section: 'Hovedmaterialer' });
                
                const lbmSpær = Math.ceil(numAmount * 2.5 * multiplier * 1.05); // 5% waste
                list.push({ item: 'Spærtræ 45x195 C24 (Inkl. 5% spild)', qty: lbmSpær, unit: 'lbm', section: 'Underkonstruktion' });
                
                const lbmReglar = Math.ceil(numAmount * 4.5 * multiplier * 1.05); // 5% waste
                list.push({ item: 'Konstruktionstræ Reglar 45x95 C18 (Inkl. 5% spild)', qty: lbmReglar, unit: 'lbm', section: 'Underkonstruktion' });
                
                const insulation = Math.ceil(numAmount * 2.2 * multiplier * 1.05); // 5% waste
                list.push({ item: 'Isolering (A-Batts 95mm - Inkl. 5% spild)', qty: insulation, unit: 'm²', section: 'Underkonstruktion' });
                
                const wind = Math.ceil(numAmount * 1.2 * multiplier * 1.15); // 15% overlap
                list.push({ item: 'Vindspærrefolie / Facadedug (Inkl. 15% overlap/spild)', qty: wind, unit: 'm²', section: 'Underkonstruktion' });
                
                const cladding = Math.ceil(numAmount * 1.25 * multiplier * 1.10); // 10% waste
                list.push({ item: `Facadebeklædning/krydsforskalling (m² - Inkl. 10% spild)`, qty: cladding, unit: 'm²', section: 'Hovedmaterialer' });
                
                const concrete = Math.ceil(posts * 2);
                list.push({ item: 'Stolpebeton / Støbemix (poser - 2 poser pr. stolpe)', qty: concrete, unit: 'poser', section: 'Fastgørelse & Beslag' });
                break;
            }
            default: {
                list.push({ item: 'Standard bygningsmaterialer', qty: 1, unit: 'sæt', section: 'Hovedmaterialer' });
                list.push({ item: 'Diverse skruer og fastgørelse', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
            }
        }
    }

    // Standard items for all builders, added at the very end
    list.push({ item: 'Affaldssække, plastikkiler og afdækning', qty: 1, unit: 'sæt', section: 'Forbrugsstoffer & Værktøj' });
    list.push({ item: 'Diverse skruer, beslag og fuge/lim (Buffer)', qty: 1, unit: 'kasse', section: 'Forbrugsstoffer & Værktøj' });
    list.push({ item: 'Sliddele: Savklinger, bits, sandpapir, knivblade', qty: 1, unit: 'pakke', section: 'Forbrugsstoffer & Værktøj' });

    return list;
};
