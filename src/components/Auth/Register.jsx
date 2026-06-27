import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Wrench, UserPlus, Building, FileText, Mail, Lock, User, Phone, MapPin, CheckSquare, Square, CheckCircle2, ArrowRight, ArrowLeft, Plus, Minus, ChevronDown, HelpCircle, X, Briefcase, HardHat, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { computePrice, formatKr, normalizeTeam, PRICES, VOLUME_FROM } from '../../utils/pricing';
import { BUSINESS_TYPES, ENABLED_SIGNUP_TRADES, signupTradeOptions } from '../../utils/features';

// Lækker Bison Frame-dropdown til branchevalg (erstatter den grimme native select).
const BusinessTypeSelect = ({ value, onChange, options = BUSINESS_TYPES }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);
    const selected = options.find(b => b.value === value);
    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-10 py-3.5 transition-all font-medium text-[15px] text-left relative ${open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
                <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                {selected?.label || 'Vælg branche…'}
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} size={18} />
            </button>
            {open && (
                <div
                    className="absolute z-30 mt-2 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-900/15 overflow-hidden p-1.5"
                    style={{ animation: 'bizDrop .18s cubic-bezier(0.16,1,0.3,1)' }}
                >
                    {options.map(b => {
                        const active = b.value === value;
                        return (
                            <button
                                key={b.value}
                                type="button"
                                onClick={() => { onChange(b.value); setOpen(false); }}
                                className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl text-left text-[15px] font-medium transition-colors ${active ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {b.label}
                                {active && <CheckCircle2 size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                            </button>
                        );
                    })}
                    <style>{`@keyframes bizDrop { from { opacity:0; transform: translateY(-6px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
                </div>
            )}
        </div>
    );
};

// Ultrakort forklaring af hold + prisstruktur — popper op i Frame-stil fra "?"-ikonet
// ved "Byg dit hold". Lukkes med X, klik udenfor eller Esc. Portales til <body>.
const TeamHelpPopup = ({ open, onClose }) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const rows = [
        {
            icon: <CheckCircle2 size={18} />,
            color: 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800',
            title: '1 mester er din grundplads',
            body: `Du starter altid med dig selv som mester for ${formatKr(PRICES.mester)} kr/md. Det er hele dit system — sager, tilbud, kunder og økonomi.`,
        },
        {
            icon: <Briefcase size={18} />,
            color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15',
            title: `Kontor: ${formatKr(PRICES.kontor)} kr/md pr. plads`,
            body: 'Ekstra mestre, projektledere og bogholdere — fuld adgang fra computeren. Du tilføjer kun dem, du faktisk har brug for.',
        },
        {
            icon: <HardHat size={18} />,
            color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15',
            title: `Felt: ${formatKr(PRICES.felt)} kr/md pr. plads`,
            body: 'Svende og lærlinge — app på telefonen til timer, billeder og tjeklister ude på sagen.',
        },
    ];

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={onClose}
            style={{ animation: 'thpFade .15s ease-out' }}
        >
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'thpPop .22s cubic-bezier(0.16,1,0.3,1)' }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Luk"
                    className="absolute top-3.5 right-3.5 w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="p-6 pb-5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Gift size={12} /> Sådan bygger du dit hold
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-3 leading-tight">Betal kun for dem, du tilføjer</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">
                        Frame koster pr. person — du sætter holdet sammen rolle for rolle. Ingen pakker, ingen binding.
                    </p>
                </div>

                <div className="px-6 flex flex-col gap-3">
                    {rows.map((r, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <span className={`shrink-0 w-9 h-9 rounded-xl inline-flex items-center justify-center ${r.color}`}>{r.icon}</span>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.title}</span>
                                <span className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">{r.body}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 mt-4">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3.5 flex items-start gap-2.5">
                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <p className="text-[12.5px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                            <strong>30 dage gratis — helt uden kort.</strong> Prøv hele holdet af i en hel måned. Bliver I mange, falder prisen automatisk fra den {VOLUME_FROM}. plads i hver rolle.
                        </p>
                    </div>
                </div>

                <div className="p-6 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl py-3 hover:opacity-90 transition-opacity"
                    >
                        Forstået — byg mit hold
                    </button>
                </div>

                <style>{`
                    @keyframes thpFade { from { opacity:0; } to { opacity:1; } }
                    @keyframes thpPop { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform: translateY(0) scale(1); } }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

const Register = ({ setSession }) => {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState('');
    const [cvr, setCvr] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [address, setAddress] = useState('');      // vej + husnr
    const [zip, setZip] = useState('');               // postnummer
    const [city, setCity] = useState('');             // by
    const [isAddressValid, setIsAddressValid] = useState(false);
    const [addrSuggestions, setAddrSuggestions] = useState([]);
    const [showAddrSuggestions, setShowAddrSuggestions] = useState(false);
    const addrDebounceRef = useRef(null);
    const addrBlurRef = useRef(null);
    useEffect(() => () => {
        if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
        if (addrBlurRef.current) clearTimeout(addrBlurRef.current);
    }, []);
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [businessType, setBusinessType] = useState(ENABLED_SIGNUP_TRADES[0] || 'tomrer');   // branche — styrer beregner/materialer-adgang
    // Rollebaseret hold — forudfyldes med holdet fra prissiden, hvis brugeren byggede et
    // der (gemt i 'bison_signup_team'). Ellers startes på 1 mester (249 kr). normalizeTeam
    // sikrer rene tal + mindst 1 mester, så et manipuleret/forældet payload aldrig vælter UI'et.
    const [team, setTeam] = useState(() => {
        try {
            const saved = sessionStorage.getItem('bison_signup_team');
            if (saved) return normalizeTeam(JSON.parse(saved));
        } catch { /* ignore — falder tilbage til standard-holdet */ }
        return { mester: 1, pl: 0, bog: 0, svend: 0, laer: 0 };
    });
    const teamPrice = computePrice(team);
    const stepTeam = (key, d, min) => setTeam(t => ({ ...t, [key]: Math.max(min, Math.min(299, (t[key] || 0) + d)) }));
    // Forklarings-popup til "Byg dit hold" — åbnes KUN når brugeren selv trykker på "?"-ikonet
    // (vises bevidst ikke automatisk; det forstyrrer midt i oprettelsen).
    const [showTeamHelp, setShowTeamHelp] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Adresse-autofuldførelse via DAWA (dataforsyningen) — officiel dansk adresse-API,
    // ingen nøgle nødvendig. Giver vej, husnr, postnr OG by i ét hug. Samme kilde som
    // resten af systemet bruger til postnr→by.
    const handleAddressChange = (value) => {
        setAddress(value);
        setIsAddressValid(false);
        if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
        if (!value || value.trim().length < 3) {
            setAddrSuggestions([]);
            setShowAddrSuggestions(false);
            return;
        }
        addrDebounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.dataforsyningen.dk/adgangsadresser/autocomplete?q=${encodeURIComponent(value)}&per_side=6`);
                if (!res.ok) return;
                const data = await res.json();
                setAddrSuggestions(Array.isArray(data) ? data : []);
                setShowAddrSuggestions(true);
            } catch { /* netværksfejl — ignorér, brugeren kan skrive manuelt */ }
        }, 200);
    };

    const selectAddress = (item) => {
        // DAWA leverer adressen under `adgangsadresse`. Hvis den mod forventning mangler,
        // udledes vej/postnr/by fra `tekst` ("Bragesvej 88, 4220 Korsør") som fallback.
        const a = item?.adgangsadresse || {};
        let street = [a.vejnavn, a.husnr].filter(Boolean).join(' ').trim();
        let postnr = a.postnr || '';
        let by = a.postnrnavn || '';
        if ((!street || !postnr) && item?.tekst) {
            const m = item.tekst.match(/^(.*?),\s*(\d{4})\s+(.+)$/);
            if (m) { street = street || m[1].trim(); postnr = postnr || m[2]; by = by || m[3].trim(); }
        }
        if (street) setAddress(street);
        if (postnr) setZip(postnr);
        if (by) setCity(by);
        setIsAddressValid(!!(street && postnr));
        setAddrSuggestions([]);
        setShowAddrSuggestions(false);
        if (addrBlurRef.current) clearTimeout(addrBlurRef.current);
    };

    // Skriver man et postnummer manuelt, slår vi byen op (DAWA) — så systemet altid
    // kender byen lige så snart det kender postnummeret.
    const handleZipChange = (value) => {
        const z = value.replace(/[^\d]/g, '').slice(0, 4);
        setZip(z);
        if (z.length === 4) {
            fetch(`https://api.dataforsyningen.dk/postnumre/${z}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(d => { if (d && d.navn) setCity(d.navn); })
                .catch(() => { /* ukendt postnr — lad brugeren udfylde by selv */ });
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
        
        if (password !== confirmPassword) {
            setErrorMsg("Adgangskoderne stemmer ikke overens.");
            return;
        }

        if (!acceptedTerms) {
            setErrorMsg("Du skal acceptere handelsbetingelserne for at oprette din portal.");
            return;
        }

        if (address.length < 5) {
            setErrorMsg("Du skal indtaste en gyldig adresse, så systemet kan udregne køreafstande.");
            return;
        }

        if (!zip || !city) {
            setErrorMsg("Vælg din adresse fra listen, eller udfyld postnummer og by — så systemet kan udregne køreafstande.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        // Fuld adresse (vej, postnr by) — bevares som ét felt så resten af systemet
        // (køreafstande, fakturahoved m.m.) fungerer uændret. Postnr + by sendes også
        // separat, så de kan genbruges struktureret.
        const fullAddress = [address, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ').trim();

        // 1. Opret bruger i Supabase Auth og GEM data i "rygsækken" (user_metadata)
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    company_name: companyName,
                    cvr: cvr,
                    owner_name: ownerName,
                    address: fullAddress,
                    zip: zip,
                    city: city,
                    phone: phone,
                    email: email,
                    business_type: businessType,
                    tier: 'role_based',
                    team: team,                          // {mester,pl,bog,svend,laer} — holdet de byggede
                    monthly_total: teamPrice.total       // kr/md ekskl. moms (til reference)
                },
                emailRedirectTo: window.location.origin + '/bekraeftet'
            }
        });

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            try { sessionStorage.removeItem('bison_signup_team'); } catch { /* ignore */ }
            // NOTE: Vi behøver ikke længere at kæmpe imod RLS ved at lave direkte database-inserts
            // under oprettelsen her. Dashboard.jsx aflæser user_metadata og bygger profilen perfekt, 
            // næste gang man lander på appen (sikkert), selv hvis man ventede på en email confirmation.
            
            // Send notifikation til Mads (Admin)
            import('../../utils/sendEmail').then(({ sendEmail }) => {
                import('../../utils/emailTemplates').then(({ getAdminNewSignupTemplate }) => {
                    sendEmail({
                        to: 'mbc@bisoncompany.dk',
                        subject: `Ny Tømrer: ${companyName}`,
                        html: getAdminNewSignupTemplate(companyName, cvr, ownerName, email, phone),
                        fromName: 'Bison Frame System'
                    }).catch(err => console.error("Fejl ved admin mail:", err));
                });
            });

            // Webhook kald til CRM systemet
            try {
                const price = teamPrice.total;
                const productName = `Bison Frame (rollebaseret · ${teamPrice.heads} bruger${teamPrice.heads > 1 ? 'e' : ''})`;

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
        } else if (!error) {
            setErrorMsg("Kunne ikke oprette profilen. E-mailen er muligvis allerede i brug.");
        }
        
        setLoading(false);
    };

    useEffect(() => {
        if (!isSuccess) return;

        // Lyt efter om kunden godkender e-mailen i en anden fane
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                if (typeof setSession === 'function') {
                    localStorage.setItem('dashboard_active_tab', 'overview');
                    setSession(session);
                }
                navigate('/dashboard');
            }
        });

        // Eksplicit fallback listener for tværgående faner (Cross-tab)
        const handleStorageChange = (e) => {
            if (e.key && e.key.includes('supabase.auth.token')) {
                window.location.href = '/dashboard';
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Cross-device: bekræfter man mailen på TELEFONEN, får denne fane (fx på desktop) ingen
        // auth-event. Vi poller derfor med brugerens egne loginoplysninger — signInWithPassword
        // fejler indtil e-mailen er bekræftet, og lykkes i samme øjeblik den er. Så snart det sker,
        // sættes sessionen og siden skifter til kontrolpanelet/onboarding — uanset hvilken enhed
        // bekræftelsen skete på.
        let stopped = false;
        const poll = setInterval(async () => {
            if (stopped) return;
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (stopped) return;
            if (!signInError && signInData?.session) {
                stopped = true;
                clearInterval(poll);
                if (typeof setSession === 'function') {
                    localStorage.setItem('dashboard_active_tab', 'overview');
                    setSession(signInData.session);
                }
                navigate('/dashboard');
            }
        }, 4000);

        return () => {
            stopped = true;
            clearInterval(poll);
            subscription.unsubscribe();
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [isSuccess, navigate, setSession, email, password]);

    if (isSuccess) {
        return (
            <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 max-w-lg w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                        <Mail size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Tjek din e-mail</h2>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Tak for din oprettelse! Vi har sendt en bekræftelsesmail til <strong className="text-slate-900 dark:text-slate-200">{email}</strong>. Klik på linket i mailen for at aktivere din platform.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
                        Husk at tjekke dit spam-filter, hvis du ikke kan finde den.
                    </p>
                    <Link to="/" className="inline-flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg">
                        Gå tilbage til forsiden
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-body text-slate-900 dark:text-slate-100">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-[640px] relative z-10">
                <div className="mb-8 flex justify-center md:justify-start">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <ArrowLeft size={16} />
                        Tilbage til forsiden
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 md:p-12">
                        <div className="flex flex-col items-center mb-10 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 dark:border-slate-700">
                                <img src="/logo.png" alt="Bison Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Opret dit tømrer-system</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Få fuld adgang til Bison Frame på under 1 minut.</p>
                        </div>
                        
                        <form onSubmit={handleRegister} className="flex flex-col gap-6">
                            {errorMsg && (
                                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-500/20 text-center">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Branche — vises kun når der er ÅBNET for mere end ét fag (ENABLED_SIGNUP_TRADES).
                                Med kun ét åbent fag er Frame et rent tømrer-system: business_type = 'tomrer',
                                og ikke-tømrere henvises til "kontakt os". Se utils/features.js for at åbne fag. */}
                            {/* Branche-vælger vises kun når der er åbnet for mere end ét fag.
                                Med kun tømrer åbent er Frame et rent tømrer-system — ingen branche-boks. */}
                            {signupTradeOptions().length > 1 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Hvilken slags håndværker er du? *</label>
                                    <BusinessTypeSelect value={businessType} onChange={setBusinessType} options={signupTradeOptions()} />
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">Tømrere får prisberegner + materialer. Andre fag laver hurtige tilbud — alt det øvrige er ens.</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Firmanavn */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Firmanavn *</label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Dit Firma ApS" value={companyName} onChange={e=>setCompanyName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* CVR */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">CVR-nummer *</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="12345678" value={cvr} onChange={e=>setCvr(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Ejer */}
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Kontaktperson *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Jens Jensen" value={ownerName} onChange={e=>setOwnerName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Adresse (DAWA-autofuldførelse) */}
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Firmaadresse *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Søg på firmaets adresse"
                                            value={address}
                                            onChange={(e) => handleAddressChange(e.target.value)}
                                            onFocus={() => { if (addrSuggestions.length) setShowAddrSuggestions(true); }}
                                            onBlur={() => { addrBlurRef.current = setTimeout(() => setShowAddrSuggestions(false), 150); }}
                                            autoComplete="off"
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]"
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        />
                                        {showAddrSuggestions && addrSuggestions.length > 0 && (
                                            <ul className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                                                {addrSuggestions.map((item, idx) => (
                                                    <li key={item.tekst + idx}>
                                                        <button
                                                            type="button"
                                                            onPointerDown={(e) => { e.preventDefault(); selectAddress(item); }}
                                                            className="w-full text-left px-4 py-3 text-[14px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0"
                                                        >
                                                            <MapPin size={15} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{item.tekst}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">Vælg din adresse fra listen — så udfyldes postnummer og by automatisk.</p>
                                </div>

                                {/* Postnummer */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Postnummer *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" inputMode="numeric" placeholder="1234" value={zip} onChange={(e) => handleZipChange(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* By */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">By *</label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="København" value={city} onChange={(e) => setCity(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Telefon */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Telefonnummer *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="tel" placeholder="+45 12 34 56 78" value={phone} onChange={handlePhoneChange} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Bruger E-mail *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="email" placeholder="kontakt@firma.dk" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Adgangskode *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="password" placeholder="Min. 6 tegn" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Gentag kode *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="password" placeholder="Min. 6 tegn" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={6} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800 my-2" />

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Byg dit hold (30 Dage Gratis) *</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowTeamHelp(true)}
                                            aria-label="Sådan fungerer holdet og priserne"
                                            className="shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                        >
                                            <HelpCircle size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1 w-max">
                                        <CheckCircle2 size={12} /> Intet kort påkrævet
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-1 ml-1">Du starter som 1 mester (249 kr). Tilføj resten her — eller byg holdet på prissiden først.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {[
                                        { key: 'mester', label: 'Mestre', hint: '1 inkl. (249) · ekstra 149', min: 1 },
                                        { key: 'pl', label: 'Projektledere', hint: '149 kr · kontor', min: 0 },
                                        { key: 'bog', label: 'Bogholdere', hint: '149 kr · kontor', min: 0 },
                                        { key: 'svend', label: 'Svende', hint: '99 kr · felt', min: 0 },
                                        { key: 'laer', label: 'Lærlinge', hint: '99 kr · felt', min: 0 },
                                    ].map(r => (
                                        <div key={r.key} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.label}</span>
                                                <span className="text-[11px] font-semibold text-slate-400">{r.hint}</span>
                                            </div>
                                            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                <button type="button" onClick={() => stepTeam(r.key, -1, r.min)} aria-label={`Færre ${r.label}`} className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 transition-colors"><Minus size={16} /></button>
                                                <span className="min-w-[34px] text-center text-sm font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{team[r.key]}</span>
                                                <button type="button" onClick={() => stepTeam(r.key, 1, r.min)} aria-label={`Flere ${r.label}`} className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 transition-colors"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pr. måned · eks. moms</span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-tight">{formatKr(teamPrice.total)}</span>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                                        <CheckCircle2 size={14} strokeWidth={3} /> Gratis i 30 dage · {teamPrice.heads} bruger{teamPrice.heads > 1 ? 'e' : ''}
                                    </span>
                                </div>
                                {teamPrice.isEnterprise && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2">Over 40 ansatte? Vi laver en fast entreprisepris — skriv til <a href="mailto:kontakt@bisonframe.dk" className="text-blue-600 dark:text-blue-400 font-bold">kontakt@bisonframe.dk</a>.</p>
                                )}
                            </div>

                            <TeamHelpPopup open={showTeamHelp} onClose={() => setShowTeamHelp(false)} />

                            <div className="mt-2">
                                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 cursor-pointer group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                    <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only"
                                            checked={acceptedTerms}
                                            onChange={() => setAcceptedTerms(!acceptedTerms)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                                            <CheckCircle2 size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                                        Jeg accepterer hermed <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">handelsbetingelserne</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Databehandleraftalen (DPA)</a>, og bekræfter, at alle angivne oplysninger er korrekte, samt at Bison Frame optræder som databehandler.
                                    </p>
                                </label>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-70 group">
                                {loading ? 'Opretter system...' : (
                                    <>
                                        Start din gratis prøveperiode nu
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 text-sm mr-2">Har du allerede et system?</span>
                        <button onClick={() => { navigate('/login'); }} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors">
                            Log ind her
                        </button>
                    </div>
                </div>
                
                <div className="text-center mt-8 pb-8">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Opret nemt din platform. Data lagres krypteret i EU.</p>
                </div>
            </div>
        </div>
    );
};

export default Register;
