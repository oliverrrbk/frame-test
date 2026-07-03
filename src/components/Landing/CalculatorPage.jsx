import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import PageTransition from '../ui/PageTransition';
import { ROICalculator } from '../ui/roi-calculator';
import { Share2, Wallet, ShieldCheck, ArrowRight, MapPin } from 'lucide-react';
import CustomerCalculatorDemo from './CustomerCalculatorDemo';

export default function CalculatorPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

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
            <main className="flex-grow flex flex-col items-center w-full px-6 md:px-12 pt-16 pb-24 z-10 relative">

                {/* ═══ TOP (hero): Kundeberegneren — se hvordan det virker ═══ */}
                <section className="w-full max-w-7xl mx-auto relative z-10 mt-8 mb-28">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-20 -left-48 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
                    <div className="absolute top-24 -right-32 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>

                    <div className="grid lg:grid-cols-5 gap-12 items-center">
                        {/* Venstre: intro + de tre pointer */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className="lg:col-span-2 flex flex-col gap-8"
                        >
                            <div>
                                <div className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-slate-200/50 dark:border-slate-700/50">
                                    <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                                    Det unikke
                                </div>
                                <h1 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-5">
                                    Lad kunden regne sit <span className="text-orange-600 dark:text-orange-400 opacity-90">eget overslag</span>
                                </h1>
                                <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Det er her Frame er anderledes. Du deler en beregner med kunden — og sparer selv tiden. Se hvordan det virker →
                                </p>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="flex gap-4 items-start group">
                                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        <Share2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Del et link</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Kunden svarer på et par spørgsmål og får et overslag med det samme — uden du løfter en finger.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group">
                                    <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Bygget på <span className="text-orange-600 dark:text-orange-400">dine</span> priser</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Dine egne time- og materialepriser ligger bag hver beregning — så overslaget bliver unikt for din forretning, ikke en generisk skabelon alle får. Du bestemmer tallene, altid.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Slip for tilbudskrigene</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Du bruger ikke længere tid på at regne på — eller køre ud til — opgaver, du måske aldrig får.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tryghedsnote: du kommer altid ud */}
                            <div className="flex gap-3 items-start rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shrink-0">
                                    <MapPin size={17} />
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">Du kommer selvfølgelig altid ud.</span> Beregneren erstatter ikke dit besøg — du tager altid kontrolmål før en bindende aftale. Den sikrer bare, at du kun bruger tiden på de kunder, der allerede har valgt dig.
                                </p>
                            </div>
                        </motion.div>

                        {/* Højre: den store, faste live-demo */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="lg:col-span-3"
                        >
                            <CustomerCalculatorDemo />
                        </motion.div>
                    </div>

                    {/* Ærlig note */}
                    <p className="text-center text-sm text-slate-400 dark:text-slate-500 max-w-2xl mx-auto mt-10 leading-relaxed">
                        Virker bedst til bestemte, gentagne opgavetyper — ikke alt kan sættes på formel, og det ved enhver god tømrer. Du styrer selv præcis hvad kunden kan regne på.
                    </p>
                </section>

                {/* ═══ MIDT: Beregn din profit (ROI) ═══ */}
                <section className="w-full max-w-4xl mx-auto relative z-10 mb-28">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 border border-slate-200/50 dark:border-slate-700/50">
                            <span className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                            Kend tallene
                        </div>
                        <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight tracking-[-0.03em] text-slate-900 dark:text-slate-50 mb-5">
                            Beregn din <span className="text-orange-600 dark:text-orange-400 opacity-90">profit.</span>
                        </h2>
                        <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Se præcist hvor meget tid og penge du kan spare hver måned ved at lade kunden regne sit eget overslag.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5 }}
                    >
                        <ROICalculator />
                    </motion.div>
                </section>

                {/* ═══ BUND: Opret bruger-CTA ═══ */}
                <section className="w-full max-w-6xl mx-auto relative z-10 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true, margin: "-50px" }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-[clamp(2.5rem,5vw,4rem)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>

                        <div className="flex flex-col gap-3 relative z-10 max-w-xl text-center md:text-left">
                            <h2 className="text-[clamp(1.75rem,3vw,2.75rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Se om det passer ind i din forretning
                            </h2>
                            <p className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-slate-500 dark:text-slate-400">
                                Prøv systemet gratis, og byg din egen beregner op — helt som du selv vil have den.
                            </p>
                        </div>

                        <div className="relative z-10 flex-shrink-0 flex flex-col items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/register')}
                                style={{ WebkitTransform: "translateZ(0)" }}
                                className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group whitespace-nowrap"
                            >
                                Prøv det gratis i 30 dage
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Simulér det selv. Ingen kort påkrævet.</span>
                        </div>
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
        </PageTransition>
    );
}
