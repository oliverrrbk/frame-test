import React, { useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';

const Step4Contact = ({ calculateEstimate, prevStep }) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [street, setStreet] = useState('');
    const [zip, setZip] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false); // NY: GDPR State
    
    const [autocomplete, setAutocomplete] = useState(null);
    const onLoad = (autoC) => setAutocomplete(autoC);
    
    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place && place.address_components) {
                let route = '';
                let streetNumber = '';
                let postalCode = '';
                let locality = '';
                
                place.address_components.forEach(component => {
                    const types = component.types;
                    if (types.includes('route')) route = component.long_name;
                    if (types.includes('street_number')) streetNumber = component.long_name;
                    if (types.includes('postal_code')) postalCode = component.long_name;
                    if (types.includes('locality')) locality = component.long_name;
                    if (types.includes('postal_town') && !locality) locality = component.long_name;
                });
                
                if (route) setStreet(`${route} ${streetNumber}`.trim());
                if (postalCode) setZip(postalCode);
                if (locality) setCity(locality);
            } else if (place && place.name) {
                setStreet(place.name); 
            }
        }
    };

    // NY: Smart formatering af telefonnummer (som i Register.jsx)
    const handlePhoneChange = (e) => {
        let val = e.target.value.replace(/[^\d+]/g, '');
        let hasPlus45 = val.startsWith('+45');
        let numbersOnly = hasPlus45 ? val.slice(3) : val;
        let blocks = numbersOnly.match(/.{1,2}/g) || [];
        let result = blocks.join(' ');
        if (hasPlus45) result = result ? `+45 ${result}` : '+45';
        setPhone(result);
    };

    // NY: Strengere validering inkl. regex og GDPR-tjek
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email) && fullName.length > 2 && phone.length > 7 && street.length > 3 && zip.length === 4 && acceptedTerms;

    const handleCalculate = () => {
        calculateEstimate({
            fullName,
            email,
            phone,
            street,
            zip,
            city
        });
    };

    return (
        <section className="wizard-step active">
            <div className="step-header">
                <h2>Kontaktoplysninger</h2>
                <p>For at jeg kan kontakte dig, skal jeg bruge nogle oplysninger omkring dig.</p>
            </div>
            
            <div className="form-grid">
                <div className="form-group">
                    <label>Fulde navn <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" placeholder="Indtast fulde navn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                    <label>Vejnavn og Husnummer <span style={{ color: '#ef4444' }}>*</span></label>
                    {window.google && window.google.maps && window.google.maps.places ? (
                        <Autocomplete 
                            onLoad={onLoad} 
                            onPlaceChanged={onPlaceChanged} 
                            options={{ 
                                componentRestrictions: { country: "dk" },
                                types: ['address'],
                                fields: ['address_components', 'formatted_address', 'name']
                            }}
                        >
                            <input 
                                type="text" 
                                placeholder="Søg på din adresse (fx Skovvejen 15)" 
                                value={street} 
                                onChange={(e) => setStreet(e.target.value)} 
                                style={{ width: '100%', border: '2px solid #3b82f6', background: '#f8fafc', fontWeight: '500' }}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') e.preventDefault();
                                }}
                            />
                        </Autocomplete>
                    ) : (
                        <input type="text" placeholder="Skovvejen 15" value={street} onChange={(e) => setStreet(e.target.value)} />
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#10b981', position: 'absolute', bottom: '-20px', left: '4px' }}>✓ Google Maps integreret</span>
                </div>
                <div className="form-grid dual" style={{ marginBottom: 0, marginTop: '20px' }}>
                    <div className="form-group">
                        <label>Postnummer <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" placeholder="8000" value={zip} onChange={(e) => setZip(e.target.value)} maxLength="4" />
                    </div>
                    <div className="form-group">
                        <label>By <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" placeholder="Aarhus C" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                </div>
                <div className="form-grid dual" style={{ marginBottom: 0, marginTop: '20px' }}>
                    <div className="form-group">
                        <label>Telefon <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="tel" placeholder="+45 20 30 40 50" value={phone} onChange={handlePhoneChange} />
                    </div>
                    <div className="form-group">
                        <label>E-mail <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>
            </div>
            
            {/* NY: GDPR Checkbox før actions */}
            <div style={{ marginTop: '20px', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }} onClick={() => setAcceptedTerms(!acceptedTerms)}>
                <input 
                    type="checkbox" 
                    checked={acceptedTerms} 
                    onChange={() => setAcceptedTerms(!acceptedTerms)}
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                />
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                    Jeg accepterer, at mine indtastede oplysninger gemmes og behandles med det formål at modtage et estimat, samt at jeg kan blive kontaktet af det pågældende tømrerfirma i forbindelse med min forespørgsel.
                </p>
            </div>
            <div className="actions">
                <button className="btn-secondary" onClick={prevStep}>Tilbage</button>
                <button className="btn-primary" onClick={handleCalculate} disabled={!isValid}>Vis Mit Overslag</button>
            </div>
        </section>
    );
};

export default Step4Contact;
