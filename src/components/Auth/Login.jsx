import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Wrench, Lock } from 'lucide-react';

const Login = ({ setSession }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [forgotMode, setForgotMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            setErrorMsg("Indtast venligst din e-mail.");
            return;
        }
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || "Der opstod en fejl. Prøv igen.");
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            let authResponse = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            const { data, error } = authResponse;

            if (error) {
                setErrorMsg(error.message);
            } else if (data.session) {
                if (typeof setSession === 'function') {
                    localStorage.setItem('dashboard_active_tab', 'overview');
                    setSession(data.session);
                    navigate('/dashboard');
                } else {
                    console.error("setSession is not a function. It was not passed as a prop.");
                    setErrorMsg("Der opstod en intern systemfejl. Prøv at genindlæse siden.");
                }
            }
        } catch (err) {
            console.error("Login error:", err);
            setErrorMsg("Der opstod en uventet fejl. Prøv venligst igen.");
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
                    <p className="text-muted">Log ind på dit system</p>
                </div>

                <form onSubmit={handleAuth} className="login-form">
                    {errorMsg && <div className="login-error">{errorMsg}</div>}
                    
                    {forgotMode ? (
                        <>
                            {resetSent ? (
                                <div style={{ textAlign: 'center', color: '#10b981', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>E-mail sendt!</h3>
                                    <p style={{ fontSize: '14px' }}>Tjek din indbakke (og spam-mappe) for et link til at nulstille din adgangskode.</p>
                                    <button 
                                        type="button" 
                                        onClick={() => { setForgotMode(false); setResetSent(false); setEmail(''); }}
                                        style={{ marginTop: '16px', background: 'transparent', border: 'none', color: '#6b7280', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        Tilbage til login
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>E-mail adresse til nulstilling</label>
                                        <input 
                                            type="email" 
                                            placeholder="tømrer@skovbobyg.dk"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        disabled={loading || !email} 
                                        onClick={handleResetPassword}
                                        style={{ 
                                            background: '#dbeafe', 
                                            color: '#2563eb', 
                                            border: '1px solid #bfdbfe', 
                                            padding: '12px 24px', 
                                            borderRadius: '8px', 
                                            fontSize: '15px', 
                                            fontWeight: '600', 
                                            cursor: loading || !email ? 'not-allowed' : 'pointer', 
                                            transition: 'all 0.2s', 
                                            width: '100%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '8px' 
                                        }}
                                        onMouseOver={(e) => { if(!loading && email) e.currentTarget.style.background = '#bfdbfe'; }}
                                        onMouseOut={(e) => { if(!loading && email) e.currentTarget.style.background = '#dbeafe'; }}
                                    >
                                        {loading ? 'Sender link...' : 'Send nulstillings-link'}
                                    </button>
                                    <div style={{ textAlign: 'center', margin: '16px 0' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => setForgotMode(false)}
                                            style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Annuller
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="input-group">
                                <label>E-mail adresse</label>
                                <input 
                                    type="email" 
                                    placeholder="tømrer@skovbobyg.dk"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                />
                            </div>
                            
                            <div className="input-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Adgangskode</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setForgotMode(true)}
                                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', marginBottom: '8px', padding: 0 }}
                                    >
                                        Glemt adgangskode?
                                    </button>
                                </div>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading} 
                                style={{ 
                                    background: '#dbeafe', 
                                    color: '#2563eb', 
                                    border: '1px solid #bfdbfe', 
                                    padding: '12px 24px', 
                                    borderRadius: '8px', 
                                    fontSize: '15px', 
                                    fontWeight: '600', 
                                    cursor: loading ? 'not-allowed' : 'pointer', 
                                    transition: 'all 0.2s', 
                                    width: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px' 
                                }}
                                onMouseOver={(e) => { if(!loading) e.currentTarget.style.background = '#bfdbfe'; }}
                                onMouseOut={(e) => { if(!loading) e.currentTarget.style.background = '#dbeafe'; }}
                            >
                                {loading ? 'Låser op...' : (
                                    <>
                                        <Lock size={18} />
                                        Lås op for systemet
                                    </>
                                )}
                            </button>
                            
                            <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
                                <Link to="/register" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'inline-block', padding: '5px', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#374151'} onMouseOut={(e) => e.target.style.color = '#6b7280'}>
                                    Ny her? Opret dit tømrer-system her
                                </Link>
                            </div>
                        </>
                    )}
                    
                    <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
                        Ved at logge ind accepterer du vores <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'underline' }}>Vilkår og Betingelser</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'underline' }}>Databehandleraftale (DPA)</a>.
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Login;
