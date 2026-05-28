import React, { useState, useRef, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';

const Step4Contact = ({ calculateEstimate, prevStep, prefillData }) => {
    const [email, setEmail] = useState(prefillData?.email || '');
    const [fullName, setFullName] = useState(prefillData?.fullName || '');
    const [street, setStreet] = useState(prefillData?.street || '');
    const [zip, setZip] = useState(prefillData?.zip || '');
    const [city, setCity] = useState(prefillData?.city || '');
    const [phone, setPhone] = useState(prefillData?.phone || '');
    const [acceptedTerms, setAcceptedTerms] = useState(!!prefillData); // Accept default if prefilled
    
    const nameInputRef = useRef(null);
    const inputRefs = useRef({
        address: null,
        zip: null,
        city: null,
        tel: null,
        email: null,
        gdpr: null
    });

    useEffect(() => {
        // Autofokus på navn feltet når trinnet indlæses
        if (nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (zip.length === 4 && /^\d+$/.test(zip)) {
            fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Not found');
                })
                .then(data => {
                    if (data && data.navn) {
                        setCity(data.navn);
                    }
                })
                .catch(() => {
                    // Ignorer fejl, hvis postnummeret ikke findes
                });
        }
    }, [zip]);

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

                // Auto-scroll ned til postnummer feltet (kun på mobil)
                scrollToNext('zip');
            } else if (place && place.name) {
                setStreet(place.name); 
                scrollToNext('zip');
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

    const scrollToNext = (fieldId) => {
        if (window.innerWidth >= 768) return; // Kun auto-scroll på mobil/tablet
        
        setTimeout(() => {
            const el = inputRefs.current[fieldId];
            if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 120; // 120px offset for kontekst
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 300);
    };

    const handleKeyDown = (e, nextFieldId = null) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                scrollToNext(nextFieldId);
            } else {
                handleCalculate();
            }
        }
    };

    return (
        <section className="wizard-step active contact-step-section" style={{ padding: '0 12px' }}>
            <style>
                {`
                .pac-container::after, .pac-logo::after {
                    display: none !important;
                    background-image: none !important;
                }
                .premium-contact-card {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);
                    padding: 32px;
                    margin-bottom: 32px;
                }
                .premium-input {
                    width: 100%;
                    padding: 16px 20px;
                    border-radius: 16px;
                    border: 2px solid #e2e8f0;
                    font-size: 1rem;
                    background: #f8fafc;
                    color: #0f172a;
                    font-weight: 500;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    min-height: 56px;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .premium-input:focus {
                    background: #ffffff;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
                    outline: none;
                }
                .premium-input::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }
                .premium-label {
                    font-weight: 700;
                    display: block;
                    margin-bottom: 10px;
                    font-size: 0.95rem;
                    color: #334155;
                    letter-spacing: -0.01em;
                }
                .premium-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 24px;
                }
                .premium-grid-dual {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 24px;
                }
                .premium-gdpr {
                    background: linear-gradient(145deg, #f8fafc, #f1f5f9);
                    border: 1px solid #e2e8f0;
                    padding: 20px;
                    border-radius: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .premium-gdpr:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                .premium-checkbox {
                    width: 24px;
                    height: 24px;
                    margin-top: 2px;
                    cursor: pointer;
                    accent-color: #3b82f6;
                    flex-shrink: 0;
                }
                @media (max-width: 600px) {
                    .premium-contact-card {
                        padding: 24px 20px;
                        border-radius: 20px;
                    }
                    .premium-input {
                        padding: 14px 16px;
                        font-size: 16px; /* Forhindrer iOS zoom */
                        min-height: 52px;
                    }
                    .premium-gdpr {
                        padding: 16px;
                        border-radius: 16px;
                    }
                    .step-header h2 {
                        font-size: 1.7rem !important;
                    }
                    .step-header p {
                        font-size: 1rem !important;
                    }
                }
                `}
            </style>
            <div className="step-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>Kontaktoplysninger</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '24px' }}>For at jeg kan kontakte dig med dit personlige overslag, skal jeg bruge et par oplysninger om dig.</p>
            </div>
            
            <div className="premium-contact-card">
                <div className="premium-grid">
                    <div>
                        <label className="premium-label">Fulde navn <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            type="text" 
                            name="name"
                            autoComplete="name"
                            placeholder="Indtast dit fulde navn" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            ref={nameInputRef}
                            onKeyDown={(e) => handleKeyDown(e, 'address')}
                            className="premium-input"
                        />
                    </div>
                    
                    <div style={{ position: 'relative' }} ref={el => inputRefs.current.address = el}>
                        <label className="premium-label">Vejnavn og Husnummer <span style={{ color: '#ef4444' }}>*</span></label>
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
                                    className="premium-input"
                                    style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}
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
                                onKeyDown={(e) => handleKeyDown(e, 'zip')}
                                className="premium-input"
                            />
                        )}

                    </div>

                    <div className="premium-grid-dual" style={{ marginTop: '12px' }}>
                        <div ref={el => inputRefs.current.zip = el}>
                            <label className="premium-label">Postnummer <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                name="postal-code"
                                autoComplete="postal-code"
                                placeholder="8000" 
                                value={zip} 
                                onChange={(e) => setZip(e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'city')}
                                maxLength="4" 
                                className="premium-input"
                            />
                        </div>
                        <div ref={el => inputRefs.current.city = el}>
                            <label className="premium-label">By <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                name="address-level2"
                                autoComplete="address-level2"
                                placeholder="Aarhus C" 
                                value={city} 
                                onChange={(e) => setCity(e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'tel')}
                                className="premium-input"
                            />
                        </div>
                    </div>

                    <div className="premium-grid-dual">
                        <div ref={el => inputRefs.current.tel = el}>
                            <label className="premium-label">Telefon <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="tel" 
                                name="tel"
                                autoComplete="tel"
                                placeholder="+45 20 30 40 50" 
                                value={phone} 
                                onChange={handlePhoneChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'email')}
                                className="premium-input"
                            />
                        </div>
                        <div ref={el => inputRefs.current.email = el}>
                            <label className="premium-label">E-mail <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="email" 
                                name="email"
                                autoComplete="email"
                                placeholder="din@mail.dk" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'gdpr')}
                                className="premium-input"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* NY: GDPR Checkbox før actions */}
            <div className="premium-gdpr" ref={el => inputRefs.current.gdpr = el} onClick={() => setAcceptedTerms(!acceptedTerms)}>
                <input 
                    type="checkbox" 
                    checked={acceptedTerms} 
                    onChange={() => setAcceptedTerms(!acceptedTerms)}
                    className="premium-checkbox"
                />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
                    Jeg accepterer, at mine indtastede oplysninger gemmes og behandles med det formål at modtage et estimat, samt at jeg kan blive kontaktet af det pågældende tømrerfirma i forbindelse med min forespørgsel.
                </p>
            </div>
            
            <div className="actions" style={{ display: 'flex', flexDirection: 'column-reverse', gap: '16px', marginTop: '40px' }}>
                {/* På mobil vendes retningen om med column-reverse så "Vis Mit Overslag" er øverst, men på desktop skal de stå ved siden af hinanden */}
                <style>
                    {`
                    @media (min-width: 600px) {
                        .actions {
                            flex-direction: row !important;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .wizard-btn-primary {
                            width: auto !important;
                        }
                        .wizard-btn-secondary {
                            width: auto !important;
                        }
                    }
                    .wizard-btn-primary {
                        width: 100%;
                        justify-content: center;
                        padding: 18px !important;
                        font-size: 1.1rem !important;
                        border-radius: 16px !important;
                    }
                    .wizard-btn-secondary {
                        width: 100%;
                        justify-content: center;
                        padding: 16px !important;
                        border-radius: 16px !important;
                    }
                    `}
                </style>
                <button className="wizard-btn wizard-btn-secondary" onClick={prevStep}>← Tilbage til opgaver</button>
                <button className="wizard-btn wizard-btn-primary" onClick={handleCalculate} style={{ boxShadow: '0 10px 30px -10px rgba(59,130,246,0.5)' }}>
                    Vis Mit Prisoverslag Nu →
                </button>
            </div>
        </section>
    );
};

export default Step4Contact;
