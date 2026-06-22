import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Lock, Eye, EyeOff, ShieldCheck, User, Phone, Check, ChevronRight, Loader2, Share, PlusSquare, Search, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import PushSubscriber from './PushSubscriber';

const EmployeeOnboardingModal = ({ profile, onComplete }) => {
    const [step, setStep] = useState(1);
    
    // Step 1: Password
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Step 2: Profile & Terms
    const [name, setName] = useState(profile?.owner_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [accepted, setAccepted] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleNextStep1 = async () => {
        setError(null);
        if (password.length < 6) {
            setError('Adgangskoden skal være på mindst 6 tegn.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Adgangskoderne stemmer ikke overens.');
            return;
        }
        
        // We save the password to auth immediately so it's secured,
        // but we don't finish onboarding until step 3
        setIsSaving(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });
            if (authError) throw authError;
            setStep(2);
        } catch (err) {
            setError(err.message || 'Kunne ikke opdatere adgangskoden.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNextStep2 = async () => {
        if (!name.trim()) {
            toast.error("Indtast venligst dit navn.");
            return;
        }
        if (!accepted) {
            toast.error("Du skal acceptere vilkårene for at fortsætte.");
            return;
        }
        
        setIsSaving(true);
        try {
            const { error: dbError } = await supabase
                .from('carpenters')
                .update({ 
                    requires_password_change: false,
                    has_completed_onboarding: true,
                    owner_name: name,
                    phone: phone
                })
                .eq('id', profile.id);

            if (dbError) throw dbError;
            setStep(3);
        } catch (err) {
            console.error("Fejl ved afslutning:", err);
            toast.error('Der opstod en fejl. Prøv igen.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinish = () => {
        onComplete();
    };

    const renderRoleName = (role) => {
        switch(role) {
            case 'worker': return 'Svend';
            case 'apprentice': return 'Lærling';
            case 'accountant': return 'Bogholder';
            case 'admin': return 'Administrator';
            default: return 'Projektleder / Svend';
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel rounded-2xl shadow-2xl w-full max-w-md relative bg-white overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 shrink-0">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-6 sm:p-8 relative z-10 overflow-y-auto flex-1">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Velkommen!</h2>
                                    <p className="text-slate-500 text-sm">
                                        Du er nu oprettet som <strong>{renderRoleName(profile?.role)}</strong>. Af sikkerhedsmæssige årsager skal du vælge din egen personlige adgangskode.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Ny adgangskode
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Mindst 6 tegn"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Bekræft adgangskode
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Gentag adgangskode"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleNextStep1}
                                    disabled={isSaving || !password || !confirmPassword}
                                    className={`w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2
                                        ${password && confirmPassword ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Gem og fortsæt'}
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Din Profil</h2>
                                    <p className="text-slate-500 text-sm">
                                        Tjek at dine oplysninger er korrekte, så kollegaerne kan fange dig.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Dit fulde navn
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="F.eks. Kasper Hansen"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Telefonnummer (valgfrit)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="F.eks. 12 34 56 78"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <label className="flex items-start gap-3 cursor-pointer group p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left">
                                            <div className="relative flex items-center justify-center mt-0.5">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer opacity-0 absolute"
                                                    checked={accepted}
                                                    onChange={(e) => setAccepted(e.target.checked)}
                                                />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                    ${accepted ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                                    {accepted && <Check size={14} className="text-white" />}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-slate-900 block mb-0.5">Godkend betingelser</span>
                                                <span className="text-xs text-slate-500 block">Jeg accepterer systemets <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>vilkår</a> og <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>databehandling</a>.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleNextStep2}
                                    disabled={isSaving || !name || !accepted}
                                    className={`w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2
                                        ${name && accepted ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <>Næste <ChevronRight size={18} /></>}
                                </button>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                                        <Check size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Du er nu oprettet! 🎉</h2>
                                    <p className="text-slate-600 text-sm mb-4">
                                        Din profil er gemt. Systemet fungerer dog bedst som app på din telefon, så du har sagerne lige ved hånden.
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                                    <h3 className="font-semibold text-slate-800 text-center mb-2">Sådan får du appen:</h3>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 text-blue-500">
                                            <span className="font-bold text-sm">1</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">
                                            <span className="font-semibold text-slate-800 block mb-0.5">Åbnet fra f.eks. Mail eller Messenger?</span>
                                            Tryk på de tre prikker (•••) og vælg <strong>Åbn i Safari</strong> (iPhone) eller <strong>Åbn i Chrome</strong> (Android).
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 text-blue-500">
                                            <span className="font-bold text-sm">2</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1.5 flex flex-wrap items-center gap-1">
                                            Tryk på Del-ikonet 
                                            <span className="inline-flex bg-white shadow-sm border border-slate-200 p-1 rounded text-slate-700">
                                                <Share size={14} />
                                            </span> 
                                            i bunden af skærmen (Safari) eller Menu-ikonet (Chrome).
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 text-blue-500">
                                            <span className="font-bold text-sm">3</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1.5 flex flex-wrap items-center gap-1">
                                            Vælg 
                                            <span className="font-semibold text-slate-800">Føj til hjemmeskærm</span>
                                            <span className="inline-flex bg-white shadow-sm border border-slate-200 p-1 rounded text-slate-700">
                                                <PlusSquare size={14} />
                                            </span> 
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mt-6">
                                    <p className="text-sm text-blue-800 font-medium m-0">Når du har tilføjet appen, kan du bare lukke browseren og åbne appen direkte fra din hjemmeskærm!</p>
                                </div>

                                <button 
                                    onClick={handleFinish}
                                    className="w-full py-3 mt-4 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                >
                                    Fortsæt i browseren (Ikke anbefalet)
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default EmployeeOnboardingModal;
