export const parseBreakdownToExplanation = (calcData, breakdownArr) => {
    if (!calcData || !breakdownArr || breakdownArr.length === 0) {
        return null; // Fallback
    }

    const categories = {
        labor: {
            title: 'Arbejdstid (Montage og Finish)',
            description: 'Systemet beregner ikke bare "en opgave = x timer". Det bygger tidsforbruget op som klodser:',
            items: []
        },
        materials: {
            title: 'Hovedmaterialer & Avance',
            description: 'Systemet slår materialet op i kartoteket og bygger prisen:',
            items: []
        },
        accessories: {
            title: '"Skjult" Tilbehør & Bortskaffelse',
            description: 'For at sikre, at tømreren ikke betaler for tilbehør ud af egen lomme, lægges dette usynligt i kurven:',
            items: []
        },
        logistics: {
            title: 'Kørsel, Logistik & Risikobuffer',
            description: 'Til sidst kigger systemet på de bløde parametre for at sikre rentabilitet:',
            items: []
        }
    };

    breakdownArr.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // Remove "---" prefix if any
        const cleanLine = line.replace(/---/g, '').trim();

        // LOGISTICS
        if (lowerLine.includes('kørsel') || lowerLine.includes('transport') || lowerLine.includes('slitage') || lowerLine.includes('risikobuffer') || lowerLine.includes('facadestillads') || lowerLine.includes('kalibrering')) {
            categories.logistics.items.push(cleanLine);
        }
        // ACCESSORIES
        else if (lowerLine.includes('tilbehør') || lowerLine.includes('miljøtillæg') || lowerLine.includes('deponi') || lowerLine.includes('bortskaffelse') || lowerLine.includes('leje af maskiner') || lowerLine.includes('affald')) {
            categories.accessories.items.push(cleanLine);
        }
        // MATERIALS
        else if (lowerLine.includes('hovedmateriale') || lowerLine.includes('materiale') || lowerLine.includes('premiumkvalitet') || lowerLine.includes('2-farvede profiler') || lowerLine.includes('materialespild')) {
            categories.materials.items.push(cleanLine);
        }
        // LABOR (Catch all for hours, montering, finish, etc)
        else {
            categories.labor.items.push(cleanLine);
        }
    });

    return categories;
};
