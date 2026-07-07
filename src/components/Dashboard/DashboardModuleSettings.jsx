import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { MODULES, getPlanFeatures, getFeatures } from '../../utils/features';
import {
    LayoutGrid, Lock, FileText, Users, Briefcase, Calendar, MessageSquare,
    Clock, Wallet, MapPin, PenTool, Package, Calculator, Link as LinkIcon, HardHat,
    Send, Sparkles, Bug,
} from 'lucide-react';

/**
 * DashboardModuleSettings — selvbetjent "Tilpas dashboard" under Konto Indstillinger.
 *
 * Læser/skriver den SAMME blocklist som admin-onboarding (carpenters.raw_data
 * .modules.disabled) og genbruger det eksisterende getModules/isTabEnabled-lag.
 * Rent visnings-lag: at slå et modul fra skjuler kun menupunktet — data gemmes
 * uændret bagved, og alt er der straks igen når man tænder det. Kerne-moduler
 * (tilbud + sager) kan ikke slås fra, så Frame aldrig bliver ubrugeligt.
 */

// Kerne — kan ALDRIG slås fra (ellers er systemet ubrugeligt).
const CORE = new Set(['quotes', 'cases']);
// Kræver en ekstra bekræftelse før man slår fra (påvirker afregning).
const WARN_OFF = { finance: 'Slår du fakturering fra, kan du ikke fakturere sager i Frame. Alle data bevares, og du kan tænde det igen når som helst. Vil du fortsætte?' };

