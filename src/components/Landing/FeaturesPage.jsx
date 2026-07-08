import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import { ArrowRight, Compass, Send, Wallet, HardHat, Boxes, SlidersHorizontal, Sparkles, FileText, Users, Clock, CalendarDays, MapPin, PenTool, Calculator, Lock, Briefcase, MessageSquare, Package, Link as LinkIcon, LayoutGrid, Video } from 'lucide-react';
import PageTransition from '../ui/PageTransition';
import SystemWheel from './SystemWheel';

export default function FeaturesPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

    // Final CTA Scroll Animation
    const ctaRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ctaRef,
        offset: ["start end", "end end"]
    });
    // Maps from almost zero opacity (0.1) when CTA enters the screen to full (1) when it's fully visible
    const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);

    useEffect(() => {
        // Scroll restoration handled globally
    }, []);

    // Klikbar demo af "Tilpas dashboard" — 1:1 med skærmen inde i systemet
    // (samme moduler, labels, beskrivelser, ikoner og accent-farver som MODULES/META).
    // Ren illustration (gemmes ikke). Kerne-moduler (tilbud + sager) er altid tændt.
    const DASH_MODULES = [
        { key: 'customers',    icon: Users,         label: 'Kunder',                 desc: 'Kunde-bibliotek med genbrugelige kundekort.',          accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
        { key: 'quotes',       icon: FileText,      label: 'Tilbud & Forespørgsler', desc: 'Indbakke, tilbud, forespørgsler og tilbudskladder.',   accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10', core: true },
        { key: 'cases',        icon: Briefcase,     label: 'Sager & Ordrestyring',   desc: 'Igangværende sager, byggepladser og opgaver.',         accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10', core: true },
        { key: 'calendar',     icon: CalendarDays,  label: 'Kalender',               desc: 'Planlægning af sager og aftaler.',                     accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
        { key: 'chat',         icon: MessageSquare, label: 'Intern Chat',            desc: 'Beskeder mellem medarbejdere.',                        accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
        { key: 'timesheet',    icon: Clock,         label: 'Tid & Løn',              desc: 'Timeregistrering og løn-overblik (kræver Hold).',      accent: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800', badge: 'Hold' },
        { key: 'finance',      icon: Wallet,        label: 'Økonomi & Faktura',      desc: 'Fakturering, økonomi-overblik og betalinger.',         accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
        { key: 'map',          icon: MapPin,        label: 'Kortvisning',            desc: 'Sager og byggepladser på kort.',                       accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
        { key: 'drawings',     icon: PenTool,       label: 'Skitser & Tegninger',    desc: 'Tegne- og skitseværktøj.',                             accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
        { key: 'materials',    icon: Package,       label: 'Materialer',             desc: 'Materialebibliotek (kun fag med beregner).',           accent: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' },
        { key: 'pricing',      icon: Calculator,    label: 'Prisberegning',          desc: 'Beregner-opsætning og priser (kun fag med beregner).', accent: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' },
        { key: 'integrations', icon: LinkIcon,      label: 'Integrationer',          desc: 'e-conomic, Dinero m.fl.',                              accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
        { key: 'team',         icon: HardHat,       label: 'Team & Medarbejdere',    desc: 'Håndtér medarbejdere og roller.',                      accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
    ];
    const [dashMods, setDashMods] = useState({ customers: true, quotes: true, cases: true, calendar: true, chat: true, timesheet: true, finance: true, map: false, drawings: false, materials: true, pricing: true, integrations: true, team: true });
    const toggleMod = (key, core) => { if (!core) setDashMods((m) => ({ ...m, [key]: !m[key] })); };

    return (
        <PageTransition className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col relative overflow-hidden">
            {/* Infinite Grid Overlay */}
            <div className="absolute inset-0 grid-pattern pointer-events-none z-0"></div>

            {/* TopNavBar */}
            <TopNavBar onLoginClick={() => setIsLoginOpen(true)} />

            {/* Main Content Canvas */}
            <main className="flex-grow flex flex-col items-center w-full px-6 md:px-12 pt-20 md:pt-28 pb-32 md:pb-40 z-10 relative">

                {/* Hero Section */}
                <header className="text-center w-full max-w-4xl mx-auto mb-[clamp(4rem,7vw,6rem)] mt-16 md:mt-24 relative z-10">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-20 -left-48 md:-left-64 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-slate-200/50 dark:border-slate-700/50"
                    >
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Hele systemet
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-[clamp(2.15rem,6vw,4.5rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-6"
                    >
                        Hele din forretning. <br /><span className="text-orange-600 dark:text-orange-400 opacity-90">Ét system.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        viewport={{ once: true }}
                        className="text-[clamp(1.125rem,2vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Fra første opmåling til betalt faktura. Bison Frame samler tilbud, sager, timer, løn og fakturering ét sted — bygget specifikt til tømrere.
                    </motion.p>
                </header>

                {/* System Wheel — hele systemet, interaktivt */}
                <section className="mb-56 w-full max-w-[1440px] relative z-10">
                    <SystemWheel />
                </section>

                {/* Skræddersyet — kun det du har brug for */}
                <section className="mb-56 w-full max-w-[1440px] px-8 mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row gap-14 md:gap-16 items-center">
                        {/* Venstre: budskab + 3 pointer */}
                        <div className="md:w-1/2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                            >
                                <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                                Skræddersyet
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                className="text-[clamp(2rem,3.5vw,3rem)] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 mb-5"
                            >
                                Kun det du har brug for
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                viewport={{ once: true }}
                                className="text-[clamp(1.05rem,1.5vw,1.2rem)] text-slate-500 dark:text-slate-400 leading-relaxed mb-10"
                            >
                                Du får hele værktøjskassen — men du bestemmer, hvad der fylder på dit dashboard. Slå fra det, du ikke bruger, så du kun ser dine ting. Ingen støj.
                            </motion.p>

                            <div className="flex flex-col gap-7">
                                {[
                                    { icon: Boxes, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10', title: 'Få det hele', text: 'Alle moduler er med fra dag ét. Brug lige så meget, du vil — der er ingen tillægspakker at jagte.' },
                                    { icon: SlidersHorizontal, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10', title: 'Skru til og fra', text: 'Sluk det, du ikke bruger. Dashboardet viser kun dine ting, så du kommer hurtigere til det, der betyder noget.' },
                                    { icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', title: 'Mangler du noget?', text: 'Ønsk nye funktioner — vi bygger videre sammen med rigtige tømrere, så systemet passer til jeres hverdag.' },
                                ].map((p, i) => (
                                    <motion.div
                                        key={p.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        viewport={{ once: true, margin: "-40px" }}
                                        className="flex gap-4 items-start group"
                                    >
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300 ${p.color}`}>
                                            <p.icon size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{p.title}</h3>
                                            <p className="text-[0.95rem] text-slate-500 dark:text-slate-400 leading-relaxed">{p.text}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Højre: dashboard med moduler du slår til/fra */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="md:w-1/2 w-full bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

                            {/* Header — 1:1 med "Tilpas dashboard" inde i systemet */}
                            <div className="flex items-start gap-3.5 mb-6 relative z-10">
                                <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                                    <LayoutGrid size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Tilpas dashboard</h3>
                                    <p className="text-[0.82rem] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">Det er din menu — vælg hvilke moduler der vises. At slå et modul fra skjuler kun menupunktet; alle data bevares.</p>
                                </div>
                            </div>

                            {/* Moduler — 2-kolonne grid med ikon-badge, titel, beskrivelse og toggle */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                                {DASH_MODULES.map((m) => {
                                    const on = dashMods[m.key];
                                    const interactive = !m.core;
                                    return (
                                        <motion.button
                                            key={m.key}
                                            type="button"
                                            onClick={() => toggleMod(m.key, m.core)}
                                            whileHover={interactive ? { y: -2 } : undefined}
                                            whileTap={interactive ? { scale: 0.99 } : undefined}
                                            aria-pressed={on}
                                            className={`group w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 border text-left transition-all duration-300 ${interactive ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600' : 'cursor-default'} ${on ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm' : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-60'}`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${interactive ? 'group-hover:scale-110' : ''} ${on ? m.accent : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                                                <m.icon size={17} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-[0.82rem] leading-tight ${on ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{m.label}</div>
                                                <div className="text-[0.68rem] text-slate-400 dark:text-slate-500 truncate">{m.desc}</div>
                                            </div>
                                            {m.core ? (
                                                <span className="flex items-center gap-1 text-[0.55rem] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 shrink-0"><Lock size={10} /> Kerne</span>
                                            ) : (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {m.badge && <span className="text-[0.5rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">{m.badge}</span>}
                                                    <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${on ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${on ? 'left-[18px]' : 'left-0.5'}`}></span>
                                                    </span>
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-5 relative z-10 leading-relaxed">
                                <strong className="text-slate-500 dark:text-slate-400">Kerne-moduler</strong> (tilbud + sager) er der altid, så systemet aldrig går i stykker. Timeregistrering & løn kræver et <strong className="text-slate-500 dark:text-slate-400">Hold-abonnement</strong>.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Personlig opsætning & hjælp — kommer lige efter "Kun det du har brug for" */}
                <section className="w-full max-w-[1440px] px-8 mx-auto mb-56 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true, margin: "-50px" }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-[clamp(2.5rem,5vw,4rem)] flex flex-col gap-10 relative overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
                    >
                        {/* Decorative technical marks */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 relative z-10">
                            <div className="flex flex-col gap-3 max-w-2xl text-center md:text-left">
                                <span className="inline-flex items-center gap-2 self-center md:self-start bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                                    Vi hjælper jer i gang
                                </span>
                                <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                    Skal vi sætte det op sammen med jer?
                                </h2>
                                <p className="text-[clamp(1rem,1.5vw,1.125rem)] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Kom i gang, så finder vi ud af, hvad der passer jer bedst. Vi hjælper med hele opsætningen — helt gratis — og følger jer hele vejen, indtil systemet passer præcis til jeres hverdag og bare giver mening.
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-3 shrink-0">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/register')}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group/cta whitespace-nowrap"
                                >
                                    Opret din bruger — så ringer vi dig op
                                    <ArrowRight className="w-5 h-5 group-hover/cta:translate-x-1 transition-transform" />
                                </motion.button>
                                <span className="text-sm text-slate-500 dark:text-slate-400 text-center">Gratis den første måned · Ingen binding</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                            {[
                                { icon: MapPin, title: 'Vi kører ud til jer', text: 'Vi kommer forbi og sætter det hele op på stedet — sammen med jer.' },
                                { icon: Video, title: 'Eller et online møde', text: 'Passer det bedre, tager vi det over skærmen. Lige så grundigt.' },
                                { icon: Sparkles, title: 'Eller gå selv i gang', text: 'Vil I bare i gang, så kør — vi står klar, hver gang I har brug for os.' },
                            ].map((o, i) => (
                                <motion.div
                                    key={o.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08, duration: 0.4 }}
                                    viewport={{ once: true, margin: '-40px' }}
                                    whileHover={{ y: -4 }}
                                    className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 flex flex-col gap-2 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300"
                                >
                                    <span className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm"><o.icon size={20} /></span>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[1.05rem]">{o.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-[0.9rem] leading-relaxed">{o.text}</p>
                                </motion.div>
                            ))}
                        </div>

                        <p className="text-sm text-slate-400 dark:text-slate-500 relative z-10 text-center md:text-left">
                            Gratis opsætning og løbende hjælp — helt uforpligtende. Vi tager det stille og roligt i jeres tempo, så det passer til jeres virksomhed.
                        </p>
                    </motion.div>
                </section>

                {/* The Journey — Byd ind → Vind → Udfør → Afregn */}
                <section className="mb-56 w-full max-w-6xl relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-3 text-center"
                    >
                        Én ubrudt arbejdsgang
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-slate-500 dark:text-slate-400 text-center text-[clamp(1rem,1.5vw,1.125rem)] max-w-xl mx-auto mb-[clamp(3rem,6vw,5rem)]"
                    >
                        Alt hænger sammen. Du taster aldrig det samme to gange.
                    </motion.p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6 text-center relative">
                        {[
                            { num: '1', icon: Compass, ring: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400', title: 'Byd ind', text: 'Mål op hjemme hos kunden. Beregneren sætter pris på materialer, timer, kørsel og slid.' },
                            { num: '2', icon: Send, ring: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300', title: 'Vind opgaven', text: 'Send et flot PDF-tilbud på stedet. Siger kunden ja, bliver det automatisk til en sag.' },
                            { num: '3', icon: HardHat, ring: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300', title: 'Udfør', text: 'Styr delopgaver, timer, hold og materialer undervejs — direkte fra telefonen.' },
                            { num: '4', icon: Wallet, ring: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400', title: 'Afregn', text: 'Timerne bliver til faktura og løn. Send til e-conomic eller Dinero med ét klik.' },
                        ].map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                viewport={{ once: true, margin: "-50px" }}
                                className="flex flex-col items-center relative group px-2"
                            >
                                <div className="absolute left-[85%] -translate-x-1/2 top-8 text-[10rem] font-black text-slate-900/[0.06] dark:text-white/[0.06] rotate-[5deg] z-0 select-none leading-none group-hover:text-slate-900/[0.10] dark:group-hover:text-white/[0.10] transition-colors duration-500 pointer-events-none">{step.num}</div>
                                {/* Connecting line (desktop only, not on last) */}
                                {i < 3 && (
                                    <div className="hidden lg:block absolute top-[30px] left-[calc(50%+40px)] w-[calc(100%-48px)] border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0"></div>
                                )}
                                <div className="relative z-10 w-full">
                                    <div className={`w-16 h-16 mx-auto rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center mb-8 shrink-0 shadow-sm relative z-20 ${step.ring}`}>
                                        <step.icon size={26} strokeWidth={2} />
                                    </div>
                                    <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-slate-100 relative z-20">{step.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-[0.95rem] leading-relaxed relative z-20">{step.text}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-20 relative z-10 -mt-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        viewport={{ once: true }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitBackfaceVisibility: "hidden", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-[clamp(3rem,6vw,5rem)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800/[0.5]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>

                        {/* Decorative technical marks */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <motion.div style={{ opacity: glowOpacity }} className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></motion.div>

                        <div className="flex flex-col gap-4 relative z-10 max-w-xl text-center md:text-left">
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Få dit nye system
                            </h2>
                            <p className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-600 dark:text-slate-400">
                                Stop overslagstvivlen. Start med at sikre profitten. Prøv Bison Frame systemet gratis i en hel måned.
                            </p>
                        </div>

                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0 flex flex-col items-center justify-center gap-4">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/register')}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 w-full sm:w-auto justify-center group whitespace-nowrap"
                                >
                                    Start Gratis Nu
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/pricing')}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 px-8 py-4 rounded-full font-medium text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 w-full sm:w-auto justify-center whitespace-nowrap"
                                >
                                    Se Priser Her
                                </motion.button>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">Ingen kort er påkrævet. Opsætning tager lidt tid.</span>
                        </div>
                    </motion.div>
                </section>
            </main>

            <Footer />

            {/* SLIDE-OUT LOGIN DRAWER */}
            <AnimatePresence>
                {isLoginOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(15, 23, 42, 0.4)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 100,
                            }}
                            onClick={() => setIsLoginOpen(false)}
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                width: '100%',
                                maxWidth: '550px',
                                height: '100svh', // Fixed for Safari
                                background: '#f8fafc',
                                zIndex: 110,
                                overflowY: 'hidden',
                                WebkitTransform: 'translateZ(0)',
                                willChange: 'transform'
                            }}
                            className="shadow-[-10px_0_40px_rgba(0,0,0,0.2)]"
                        >

                            <div style={{ position: 'relative', zIndex: 110, minHeight: '100svh' }}>
                                <Login setSession={setSession} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
