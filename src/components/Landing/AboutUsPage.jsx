import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import { Compass, Layers, Gauge, Code, ArrowRight } from 'lucide-react';
import Lenis from 'lenis';

export default function AboutUsPage({ setSession }) {
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
                        <Link to="/features" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Funktioner</Link>
                        <Link to="/pricing" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Priser</Link>
                        <Link to="/about" className="text-slate-800 dark:text-slate-100 font-medium bg-slate-100/50 dark:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Om os</Link>
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
                <header className="w-full max-w-[1440px] mx-auto mb-[clamp(6rem,10vw,8rem)] mt-12 relative z-10">
                    <div className="max-w-4xl relative">
                        {/* Decorative Background Glows - Adjusted for left alignment */}
                        <div className="absolute -top-20 -left-48 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                        <div className="absolute top-24 left-96 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-slate-200/50 dark:border-slate-700/50"
                        >
                            <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                            Virksomhedens Oprindelse
                        </motion.div>
                        <motion.h1 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            viewport={{ once: true }}
                            className="text-[clamp(3.5rem,6vw,4.5rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-6"
                        >
                            Vores DNA er Håndværk.
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            viewport={{ once: true }}
                            className="text-[clamp(1.125rem,2vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed"
                        >
                            Skabt på byggepladsen med de udfordringer håndværkere står i hver dag. Vi byggede Bison Frame for at fjerne kontorbøvl og sikre absolut præcision. Det her er den nye standard.
                        </motion.p>
                    </div>
                </header>

                {/* Mission/Story: Engineering Standards */}
                <section className="mb-32 w-full max-w-[1440px] relative z-10">
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-[clamp(1.5rem,2vw,1.75rem)] font-semibold text-slate-900 dark:text-slate-100 tracking-[-0.02em] mb-12 border-l-4 border-blue-600 dark:border-blue-500 pl-4"
                    >
                        Systemets Grundsten
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Standard Card 1 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            viewport={{ once: true }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] group-hover:bg-blue-600/10 transition-all pointer-events-none"></div>
                            <div className="mb-6 flex items-center gap-3 relative z-10">
                                <div className="text-blue-600 dark:text-blue-400">
                                    <Compass size={28} />
                                </div>
                                <h3 className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-bold text-slate-900 dark:text-slate-100">Absolut Nøjagtighed</h3>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed flex-grow relative z-10">
                                Tilbud er ikke gætteri. Det er byggeklodserne for opgaverne. Vi udvikler de værktøjer der sikrer fuld nøjagtighed på dit linje-niveau, ned til den mindste detalje.
                            </p>
                        </motion.div>

                        {/* Standard Card 2 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            viewport={{ once: true }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
                        >
                            <div className="mb-6 flex items-center gap-3 relative z-10">
                                <div className="text-slate-600 dark:text-slate-400">
                                    <Layers size={28} />
                                </div>
                                <h3 className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-bold text-slate-900 dark:text-slate-100">Fuld Gennemsigtighed</h3>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed flex-grow relative z-10">
                                Hvert et materiale, hver time og enhver avance er synlig. Vi fjerner alt det 'uoverskuelige' ved dit tilbud, og giver skarp gennemsigtighed på projektets omkostninger.
                            </p>
                        </motion.div>

                        {/* Standard Card 3 */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            viewport={{ once: true }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-500 border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
                        >
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-[40px] group-hover:bg-orange-600/10 transition-all pointer-events-none"></div>
                            <div className="mb-6 flex items-center gap-3 relative z-10">
                                <div className="text-orange-600 dark:text-orange-400">
                                    <Gauge size={28} />
                                </div>
                                <h3 className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-bold text-slate-900 dark:text-slate-100">Hurtig Udførsel</h3>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed flex-grow relative z-10">
                                Præcision behøver ikke være langsomt. Ved at automatisere tunge udregninger gør vi det muligt at sende fejlfrie tilbud hurtigt, hvilket giver dig en professionel fordel.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Origin Section */}
                <section className="mb-40 w-full max-w-[1440px] relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-[3rem] p-12 md:p-20 relative overflow-hidden flex flex-col lg:flex-row gap-16 items-center"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-10 right-10 flex gap-2 opacity-30">
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                        </div>

                        <div className="flex-1">
                            <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight mb-6">
                                Fra Byggeplads til Software
                            </h2>
                            <div className="space-y-6 text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <p>
                                    Vi startede ikke i en eller anden tech-inkubator. Vi startede selv ude på byggepladsen og kiggede på uoverskuelige materialelister og manuelle regneark, hvor vi hele tiden mistede tid og penge på dumme småfejl.
                                </p>
                                <p>
                                    Springet fra at skrue brædder sammen til at skrive kode var ikke et skifte for sjov; det var en nødvendighed. Min partner og jeg forvandlede håndværkernes reelle frustrationer til systemets rene logik. 
                                </p>
                                <div className="mt-8 inline-flex flex-col gap-1 border-l-2 border-slate-300 dark:border-slate-700 pl-4 py-2">
                                    <span className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Systemdirektiv</span>
                                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Vi bygger software, der arbejder lige så hårdt som dem, der bruger det.</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[45%] h-[400px] rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center relative">
                            {/* Generated Architecture/Technology Photo */}
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/billede1.png')" }}></div>
                        </div>
                    </motion.div>
                </section>

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto relative z-10">
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
                            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-400 block dark:text-slate-500">Systemet Er Klar</span>
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Vælg Dit Fundament
                            </h2>
                        </div>
                        
                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0 flex flex-col items-center justify-center gap-4">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/register')}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 w-full sm:w-auto justify-center group whitespace-nowrap"
                                >
                                    Prøv Det Gratis
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 px-8 py-4 rounded-full font-medium text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300 flex items-center gap-3 w-full sm:w-auto justify-center group whitespace-nowrap"
                                >
                                    Se Hvordan Det Virker
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
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

                            {/* Login Component inside Drawer */}
                            <div style={{ position: 'relative', zIndex: 110, minHeight: '100svh' }}>
                               <Login setSession={setSession} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
