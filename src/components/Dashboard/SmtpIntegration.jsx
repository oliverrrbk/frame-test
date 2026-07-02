import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Info, HelpCircle, X, ExternalLink, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import AudioPlayerButton from '../Wizard/AudioPlayerButton';

// Hele SMTP-guiden som én naturlig oplæsnings-tekst (dansk TTS).
// Bruges af "Læs op"-knappen i guide-modalen, så man kan lytte i stedet for at læse.
const SMTP_GUIDE_SPEECH = [
    'Guide til egen e-mail via S M T P.',
    'For at systemet kan sende tilbud direkte fra din egen mail-indbakke, skal det have tilladelse til at logge ind på din mailserver. Du bruger både S M T P-serveren til at sende, og I M A P-serveren, så en kopi havner i din Sendt Post-mappe. Fremgangsmåden afhænger af, hvem du har din e-mail hos. Find din udbyder herunder.',
    'Microsoft 365, altså Outlook. Microsoft tillader ikke dit normale kodeord. Du skal oprette en app-adgangskode. Log ind på din Microsoft-konto under Sikkerhed. Gå til Avancerede sikkerhedsindstillinger. Find App-adgangskoder og tryk opret. Kopiér koden og sæt den ind i Bison Frame. Send-serveren er smtp punktum office365 punktum com. Sendt Post-serveren er outlook punktum office365 punktum com. Port 587 til afsendelse, og 993 til Sendt Post.',
    'Google Workspace. Ligesom Microsoft kræver Google, at du bruger en speciel app-adgangskode i stedet for dit normale kodeord. Gå til din Google-konto under Sikkerhed. Slå to-trins-bekræftelse til, hvis det er slået fra. Søg efter App-adgangskoder og opret en ny. Kopiér koden og sæt den ind i Bison Frame. Send-serveren er smtp punktum gmail punktum com. Sendt Post-serveren er imap punktum gmail punktum com. Port 587 til afsendelse, og 993 til Sendt Post.',
    'DanDomain. Her bruger du dit helt normale e-mail-kodeord, det samme som når du logger ind på webmail. Vigtigt: hos DanDomain hedder send-serveren a-smtp punktum dandomain punktum dk, altså med et a foran, ikke smtp eller websmtp. Sendt Post-serveren hedder post punktum dandomain punktum dk. Port 587 til afsendelse, og 993 til Sendt Post.',
    'Simply punktum com og One punktum com, samt øvrige webhoteller. Du bruger dit helt normale e-mail-kodeord. Bemærk at send-serveren og Sendt Post-serveren har lidt forskellige navne. Hos Simply er send-serveren websmtp punktum simply punktum com og Sendt Post imap punktum simply punktum com. Hos One punktum com er send-serveren send punktum one punktum com og Sendt Post imap punktum one punktum com. Port 587 til afsendelse, og 993 til Sendt Post.',
].join(' ');

