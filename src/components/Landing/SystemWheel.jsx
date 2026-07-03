import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, FileText, Briefcase, Calendar, MessageSquare, MapPin, Wallet, Link as LinkIcon, PenTool, HardHat } from 'lucide-react';
import { Preview, LOOP_MS } from './SystemWheelPreviews';

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


export default function SystemWheel() {
    const [active, setActive] = useState('overview');
    const [paused, setPaused] = useState(false);
    const activeFeature = FEATURES.find(f => f.id === active) || FEATURES[0];

    const count = FEATURES.length;
    const R = 168; // ring-radius i px

    // Auto-rotation: efter ét fuldt demo-loop hopper hjulet videre til næste modul,
    // medmindre musen peger på hjulet (så bliver den, hvor brugeren peger).
    useEffect(() => {
        if (paused) return;
        const dur = (LOOP_MS[active] || 8000) + 600;
        const idx = FEATURES.findIndex(f => f.id === active);
        const nextId = FEATURES[(idx + 1) % FEATURES.length].id;
        const t = setTimeout(() => setActive(nextId), dur);
        return () => clearTimeout(t);
    }, [active, paused]);

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

            {/* ─── CHIPS (mobil/tablet) ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 w-full lg:hidden">
                {FEATURES.map((f) => {
                    const Icon = f.icon;
                    const isActive = f.id === active;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setActive(f.id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 ${isActive ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-md' : 'bg-white/60 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800'}`}
                        >
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ACCENTS[f.accent]}`}>
                                <Icon size={18} />
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{f.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* ─── DETALJE-PANEL — kun selve frame-vinduet ─────────── */}
            <div className="w-full lg:flex-1">
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
        </div>
    );
}
