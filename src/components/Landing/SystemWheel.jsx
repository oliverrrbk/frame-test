import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, FileText, Briefcase, Calendar, MessageSquare, MapPin, Wallet, Link as LinkIcon, PenTool, HardHat, ChevronLeft, ChevronRight } from 'lucide-react';
import { Preview, LOOP_MS } from './SystemWheelPreviews';
import { MobilePreview, MOBILE_LOOP_MS } from './SystemWheelMobilePreviews';

// Er vi på desktop (lg og op)? Styrer hvilket loop-tempo + hvilken preview der vises.
function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
    );
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const on = (e) => setIsDesktop(e.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return isDesktop;
}

// Accent-paletter der matcher resten af Bison Frame
const ACCENTS = {
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
    green: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
};

// Modulerne matcher sidebaren 1:1 (samme ikon + navn). Alle mockups er ANONYMISEREDE
// — fiktive navne (Søren Andersen, Jensen Byg ApS …), aldrig rigtige personer eller data.
const FEATURES = [
    {
        id: 'overview', icon: Home, accent: 'blue', title: 'Oversigt',
        desc: 'Hele forretningen på ét blik — omsætning, aktive sager og tilbud.',
    },
    {
        id: 'customers', icon: Users, accent: 'orange', title: 'Kunder',
        desc: 'Alle kunder samlet ét sted — klar til tilbud og sag.',
    },
    {
        id: 'leads', icon: FileText, accent: 'indigo', title: 'Tilbud & Forespørgsler',
        desc: 'Styr hele vejen fra forespørgsel til bekræftet opgave.',
    },
    {
        id: 'cases', icon: Briefcase, accent: 'green', title: 'Sager & Ordrestyring',
        desc: 'Fuld styring af opgaver — fremdrift, timer, hold og materialer.',
    },
    {
        id: 'calendar', icon: Calendar, accent: 'blue', title: 'Kalender',
        desc: 'Planlæg sager og aftaler — træk bekræftede opgaver ind i kalenderen.',
    },
    {
        id: 'chat', icon: MessageSquare, accent: 'orange', title: 'Intern Chat',
        desc: 'Skriv med dine folk og på hver sag — beskeder, billeder og fælles tråde.',
    },
    {
        id: 'finance', icon: Wallet, accent: 'green', title: 'Økonomi & Faktura',
        desc: 'Overblik over cashflow — fakturér åbne sager direkte til dit regnskab.',
    },
    {
        id: 'payroll', icon: FileText, accent: 'indigo', title: 'Løn & Timer',
        desc: 'Medarbejdernes timer og kørsel — ét klik til færdig lønfil.',
    },
    {
        id: 'map', icon: MapPin, accent: 'green', title: 'Kortvisning',
        desc: 'Se alle dine tilbud og opgaver direkte på Danmarkskortet.',
    },
    {
        id: 'drawings', icon: PenTool, accent: 'blue', title: 'Skitser & Tegninger',
        desc: 'Tegn skitser direkte i appen, eller upload arkitekttegninger.',
    },
    {
        id: 'integrations', icon: LinkIcon, accent: 'blue', title: 'Integrationer',
        desc: 'Forbind e-conomic, Dinero og din egen mail — let overførsel.',
    },
    {
        id: 'team', icon: HardHat, accent: 'orange', title: 'Team & Medarbejdere',
        desc: 'Tilføj svende og underentreprenører — rollestyret adgang.',
    },
];


// Fremdrifts-streg: en tynd blå linje øverst på preview'et der fyldes lineært
// over loop-varigheden og nulstilles ved modulskift (viser hvor lang tid der er
// til hjulet hopper videre). `restartKey` genstarter animationen.
function TopProgressBar({ restartKey, duration, paused, className = '' }) {
    return (
        <div className={`relative h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden ${className}`}>
            {!paused && (
                <motion.div
                    key={restartKey}
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500 dark:bg-blue-400"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: duration / 1000, ease: 'linear' }}
                />
            )}
        </div>
    );
}