// Ikon + accent pr. modul (matcher resten af systemet).
const META = {
    customers:    { icon: Users,        accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
    quotes:       { icon: FileText,     accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
    cases:        { icon: Briefcase,    accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
    calendar:     { icon: Calendar,     accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
    chat:         { icon: MessageSquare, accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
    timesheet:    { icon: Clock,        accent: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' },
    finance:      { icon: Wallet,       accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
    map:          { icon: MapPin,       accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
    drawings:     { icon: PenTool,      accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
    materials:    { icon: Package,      accent: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' },
    pricing:      { icon: Calculator,   accent: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' },
    integrations: { icon: LinkIcon,     accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
    team:         { icon: HardHat,      accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
};

export default function DashboardModuleSettings({ carpenterProfile, setCarpenterProfile }) {
    const [saving, setSaving] = useState(false);
    const [fbType, setFbType] = useState('feature');
    const [fbText, setFbText] = useState('');
    const [sending, setSending] = useState(false);
    if (!carpenterProfile) return null;

    const planFeatures = getPlanFeatures(carpenterProfile);
    const tradeFeatures = getFeatures(carpenterProfile.business_type);
    const disabled = Array.isArray(carpenterProfile?.raw_data?.modules?.disabled)
        ? carpenterProfile.raw_data.modules.disabled
        : [];

    // Afgør pr. modul: er det relevant for firmaet, og hvorfor evt. låst?
    const rows = MODULES.map((m) => {
        let available = true;
        let lockReason = null;
        if (m.key === 'timesheet' && !planFeatures.timeTracking) { available = false; lockReason = 'Kræver Hold'; }
        if ((m.key === 'materials' || m.key === 'pricing') && !tradeFeatures.calculator) return null; // ikke relevant for faget
        const core = CORE.has(m.key);
        const on = available && !disabled.includes(m.key);
        return { ...m, ...(META[m.key] || {}), core, available, lockReason, on };
    }).filter(Boolean);

    const persist = async (nextDisabled) => {
        const prev = carpenterProfile;
        const newRaw = {
            ...(carpenterProfile.raw_data || {}),
            modules: { ...(carpenterProfile.raw_data?.modules || {}), disabled: nextDisabled },
        };
        setSaving(true);
        setCarpenterProfile((p) => (p ? { ...p, raw_data: newRaw } : p)); // optimistisk
        const { error } = await supabase.from('carpenters').update({ raw_data: newRaw }).eq('id', carpenterProfile.id);
        setSaving(false);
        if (error) {
            setCarpenterProfile(prev); // rul tilbage
            toast.error('Kunne ikke gemme ændringen: ' + error.message);
        } else {
            toast.success('Dit dashboard er opdateret.');
        }
    };

    const toggle = (row) => {
        if (row.core || !row.available || saving) return;
        if (row.on && WARN_OFF[row.key]) {
            if (!window.confirm(WARN_OFF[row.key])) return;
        }
        const next = row.on ? [...disabled, row.key] : disabled.filter((k) => k !== row.key);
        persist(next);
    };

    const sendFeedback = async () => {
        const message = fbText.trim();
        if (!message || sending) return;
        setSending(true);
        const entry = { type: fbType, message, at: new Date().toISOString() };
        const existing = Array.isArray(carpenterProfile.raw_data?.feedback) ? carpenterProfile.raw_data.feedback : [];
        const newRaw = { ...(carpenterProfile.raw_data || {}), feedback: [...existing, entry] };
        const { error } = await supabase.from('carpenters').update({ raw_data: newRaw }).eq('id', carpenterProfile.id);
        setSending(false);
        if (error) {
            toast.error('Kunne ikke sende: ' + error.message);
        } else {
            setCarpenterProfile((p) => (p ? { ...p, raw_data: newRaw } : p));
            setFbText('');
            toast.success('Tak! Din feedback er sendt til Bison.');
        }
    };

    return (
        <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm p-6 md:p-8">
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                    <LayoutGrid size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Tilpas dashboard</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1 max-w-xl">
                        Det er din menu — vælg hvilke moduler der vises. At slå et modul fra skjuler kun menupunktet; alle data bevares, og du kan tænde det igen når som helst.
                    </p>
                </div>
            </div>

            {/* Moduler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                {rows.map((row) => {
                    const Icon = row.icon || LayoutGrid;
                    const interactive = !row.core && row.available;
                    return (
                        <motion.button
                            key={row.key}
                            type="button"
                            onClick={() => toggle(row)}
                            whileHover={interactive ? { y: -2 } : undefined}
                            whileTap={interactive ? { scale: 0.99 } : undefined}
                            aria-pressed={row.on}
                            disabled={!interactive}
                            className={`group w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 border text-left transition-all duration-300 ${
                                interactive ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600' : 'cursor-default'
                            } ${
                                row.on
                                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-60'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${interactive ? 'group-hover:scale-110' : ''} ${row.on ? row.accent : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                                <Icon size={19} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm ${row.on ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{row.label}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{row.description}</div>
                            </div>

                            {row.core ? (
                                <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 shrink-0">
                                    <Lock size={11} /> Kerne
                                </span>
                            ) : !row.available ? (
                                <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400 shrink-0">
                                    <Lock size={11} /> {row.lockReason}
                                </span>
                            ) : (
                                <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors duration-300 ${row.on ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${row.on ? 'left-[18px]' : 'left-0.5'}`}></span>
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 relative z-10 leading-relaxed">
                <strong className="text-slate-500 dark:text-slate-400">Kerne-moduler</strong> (tilbud + sager) er der altid, så systemet aldrig går i stykker. Timeregistrering & løn kræver et <strong className="text-slate-500 dark:text-slate-400">Hold-abonnement</strong>.
            </p>
        </div>

        {/* Feedback & funktionsønsker */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm p-6 md:p-8">
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-start gap-4 mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Feedback & ønsker</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1 max-w-xl">
                        Mangler du en funktion, eller er der noget der driller? Skriv til os — vi bygger Frame videre sammen med tømrere som dig.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mb-3 relative z-10">
                {[{ k: 'feature', label: 'Funktionsønske', icon: Sparkles }, { k: 'bug', label: 'Fejl / irritation', icon: Bug }].map((t) => (
                    <button
                        key={t.k}
                        type="button"
                        onClick={() => setFbType(t.k)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                            fbType === t.k
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            <textarea
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
                rows={4}
                placeholder={fbType === 'feature' ? 'Beskriv den funktion du ønsker dig…' : 'Beskriv hvad der driller eller ikke virker…'}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors resize-none relative z-10"
            />

            <div className="flex justify-end mt-3 relative z-10">
                <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={sendFeedback}
                    disabled={!fbText.trim() || sending}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-default"
                >
                    <Send size={15} /> {sending ? 'Sender…' : 'Send til Bison'}
                </motion.button>
            </div>
        </div>
        </div>
    );
}
