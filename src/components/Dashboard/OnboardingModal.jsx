import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { ShieldCheck, Rocket, ChevronRight, Check } from 'lucide-react';

const OnboardingModal = ({ profile, onComplete }) => {
    const [step, setStep] = useState(1);
    const [accepted, setAccepted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleComplete = async () => {
        setIsSaving(true);
        // Opdater DB
        const { error } = await supabase
            .from('carpenters')
            .update({ has_completed_onboarding: true })
            .eq('id', profile.id);
            
        setIsSaving(false);
        if (!error) {
            onComplete();
        } else {
            console.error("Fejl ved gem onboarding", error);
            onComplete(); // Videre alligevel fallback
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg relative"
            >
                {/* Subtil Bison Logo i baggrunden */}
                <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none">
                    <img src="/logo.png" alt="Bison Watermark" className="w-96 h-96 object-contain" />
                </div>

                <div className="p-8 relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                                    <Rocket size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Velkommen, {profile?.owner_name?.split(' ')[0] || 'Mester'}!</h2>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        Din portal for <strong>{profile?.company_name || 'virksomheden'}</strong> er nu klar. Vi glæder os til at hjælpe dig med at vinde flere opgaver.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setStep(2)}
                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
                                >
                                    Næste <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6"
                            >
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sikkerhed & Data</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                                        Vi tager din og dine kunders data dybt seriøst. Det er dine data, og vi passer på dem.
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 space-y-3 border border-slate-100 dark:border-slate-700">
                                    <p>🛡️ Alt data hostes sikkert inden for EU.</p>
                                    <p>🛡️ Du er Dataansvarlig - vi er blot din Databehandler.</p>
                                    <p>🛡️ Anonymiseret data bruges kun til at forbedre din AI-assistent.</p>
                                </div>

                                <div className="flex flex-col gap-4 mt-2">
                                    <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input 
                                                type="checkbox" 
                                                className="peer sr-only"
                                                checked={accepted}
                                                onChange={(e) => setAccepted(e.target.checked)}
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded transition-colors peer-checked:bg-emerald-500 peer-checked:border-emerald-500 flex items-center justify-center">
                                                {accepted && <Check size={14} className="text-white" />}
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            Jeg har læst og accepterer de officielle <a href="/Bison_Frame_Vilkaar.html" target="_blank" className="text-emerald-600 hover:underline">Vilkår & Betingelser</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" className="text-emerald-600 hover:underline">Databehandleraftalen</a>.
                                        </span>
                                    </label>

                                    <button 
                                        disabled={!accepted || isSaving}
                                        onClick={handleComplete}
                                        className={`w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2
                                            ${accepted ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                                    >
                                        {isSaving ? 'Klargør system...' : 'Accepter og gå til Dashboard'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Progress Indicators */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-center gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default OnboardingModal;
