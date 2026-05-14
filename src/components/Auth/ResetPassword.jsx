import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Wrench, Lock } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Supabase læser automatisk #access_token fra URL'en,
        // så sessionen burde være aktiv nu, hvis linket var gyldigt.
        // Vi tjekker bare om der er et hash i URL'en
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) {
            // Det kan være de allerede er logget ind, men hvis ikke:
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) {
                    setErrorMsg("Ugyldigt eller udløbet link. Prøv at anmode om et nyt nulstillings-link.");
                }
            });
        }
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        
        if (password.length < 6) {
            setErrorMsg("Adgangskoden skal være mindst 6 tegn.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Adgangskoderne stemmer ikke overens.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            
            setSuccessMsg("Din adgangskode er nu opdateret! Du sendes videre...");
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
            
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || "Der opstod en fejl ved opdatering af adgangskoden.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-brand">
                        <Wrench size={32} color="#6b7280" style={{ opacity: 0.7 }} />
                    </div>
                    <h2>Bison Frame</h2>
                    <p className="text-muted">Vælg din nye adgangskode</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="login-form">
                    {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
                    {successMsg && <div style={{ marginBottom: '16px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>{successMsg}</div>}
                    
                    <div className="input-group">
                        <label>Ny Adgangskode (Min. 6 tegn) *</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: '#c5cdd6', zIndex: 1 }} />
                            <input 
                                type="password" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                style={{ paddingLeft: '44px', width: '100%' }}
                                required 
                            />
                        </div>
                    </div>

                    <div className="input-group" style={{ marginTop: '16px' }}>
                        <label>Gentag Ny Adgangskode *</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: '#c5cdd6', zIndex: 1 }} />
                            <input 
                                type="password" 
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                style={{ paddingLeft: '44px', width: '100%' }}
                                required 
                            />
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !!successMsg} 
                        style={{ 
                            background: '#dbeafe', 
                            color: '#2563eb', 
                            border: '1px solid #bfdbfe', 
                            padding: '12px 24px', 
                            borderRadius: '8px', 
                            fontSize: '15px', 
                            fontWeight: '600', 
                            cursor: loading || !!successMsg ? 'not-allowed' : 'pointer', 
                            transition: 'all 0.2s', 
                            width: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            marginTop: '24px'
                        }}
                        onMouseOver={(e) => { if(!loading && !successMsg) e.currentTarget.style.background = '#bfdbfe'; }}
                        onMouseOut={(e) => { if(!loading && !successMsg) e.currentTarget.style.background = '#dbeafe'; }}
                    >
                        {loading ? 'Opdaterer...' : 'Gem ny adgangskode'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
