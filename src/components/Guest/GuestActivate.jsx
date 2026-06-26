import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Lock, CheckCircle2, ShieldCheck, ArrowRight, Share, PlusSquare, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');

// Gæste-aktivering: åbnes via det personlige link i invitations-mailen.
// Recovery-linket sætter en session; her vælger gæsten sin egen adgangskode
// og godkender vilkår + databehandleraftale, før han slippes ind i appen.
export default function GuestActivate() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('form');   // 'form' | 'app'

    useEffect(() => {
        // Recovery-linket logger brugeren ind (evt. via hash). Vent kort på sessionen.
        let done = false;
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) { setHasSession(true); setChecking(false); done = true; }
        };
        check();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session && !done) { setHasSession(true); setChecking(false); done = true; }
        });
        const t = setTimeout(() => { if (!done) setChecking(false); }, 2500);
        return () => { subscription.unsubscribe(); clearTimeout(t); };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) return setError('Adgangskoden skal være mindst 6 tegn.');
        if (password !== confirm) return setError('Adgangskoderne stemmer ikke overens.');
        if (!accepted) return setError('Du skal godkende vilkårene for at fortsætte.');

        setSaving(true);
        try {
            const { data: { user }, error: updErr } = await supabase.auth.updateUser({ password });
            if (updErr) throw updErr;

            // Husk samtykket på profilen (juridisk spor).
            if (user?.id) {
                const { data: prof } = await supabase.from('carpenters').select('raw_data').eq('id', user.id).single();
                const newRaw = { ...(prof?.raw_data || {}), accepted_terms_at: new Date().toISOString() };
                await supabase.from('carpenters').update({ raw_data: newRaw }).eq('id', user.id);
            }

            toast.success('Velkommen! Din adgang er klar.');
            setStep('app');   // anbefal app-download før vi slipper dem ind
        } catch (err) {
            console.error(err);
            setError(err.message || 'Noget gik galt. Prøv igen.');
        } finally {
            setSaving(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%' }} />
            </div>
        );
    }

    if (!hasSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 md:p-12 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Linket er udløbet</h2>
                    <p className="text-slate-500 mb-6">Bed mesteren om at sende en ny invitation, så kan du komme i gang.</p>
                    <button onClick={() => navigate('/login')} className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors">Gå til login</button>
                </div>
            </div>
        );
    }

    // Sidste trin: anbefal at lægge appen på hjemmeskærmen (bedst til notifikationer, især iOS).
    if (step === 'app') {
        return (
            <div className="bg-slate-50 min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="w-full max-w-[480px] relative z-10">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="p-7 md:p-10">
                            <div className="flex flex-col items-center mb-7 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-emerald-100">
                                    <Smartphone className="text-emerald-600" size={30} />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">Få Bison Frame på mobilen</h2>
                                <p className="text-slate-500 text-sm max-w-xs">Læg appen på din hjemmeskærm, så du får besked med det samme, når der sker noget på dine sager.</p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-6">
                                {isIOS ? (
                                    <ol className="flex flex-col gap-4 text-sm text-slate-700">
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</span> Tryk på <Share size={16} className="inline text-blue-600" /> <strong>Del</strong> nederst i Safari</li>
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">2</span> Vælg <PlusSquare size={16} className="inline text-blue-600" /> <strong>Føj til hjemmeskærm</strong></li>
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">3</span> Åbn Bison Frame fra hjemmeskærmen</li>
                                    </ol>
                                ) : (
                                    <ol className="flex flex-col gap-4 text-sm text-slate-700">
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</span> Tryk på menuen <strong>⋮</strong> i browseren</li>
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">2</span> Vælg <strong>Installér app</strong> / <strong>Føj til startskærm</strong></li>
                                        <li className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">3</span> Åbn Bison Frame fra din skærm</li>
                                    </ol>
                                )}
                            </div>

                            <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-900 text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg group">
                                Fortsæt til Bison Frame <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                    <p className="text-center mt-7 text-sm font-medium text-slate-400">Du kan altid gøre det senere — men det tager kun 10 sekunder.</p>
                </div>
            </div>
        );
    }

    const inputCls = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]";

    return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="w-full max-w-[480px] relative z-10">
                <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-7 md:p-10">
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-blue-100">
                                <ShieldCheck className="text-blue-600" size={30} />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">Vælg din adgangskode</h2>
                            <p className="text-slate-500 text-sm max-w-xs">Sidste skridt — så har du adgang til projektet og kan registrere dine timer.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100 text-center">{error}</div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Adgangskode</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="password" placeholder="Min. 6 tegn" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required className={inputCls} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Gentag kode</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="password" placeholder="Gentag" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required className={inputCls} />
                                </div>
                            </div>

                            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors">
                                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                    <input type="checkbox" className="peer sr-only" checked={accepted} onChange={() => setAccepted(!accepted)} />
                                    <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                                        <CheckCircle2 size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <p className="text-[11px] sm:text-xs leading-relaxed text-slate-500 font-medium">
                                    Jeg accepterer <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">handelsbetingelserne</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Databehandleraftalen (DPA)</a>, og at Bison Frame optræder som databehandler.
                                </p>
                            </label>

                            <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 mt-1 hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70 group">
                                {saving ? 'Aktiverer…' : (<>Kom i gang <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>)}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="text-center mt-7 text-sm font-medium text-slate-400">Gratis adgang · Data lagres krypteret i EU.</p>
            </div>
        </div>
    );
}
