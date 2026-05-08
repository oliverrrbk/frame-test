export const generateHumanQuoteText = (category, details, categoryName) => {
    if (category === 'special') {
        const aiSummary = details?.summaryBullets?.map(b => `• ${b}`).join('\n') || details?.aiSummary || '';
        return `Hermed fremsendes tilbud på opgaven, jf. vores dialog.\n\nEntreprisen omfatter følgende arbejdsgange:\n${aiSummary}\n\nOvenstående udføres jf. god håndværksskik. Vi ser frem til at levere et flot resultat!`;
    }

    // Ekstraher nøgleord for at gøre det mere personligt
    let area = '';
    let material = '';
    
    if (details) {
        Object.entries(details).forEach(([k, v]) => {
            const keyLower = k.toLowerCase();
            const valStr = String(v).toLowerCase();
            
            if (keyLower.includes('m2') || keyLower.includes('amount') || keyLower.includes('kvadrat') || keyLower.includes('størrelse')) {
                area = String(v);
                if (!area.toLowerCase().includes('m2') && !area.toLowerCase().includes('stk')) area += ' m2';
            }
            if (keyLower.includes('material') || valStr.includes('træ') || valStr.includes('alu') || valStr.includes('plast') || valStr.includes('tegl') || valStr.includes('pension')) {
                material = String(v);
            }
        });
    }

    const keyInfoParts = [];
    if (area) keyInfoParts.push(area);
    if (material) keyInfoParts.push(material);
    
    const specificInfo = keyInfoParts.length > 0 ? ` (${keyInfoParts.join(' i ')})` : '';

    let bulletPoints = [];

    switch (category) {
        case 'terrace':
            bulletPoints = [
                '• Klargøring af arbejdsområde og etablering af underlag/fundament',
                `• Levering og montering af terrassebelægning${specificInfo}`,
                '• Afslutning, finish og oprydning af arbejdsplads'
            ];
            break;
        case 'windows':
        case 'doors':
            bulletPoints = [
                '• Afmontering og evt. bortskaffelse af eksisterende elementer',
                `• Levering og montering af nye elementer${specificInfo}`,
                '• Udførelse af fuger og indvendig finish',
                '• Kvalitetssikring og oprydning'
            ];
            break;
        case 'roof':
            bulletPoints = [
                '• Etablering af sikkerhed/stillads',
                '• Klargøring af undertag og lægtning jf. anvisninger',
                `• Levering og montering af ny tagbelægning${specificInfo}`,
                '• Montering af rygning og finish af kanter',
                '• Nedtagning af stillads og oprydning'
            ];
            break;
        case 'floor':
            bulletPoints = [
                '• Klargøring og evt. opretning af undergulv',
                `• Levering og lægning af nyt gulv${specificInfo}`,
                '• Tilpasning og montering af fodpaneler',
                '• Afslutning og oprydning'
            ];
            break;
        case 'kitchen':
            bulletPoints = [
                '• Klargøring af rummet til opsætning',
                `• Gennemgang og samling af køkkenelementer`,
                '• Opsætning af skabe, skuffer og montering af bordplade',
                '• Tilpasning af sokkel og lister',
                '• Slutfinish og oprydning'
            ];
            break;
        case 'facades':
            bulletPoints = [
                '• Etablering af stillads og fjernelse af gammel beklædning (hvis relevant)',
                '• Opsætning af ny underkonstruktion og vindspærre',
                `• Levering og montering af ny facadebeklædning${specificInfo}`,
                '• Montering af afslutningslister',
                '• Oprydning af byggeplads'
            ];
            break;
        case 'ceilings':
            bulletPoints = [
                '• Klargøring af arbejdsområde og evt. nedtagning af eksisterende loft',
                '• Etablering af forskalling og underkonstruktion',
                `• Montering af ny loftbeklædning${specificInfo}`,
                '• Afslutning med skyggelister/fugning',
                '• Slutfinish og oprydning'
            ];
            break;
        case 'extensions':
            bulletPoints = [
                '• Etablering af byggeplads, afsætning og udgravning',
                '• Støbning af fundament og etablering af terrændæk',
                `• Opbygning af råhus, tagkonstruktion og klimaskærm${specificInfo}`,
                '• Indvendig aptering, isolering og overfladebehandling',
                '• Afleveringsforretning, kvalitetssikring og oprydning'
            ];
            break;
        case 'annex':
            bulletPoints = [
                '• Etablering af punktfundamenter/skruefundamenter',
                `• Opbygning af gulvkonstruktion og klimaskærm${specificInfo}`,
                '• Montering af tagkonstruktion, vinduer og døre',
                '• Indvendig beklædning og finish',
                '• Slutrengøring og aflevering'
            ];
            break;
        case 'carport':
            bulletPoints = [
                '• Opmåling, afsætning og støbning af stolpefødder',
                `• Rejsning af stolper og bærende konstruktion${specificInfo}`,
                '• Montering af tagkonstruktion og tagbelægning',
                '• Evt. beklædning af sider/skur',
                '• Færdiggørelse og oprydning af pladsen'
            ];
            break;
        case 'fence':
            bulletPoints = [
                '• Opmåling, afsætning og klargøring af linjeføring',
                '• Nedgravning/støbning af stolper med korrekt afstand',
                `• Montering af hegnsbrædder/elementer jf. aftale${specificInfo}`,
                '• Tilpasning af højder og evt. låge',
                '• Kvalitetssikring og oprydning'
            ];
            break;
        default:
            // Generisk byggeri
            bulletPoints = [
                '• Klargøring af arbejdsområde',
                `• Levering af materialer og professionel udførelse af opgaven${specificInfo}`,
                '• Slutfinish, kvalitetssikring og komplet oprydning'
            ];
            break;
    }

    const cName = categoryName ? categoryName.toLowerCase() : 'opgaven';
    
    return `Hermed fremsendes tilbud på ${cName}, jf. vores dialog.\n\nEntreprisen omfatter følgende arbejdsgange:\n${bulletPoints.join('\n')}\n\nVi glæder os til at komme i gang med projektet og levere et solidt stykke håndværk!`;
};
