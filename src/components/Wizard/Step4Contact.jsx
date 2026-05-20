import React, { useState, useRef, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';

const Step4Contact = ({ calculateEstimate, prevStep, prefillData }) => {
    const [email, setEmail] = useState(prefillData?.email || '');
    const [fullName, setFullName] = useState(prefillData?.fullName || '');
    const [street, setStreet] = useState(prefillData?.street || '');
    const [zip, setZip] = useState(prefillData?.zip || '');
    const [city, setCity] = useState(prefillData?.city || '');
    const [phone, setPhone] = useState(prefillData?.phone || '');
    const [acceptedTerms, setAcceptedTerms] = useState(!!prefillData); // Accept default if prefilled
    
    const nameInputRef = useRef(null);

    useEffect(() => {
        // Autofokus på navn feltet når trinnet indlæses
        if (nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, []);

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
    
    const handleCalculate = () => {
        if (fullName.trim().length < 2) {
            toast.error("Indtast venligst dit fulde navn.");
            return;
        }
        if (street.trim().length < 3) {
            toast.error("Indtast venligst din adresse.");
            return;
        }
        if (zip.length !== 4) {
            toast.error("Indtast venligst et gyldigt dansk postnummer (4 cifre).");
            return;
        }
        if (city.trim().length < 2) {
            toast.error("Indtast venligst din by.");
            return;
        }
        if (phone.replace(/\s+/g, '').length < 8) {
            toast.error("Indtast venligst et gyldigt telefonnummer.");
            return;
        }
        if (!emailRegex.test(email)) {
            toast.error("Indtast venligst en gyldig e-mailadresse.");
            return;
        }
        if (!acceptedTerms) {
            toast.error("Du skal acceptere betingelserne for at fortsætte.");
            return;
        }

        calculateEstimate({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            street: street.trim(),
            zip: zip.trim(),
            city: city.trim()
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCalculate();
        }
    };

    return (
        <section className="wizard-step active contact-step-section">
            <div className="step-header">
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>Kontaktoplysninger</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '24px' }}>For at jeg kan kontakte dig med dit personlige overslag, skal jeg bruge et par oplysninger om dig.</p>
            </div>
            
            <div className="form-group contact-form-card" style={{ marginBottom: '32px', background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="form-grid">
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Fulde navn <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            type="text" 
                            name="name"
                            autoComplete="name"
                            placeholder="Indtast dit fulde navn" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            ref={nameInputRef}
                            onKeyDown={handleKeyDown}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <div className="form-group" style={{ position: 'relative', marginBottom: '20px' }}>
                        <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Vejnavn og Husnummer <span style={{ color: '#ef4444' }}>*</span></label>
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
                                    name="address"
                                    autoComplete="street-address"
                                    placeholder="Søg på din adresse (fx Skovvejen 15)" 
                                    value={street} 
                                    onChange={(e) => setStreet(e.target.value)} 
                                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--accent)', fontSize: '1rem', background: '#f0f9ff', transition: 'var(--transition-fast)' }}
                                    onFocus={(e) => { e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
                                    onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') e.preventDefault();
                                    }}
                                />
                            </Autocomplete>
                        ) : (
                            <input 
                                type="text" 
                                name="address"
                                autoComplete="street-address"
                                placeholder="Skovvejen 15" 
                                value={street} 
                                onChange={(e) => setStreet(e.target.value)} 
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#10b981', position: 'absolute', bottom: '-22px', left: '4px', fontWeight: '500' }}>✓ Google Maps integreret for hurtig indtastning</span>
                    </div>
                    <div className="form-grid dual" style={{ marginBottom: '20px', marginTop: '28px' }}>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Postnummer <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                name="postal-code"
                                autoComplete="postal-code"
                                placeholder="8000" 
                                value={zip} 
                                onChange={(e) => setZip(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                maxLength="4" 
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>By <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                name="address-level2"
                                autoComplete="address-level2"
                                placeholder="Aarhus C" 
                                value={city} 
                                onChange={(e) => setCity(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>
                    <div className="form-grid dual" style={{ marginBottom: 0 }}>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Telefon <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="tel" 
                                name="tel"
                                autoComplete="tel"
                                placeholder="+45 20 30 40 50" 
                                value={phone} 
                                onChange={handlePhoneChange} 
                                onKeyDown={handleKeyDown}
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>E-mail <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="email" 
                                name="email"
                                autoComplete="email"
                                placeholder="din@mail.dk" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', transition: 'var(--transition-fast)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* NY: GDPR Checkbox før actions */}
            <div className="gdpr-checkbox-container" style={{ marginTop: '24px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', background: 'var(--bg-muted)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }} onClick={() => setAcceptedTerms(!acceptedTerms)}>
                <input 
                    type="checkbox" 
                    checked={acceptedTerms} 
                    onChange={() => setAcceptedTerms(!acceptedTerms)}
                    style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Jeg accepterer, at mine indtastede oplysninger gemmes og behandles med det formål at modtage et estimat, samt at jeg kan blive kontaktet af det pågældende tømrerfirma i forbindelse med min forespørgsel.
                </p>
            </div>
            
            <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button className="wizard-btn wizard-btn-secondary" onClick={prevStep}>← Tilbage</button>
                <button className="wizard-btn wizard-btn-primary" onClick={handleCalculate} style={{ boxShadow: '0 10px 25px rgba(59,130,246,0.3)' }}>
                    Vis Mit Overslag →
                </button>
            </div>
        </section>
    );
};

export default Step4Contact;
