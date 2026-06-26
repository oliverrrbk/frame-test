import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import PageTransition from '../ui/PageTransition';
import { User, Users, Hammer, Building2, CheckCircle2, ArrowRight, Plus, Minus, Calculator } from 'lucide-react';
import { computePrice, formatKr } from '../../utils/pricing';

// Rolle-kort (rollebaseret prismodel). Mester 249 · Kontor 149→119 · Felt 99→79 · Entreprise (over 40).
const ROLE_CARDS = [
    {
        id: 'mester', name: 'Mester', sub: 'Dig der ejer butikken — bruger 1.', icon: 'user',
        price: '249', per: 'kr/md',
        features: ['Hele systemet — tilbud, ordrestyring, tegneprogram, økonomi & faktura', 'Økonomisk overblik + let samspil med dit lønsystem', 'Hold styr på hele din forretning og dine ansatte', 'Gratis hjælp til opstart — vi følger dig hele vejen, til du mestrer det'],
        note: 'Fast grundpris · altid din første bruger',
    },
    {
        id: 'kontor', name: 'Kontor', sub: 'Projektleder · bogholder · ekstra mester.', icon: 'users',
        price: '149', per: 'kr/md pr. bruger',
        features: ['Tilbud, sager & fakturering', 'Styr på økonomi & lønkørsel'],
        note: '↓ 119 kr/md fra bruger nr. 11',
    },
    {
        id: 'felt', name: 'Felt', sub: 'Svend · lærling — ude på pladsen.', icon: 'hammer',
        price: '99', per: 'kr/md pr. bruger',
        features: ['Timer, opgaver & materialer', "App'en i marken — timer der bliver til løn"],
        note: '↓ 79 kr/md fra bruger nr. 11',
    },
    {
        id: 'enterprise', name: 'Entreprise', sub: 'Til den større håndværksvirksomhed.', icon: 'building',
        price: 'Fast pris', per: '',
        features: ['Over 40 ansatte', 'Fast aftalt månedspris + onboarding'],
        contact: true,
    },
];

const CardIcon = ({ type, size = 80, strokeWidth = 1 }) => {
    if (type === 'user') return <User size={size} strokeWidth={strokeWidth} />;
    if (type === 'users') return <Users size={size} strokeWidth={strokeWidth} />;
    if (type === 'hammer') return <Hammer size={size} strokeWidth={strokeWidth} />;
    return <Building2 size={size} strokeWidth={strokeWidth} />;
};