// Tooltip der både virker på desktop (hover) OG mobil/touch (tryk).
// Tidligere var den ren CSS :hover → spørgsmålstegnet gjorde intet på mobil.
const Tooltip = ({ text }) => {
    const [open, setOpen] = useState(false);
    const [shift, setShift] = useState(0); // vandret korrektion så boblen ikke løber ud over skærmkanten
    const ref = useRef(null);
    const bubbleRef = useRef(null);

    useEffect(() => {
        if (!open) { setShift(0); return; }
        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [open]);

    // Mål boblen når den åbner og skub den ind på skærmen hvis den klippes i en kant.
    useLayoutEffect(() => {
        if (!open || !bubbleRef.current) return;
        const margin = 12;
        const rect = bubbleRef.current.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        if (rect.right > vw - margin) setShift(-(rect.right - (vw - margin)));
        else if (rect.left < margin) setShift(margin - rect.left);
    }, [open]);

    return (
        <span
            ref={ref}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px', top: '2px' }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                aria-label="Hjælp"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', display: 'inline-flex', lineHeight: 0 }}
            >
                <HelpCircle size={16} color={open ? '#db2777' : '#94a3b8'} />
            </button>
            <span ref={bubbleRef} style={{
                position: 'absolute',
                bottom: open ? '125%' : '135%',
                left: '50%',
                transform: `translateX(calc(-50% + ${shift}px))`,
                backgroundColor: '#1e293b',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                width: 'max-content',
                maxWidth: 'min(280px, calc(100vw - 24px))',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                opacity: open ? 1 : 0,
                visibility: open ? 'visible' : 'hidden',
                transition: 'opacity 0.2s, bottom 0.2s',
                zIndex: 50,
                lineHeight: '1.5',
                fontWeight: 'normal',
                whiteSpace: 'normal',
                textAlign: 'left',
                pointerEvents: open ? 'auto' : 'none'
            }}>
                <span dangerouslySetInnerHTML={{ __html: text }} />
                <span style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: `translateX(calc(-50% - ${shift}px))`, // hold pilen pegende på "?"
                    borderWidth: '6px',
                    borderStyle: 'solid',
                    borderColor: '#1e293b transparent transparent transparent'
                }}></span>
            </span>
        </span>
    );
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SmtpIntegration = ({ carpenterProfile, expandedIntegration, setExpandedIntegration }) => {
    const isExpanded = expandedIntegration === 'smtp';
    const [settings, setSettings] = useState({
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_pass: '',
        smtp_from_email: '',
        imap_host: '',
        imap_port: ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!carpenterProfile?.id) return;
            const { data, error } = await supabase
                .from('carpenter_secrets')
                .select('smtp_settings')
                .eq('carpenter_id', carpenterProfile.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching SMTP settings:", error);
            }
            
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
            setTestResult({ success: true, message: result.message || 'Forbindelse godkendt! Du kan nu gemme.' });
        } catch (error) {
            setTestResult({ success: false, message: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {

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
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Kunne ikke gemme indstillinger:', error);
            alert('Der skete en fejl ved gemning: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDisconnect = async () => {
        setIsSaving(true);
        try {
            // Ren UPDATE (ikke upsert): rækken findes allerede, og upsert tvinger
            // Postgres gennem INSERT-stien, som fejler mod RLS på carpenter_secrets.
            const { error } = await supabase
                .from('carpenter_secrets')
                .update({ smtp_settings: null })
                .eq('carpenter_id', carpenterProfile.id);

            if (error) throw error;
            setSettings({ smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_from_email: '', imap_host: '', imap_port: '' });
            setIsConfigured(false);
            setTestResult(null);
            setShowDisconnectModal(false);
        } catch (error) {
            alert('Kunne ikke afbryde: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = () => {
        setShowDisconnectModal(true);
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
                                placeholder="fx info@firma.dk"
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

                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                    SMTP Server
                                    <Tooltip text="Adressen på din mailudbyders server (til at <b>sende</b> med).<br/>• DanDomain: asmtp.dandomain.dk<br/>• Simply: websmtp.simply.com<br/>• Microsoft: smtp.office365.com<br/>• Google: smtp.gmail.com" />
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

                        <div className="input-group">
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="input-group" style={{ flex: 2 }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                        IMAP Server (Valgfri)
                                        <Tooltip text="Bruges til at gemme tilbud automatisk i din 'Sendt Post'-mappe.<br/><br/>• DanDomain: <b>post.dandomain.dk</b><br/>• Simply: <b>imap.simply.com</b><br/>• Microsoft: <b>outlook.office365.com</b><br/>• Google: <b>imap.gmail.com</b><br/><br/>Lader du feltet stå tomt, forsøger systemet selv at gætte den ud fra din SMTP-server." />
                                    </label>
                                    <input
                                        type="text"
                                        name="imap_host"
                                        value={settings.imap_host || ''}
                                        onChange={handleChange}
                                        placeholder="fx post.dandomain.dk (kan stå tom)"
                                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                        IMAP Port
                                        <Tooltip text="Porten til din 'Sendt Post'-server.<br/>Standard er <b>993</b> (sikker) hos næsten alle udbydere. Lad feltet stå tomt, hvis du er i tvivl." />
                                    </label>
                                    <input
                                        type="text"
                                        name="imap_port"
                                        value={settings.imap_port || ''}
                                        onChange={handleChange}
                                        placeholder="993"
                                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginTop: '6px' }}
                                    />
                                </div>
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                Sikrer at en kopi af tilbuddet havner i din "Sendt Post". Lader du porten stå tom, bruges 993 (sikker) automatisk.{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowHelpModal(true)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#db2777', fontWeight: '600', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Kender du ikke din server? Se guide →
                                </button>
                            </span>
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
                                disabled={isSaving}
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    background: '#db2777', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
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
        {showHelpModal && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '20px', backdropFilter: 'blur(8px)' }} onClick={() => setShowHelpModal(false)}>
                <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>

                    <div style={{ flexShrink: 0, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', zIndex: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#0f172a' }}>
                                <BookOpen color="#db2777" size={28} /> Guide til Egen E-mail (SMTP)
                            </h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Find din udbyder og brug både <strong>SMTP</strong>-serveren (til at sende) og <strong>IMAP</strong>-serveren (så kopien havner i din "Sendt Post").</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <AudioPlayerButton
                                text={SMTP_GUIDE_SPEECH}
                                title="Læs guiden op"
                                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                            />
                            <button onClick={() => setShowHelpModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '32px 40px 40px', color: '#334155', lineHeight: '1.6' }}>
                        <p style={{ marginTop: 0, fontSize: '16px', marginBottom: '30px', maxWidth: '800px' }}>
                            For at systemet kan sende tilbud direkte fra din egen mail-indbakke, skal den have tilladelse til at logge ind på din mailserver. Fremgangsmåden afhænger fuldstændig af, hvem du har din e-mail hos. Find din udbyder herunder:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            
                            {/* Microsoft Box */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                    Microsoft 365 (Outlook)
                                </h3>
                                <p style={{ fontSize: '14px', margin: '0 0 16px 0', flexGrow: 1 }}>Microsoft blokerer for, at du kan bruge dit normale kodeord. Du skal oprette en <strong>App-adgangskode</strong>.</p>
                                <ol style={{ fontSize: '14px', margin: '0 0 20px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li>Log ind på din Microsoft-konto (Sikkerhed).</li>
                                    <li>Gå til "Avancerede sikkerhedsindstillinger".</li>
                                    <li>Find "App-adgangskoder" og tryk opret.</li>
                                    <li>Kopier koden og sæt den ind i Bison Frame.</li>
                                </ol>
                                <div style={{ marginTop: 'auto' }}>
                                    <a href="https://support.microsoft.com/da-dk/account-billing/brug-appadgangskoder-sammen-med-apps-der-ikke-underst%C3%B8tter-totrinsbekr%C3%A6ftelse-5896ed9b-4263-e681-128a-a6f2979a7944" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'} onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}>
                                        Læs Microsofts guide <ExternalLink size={16} />
                                    </a>
                                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <strong>SMTP (send):</strong> smtp.office365.com<br/><strong>IMAP (Sendt Post):</strong> outlook.office365.com<br/><strong>Port:</strong> 587 (SMTP) / 993 (IMAP)
                                    </div>
                                </div>
                            </div>

                            {/* Google Box */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981' }}></div>
                                    Google Workspace
                                </h3>
                                <p style={{ fontSize: '14px', margin: '0 0 16px 0', flexGrow: 1 }}>Ligesom Microsoft kræver Google, at du bruger en speciel <strong>App-adgangskode</strong> i stedet for dit normale kodeord.</p>
                                <ol style={{ fontSize: '14px', margin: '0 0 20px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li>Gå til Google-konto &gt; Sikkerhed.</li>
                                    <li>Slå "2-trins-bekræftelse" til, hvis det er slået fra.</li>
                                    <li>Søg efter "App-adgangskoder" og opret en ny.</li>
                                    <li>Kopier koden og sæt den ind i Bison Frame.</li>
                                </ol>
                                <div style={{ marginTop: 'auto' }}>
                                    <a href="https://support.google.com/accounts/answer/185833?hl=da" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#10b981', textDecoration: 'none', fontWeight: 'bold', background: '#ecfdf5', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#d1fae5'} onMouseOut={(e) => e.currentTarget.style.background = '#ecfdf5'}>
                                        Læs Googles guide <ExternalLink size={16} />
                                    </a>
                                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <strong>SMTP (send):</strong> smtp.gmail.com<br/><strong>IMAP (Sendt Post):</strong> imap.gmail.com<br/><strong>Port:</strong> 587 (SMTP) / 993 (IMAP)
                                    </div>
                                </div>
                            </div>

                            {/* DanDomain Box */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                    DanDomain
                                </h3>
                                <p style={{ fontSize: '14px', margin: '0 0 16px 0', flexGrow: 1 }}>
                                    Du bruger dit <strong>helt normale e-mail kodeord</strong> — det samme som når du logger ind på webmail.<br/><br/>
                                    <strong>Vigtigt:</strong> Hos DanDomain hedder send-serveren <strong>asmtp</strong>.dandomain.dk (ikke "smtp" eller "websmtp"), mens "Sendt Post"-serveren hedder <strong>post</strong>.dandomain.dk.
                                </p>
                                <div style={{ marginTop: 'auto' }}>
                                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <strong>SMTP (send):</strong> asmtp.dandomain.dk<br/><strong>IMAP (Sendt Post):</strong> post.dandomain.dk<br/><strong>Port:</strong> 587 (SMTP) / 993 (IMAP)
                                    </div>
                                </div>
                            </div>

                            {/* Simply / øvrige webhoteller Box */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                                    Simply.com & One.com
                                </h3>
                                <p style={{ fontSize: '14px', margin: '0 0 16px 0', flexGrow: 1 }}>
                                    Gælder almindelige webhoteller som <strong>Simply.com og One.com</strong>.<br/><br/>
                                    Du bruger dit <strong>helt normale e-mail kodeord</strong>. Bemærk at send-serveren (SMTP) og "Sendt Post"-serveren (IMAP) har lidt forskellige navne.
                                </p>
                                <div style={{ marginTop: 'auto' }}>
                                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <strong>Simply</strong> — SMTP: websmtp.simply.com · IMAP: imap.simply.com<br/>
                                        <strong>One.com</strong> — SMTP: send.one.com · IMAP: imap.one.com<br/>
                                        <strong>Port:</strong> 587 (SMTP) / 993 (IMAP)
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        , document.body)}

            {/* --- MEGA LÆKKER SUCCESS MODAL --- */}
            <AnimatePresence>
                {showSuccessModal && createPortal(
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)' }}
                            onClick={() => setShowSuccessModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            style={{ 
                                position: 'relative', 
                                background: 'rgba(255, 255, 255, 0.85)', 
                                backdropFilter: 'blur(20px)',
                                borderRadius: '24px', 
                                padding: '40px 30px', 
                                width: '90%', 
                                maxWidth: '420px', 
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 1)',
                                border: '1px solid rgba(255, 255, 255, 0.6)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.5)' }}
                            >
                                <CheckCircle2 size={44} strokeWidth={2.5} />
                            </motion.div>
                            <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Gemt med succes!</h2>
                            <p style={{ margin: '0 0 30px 0', color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
                                Dine e-mail indstillinger er nu blevet krypteret og gemt sikkert. Systemet vil fremover sende tilbud fra din egen mail.
                            </p>
                            <button 
                                onClick={() => setShowSuccessModal(false)}
                                style={{ 
                                    background: '#0f172a', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '14px 24px', 
                                    borderRadius: '14px', 
                                    fontWeight: 'bold', 
                                    fontSize: '16px', 
                                    width: '100%', 
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)',
                                    transition: 'transform 0.2s, background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Fedt, tak!
                            </button>
                        </motion.div>
                    </div>
                , document.body)}
            </AnimatePresence>

            {/* --- MEGA LÆKKER DISCONNECT MODAL --- */}
            <AnimatePresence>
                {showDisconnectModal && createPortal(
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)' }}
                            onClick={() => setShowDisconnectModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            style={{ 
                                position: 'relative', 
                                background: 'rgba(255, 255, 255, 0.85)', 
                                backdropFilter: 'blur(20px)',
                                borderRadius: '24px', 
                                padding: '40px 30px', 
                                width: '90%', 
                                maxWidth: '420px', 
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 1)',
                                border: '1px solid rgba(255, 255, 255, 0.6)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <motion.div 
                                initial={{ rotate: -20 }}
                                animate={{ rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.5)' }}
                            >
                                <AlertTriangle size={38} strokeWidth={2.5} />
                            </motion.div>
                            <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Er du sikker?</h2>
                            <p style={{ margin: '0 0 30px 0', color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
                                Hvis du fjerner din egen mailopsætning, vil fremtidige tilbud blive sendt fra <strong>info@bisonframe.dk</strong> i stedet.
                            </p>
                            
                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                <button 
                                    onClick={() => setShowDisconnectModal(false)}
                                    style={{ 
                                        background: '#f1f5f9', 
                                        color: '#334155', 
                                        border: '1px solid #cbd5e1', 
                                        padding: '14px', 
                                        borderRadius: '14px', 
                                        fontWeight: 'bold', 
                                        fontSize: '15px', 
                                        flex: 1, 
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                >
                                    Annuller
                                </button>
                                <button 
                                    onClick={confirmDisconnect}
                                    style={{ 
                                        background: '#e11d48', 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '14px', 
                                        borderRadius: '14px', 
                                        fontWeight: 'bold', 
                                        fontSize: '15px', 
                                        flex: 1, 
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 15px -3px rgba(225, 29, 72, 0.2)',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#be123c'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#e11d48'}
                                >
                                    Ja, fjern den
                                </button>
                            </div>
                        </motion.div>
                    </div>
                , document.body)}
            </AnimatePresence>
        </>
    );
};

export default SmtpIntegration;
