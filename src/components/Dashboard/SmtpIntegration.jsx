import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Info, HelpCircle, X, ExternalLink, BookOpen, CheckCircle2, AlertTriangle, ShieldCheck, Copy } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AudioPlayerButton from '../Wizard/AudioPlayerButton';
import { sendEmail } from '../../utils/sendEmail';

// Bisons support-mail — modtager gratis-hjælp-anmodninger til DNS/leverbarhed.
const BISON_SUPPORT_EMAIL = 'mbc@bisoncompany.dk';

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

// Kendte udbydere: auto-udfylder SMTP/IMAP-server + port og giver skræddersyet
// hjælp. 'match' bruges til at genkende udbyderen ud fra afsender-mailens domæne.
const SMTP_PROVIDERS = [
    {
        key: 'gmail', name: 'Gmail / Google',
        smtp_host: 'smtp.gmail.com', smtp_port: '587', imap_host: 'imap.gmail.com', imap_port: '993',
        appPassword: true, url: 'https://myaccount.google.com/apppasswords',
        // Visuel trin-for-trin guide (vises i popup). 'img' kan pege på et rigtigt
        // screenshot i /public senere — er den tom, vises et pænt illustreret trin.
        walkthrough: [
            { title: 'Slå 2-trins-bekræftelse til', desc: 'Gå til din Google-konto → Sikkerhed → aktivér "2-trins-bekræftelse". Det er et krav for at kunne lave en app-kode.', img: '' },
            { title: 'Åbn App-adgangskoder', desc: 'Gå til myaccount.google.com/apppasswords. Log ind hvis du bliver bedt om det.', img: '' },
            { title: 'Opret en app-kode', desc: 'Giv den et navn (fx "Frame") og tryk Opret. Google viser nu en 16-cifret kode.', img: '' },
            { title: 'Kopiér koden ind i Frame', desc: 'Kopiér den 16-cifrede kode og indsæt den i feltet "Adgangskode" her i Frame. Tryk til sidst "Test Forbindelse".', img: '' },
        ],
        match: (d) => /(^|\.)gmail\.com$|googlemail\.com$/.test(d),
    },
    {
        key: 'microsoft', name: 'Microsoft 365 / Outlook',
        smtp_host: 'smtp.office365.com', smtp_port: '587', imap_host: 'outlook.office365.com', imap_port: '993',
        appPassword: true, url: 'https://account.microsoft.com/security',
        walkthrough: [
            { title: 'Slå 2-trins-bekræftelse til', desc: 'Gå til account.microsoft.com/security og aktivér 2-trins-bekræftelse på din konto.', img: '' },
            { title: 'Find Avancerede sikkerhedsindstillinger', desc: 'Under Sikkerhed → "Avancerede sikkerhedsindstillinger" finder du App-adgangskoder.', img: '' },
            { title: 'Opret en app-adgangskode', desc: 'Tryk "Opret en ny app-adgangskode". Microsoft viser nu en kode.', img: '' },
            { title: 'Kopiér koden ind i Frame', desc: 'Indsæt app-koden i feltet "Adgangskode" her i Frame, og tryk "Test Forbindelse".', img: '' },
        ],
        match: (d) => /(outlook\.|hotmail\.|live\.|office365)/.test(d),
    },
    {
        key: 'one', name: 'One.com',
        smtp_host: 'send.one.com', smtp_port: '587', imap_host: 'imap.one.com', imap_port: '993',
        appPassword: false, match: () => false,
    },
    {
        key: 'simply', name: 'Simply.com',
        smtp_host: 'websmtp.simply.com', smtp_port: '587', imap_host: 'imap.simply.com', imap_port: '993',
        appPassword: false, match: () => false,
    },
    {
        key: 'dandomain', name: 'DanDomain',
        smtp_host: 'asmtp.dandomain.dk', smtp_port: '587', imap_host: 'post.dandomain.dk', imap_port: '993',
        appPassword: false, note: 'Bemærk: DanDomains SMTP-server har et "asmtp"-præfiks (ikke "smtp").',
        match: () => false,
    },
    { key: 'other', name: 'Andet / eget domæne', appPassword: false, match: () => false },
];

const detectProvider = (email) => {
    const d = String(email || '').split('@')[1]?.toLowerCase() || '';
    if (!d) return null;
    return SMTP_PROVIDERS.find(p => p.match(d)) || null;
};

