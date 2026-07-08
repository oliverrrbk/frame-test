import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useMotionTemplate, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import PageTransition from '../ui/PageTransition';
import { User, Users, Hammer, CheckCircle2, ArrowRight, Plus, Minus, Calculator, Clock } from 'lucide-react';
import { computePrice, formatKr } from '../../utils/pricing';

// Ny prismodel (juli 2026): to grundplaner + gennemsigtige tillæg pr. ekstra bruger.
const PLAN_CARDS = [
    {
        id: 'solo', name: 'Solo', sub: 'Dig, der er alene om det.', icon: 'user',
        price: '390', per: 'kr/md',
        features: [
            'Hele systemet — tilbud, ordrestyring, tegneprogram, økonomi & faktura',
            'Fuldt økonomisk overblik over din forretning',
            'Gratis hjælp — altid, ikke kun ved opstart. Vi tilpasser systemet til din forretning, til det spiller',
        ],
        note: '1 bruger · uden timeregistrering (du er jo alene)',
        cta: 'Kom gratis i gang som Solo',
        // Klik → oprettelse forudfyldt som Solo (1 mester, heads=1 → plan 'solo').
        signupTeam: { mester: 1, pl: 0, bog: 0, svend: 0, laer: 0 },
    },
    {
        id: 'hold', name: 'Hold', sub: 'Dig og dit hold.', icon: 'users', featured: true,
        price: '890', per: 'kr/md',
        features: [
            'Alt i Solo — plus timeregistrering',
            '3 brugere inkl. (mester + 2)',
            'Timer i marken der bliver til løn — let samspil med dit lønsystem',
            'Gratis hjælp — altid, ikke kun ved opstart. Vi tilpasser systemet til din forretning, til det spiller',
        ],
        note: 'Flere med? Tilføj brugere til fast pris — se herunder',
        cta: 'Kom gratis i gang som Hold',
        // Klik → oprettelse forudfyldt som Hold (mester + 1 svend, heads=2 → plan 'hold',
        // stadig 890 da svenden er dækket af de 3 inkluderede pladser).
        signupTeam: { mester: 1, pl: 0, bog: 0, svend: 1, laer: 0 },
    },
];

// Tillæg pr. ekstra bruger (fra bruger nr. 4). Prisen falder efter bruger 10 og 50.
const EXTRA_TIERS = [
    { role: 'Kontor', sub: 'Projektleder · bogholder · ekstra mester', steps: [149, 119, 99] },
    { role: 'Svend', sub: 'Ude på pladsen', steps: [129, 99, 79] },
    { role: 'Lærling', sub: 'Mindre brug end en svend', steps: [79, 59, 49] },
];

const CardIcon = ({ type, size = 80, strokeWidth = 1 }) => {
    if (type === 'user') return <User size={size} strokeWidth={strokeWidth} />;
    if (type === 'hammer') return <Hammer size={size} strokeWidth={strokeWidth} />;
    return <Users size={size} strokeWidth={strokeWidth} />;
};

