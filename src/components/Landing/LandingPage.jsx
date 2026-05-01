import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import { X, Check, Compass, Calculator, Send, ArrowRight } from 'lucide-react';
import { TheInfiniteGrid } from '../ui/the-infinite-grid';
import { AnimatedTestimonials } from '../ui/animated-testimonials';
import Lenis from 'lenis';

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
        const lenis = new Lenis({
            autoRaf: true,
        });

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
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Bison Frame Logo" className="h-10 w-auto object-contain" />
                        <div className="text-lg font-bold tracking-[-0.02em] uppercase text-slate-800 dark:text-slate-100">
                        Bison Frame
                    </div>
                    </div>
                    
                    <div className="hidden md:flex gap-8">
                        <a className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md" href="/features">Funktioner</a>
                        <a className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md" href="/pricing">Priser</a>
                        <a className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 px-3 py-2 rounded-md" href="/about">Om os</a>
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
                            Prøv 14 dage gratis
                        </motion.button>
                    </div>
                </div>
                <div className="h-px w-full bg-slate-100 dark:bg-slate-900"></div>
            </nav>

            {/* Main Content Canvas */}
            <main className="flex-grow relative z-10 w-full overflow-hidden">
                {/* Hero Section */}
                <TheInfiniteGrid />


                {/* Social Proof Section (Animated Testimonials) */}
                <AnimatedTestimonials
                    testimonials={[
                        {
                        id: 1,
                        name: "Mads Jensen",
                        role: "Tømrermester",
                        company: "Jensen Byg ApS",
                        content:
                            "Dette system har sparet mig for uendelig meget tid. Før mistede vi ofte opgaver, fordi tilbuddene trak ud. Nu får kunderne et lynhurtigt overslag automatisk, og min kalender er fyldt.",
                        rating: 5,
                        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
                        },
                        {
                        id: 2,
                        name: "Sarah Møller",
                        role: "Ejer",
                        company: "Skov Entreprise",
                        content:
                            "Jeg har prøvet meget software, men dette skiller sig ud. Den regner automatisk vores kørsel og slitage ud fra vores adresse. Det betyder præcise tilbud hver gang uden gætværk.",
                        rating: 5,
                        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
                        },
                        {
                        id: 3,
                        name: "Christian Holm",
                        role: "Byggeleder",
                        company: "Holm Håndværk",
                        content:
                            "Kunderne elsker gennemsigtigheden. De besvarer blot et par spørgsmål på 5 minutter, og bagefter står der en professionel PDF-fil klar til os. Det har markant øget vores succesrate.",
                        rating: 5,
                        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop",
                        },
                    ]}
                    trustedCompanies={["Stark", "Bygma", "Optimera", "XL Byg", "Davidsen"]}
                />

                    {/* Process Section (New Comparison Design) */}
                    <section className="max-w-[1440px] mx-auto px-8 pt-[clamp(5rem,8vw,8rem)] pb-[clamp(4rem,8vw,8rem)] relative z-10 font-body">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform, opacity" }}
                        className="font-headline text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight mb-4 text-center text-slate-900 dark:text-slate-100"
                    >
                        Professionalisme gør forskellen
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-slate-500 text-[clamp(1.125rem,2vw,1.25rem)] text-center mb-[clamp(4rem,8vw,6rem)]"
                    >
                        Lad ikke et uprofessionelt tilbud koste dig opgaven.
                    </motion.p>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16 items-stretch">
                        {/* The Messy Way */}
                        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-8 md:p-14 items-center text-center h-full">
                            {/* Title Area */}
                            <div className="flex items-center gap-3 mb-auto text-slate-500 font-bold tracking-widest text-sm h-8">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                                    <X size={16} strokeWidth={3} />
                                </div>
                                DEN GAMLE MÅDE
                            </div>

                            {/* Center Visual */}
                            <div className="flex-1 w-full flex items-center justify-center py-12">
                                <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 rotate-[-2deg] font-mono text-slate-400 dark:text-slate-500 text-sm text-left w-full max-w-[280px] italic leading-loose">
                                    ~ 12m træværk ... 8000kr?<br/>
                                    Arbejdsløn - 3 dage måske?<br/>
                                    Total: 30000-35000kr ca.
                                </div>
                            </div>

                            {/* Bottom Text */}
                            <div className="flex flex-col gap-5 text-slate-500 dark:text-slate-400 font-medium mt-auto h-[120px] justify-end">
                                <p>Håndskrevne noter på papir</p>
                                <p>Meget upræcise overslag</p>
                                <p>Du mister lynhurtigt tillid</p>
                            </div>
                        </div>

                        {/* The Blueprint Way */}
                        <div className="rounded-[2rem] bg-surface-container-high text-on-surface flex flex-col p-8 md:p-14 items-center text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] h-full relative overflow-hidden">
                            {/* Title Area */}
                            <div className="flex items-center gap-3 mb-auto font-bold tracking-widest text-sm h-8 relative z-10">
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-slate-100 shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <Check size={16} strokeWidth={4} />
                                </div>
                                BISON FRAME MÅDEN
                            </div>

                            {/* Center Visual */}
                            <div className="flex-1 w-full flex items-center justify-center py-12 relative z-10">
                                <div className="bg-white dark:bg-slate-950 rounded-xl py-6 px-8 shadow-xl text-sm text-left w-full max-w-[340px] border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                        <span className="font-bold text-[10px] tracking-widest uppercase text-slate-900 dark:text-slate-300">Specificeret Tilbud</span>
                                        <span className="text-blue-500/50 dark:text-blue-400/50 text-xs font-mono font-medium">#Q-2024-88</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">Premium Egetræsbrædder</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">16.500,00 kr.</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                                        <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">Faglært arbejdskraft (32t)</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">14.400,00 kr.</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Samlet Overslag</span>
                                        <span className="font-black text-blue-600 dark:text-blue-400 text-base">30.900,00 kr.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Text */}
                            <div className="flex flex-col gap-5 text-slate-600 dark:text-slate-400 font-medium mt-auto h-[120px] justify-end relative z-10">
                                <p>Detaljerede, brandede PDF tilbud</p>
                                <p>Indbygget kørsel og slid.</p>
                                <p>Sendt til kunden prompte</p>
                            </div>
                        </div>
                    </div>

                    {/* Step Process */}
                    <div className="max-w-6xl mx-auto relative pt-8 pb-24 mt-8">
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

                {/* Final CTA */}
                <section ref={ctaRef} className="w-full max-w-[1440px] px-8 mx-auto mb-48 relative z-10 -mt-8">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        viewport={{ once: true }}
                        style={{ WebkitTransform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-[clamp(3rem,6vw,5rem)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800/[0.5]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0 pointer-events-none"></div>
                        
                        {/* Decorative technical marks */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-slate-200 dark:border-slate-800 pointer-events-none z-0"></div>
                        <motion.div style={{ opacity: glowOpacity }} className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></motion.div>
                        
                        <div className="flex flex-col gap-4 relative z-10 max-w-xl text-center md:text-left">
                            <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                Klar til at optimere din forretning?
                            </h2>
                        </div>
                        
                        <div className="relative z-10 flex-shrink-0 mt-4 md:mt-0 flex flex-col items-center md:items-end gap-3">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/register')}
                                style={{ WebkitTransform: "translateZ(0)" }}
                                className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-5 rounded-full font-bold text-[clamp(1rem,1.5vw,1.125rem)] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-xl flex items-center gap-3 group"
                            >
                                Prøv 14 dage gratis
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
};

export default LandingPage;