// Frame-stil dropdown til udbyder-valg (ingen emojis, ren og professionel).
const Chevron = ({ open }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
);

function ProviderSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const selected = SMTP_PROVIDERS.find(p => p.key === value);
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', border: open ? '1px solid #db2777' : '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', userSelect: 'none', boxShadow: open ? '0 0 0 3px rgba(219,39,119,0.12)' : 'none', transition: 'all 0.15s' }}>
                <span style={{ color: selected ? '#0f172a' : '#94a3b8', fontWeight: selected ? 600 : 400, fontSize: '0.95rem' }}>{selected ? selected.name : '— Vælg din udbyder —'}</span>
                <Chevron open={open} />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 16px 32px -8px rgba(15,23,42,0.18)', zIndex: 40, overflow: 'hidden', padding: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                        {SMTP_PROVIDERS.map(p => {
                            const active = p.key === value;
                            return (
                                <div key={p.key} onClick={() => { onChange(p.key); setOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.92rem', fontWeight: active ? 700 : 500, color: active ? '#9d174d' : '#334155', background: active ? '#fce7f3' : 'transparent', transition: 'background 0.12s' }}
                                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                                    <span>{p.name}</span>
                                    {active && <CheckCircle2 size={16} style={{ color: '#db2777' }} />}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Farve/labels pr. leverbarheds-status.
const DELIV_STYLES = {
    pass: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: 'OK' },
    warn: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: 'Anbefales' },
    fail: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', label: 'Mangler' },
    info: { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Info' },
    unknown: { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', label: 'Ukendt' },
};

// Én række i leverbarheds-rapporten (SPF / DMARC / MX / DKIM).
const DelivRow = ({ title, check }) => {
    const [copied, setCopied] = useState(false);
    const s = DELIV_STYLES[check?.status] || DELIV_STYLES.unknown;
    const copy = () => {
        try {
            navigator.clipboard.writeText(check.suggestion);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* ignorér — clipboard kan være blokeret */ }
    };
    return (
        <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{title}</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: s.color, background: '#fff', border: `1px solid ${s.border}`, padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: s.color, lineHeight: 1.5 }}>{check?.message}</p>
            {check?.suggestion && (
                <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Indsæt denne DNS-record hos din udbyder:</div>
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '6px' }}>
                        <code style={{ flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap', background: '#0f172a', color: '#e2e8f0', padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{check.suggestion}</code>
                        <button type="button" onClick={copy} title="Kopiér" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff', border: `1px solid ${s.border}`, borderRadius: '8px', padding: '0 10px', cursor: 'pointer', color: '#334155', fontWeight: 700, fontSize: '0.75rem' }}>
                            <Copy size={13} /> {copied ? 'Kopieret' : 'Kopiér'}
                        </button>
                    </div>
                </div>
            )}
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
        smtp_from_email: '',
        imap_host: '',
        imap_port: ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [provider, setProvider] = useState('');       // valgt udbyder-key ('' = ingen valgt endnu)
    const [showAdvanced, setShowAdvanced] = useState(false);  // vis server/port-felter for kendte udbydere
    const [showProviderGuide, setShowProviderGuide] = useState(false);  // trin-popup for app-kode-udbydere
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [isCheckingDeliv, setIsCheckingDeliv] = useState(false);
    const [delivResult, setDelivResult] = useState(null);   // { overall, checks } eller { error }
    const [helpState, setHelpState] = useState('idle');     // 'idle' | 'sending' | 'sent' | 'error'

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
                // Genkend udbyderen ud fra den gemte SMTP-server, så vælgeren viser den rigtige.
                const host = (data.smtp_settings.smtp_host || '').toLowerCase();
                const found = SMTP_PROVIDERS.find(p => p.key !== 'other' && p.smtp_host === host);
                setProvider(found ? found.key : (host ? 'other' : ''));
                if (!found && host) setShowAdvanced(true);
            }
        };
        fetchSettings();
    }, [carpenterProfile?.id]);

    // Vælg udbyder → auto-udfyld server/port (og kopiér mail til brugernavn hvis tomt).
    const applyProvider = (key) => {
        setProvider(key);
        setTestResult(null);
        const p = SMTP_PROVIDERS.find(x => x.key === key);
        if (p && p.key !== 'other') {
            setSettings(prev => ({
                ...prev,
                smtp_host: p.smtp_host, smtp_port: p.smtp_port,
                imap_host: p.imap_host, imap_port: p.imap_port,
                smtp_user: prev.smtp_user || prev.smtp_from_email || '',
            }));
            setShowAdvanced(false);
            // App-kode-udbydere (Gmail/Microsoft): åbn den visuelle trin-guide med det samme.
            if (p.appPassword) setShowProviderGuide(true);
        } else {
            setShowAdvanced(true);   // 'Andet': vis felterne, så man kan skrive dem selv
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => {
            const next = { ...prev, [name]: value };
            // Brugernavn er "ofte din e-mail" → kopiér automatisk fra afsender, så længe
            // brugeren ikke selv har skrevet noget andet.
            if (name === 'smtp_from_email' && (!prev.smtp_user || prev.smtp_user === prev.smtp_from_email)) {
                next.smtp_user = value;
            }
            return next;
        });
        setTestResult(null);
        // Genkend Gmail/Outlook automatisk ud fra domænet, hvis der ikke er valgt udbyder endnu.
        if (name === 'smtp_from_email' && !provider) {
            const det = detectProvider(value);
            if (det) applyProvider(det.key);
        }
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

    const handleCheckDeliverability = async () => {
        setIsCheckingDeliv(true);
        setDelivResult(null);
        setHelpState('idle');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Du er ikke logget ind.");

            const response = await fetch('/api/check-deliverability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    email: settings.smtp_from_email || settings.smtp_user,
                    smtp_host: settings.smtp_host,
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Tjekket fejlede');
            setDelivResult(result);
        } catch (error) {
            setDelivResult({ error: error.message });
        } finally {
            setIsCheckingDeliv(false);
        }
    };

    // Gratis-hjælp-anmodning: sender en opsummering af hvad der mangler (især DMARC) til
    // Bison, så vi kan hjælpe tømreren med at sætte DNS-recordene op. Falder tilbage til
    // mailto hvis afsendelsen fejler (fx SMTP-problem), så anmodningen aldrig går tabt.
    const handleRequestDnsHelp = async () => {
        if (!delivResult?.checks) return;
        setHelpState('sending');

        const firm = carpenterProfile?.company_name || carpenterProfile?.owner_name || 'Ukendt firma';
        const ownerName = carpenterProfile?.owner_name || '';
        const email = settings.smtp_from_email || settings.smtp_user || carpenterProfile?.email || '';
        const phone = carpenterProfile?.phone || carpenterProfile?.owner_phone || '';
        const domain = delivResult.domain || (email.split('@')[1] || '');

        const rows = [
            ['SPF', delivResult.checks.spf],
            ['DMARC', delivResult.checks.dmarc],
            ['MX', delivResult.checks.mx],
            ['DKIM', delivResult.checks.dkim],
        ];
        const statusText = (c) => ({ pass: 'OK', warn: 'Anbefales', fail: 'Mangler', info: 'Info' }[c?.status] || 'Ukendt');

        const rowsHtml = rows.map(([label, c]) => `
            <tr>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:700">${label}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee">${statusText(c)}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee">${(c?.suggestion || '—').replace(/</g, '&lt;')}</td>
            </tr>`).join('');

        const html = `
          <div style="font-family:Arial,sans-serif;color:#0f172a">
            <h2 style="margin:0 0 8px">Anmodning om gratis DNS/leverbarheds-hjælp</h2>
            <p style="margin:0 0 12px">En Bison Frame-bruger vil gerne have hjælp til at sætte SPF/DMARC op, så tilbud ikke ender i spam.</p>
            <p style="margin:0 0 4px"><b>Firma:</b> ${firm}${ownerName ? ` (${ownerName})` : ''}</p>
            <p style="margin:0 0 4px"><b>Domæne:</b> ${domain || '—'}</p>
            <p style="margin:0 0 4px"><b>E-mail:</b> ${email || '—'}</p>
            <p style="margin:0 0 12px"><b>Telefon:</b> ${phone || '—'}</p>
            <table style="border-collapse:collapse;width:100%;font-size:13px">
              <thead><tr>
                <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Record</th>
                <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Status</th>
                <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Foreslået DNS-record</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;

        const subject = `Gratis DNS-hjælp ønskes — ${firm}${domain ? ` (${domain})` : ''}`;

        try {
            const res = await sendEmail({ to: BISON_SUPPORT_EMAIL, subject, html, replyTo: email || undefined });
            if (!res?.success) throw new Error(res?.error || 'Kunne ikke sende');
            setHelpState('sent');
            toast.success('Tak! Vi kontakter dig og hjælper dig gratis i gang.');
        } catch (_e) {
            // Fallback: åbn brugerens mail-app med forudfyldt anmodning, så intet går tabt.
            setHelpState('error');
            const body = `Hej Bison\n\nJeg vil gerne have hjælp til at sætte min mail op, så tilbud ikke ender i spam.\n\nFirma: ${firm}\nDomæne: ${domain}\nE-mail: ${email}\nTelefon: ${phone}\n\n${rows.map(([l, c]) => `${l}: ${statusText(c)}${c?.suggestion ? ` — ${c.suggestion}` : ''}`).join('\n')}`;
            window.location.href = `mailto:${BISON_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                        {/* Udbyder-vælger (Frame-dropdown) — auto-udfylder server/port */}
                        <div className="input-group">
                            <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Vælg din udbyder</label>
                            <ProviderSelect value={provider} onChange={applyProvider} />
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block' }}>Vi udfylder automatisk server og port for dig.</span>
                        </div>

                        {/* Provider-specifik hjælp (app-kode vs. normal adgangskode) */}
                        {provider && (() => {
                            const p = SMTP_PROVIDERS.find(x => x.key === provider);
                            if (!p) return null;
                            if (p.appPassword) {
                                return (
                                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#c2410c', fontSize: '0.9rem' }}><AlertTriangle size={16} /> {p.name} kræver en app-kode</div>
                                        <p style={{ margin: 0, color: '#7c2d12', fontSize: '0.85rem', lineHeight: 1.6 }}>Brug ikke din normale adgangskode — opret en app-kode. Følg den korte trin-guide, så er du klar på et øjeblik.</p>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => setShowProviderGuide(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '10px', background: '#db2777', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                <BookOpen size={15} /> Vis trin-guide
                                            </button>
                                            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '10px', background: '#fff', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>
                                                <ExternalLink size={15} /> Åbn app-kode-siden
                                            </a>
                                        </div>
                                    </div>
                                );
                            }
                            if (p.key === 'other') {
                                return (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                                        Udfyld server og port fra din mailudbyder herunder. Er du i tvivl, så tryk <button type="button" onClick={() => setShowHelpModal(true)} style={{ background: 'none', border: 'none', padding: 0, color: '#db2777', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Guide til opsætning</button>.
                                    </div>
                                );
                            }
                            return (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px 16px', fontSize: '0.85rem', color: '#166534', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>Brug din <strong>normale mail-adgangskode</strong> — ingen app-kode nødvendig.{p.note ? ` ${p.note}` : ''}</div>
                                </div>
                            );
                        })()}

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

                        {/* Server/port: skjult for kendte udbydere (auto-udfyldt) — kan foldes ud. */}
                        {provider && provider !== 'other' && (
                            <button type="button" onClick={() => setShowAdvanced(v => !v)}
                                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                                {showAdvanced ? 'Skjul avanceret' : 'Avanceret (rediger server/port)'}
                            </button>
                        )}

                        {(showAdvanced || !provider || provider === 'other') && (<>
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
                        </>)}

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
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Din mail er sat op og klar{testResult?.success ? ' — testet og virker' : ''}.</span>
                            </div>
                        )}

                        {/* --- LEVERBARHEDS-TJEK (SPF/DMARC) — undgå at tilbud ryger i spam --- */}
                        {(settings.smtp_from_email || settings.smtp_user) && (
                            <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px', background: 'rgba(248,250,252,0.7)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Tjek leverbarhed</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>Kontrollér at dit domænes DNS (SPF/DMARC) er sat op, så tilbud ikke ryger i spam.</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCheckDeliverability}
                                        disabled={isCheckingDeliv}
                                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '10px', background: '#0f172a', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: isCheckingDeliv ? 'default' : 'pointer', opacity: isCheckingDeliv ? 0.7 : 1, transition: 'background 0.2s' }}
                                        onMouseOver={(e) => { if (!isCheckingDeliv) e.currentTarget.style.background = '#1e293b'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; }}
                                    >
                                        <ShieldCheck size={16} /> {isCheckingDeliv ? 'Tjekker...' : 'Tjek nu'}
                                    </button>
                                </div>

                                {delivResult?.error && (
                                    <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> <div>{delivResult.error}</div>
                                    </div>
                                )}

                                {delivResult?.checks && (() => {
                                    const s = DELIV_STYLES[delivResult.overall] || DELIV_STYLES.unknown;
                                    const banner = delivResult.overall === 'pass'
                                        ? `${delivResult.domain}: alt ser godt ud — dine mails er sat op til at lande i indbakken.`
                                        : delivResult.overall === 'fail'
                                            ? `${delivResult.domain}: der mangler noget vigtigt (se herunder). Det er sandsynligvis derfor tilbud ryger i spam.`
                                            : `${delivResult.domain}: virker, men kan gøres mere sikkert (se herunder).`;
                                    return (
                                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ padding: '10px 14px', borderRadius: '10px', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.5 }}>{banner}</div>
                                            <DelivRow title="SPF" check={delivResult.checks.spf} />
                                            <DelivRow title="DMARC" check={delivResult.checks.dmarc} />
                                            <DelivRow title="MX (mailserver)" check={delivResult.checks.mx} />
                                            <DelivRow title="DKIM" check={delivResult.checks.dkim} />

                                            {/* Gratis-hjælp-CTA — vises kun når der ER noget at rette (warn/fail). */}
                                            {delivResult.overall !== 'pass' && (
                                                helpState === 'sent' ? (
                                                    <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                        <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
                                                        <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
                                                            <strong>Tak! Vi hjælper dig gratis i gang.</strong><br />
                                                            Vi kontakter dig snarest{(settings.smtp_from_email || settings.smtp_user) ? ` på ${settings.smtp_from_email || settings.smtp_user}` : ''} og sætter det op sammen med dig, så dine tilbud lander i indbakken.
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,#eff6ff,#faf5ff)', border: '1px solid #bfdbfe' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #dbeafe' }}>
                                                                <ShieldCheck size={18} />
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginBottom: '2px' }}>Skal vi hjælpe dig — helt gratis?</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                                                                    Det ser tricky ud, men det er hurtigt fikset. Vi sætter det op for dig uden beregning, så alle dine tilbud lander i indbakken i stedet for spam.
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleRequestDnsHelp}
                                                            disabled={helpState === 'sending'}
                                                            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: helpState === 'sending' ? 'default' : 'pointer', opacity: helpState === 'sending' ? 0.7 : 1, boxShadow: '0 8px 20px rgba(37,99,235,0.25)', transition: 'transform 0.15s, box-shadow 0.2s, background 0.2s' }}
                                                            onMouseOver={(e) => { if (helpState !== 'sending') { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                                            onMouseOut={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                        >
                                                            <Mail size={16} /> {helpState === 'sending' ? 'Sender…' : 'Ja tak — hjælp mig gratis'}
                                                        </button>
                                                        {helpState === 'error' && (
                                                            <p style={{ margin: '8px 2px 0', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                                                                Vi åbnede din mail-app med anmodningen — send den, eller skriv til {BISON_SUPPORT_EMAIL}.
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                                                DNS-records indsættes hos den udbyder, hvor dit domæne er registreret (fx One.com, Simply, DanDomain eller din webmaster). Efter ændringen kan der gå op til et par timer, før den slår igennem.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

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

        {/* --- TRIN-GUIDE POPUP (app-kode-udbydere) --- */}
        {showProviderGuide && createPortal((() => {
            const p = SMTP_PROVIDERS.find(x => x.key === provider);
            if (!p || !p.appPassword) return null;
            return (
                <div onClick={() => setShowProviderGuide(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fce7f3', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={20} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.12rem', color: '#0f172a', fontWeight: 700 }}>Sådan får du en app-kode</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>{p.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProviderGuide(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(p.walkthrough || []).map((step, i) => (
                                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                    <div style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', background: '#db2777', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{step.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55, marginTop: '2px' }}>{step.desc}</div>
                                        {step.img && <img src={step.img} alt={step.title} style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }} />}
                                    </div>
                                </div>
                            ))}
                            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', background: '#db2777', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                                <ExternalLink size={16} /> Åbn app-kode-siden
                            </a>
                            <button type="button" onClick={() => setShowProviderGuide(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', padding: '4px' }}>Luk og udfyld selv</button>
                        </div>
                    </div>
                </div>
            );
        })(), document.body)}

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