export default function SystemWheel() {
    const [active, setActive] = useState('overview');
    const [paused, setPaused] = useState(false);
    const isDesktop = useIsDesktop();
    const activeFeature = FEATURES.find(f => f.id === active) || FEATURES[0];
    const activeIdx = FEATURES.findIndex(f => f.id === active);

    const count = FEATURES.length;
    const R = 168; // ring-radius i px (desktop)

    const goto = (dir) => {
        const n = (activeIdx + dir + count) % count;
        setActive(FEATURES[n].id);
    };

    // Auto-rotation: efter ét fuldt demo-loop hopper hjulet videre til næste modul,
    // medmindre brugeren peger/holder på hjulet. Loop-tempoet følger den viste
    // preview (mobil-demoerne er kortere end desktop-demoerne).
    const loopMs = ((isDesktop ? LOOP_MS : MOBILE_LOOP_MS)[active] || 7000) + 600;
    useEffect(() => {
        if (paused) return;
        const nextId = FEATURES[(activeIdx + 1) % count].id;
        const t = setTimeout(() => setActive(nextId), loopMs);
        return () => clearTimeout(t);
    }, [active, paused, loopMs, activeIdx, count]);

    return (
        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-center gap-12 lg:gap-10">

            {/* ─── HJULET (desktop) ─────────────────────────────── */}
            <div className="hidden lg:block relative w-[440px] h-[440px] shrink-0"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}>
                {/* Roterende, dekorativ prikket ring — giver "hjul"-følelsen uden at flytte klik-mål */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
                    className="absolute rounded-full border border-dashed border-slate-200 dark:border-slate-800"
                    style={{ width: R * 2, height: R * 2, left: '50%', top: '50%', marginLeft: -R, marginTop: -R }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                    className="absolute rounded-full border border-slate-100 dark:border-slate-800/60"
                    style={{ width: R * 2 + 44, height: R * 2 + 44, left: '50%', top: '50%', marginLeft: -(R + 22), marginTop: -(R + 22) }}
                />

                {/* Egerlinjer + noder */}
                {FEATURES.map((f, i) => {
                    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * R;
                    const y = Math.sin(angle) * R;
                    const deg = (i / count) * 360 - 90;
                    const isActive = f.id === active;
                    const Icon = f.icon;
                    return (
                        <React.Fragment key={f.id}>
                            {/* Eger */}
                            <div
                                className={`absolute origin-left transition-all duration-300 ${isActive ? 'h-[2px] bg-blue-400/70 dark:bg-blue-500/60' : 'h-px bg-slate-200/70 dark:bg-slate-800/70'}`}
                                style={{ width: R, left: '50%', top: '50%', transform: `rotate(${deg}deg)` }}
                            />
                            {/* Node */}
                            <div
                                className="absolute"
                                style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                            >
                                <motion.button
                                    onClick={() => setActive(f.id)}
                                    onMouseEnter={() => setActive(f.id)}
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                                    whileHover={{ scale: 1.14 }}
                                    whileTap={{ scale: 0.96 }}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border ${ACCENTS[f.accent]} ${isActive ? 'shadow-[0_8px_24px_-4px_rgba(37,99,235,0.35)] ring-2 ring-offset-2 ring-offset-surface ring-blue-500 dark:ring-blue-400 border-transparent' : 'shadow-sm border-slate-100 dark:border-slate-800 hover:shadow-md'}`}
                                    aria-label={f.title}
                                >
                                    <Icon size={26} />
                                </motion.button>
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* Center — viser det aktive moduls titel + beskrivelse (skifter når man hopper) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56">
                    <div className="w-full h-full rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center px-7 relative overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-blue-600/5 blur-xl pointer-events-none"></div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeFeature.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                                className="relative z-10 flex flex-col items-center"
                            >
                                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-2 leading-tight">{activeFeature.title}</div>
                                <p className="text-[0.78rem] leading-snug text-slate-500 dark:text-slate-400">{activeFeature.desc}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ─── KOMPAKT HJUL (mobil/tablet) ──────────────────── */}
            <MobileWheel
                active={active}
                setActive={setActive}
                activeFeature={activeFeature}
                setPaused={setPaused}
                goto={goto}
                loopMs={loopMs}
                paused={paused}
            />

            {/* ─── DETALJE-PANEL: desktop-mockup (lg+) vs. telefon (mobil) ─── */}
            <div className="hidden lg:block w-full lg:flex-1">
                {/* Blå fremdrifts-streg øverst — viser hvor lang tid hvert modul tager */}
                <TopProgressBar restartKey={active} duration={loopMs} paused={paused} className="mb-3" />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFeature.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Preview id={activeFeature.id} />
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="lg:hidden w-full">
                {/* Blå fremdrifts-streg øverst — aligned med telefon-preview'et */}
                <TopProgressBar restartKey={active} duration={loopMs} paused={paused} className="mb-3 max-w-[280px] mx-auto" />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFeature.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3 }}
                    >
                        <MobilePreview id={activeFeature.id} />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Kompakt hjul til mobil/tablet: mindre ring med 12 noder + centrum-titel ──
function MobileWheel({ active, setActive, activeFeature, setPaused, goto, loopMs, paused }) {
    const count = FEATURES.length;
    const R = 118; // mindre ring-radius på mobil

    return (
        <div className="lg:hidden w-full flex flex-col items-center gap-4">
            <div
                className="relative w-[290px] h-[290px] shrink-0"
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
            >
                {/* Roterende dekorative ringe */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
                    className="absolute rounded-full border border-dashed border-slate-200 dark:border-slate-800"
                    style={{ width: R * 2, height: R * 2, left: '50%', top: '50%', marginLeft: -R, marginTop: -R }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                    className="absolute rounded-full border border-slate-100 dark:border-slate-800/60"
                    style={{ width: R * 2 + 32, height: R * 2 + 32, left: '50%', top: '50%', marginLeft: -(R + 16), marginTop: -(R + 16) }}
                />

                {/* Noder */}
                {FEATURES.map((f, i) => {
                    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * R;
                    const y = Math.sin(angle) * R;
                    const isActive = f.id === active;
                    const Icon = f.icon;
                    return (
                        <div
                            key={f.id}
                            className="absolute"
                            style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                        >
                            <motion.button
                                onClick={() => setActive(f.id)}
                                whileTap={{ scale: 0.9 }}
                                animate={{ scale: isActive ? 1.12 : 1 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors duration-300 ${ACCENTS[f.accent]} ${isActive ? 'shadow-[0_6px_18px_-4px_rgba(37,99,235,0.4)] ring-2 ring-offset-2 ring-offset-surface ring-blue-500 dark:ring-blue-400 border-transparent' : 'shadow-sm border-slate-100 dark:border-slate-800'}`}
                                aria-label={f.title}
                            >
                                <Icon size={18} />
                            </motion.button>
                        </div>
                    );
                })}

                {/* Centrum — aktivt modul */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[132px] h-[132px]">
                    <div className="w-full h-full rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-blue-600/5 blur-xl pointer-events-none" />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeFeature.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.22 }}
                                className="relative z-10 flex flex-col items-center"
                            >
                                <span className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 ${ACCENTS[activeFeature.accent]}`}>
                                    <activeFeature.icon size={18} />
                                </span>
                                <div className="text-[0.82rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight px-1">{activeFeature.title}</div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Frem/tilbage + beskrivelse — så det er tydeligt man kan bladre */}
            <div className="flex items-center gap-3 w-full max-w-[300px]">
                <button onClick={() => goto(-1)} aria-label="Forrige modul" className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 shadow-sm active:scale-90 transition-transform">
                    <ChevronLeft size={18} />
                </button>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={activeFeature.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 text-center text-[0.72rem] leading-snug text-slate-500 dark:text-slate-400 min-h-[2.2em] flex items-center justify-center"
                    >
                        {activeFeature.desc}
                    </motion.p>
                </AnimatePresence>
                <button onClick={() => goto(1)} aria-label="Næste modul" className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 shadow-sm active:scale-90 transition-transform">
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
