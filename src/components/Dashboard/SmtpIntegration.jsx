import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, Info } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SmtpIntegration = ({ carpenterProfile, expandedIntegration, setExpandedIntegration }) => {
    const isExpanded = expandedIntegration === 'smtp';
    const [settings, setSettings] = useState({
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_pass: '',
        smtp_from_email: ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);

    // Initialize Supabase Client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!carpenterProfile?.id) return;
            const { data, error } = await supabase
                .from('carpenter_secrets')
                .select('smtp_settings')
                .eq('carpenter_id', carpenterProfile.id)
                .single();
            
            if (data?.smtp_settings) {
                setSettings(data.smtp_settings);
                setIsConfigured(true);
            }
        };
        fetchSettings();
    }, [carpenterProfile?.id]);

    const handleChange = (e) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setTestResult(null); // Reset test result when changing fields
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            // First we need the JWT to authenticate with our own API
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Du er ikke logget ind.");

            const response = await fetch('/api/test-smtp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(settings)
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Forbindelsen fejlede');
            }
            setTestResult({ success: true, message: 'Forbindelse godkendt! Du kan nu gemme.' });
        } catch (error) {
            setTestResult({ success: false, message: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!testResult?.success) {
            alert('Venligst test forbindelsen succesfuldt, før du gemmer.');
            return;
        }

        setIsSaving(true);
        try {
            // Upsert ind i carpenter_secrets
            const { error } = await supabase
                .from('carpenter_secrets')
                .upsert({ 
                    carpenter_id: carpenterProfile.id,
                    smtp_settings: settings
                }, { onConflict: 'carpenter_id' });

            if (error) throw error;
            setIsConfigured(true);
            alert('E-mail indstillinger blev gemt sikkert!');
        } catch (error) {
            console.error('Kunne ikke gemme indstillinger:', error);
            alert('Der skete en fejl ved gemning: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Er du sikker på, at du vil fjerne din egen mailopsætning? Mails vil fremover blive sendt fra info@bisonframe.dk.')) return;
        
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('carpenter_secrets')
                .upsert({ 
                    carpenter_id: carpenterProfile.id,
                    smtp_settings: null
                }, { onConflict: 'carpenter_id' });

            if (error) throw error;
            setSettings({ smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_from_email: '' });
            setIsConfigured(false);
            setTestResult(null);
        } catch (error) {
            alert('Kunne ikke afbryde: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="glass-panel">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'smtp' ? null : 'smtp')}>
                <div style={{ width: '40px', height: '40px', background: '#fce7f3', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#db2777' }}>
                    <Mail size={24} />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Egen E-mail (SMTP)</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Send tilbud via din egen e-mailadresse</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isConfigured && (
                        <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                    )}
                    <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            {isExpanded && (
                <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                        Når denne integration er sat op, sendes alle tilbud direkte fra dit eget mailsystem. 
                        Dette betyder, at de automatisk bliver gemt i din "Sendt Post", og at afsenderadressen ser 100% professionel ud for kunden.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600' }}>Afsender E-mail</label>
                            <input 
                                type="email" 
                                name="smtp_from_email" 
                                value={settings.smtp_from_email} 
                                onChange={handleChange} 
                                placeholder="fx info@skovbobyg.dk"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Mailen som kunden ser som afsender.</span>
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600' }}>Brugernavn (Ofte din e-mail)</label>
                            <input 
                                type="text" 
                                name="smtp_user" 
                                value={settings.smtp_user} 
                                onChange={handleChange} 
                                placeholder="Dit login-brugernavn"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600' }}>Adgangskode (eller App-kode)</label>
                            <input 
                                type="password" 
                                name="smtp_pass" 
                                value={settings.smtp_pass} 
                                onChange={handleChange} 
                                placeholder="Dit kodeord"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                <strong>Bemærk:</strong> Hvis du bruger Microsoft 365 eller Google Workspace, skal du muligvis oprette en "App-adgangskode" hos dem.
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>SMTP Server</label>
                                <input 
                                    type="text" 
                                    name="smtp_host" 
                                    value={settings.smtp_host} 
                                    onChange={handleChange} 
                                    placeholder="fx websmtp.simply.com"
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>Port</label>
                                <input 
                                    type="text" 
                                    name="smtp_port" 
                                    value={settings.smtp_port} 
                                    onChange={handleChange} 
                                    placeholder="587 eller 465"
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                                />
                            </div>
                        </div>

                        {testResult && (
                            <div style={{ 
                                padding: '12px', 
                                borderRadius: '6px', 
                                background: testResult.success ? '#dcfce7' : '#fee2e2', 
                                color: testResult.success ? '#166534' : '#b91c1c',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>{testResult.message}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button 
                                onClick={handleTest}
                                disabled={isTesting || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass}
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    background: '#f1f5f9', 
                                    color: '#334155', 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isTesting ? 'Tester...' : 'Test Forbindelse'}
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !testResult?.success}
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    background: testResult?.success ? '#db2777' : '#94a3b8', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold', 
                                    cursor: testResult?.success ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSaving ? 'Gemmer...' : (isConfigured ? 'Opdater Indstillinger' : 'Gem Integration')}
                            </button>
                        </div>

                        {isConfigured && (
                            <button
                                style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={handleDisconnect}
                                disabled={isSaving}
                            >
                                Afbryd Forbindelse
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmtpIntegration;
