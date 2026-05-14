import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Rocket, ChevronRight, Check, Coins, Link as LinkIcon, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const OnboardingModal = ({ profile, onComplete }) => {
    const [step, setStep] = useState(1);
    const [hourlyRate, setHourlyRate] = useState(profile?.hourly_rate || 500);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleComplete = async () => {
        setIsSaving(true);
        // Opdater DB med timepris og at onboarding er fuldført
        const { error } = await supabase
            .from('carpenters')
            .update({ 
                has_completed_onboarding: true,
                hourly_rate: Number(hourlyRate)
            })
            .eq('id', profile.id);
            
        setIsSaving(false);
        if (!error) {
            onComplete();
        } else {
            console.error("Fejl ved gem onboarding", error);
            onComplete(); // Videre alligevel fallback
        }
    };

    const handleCopyLink = () => {
        const baseUrl = window.location.origin.includes('localhost') ? window.location.origin : 'https://bisonframe.dk';
        navigator.clipboard.writeText(`${baseUrl}/${profile?.slug || 't'}`);
        toast.success('Linket er kopieret! Du kan nu sætte det ind på din Facebook eller hjemmeside.');
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel rounded-2xl shadow-2xl w-full max-w-lg relative bg-white overflow-hidden"
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
                                        Din portal for <strong>{profile?.company_name || 'virksomheden'}</strong> er nu klar. Vi glæder os til at hjælpe dig med at vinde flere opgaver, og spare timer på kørsel.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setStep(2)}
                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
                                >
                                    Lad os komme i gang <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6 text-center"
                            >
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-2">
                                    <Coins size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hvad er din timepris?</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        Systemet bruger din timepris til at udregne kundernes "stærkt vejledende" overslag. Du kan altid ændre dette senere i indstillingerne.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-4 mt-2">
                                    <div className="relative w-full max-w-xs mx-auto">
                                        <input 
                                            type="number" 
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(e.target.value)}
                                            className="w-full text-center text-3xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl py-4 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">kr. / time</div>
                                    </div>

                                    <button 
                                        onClick={() => setStep(3)}
                                        className="w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 mt-4"
                                    >
                                        Gem timepris og fortsæt <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6 text-center"
                            >
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-2">
                                    <LinkIcon size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Du er klar! 🎉</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        Her er dit hemmelige våben. Dette er linket, du sender til dine kunder, eller lægger ind på din hjemmeside/Facebook.
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3">
                                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300 break-all">
                                        bisonframe.dk/{profile?.slug || 't'}
                                    </span>
                                    <button 
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                    >
                                        <Copy size={16} /> Kopiér Link
                                    </button>
                                </div>

                                <button 
                                    disabled={isSaving}
                                    onClick={handleComplete}
                                    className={`w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 mt-4
                                        ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'}`}
                                >
                                    {isSaving ? 'Klargør system...' : 'Gå til dit Dashboard'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Progress Indicators */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-center gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 3 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default OnboardingModal;
