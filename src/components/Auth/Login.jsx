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

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        let authResponse = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        const { data, error } = authResponse;

        if (error) {
            setErrorMsg(error.message);
        } else if (data.session) {
            localStorage.setItem('dashboard_active_tab', 'overview');
            setSession(data.session);
            navigate('/dashboard');
        }
        
        setLoading(false);
    };

    return (
        <div className="login-container" style={{ minHeight: '100%', height: '100%' }}>
            <div className="login-card">
                <div className="login-header">
                    <div className="login-brand">
                        <Wrench size={32} color="#64748b" style={{ opacity: 0.7 }} />
                    </div>
                    <h2>Bison Frame</h2>
                    <p className="text-muted">Log ind på dit system</p>
                </div>

                <form onSubmit={handleAuth} className="login-form">
                    {errorMsg && <div className="login-error">{errorMsg}</div>}
                    
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
                        <label>Adgangskode (Min. 6 tegn)</label>
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
                        <Link to="/register" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'inline-block', padding: '5px', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#334155'} onMouseOut={(e) => e.target.style.color = '#64748b'}>
                            Ny her? Opret dit tømrer-system her
                        </Link>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
                        Ved at logge ind accepterer du vores <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>Vilkår og Betingelser</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>Databehandleraftale (DPA)</a>.
                    </div>

                </form>
            </div>
            
            <div className="login-footer">
                <p>Denne adgang er lukket og reserveret til virksomhedens ejer.</p>
            </div>
        </div>
    );
};

export default Login;
