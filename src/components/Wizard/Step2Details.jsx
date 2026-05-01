import React from 'react';

const Step2Details = ({ category, details, updateDetails, nextStep, prevStep }) => {
    const titleMap = {
        windows: "Detaljer om dine ruder",
        doors: "Detaljer om dine døre",
        floor: "Specificer dit drømmegulv",
        terrace: "Opbygning af din terrasse",
        roof: "Information om dit tag"
    };

    const isWindows = category === 'windows';

    const renderFloorFields = () => (
        <>
            <div className="form-group">
                <label>1. Tryk på det gulvmateriale du ønsker lagt:</label>
                <div className="card-grid">
                    <div className={`card ${details.material === 'laminat' ? 'selected' : ''}`} onClick={() => updateDetails('material', 'laminat')}>
                        <img src="https://images.unsplash.com/photo-1581850125208-8eec86ad2fa8?w=300&q=80" style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>Laminat / Klik</h3><p style={{fontSize:'11px'}}>Slidstærkt letvægt</p></div>
                    </div>
                    <div className={`card ${details.material === 'parket' ? 'selected' : ''}`} onClick={() => updateDetails('material', 'parket')}>
                        <img src="https://images.unsplash.com/photo-1620626011761-996317b8d101?w=300&q=80" style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>Ægte Træparket</h3><p style={{fontSize:'11px'}}>Klassisk og lunt</p></div>
                    </div>
                    <div className={`card ${details.material === 'sildeben' ? 'selected' : ''}`} onClick={() => updateDetails('material', 'sildeben')}>
                        <img src="https://images.unsplash.com/photo-1622372736851-9bf6e7da0017?w=300&q=80" style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>Sildebensparket</h3><p style={{fontSize:'11px'}}>Eksklusiv luksus</p></div>
                    </div>
                </div>
            </div>
            <div className="form-group" style={{marginTop:'20px'}}>
                <label>2. Hvor stort er arealet? (Antal kvadratmeter)</label>
                <input type="number" min="1" value={details.amount || 20} onChange={(e) => updateDetails('amount', parseFloat(e.target.value))} />
            </div>
            <div className="form-group">
                <label>3. Fodlister</label>
                <select value={details.finish || 'yes'} onChange={(e) => updateDetails('finish', e.target.value)}>
                    <option value="yes">Ja tak, monter matchende lister til det nye gulv</option>
                    <option value="no">Nej, jeg bevarer eller monterer selv lister</option>
                </select>
            </div>
        </>
    );

    const renderWindowsDoorsFields = () => (
        <>
            <div className="form-group">
                <label>1. Vælg udtryk og rammemateriale:</label>
                <div className="card-grid">
                    <div className={`card ${details.material === (isWindows ? 'træ' : 'fyr') ? 'selected' : ''}`} onClick={() => updateDetails('material', isWindows ? 'træ' : 'fyr')}>
                        <img src={isWindows ? 'https://images.unsplash.com/photo-1542361345-89e58247f2d5?w=300&q=80' : 'https://images.unsplash.com/photo-1512404095751-cbbe34743ea4?w=300&q=80'} style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>{isWindows ? 'Rent Træ' : 'Klassisk massiv'}</h3><p style={{fontSize:'11px'}}>Det originale håndværk</p></div>
                    </div>
                    <div className={`card ${details.material === (isWindows ? 'træ_alu' : 'mahogni') ? 'selected' : ''}`} onClick={() => updateDetails('material', isWindows ? 'træ_alu' : 'mahogni')}>
                        <img src={isWindows ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80' : 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=300&q=80'} style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>{isWindows ? 'Træ / Alu' : 'Mahogni Træ'}</h3><p style={{fontSize:'11px'}}>Holdbart & Premium</p></div>
                    </div>
                    <div className={`card ${details.material === (isWindows ? 'plast' : 'komposit') ? 'selected' : ''}`} onClick={() => updateDetails('material', isWindows ? 'plast' : 'komposit')}>
                        <img src={isWindows ? 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=300&q=80' : 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&q=80'} style={{height:'100px', objectFit:'cover', borderBottom:'1px solid var(--border)'}} alt="" />
                        <div className="card-content" style={{padding:'12px'}}><h3>{isWindows ? 'Vedligeholdelsesfrit PVC' : 'Moderne Komposit'}</h3><p style={{fontSize:'11px'}}>Ingen maling nødvendig</p></div>
                    </div>
                </div>
            </div>
            <div className="form-group" style={{marginTop:'20px'}}>
                <label>2. Hvor mange {isWindows ? 'vinduer' : 'døre'} drejer opgaven sig cirka om?</label>
                <input type="number" min="1" value={details.amount || 1} onChange={(e) => updateDetails('amount', parseFloat(e.target.value))} />
            </div>
            <div className="form-group">
                <label>3. Afslutning ved karmen</label>
                <select value={details.finish || 'yes'} onChange={(e) => updateDetails('finish', e.target.value)}>
                    <option value="yes">Lav finish (indvendige lister/fuger)</option>
                    <option value="no">Vi ordner selv det indvendige</option>
                </select>
            </div>
        </>
    );

    const renderGenericFields = () => (
        <>
            <div className="form-group">
                <label>Hvad er arealet i kvadratmeter? (Du kan anslå det)</label>
                <input type="number" min="1" value={details.amount || 30} onChange={(e) => updateDetails('amount', parseFloat(e.target.value))} />
            </div>
            <div className="form-group">
                <label>Kvalitetsniveau (hvilket materiale skal bruges til ydresiden?)</label>
                <select value={details.material || ''} onChange={(e) => updateDetails('material', e.target.value)}>
                    <option value="" disabled>Tryk for at se muligheder...</option>
                    <option value={category==='terrace' ? 'tryk' : 'paptag'}>Standard ({category==='terrace' ? 'Trykimprægneret fyr' : 'Paptag'})</option>
                    <option value={category==='terrace' ? 'hardwood' : 'tegl'}>Premium ({category==='terrace' ? 'Hårdttræ/Mahogni' : 'Ægte tegl'})</option>
                    <option value={category==='terrace' ? 'komposit' : 'staal'}>Praktisk ({category==='terrace' ? 'Vedligeholdelsesfri Komposit' : 'Ståltag'})</option>
                </select>
            </div>
        </>
    );

    return (
        <section className="wizard-step active">
            <div className="step-header">
                <h2>{titleMap[category] || "Byg dit projekt"}</h2>
                <p>Vælg materialetype og mængde, så vi kan beregne prisen.</p>
            </div>
            
            <div className="form-grid">
                {category === 'floor' && renderFloorFields()}
                {(category === 'windows' || category === 'doors') && renderWindowsDoorsFields()}
                {(category === 'terrace' || category === 'roof') && renderGenericFields()}
            </div>

            <div className="actions">
                <button className="btn-secondary" onClick={prevStep}>Tilbage</button>
                <button className="btn-primary" onClick={nextStep}>Fortsæt</button>
            </div>
        </section>
    );
};

export default Step2Details;
