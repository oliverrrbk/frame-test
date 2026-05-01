import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import { Ruler, DollarSign, FileText, Link as LinkIcon, Database, ArrowRight, X } from 'lucide-react';
import Lenis from 'lenis';

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
        const lenis = new Lenis({
            autoRaf: true,
        });

        // Ensure page starts at top
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
                        <Link to="/features" className="text-slate-800 dark:text-slate-100 font-medium bg-slate-100/50 dark:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Funktioner</Link>
                        <Link to="/pricing" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Priser</Link>
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
            <main className="flex-grow flex flex-col items-center w-full px-6 md:px-12 pt-16 pb-24 z-10 relative">
                
                {/* Hero Section */}
                <header className="text-center w-full max-w-4xl mx-auto mb-[clamp(6rem,10vw,8rem)] mt-12 relative z-10">
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
                        System Arkitektur
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-[clamp(3.5rem,6vw,4.5rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-6"
                    >
                        Designet til <br /><span className="text-blue-600 dark:text-blue-400 opacity-90">Præcision.</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        viewport={{ once: true }}
                        className="text-[clamp(1.125rem,2vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Præcise tilbudsberegninger designet specifikt til tømrere og håndværkere. Ingen skabeloner, blot ren matematik.
                    </motion.p>
                </header>

                {/* Feature Grid (Bento Style) */}
                <section className="mb-40 w-full max-w-[1440px] relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1: Large Span */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-10 shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-8">
                                <Ruler size={28} />
                            </div>
                            <h3 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Hurtig Opstarts Info</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mb-8">
                                Registrér lynhurtigt alt hjemme hos kunden. Systemet forstår med det samme dit mål, og gemmer nemt materialer, tidsforbrug, arbejdstimer og meget andet uden et problem.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-sm text-slate-500 dark:text-slate-400 relative z-10">
                                <div className="flex items-center gap-4 mb-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                                    <span className="text-slate-400 dark:text-slate-600">Mål:</span>
                                    <span className="text-slate-900 dark:text-slate-100 font-semibold">3,75m x 2,6m</span>
                                </div>
                                <div className="flex items-center gap-4 mb-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                                    <span className="text-slate-400 dark:text-slate-600">Gemt:</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">375cm x 260cm</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-400 dark:text-slate-600">Areal:</span>
                                    <span className="text-orange-600 dark:text-orange-400 font-semibold">9.75 kvm.</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Feature 2: Vertical Card */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 group"
                        >
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-8 relative z-10">
                                <DollarSign size={28} />
                            </div>
                            <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4 relative z-10">Realtids Materiale Priser</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8 relative z-10">
                                Fuld adgang til alle materiale priser. Sikr dig mod stigninger og beskyt din indtjening uanset hvor eller hvornår på opgaven.
                            </p>
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Skruer 5x90mm Zink</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">↑ 2,5 kr</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Isolering 100mm A</span>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">↓ 42 kr/kvm</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Feature 3: Small Card */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 group"
                        >
                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center mb-8 relative z-10">
                                <FileText size={28} />
                            </div>
                            <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4 relative z-10">Lynhurtige PDF Tilbud</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed relative z-10">
                                Opret flotte PDF tilbud til dine kunder. Ethvert materiale, arbejdsopgave, og pris er tydeligt formateret, så kunden siger ja tak.
                            </p>
                        </motion.div>

                        {/* Feature 4: Wide Span Secondary */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-10 shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-10 group"
                        >
                            <div className="flex-1 relative z-10">
                                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                                    <LinkIcon size={14} /> Integration
                                </div>
                                <h3 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Husk Kørsel Og Slid</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Når du er færdig med opmålingen, skal du ikke tænke mere på alt det trælse og kedelige arbejde. Systemet inkluderer nemlig automatisk kørsel samt slid.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 flex justify-center relative z-10">
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-400/10 rounded-full animate-pulse"></div>
                                    <div className="absolute inset-4 bg-white dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                        <Database size={36} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Technical Spec Sheet: The Logic Engine */}
                <section className="mb-40 w-full max-w-[1440px] px-8 mx-auto relative z-10 mt-12">
                    <div className="flex flex-col md:flex-row gap-16 items-start">
                        <div className="md:w-1/3 relative z-20 sticky top-32">
                            <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 mb-6">
                                Tilbudsmotoren.
                            </h2>
                            <p className="text-[clamp(1rem,1.25vw,1.125rem)] text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                                Vi bruger ikke blot grove skøn. Vores teknologi udregner præcist profitten ud fra din timesats, kørsel, benzin og bilens slitage.
                            </p>
                            <a href="#" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all">
                                Læs Mere Om Teknologien Bag <ArrowRight size={16} />
                            </a>
                        </div>
                        <div className="md:w-2/3 w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative z-10 overflow-hidden" style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}>
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex justify-between items-end">
                                <div>
                                    <div className="text-[0.65rem] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-1">Modul ID</div>
                                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">BEREGNING_AF_TILLÆG</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[0.65rem] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-1">Status</div>
                                    <div className="text-blue-600 dark:text-blue-400 font-bold text-sm">AKTIV</div>
                                </div>
                            </div>
                            <div className="space-y-6 font-mono text-sm relative z-20">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="col-span-3 text-slate-400 dark:text-slate-500 font-medium">Din Timesats</div>
                                    <div className="col-span-9 text-slate-600 dark:text-slate-300">
                                        Sæt din ønskede timesats og beregn nemt fortjeneste uanset hvor lang tid et projekt forventes at tage med den givne arbejdsbyrde.
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="col-span-3 text-slate-400 dark:text-slate-500 font-medium">Kørsel Penge</div>
                                    <div className="col-span-9 text-slate-600 dark:text-slate-300">
                                        Regner fuldautomatisk ud præcist hvad det koster dig at køre dertil, bl.a ud fra benzin priser samt dækslip, så det lægges på toppen.
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start">
                                    <div className="col-span-3 text-slate-400 dark:text-slate-500 font-medium">Materialer</div>
                                    <div className="col-span-9 text-slate-600 dark:text-slate-300">
                                        Udregner totalprisen for materialer, hvorefter du tilføjer din ønskede avance procent. Derefter kan faktura skabes og sendes afsted.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="mb-40 py-16 border-y border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 w-full relative z-10">
                    <div className="max-w-[1440px] px-8 mx-auto">
                        <div className="text-center mb-10">
                            <span className="text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">Stoles på af Danmarks seje</span>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="font-black text-2xl tracking-tighter text-slate-900 dark:text-slate-100">STARK</div>
                            <div className="font-bold text-xl tracking-widest text-slate-900 dark:text-slate-100">OPTIMERA</div>
                            <div className="font-serif italic font-bold text-2xl text-slate-900 dark:text-slate-100">Bygma Danmark</div>
                            <div className="font-mono font-bold text-xl text-slate-900 dark:text-slate-100">XL BYG</div>
                        </div>
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
                        <motion.div style={{ opacity: glowOpacity }} className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-orange-600/5 blur-[100px] rounded-full pointer-events-none"></motion.div>
                        
                        <div className="flex flex-col gap-4 relative z-10 max-w-xl text-center md:text-left">
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Få dit nye system
                            </h2>
                            <p className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-600 dark:text-slate-400">
                                Stop overslagstvivlen. Start med at sikre profitten. Prøv Bison Frame systemet i 14 dage.
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
