import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../Auth/Login';
import Footer from './Footer';
import TopNavBar from './TopNavBar';
import { User, Users, Building2, CheckCircle2, ArrowRight, X } from 'lucide-react';
import Lenis from 'lenis';

export default function PricingPage({ setSession }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const navigate = useNavigate();

    // Stater for den mobile scroll-karrusel
    const [activeIndex, setActiveIndex] = useState(1); // Standard 'Professionel' (index 1)
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // Centrer 'Professionel' kortet på mobil ved load
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    const centerPos = (container.scrollWidth - container.clientWidth) / 2;
                    container.scrollTo({ left: centerPos, behavior: 'instant' });
                }
            }, 100);

            // IntersectionObserver sikrer lynhurtig performance uden JS-scroll-lag
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.dataset.index);
                        setActiveIndex(index);
                    }
                });
            }, {
                root: container,
                threshold: 0.6
            });
            
            // Vi bruger setTimeout til at sikre, at dom-elementerne er renderet
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    const children = scrollContainerRef.current.querySelectorAll('.pricing-card-mobile');
                    children.forEach(child => observer.observe(child));
                }
            }, 200);
            
            return () => observer.disconnect();
        }
    }, []);

    const pricingTiers = [
        {
            id: 'basis',
            name: 'Basis',
            sub: 'Perfekt til den enkelte tømrer.',
            price: '390',
            description: 'Drop Excel-arkene. Få et komplet salgsværktøj, der sikrer, at du vinder flere opgaver professionelt.',
            features: [
                'Beregn Standardopgaver (Tag, Gulv mm.)',
                'Dashboard & Kundehåndtering',
                'Op til 20 Tilbud / måned',
                'Auto-PDF med AB Forbruger',
                'Integration til e-conomic & Dinero'
            ],
            badge: null,
            highlight: false,
            iconType: 'user'
        },
        {
            id: 'professional',
            name: 'Professionel',
            sub: 'Den komplette pakke for etablerede firmaer.',
            price: '790',
            description: 'Gør salgsprocessen flydende. Automatisér overførsel til drifts-systemer og få AI til at udregne specialopgaver.',
            features: [
                'Alt fra Basis inkluderet',
                'Ubegrænsede Tilbud',
                'AI-Agent til Special- & Kombiprojekter',
                'Ordrestyring / Apacta Integration',
                'White-label (Fjern Bison logo)'
            ],
            badge: 'Mest Valgte',
            highlight: true,
            iconType: 'users'
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            sub: 'Til den større håndværksvirksomhed.',
            price: '1.890',
            description: 'Styr dit salgsteam, hold styr på leads på tværs af afdelinger og få systemet til at matche dit brand 100%.',
            features: [
                'Alt fra Professionel inkluderet',
                'Multi-bruger (Mester & Projektledere)',
                'Avanceret Data & Konvertering',
                'Specialtilpasset CSS Design',
                'Dedikeret Onboarding Expert'
            ],
            badge: null,
            highlight: false,
            iconType: 'building'
        }
    ];

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
            <TopNavBar onLoginClick={() => setIsLoginOpen(true)} />

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
                        className="text-[clamp(2.15rem,6vw,4.5rem)] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.15] max-w-3xl"
                    >
                        Gennemskuelige <span className="text-orange-600 dark:text-orange-400">Priser</span> for Håndværkere.
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

                {/* Desktop Pricing Grid */}
                <section className="hidden md:grid w-full max-w-[1200px] grid-cols-3 gap-8 mb-[clamp(6rem,10vw,8rem)] relative z-10">
                    {pricingTiers.map((tier, idx) => (
                        <motion.div 
                            key={tier.id}
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (idx + 1), duration: 0.5 }}
                            viewport={{ once: true, margin: "-50px" }}
                            style={{ WebkitTransform: "translateZ(0)", willChange: "transform", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
                            className={`bg-white dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col gap-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group border ${
                                tier.highlight 
                                    ? 'border-2 border-blue-600/30 dark:border-blue-500/30 md:scale-105 z-20' 
                                    : 'border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            {tier.highlight && (
                                <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-600/10 dark:bg-blue-400/10 rounded-full blur-[60px] pointer-events-none z-0"></div>
                            )}
                            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100">
                                {tier.iconType === 'user' && <User size={80} strokeWidth={1} />}
                                {tier.iconType === 'users' && <Users size={80} strokeWidth={1} />}
                                {tier.iconType === 'building' && <Building2 size={80} strokeWidth={1} />}
                            </div>
                            
                            {tier.badge && (
                                <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[0.65rem] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md z-10">
                                    {tier.badge}
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2 relative z-10">
                                <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-semibold text-slate-900 dark:text-slate-100">{tier.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{tier.sub}</p>
                            </div>
                            <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 flex-grow relative z-10 pb-8 pt-4">
                                {tier.features.map((feature, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-3">
                                        <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                                        <span className={fIdx === 0 && tier.highlight ? "font-semibold text-slate-900 dark:text-slate-100" : ""}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1 mt-4 mb-2">
                                {tier.price} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kr/md (eks. moms)</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-500 text-sm mb-8 leading-relaxed line-clamp-3">{tier.description}</p>
                            <div className="mt-auto flex flex-col items-center gap-2 z-10 w-full">
                                <button 
                                    onClick={() => navigate('/register')} 
                                    className={`w-full py-4 rounded-full font-semibold text-[clamp(0.875rem,1vw,1rem)] transition-colors ${
                                        tier.highlight 
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Start 30 dages gratis prøve
                                </button>
                                <span className="text-[0.75rem] text-slate-400 dark:text-slate-500 font-medium">Ingen kortoplysninger påkrævet</span>
                            </div>
                        </motion.div>
                    ))}
                </section>

                {/* Mobile Pricing Horizontal Scroll Snap */}
                <section className="block md:hidden w-full max-w-full mb-[clamp(4rem,8vw,6rem)] relative z-10">
                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto hide-scrollbar gap-4 px-[7.5vw] pb-8 pt-4"
                        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                        {pricingTiers.map((tier, idx) => (
                            <div
                                key={tier.id}
                                data-index={idx}
                                onClick={(e) => {
                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                }}
                                className={`pricing-card-mobile flex-shrink-0 w-[85vw] max-w-[320px] bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden shadow-xl transition-all duration-300 border cursor-pointer ${
                                    tier.highlight 
                                        ? 'border-2 border-blue-500 dark:border-blue-400 shadow-blue-500/10' 
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}
                            >
                                {tier.highlight && (
                                    <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-blue-600/5 dark:bg-blue-400/5 rounded-full blur-[40px] pointer-events-none z-0"></div>
                                )}
                                <div className="absolute top-0 right-0 p-5 opacity-5 dark:opacity-10 pointer-events-none text-slate-900 dark:text-slate-100">
                                    {tier.iconType === 'user' && <User size={60} strokeWidth={1} />}
                                    {tier.iconType === 'users' && <Users size={60} strokeWidth={1} />}
                                    {tier.iconType === 'building' && <Building2 size={60} strokeWidth={1} />}
                                </div>
                                
                                {tier.badge && (
                                    <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[0.6rem] font-bold uppercase tracking-widest px-2 py-1 rounded z-10">
                                        {tier.badge}
                                    </div>
                                )}

                                <div className="flex flex-col gap-1 relative z-10">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tier.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{tier.sub}</p>
                                </div>

                                <ul className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-300 flex-grow relative z-10 pb-4 pt-2">
                                    {tier.features.map((feature, fIdx) => (
                                        <li key={fIdx} className="flex items-start gap-2.5">
                                            <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={16} />
                                            <span className={fIdx === 0 && tier.highlight ? "font-semibold text-slate-900 dark:text-slate-100" : ""}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-baseline gap-1 mt-2 relative z-10">
                                    {tier.price} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">kr/md (eks. moms)</span>
                                </div>

                                <p className="text-slate-500 dark:text-slate-500 text-xs leading-relaxed line-clamp-3 mb-4">{tier.description}</p>

                                <div className="mt-auto flex flex-col items-center gap-1.5 z-10 w-full">
                                    <button 
                                        onClick={() => navigate('/register')} 
                                        className={`w-full py-3 rounded-full font-semibold text-sm transition-colors ${
                                            tier.highlight 
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        Start prøveperiode
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Indicator dots for Mobile Swipe Deck */}
                    <div className="flex justify-center gap-2.5 mt-2">
                        {pricingTiers.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    if (scrollContainerRef.current) {
                                        const container = scrollContainerRef.current;
                                        const maxScroll = container.scrollWidth - container.clientWidth;
                                        const targetScroll = (i / 2) * maxScroll;
                                        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
                                    }
                                }}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    activeIndex === i 
                                        ? 'bg-blue-600 dark:bg-blue-400 w-6' 
                                        : 'bg-slate-200 dark:bg-slate-800 w-2'
                                }`}
                                aria-label={`Gå til pakke ${i + 1}`}
                            />
                        ))}
                    </div>
                </section>

                {/* Integration Value Proposition */}
                <section className="w-full max-w-4xl mx-auto mb-[clamp(6rem,10vw,8rem)] relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                            Altid Inkluderet
                        </div>
                        <h2 className="text-[clamp(1.5rem,2.5vw,2rem)] font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                            Meget mere end bare en tilbudsberegner
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-[clamp(1rem,1.2vw,1.125rem)] leading-relaxed mb-8">
                            Det kan være svært at holde styr på alle de tilbud, man har ude. Bison Frame samler det hele ét sted, så du aldrig misser en besked eller glemmer at følge op. Du får et dejligt overblik over dine kunder – og når opgaven er i hus, overføres sagen automatisk direkte til dit foretrukne regnskabs- eller ordrestyringsprogram med ét klik.
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">e-conomic</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Ordrestyring</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Dinero</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Apacta</span>
                            <span className="font-bold text-xl text-slate-700 dark:text-slate-300">Minuba</span>
                        </div>
                    </div>
                </section>

                {/* FAQ Section (Technical Manual Style) */}
                <section className="w-full max-w-5xl flex flex-col gap-12 pt-16 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10 mb-[clamp(6rem,10vw,8rem)]">
                    <div className="flex items-center gap-4">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-[0.65rem] uppercase tracking-widest px-2 py-1 bg-orange-100/50 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 rounded">Dok. Ref. FAQ-01</span>
                        <h2 className="text-[clamp(1.5rem,2vw,1.75rem)] font-bold text-slate-900 dark:text-slate-100">Ofte Stillede Spørgsmål</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="flex flex-col gap-3"
                        >
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">01.</span>
                                Kan jeg ændre mit abonnement senere?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Ja, absolut. Dine krav ud til kunderne kan skifte. Du kan opgradere eller nedgradere din plan når som helst fra din konto, og alle differencer refunderes fuldt automatisk.
                            </p>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="flex flex-col gap-3"
                        >
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">02.</span>
                                Hvordan fungerer den digitale løsning?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Bison Frame bygger bro direkte i systemet og sørger for, at alt automatisk udregnes præcist for dig. Der sørges for at både kunde og mester holdes fuldt opdateret.
                            </p>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="flex flex-col gap-3"
                        >
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">03.</span>
                                Er al min gemte data og info sikker?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Vi benytter den bedste sikkerhed og top-kryptering til at levere præcist arbejdsflow, så du roligt kan skrive alt inde i appen, da alt beskyttes hundrede procent.
                            </p>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="flex flex-col gap-3"
                        >
                            <h4 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-1 shrink-0">04.</span>
                                Hvad tæller reelt set som et 'projekt'?
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                                Et aktivt projekt er alle tilbud der lige nu er under udarbejdelse, som afventer godkendelse eller netop opfølges på. Arkiverede gamle tilbud tæller ikke med i grænsen overhovedet.
                            </p>
                        </motion.div>
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
                                Start din gratis måned i dag. Opret dig lynhurtigt og prøv hele systemet i 30 dage – helt uden at indtaste betalingsoplysninger.
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
