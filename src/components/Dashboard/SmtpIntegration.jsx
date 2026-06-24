import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, Info, HelpCircle, X, ExternalLink, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const Tooltip = ({ text }) => {
    return (
        <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px', top: '2px' }}>
            <HelpCircle size={15} color="#94a3b8" style={{ cursor: 'help' }} />
            <div className="tooltip-text" style={{
                position: 'absolute',
                bottom: '135%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1e293b',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                width: 'max-content',
                maxWidth: '280px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                opacity: 0,
                visibility: 'hidden',
                transition: 'all 0.2s',
                zIndex: 50,
                lineHeight: '1.5',
                fontWeight: 'normal',
                whiteSpace: 'normal',
                textAlign: 'left'
            }}>
                <div dangerouslySetInnerHTML={{ __html: text }} />
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: '6px',
                    borderStyle: 'solid',
                    borderColor: '#1e293b transparent transparent transparent'
                }}></div>
            </div>
            <style>{`
                .tooltip-container:hover .tooltip-text {
                    opacity: 1;
                    visibility: visible;
                    bottom: 125%;
                }
            `}</style>
        </div>
    );
};

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
    const [showHelpModal, setShowHelpModal] = useState(false);

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
        setTestResult(null);
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
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
        <>
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.6' }}>
                            Når denne integration er sat op, sendes alle tilbud direkte fra dit eget mailsystem. 
                            Dette betyder, at de automatisk bliver gemt i din <strong>"Sendt Post"</strong>, og at afsenderadressen ser 100% professionel ud for kunden.
                        </p>
                        <button 
                            onClick={() => setShowHelpModal(true)}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                        >
                            <BookOpen size={16} /> Guide til opsætning
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                Afsender E-mail
                                <Tooltip text="Dette er den mailadresse, kunden vil se at mailen kommer fra, og som de vil svare tilbage på (fx kontakt@ditfirma.dk)." />
                            </label>
                            <input 
                                type="email" 
                                name="smtp_from_email" 
                                value={settings.smtp_from_email} 
                                onChange={handleChange} 
                                placeholder="fx info@skovbobyg.dk"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Mailen som kunden ser som afsender.</span>
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                Brugernavn (Ofte din e-mail)
                                <Tooltip text="Dette er det brugernavn du normalt logger ind på din mail med. I 99% af tilfældene er det præcis det samme som din e-mailadresse." />
                            </label>
                            <input 
                                type="text" 
                                name="smtp_user" 
                                value={settings.smtp_user} 
                                onChange={handleChange} 
                                placeholder="Dit login-brugernavn"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                Adgangskode (eller App-kode)
                                <Tooltip text="Har du fx Simply.com, er det dit normale mail-kodeord.<br/><br/><b>Bemærk:</b> Hvis du bruger Microsoft 365 eller Google Workspace, må du IKKE bruge dit normale kodeord. Du skal i stedet oprette en 'App-adgangskode' hos dem. Tryk på 'Guide til opsætning' øverst for at se hvordan." />
                            </label>
                            <input 
                                type="password" 
                                name="smtp_pass" 
                                value={settings.smtp_pass} 
                                onChange={handleChange} 
                                placeholder="Dit kodeord eller App-adgangskode"
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                            />
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '6px', background: '#fffbeb', padding: '10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <Info size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                                    <strong>Bruger du Microsoft 365 eller Google?</strong><br/> Så skal du logge ind hos dem og oprette en "App-adgangskode", som du sætter ind her. Læs vores guide i toppen.
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                    SMTP Server
                                    <Tooltip text="Adressen på din mailudbyders server.<br/>• Simply: websmtp.simply.com<br/>• Microsoft: smtp.office365.com<br/>• Google: smtp.gmail.com" />
                                </label>
                                <input 
                                    type="text" 
                                    name="smtp_host" 
                                    value={settings.smtp_host} 
                                    onChange={handleChange} 
                                    placeholder="fx websmtp.simply.com"
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                    Port
                                    <Tooltip text="Den tekniske port serveren lytter på.<br/>Standard er altid 587. Virker det ikke, prøv 465." />
                                </label>
                                <input 
                                    type="text" 
                                    name="smtp_port" 
                                    value={settings.smtp_port} 
                                    onChange={handleChange} 
                                    placeholder="587 eller 465"
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
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
                                    gap: '8px',
                                    transition: 'background 0.2s'
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

        {/* --- HELP MODAL --- */}
        {showHelpModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', backdropFilter: 'blur(4px)' }} onClick={() => setShowHelpModal(false)}>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
                    
                    <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><BookOpen color="#db2777" /> Guide: Egen E-mail (SMTP)</h2>
                        <button onClick={() => setShowHelpModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748b' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '24px', color: '#334155', lineHeight: '1.6' }}>
                        <p style={{ marginTop: 0, fontSize: '15px' }}>
                            For at systemet kan sende tilbud fra din mail, skal den have tilladelse til at logge ind på din mailserver. Fremgangsmåden afhænger af, hvem du har din e-mail hos.
                        </p>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                Microsoft 365 (Outlook)
                            </h3>
                            <p style={{ fontSize: '14px', margin: '0 0 12px 0' }}>Microsoft blokerer af sikkerhedsmæssige årsager for, at du kan bruge dit normale kodeord. Du skal oprette en <strong>App-adgangskode</strong>.</p>
                            <ol style={{ fontSize: '14px', margin: '0 0 16px 0', paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '6px' }}>Log ind på din Microsoft-konto (Sikkerhed).</li>
                                <li style={{ marginBottom: '6px' }}>Gå til "Avancerede sikkerhedsindstillinger".</li>
                                <li style={{ marginBottom: '6px' }}>Under "App-adgangskoder", klik på "Opret en ny app-adgangskode".</li>
                                <li>Kopier koden og sæt den ind i adgangskode-feltet i Bison Frame.</li>
                            </ol>
                            <a href="https://support.microsoft.com/da-dk/account-billing/brug-appadgangskoder-sammen-med-apps-der-ikke-underst%C3%B8tter-totrinsbekr%C3%A6ftelse-5896ed9b-4263-e681-128a-a6f2979a7944" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
                                Læs Microsofts guide her <ExternalLink size={14} />
                            </a>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                <strong>Server:</strong> smtp.office365.com | <strong>Port:</strong> 587
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                                Google Workspace (Gmail)
                            </h3>
                            <p style={{ fontSize: '14px', margin: '0 0 12px 0' }}>Ligesom Microsoft kræver Google, at du bruger en <strong>App-adgangskode</strong> i stedet for dit normale kodeord.</p>
                            <ol style={{ fontSize: '14px', margin: '0 0 16px 0', paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '6px' }}>Gå til din Google-konto > Sikkerhed.</li>
                                <li style={{ marginBottom: '6px' }}>Sørg for at "2-trins-bekræftelse" er slået til.</li>
                                <li style={{ marginBottom: '6px' }}>Søg efter "App-adgangskoder" og opret en ny.</li>
                                <li>Kopier den 16-cifrede kode og sæt den ind i adgangskode-feltet i Bison Frame.</li>
                            </ol>
                            <a href="https://support.google.com/accounts/answer/185833?hl=da" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
                                Læs Googles guide her <ExternalLink size={14} />
                            </a>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                <strong>Server:</strong> smtp.gmail.com | <strong>Port:</strong> 587
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                Simply.com / Unoeuro / Webhoteller
                            </h3>
                            <p style={{ fontSize: '14px', margin: '0 0 12px 0' }}>Hvis du har din mail via et normalt webhotel, er det meget nemmere. Her skal du blot bruge dit <strong>helt normale e-mail kodeord</strong>.</p>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                <strong>Server:</strong> websmtp.simply.com | <strong>Port:</strong> 587
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default SmtpIntegration;
