let currentStep = 1;
const projectData = {
    category: null,
    details: {},
    notes: "",
    photos: [],
};

// --- HÅNDVÆRKERENS AVANCEREDE PRIS-MATRIX ---
const PRICES = {
    windows: {
        baseTime: 2000,
        materials: { "træ": 5500, "træ_alu": 7000, "plast": 4500 },
        installationPerUnit: 1800,
        finishIndvendig: 1000
    },
    doors: {
        baseTime: 1500,
        materials: { "mahogni": 12000, "fyr": 7000, "komposit": 9500 },
        installationPerUnit: 2500,
        finishIndvendig: 1200
    },
    floor: {
        baseTime: 1500,
        materials: { "laminat": 400, "parket": 850, "sildeben": 1600 },
        installationPerSqm: 250,
        skirtingBoardPerSqm: 60
    },
    terrace: {
        baseTime: 3000,
        materials: { "tryk": 350, "hardwood": 1100, "komposit": 1300 },
        installationPerSqm: 700
    },
    roof: {
        baseTime: 8000,
        materials: { "paptag": 600, "tegl": 1200, "staal": 550 },
        installationPerSqm: 900
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Kategori-vælger (Step 1)
    setupCardClickHandlers(document.getElementById('step-1'), (selectedCard) => {
        projectData.category = selectedCard.dataset.category;
        projectData.details = {}; 
        generateVisualDynamicFields(projectData.category);
        setTimeout(() => { nextStep(); }, 300);
    });

    // Billed-opload mock (Step 3)
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.addEventListener('click', () => {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<div style="padding:16px; background:var(--accent-light); color:var(--accent); border-radius:8px; margin-top:16px; text-align:center; font-weight:500; font-size:14px;">Billeder vedhæftet succesfuldt.</div>`;
    });
});

// Hjælper-funktion til at lytte efter card-clicks i specifikke containere
function setupCardClickHandlers(container, callback) {
    if(!container) return;
    const cards = container.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            callback(card);
        });
    });
}

function updateProgress() {
    const totalSteps = 4;
    const percentage = ((currentStep) / totalSteps) * 100;
    document.getElementById('progress-fill').style.width = percentage + '%';
}

function checkEmail(val) {
    const btn = document.getElementById('btn-calculate');
    btn.disabled = val.length < 5 || !val.includes('@');
}


// ==========================================
// FORMULAR GENERATOR - Nu med visuelle kort
// ==========================================
function generateVisualDynamicFields(category) {
    const container = document.getElementById('dynamic-fields');
    let html = '';
    
    // Gør titlen relevant
    const titleMap = {
        windows: "Detaljer om dine ruder",
        doors: "Detaljer om dine døre",
        floor: "Specificer dit drømmegulv",
        terrace: "Opbygning af din terrasse",
        roof: "Information om dit tag"
    };
    document.getElementById('step2-title').innerText = titleMap[category] || "Byg dit projekt";

    if (category === 'floor') {
        html = `
            <div class="form-group">
                <label>1. Tryk på det gulvmateriale du ønsker lagt:</label>
                <div class="card-grid" id="material-cards">
                    <div class="card" data-val="laminat">
                        <img src="https://images.unsplash.com/photo-1581850125208-8eec86ad2fa8?w=300&q=80" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>Laminat / Klik</h3><p style="font-size:11px;">Slidstærkt letvægt</p></div>
                    </div>
                    <div class="card" data-val="parket">
                        <img src="https://images.unsplash.com/photo-1620626011761-996317b8d101?w=300&q=80" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>Ægte Træparket</h3><p style="font-size:11px;">Klassisk og lunt</p></div>
                    </div>
                    <div class="card" data-val="sildeben">
                        <img src="https://images.unsplash.com/photo-1622372736851-9bf6e7da0017?w=300&q=80" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>Sildebensparket</h3><p style="font-size:11px;">Eksklusiv luksus</p></div>
                    </div>
                </div>
            </div>
            <div class="form-group" style="margin-top:20px;">
                <label>2. Hvor stort er arealet? (Antal kvadratmeter)</label>
                <input type="number" min="1" value="20" oninput="updateDetails('amount', parseFloat(this.value))">
            </div>
            <div class="form-group">
                <label>3. Fodlister</label>
                <select onchange="updateDetails('finish', this.value)">
                    <option value="yes">Ja tak, monter matchende lister til det nye gulv</option>
                    <option value="no">Nej, jeg bevarer eller monterer selv lister</option>
                </select>
            </div>
        `;
        projectData.details.amount = 20;
        projectData.details.finish = "yes";
    } 
    else if (category === 'windows' || category === 'doors') {
        const isWindows = category === 'windows';
        html = `
            <div class="form-group">
                <label>1. Vælg udtryk og rammemateriale:</label>
                <div class="card-grid" id="material-cards">
                    <div class="card" data-val="${isWindows ? 'træ' : 'fyr'}">
                        <img src="${isWindows ? 'https://images.unsplash.com/photo-1542361345-89e58247f2d5?w=300&q=80' : 'https://images.unsplash.com/photo-1512404095751-cbbe34743ea4?w=300&q=80'}" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>${isWindows ? 'Rent Træ' : 'Klassisk massiv'}</h3><p style="font-size:11px;">Det originale håndværk</p></div>
                    </div>
                    <div class="card" data-val="${isWindows ? 'træ_alu' : 'mahogni'}">
                        <img src="${isWindows ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80' : 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=300&q=80'}" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>${isWindows ? 'Træ / Alu' : 'Mahogni Træ'}</h3><p style="font-size:11px;">Holdbart & Premium</p></div>
                    </div>
                    <div class="card" data-val="${isWindows ? 'plast' : 'komposit'}">
                        <img src="${isWindows ? 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=300&q=80' : 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&q=80'}" style="height:100px; object-fit:cover; border-bottom:1px solid var(--border);">
                        <div class="card-content" style="padding:12px;"><h3>${isWindows ? 'Vedligeholdelsesfrit PVC' : 'Moderne Komposit'}</h3><p style="font-size:11px;">Ingen maling nødvendig</p></div>
                    </div>
                </div>
            </div>
            <div class="form-group" style="margin-top:20px;">
                <label>2. Hvor mange ${isWindows ? 'vinduer' : 'døre'} drejer opgaven sig cirka om?</label>
                <input type="number" min="1" value="1" oninput="updateDetails('amount', parseFloat(this.value))">
            </div>
            <div class="form-group">
                <label>3. Afslutning ved karmen</label>
                <select onchange="updateDetails('finish', this.value)">
                    <option value="yes">Lav finish (indvendige lister/fuger)</option>
                    <option value="no">Vi ordner selv det indvendige</option>
                </select>
            </div>
        `;
        projectData.details.amount = 1;
        projectData.details.finish = "yes";
    }
    else {
        // Fallback for Terrace & Roof
        html = `
            <div class="form-group">
                <label>Hvad er arealet i kvadratmeter? (Du kan anslå det)</label>
                <input type="number" min="1" value="30" oninput="updateDetails('amount', parseFloat(this.value))">
            </div>
            <div class="form-group">
                <label>Kvalitetsniveau (hvilket materiale skal bruges til ydresiden?)</label>
                <select onchange="updateDetails('material', this.value)">
                    <option value="" disabled selected>Tryk for at se muligheder...</option>
                    <option value="${category==='terrace' ? 'tryk' : 'paptag'}">Standard (${category==='terrace' ? 'Trykimprægneret fyr' : 'Paptag'})</option>
                    <option value="${category==='terrace' ? 'hardwood' : 'tegl'}">Premium (${category==='terrace' ? 'Hårdttræ/Mahogni' : 'Ægte tegl'})</option>
                    <option value="${category==='terrace' ? 'komposit' : 'staal'}">Praktisk (${category==='terrace' ? 'Vedligeholdelsesfri Komposit' : 'Ståltag'})</option>
                </select>
            </div>
        `;
        projectData.details.amount = 30;
    }

    container.innerHTML = html;

    // Vedhæft event listener på de nyligt tilføjede kort (til trin 2 menu)
    const materialCardsContainer = document.getElementById('material-cards');
    if(materialCardsContainer) {
        setupCardClickHandlers(materialCardsContainer, (card) => {
            updateDetails('material', card.dataset.val);
        });
    }
}

function updateDetails(key, value) {
    projectData.details[key] = value;
}

// Navigation
function showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    if(typeof stepNumber === 'number') {
        currentStep = stepNumber;
        updateProgress();
    }
}

function nextStep() {
    if (currentStep === 1 && !projectData.category) return alert('Vejledning: Vælg et overordnet byggeprojekt først for at fortsætte.');
    
    if (currentStep === 2) {
        if (!projectData.details.material && (projectData.category==='floor'||projectData.category==='windows'||projectData.category==='doors')) {
            return alert('Husk at trykke på det materiale (i kortene) du ønsker, før vi fortsætter!');
        }
        if (!projectData.details.material) {
             return alert('Vælg materialetype.');
        }
    }
    
    // Opsaml noter inden vi går til 4
    if (currentStep === 3) {
        projectData.notes = document.getElementById('special-notes').value;
    }

    showStep(currentStep + 1);
}

function prevStep() { showStep(currentStep - 1); }


// ==========================================
// AVANCERET AUTO-BEREGNER (Opmålingsmotoren)
// ==========================================
function calculateEstimate() {
    const cat = projectData.category;
    const rules = PRICES[cat];
    const d = projectData.details;
    
    let base = rules.baseTime;
    let laborCost = 0;
    let materialCost = 0;
    let extraCost = 0;
    
    let breakdownArr = [];

    // Opgavens omfang
    if (cat === 'windows' || cat === 'doors') {
        const matPrice = rules.materials[d.material];
        laborCost = d.amount * rules.installationPerUnit;
        materialCost = d.amount * matPrice;
        breakdownArr.push(`Demontering og montage af ${d.amount} stk. element(er)`);
        breakdownArr.push(`Valgt kvalitetsemne: ${d.material}`);
        
        if (d.finish === 'yes') {
            extraCost += (d.amount * rules.finishIndvendig);
            breakdownArr.push(`Fuld overlevering med indvendig finish (fuger og gerigter)`);
        } else {
             breakdownArr.push(`Kunden afslutter selv karm og lister indvendigt (giver besparelse)`);
        }
    } 
    else if (cat === 'floor') {
        const matPrice = rules.materials[d.material] || 400;
        laborCost = d.amount * rules.installationPerSqm;
        materialCost = d.amount * matPrice;
        breakdownArr.push(`Slidstærk lægning af ${d.amount} m² gulv af typen '${d.material}'`);
        
        if (d.finish === 'yes') {
            extraCost += (d.amount * rules.skirtingBoardPerSqm);
            breakdownArr.push(`Tilskæring og montering af fejelister / fodpaneler rundt`);
        }
    }
    else {
        // Tag og Terrasse
        const matPrice = rules.materials[d.material] || rules.materials["tryk"] || rules.materials["paptag"];
        laborCost = d.amount * rules.installationPerSqm;
        materialCost = d.amount * matPrice;
        breakdownArr.push(`Konstruktion af ${d.amount} m² ${cat==='terrace'?'terrasse dæk':'nyt tag'}`);
        breakdownArr.push(`Materialehåndtering for type: ${d.material}`);
    }

    if(projectData.notes.trim() !== "") {
        breakdownArr.push(`Håndværker tager særligt højde for dine indsendte noter`);
    }

    // Udregning
    const strictPrice = base + laborCost + materialCost + extraCost;
    
    // Spærring / buffer
    const minPrice = Math.floor((strictPrice * 0.90) / 1000) * 1000;
    const maxPrice = Math.ceil((strictPrice * 1.15) / 1000) * 1000;
    
    const fmtMin = new Intl.NumberFormat('da-DK').format(minPrice);
    const fmtMax = new Intl.NumberFormat('da-DK').format(maxPrice);
    
    document.getElementById('estimate-price').innerHTML = `${fmtMin} - ${fmtMax} DKK`;
    
    let listHTML = "";
    breakdownArr.forEach(txt => { listHTML += `<li>${txt}</li>`; });
    document.getElementById('breakdown-list').innerHTML = listHTML;

    showStep('result');
}

function requestFormalQuote() {
    alert('BING! William modtager nu dine billeder, dine krav, målene ('+projectData.details.amount+'), og dine unikke noter: "'+projectData.notes.substring(0,25)+'..." . Han ringer dig op med et uforpligtende konkret tilbud!');
}
function resetWizard() {
    window.location.reload();
}