// Klikbart grundplan-kort. Hele kortet fører til oprettelse forudfyldt med planen.
// Hover følger musen (glød + let 3D-tilt) og bruger en snappy fjeder, så det føles
// responsivt — IKKE den langsomme entrance-timing. Vigtigt: framers transform (tilt/
// lift) og CSS må ikke slås om samme egenskab, derfor transition KUN på skygge/kant.
function PlanCard({ card, idx, onSelect }) {
    // Rå museposition (0..1 relativt til kortet) → blødgjort med fjeder.
    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const sx = useSpring(px, { stiffness: 300, damping: 30, mass: 0.5 });
    const sy = useSpring(py, { stiffness: 300, damping: 30, mass: 0.5 });

    // Glød der følger cursoren.
    const glowX = useTransform(sx, v => `${v * 100}%`);
    const glowY = useTransform(sy, v => `${v * 100}%`);
    const glow = useMotionTemplate`radial-gradient(420px circle at ${glowX} ${glowY}, rgba(59,130,246,0.16), transparent 65%)`;

    // Let 3D-tilt mod musen (maks ~5deg).
    const rotX = useTransform(sy, [0, 1], [5, -5]);
    const rotY = useTransform(sx, [0, 1], [-5, 5]);

    const handleMove = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
    };
    const handleLeave = () => { px.set(0.5); py.set(0.5); };

    return (
        <motion.div
            role="button" tabIndex={0}
            onClick={() => onSelect(card.signupTeam)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(card.signupTeam); } }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            aria-label={`${card.cta} — ${card.price} ${card.per}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0, transition: { delay: 0.08 * (idx + 1), duration: 0.5 } }}
            viewport={{ once: true, margin: '-50px' }}
            whileHover={{ y: -10, transition: { type: 'spring', stiffness: 400, damping: 20, mass: 0.5 } }}
            whileTap={{ scale: 0.98, transition: { type: 'spring', stiffness: 600, damping: 30 } }}
            style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
            className={`group cursor-pointer bg-white dark:bg-slate-900 rounded-[1.7rem] p-7 flex flex-col gap-4 relative overflow-hidden transition-[box-shadow,border-color,ring-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${card.featured ? 'shadow-lg ring-2 ring-blue-500/60 dark:ring-blue-400/50 hover:ring-blue-500 hover:shadow-2xl hover:shadow-blue-500/25' : 'shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-500/60'}`}>

            {/* Musefølgende glød — ligger under indholdet, tændes blødt på hover. */}
            <motion.div aria-hidden className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: glow }} />

            {card.featured && (
                <span className="absolute top-5 right-5 z-20 text-[0.62rem] font-extrabold tracking-widest uppercase bg-blue-600 text-white px-2.5 py-1 rounded-full">Mest populær</span>
            )}
            <div className="absolute top-0 right-0 p-5 opacity-[0.05] dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6">
                <CardIcon type={card.icon} size={72} />
            </div>

            <div className="flex flex-col gap-1.5 relative z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{card.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.sub}</p>
            </div>

            <div className="flex items-baseline gap-1.5 relative z-10">
                <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums text-[2.7rem] leading-none">{card.price}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{card.per}</span>
            </div>

            <ul className="flex flex-col gap-2.5 text-[0.9rem] text-slate-600 dark:text-slate-300 flex-grow relative z-10">
                {card.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={17} />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>

            <div className="relative z-10 text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">{card.note}</div>

            {/* Klik-affordance: hele kortet fører til oprettelse med den valgte plan. */}
            <div className={`relative z-10 mt-1 flex flex-col items-center gap-1 rounded-xl py-3 transition-colors duration-200 ${card.featured ? 'bg-blue-600 text-white group-hover:bg-blue-500' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 group-hover:bg-slate-800 dark:group-hover:bg-slate-100'}`}>
                <span className="flex items-center gap-2 text-[0.95rem] font-extrabold">
                    {card.cta}
                    <ArrowRight size={18} className="transition-transform duration-200 ease-out group-hover:translate-x-1.5" />
                </span>
                <span className={`text-[0.72rem] font-semibold ${card.featured ? 'text-blue-100' : 'text-white/70 dark:text-slate-900/60'}`}>30 dage gratis · intet kort</span>
            </div>
        </motion.div>
    );
}

// Den interaktive "Byg dit hold"-beregner (rolig, hvid stil — som "Hvad koster tilbud dig?").
function TeamCalculator({ onStart }) {
    const [team, setTeam] = useState({ mester: 1, pl: 0, bog: 0, svend: 0, laer: 0 });
    const result = useMemo(() => computePrice(team), [team]);

    const ROWS = [
        { key: 'mester', label: 'Mestre', hint: '1 inkl. i grundprisen', min: 1 },
        { key: 'pl', label: 'Projektledere', hint: '149 kr · kontor', min: 0 },
        { key: 'bog', label: 'Bogholdere', hint: '149 kr · kontor', min: 0 },
        { key: 'svend', label: 'Svende', hint: '129 kr', min: 0 },
        { key: 'laer', label: 'Lærlinge', hint: '79 kr', min: 0 },
    ];
    const step = (key, d, min) => setTeam(t => ({ ...t, [key]: Math.max(min, Math.min(299, (t[key] || 0) + d)) }));

    const planName = result.plan === 'hold' ? 'Hold' : 'Solo';

    return (
        <section className="w-full max-w-[1180px] mx-auto mb-[clamp(8rem,13vw,11rem)] relative z-10">
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
                    <span className="text-[0.85rem] text-slate-500 -mt-2">
                        <b className="text-slate-700 dark:text-slate-300">{planName}</b> · {result.heads} bruger{result.heads > 1 ? 'e' : ''}
                        {result.plan === 'hold' && result.freeExtraSeats > 0 && ` · ${result.usedIncluded} inkl.`}
                    </span>

                    <div className="flex flex-col gap-1.5 text-[0.9rem] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5">
                        {result.lines.map(l => (
                            <div key={l.label} className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                                <span>{l.isBase ? `${l.label} (${l.count} bruger${l.count > 1 ? 'e' : ''} inkl.)` : `${l.label} (${l.count})`}</span>
                                <b className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">{l.amount > 0 ? `${formatKr(l.amount)} kr` : 'inkl.'}</b>
                            </div>
                        ))}
                    </div>

                    {result.plan === 'solo' ? (
                        <div className="flex items-start gap-2.5 text-[0.84rem] text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl px-4 py-3">
                            <Clock size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" strokeWidth={2.4} />
                            <span>Solo er uden timeregistrering. Tilføj bare én mere, så er du på <b>Hold</b> — med timeregistrering og 2 ekstra brugere inkluderet.</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[0.84rem] text-emerald-800 dark:text-emerald-300/90 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl px-4 py-3">
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.6} /> Timeregistrering er med · prisen falder efter bruger 10 og 50
                        </div>
                    )}

                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-[0.7rem] font-extrabold tracking-widest uppercase text-emerald-700 dark:text-emerald-400 mb-0.5"><CheckCircle2 size={14} strokeWidth={3} /> 30 dage gratis — uden risiko</div>
                        <p className="text-[0.86rem] text-emerald-800 dark:text-emerald-300/90 m-0">Du bliver ikke trukket for noget, og du behøver ikke indtaste kort. Din konto forbliver aktiv — du kan logge ind igen når som helst.</p>
                    </div>

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

            <main className="flex-grow flex flex-col items-center justify-start w-full px-6 md:px-12 pt-24 pb-36 z-10 relative">

                {/* Hero */}
                <section className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-8 mt-16 mb-[clamp(6rem,11vw,9rem)] relative z-10">
                    <div className="absolute -top-20 -left-48 md:-left-64 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-12 md:-right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-2 border border-slate-200/50 dark:border-slate-700/50">
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Simple Priser
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-[clamp(2.15rem,6vw,4.5rem)] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.15] max-w-3xl">
                        Gennemskuelige <span className="text-orange-600 dark:text-orange-400">Priser</span> for Tømrere.
                    </motion.h1>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-4">
                        To enkle grundpriser — herfra betaler du kun for de folk, du faktisk har med. Ingen skjulte gebyrer, ingen binding. Og vi kommer ud og sætter det hele op gratis — og følger jer i mål, indtil det spiller præcis til jeres virksomhed.
                    </motion.p>
                </section>

                {/* Grundplaner — kun Solo + Hold, centreret over beregneren */}
                <section className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-[clamp(5rem,9vw,7rem)] relative z-10 items-stretch">
                    {PLAN_CARDS.map((card, idx) => (
                        <PlanCard key={card.id} card={card} idx={idx} onSelect={startTrial} />
                    ))}
                </section>

                {/* Beregner */}
                <TeamCalculator onStart={startTrial} />

                {/* Ekstra brugere — forklaring UNDER beregneren */}
                <section className="w-full max-w-[1180px] mx-auto mb-[clamp(8rem,13vw,11rem)] relative z-10">
                    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }} viewport={{ once: true, margin: '-60px' }}
                        className="bg-white dark:bg-slate-900 rounded-[1.9rem] border border-slate-200 dark:border-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-[clamp(1.5rem,3.5vw,2.6rem)]">
                        <div className="flex items-start gap-3 mb-6">
                            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0"><Hammer size={20} /></span>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Ekstra brugere</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-[0.95rem] mt-1 max-w-[62ch]">Er I mere end 3 på holdet, betaler du kun for dem, du har med — pris pr. bruger fra nr. 4, efter rolle. Og jo flere I bliver, jo billigere bliver hver ekstra bruger.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Header (kun desktop) */}
                            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 text-[0.68rem] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                                <span>Rolle</span>
                                <span className="text-right">Bruger 4–10</span>
                                <span className="text-right">11–50</span>
                                <span className="text-right">51+</span>
                            </div>
                            {EXTRA_TIERS.map((t, i) => (
                                <div key={t.role} className={`px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1.6fr_1fr_1fr_1fr] sm:items-center sm:gap-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{t.role}</span>
                                            <span className="text-[0.78rem] text-slate-400">{t.sub}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 sm:contents">
                                            {t.steps.map((price, si) => (
                                                <div key={si} className="text-left sm:text-right">
                                                    <span className="sm:hidden block text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{['4–10', '11–50', '51+'][si]}</span>
                                                    <span className={`font-bold tabular-nums ${si === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'}`}>{price}<span className="text-[0.7rem] font-semibold text-slate-400"> kr</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[0.85rem] text-slate-500 dark:text-slate-400 mt-4 flex items-start gap-2">
                            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.6} />
                            De 3 første brugere er inkluderet i Hold. Prisen pr. ekstra bruger falder automatisk efter bruger nr. 10 og nr. 50 — uanset rolle.
                        </p>
                    </motion.div>
                </section>

                {/* FAQ — lige efter priserne, så tvivl besvares med det samme */}
                <section className="w-full max-w-5xl flex flex-col gap-16 pt-24 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10 mb-[clamp(8rem,13vw,11rem)]">
                    <div className="flex items-center gap-4">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-[0.65rem] uppercase tracking-widest px-2 py-1 bg-orange-100/50 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 rounded">Dok. Ref. FAQ-01</span>
                        <h2 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold text-slate-900 dark:text-slate-100">Ofte Stillede Spørgsmål</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-16">
                        {[
                            ['01.', 'Hvad er forskellen på Solo og Hold?', 'Solo er 390 kr/md for dig alene — hele systemet, men uden timeregistrering. Hold er 890 kr/md og giver 3 brugere (dig + 2) samt timeregistrering. Så snart du har mere end én bruger, er du på Hold.'],
                            ['02.', 'Hvad koster en ekstra bruger?', 'Fra bruger nr. 4 betaler du pr. bruger: kontor (projektleder/bogholder) 149, svend 129 og lærling 79 kr/md. Prisen falder automatisk efter bruger nr. 10 og igen efter nr. 50 — uanset rolle.'],
                            ['03.', 'Hvad sker der efter de 30 dage?', 'Du prøver alt gratis i 30 dage uden at indtaste kort. Når prøven slutter, beder vi om betalingskort — vil du ikke fortsætte, sker der ingenting.'],
                            ['04.', 'Kan jeg tilføje og fjerne folk løbende?', 'Ja. Tilføjer du en medarbejder, lægges prisen oven på fra næste regning (prorateret). Stopper en, fjerner du sædet og betaler ikke for det næste måned. Prisen er gennemsigtig hele vejen — også for store hold.'],
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

                {/* Integration Value Proposition — efter FAQ */}
                <section className="w-full max-w-4xl mx-auto mb-[clamp(8rem,13vw,11rem)] relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                            Altid Inkluderet
                        </div>
                        <h2 className="text-[clamp(1.5rem,2.5vw,2rem)] font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                            Meget mere end bare en tilbudsberegner
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-[clamp(1rem,1.2vw,1.125rem)] leading-relaxed mb-8">
                            Det kan være svært at holde styr på alle de tilbud, man har ude. Bison Frame samler det hele ét sted, så du aldrig misser en besked eller glemmer at følge op. Du får et dejligt overblik over dine kunder – og når opgaven er i hus, overføres sagen automatisk direkte til dit foretrukne regnskabsprogram med ét klik.
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">e-conomic</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Dinero</span>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-28 relative z-10">
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
