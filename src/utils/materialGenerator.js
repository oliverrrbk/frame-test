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
                
                const isGroundLevel = details.elevation === 'Jordniveau' || !details.elevation;
                if (isGroundLevel) {
                    list.push({ item: 'Ukrudtsdug / Fibertex (Inkl. 15% overlap)', qty: Math.ceil(numAmount * 1.15), unit: 'm²', section: 'Underkonstruktion' });
                }

                if (details.elevation === 'Tagterrasse' && details.roofTerraceFeet === 'Ja, den skal klodses op på plastfødder') {
                    list.push({ item: 'Justerbare terrassefødder (plast) - Beregnet 4 stk/m²', qty: Math.ceil(numAmount * 4), unit: 'stk', section: 'Underkonstruktion' });
                } else {
                    const posts = Math.ceil(numAmount * 0.4) || 4;
                    list.push({ item: 'Stolper 95x95 Trykimprægneret (3,0m - Bæring pr. ~1,5m)', qty: posts, unit: 'stk', section: 'Underkonstruktion' });
                    list.push({ item: 'Stolpebeton (25 kg poser - 1,5 pose pr. stolpe)', qty: Math.ceil(posts * 1.5), unit: 'poser', section: 'Fastgørelse & Beslag' });
                }
                
                const screwType = mat.toLowerCase().includes('hardwood') || mat.toLowerCase().includes('ceder') ? 'Terrasseskruer A4 Rustfri (syrefast)' : 'Terrasseskruer C4 (Udendørs)';
                const screws = Math.ceil(numAmount * 35);
                list.push({ item: `${screwType} (5,0x60mm - Beregnet 35 stk/m²)`, qty: screws, unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Vinkelbeslag 90x90 heavy (inkl. kamsøm - 1,2 stk/m²)', qty: Math.ceil(numAmount * 1.2), unit: 'stk', section: 'Fastgørelse & Beslag' });
                
                if (details.railing === 'Ja, vi skal bygge rækværk' && details.railingMeters) {
                    const rMeters = parseFloat(details.railingMeters);
                    list.push({ item: `Rækværk top- og bundbrædder (${details.railingMaterial || 'Træ'} - Inkl. spild)`, qty: Math.ceil(rMeters * 2.2), unit: 'lbm', section: 'Hovedmaterialer' });
                    list.push({ item: 'Balustre / tremmer til rækværk', qty: Math.ceil(rMeters * 8), unit: 'stk', section: 'Hovedmaterialer' });
                    list.push({ item: 'Rustfrie vinkelbeslag til rækværk (inkl. skruer)', qty: Math.ceil(rMeters * 4), unit: 'stk', section: 'Fastgørelse & Beslag' });
                }
                if (details.awning === 'Ja, vi skal montere markise') {
                    list.push({ item: `Markise (${details.awningType || 'Standard'})`, qty: 1, unit: 'stk', section: 'Hovedmaterialer' });
                    list.push({ item: 'Montagesæt: Franske skruer / Kemisk anker til mur', qty: 1, unit: 'sæt', section: 'Fastgørelse & Beslag' });
                }
                break;
            }
            case 'floor': {
                const mat = details.material || 'Træ';
                const sqMBboards = Math.ceil(numAmount * 1.08); // 8% waste
                
                const isHerringbone = mat.toLowerCase().includes('sildeben') || (details.floorPattern && details.floorPattern.includes('Sildeben'));
                const finalWaste = isHerringbone ? 1.15 : 1.08;
                list.push({ item: `Gulvbrædder (${mat} - Inkl. ${isHerringbone ? '15' : '8'}% spild)`, qty: Math.ceil(numAmount * finalWaste), unit: 'm²', section: 'Hovedmaterialer' });
                
                const underlay = Math.ceil(numAmount * 1.02);
                list.push({ item: 'Akustik- og trinlydsdæmpende underlag (Inkl. 2% spild)', qty: underlay, unit: 'm²', section: 'Underlag & Tilbehør' });
                
                const skirting = Math.ceil(Math.sqrt(numAmount) * 4 * 1.1) || 10;
                list.push({ item: 'Fodpaneler (Hvidmalet fyr, 15x65mm - Inkl. 10% spild)', qty: skirting, unit: 'lbm', section: 'Afslutning' });
                
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
                
                if (isHerringbone || details.floorFoundation?.includes('Beton')) {
                    list.push({ item: 'Gulvlim / Parketlim (Elastisk SMP-lim - Beregnet 1 kg/m²)', qty: Math.ceil(numAmount * 1.0), unit: 'kg', section: 'Fastgørelse & Beslag' });
                    list.push({ item: 'Tandspartel til lim (Sliddel)', qty: 1, unit: 'stk', section: 'Forbrugsstoffer & Værktøj' });
                }
                
                list.push({ item: 'Monteringsclips / Gulv-søm (kasse à 250 stk)', qty: Math.ceil(numAmount / 15) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });

                if (details.floorObstacles === 'Ja, det er der (køkkenø, søjler, skorsten eller rør)') {
                    list.push({ item: 'Dæklister/fejelister omkring faste elementer', qty: Math.ceil(Math.sqrt(numAmount) * 0.5) || 2, unit: 'lbm', section: 'Afslutning' });
                    list.push({ item: 'Elastisk byggefuge (Til rørgennemføringer/kanter)', qty: 1, unit: 'stk', section: 'Afslutning' });
                }
                if (details.floorDoorsNear === 'Ja' && details.floorDoorsCount) {
                    list.push({ item: 'Alu-overgangsskinner til døråbninger', qty: parseInt(details.floorDoorsCount), unit: 'stk', section: 'Afslutning' });
                }
                break;
            }
            case 'ceilings': {
                const mat = details.material || 'Gips';
                const boards = Math.ceil(numAmount * 1.05); // 5% waste
                list.push({ item: `Loftsplader (${mat} - Inkl. 5% spild)`, qty: boards, unit: 'm²', section: 'Hovedmaterialer' });
                
                const batten = Math.ceil(numAmount * 3.3 * 1.05); // 5% waste
                list.push({ item: 'Forskallingsbrædder 22x95mm (Inkl. 5% spild)', qty: batten, unit: 'lbm', section: 'Underkonstruktion' });
                
                const needsVapor = details.vaporAndInsulation && details.vaporAndInsulation.includes('Koldt tagrum');
                if (needsVapor) {
                    const vapor = Math.ceil(numAmount * 1.15); // 15% overlap/waste
                    list.push({ item: 'Dampspærrefolie (PE-folie 0,20mm - Inkl. 15% overlap/spild)', qty: vapor, unit: 'm²', section: 'Underkonstruktion' });
                    list.push({ item: 'Dampspærre tape (Blå, 50m rulle - Beregnet 1 rulle pr. 60m²)', qty: Math.ceil(numAmount / 60) || 1, unit: 'ruller', section: 'Fastgørelse & Beslag' });
                    list.push({ item: 'Folielæber/rørmanchetter (Til gennembrydninger)', qty: Math.ceil(numAmount / 20) || 1, unit: 'stk', section: 'Fastgørelse & Beslag' });
                }
                
                list.push({ item: 'Gips/Troldtektskruer (kasse à 1000 stk - 20 stk/m²)', qty: Math.ceil(numAmount / 50) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });
                
                // Finish
                const lbmEdge = Math.ceil(Math.sqrt(numAmount) * 4 * 1.1) || 10;
                list.push({ item: 'Skyggelister (Træ/MDF - Inkl. 10% spild)', qty: lbmEdge, unit: 'lbm', section: 'Afslutning' });
                list.push({ item: 'Akryl/Malerfuge (300ml - Til samlinger og kanter)', qty: Math.ceil(lbmEdge / 10) || 2, unit: 'stk', section: 'Afslutning' });

                if (details.spots === 'Ja') {
                    const spotCnt = Math.max(1, Math.round(numAmount / 1.75));
                    list.push({ item: 'Safebox / Spotkasser (Forberedelse til elektriker)', qty: spotCnt, unit: 'stk', section: 'Underkonstruktion' });
                    list.push({ item: 'Flexrør (tomrør til kabeltræk) og kabelclips', qty: Math.ceil(spotCnt * 1.5), unit: 'm', section: 'Underkonstruktion' });
                }
                break;
            }
            case 'facades': {
                const mat = details.material || 'Superwood';
                const cladding = Math.ceil(numAmount * 1.10); // 10% waste
                list.push({ item: `Facadebeklædning (${mat} - Inkl. 10% spild)`, qty: cladding, unit: 'm²', section: 'Hovedmaterialer' });
                
                const wind = Math.ceil(numAmount * 1.15); // 15% overlap
                list.push({ item: 'Vindspærrefolie / Facadedug (Inkl. 15% overlap/spild)', qty: wind, unit: 'm²', section: 'Underkonstruktion' });
                
                const batten = Math.ceil(numAmount * 2.5 * 1.05); // 5% waste
                list.push({ item: 'Klemlister 21x45mm Trykimprægneret (Ventileret hulrum)', qty: batten, unit: 'lbm', section: 'Underkonstruktion' });
                list.push({ item: 'Afstandslister/Forskalling 21x95mm Trykimprægneret', qty: batten, unit: 'lbm', section: 'Underkonstruktion' });
                
                if (details.insulation && details.insulation !== 'Nej tak (Behold nuværende isolering)') {
                    const mmMatch = details.insulation.match(/(\d+)\s*mm/);
                    const mm = mmMatch ? mmMatch[1] : '100';
                    list.push({ item: `Facade-isolering (Batts ${mm}mm - Inkl. 5% spild)`, qty: Math.ceil(numAmount * 1.05), unit: 'm²', section: 'Underkonstruktion' });
                }

                // Carpenter detail: Mouse guard
                const lbmBottom = Math.ceil(Math.sqrt(numAmount) * 4); // Approximate perimeter
                list.push({ item: 'Musestop-profiler / Musesikring (Aluminium)', qty: lbmBottom, unit: 'lbm', section: 'Underkonstruktion' });

                const screws = Math.ceil(numAmount * 30);
                list.push({ item: 'Facadeskruer Rustfri A4 (4,5x50mm - Beregnet 30 stk/m²)', qty: screws, unit: 'stk', section: 'Fastgørelse & Beslag' });

                if (details.openings) {
                    const ops = parseInt(details.openings);
                    list.push({ item: 'Trælister til inddækning/lysninger ved vinduer/døre', qty: ops * 6, unit: 'lbm', section: 'Afslutning' });
                    list.push({ item: 'Zink-vandnæser / overliggerprofiler (Til vinduer)', qty: ops, unit: 'stk', section: 'Afslutning' });
                }
                break;
            }
            case 'fence': {
                const mat = details.material || 'Klinkehegn (Træ)';
                list.push({ item: `Hegnspaneler / Brædder (${mat} - Inkl. 5% spild)`, qty: Math.ceil(numAmount * 1.05), unit: 'lbm', section: 'Hovedmaterialer' });
                
                const posts = Math.ceil(numAmount / 1.8) + 1;
                const postMat = details.postMaterial || 'Træstolper';
                list.push({ item: `Hegnsstolper (${postMat} - Bæring pr. ~1,8m)`, qty: posts, unit: 'stk', section: 'Underkonstruktion' });
                
                if (details.postAnchoringWoodMetal === 'Jordskruer / Skruefundament (Hurtig stålforankring)') {
                    list.push({ item: 'Skruefundamenter / Jordskruer (1 pr. stolpe)', qty: posts, unit: 'stk', section: 'Fastgørelse & Beslag' });
                } else if (details.postAnchoringWoodMetal === 'Direkte i jorden uden beton (Kun visse træsorter)') {
                    // ingen beton
                } else {
                    // Concrete
                    const isHigh = details.fenceHeight === 'Op til 2,0 meter';
                    const concreteBags = isHigh ? 3 : 2; // Tungere/højere hegn = mere beton
                    list.push({ item: `Stolpebeton (25 kg poser - ${concreteBags} poser pr. stolpe)`, qty: posts * concreteBags, unit: 'poser', section: 'Fastgørelse & Beslag' });
                }
                
                list.push({ item: 'Hegnsbeslag L-formede m/skruer (4 stk. pr. stolpe)', qty: Math.ceil(posts * 4), unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Træbeskyttelse til snitflader på stolper (Bøtte)', qty: 1, unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'roof': {
                const mat = details.material || 'Betontagsten';
                list.push({ item: `Tagbeklædning/sten (${mat} - Inkl. 8% spild)`, qty: Math.ceil(numAmount * 1.08), unit: 'm²', section: 'Hovedmaterialer' });
                
                list.push({ item: 'Undertag (Dug/plader - Inkl. 15% overlap/spild)', qty: Math.ceil(numAmount * 1.15), unit: 'm²', section: 'Underkonstruktion' });
                
                const lbmLægter = Math.ceil(numAmount * 3.2 * 1.05); // 5% waste
                list.push({ item: 'Taglægter 38x73 T1 (Inkl. 5% spild)', qty: lbmLægter, unit: 'lbm', section: 'Underkonstruktion' });
                list.push({ item: 'Afstandslister 25x50mm (Til at sikre ventilation)', qty: Math.ceil(numAmount * 1.5), unit: 'lbm', section: 'Underkonstruktion' });
                
                // Ventilation
                list.push({ item: 'Fuglekamme / Ventileret tagfod (Sikring mod fugle/fygesne)', qty: Math.ceil(Math.sqrt(numAmount) * 2), unit: 'lbm', section: 'Underkonstruktion' });

                // Skotrender / Grater
                if (details.skotrender === 'Ja' && details.skotrenderMeters) {
                    const skMeters = parseFloat(details.skotrenderMeters);
                    list.push({ item: 'Zink-skotrende (Inkl. understøtningstræ)', qty: Math.ceil(skMeters * 1.1), unit: 'lbm', section: 'Hovedmaterialer' });
                    list.push({ item: 'Skotrendelim / tætningsbånd', qty: Math.ceil(skMeters), unit: 'lbm', section: 'Fastgørelse & Beslag' });
                }
                if (details.grater === 'Ja' && details.graterMeters) {
                    const grMeters = parseFloat(details.graterMeters);
                    list.push({ item: 'Gratsten / Gratbånd (Til valmede kanter)', qty: Math.ceil(grMeters * 1.1), unit: 'lbm', section: 'Afslutning' });
                }

                // Rygning
                if (details.roofType === 'Saddeltag (Almindeligt tag med 2 gavle)') {
                    const ridgeMeters = Math.ceil(Math.sqrt(numAmount) * 1.2);
                    list.push({ item: 'Rygningssten og rygningsbånd (Sikring af top)', qty: ridgeMeters, unit: 'lbm', section: 'Afslutning' });
                }

                // Skorsten / Ovenlys
                if (details.chimney === 'Ja' && details.chimneyAmount) {
                    const chCnt = parseInt(details.chimneyAmount);
                    list.push({ item: 'Bly / Zink-inddækning til skorsten', qty: chCnt, unit: 'sæt', section: 'Afslutning' });
                    list.push({ item: 'Wakaflex / Fugebånd til skorsten', qty: chCnt * 2, unit: 'ruller', section: 'Fastgørelse & Beslag' });
                }
                
                if (details.skylightNew === 'Ja' && details.skylightNewAmount) {
                    const skNew = parseInt(details.skylightNewAmount);
                    list.push({ item: 'Nye ovenlysvinduer (Komplet inkl. inddækning)', qty: skNew, unit: 'stk', section: 'Hovedmaterialer' });
                    list.push({ item: 'Spærtræ til udveksling/forstærkning i tagkonstruktion', qty: skNew * 3, unit: 'lbm', section: 'Underkonstruktion' });
                    list.push({ item: 'Dampspærrekrave og isoleringskrave til ovenlys', qty: skNew, unit: 'sæt', section: 'Fastgørelse & Beslag' });
                }

                list.push({ item: 'Tagrender (plast/zink, 3m)', qty: Math.ceil(Math.sqrt(numAmount) * 0.8) || 3, unit: 'stk', section: 'Afslutning' });
                list.push({ item: 'Rendejern og nedløbsrør', qty: Math.ceil(Math.sqrt(numAmount) * 1.2) || 4, unit: 'stk', section: 'Afslutning' });
                break;
            }
            case 'windows':
            case 'doors': {
                const qty = Math.ceil(numAmount) || 1;
                list.push({ item: `Elementer (${category === 'windows' ? 'Vinduer' : 'Døre'})`, qty: qty, unit: 'stk', section: 'Hovedmaterialer' });
                
                list.push({ item: 'Karmskruer (7,5x132mm - Beregnet 8 stk. pr. element)', qty: qty * 8, unit: 'stk', section: 'Fastgørelse & Beslag' });
                
                // Tømrer dimsedutter
                list.push({ item: 'Knudsen-kiler / Plastik opklodsning', qty: qty * 4, unit: 'sæt', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Illmod-bånd (Ekspanderende fugebånd til udvendig tætning)', qty: qty * 5, unit: 'lbm', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Monteringsskum (lav-ekspanderende til isolering)', qty: Math.ceil(qty * 0.5), unit: 'dåser', section: 'Fastgørelse & Beslag' });
                
                list.push({ item: 'Fugebagstop (rund profil)', qty: qty * 5, unit: 'lbm', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Byggefuge MS-Polymer (Hvid/Grå - 1,5 tube pr. element)', qty: Math.ceil(qty * 1.5), unit: 'stk', section: 'Afslutning' });
                
                // Finish indvendig
                list.push({ item: 'Trægerigter / Indfatninger (Indvendig afslutning)', qty: qty * 5, unit: 'lbm', section: 'Afslutning' });
                list.push({ item: 'MDF / Træplade til lysninger (Dybde-tilpasning)', qty: qty * 2, unit: 'm²', section: 'Afslutning' });
                list.push({ item: 'Dykkerstift / Søm til gerigter (Pistol)', qty: Math.ceil(qty / 5) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'kitchen': {
                const qty = Math.ceil(numAmount / 1.5) || 6;
                list.push({ item: 'Køkkenmoduler (elementer til opstilling)', qty: qty, unit: 'stk', section: 'Hovedmaterialer' });
                
                const boards = Math.ceil(numAmount * 0.6) || 3;
                list.push({ item: 'Køkkenbordplade (laminat/træ, 3m - Inkl. spild)', qty: boards, unit: 'stk', section: 'Hovedmaterialer' });
                list.push({ item: 'Bordplade-samlebeslag (Hundeben)', qty: Math.ceil(boards * 1.5), unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Trælim (D3 - Vandfast til bordpladesamling)', qty: 1, unit: 'stk', section: 'Fastgørelse & Beslag' });
                
                list.push({ item: 'Samleskruer og koblingsbeslag (Kabinetsamling)', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Monteringsskinner og ophæng', qty: Math.ceil(qty / 2) || 3, unit: 'stk', section: 'Underkonstruktion' });
                
                list.push({ item: 'Skærelister / Tilpasningsstykker (Farvekodet MDF)', qty: 2, unit: 'stk', section: 'Afslutning' });
                list.push({ item: 'Sanitets-silikone (skimmelhæmmende, klar)', qty: 2, unit: 'stk', section: 'Afslutning' });
                list.push({ item: 'Akrylfuge (Malerfuge til vægtilslutning)', qty: 2, unit: 'stk', section: 'Afslutning' });
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
                list.push({ item: 'Vinkelbeslag 90x90 heavy (Inkl. beslagskruer/kamsøm)', qty: posts * 2, unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Hulbånd / Vindtrækbånd (Stål, til afstivning)', qty: Math.ceil(numAmount / 15) || 1, unit: 'ruller', section: 'Fastgørelse & Beslag' });
                break;
            }
            case 'annex':
            case 'extensions': {
                const isExtension = category === 'extensions';
                const multiplier = isExtension ? 1.5 : 1.0;
                
                const isSlab = details.foundationType?.includes('Støbt betondæk') || isExtension; // Extensions always assumed heavy
                if (isSlab) {
                    list.push({ item: 'Kantisolering (Sundolitt/EPS)', qty: Math.ceil(Math.sqrt(numAmount) * 4), unit: 'lbm', section: 'Underkonstruktion' });
                    list.push({ item: 'Beton (Støbemix/Klar-beton til dæk)', qty: Math.ceil(numAmount * 0.15), unit: 'm³', section: 'Underkonstruktion' });
                    list.push({ item: 'Radonspærre', qty: Math.ceil(numAmount * 1.1), unit: 'm²', section: 'Underkonstruktion' });
                } else {
                    const posts = Math.ceil(numAmount * 0.25 * multiplier) || 6;
                    list.push({ item: 'Stolper 95x95 Trykimprægneret (3,0m)', qty: posts, unit: 'stk', section: 'Hovedmaterialer' });
                    list.push({ item: 'Stolpebeton (25 kg poser - 2 poser pr. stolpe)', qty: posts * 2, unit: 'poser', section: 'Fastgørelse & Beslag' });
                }
                
                const lbmSpær = Math.ceil(numAmount * 2.5 * multiplier * 1.05); // 5% waste
                list.push({ item: 'Spærtræ 45x195 C24 (Inkl. 5% spild)', qty: lbmSpær, unit: 'lbm', section: 'Underkonstruktion' });
                list.push({ item: 'Konstruktionstræ Reglar 45x95 C18 (Skelet - Inkl. 5% spild)', qty: Math.ceil(numAmount * 4.5 * multiplier * 1.05), unit: 'lbm', section: 'Underkonstruktion' });
                list.push({ item: 'Isolering (A-Batts 95mm/145mm - Inkl. 5% spild)', qty: Math.ceil(numAmount * 2.2 * multiplier * 1.05), unit: 'm²', section: 'Underkonstruktion' });
                list.push({ item: 'Vindspærrefolie / Facadedug (Inkl. 15% overlap/spild)', qty: Math.ceil(numAmount * 1.2 * multiplier * 1.15), unit: 'm²', section: 'Underkonstruktion' });
                list.push({ item: 'Dampspærrefolie (Indvendig PE-folie 0,20mm)', qty: Math.ceil(numAmount * 2.5 * multiplier * 1.15), unit: 'm²', section: 'Underkonstruktion' });
                
                const cladding = Math.ceil(numAmount * 1.25 * multiplier * 1.10); // 10% waste
                list.push({ item: `Facadebeklædning/krydsforskalling (m² - Inkl. 10% spild)`, qty: cladding, unit: 'm²', section: 'Hovedmaterialer' });
                
                // Tagbeklædning (annex ofte pap, extensions ofte tegl)
                if (details.roofType?.includes('Fladt tag')) {
                    list.push({ item: 'Tagkrydsfiner / OSB-plader', qty: Math.ceil(numAmount * 1.1), unit: 'm²', section: 'Hovedmaterialer' });
                    list.push({ item: 'Tagpap (Underpap + Overpap)', qty: Math.ceil(numAmount * 2.2), unit: 'm²', section: 'Hovedmaterialer' });
                } else {
                    list.push({ item: 'Let tagbeklædning (Fx Stålplader) / Undertag', qty: Math.ceil(numAmount * 1.1), unit: 'm²', section: 'Hovedmaterialer' });
                }

                // Beslag
                list.push({ item: 'Spit-bolte / Ekspansionsbolte (Fastgørelse til fundament)', qty: Math.ceil(numAmount * 1.5), unit: 'stk', section: 'Fastgørelse & Beslag' });
                list.push({ item: 'Vinkelbeslag, hulbånd og beslagskruer', qty: Math.ceil(numAmount / 10) || 1, unit: 'kasser', section: 'Fastgørelse & Beslag' });
                break;
            }
            default: {
                list.push({ item: 'Standard bygningsmaterialer', qty: 1, unit: 'sæt', section: 'Hovedmaterialer' });
                list.push({ item: 'Diverse skruer og fastgørelse', qty: 1, unit: 'kasse', section: 'Fastgørelse & Beslag' });
            }
        }
    }

    // Standard items for all builders, added at the very end
    // Dynamo-skalering ud fra mængde (fx m2 eller stk)
    const consumeScale = Math.max(1, Math.ceil(numAmount / 25)); // 1 kasse/pakke per 25 enheder
    
    list.push({ item: 'Affaldssække, plastikkiler og grund-afdækning (pap/plast)', qty: consumeScale, unit: 'sæt', section: 'Forbrugsstoffer & Værktøj' });
    list.push({ item: 'Diverse standardskruer, plugs og småbeslag (Buffer)', qty: consumeScale, unit: 'kasser', section: 'Forbrugsstoffer & Værktøj' });
    list.push({ item: 'Sliddele: Savklinger, bits, bor, sandpapir, knivblade', qty: consumeScale, unit: 'pakker', section: 'Forbrugsstoffer & Værktøj' });
    list.push({ item: 'Afdækningstape / Malertape (Brede ruller)', qty: consumeScale * 2, unit: 'ruller', section: 'Forbrugsstoffer & Værktøj' });

    return list;
};
