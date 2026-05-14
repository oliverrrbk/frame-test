import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Building2, Image as ImageIcon, Coins, Check, Upload, Copy, ChevronRight, Loader2, MessageSquare, Globe, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const OnboardingModal = ({ profile, onComplete }) => {
    const [step, setStep] = useState(1);
    const [accepted, setAccepted] = useState(false);
    
    // Uploads
    const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '');
    const [ownerImageUrl, setOwnerImageUrl] = useState(profile?.owner_image_url || '');
    const [uploadingImage, setUploadingImage] = useState(null);
    const logoInputRef = useRef(null);
    const ownerInputRef = useRef(null);

    // Priser
    const [hourlyRate, setHourlyRate] = useState(profile?.hourly_rate || 500);
    
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingImage(type);
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}_${type}_${Math.random()}.${fileExt}`;
            const filePath = `company_assets/${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            if (type === 'logo') {
                setLogoUrl(publicUrl);
            } else {
                setOwnerImageUrl(publicUrl);
            }
        } catch (error) {
            toast.error("Der opstod en fejl ved upload af billedet.");
        } finally {
            setUploadingImage(null);
        }
    };

    const saveAndComplete = async () => {
        setIsSaving(true);
        
        const updateData = {
            has_completed_onboarding: true,
            hourly_rate: Number(hourlyRate)
        };
        
        if (logoUrl) updateData.logo_url = logoUrl;
        if (ownerImageUrl) updateData.owner_image_url = ownerImageUrl;

        const { error } = await supabase
            .from('carpenters')
            .update(updateData)
            .eq('id', profile.id);
            
        setIsSaving(false);
        if (!error) {
            onComplete();
        } else {
            console.error("Systemfejl ved lagring af onboarding:", error);
            onComplete(); 
        }
    };

    const handleCopyLink = () => {
        const baseUrl = window.location.origin.includes('localhost') ? window.location.origin : 'https://bisonframe.dk';
        navigator.clipboard.writeText(`${baseUrl}/${profile?.slug || 't'}`);
        toast.success('Linket er kopieret til udklipsholderen.');
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
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 mb-2">
                                    <Building2 size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Velkommen til Bison Frame</h2>
                                    <p className="text-slate-600">
                                        Din portal for <strong>{profile?.company_name || 'virksomheden'}</strong> er klar. Gennemfør denne korte opsætning for at gøre din beregner klar til kunderne.
                                    </p>
                                </div>

                                <div className="w-full mt-2 pt-4 border-t border-slate-100">
                                    <label className="flex items-start gap-3 cursor-pointer group p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input 
                                                type="checkbox" 
                                                className="peer sr-only"
                                                checked={accepted}
                                                onChange={(e) => setAccepted(e.target.checked)}
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-300 rounded transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600 flex items-center justify-center">
                                                {accepted && <Check size={14} className="text-white" />}
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-600">
                                            Jeg bekræfter at have læst og accepteret de officielle <a href="/Bison_Frame_Vilkaar.html" target="_blank" className="text-blue-600 hover:underline">Vilkår & Betingelser</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" className="text-blue-600 hover:underline">Databehandleraftalen</a>.
                                        </span>
                                    </label>
                                </div>

                                <button 
                                    disabled={!accepted}
                                    onClick={() => setStep(2)}
                                    className={`w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 mt-2
                                        ${accepted ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                >
                                    Bekræft og fortsæt <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                                    <ImageIcon size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Virksomhedsprofil</h2>
                                    <p className="text-slate-600 text-sm">
                                        Kunder foretrækker håndværkere med en tydelig identitet. Tilføj logo og profilbillede for at øge tilliden i dine overslag.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 w-full">
                                    {/* Firmalogo */}
                                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50">
                                        <p className="text-sm font-medium text-slate-700 mb-3">Firmalogo</p>
                                        {logoUrl ? (
                                            <div className="relative mb-3">
                                                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3">
                                                <Building2 size={24} className="text-slate-300" />
                                            </div>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            ref={logoInputRef}
                                            onChange={(e) => handleImageUpload(e, 'logo')}
                                        />
                                        <button 
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={uploadingImage === 'logo'}
                                            className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            {uploadingImage === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Upload fil
                                        </button>
                                    </div>

                                    {/* Profilbillede */}
                                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50">
                                        <p className="text-sm font-medium text-slate-700 mb-3">Profilbillede (Mester)</p>
                                        {ownerImageUrl ? (
                                            <div className="relative mb-3">
                                                <img src={ownerImageUrl} alt="Profil" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-3">
                                                <ImageIcon size={24} className="text-slate-300" />
                                            </div>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            ref={ownerInputRef}
                                            onChange={(e) => handleImageUpload(e, 'owner')}
                                        />
                                        <button 
                                            onClick={() => ownerInputRef.current?.click()}
                                            disabled={uploadingImage === 'owner'}
                                            className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            {uploadingImage === 'owner' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Upload fil
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-4 w-full">
                                    <button 
                                        onClick={() => setStep(3)}
                                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
                                    >
                                        Gem og fortsæt <ChevronRight size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setStep(3)}
                                        className="w-full py-2.5 bg-transparent hover:bg-slate-50 text-slate-500 font-medium rounded-lg transition-colors text-sm"
                                    >
                                        Spring over foreløbig
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
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                                    <Coins size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Din timepris</h2>
                                    <p className="text-slate-600 text-sm px-4">
                                        Indtast din basis-timepris. Alle materialepriser tager udgangspunkt i markedets standardpriser, som du altid kan justere senere under dine indstillinger.
                                    </p>
                                </div>

                                <div className="w-full max-w-xs mx-auto mt-4">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(e.target.value)}
                                            className="w-full text-center text-3xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl py-4 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">kr.</div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setStep(4)}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
                                >
                                    Bekræft timepris <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6 text-center"
                            >
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-2">
                                    <Check size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Klar til brug</h2>
                                    <p className="text-slate-600 text-sm">
                                        Dit personlige link er nu aktivt. Kopiér det herunder og start med at modtage opgaver.
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3">
                                    <span className="font-mono text-sm font-medium text-slate-700 break-all select-all">
                                        bisonframe.dk/{profile?.slug || 't'}
                                    </span>
                                    <button 
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors text-slate-700 w-full md:w-auto justify-center"
                                    >
                                        <Copy size={16} /> Kopiér Link
                                    </button>
                                </div>

                                <div className="text-left mt-2 space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Anbefalet brug</h3>
                                    <div className="flex items-start gap-3">
                                        <MessageSquare size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600">
                                            <strong className="text-slate-900 block">Direkte kundekontakt</strong>
                                            Send linket på SMS inden besigtigelse. Lad kunden indtaste opgaven selv og undgå unødig kørsel.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Globe size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600">
                                            <strong className="text-slate-900 block">Digital tilstedeværelse</strong>
                                            Indsæt linket på din hjemmeside eller Facebook, så kunder kan indhente priser døgnet rundt.
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left mt-4 border-t border-slate-100 pt-4">
                                    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <Phone size={18} className="text-slate-700 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Er du i tvivl, mangler en funktion eller har forslag til forbedringer? Ring direkte til mig alle ugens dage på <a href="tel:40265002" className="text-blue-600 font-medium hover:underline">40 26 50 02</a>.<br/>
                                            <span className="text-slate-500 mt-1 block">— Mads Brunsbjerg Christensen, Ejer & Udvikler</span>
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    disabled={isSaving}
                                    onClick={saveAndComplete}
                                    className={`w-full py-4 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 mt-2
                                        ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'}`}
                                >
                                    {isSaving ? 'Gennemfører opsætning...' : 'Gå til dit kontrolpanel'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Progress Indicators - Pille-formede (Old design) */}
                <div className="bg-slate-50/50 p-4 flex justify-center gap-2 border-t border-slate-100">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 4 ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default OnboardingModal;
