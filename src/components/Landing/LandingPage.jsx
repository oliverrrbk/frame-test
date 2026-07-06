import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import { X, Check, Compass, Calculator, Send, ArrowRight, ArrowLeft, Heart, Star, Clock, Users, Wallet, FileText, ShieldCheck, MapPin, Unlock, Headset, WifiOff, Hammer, StickyNote, Table2, Receipt, PenLine, Layers } from 'lucide-react';
import { TheInfiniteGrid } from '../ui/the-infinite-grid';
import { AnimatedTestimonials } from '../ui/animated-testimonials';
import { StaggerTestimonials } from '../ui/stagger-testimonials';
import Lenis from 'lenis';
import PageTransition from '../ui/PageTransition';

// Slå til når vi har rigtige tømrer-anmeldelser. false = vis tillids-båndet i stedet.
// (StaggerTestimonials-komponenten bevares urørt, så vi bare kan tænde den igen.)
const SHOW_TESTIMONIALS = false;

// Ærlige løfter der bygger tillid indtil rigtige anmeldelser er på plads.
const TRUST_POINTS = [
    { icon: Hammer,      title: "Lavet med tømrere",   text: "Bygget hånd i hånd med rigtige tømrere — ikke af folk der aldrig har stået på en plads." },
    { icon: MapPin,      title: "Dansk system",         text: "Dansk sprog, danske regler og dansk support. Ingen oversat halvbagt software." },
    { icon: ShieldCheck, title: "Data i EU",            text: "Dine og dine kunders data ligger sikkert i EU efter GDPR. Ikke til salg." },
    { icon: Unlock,      title: "Ingen binding",        text: "Prøv gratis i en måned. Sig op med et klik — vi holder ikke på dig med kontrakter." },
    { icon: WifiOff,     title: "Virker på pladsen",    text: "Lav tilbud og registrér timer selvom mobilnettet er væk. Alt synker når du er online igen." },
    { icon: Headset,     title: "Rigtige mennesker",    text: "Support fra folk der forstår faget — ikke en chatbot der sender dig i ring." },
];

