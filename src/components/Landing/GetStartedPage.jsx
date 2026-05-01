import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import { Mail, Hammer, ArrowRight, X } from 'lucide-react';
import Lenis from 'lenis';

export default function GetStartedPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

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
                        <Link to="/pricing" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Priser</Link>
                        <Link to="/about" className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md">Om os</Link>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                            onClick={() => setIsLoginOpen(true)}
                            className="text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                            Log ind
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                            onClick={() => navigate('/get-started')}
                            className="bg-inverse-surface text-inverse-primary rounded-full px-6 py-2.5 font-medium hover:bg-primary shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            Kom i gang
                        </motion.button>
                    </div>
                </div>
                <div className="h-px w-full bg-slate-100 dark:bg-slate-900 border-none"></div>
            </nav>

            <main className="flex-1 flex flex-col justify-center relative z-10 w-full mb-10 mt-[clamp(5rem,10vw,12rem)]">
                {/* Notice Block Container */}
                <section className="w-full max-w-4xl px-8 mx-auto mb-32 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitBackfaceVisibility: "hidden", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-[clamp(3rem,6vw,5rem)] flex flex-col items-center text-center gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800/[0.5]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>
                        
                        {/* Decorative technical marks */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></div>
                        
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 mb-2 relative z-10">
                            <Hammer size={32} strokeWidth={2} />
                        </div>
                        
                        <div className="flex flex-col gap-6 relative z-10 max-w-2xl">
                            <h1 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Tilmelding er i øjeblikket lukket.
                            </h1>
                            <p className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-slate-600 dark:text-slate-400 font-medium">
                                For at sikre den absolut højeste kvalitet tager vi i øjeblikket kun et meget begrænset antal udvalgte, tidlige partnere ind. Offentlig tilmelding er midlertidigt sat på pause, mens vi gradvist ruller systemet ud.
                            </p>
                            <p className="text-slate-500 dark:text-slate-500 font-medium mt-2">
                                Hvis du matcher vores målprofil og ønsker at springe køen over, så kontakt vores team for at anmode om et link.
                            </p>
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center justify-center gap-4 mt-8 w-full md:w-auto">
                            <a href="mailto:partner@blueprintquoting.com">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ WebkitTransform: "translateZ(0)" }}
                                    className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 justify-center group w-full"
                                >
                                    <Mail className="w-5 h-5" />
                                    Anmod om invitation
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
                                </motion.button>
                            </a>
                            <Link to="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 tracking-wider uppercase mt-4 transition-colors">
                                Tilbage til forsiden
                            </Link>
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
                                height: '100svh',
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
        </div>
    );
}
