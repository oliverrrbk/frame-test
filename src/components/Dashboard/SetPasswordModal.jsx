import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const SetPasswordModal = ({ profile, onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Adgangskoden skal være på mindst 6 tegn.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Adgangskoderne stemmer ikke overens.');
            return;
        }

        setIsSaving(true);

        try {
            // 1. Opdater adgangskoden i Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });

            if (authError) throw authError;

            // 2. Opdater carpenters tabellen
            const { error: dbError } = await supabase
                .from('carpenters')
                .update({ requires_password_change: false })
                .eq('id', profile.id);

            if (dbError) throw dbError;

            onComplete();
        } catch (err) {
            console.error("Fejl ved skift af adgangskode:", err);
            setError(err.message || 'Der opstod en fejl. Prøv igen.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel w-full max-w-md relative"
            >
                <div className="p-8 relative z-10">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Din sikkerhed</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            Af sikkerhedsmæssige årsager skal du vælge din egen personlige adgangskode, før du kan fortsætte til systemet.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Ny adgangskode
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Bekræft adgangskode
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Gentag adgangskode"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isSaving || !password || !confirmPassword}
                            className={`w-full py-3.5 mt-2 font-semibold rounded-xl transition-all flex justify-center items-center gap-2
                                ${password && confirmPassword ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                        >
                            {isSaving ? 'Gemmer...' : 'Gem og fortsæt'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default SetPasswordModal;