const LandingPage = ({ setSession }) => {
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

    return (
        <PageTransition className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col relative overflow-hidden">
            {/* Infinite Grid Overlay */}
            <div className="absolute inset-0 grid-pattern pointer-events-none z-0"></div>

            {/* TopNavBar */}
            <TopNavBar onLoginClick={() => setIsLoginOpen(true)} />

            {/* Main Content Canvas */}
            <main className="flex-grow relative z-10 w-full overflow-hidden">
                {/* Hero Section */}
                <TheInfiniteGrid />

                {SHOW_TESTIMONIALS ? (
                    <div className="mt-16 md:mt-28 mb-12 md:mb-16">
                        <StaggerTestimonials />
                    </div>
                ) : (
                    /* Tillids-bånd — vises indtil rigtige anmeldelser er på plads (SHOW_TESTIMONIALS). */
                    <section className="max-w-[1440px] mx-auto px-8 mt-16 md:mt-28 mb-12 md:mb-16 relative z-10 font-body">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="text-center max-w-2xl mx-auto mb-14"
                        >
                            <div className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-slate-200/50 dark:border-slate-700/50">
                                <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                                Bygget på tillid
                            </div>
                            <h2 className="font-headline text-[clamp(1.75rem,3.5vw,3rem)] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                Skabt sammen med rigtige tømrere
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-[clamp(1.05rem,2vw,1.2rem)] leading-relaxed mt-4">
                                Vi er nye — og ærlige om det. Derfor lover vi det, der faktisk betyder noget, mens de første tømrere prøver Frame af.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {TRUST_POINTS.map((point, idx) => (
                                <motion.div
                                    key={point.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.06 * idx }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    whileHover={{ y: -4 }}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="group relative overflow-hidden rounded-[1.5rem] p-7 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-lg transition-all duration-500"
                                >
                                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-orange-500/5 group-hover:bg-orange-500/10 rounded-full blur-2xl transition-all pointer-events-none"></div>
                                    <div className="relative z-10 flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                                            <point.icon size={20} />
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{point.title}</h3>
                                    </div>
                                    <p className="relative z-10 text-slate-500 dark:text-slate-400 leading-relaxed text-[0.95rem]">{point.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Breadth Section — "Meget mere end en tilbudsberegner" */}
                <section className="max-w-[1440px] mx-auto px-8 pt-[clamp(2rem,4vw,4rem)] pb-[clamp(3rem,6vw,5rem)] relative z-10 font-body">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-slate-200/50 dark:border-slate-700/50"
                    >
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Hele værktøjskassen
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform, opacity" }}
                        className="font-headline text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100"
                    >
                        Meget mere end en tilbudsberegner
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-slate-500 dark:text-slate-400 text-[clamp(1.125rem,2vw,1.25rem)] max-w-2xl leading-relaxed mb-[clamp(3rem,6vw,4rem)]"
                    >
                        Tilbuddene er kun starten. Frame samler hele hverdagen ét sted — så du bruger tiden på håndværket i stedet for papirarbejdet.
                    </motion.p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: FileText,
                                color: "text-blue-600 dark:text-blue-400",
                                glow: "bg-blue-600/5 group-hover:bg-blue-600/10",
                                title: "Tilbud på stedet",
                                text: "Lav professionelle, brandede PDF-tilbud mens du står ude hos kunden. Kørsel og slid er regnet med automatisk.",
                            },
                            {
                                icon: Clock,
                                color: "text-slate-600 dark:text-slate-400",
                                glow: "bg-slate-600/5 group-hover:bg-slate-600/10",
                                title: "Timeregistrering uden bøvl",
                                text: "Timerne for dig og dine folk registreres nemt og lander på den rigtige sag. Simpelt og overskueligt — helt uden bøvl.",
                            },
                            {
                                icon: Users,
                                color: "text-orange-600 dark:text-orange-400",
                                glow: "bg-orange-600/5 group-hover:bg-orange-600/10",
                                title: "Styr på kunder og sager",
                                text: "Alle dine kunder, tilbud og igangværende sager samlet ét sted — på både mobil og computer. Ét simpelt overblik, der giver ro i maven.",
                            },
                            {
                                icon: Wallet,
                                color: "text-emerald-600 dark:text-emerald-400",
                                glow: "bg-emerald-600/5 group-hover:bg-emerald-600/10",
                                title: "Løn uden hovedpine",
                                text: "De registrerede timer gør lønnen enkel og overskuelig — og spiller let sammen med dit lønsystem.",
                            },
                        ].map((card, idx) => (
                            <motion.div
                                key={card.title}
                                whileHover={{ y: -5 }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (idx + 1) }}
                                viewport={{ once: true }}
                                style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                                className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 ${card.glow} rounded-full blur-[40px] transition-all pointer-events-none`}></div>
                                <div className="mb-6 flex items-center gap-3 relative z-10">
                                    <div className={card.color}>
                                        <card.icon size={28} />
                                    </div>
                                    <h3 className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-bold text-slate-900 dark:text-slate-100">{card.title}</h3>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed flex-grow relative z-10">
                                    {card.text}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Process Section (New Comparison Design) */}
                <section className="max-w-[1440px] mx-auto px-8 pt-[clamp(1rem,2vw,2rem)] pb-[clamp(4rem,8vw,8rem)] relative z-10 font-body">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform, opacity" }}
                        className="font-headline text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight mb-4 text-center text-slate-900 dark:text-slate-100"
                    >
                        Fra fem systemer til ét
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-slate-500 text-[clamp(1.125rem,2vw,1.25rem)] text-center mb-[clamp(4rem,8vw,6rem)] max-w-2xl mx-auto"
                    >
                        Et program til tilbud, en app til timer, Excel til overblik, en kuglepen i lommen … Frame samler det hele ét sted.
                    </motion.p>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-28 items-stretch">
                        {/* The Messy Way — for mange systemer */}
                        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-8 md:p-14 items-center text-center h-full">
                            {/* Title Area */}
                            <div className="flex items-center gap-3 mb-auto text-slate-500 font-bold tracking-widest text-sm h-8">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                                    <X size={16} strokeWidth={3} />
                                </div>
                                DEN GAMLE MÅDE
                            </div>

                            {/* Center Visual — spredte, uforbundne systemer */}
                            <div className="flex-1 w-full flex items-center justify-center py-12">
                                <div className="relative w-full max-w-[300px] h-[190px]">
                                    {[
                                        { icon: FileText,   label: "Tilbudsprogram", cls: "top-0 left-2 -rotate-6" },
                                        { icon: Clock,       label: "Timer-app",      cls: "top-4 right-0 rotate-6" },
                                        { icon: Table2,      label: "Excel-ark",      cls: "top-[42%] left-1/2 -translate-x-1/2 -rotate-3" },
                                        { icon: Receipt,     label: "Regnskab",       cls: "bottom-2 left-0 rotate-3" },
                                        { icon: StickyNote,  label: "Gul lap",        cls: "bottom-0 right-4 -rotate-6" },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className={`absolute flex items-center gap-2 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium ${item.cls}`}
                                        >
                                            <item.icon size={15} className="shrink-0" />
                                            {item.label}
                                        </div>
                                    ))}
                                    <PenLine size={22} className="absolute bottom-8 left-6 text-slate-300 dark:text-slate-700 rotate-[24deg]" />
                                </div>
                            </div>

                            {/* Bottom Text */}
                            <div className="flex flex-col gap-5 text-slate-500 dark:text-slate-400 font-medium mt-auto h-[120px] justify-end">
                                <p>Fem systemer der ikke taler sammen</p>
                                <p>Du registrerer lidt her og lidt der</p>
                                <p>Overblikket forsvinder i rodet</p>
                            </div>
                        </div>

                        {/* The Blueprint Way — alt samlet ét sted */}
                        <div className="rounded-[2rem] bg-surface-container-high text-on-surface flex flex-col p-8 md:p-14 items-center text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] h-full relative overflow-hidden">
                            {/* Title Area */}
                            <div className="flex items-center gap-3 mb-auto font-bold tracking-widest text-sm h-8 relative z-10">
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-slate-100 shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <Check size={16} strokeWidth={4} />
                                </div>
                                BISON FRAME MÅDEN
                            </div>

                            {/* Center Visual — ét samlet system */}
                            <div className="flex-1 w-full flex items-center justify-center py-12 relative z-10">
                                <div className="bg-white dark:bg-slate-950 rounded-2xl py-5 px-6 shadow-xl w-full max-w-[340px] border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                                            <Layers size={16} />
                                        </div>
                                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Bison Frame</span>
                                        <span className="ml-auto text-[10px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">Alt samlet</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5 text-left">
                                        {[
                                            { icon: FileText, label: "Tilbud" },
                                            { icon: Clock,    label: "Timer" },
                                            { icon: Users,    label: "Kunder & sager" },
                                            { icon: Wallet,   label: "Løn" },
                                            { icon: Calculator, label: "Beregner" },
                                            { icon: Receipt,  label: "Regnskab" },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <item.icon size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Text */}
                            <div className="flex flex-col gap-5 text-slate-600 dark:text-slate-400 font-medium mt-auto h-[120px] justify-end relative z-10">
                                <p>Ét system til hele hverdagen</p>
                                <p>Registrér én gang — det hænger sammen</p>
                                <p>Fuldt overblik på mobil og computer</p>
                            </div>
                        </div>
                    </div>

                    {/* Step Process */}
                    <div className="max-w-6xl mx-auto relative pt-8 pb-24 mt-28">
                        <div className="grid md:grid-cols-3 gap-12 md:gap-8 text-center relative z-10">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center relative group">
                                <div className="absolute left-[85%] -translate-x-1/2 top-16 text-[14rem] font-black text-slate-900/[0.08] dark:text-white/[0.08] rotate-[5deg] z-0 select-none leading-none group-hover:text-slate-900/[0.12] dark:group-hover:text-white/[0.12] transition-colors duration-500">1</div>
                                
                                {/* Connecting Line to Step 2 (Desktop Only) */}
                                <div className="hidden md:block absolute top-[30px] left-[calc(50%+40px)] w-[calc(100%-48px)] border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0"></div>

                                <div className="relative z-10 w-full px-2">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-500/20 border-4 border-slate-50 dark:border-slate-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-10 shrink-0 shadow-sm relative z-20">
                                        <Compass size={28} strokeWidth={2} />
                                    </div>
                                    <h3 className="font-bold text-2xl mb-3 text-slate-900 dark:text-slate-100 relative z-20">Registrér</h3>
                                    <p className="text-slate-500 text-base leading-relaxed px-4 relative z-20">Definér materialer og opgaver lynhurtigt. Indtast alt ude hos kunden og lad systemet klare resten.</p>
                                </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className="flex flex-col items-center relative group">
                                <div className="absolute left-[85%] -translate-x-1/2 top-16 text-[14rem] font-black text-slate-900/[0.08] dark:text-white/[0.08] rotate-[5deg] z-0 select-none leading-none group-hover:text-slate-900/[0.12] dark:group-hover:text-white/[0.12] transition-colors duration-500">2</div>
                                
                                {/* Connecting Line to Step 3 (Desktop Only) */}
                                <div className="hidden md:block absolute top-[30px] left-[calc(50%+40px)] w-[calc(100%-48px)] border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0"></div>

                                <div className="relative z-10 w-full px-2">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-950 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-10 shrink-0 shadow-sm relative z-20">
                                        <Calculator size={28} strokeWidth={2} />
                                    </div>
                                    <h3 className="font-bold text-2xl mb-3 text-slate-900 dark:text-slate-100 relative z-20">Udregn</h3>
                                    <p className="text-slate-500 text-base leading-relaxed px-4 relative z-20">Automatisk prissætning af kørsel og slid. Du sikrer, at dine indtjeninger altid er godt beskyttede.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center relative group">
                                <div className="absolute left-[85%] -translate-x-1/2 top-16 text-[14rem] font-black text-slate-900/[0.08] dark:text-white/[0.08] rotate-[5deg] z-0 select-none leading-none group-hover:text-slate-900/[0.12] dark:group-hover:text-white/[0.12] transition-colors duration-500">3</div>
                                <div className="relative z-10 w-full px-2">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-500/20 border-4 border-slate-50 dark:border-slate-950 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-10 shrink-0 shadow-sm relative z-20">
                                        <Send size={28} strokeWidth={2.5} className="ml-1" />
                                    </div>
                                    <h3 className="font-bold text-2xl mb-3 text-slate-900 dark:text-slate-100 relative z-20">Send</h3>
                                    <p className="text-slate-500 text-base leading-relaxed px-4 relative z-20">Professionelle PDF overslag sendt på stedet. Imponér kunder med tydelige tilbudsberegninger, der lukker aftalerne.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Minimalist Integration Banner */}
                <section className="w-full max-w-[1440px] px-8 mx-auto mb-20 relative z-10 flex flex-col items-center">
                    <p className="text-sm font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-6 text-center">
                        Integrerer direkte med
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        <span className="font-bold text-xl text-slate-700 dark:text-slate-300">e-conomic</span>
                        <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Dinero</span>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-8 text-center max-w-md">
                        … og spiller let sammen med dit lønsystem, så lønnen ikke bliver en hovedpine.
                    </p>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-48 relative z-10 -mt-8">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        viewport={{ once: true }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-[clamp(3rem,6vw,5rem)] flex flex-col md:flex-row items-center justify-between gap-12 md:gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800/[0.5]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>
                        
                        {/* Decorative technical marks */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <motion.div style={{ opacity: glowOpacity }} className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></motion.div>
                        
                        <div className="flex flex-col gap-4 relative z-10 max-w-xl text-center md:text-left">
                            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-400 block dark:text-slate-500">Helt uden binding</span>
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Se selv, om det kan gøre din hverdag lettere.
                            </h2>
                        </div>
                        
                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0 flex flex-col items-center md:items-end gap-5 md:gap-3">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/register')}
                                style={{ WebkitTransform: "translateZ(0)" }}
                                className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-5 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group"
                            >
                                Prøv gratis i en måned
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Intet kreditkort påkrævet. Opret dig på 2 minutter.
                            </span>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* Footer */}
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
                                bottom: 0,
                                width: '100%',
                                maxWidth: '550px',
                                background: '#f8fafc',
                                zIndex: 110,
                                overflowY: 'auto',
                                WebkitTransform: 'translateZ(0)',
                                willChange: 'transform'
                            }}
                            className="shadow-[-10px_0_40px_rgba(0,0,0,0.2)]"
                        >


                {/* Login Component inside Drawer */}
                <div style={{ position: 'relative', zIndex: 110, minHeight: '100%' }}>
                   <Login setSession={setSession} onClose={() => setIsLoginOpen(false)} />
                </div>
            </motion.div>
            </>
            )}
            </AnimatePresence>
        </PageTransition>
    );
};

export default LandingPage;
