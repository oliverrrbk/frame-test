import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import { User, Users, Building2, CheckCircle2, ArrowRight, X } from 'lucide-react';
import Lenis from 'lenis';

export default function PricingPage({ setSession }) {
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
        const lenis = new Lenis({
            autoRaf: true,
        });

        window.scrollTo(0, 0);

        return () => {
            lenis.destroy();
        };
    }, []);

    return (
        <div className="bg-surface text-on-surface font-body antialiased min-h-screen flex flex-col relative overflow-hidden">
            {/* Infinite Grid Overlay */}
            <div className="absolute inset-0 grid-pattern pointer-events-none z-0"></div>

            {/* TopNavBar */}
            <nav className="sticky top-0 w-full z-50 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-md font-headline tracking-tight antialiased text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-center max-w-[1440px] mx-auto px-8 py-4">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="Bison Frame Logo" className="h-10 w-auto object-contain" />
                        <div className="text-lg font-bold tracking-[-0.02em] uppercase text-slate-800 dark:text-slate-100">
                            Bison Frame
                        </div>
                    </Link>
                    
                    <div className="hidden md:flex gap-8">
                        <Link to="/features" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Funktioner</Link>
                        <Link to="/pricing" className="text-slate-800 dark:text-slate-100 font-medium bg-slate-100/50 dark:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Priser</Link>
                        <Link to="/about" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Om os</Link>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                            onClick={() => setIsLoginOpen(true)}
                            className="hidden md:block text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                            Log ind
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                            onClick={() => navigate('/register')}
                            className="bg-inverse-surface text-inverse-primary rounded-full px-6 py-2.5 font-medium hover:bg-primary shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            Kom i gang
                        </motion.button>
                    </div>
                </div>
                <div className="h-px w-full bg-slate-100 dark:bg-slate-900"></div>
            </nav>

            {/* Main Content Canvas */}
            <main className="flex-grow flex flex-col items-center justify-start w-full px-6 md:px-12 pt-16 pb-24 z-10 relative">
                
                {/* Hero Section */}
                <section className="w-full max-w-4xl flex flex-col items-start gap-6 mt-12 mb-[clamp(6rem,10vw,8rem)] relative z-10">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-20 -left-48 md:-left-64 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-12 md:-right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-2 border border-slate-200/50 dark:border-slate-700/50"
                    >
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Simple Priser
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-[clamp(3.5rem,6vw,4.5rem)] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.1] max-w-3xl"
                    >
                        Gennemskuelige Priser for Håndværkere.
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-4"
                    >
                        Bison Frame er bygget til håndværkere med præcis det, du har brug for. Ingen skjulte gebyrer eller uoverskuelig matematik. Bare et skarpt system.
                    </motion.p>
                </section>

                {/* Pricing Tiers */}
                <section className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-3 gap-8 mb-[clamp(6rem,10vw,8rem)] relative z-10">
                    {/* Tier 1: Starter / Basis */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col gap-8 relative overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100">
                            <User size={80} strokeWidth={1} />
                        </div>
                        <div className="flex flex-col gap-2 relative z-10">
                            <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-semibold text-slate-900 dark:text-slate-100">Basis</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Perfekt til den enkelte tømrer.</p>
                        </div>
                        <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 flex-grow relative z-10 pb-8 pt-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Interaktiv Tilbudsberegner</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Dashboard & Kundehåndtering</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Op til 20 Tilbud / måned</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Auto-PDF med AB Forbruger</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Integration til e-conomic</span>
                            </li>
                        </ul>
                        <div className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1 mt-4 mb-2">
                            390 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kr/md (eks. moms)</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-500 text-sm mb-8 leading-relaxed line-clamp-3">Drop Excel-arkene. Få et komplet salgsværktøj, der sikrer, at du vinder flere opgaver professionelt.</p>
                        <div className="mt-auto flex flex-col items-center gap-2 z-10 w-full">
                            <button onClick={() => navigate('/register')} className="w-full py-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-[clamp(0.875rem,1vw,1rem)] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                Start 14 dages gratis prøve
                            </button>
                            <span className="text-[0.75rem] text-slate-400 dark:text-slate-500 font-medium">Ingen kortoplysninger påkrævet</span>
                        </div>
                    </motion.div>

                    {/* Tier 2: Growth / Premium (Highlighted) */}
                    <motion.div 
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col gap-8 relative overflow-hidden shadow-xl border-2 border-blue-600/30 dark:border-blue-500/30 z-20 md:scale-105"
                    >
                        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-600/10 dark:bg-blue-400/10 rounded-full blur-[60px] pointer-events-none z-0"></div>
                        <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none text-blue-600 dark:text-blue-400 mt-8">
                            <Users size={80} strokeWidth={1} />
                        </div>
                        
                        <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[0.65rem] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md z-10">
                            Mest Valgte
                        </div>
                        
                        <div className="flex flex-col gap-2 relative z-10">
                            <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-semibold text-slate-900 dark:text-slate-100">Professionel</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Den komplette pakke for etablerede firmaer.</p>
                        </div>
                        <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 flex-grow relative z-10 pb-8 pt-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span className="font-semibold text-slate-900 dark:text-slate-100">Alt fra Basis inkluderet</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span className="font-semibold text-slate-900 dark:text-slate-100">Ubegrænsede Tilbud</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>AI "Specialopgave" Assistent</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Ordrestyring / Apacta Integration</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>White-label (Fjern Bison logo)</span>
                            </li>
                        </ul>
                        <div className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1 mt-4 mb-2 relative z-10">
                            790 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kr/md (eks. moms)</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 relative z-10 leading-relaxed line-clamp-3">Gør salgsprocessen flydende. Automatisér overførsel til drifts-systemer og få AI til at udregne specialopgaver.</p>
                        <div className="mt-auto flex flex-col items-center gap-2 z-10 w-full">
                            <button onClick={() => navigate('/register')} className="w-full py-4 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-[clamp(0.875rem,1vw,1rem)] hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg">
                                Start 14 dages gratis prøve
                            </button>
                            <span className="text-[0.75rem] text-slate-400 dark:text-slate-500 font-medium">Ingen kortoplysninger påkrævet</span>
                        </div>
                    </motion.div>

                    {/* Tier 3: Enterprise / Mester */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col gap-8 relative overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100">
                            <Building2 size={80} strokeWidth={1} />
                        </div>
                        <div className="flex flex-col gap-2 relative z-10">
                            <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-semibold text-slate-900 dark:text-slate-100">Enterprise</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Til den større håndværksvirksomhed.</p>
                        </div>
                        <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 flex-grow relative z-10 pb-8 pt-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span className="font-semibold text-slate-900 dark:text-slate-100">Alt fra Professionel inkluderet</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Multi-bruger (Mester & Sælgere)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Avanceret Data & Konvertering</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Specialtilpasset CSS Design</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                <span>Dedikeret Onboarding Expert</span>
                            </li>
                        </ul>
                        <div className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1 mt-4 mb-2">
                            1.890 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kr/md (eks. moms)</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-500 text-sm mb-8 leading-relaxed line-clamp-3">Styr dit salgsteam, hold styr på leads på tværs af afdelinger og få systemet til at matche dit brand 100%.</p>
                        <div className="mt-auto flex flex-col items-center gap-2 z-10 w-full">
                            <button onClick={() => navigate('/register')} className="w-full py-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-[clamp(0.875rem,1vw,1rem)] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                Start 14 dages gratis prøve
                            </button>
                            <span className="text-[0.75rem] text-slate-400 dark:text-slate-500 font-medium">Ingen kortoplysninger påkrævet</span>
                        </div>
                    </motion.div>
                </section>

                {/* FAQ Section (Technical Manual Style) */}
                <section className="w-full max-w-5xl flex flex-col gap-12 pt-16 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10 mb-[clamp(6rem,10vw,8rem)]">
                    <div className="flex items-center gap-4">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-[0.65rem] uppercase tracking-widest px-2 py-1 bg-orange-100/50 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 rounded">Dok. Ref. FAQ-01</span>
                        <h2 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold text-slate-900 dark:text-slate-100">Ofte Stillede Spørgsmål</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        <div className="flex flex-col gap-3">
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">01.</span>
                                Kan jeg ændre mit abonnement senere?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Ja, absolut. Dine krav ud til kunderne kan skifte. Du kan opgradere eller nedgradere din plan når som helst fra din konto, og alle differencer refunderes fuldt automatisk.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">02.</span>
                                Hvordan fungerer den digitale løsning?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Bison Frame bygger bro direkte i systemet og sørger for, at alt automatisk udregnes præcist for dig. Der sørges for at både kunde og mester holdes fuldt opdateret.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">03.</span>
                                Er al min gemte data og info sikker?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Vi benytter den bedste sikkerhed og top-kryptering til at levere præcist arbejdsflow, så du roligt kan skrive alt inde i appen, da alt beskyttes hundrede procent.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">04.</span>
                                Hvad tæller reelt set som et 'projekt'?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Et aktivt projekt er alle tilbud der lige nu er under udarbejdelse, som afventer godkendelse eller netop opfølges på. Arkiverede gamle tilbud tæller ikke med i grænsen overhovedet.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-20 relative z-10">
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
                                Prøv uden risiko
                            </h2>
                            <p className="text-[clamp(1rem,1.25vw,1.125rem)] text-slate-500 dark:text-slate-400">
                                Start din 14 dages prøveperiode i dag. Opret dig lynhurtigt og prøv hele systemet – helt uden at indtaste betalingsoplysninger.
                            </p>
                        </div>
                        
                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/register')}
                                style={{ WebkitTransform: "translateZ(0)" }}
                                className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-5 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group"
                            >
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

                            <div style={{ padding: '60px 40px', height: '100%' }}>
                                <Login />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
