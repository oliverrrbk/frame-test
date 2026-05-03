import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Wrench, UserPlus, Building, FileText, Mail, Lock, User, Phone, MapPin, CheckSquare, Square } from 'lucide-react';
import { Autocomplete } from '@react-google-maps/api';
import toast from 'react-hot-toast';

const Register = ({ setSession }) => {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState('');
    const [cvr, setCvr] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [address, setAddress] = useState('');
    const [isAddressValid, setIsAddressValid] = useState(false);
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [selectedTier, setSelectedTier] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const [autocomplete, setAutocomplete] = useState(null);

    const onLoad = (autoC) => setAutocomplete(autoC);
    
    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            // Hvis Google returnerer en 'formatted_address' eller et 'name' som ikke bare er den rå tekst,
            // er det et ægte sted valgt fra listen.
            if (place && (place.formatted_address || place.address_components)) {
                setAddress(place.formatted_address || place.name);
                setIsAddressValid(true);
            } else {
                setIsAddressValid(false);
            }
        }
    };

    const handlePhoneChange = (e) => {
        let val = e.target.value.replace(/[^\d+]/g, '');
        let hasPlus45 = val.startsWith('+45');
        let numbersOnly = hasPlus45 ? val.slice(3) : val;
        let blocks = numbersOnly.match(/.{1,2}/g) || [];
        let result = blocks.join(' ');
        if (hasPlus45) result = result ? `+45 ${result}` : '+45';
        setPhone(result);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!acceptedTerms) {
            setErrorMsg("Du skal acceptere handelsbetingelserne for at oprette din portal.");
            return;
        }

        if (!selectedTier) {
            setErrorMsg("Du skal vælge en pakke (Basis, Standard eller Enterprise) for at fortsætte.");
            return;
        }

        if (address.length < 5) {
            setErrorMsg("Du skal indtaste en gyldig adresse, så systemet kan udregne køreafstande.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        // 1. Opret bruger i Supabase Auth og GEM data i "rygsækken" (user_metadata)
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    company_name: companyName,
                    cvr: cvr,
                    owner_name: ownerName,
                    address: address,
                    phone: phone,
                    email: email,
                    tier: selectedTier
                }
            }
        });

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            // NOTE: Vi behøver ikke længere at kæmpe imod RLS ved at lave direkte database-inserts 
            // under oprettelsen her. Dashboard.jsx aflæser user_metadata og bygger profilen perfekt, 
            // næste gang man lander på appen (sikkert), selv hvis man ventede på en email confirmation.
            
            // Send notifikation til Mads (Admin)
            import('../../utils/sendEmail').then(({ sendEmail }) => {
                import('../../utils/emailTemplates').then(({ getAdminNewSignupTemplate }) => {
                    sendEmail({
                        to: 'mbc@bisoncompany.dk',
                        subject: `🎉 Ny Tømrer: ${companyName}`,
                        html: getAdminNewSignupTemplate(companyName, cvr, ownerName, email, phone),
                        fromName: 'Bison Frame System'
                    }).catch(err => console.error("Fejl ved admin mail:", err));
                });
            });

            // Webhook kald til CRM systemet
            try {
                let price = 0;
                let productName = "Basis";
                if (selectedTier === 'basis') { price = 390; productName = "Basis"; }
                if (selectedTier === 'standard') { price = 790; productName = "Professionel"; }
                if (selectedTier === 'enterprise') { price = 1890; productName = "Enterprise"; }
                
                fetch('https://www.bisoncrm.dk/api/webhooks/frame-signup', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer bf_sec_8f92a4c10e39b7d6a5f4c3e2d1',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        companyName: companyName,
                        contactName: ownerName,
                        email: email,
                        phone: phone,
                        product: productName,
                        price: price
                    })
                }).catch(err => console.error('Fejl ved CRM webhook:', err));
            } catch (err) {
                console.error('Fejl ved CRM webhook try/catch:', err);
            }
            
            if (data.session) {
                localStorage.setItem('dashboard_active_tab', 'overview');
                setSession(data.session);
                navigate('/dashboard');
            } else {
                setIsSuccess(true);
            }
        }
        
        setLoading(false);
    };

    if (isSuccess) {
        return (
            <div className="login-container" style={{ padding: '40px 10px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="login-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Mail size={40} />
                    </div>
                    <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Tjek din e-mail</h2>
                    <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
                        Tak for din oprettelse! Vi har sendt en bekræftelsesmail til <strong>{email}</strong>. Klik på linket i mailen for at aktivere din platform.
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '32px' }}>
                        Husk at tjekke dit spam-filter, hvis du ikke kan finde den.
                    </p>
                    <Link to="/" className="btn-primary" style={{ background: '#3b82f6', textDecoration: 'none', display: 'inline-block', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}>
                        Gå tilbage til login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container" style={{ padding: '40px 10px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-card" style={{ maxWidth: '550px', width: '100%' }}>
                <div className="login-header">
                    <div className="login-brand" style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <Wrench size={32} className="brand-icon" style={{ color: '#10b981' }} />
                    </div>
                    <h2>Opret tømrer-system</h2>
                    <p className="text-muted">Få fuld adgang til Bison Frame på under 1 minut.</p>
                </div>

                <form onSubmit={handleRegister} className="login-form">
                    {errorMsg && <div className="login-error" style={{ marginBottom: '20px' }}>{errorMsg}</div>}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="input-group">
                            <label>Firmanavn *</label>
                            <div style={{ position: 'relative' }}>
                                <Building size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                <input 
                                    type="text" 
                                    placeholder="Dit Firma ApS"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>CVR-nummer *</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                <input 
                                    type="text" 
                                    placeholder="12345678"
                                    value={cvr}
                                    onChange={(e) => setCvr(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Ejer / Kontaktperson *</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                <input 
                                    type="text" 
                                    placeholder="Jens Jensen"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Firmaadresse *</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                {window.google && window.google.maps && window.google.maps.places ? (
                                    <Autocomplete 
                                        onLoad={onLoad} 
                                        onPlaceChanged={onPlaceChanged} 
                                        options={{ 
                                            componentRestrictions: { country: "dk" },
                                            fields: ['formatted_address', 'name']
                                        }}
                                    >
                                        <input 
                                            type="text" 
                                            placeholder="Søg på firmaets adresse"
                                            value={address}
                                            onChange={(e) => {
                                                setAddress(e.target.value);
                                                setIsAddressValid(false);
                                            }}
                                            style={{ paddingLeft: '36px', width: '100%', border: '1px solid #e8e6e1' }}
                                            required 
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') e.preventDefault();
                                            }}
                                        />
                                    </Autocomplete>
                                ) : (
                                    <input 
                                        type="text" 
                                        placeholder="Byggevej 12, 1234 Byen"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        style={{ paddingLeft: '36px' }}
                                        required 
                                    />
                                )}
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Telefonnummer *</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                <input 
                                    type="tel" 
                                    placeholder="+45 12 34 56 78"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    style={{ paddingLeft: '36px' }}
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className="input-group">
                            <label>Bruger E-mail (og Faktura) *</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                                <input 
                                    type="email" 
                                    placeholder="kontakt@firma.dk"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label>Vælg Adgangskode (Min. 6 tegn) *</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#9ca3af' }} />
                            <input 
                                type="password" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                style={{ paddingLeft: '36px' }}
                                required 
                            />
                        </div>
                    </div>

                    <div className="input-group" style={{ marginTop: '20px' }}>
                        <label>Vælg din pakke (14 dages gratis prøveperiode) *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                            {[
                                { id: 'basis', name: 'Basis', price: '390 kr. ex. moms' },
                                { id: 'standard', name: 'Professionel', price: '790 kr. ex. moms' },
                                { id: 'enterprise', name: 'Enterprise', price: '1.890 kr. ex. moms' }
                            ].map(tier => (
                                <div 
                                    key={tier.id}
                                    onClick={() => setSelectedTier(tier.id)}
                                    style={{
                                        border: `2px solid ${selectedTier === tier.id ? '#10b981' : '#e8e6e1'}`,
                                        borderRadius: '8px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        backgroundColor: selectedTier === tier.id ? '#ecfdf5' : '#fff',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', color: selectedTier === tier.id ? '#065f46' : '#374151', fontSize: '14px' }}>{tier.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{tier.price} /md</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="terms-checkbox" style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }} onClick={() => setAcceptedTerms(!acceptedTerms)}>
                        <div style={{ color: acceptedTerms ? '#10b981' : '#9ca3af', marginTop: '2px' }}>
                            {acceptedTerms ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                            Jeg accepterer hermed <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'underline' }}>handelsbetingelserne</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'underline' }}>Databehandleraftalen (DPA)</a>, og bekræfter, at alle angivne oplysninger er korrekte, samt at Bison Frame optræder som databehandler for mine kunde-estimater.
                        </p>
                    </div>
                    
                    <button type="submit" disabled={loading} className="btn-primary login-btn" style={{ background: '#10b981', width: '100%' }}>
                        {loading ? 'Opretter system...' : (
                            <>
                                <UserPlus size={18} />
                                Start Din Platform Nu
                            </>
                        )}
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '25px' }}>
                        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'inline-block', padding: '5px' }}>
                            Har du allerede et system? Log ind her
                        </Link>
                    </div>
                </form>
            </div>
            
            <div className="login-footer" style={{ marginTop: '20px', color: '#6b7280' }}>
                <p>Opret nemt din platform. Data lagres krypteret i EU.</p>
            </div>
        </div>
    );
};

export default Register;
