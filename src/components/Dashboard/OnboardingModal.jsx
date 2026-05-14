import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Building2, Image as ImageIcon, Briefcase, Link as LinkIcon, Check, Upload, Copy, ChevronRight, Loader2 } from 'lucide-react';
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
    const [materialMarkup, setMaterialMarkup] = useState(profile?.material_markup || 15);
    
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
            hourly_rate: Number(hourlyRate),
            material_markup: Number(materialMarkup)
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative overflow-hidden border border-slate-200"
            >
                <div className="p-8 md:p-10 relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6"
                            >
                                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 mb-2">
                                    <Building2 size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">Velkommen til Bison Frame</h2>
                                    <p className="text-slate-600 leading-relaxed">
                                        Din portal for <strong>{profile?.company_name || 'virksomheden'}</strong> er nu oprettet. 
                                        For at sikre et professionelt og troværdigt udtryk over for dine fremtidige kunder, beder vi dig gennemføre denne korte opsætning af din profil.
                                    </p>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <label className="flex items-start gap-3 cursor-pointer group p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
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
                                            Jeg bekræfter at have læst og accepteret de officielle <a href="/Bison_Frame_Vilkaar.html" target="_blank" className="text-blue-600 hover:underline">Vilkår & Betingelser</a> samt Databehandleraftalen.
                                        </span>
                                    </label>
                                </div>

                                <button 
                                    disabled={!accepted}
                                    onClick={() => setStep(2)}
                                    className={`w-full py-3.5 font-medium rounded-lg transition-all flex justify-center items-center gap-2 mt-2
                                        ${accepted ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
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
                                className="flex flex-col space-y-6"
                            >
                                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 mb-2">
                                    <ImageIcon size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">Virksomhedsprofil</h2>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        Kunden forventer et professionelt udtryk. Tilføj dit firmalogo og et vellignende profilbillede. Disse elementer fremgår direkte af kundens overslag og øger konverteringsraten markant.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    {/* Firmalogo */}
                                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center bg-slate-50">
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
                                            className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            {uploadingImage === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Upload fil
                                        </button>
                                    </div>

                                    {/* Profilbillede */}
                                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center bg-slate-50">
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
                                            className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            {uploadingImage === 'owner' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Upload fil
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-4 pt-2">
                                    <button 
                                        onClick={() => setStep(3)}
                                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
                                    >
                                        Gem og fortsæt <ChevronRight size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setStep(3)}
                                        className="w-full py-2.5 bg-transparent hover:bg-slate-50 text-slate-500 font-medium rounded-lg transition-colors text-sm"
                                    >
                                        Spring over foreløbig (kan tilføjes senere via Indstillinger)
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
                                className="flex flex-col space-y-6"
                            >
                                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 mb-2">
                                    <Briefcase size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">Standardpriser & Avance</h2>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        Systemet forudsætter dine basissatser for at kunne generere retvisende og profitable overslag. Du kan til enhver tid finjustere de specifikke materialepriser i dit kontrolpanel.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                    <div className="flex flex-col">
                                        <label className="text-sm font-medium text-slate-700 mb-2">Timepris (Ekskl. moms)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={hourlyRate}
                                                onChange={(e) => setHourlyRate(e.target.value)}
                                                className="w-full text-lg font-medium text-slate-800 bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">kr.</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-sm font-medium text-slate-700 mb-2">Standard Materialeavance</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={materialMarkup}
                                                onChange={(e) => setMaterialMarkup(e.target.value)}
                                                className="w-full text-lg font-medium text-slate-800 bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setStep(4)}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
                                >
                                    Bekræft prissætning <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col space-y-6"
                            >
                                <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-2">
                                    <Check size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">Opsætning fuldført</h2>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        Dit personlige system-link er nu aktivt. Dette udgør fundamentet for din fremtidige lead-generering.
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <span className="font-mono text-sm font-medium text-slate-700 break-all select-all">
                                        bisonframe.dk/{profile?.slug || 't'}
                                    </span>
                                    <button 
                                        onClick={handleCopyLink}
                                        className="whitespace-nowrap px-4 py-2 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors text-slate-700 w-full md:w-auto justify-center"
                                    >
                                        <Copy size={16} /> Kopiér Link
                                    </button>
                                </div>

                                <div className="mt-6">
                                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Anbefalet anvendelse af linket</h3>
                                    
                                    <div className="space-y-5">
                                        <div className="flex gap-4">
                                            <div className="w-6 flex-shrink-0 mt-0.5 text-slate-400">01.</div>
                                            <div>
                                                <h4 className="font-medium text-slate-900 text-sm mb-1">Direkte kundekontakt (SMS / E-mail)</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Når en potentiel kunde foretager en indledende henvendelse per telefon, anbefales det at fremsende linket via SMS forud for en besigtigelse: <br/><br/>
                                                    <em className="text-slate-500 block border-l-2 border-slate-200 pl-3">"Tak for henvendelsen. Du bedes indtaste projektets detaljer via dette link for at modtage et vejledende overslag. Herefter tager vi en dialog om det videre forløb."</em>
                                                    <br/>Dette eliminerer tidsspilde på ufremkaldte kundeemner.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-6 flex-shrink-0 mt-0.5 text-slate-400">02.</div>
                                            <div>
                                                <h4 className="font-medium text-slate-900 text-sm mb-1">Digital Tilstedeværelse (Hjemmeside & SoMe)</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Integrér linket på virksomhedens hjemmeside (eksempelvis bag en knap mærket "Indhent overslag") samt i virksomhedens Facebook-opslag. Dette automatiserer din tilbudsproces og indfanger kunder uden for normal arbejdstid.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    disabled={isSaving}
                                    onClick={saveAndComplete}
                                    className={`w-full py-4 font-medium rounded-lg transition-all flex justify-center items-center gap-2 mt-6
                                        ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
                                >
                                    {isSaving ? 'Gennemfører opsætning...' : 'Gå til dit kontrolpanel'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Minimalistisk Progress Bar i bunden */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default OnboardingModal;