// Den interaktive "Byg dit hold"-beregner (rolig, hvid stil — som "Hvad koster tilbud dig?").
function TeamCalculator({ onStart }) {
    const [team, setTeam] = useState({ mester: 1, pl: 0, bog: 0, svend: 0, laer: 0 });
    const result = useMemo(() => computePrice(team), [team]);

    const ROWS = [
        { key: 'mester', label: 'Mestre', hint: '1 × 249 inkl. · ekstra 149', min: 1 },
        { key: 'pl', label: 'Projektledere', hint: '149 kr · kontor', min: 0 },
        { key: 'bog', label: 'Bogholdere', hint: '149 kr · kontor', min: 0 },
        { key: 'svend', label: 'Svende', hint: '99 kr · felt', min: 0 },
        { key: 'laer', label: 'Lærlinge', hint: '99 kr · felt', min: 0 },
    ];
    const step = (key, d, min) => setTeam(t => ({ ...t, [key]: Math.max(min, Math.min(299, (t[key] || 0) + d)) }));

    return (
        <section className="w-full max-w-[1180px] mx-auto mb-[clamp(6rem,10vw,8rem)] relative z-10">
            <div className="bg-white dark:bg-slate-900 rounded-[1.9rem] border border-slate-200 dark:border-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-[clamp(1.5rem,3.5vw,2.6rem)] grid md:grid-cols-2 gap-[clamp(1.4rem,3vw,2.6rem)]">
                {/* Venstre: holdet */}
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0"><Calculator size={20} /></span>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Byg dit hold</h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[0.95rem] mb-5 max-w-[46ch]">Skru op og ned — din samlede pris pr. måned regnes ud med det samme.</p>
                    <div className="flex flex-col gap-2.5">
                        {ROWS.map(r => (
                            <div key={r.key} className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 transition-all hover:border-slate-300 hover:-translate-y-px hover:shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-[0.96rem] text-slate-900 dark:text-slate-100">{r.label}</span>
                                    <span className="text-[0.76rem] font-semibold text-slate-400">{r.hint}</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <button onClick={() => step(r.key, -1, r.min)} aria-label={`Færre ${r.label}`} className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 transition-colors"><Minus size={17} /></button>
                                    <span className="min-w-[42px] text-center font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{team[r.key]}</span>
                                    <button onClick={() => step(r.key, 1, r.min)} aria-label={`Flere ${r.label}`} className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 transition-colors"><Plus size={17} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Højre: opsummering */}
                <div className="flex flex-col gap-3.5 self-start">
                    <span className="text-[0.72rem] font-extrabold tracking-[0.12em] uppercase text-slate-500">Din månedlige pris</span>
                    <div className="flex items-baseline gap-2">
                        <b className="text-[3rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">{formatKr(result.total)}</b>
                        <span className="text-base text-slate-500 font-semibold">kr/md · eks. moms</span>
                    </div>
                    <span className="text-[0.85rem] text-slate-500 -mt-2">for {result.heads} bruger{result.heads > 1 ? 'e' : ''}</span>

                    <div className="flex flex-col gap-1.5 text-[0.9rem] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5">
                        {result.lines.map(l => (
                            <div key={l.label} className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                                <span>{l.label} ({l.count})</span>
                                <b className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">{formatKr(l.amount)} kr</b>
                            </div>
                        ))}
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-[0.7rem] font-extrabold tracking-widest uppercase text-emerald-700 dark:text-emerald-400 mb-0.5"><CheckCircle2 size={14} strokeWidth={3} /> Gratis den første måned</div>
                        <p className="text-[0.86rem] text-emerald-800 dark:text-emerald-300/90 m-0">Du betaler først om 30 dage — og du skal ikke indtaste kort nu.</p>
                    </div>

                    {result.isEnterprise && (
                        <div className="text-[0.82rem] text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5">
                            Over 40 ansatte? Så laver vi en fast entreprisepris til jer — <a href="mailto:kontakt@bisonframe.dk" className="text-blue-600 dark:text-blue-400 font-bold">kontakt os</a>.
                        </div>
                    )}

                    <button onClick={() => onStart(team)} className="flex items-center justify-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl py-4 text-base font-extrabold shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-transform">
                        Start 30 dages gratis prøve <ArrowRight size={18} />
                    </button>
                    <p className="text-[0.78rem] text-slate-400 text-center">Ingen kortoplysninger påkrævet</p>
                </div>
            </div>
        </section>
    );
}

export default function PricingPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

    // Gem holdet og send med til register, så onboarding starter med samme hold.
    const startTrial = (team) => {
        try { if (team) sessionStorage.setItem('bison_signup_team', JSON.stringify(team)); } catch { /* ignore */ }
        navigate('/register');
    };

    // Final CTA scroll-glow (uændret).
    const ctaRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: ctaRef, offset: ['start end', 'end end'] });
    const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);

    useEffect(() => { /* Scroll restoration handled globally */ }, []);

    return (
        <PageTransition className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col relative overflow-hidden">
            {/* Infinite Grid Overlay */}
            <div className="absolute inset-0 grid-pattern pointer-events-none z-0"></div>

            <TopNavBar onLoginClick={() => setIsLoginOpen(true)} />

            <main className="flex-grow flex flex-col items-center justify-start w-full px-6 md:px-12 pt-16 pb-24 z-10 relative">

                {/* Hero */}
                <section className="w-full max-w-4xl flex flex-col items-start gap-6 mt-12 mb-[clamp(4rem,8vw,6rem)] relative z-10">
                    <div className="absolute -top-20 -left-48 md:-left-64 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-12 md:-right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-2 border border-slate-200/50 dark:border-slate-700/50">
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Simple Priser
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-[clamp(2.15rem,6vw,4.5rem)] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.15] max-w-3xl">
                        Gennemskuelige <span className="text-orange-600 dark:text-orange-400">Priser</span> for Håndværkere.
                    </motion.h1>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-4">
                        Betal kun for det, dine folk faktisk bruger. Din kontorbruger og din svend bruger ikke systemet ens — så de koster ikke det samme. Ingen skjulte gebyrer eller binding.
                    </motion.p>
                </section>

                {/* Rolle-kort */}
                <section className="w-full max-w-[1180px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-[clamp(3rem,6vw,4.5rem)] relative z-10">
                    {ROLE_CARDS.map((card, idx) => (
                        <motion.div key={card.id} whileHover={{ y: -6 }}
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 * (idx + 1), duration: 0.5 }} viewport={{ once: true, margin: '-50px' }}
                            className="bg-white dark:bg-slate-900 rounded-[1.7rem] p-7 flex flex-col gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 dark:border-slate-800">
                            <div className="absolute top-0 right-0 p-5 opacity-[0.05] dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100">
                                <CardIcon type={card.icon} size={72} />
                            </div>

                            <div className="flex flex-col gap-1.5 relative z-10">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{card.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{card.sub}</p>
                            </div>

                            <div className="flex items-baseline gap-1.5 relative z-10">
                                <span className={`font-extrabold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums ${card.contact ? 'text-2xl' : 'text-[2.7rem] leading-none'}`}>{card.price}</span>
                                {card.per && <span className="text-sm text-slate-500 dark:text-slate-400">{card.per}</span>}
                            </div>

                            <ul className="flex flex-col gap-2.5 text-[0.9rem] text-slate-600 dark:text-slate-300 flex-grow relative z-10">
                                {card.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={17} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            {card.contact ? (
                                <a href="mailto:kontakt@bisonframe.dk" className="relative z-10 text-center rounded-full py-3 font-bold text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity">Kontakt os</a>
                            ) : (
                                <div className="relative z-10 text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">{card.note}</div>
                            )}
                        </motion.div>
                    ))}
                </section>

                {/* Beregner */}
                <TeamCalculator onStart={startTrial} />

                {/* Integration Value Proposition */}
                <section className="w-full max-w-4xl mx-auto mb-[clamp(6rem,10vw,8rem)] relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                            Altid Inkluderet
                        </div>
                        <h2 className="text-[clamp(1.5rem,2.5vw,2rem)] font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                            Meget mere end bare en tilbudsberegner
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-[clamp(1rem,1.2vw,1.125rem)] leading-relaxed mb-8">
                            Det kan være svært at holde styr på alle de tilbud, man har ude. Bison Frame samler det hele ét sted, så du aldrig misser en besked eller glemmer at følge op. Du får et dejligt overblik over dine kunder – og når opgaven er i hus, overføres sagen automatisk direkte til dit foretrukne regnskabs- eller ordrestyringsprogram med ét klik.
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">e-conomic</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Ordrestyring</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Dinero</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Apacta</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Minuba</span>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="w-full max-w-5xl flex flex-col gap-12 pt-16 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10 mb-[clamp(6rem,10vw,8rem)]">
                    <div className="flex items-center gap-4">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-[0.65rem] uppercase tracking-widest px-2 py-1 bg-orange-100/50 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 rounded">Dok. Ref. FAQ-01</span>
                        <h2 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold text-slate-900 dark:text-slate-100">Ofte Stillede Spørgsmål</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        {[
                            ['01.', 'Betaler jeg pr. bruger?', 'Ja — du betaler kun for de folk, der faktisk er på systemet. Mester koster 249, kontor-brugere 149 og svende/lærlinge 99 pr. måned. Fra den 11. af samme type falder prisen automatisk.'],
                            ['02.', 'Hvad sker der efter de 30 dage?', 'Du prøver alt gratis i 30 dage uden at indtaste kort. Når prøven slutter, beder vi om betalingskort — vil du ikke fortsætte, sker der ingenting.'],
                            ['03.', 'Kan jeg tilføje og fjerne folk løbende?', 'Ja. Tilføjer du en medarbejder, lægges prisen oven på fra næste regning (prorateret). Stopper en, fjerner du sædet og betaler ikke for det næste måned.'],
                            ['04.', 'Hvad hvis vi er mere end 40 ansatte?', 'Så laver vi en fast entreprisepris, der passer til jer — kontakt os, og vi giver et klart tilbud med onboarding inkluderet.'],
                        ].map(([num, q, a], i) => (
                            <motion.div key={num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 * (i + 1) }} viewport={{ once: true, margin: '-50px' }} className="flex flex-col gap-3">
                                <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                    <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">{num}</span>
                                    {q}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">{a}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-20 relative z-10">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }} viewport={{ once: true }}
                        style={{ WebkitTransform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-[clamp(3rem,6vw,5rem)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800/[0.5]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <motion.div style={{ opacity: glowOpacity }} className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></motion.div>

                        <div className="flex flex-col gap-4 relative z-10 max-w-xl text-center md:text-left">
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Prøv uden risiko
                            </h2>
                            <p className="text-[clamp(1rem,1.25vw,1.125rem)] text-slate-500 dark:text-slate-400">
                                Start din gratis måned i dag. Opret dig lynhurtigt og prøv hele systemet i 30 dage – helt uden at indtaste betalingsoplysninger.
                            </p>
                        </div>

                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => startTrial(null)}
                                style={{ WebkitTransform: 'translateZ(0)' }}
                                className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-5 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group">
                                Start din gratis prøveperiode
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>
                    </motion.div>
                </section>
            </main>

            <Footer />

            {/* SLIDE-OUT LOGIN DRAWER */}
            <AnimatePresence>
                {isLoginOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }}
                            onClick={() => setIsLoginOpen(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '550px', background: '#f8fafc', zIndex: 110, overflowY: 'auto', WebkitTransform: 'translateZ(0)', willChange: 'transform' }}
                            className="shadow-[-10px_0_40px_rgba(0,0,0,0.2)]">
                            <div style={{ position: 'relative', zIndex: 110, minHeight: '100%' }}>
                                <Login setSession={setSession} onClose={() => setIsLoginOpen(false)} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
