import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import { ROICalculator } from '../ui/roi-calculator';
import Lenis from 'lenis';

export default function CalculatorPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

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
            <TopNavBar onLoginClick={() => setIsLoginOpen(true)} />

            {/* Main Content Canvas */}
            <main className="flex-grow flex flex-col items-center w-full px-6 md:px-12 pt-16 pb-24 z-10 relative">
                
                {/* Header Section */}
                <header className="text-center w-full max-w-4xl mx-auto mb-16 mt-12 relative z-10">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-20 -left-48 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-slate-200/50 dark:border-slate-700/50"
                    >
                        <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                        Kend Tallene
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-[clamp(3rem,5vw,4rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-6"
                    >
                        Beregn din <span className="text-orange-600 dark:text-orange-400 opacity-90">profit.</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-[clamp(1.125rem,2vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Beregn præcist hvor meget tid og penge du kan spare hver måned ved at digitalisere din tilbudsproces med Bison Frame.
                    </motion.p>
                </header>

                {/* Calculator Section */}
                <section className="w-full max-w-4xl mx-auto relative z-10 mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <ROICalculator />
                    </motion.div>
                </section>
            </main>

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
