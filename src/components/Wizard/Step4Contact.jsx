import React, { useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';

const Step4Contact = ({ calculateEstimate, prevStep }) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [street, setStreet] = useState('');
    const [zip, setZip] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    
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
                setStreet(place.name); // Fallback hvis de bare trykker enter uden at vælge
            }
        }
    };

    const isValid = email.length >= 5 && email.includes('@') && fullName.length > 2 && phone.length > 7 && street.length > 3 && zip.length === 4;

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
                    <label>Fulde navn</label>
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
                                    if(e.key === 'Enter') e.preventDefault(); // Undgå submit af form på Enter (bedre UX)
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
                        <label>Telefon</label>
                        <input type="tel" placeholder="Indtast telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>E-mail</label>
                        <input type="email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>
            </div>
            
            <div className="actions">
                <button className="btn-secondary" onClick={prevStep}>Tilbage</button>
                <button className="btn-primary" onClick={handleCalculate} disabled={!isValid}>Vis Mit Overslag</button>
            </div>
        </section>
    );
};

export default Step4Contact;
