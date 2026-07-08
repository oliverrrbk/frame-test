import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Home, Users, FileText, Briefcase, Calendar, MessageSquare, Wallet, MapPin,
    PenTool, Link as LinkIcon, HardHat, Menu, Bell, Search, Plus, ChevronRight, ChevronDown,
    Phone, Mail, Clock, CheckCircle2, Send, Wrench, Eye, ArrowRight, Copy, Signal, Wifi,
    BatteryFull, Mic, Sparkles, TrendingUp, Inbox, Check, Download, Layers, Calculator,
    Package, Building2, Pencil, Trash2, Upload, Share2, AlertCircle, Folder, Megaphone,
} from 'lucide-react';
import { DenmarkLand } from './DenmarkMap';

/*
 * MOBIL-tro replikaer af hver modul-skærm — vist i en rigtig telefon-ramme,
 * med finger-tap + scroll-animationer i stedet for en muse-markør. 1:1 med den
 * rigtige app (samme layout, knapper og bund-tabbar), men med ANONYMISEREDE
 * data (Thomas Byg, Søren Andersen, Jensen Byg ApS …) og UDEN admin-bar.
 * Bruges under `lg` af SystemWheel + forsidens hero.
 */

const glass = 'bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800';

// Accent pr. modul (matcher hjulets ACCENTS + tab-header-ikonet).
const ACCENT = {
    overview: '#3b82f6', customers: '#f97316', leads: '#6366f1', cases: '#10b981',
    calendar: '#3b82f6', chat: '#f97316', finance: '#10b981', payroll: '#6366f1',
    map: '#10b981', drawings: '#3b82f6', integrations: '#3b82f6', team: '#f97316',
    materials: '#6366f1', pricing: '#10b981',
};

const META = {
    overview: { icon: Home, title: 'Oversigt' },
    customers: { icon: Users, title: 'Kunder' },
    leads: { icon: FileText, title: 'Tilbud & Forespørgsler' },
    cases: { icon: Briefcase, title: 'Sager' },
    calendar: { icon: Calendar, title: 'Kalender' },
    chat: { icon: MessageSquare, title: 'Beskeder' },
    finance: { icon: Wallet, title: 'Økonomi & Faktura' },
    payroll: { icon: FileText, title: 'Løn & Timer' },
    map: { icon: MapPin, title: 'Kortvisning' },
    drawings: { icon: PenTool, title: 'Skitser' },
    integrations: { icon: LinkIcon, title: 'Integrationer' },
    team: { icon: HardHat, title: 'Team' },
    materials: { icon: Package, title: 'Materialer' },
    pricing: { icon: Calculator, title: 'Prisberegner' },
};

// ── Auto-demo motor (samme som desktop) ────────────────────────────────────
function useSteps(durations) {
    const reduce = useReducedMotion();
    const [step, setStep] = useState(0);
    useEffect(() => {
        if (reduce) { setStep(durations.length - 1); return; }
        let i = 0, timer;
        const tick = () => { timer = setTimeout(() => { i = (i + 1) % durations.length; setStep(i); tick(); }, durations[i]); };
        setStep(0); tick();
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return step;
}

// ── Finger-tap indikator (erstatter muse-markøren på mobil) ─────────────────
function TapPulse({ x, y, on }) {
    return (
        <AnimatePresence>
            {on && (
                <motion.span
                    className="absolute z-[70] pointer-events-none"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <motion.span className="block w-9 h-9 rounded-full bg-slate-900/10 dark:bg-white/15 border border-slate-900/25 dark:border-white/30"
                        initial={{ scale: 0.5, opacity: 0.9 }} animate={{ scale: 1.7, opacity: 0 }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeOut' }} />
                    <span className="absolute left-1/2 top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 dark:bg-white/70" />
                </motion.span>
            )}
        </AnimatePresence>
    );
}

const CONTENT_H = 452; // px — det scrollbare skærm-område

// ── Telefon-ramme: bezel + statusbjælke + app-bar + tab-header + indhold ─────
function PhoneFrame({ id, children }) {
    const { icon: Icon, title } = META[id];
    const accent = ACCENT[id];
    return (
        <div className="mx-auto w-full max-w-[318px] select-none">
            <div className="relative rounded-[2.6rem] bg-slate-900 dark:bg-black p-2.5 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.5)]">
                <div className="relative rounded-[2.1rem] overflow-hidden bg-[#f4f7fb] dark:bg-slate-950"
                    style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.10) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(249,115,22,0.10) 0%, transparent 55%)' }}>
                    {/* statusbjælke */}
                    <div className="relative flex items-center justify-between px-6 pt-2.5 pb-1 text-[0.62rem] font-bold text-slate-700 dark:text-slate-300">
                        <span>9:41</span>
                        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-20 h-5 rounded-full bg-slate-900 dark:bg-black" />
                        <div className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></div>
                    </div>
                    {/* app-bar (ingen admin-bar — bare menu, logo og notifikation) */}
                    <div className="flex items-center gap-2 px-4 py-2.5">
                        <span className="w-8 h-8 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm"><Menu size={16} /></span>
                        <img src="/clean-transparent.png" alt="" className="w-6 h-6 object-contain" />
                        <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100 text-sm">Bison Frame</span>
                        <span className="ml-auto w-8 h-8 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm relative"><Bell size={15} /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></span>
                    </div>
                    {/* tab-header */}
                    <div className="px-4 pb-2">
                        <div className={`${glass} rounded-2xl px-3.5 py-3 flex items-center gap-3`}>
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1f`, color: accent }}><Icon size={18} /></span>
                            <div className="min-w-0">
                                <div className="font-extrabold text-[0.95rem] leading-tight text-slate-900 dark:text-slate-100 truncate">{title}</div>
                                <div className="text-[0.6rem] text-slate-400 leading-tight">Bison Frame · mobil</div>
                            </div>
                        </div>
                    </div>
                    {/* indhold */}
                    <div className="relative px-4 pb-3 overflow-hidden" style={{ height: CONTENT_H }}>
                        {children}
                    </div>
                    <div className="flex justify-center pb-2 pt-0.5"><span className="w-28 h-1 rounded-full bg-slate-900/25 dark:bg-white/30" /></div>
                </div>
            </div>
        </div>
    );
}

// Lille genbrugs-scroller.
function Scroller({ y, children }) {
    return (
        <motion.div animate={{ y }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} className="space-y-2.5">
            {children}
        </motion.div>
    );
}

// Genbrugelig bund-tabbar til sag-detaljen (som appen).
function CaseTabBar({ active }) {
    const tabs = [
        ['To-do', CheckCircle2], ['Mat.', Package], ['Proces', FileText], ['Timer', Clock],
        ['Bilag', Wallet], ['Aftaler', PenTool], ['Tegn.', Layers],
    ];
    return (
        <div className="absolute inset-x-0 bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 px-1.5 py-1.5 flex justify-between">
            {tabs.map(([label, Icon]) => {
                const on = label === active;
                return (
                    <span key={label} className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-lg ${on ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        <Icon size={14} />
                        <span className="text-[0.42rem] font-bold">{label}</span>
                    </span>
                );
            })}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 1) OVERSIGT
// ════════════════════════════════════════════════════════════════════════════
function OverviewMobile() {
    const step = useSteps([1400, 1200, 500, 2200, 1600]); // reveal, scroll, tap "Lav et tilbud", sheet, reset
    const kpis = [
        { label: 'Omsætning', value: '284.500', suffix: 'kr', color: '#10b981', icon: CheckCircle2 },
        { label: 'Aktive sager', value: '8', suffix: '', color: '#f59e0b', icon: Briefcase },
        { label: 'Tilbud sendt', value: '5', suffix: '', color: '#6366f1', icon: Send },
        { label: 'Forespørgsler', value: '18', suffix: '', color: '#3b82f6', icon: Inbox },
    ];
    const scrolled = step >= 1 && step < 3;
    const sheet = step === 3;
    const tapBtn = step === 2;
    return (
        <div className="relative h-full">
            <Scroller y={scrolled ? -90 : 0}>
                <div className="grid grid-cols-2 gap-2">
                    <motion.div animate={{ scale: tapBtn ? 0.95 : 1 }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[0.72rem] font-bold shadow-[0_8px_20px_rgba(37,99,235,0.32)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><FileText size={13} /> Lav et tilbud</motion.div>
                    <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-emerald-700 dark:text-emerald-300 text-[0.72rem] font-bold border border-emerald-300/70 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10"><LinkIcon size={13} /> Kopiér link</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {kpis.map((k, i) => (
                        <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                            className={`${glass} rounded-xl p-2.5`} style={{ borderTop: `3px solid ${k.color}` }}>
                            <span className="inline-flex p-1 rounded-md mb-1" style={{ background: `${k.color}22`, color: k.color }}><k.icon size={12} /></span>
                            <div className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-400 leading-tight mb-0.5">{k.label}</div>
                            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-none">{k.value}<span className="text-[0.55rem] text-slate-400 font-semibold ml-0.5">{k.suffix}</span></div>
                        </motion.div>
                    ))}
                </div>
                <div className={`${glass} rounded-xl p-2.5 flex items-center justify-between`} style={{ borderTop: '3px solid #14b8a6' }}>
                    <div className="flex items-center gap-2"><span className="inline-flex p-1 rounded-md" style={{ background: '#14b8a622', color: '#14b8a6' }}><TrendingUp size={12} /></span><span className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-400">Konvertering</span></div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">25<span className="text-[0.55rem] text-slate-400 font-semibold ml-0.5">%</span></div>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                    <div className="text-[0.72rem] font-bold text-slate-700 dark:text-slate-300">Sager i drift</div>
                    <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">Se alle <ArrowRight size={10} /></span>
                </div>
                <div className={`${glass} rounded-xl p-3`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div><div className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #306</div><div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">Bygning</div></div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,0.12)' }} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[0.66rem] text-slate-500 dark:text-slate-400 mb-1"><Briefcase size={11} className="text-slate-400" /> Søren Andersen</div>
                    <div className="flex items-center gap-1.5 text-[0.62rem] text-slate-400"><MapPin size={11} className="text-slate-400" /> Birkevej 12, 8210 Aarhus V</div>
                </div>
            </Scroller>

            {/* Del-FAB (som appen) */}
            <div className="absolute bottom-1 right-1 w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-[0_10px_24px_rgba(15,23,42,0.4)]"><Share2 size={17} /></div>
            <TapPulse x={26} y={7} on={tapBtn} />

            {/* Opret ny sag → Hurtigt tilbud */}
            <AnimatePresence>
                {sheet && (
                    <motion.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        className="absolute inset-x-0 bottom-0 top-4 rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4">
                        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
                        <div className="text-center mb-3"><div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Opret ny sag</div><div className="text-[0.6rem] text-slate-400">Vælg hvordan du vil oprette</div></div>
                        <div className="rounded-2xl border-2 border-orange-300 dark:border-orange-500/50 bg-white dark:bg-slate-950 p-3 text-center mb-2">
                            <span className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-1.5"><FileText size={18} /></span>
                            <div className="font-extrabold text-[0.8rem] text-slate-900 dark:text-slate-100">Hurtigt tilbud</div>
                            <div className="text-[0.58rem] text-slate-400 leading-snug mb-1.5">Materialepris + avance + send. Du styrer tallene.</div>
                            <div className="text-[0.62rem] font-bold text-orange-500 inline-flex items-center gap-1">Lav tilbud <ChevronRight size={11} /></div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-center">
                            <span className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-1.5"><Calculator size={18} /></span>
                            <div className="font-extrabold text-[0.8rem] text-slate-900 dark:text-slate-100">Prisberegner</div>
                            <div className="text-[0.58rem] text-slate-400 leading-snug">Standard-skabeloner med faste priser.</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 2) KUNDER
// ════════════════════════════════════════════════════════════════════════════
function CustomersMobile() {
    const step = useSteps([1300, 500, 2600, 1500]); // list, tap card, detail, reset
    const custs = [
        { init: 'SA', name: 'Søren Andersen', type: 'Privatkunde', av: 'bg-blue-100 text-blue-700', sager: 3, tilbud: 0, phone: '40 12 34 56', addr: 'Birkevej 12, Aarhus V', sum: '246.500 kr' },
        { init: 'AJ', name: 'Anne Jensen', type: 'Privatkunde', av: 'bg-emerald-100 text-emerald-700', sager: 2, tilbud: 1, phone: '48 58 59 55', addr: 'Herrupvej 8, Vinderup', sum: '84.000 kr' },
        { init: 'JB', name: 'Jensen Byg ApS', type: 'Erhvervskunde', av: 'bg-amber-100 text-amber-700', sager: 4, tilbud: 6, phone: '70 20 40 60', addr: 'Bragesvej 5, Ry', sum: '512.000 kr' },
    ];
    const tapCard = step === 1;
    const detail = step === 2;
    return (
        <div className="relative h-full">
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <span className="flex items-center justify-center gap-1 py-2 rounded-xl text-[0.58rem] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"><Plus size={11} /> Opret</span>
                <span className="flex items-center justify-center gap-1 py-2 rounded-xl text-[0.58rem] font-bold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><FileText size={11} /> Tilbud</span>
                <span className="flex items-center justify-center gap-1 py-2 rounded-xl text-[0.58rem] font-bold text-white" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}><Briefcase size={11} /> Sag</span>
            </div>
            <div className="relative mb-2.5">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <div className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[0.66rem] text-slate-400">Søg på navn, telefon, mail, adresse</div>
            </div>
            <div className="flex gap-1.5 mb-2.5">
                {[['Alle', 32, true], ['Private', 31, false], ['Erhverv', 1, false]].map(([t, n, a]) => (
                    <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.62rem] font-bold ${a ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-500/40' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>{t}<span className="opacity-70">{n}</span></span>
                ))}
            </div>
            <div className="space-y-2.5">
                {custs.map((c, i) => (
                    <motion.div key={c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: i === 0 && tapCard ? -3 : 0 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 22 }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 ${i === 0 && tapCard ? 'border-blue-300 dark:border-blue-500/50 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-2 ring-blue-400/50' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-2.5">
                            <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center font-extrabold text-sm shrink-0 ${c.av}`}>{c.init}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{c.name}</div>
                                <div className="text-[0.62rem] font-semibold text-slate-400">{c.type}</div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.6rem] text-slate-400 mt-2"><Phone size={10} /> {c.phone} <span className="mx-0.5">·</span> <MapPin size={10} /> {c.addr}</div>
                        <div className="flex gap-1.5 mt-2">
                            <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><Briefcase size={9} /> {c.sager} sager</span>
                            <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><FileText size={9} /> {c.tilbud} tilbud</span>
                            <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10"><Wallet size={9} /> {c.sum}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <TapPulse x={22} y={44} on={tapCard} />

            <AnimatePresence>
                {detail && (
                    <motion.div key="d" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.08) 0%, transparent 55%)' }}>
                        <div className="flex items-center justify-between p-2.5">
                            <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 rotate-180"><ChevronRight size={14} /></span>
                            <span className="font-bold text-[0.78rem] text-slate-900 dark:text-slate-100">Søren Andersen</span>
                            <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 text-[0.7rem]">✕</span>
                        </div>
                        <div className="px-3 pb-3 overflow-hidden">
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <span className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold">SA</span>
                                <div><div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Søren Andersen</div><span className="inline-flex items-center gap-1 mt-0.5 text-[0.55rem] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Privatkunde</span></div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2.5 text-[0.6rem] text-blue-600 dark:text-blue-400 font-semibold">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700"><Phone size={10} /> 40 12 34 56</span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700"><Mail size={10} /> soeren@mail.dk</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <span className="text-center py-2 rounded-xl text-white text-[0.62rem] font-bold" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>Lav tilbud til Søren</span>
                                <span className="text-center py-2 rounded-xl text-white text-[0.62rem] font-bold" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>Opret sag</span>
                            </div>
                            <div className="flex gap-1.5 mb-3">
                                {['Overblik', 'Sager (3)', 'Tilbud (0)'].map((t, i) => (
                                    <span key={t} className={`flex-1 text-center py-1.5 rounded-lg text-[0.58rem] font-bold ${i === 0 ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-400'}`}>{t}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`${glass} rounded-xl p-3`}><div className="text-[0.55rem] font-bold uppercase text-slate-400 mb-1">Sager</div><div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">3</div></div>
                                <div className={`${glass} rounded-xl p-3`}><div className="text-[0.55rem] font-bold uppercase text-slate-400 mb-1">Tilbud</div><div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">0</div></div>
                                <div className={`${glass} rounded-xl p-3`}><div className="text-[0.55rem] font-bold uppercase text-slate-400 mb-1">Aftalt værdi</div><div className="text-base font-extrabold text-slate-900 dark:text-slate-100">311.000 kr</div></div>
                                <div className={`${glass} rounded-xl p-3`}><div className="text-[0.55rem] font-bold uppercase text-slate-400 mb-1">Faktureret</div><div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">246.500 kr</div></div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 3) TILBUD & FORESPØRGSLER
// ════════════════════════════════════════════════════════════════════════════
function LeadsMobile() {
    const step = useSteps([1800, 2200, 2200]); // ny, sendt, bekræftet
    const folder = step === 0 ? 'ny' : step === 1 ? 'sendt' : 'bekraeftet';
    const meta = {
        ny: { label: 'Ny forespørgsel', n: 19, cls: 'text-blue-700 bg-blue-50 dark:bg-blue-500/15 ring-blue-300 dark:ring-blue-500/40' },
        sendt: { label: 'Sendt tilbud', n: 4, cls: 'text-amber-700 bg-amber-50 dark:bg-amber-500/15 ring-amber-300 dark:ring-amber-500/40' },
        bekraeftet: { label: 'Bekræftet opgave', n: 3, cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 ring-emerald-300 dark:ring-emerald-500/40' },
    }[folder];
    return (
        <div className="relative h-full">
            {/* mappe-dropdown + nyt tilbud (som appen) */}
            <div className={`flex items-center justify-between rounded-full px-3.5 py-2.5 mb-2.5 ring-1 ${meta.cls}`}>
                <span className="text-[0.68rem] font-bold flex items-center gap-1.5">{meta.label}<span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/70 dark:bg-slate-900/50 text-[0.55rem]">{meta.n}</span></span>
                <ChevronDown size={14} className="opacity-70" />
            </div>
            <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900 text-white text-[0.64rem] font-bold"><Plus size={12} /> Nyt tilbud</span>
                <div className="flex-1 relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><div className="pl-7 pr-2 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[0.6rem] text-slate-400">Søg…</div></div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={folder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-2.5">
                    {folder === 'ny' && (
                        <div className={`${glass} rounded-2xl p-3.5`}>
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Søren Andersen</div>
                            <div className="text-[0.58rem] text-slate-400 flex items-center gap-1 mt-0.5 mb-2"><Clock size={10} /> Modtaget: 5.7.2026 · 19.40</div>
                            <span className="inline-block px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 mb-2">Ny forespørgsel</span>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> Lofter</div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2.5 py-2 mb-2"><span className="text-[0.55rem] text-slate-400">Tilbudspris </span><span className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.8rem]">93.599 DKK</span><span className="text-[0.55rem] text-slate-400"> inkl. moms</span></div>
                            <div className="text-[0.6rem] text-slate-400 flex items-center gap-1 mb-2"><Calendar size={10} className="text-blue-500" /> <span className="text-blue-500 font-semibold">Kunden ønsker: Hurtigst muligt</span></div>
                            <div className="text-center py-2 rounded-lg bg-slate-900 text-white text-[0.62rem] font-bold">Se Opgavedetaljer</div>
                        </div>
                    )}
                    {folder === 'sendt' && (
                        <div className={`${glass} rounded-2xl p-3.5`}>
                            <div className="flex items-start justify-between mb-1"><div className="font-bold text-sm text-slate-900 dark:text-slate-100">Jensen Byg ApS</div><span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Sendt tilbud</span></div>
                            <div className="text-[0.58rem] text-slate-400 flex items-center gap-1 mb-2"><Clock size={10} /> Modtaget: 26.6.2026 · 14.41</div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> Tilbygning</div>
                            <div className="flex items-center justify-between">
                                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2.5 py-1.5"><span className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.8rem]">92.750 kr.</span></div>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.58rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Eye size={11} /> Åbnet</span>
                            </div>
                        </div>
                    )}
                    {folder === 'bekraeftet' && (
                        <div className={`${glass} rounded-2xl p-3.5`}>
                            <div className="flex items-start justify-between mb-1"><div className="font-bold text-sm text-slate-900 dark:text-slate-100">Søren Andersen</div><span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Bekræftet opgave</span></div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 my-2"><Wrench size={12} className="text-blue-500" /> Tag</div>
                            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 flex items-center gap-2 mb-3">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <div><div className="text-[0.55rem] font-bold text-emerald-600 dark:text-emerald-400">Accepteret tilbud</div><div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">215.000 kr. <span className="text-[0.55rem] font-medium">inkl. moms</span></div></div>
                            </div>
                            <div className="text-center py-2 rounded-lg border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[0.62rem] font-bold flex items-center justify-center gap-1 mb-2"><FileText size={12} /> Regnskabsprogram</div>
                            <div className="text-center py-2 rounded-lg bg-slate-900 text-white text-[0.62rem] font-bold">Se Opgavedetaljer</div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 4) SAGER
// ════════════════════════════════════════════════════════════════════════════
function CasesMobile() {
    const step = useSteps([1500, 500, 2800, 2800, 1400]); // list, tap, to-do, timer, reset
    const tapCard = step === 1;
    const detailOpen = step >= 2 && step <= 3;
    const tab = step === 3 ? 'Timer' : 'To-do';
    const cases = [
        { no: '306', title: 'Bygning', customer: 'Søren Andersen', addr: 'Birkevej 12, 8210 Aarhus V', date: '5.7.2026' },
        { no: '294', title: 'Tag', customer: 'Søren Andersen', addr: 'Birkevej 12, 8210 Aarhus V', date: '5.7.2026' },
        { no: '293', title: 'Bygning', customer: 'Anne Jensen', addr: 'Herrupvej 8, Vinderup', date: '5.7.2026' },
    ];
    return (
        <div className="relative h-full">
            <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[0.6rem] font-bold shrink-0"><Plus size={11} /> Opret sag</span>
                <span className="px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-[0.6rem] font-bold border border-slate-200 dark:border-slate-700">Mine (10)</span>
                <span className="px-2.5 py-1.5 rounded-full text-slate-400 text-[0.6rem] font-bold">Alle (10)</span>
            </div>
            <div className="text-[0.62rem] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Aktive sager (8)</div>
            <div className="space-y-2.5">
                {cases.map((c, i) => (
                    <motion.div key={c.no} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: i === 0 && tapCard ? 0.98 : 1 }} transition={{ delay: 0.05 * i }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 ${i === 0 && tapCard ? 'border-emerald-300 dark:border-emerald-500/50 ring-2 ring-emerald-400/50' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center justify-between mb-1"><span className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Aktiv Sag</span><span className="text-[0.55rem] text-slate-400 font-semibold">{c.date}</span></div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Sag {c.no} - {c.title}</div>
                        <div className="text-[0.6rem] text-slate-400 flex items-center gap-1 mt-0.5 mb-2">{c.customer} <span>·</span> <MapPin size={9} /> {c.addr}</div>
                        <div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '0%' }} /></div><span className="text-[0.55rem] font-bold text-slate-400">0% · 0 t</span></div>
                    </motion.div>
                ))}
            </div>
            <TapPulse x={22} y={30} on={tapCard} />

            <AnimatePresence>
                {detailOpen && (
                    <motion.div key="cd" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(16,185,129,0.08) 0%, transparent 55%)' }}>
                        {/* sag-header */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 m-2 px-3 py-2 shadow-sm">
                            <span className="text-blue-500 rotate-180"><ChevronRight size={16} /></span>
                            <div className="flex-1 text-center"><div className="font-extrabold text-[0.8rem] text-slate-900 dark:text-slate-100 leading-none">Sag 306</div><div className="text-[0.55rem] text-slate-400">Søren Andersen</div></div>
                            <span className="text-blue-500 font-bold tracking-widest text-[0.7rem]">···</span>
                        </div>
                        {/* stat-chips */}
                        <div className="grid grid-cols-4 gap-1.5 px-2 mb-2">
                            {[[Clock, '7.5 t', '#f59e0b'], [Package, 'Leveret', '#3b82f6'], [Users, '1 mand', '#8b5cf6'], [Package, '200k', '#10b981']].map(([Ic, v, col], i) => (
                                <div key={i} className="flex flex-col items-center gap-1"><span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${col}1f`, color: col }}><Ic size={15} /></span><span className="text-[0.5rem] font-bold text-slate-500 dark:text-slate-400">{v}</span></div>
                            ))}
                        </div>
                        {/* tab-indhold */}
                        <div className="px-2.5 overflow-hidden" style={{ height: 250 }}>
                            <AnimatePresence mode="wait">
                                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2">
                                    {tab === 'To-do' ? (<>
                                        <div className="text-center py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[0.62rem] font-bold flex items-center justify-center gap-1"><Pencil size={12} /> Redigér delopgaver & timer</div>
                                        <div className="text-center py-2 rounded-xl border border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 text-[0.62rem] font-bold flex items-center justify-center gap-1"><TrendingUp size={12} /> Sammenlign timer</div>
                                        {[['Opstart & forberedelse', '2 / 2'], ['Udførelse', 'Udført']].map(([t, badge]) => (
                                            <div key={t} className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-2.5 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={12} /></span>
                                                <span className="flex-1 font-bold text-[0.72rem] text-slate-800 dark:text-slate-200">{t}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[0.55rem] font-bold">{badge}</span>
                                            </div>
                                        ))}
                                    </>) : (<>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className={`${glass} rounded-xl p-2.5 text-center`}><span className="inline-flex mb-1 text-blue-500"><Users size={14} /></span><div className="text-[0.5rem] font-bold uppercase text-slate-400">Forbrug</div><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">7.5 t</div><div className="text-[0.5rem] text-fuchsia-500 font-semibold">Indlejet 7.5</div></div>
                                            <div className={`${glass} rounded-xl p-2.5 text-center`}><span className="inline-flex mb-1 text-emerald-500"><Clock size={14} /></span><div className="text-[0.5rem] font-bold uppercase text-slate-400">Dine timer</div><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">0,00 t</div></div>
                                        </div>
                                        <div className="text-center py-2.5 rounded-xl bg-slate-900 text-white text-[0.66rem] font-bold flex items-center justify-center gap-1"><Plus size={12} /> Tilføj timer</div>
                                        <div className="rounded-xl border border-fuchsia-100 dark:border-fuchsia-500/20 bg-fuchsia-50/50 dark:bg-fuchsia-500/5 p-2.5">
                                            <div className="text-[0.5rem] font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400 mb-1.5 flex items-center gap-1"><Building2 size={11} /> Underleverandør-forbrug</div>
                                            <div className="flex items-center justify-between"><div><div className="font-bold text-[0.72rem] text-slate-800 dark:text-slate-200">Hansen El</div><div className="text-[0.58rem] text-slate-400">7.50 t</div></div><span className="px-2 py-1.5 rounded-lg bg-fuchsia-600 text-white text-[0.55rem] font-bold flex items-center gap-1"><Wallet size={10} /> Afstem faktura</span></div>
                                        </div>
                                    </>)}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <CaseTabBar active={tab === 'Timer' ? 'Timer' : 'To-do'} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 5) KALENDER
// ════════════════════════════════════════════════════════════════════════════
function CalendarMobile() {
    const step = useSteps([1400, 600, 2200, 1600]); // vis, tap dag, agenda, reset
    const tapDay = step === 1;
    const active = 8;
    const days = Array.from({ length: 35 }, (_, i) => i - 1); // 1. juli = tirsdag
    const dotted = new Set([1, 2, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31]);
    return (
        <div className="relative h-full">
            <div className="flex items-center justify-between mb-2">
                <div className="font-extrabold text-slate-900 dark:text-slate-100">Juli 2026</div>
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5 p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        {[Calendar, Clock, Users].map((Ic, i) => <span key={i} className={`w-6 h-6 rounded-md flex items-center justify-center ${i === 0 ? 'bg-slate-900 text-white' : 'text-slate-400'}`}><Ic size={12} /></span>)}
                    </div>
                    <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400"><Plus size={14} /></span>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[0.5rem] font-bold text-slate-400">{['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-1 mb-3">
                {days.map((d, i) => {
                    const valid = d >= 1 && d <= 31;
                    const isActive = d === active;
                    return (
                        <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[0.6rem] font-bold relative ${!valid ? 'opacity-0' : isActive ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'}`}>
                            {valid && d}
                            {valid && dotted.has(d) && <span className={`w-1 h-1 rounded-full mt-0.5 ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />}
                        </div>
                    );
                })}
            </div>
            <TapPulse x={22} y={30} on={tapDay} />
            <AnimatePresence>
                {step >= 2 && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                        <div className="text-[0.8rem] font-extrabold text-slate-900 dark:text-slate-100">Onsdag 8. Jul.</div>
                        <div className="rounded-2xl border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-900 p-3">
                            <div className="flex items-center justify-between mb-1"><span className="text-[0.55rem] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Sag: 285</span><span className="text-[0.6rem] font-bold text-blue-600 dark:text-blue-400">Bekræftet opgave</span></div>
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Tag</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 6) BESKEDER
// ════════════════════════════════════════════════════════════════════════════
function ChatMobile() {
    const step = useSteps([1500, 600, 1600, 900, 1600, 1500]); // liste, tap, tråd, typing, ny besked, reset
    const openThread = step >= 2 && step < 5;
    const tapThread = step === 1;
    const typing = step === 3;
    const showNew = step >= 4 && step < 5;
    const threads = [
        { name: 'Sag Tag', last: 'Fælles sags-chat', icon: 'hard', av: 'bg-orange-100 text-orange-600' },
        { name: 'Kasper Holm', last: 'Jeg tager Birkevej i morgen', icon: 'init', init: 'KH', av: 'bg-amber-100 text-amber-700' },
        { name: 'Firma-fællestråd', last: 'Husk sikkerhedsmøde kl. 7', icon: 'mega', av: 'bg-blue-100 text-blue-600' },
    ];
    return (
        <div className="relative h-full">
            <div className="flex items-center justify-between mb-2">
                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Beskeder</div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[0.55rem] font-bold"><Sparkles size={10} /> Realtime</span>
            </div>
            <div className="relative mb-2.5"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><div className="pl-7 pr-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[0.62rem] text-slate-400">Søg i samtaler…</div></div>
            <div className="flex gap-1.5 mb-2.5">
                {['Alle', 'Direkte', 'Sager', 'Firma'].map((t, i) => <span key={t} className={`px-2.5 py-1 rounded-full text-[0.6rem] font-bold ${i === 0 ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>{t}</span>)}
            </div>
            <div className="space-y-2.5">
                {threads.map((t, i) => (
                    <motion.div key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 flex items-center gap-3 ${i === 0 && tapThread ? 'border-orange-300 dark:border-orange-500/50 ring-2 ring-orange-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[0.7rem] shrink-0 ${t.av}`}>{t.icon === 'hard' ? <HardHat size={17} /> : t.icon === 'mega' ? <Megaphone size={16} /> : t.init}</span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100 truncate">{t.name}</div><div className="text-[0.62rem] text-slate-400 truncate">{t.last}</div></div>
                    </motion.div>
                ))}
            </div>
            <TapPulse x={22} y={40} on={tapThread} />

            <AnimatePresence>
                {openThread && (
                    <motion.div key="th" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 flex flex-col">
                        <div className="flex items-center gap-2 p-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 rotate-180"><ChevronRight size={16} /></span>
                            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><HardHat size={15} /></span>
                            <div><div className="font-bold text-[0.75rem] text-slate-900 dark:text-slate-100 leading-none">Sag Tag</div><div className="text-[0.55rem] text-slate-400">Fælles sags-chat</div></div>
                        </div>
                        <div className="flex-1 p-3 space-y-2 overflow-hidden">
                            <div className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[0.68rem] text-slate-700 dark:text-slate-200 shadow-sm">Tagpap er brændt på ✅</div></div>
                            <div className="text-[0.5rem] text-slate-400 pl-2">Kasper · 14.02</div>
                            <div className="flex justify-end"><div className="max-w-[75%] rounded-2xl rounded-br-md bg-blue-500 text-white px-3 py-2 text-[0.68rem] shadow-sm">Super! Sender billeder til kunden 👍</div></div>
                            <AnimatePresence>
                                {typing && (
                                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                                        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2.5 flex gap-1">
                                            {[0, 1, 2].map(d => <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }} />)}
                                        </div>
                                    </motion.div>
                                )}
                                {showNew && (
                                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[0.68rem] text-slate-700 dark:text-slate-200 shadow-sm">Perfekt 👌 kunden er glad</div></motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="p-2.5 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-blue-500"><Plus size={18} /></span>
                            <div className="flex-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[0.66rem] text-slate-400">Aa</div>
                            <span className="text-slate-400"><Mic size={16} /></span>
                            <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0"><Send size={13} /></span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 7) ØKONOMI & FAKTURA
// ════════════════════════════════════════════════════════════════════════════
function FinanceMobile() {
    const step = useSteps([1500, 1200, 500, 1400, 2000]); // vis, scroll, tap, sender, sendt
    const scrolled = step >= 1 && step < 2;
    const tap = step === 2;
    const sending = step === 3;
    const sent = step >= 4;
    const stats = [
        { l: 'Samlet værdi', v: '967.154 kr.', c: '#3b82f6', icon: Wallet },
        { l: 'Faktureret', v: '818.083 kr.', c: '#10b981', icon: TrendingUp },
        { l: 'Mangler', v: '148.072 kr.', c: '#ef4444', icon: AlertCircle },
        { l: 'Bogført', v: '654.646 kr.', c: '#6366f1', icon: Package },
    ];
    return (
        <div className="relative h-full">
            <Scroller y={scrolled ? -70 : 0}>
                {stats.map((s) => (
                    <div key={s.l} className={`rounded-2xl p-3 ${s.l === 'Mangler' ? 'bg-rose-50/70 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20' : glass}`}>
                        <div className="flex items-center gap-2 mb-1"><span className="inline-flex p-1 rounded-md" style={{ background: `${s.c}22`, color: s.c }}><s.icon size={12} /></span><span className="text-[0.6rem] font-bold" style={{ color: s.l === 'Mangler' ? '#ef4444' : undefined }}>{s.l}</span></div>
                        <div className="text-lg font-extrabold" style={{ color: s.c }}>{s.v}</div>
                    </div>
                ))}
                <div className="text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 pt-0.5">Åbne sager med restbeløb</div>
                <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 ${tap ? 'border-emerald-300 dark:border-emerald-500/50 ring-2 ring-emerald-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-2"><div><div className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #294</div><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Tag · Søren Andersen</div></div><div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.85rem]">78.400 kr.</div></div>
                    <motion.div animate={{ scale: tap ? 0.96 : 1 }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-[0.66rem] font-bold shadow-[0_4px_14px_rgba(15,23,42,0.3)]" style={{ background: '#0f172a' }}>
                        {sending ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><Clock size={13} /></motion.span> Overfører…</> : sent ? <><CheckCircle2 size={13} /> Overført til e-conomic</> : <><Send size={13} /> Overfør som kladde til e-conomic</>}
                    </motion.div>
                </div>
            </Scroller>
            <TapPulse x={50} y={82} on={tap} />
            <AnimatePresence>
                {sent && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-1 inset-x-0 mx-auto w-fit inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-[0.62rem] font-bold shadow-xl">
                        <CheckCircle2 size={13} className="text-emerald-400" /> Faktura overført til dit regnskab
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 8) LØN & TIMER
// ════════════════════════════════════════════════════════════════════════════
function PayrollMobile() {
    const step = useSteps([1500, 500, 1400, 2000]); // vis, tap eksport, klargør, fil klar
    const tap = step === 1;
    const done = step >= 3;
    const working = step === 2;
    return (
        <div className="relative h-full">
            <div className="flex gap-2 mb-2.5">
                <div className="flex-1 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-[0.6rem] font-bold text-slate-600 dark:text-slate-300">Alle medarb. <ChevronDown size={12} className="text-slate-400" /></div>
                <div className="flex-1 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-[0.6rem] font-bold text-slate-600 dark:text-slate-300">Denne måned <ChevronDown size={12} className="text-slate-400" /></div>
            </div>
            <motion.div animate={{ scale: tap ? 0.97 : 1 }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-[0.7rem] font-bold mb-2">
                {working ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><Clock size={14} /></motion.span> Klargør lønfil…</> : done ? <><CheckCircle2 size={14} /> Løneksport klar</> : <><FileText size={14} /> Løneksport</>}
            </motion.div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
                {[['Opret tid', Plus], ['Stamdata', Users], ['Eksporter', Download]].map(([t, Ic], i) => (
                    <div key={t} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[0.58rem] font-bold ${i === 1 ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}><Ic size={14} /> {t}</div>
                ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 mb-2.5">
                <span className="text-[0.6rem] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> Auto-låst til 28. jun. 2026</span>
                <span className="text-[0.6rem] font-bold text-indigo-600 dark:text-indigo-400">Genåbn</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
                {[['Arbejdstimer', '15,00', Clock, '#3b82f6'], ['Kørte km', '0 km', TrendingUp, '#10b981'], ['Fravær', '0,00 t', AlertCircle, '#f59e0b'], ['Feriesaldo', '30 dage', Calendar, '#6366f1']].map(([l, v, Ic, c]) => (
                    <div key={l} className={`${glass} rounded-xl p-2.5`}><div className="flex items-center gap-1.5 mb-1"><span className="inline-flex p-1 rounded-md" style={{ background: `${c}1f`, color: c }}><Ic size={11} /></span><span className="text-[0.48rem] font-bold uppercase tracking-wide text-slate-400">{l}</span></div><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{v}</div></div>
                ))}
            </div>
            <div className={`${glass} rounded-xl p-3`}>
                <div className="flex items-center justify-between mb-1"><span className="font-bold text-[0.72rem] text-slate-900 dark:text-slate-100">02. jul.</span><span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[0.6rem] font-bold">7.5</span></div>
                <div className="text-[0.62rem] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1"><Briefcase size={11} /> 285 - Bygning</div>
                <div className="text-[0.6rem] text-slate-400 flex items-center gap-1 mt-1"><Clock size={10} /> 07:00 - 15:00 · Kasper Holm</div>
            </div>
            <TapPulse x={50} y={22} on={tap} />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 9) KORTVISNING
// ════════════════════════════════════════════════════════════════════════════
function MapMobile() {
    const step = useSteps([1600, 600, 2400, 1400]); // kort, tap pin, callout, reset
    const tap = step === 1;
    const active = step >= 2;
    return (
        <div className="relative h-full flex flex-col">
            <div className="flex flex-wrap gap-1.5 mb-2">
                {[['Nye forespørgsler', '#3b82f6'], ['Sendt tilbud', '#f59e0b'], ['Bekræftet', '#10b981'], ['Sæt i bero', '#f97316']].map(([t, c]) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.58rem] font-bold bg-white dark:bg-slate-900 border" style={{ borderColor: `${c}55`, color: c }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} /> {t}</span>
                ))}
            </div>
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800" style={{ background: 'linear-gradient(160deg,#d3ecfb,#a9d6f2)' }}>
                <svg viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
                    <DenmarkLand />
                    {/* bynavne */}
                    {[['Aalborg', 520, 150], ['Aarhus', 660, 445], ['Odense', 690, 660], ['København', 900, 470]].map(([n, x, y]) => (
                        <text key={n} x={x} y={y} fill="#475569" fontSize="26" fontWeight="600" opacity="0.65">{n}</text>
                    ))}
                    {/* enkelt-pins (teardrops) */}
                    <g transform="translate(500,215)"><path d="M0 0 C-16 -24 -16 -42 0 -42 C16 -42 16 -24 0 0 Z" fill="#10b981" stroke="#fff" strokeWidth="5" /><circle cx="0" cy="-28" r="7" fill="#fff" /></g>
                    <g transform="translate(860,548)"><path d="M0 0 C-16 -24 -16 -42 0 -42 C16 -42 16 -24 0 0 Z" fill="#6366f1" stroke="#fff" strokeWidth="5" /><circle cx="0" cy="-28" r="7" fill="#fff" /></g>
                    {/* klynge-pins med tal (som appen) */}
                    <g><circle cx="455" cy="475" r="50" fill="#f59e0b" stroke="#fff" strokeWidth="8" /><text x="455" y="475" textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="44" fontWeight="800">17</text></g>
                    <g><circle cx="600" cy="430" r="42" fill="#3b82f6" stroke="#fff" strokeWidth="8" /><text x="600" y="430" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="40" fontWeight="800">8</text></g>
                </svg>
                <TapPulse x={58} y={42} on={tap} />
                <AnimatePresence>
                    {active && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-x-3 bottom-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-3">
                            <div className="flex items-center justify-between gap-2 mb-1"><span className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #306</span><span className="px-2 py-0.5 rounded-full text-[0.52rem] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 shrink-0">Nye forespørgsler</span></div>
                            <div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Bygning</div>
                            <div className="text-[0.62rem] text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0"><MapPin size={11} className="text-slate-400 shrink-0" /> <span className="truncate">Birkevej 12, 8210 Aarhus V</span></div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[0.55rem] font-bold text-emerald-700 bg-white/85 rounded-md px-2 py-0.5">27 / 27 adresser vist</div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 10) SKITSER & TEGNINGER
// ════════════════════════════════════════════════════════════════════════════
function DrawingsMobile() {
    const step = useSteps([1500, 500, 2600, 1600]); // liste, tap opret, tegn, reset
    const tapNew = step === 1;
    const editor = step >= 2;
    const drawing = step >= 2;
    return (
        <div className="relative h-full">
            <motion.div animate={{ scale: tapNew ? 0.97 : 1 }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[0.72rem] font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] mb-3" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><Plus size={14} /> Opret Ny Skitse</motion.div>
            <div className="text-[0.66rem] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2"><Folder size={13} className="text-blue-500" /> Tilknyttede Sager</div>
            <div className="space-y-2.5">
                {[['259', '24. jun. 2026'], ['285', '2. jul. 2026']].map(([no, date]) => (
                    <div key={no} className={`${glass} rounded-2xl p-3 flex items-center gap-3`}>
                        <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center"><Folder size={18} /></span>
                        <div className="flex-1"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Sag: {no}</div><div className="text-[0.58rem] text-slate-400">Sidste tegning: {date}</div></div>
                        <span className="text-[0.55rem] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">1 tegning</span>
                    </div>
                ))}
            </div>
            <TapPulse x={50} y={7} on={tapNew} />
            <AnimatePresence>
                {editor && (
                    <motion.div key="ed" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl m-2 px-3 py-2 shadow-sm">
                            <span className="text-blue-500 rotate-180"><ChevronRight size={15} /></span>
                            <span className="flex-1 font-bold text-[0.75rem] text-slate-900 dark:text-slate-100">Ny Skitse <Pencil size={11} className="inline text-blue-400" /></span>
                            <span className="text-blue-500"><Upload size={15} /></span>
                            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Download size={13} /></span>
                        </div>
                        <div className="relative flex-1 mx-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(59,130,246,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(59,130,246,0.06) 0 1px, transparent 1px 22px)' }}>
                            <svg viewBox="0 0 200 220" className="absolute inset-0 w-full h-full p-4">
                                <motion.path d="M50 190 L45 90 L110 40 L165 95 L160 190 Z" fill="rgba(59,130,246,0.04)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: drawing ? 1 : 0 }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
                            </svg>
                            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 text-[0.55rem] font-bold text-white bg-slate-900 rounded-full px-2.5 py-1">Markør <span className="px-1.5 py-0.5 rounded-full bg-white/20">Snap</span></div>
                        </div>
                        <div className="flex items-center justify-around bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 mx-2 mb-2 rounded-b-2xl py-2 mt-2 rounded-2xl">
                            {[PenTool, Layers, Wrench, MapPin, Plus].map((Ic, i) => <span key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-blue-50 text-blue-500' : 'text-slate-400'}`}><Ic size={15} /></span>)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 11) INTEGRATIONER
// ════════════════════════════════════════════════════════════════════════════
function IntegrationsMobile() {
    const step = useSteps([1400, 600, 1400, 2200]); // vis, tap Dinero, fold+login, forbundet
    const tap = step === 1;
    const expanded = step === 2;
    const connected = step >= 3;
    return (
        <div className="relative h-full">
            <div className="text-[0.68rem] text-slate-500 dark:text-slate-400 mb-3 leading-snug">Forbind regnskab og driftssystemer med din Bison Frame konto.</div>
            <div className="space-y-2.5">
                {/* Dinero — foldbar, forbinder i demoen */}
                <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden ${tap ? 'border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="p-3 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><LinkIcon size={17} /></span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Dinero Regnskab</div><div className="text-[0.6rem] text-slate-400">Overfør tilbud som fakturakladder</div></div>
                        {connected && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.58rem] font-bold"><Check size={11} /> Forbundet</span>}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                    <AnimatePresence>
                        {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[0.6rem] text-slate-500 dark:text-slate-400 leading-snug my-2">Når du har bekræftet en opgave, kan du med ét klik overføre kunden og opgaven til dit Dinero regnskab som en fakturakladde.</p>
                                    <div className="text-center py-2 rounded-lg text-white text-[0.66rem] font-bold" style={{ background: '#0ea5e9' }}>Log ind med Dinero</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* e-conomic — det andet regnskab (ikke forbundet; man vælger ét) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><LinkIcon size={17} /></span>
                    <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">e-conomic</div><div className="text-[0.6rem] text-slate-400">Danmarks mest brugte regnskabsprogram</div></div>
                    <ChevronDown size={14} className="text-slate-300" />
                </div>
                {/* Egen e-mail */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><Mail size={17} /></span>
                    <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Egen E-mail (SMTP)</div><div className="text-[0.6rem] text-slate-400">Send tilbud via din egen e-mailadresse</div></div>
                    <ChevronDown size={14} className="text-slate-300" />
                </div>
            </div>
            <TapPulse x={50} y={20} on={tap} />
            <AnimatePresence>
                {connected && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-1 inset-x-0 mx-auto w-fit inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-[0.62rem] font-bold shadow-xl">
                        <CheckCircle2 size={13} className="text-emerald-400" /> Dinero er nu forbundet
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 12) TEAM & MEDARBEJDERE
// ════════════════════════════════════════════════════════════════════════════
function TeamMobile() {
    const step = useSteps([1400, 1400, 2400]); // medarbejdere, scroll, underleverandører
    const scrolled = step >= 1;
    return (
        <div className="relative h-full">
            <Scroller y={scrolled ? -150 : 0}>
                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-[0.72rem] font-bold"><Users size={14} /> Tilføj medarbejder</div>
                <div className={`${glass} rounded-2xl p-3`}>
                    <div className="flex items-center gap-1.5 mb-2.5"><span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500"><HardHat size={14} /></span><span className="font-bold text-[0.72rem] text-slate-900 dark:text-slate-100">Dine Medarbejdere (1)</span></div>
                    <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-[0.7rem] shrink-0">KH</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5"><span className="font-bold text-[0.78rem] text-slate-900 dark:text-slate-100">Kasper Holm</span><span className="text-[0.55rem] text-slate-400">Projektleder</span></div>
                            <div className="text-[0.58rem] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><Mail size={9} /> kasper@firma.dk</div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.52rem] font-bold shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktiv</span>
                    </div>
                </div>
                <div className={`${glass} rounded-2xl p-3`}>
                    <div className="flex items-center gap-1.5 mb-2.5"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}><Building2 size={13} /></span><span className="font-bold text-[0.72rem] text-slate-900 dark:text-slate-100">Underleverandører (2)</span></div>
                    <div className="text-center py-2 rounded-xl text-white text-[0.62rem] font-bold mb-2.5" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>+ Tilføj underleverandør</div>
                    <div className="space-y-2">
                        {[['Madsen Byg', 'Mads Madsen', '45 40 26 50'], ['Hansen El', 'Marius Hansen', '12 32 34 56']].map(([n, mester, phone]) => (
                            <div key={n} className="rounded-xl border border-violet-100 dark:border-violet-500/20 bg-violet-50/40 dark:bg-violet-500/5 p-2.5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center"><Building2 size={14} /></span>
                                        <div><div className="font-bold text-[0.72rem] text-slate-800 dark:text-slate-200">{n}</div><span className="inline-flex items-center gap-0.5 mt-0.5 text-[0.5rem] font-bold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 px-1.5 py-0.5 rounded-full"><Wrench size={8} /> Elektriker</span></div>
                                    </div>
                                    <div className="flex gap-1 text-slate-300 dark:text-slate-600"><Pencil size={11} /><Trash2 size={11} /></div>
                                </div>
                                <div className="flex items-center gap-2 text-[0.55rem] text-slate-500 mt-1.5 pt-1.5 border-t border-violet-100 dark:border-violet-500/20"><HardHat size={9} className="text-slate-400" /> {mester} <span className="text-slate-400">(mester)</span> <span>·</span> <Phone size={9} className="text-slate-400" /> {phone}</div>
                                <div className="text-center py-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[0.55rem] font-bold flex items-center justify-center gap-1 mt-1.5"><Send size={9} /> Send gæste-login</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Scroller>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 13) MATERIALER
// ════════════════════════════════════════════════════════════════════════════
function MaterialsMobile() {
    const step = useSteps([1400, 600, 2600, 1400]); // liste, tap Hegn, fold ud, reset
    const tap = step === 1;
    const open = step >= 2 && step < 3;
    const cats = ['Anneks', 'Badeværelse', 'Carport', 'Lofter', 'Døre'];
    return (
        <div className="relative h-full">
            <div className="text-[0.66rem] text-slate-500 dark:text-slate-400 mb-3 leading-snug">Standard indkøbspriser ekskl. moms, som danner grundlag for materialeberegningen.</div>
            <div className="space-y-2.5">
                {cats.map((c) => (
                    <div key={c} className={`${glass} rounded-2xl px-3 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500"><Package size={14} /></span><span className="font-bold text-[0.82rem] text-slate-900 dark:text-slate-100">{c}</span></div>
                        <span className="text-[0.6rem] font-bold text-blue-500 flex items-center gap-1">Fold ud <ChevronDown size={12} /></span>
                    </div>
                ))}
                {/* Hegn — foldes ud i demoen */}
                <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden ${tap ? 'border-indigo-300 dark:border-indigo-500/50 ring-2 ring-indigo-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="px-3 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500"><Package size={14} /></span><span className="font-bold text-[0.82rem] text-slate-900 dark:text-slate-100">Hegn</span></div>
                        <span className="text-[0.6rem] font-bold text-blue-500 flex items-center gap-1">{open ? 'Fold ind' : 'Fold ud'} <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></span>
                    </div>
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-3 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                                    {[['Klinkehegn (Træ)', '600'], ['Lamelhegn (Træ)', '450'], ['Raftehegn', '800'], ['Komposit', '1100']].map(([name, kr]) => (
                                        <div key={name} className="flex items-center justify-between">
                                            <span className="text-[0.68rem] font-semibold text-slate-700 dark:text-slate-300">{name}</span>
                                            <div className="flex items-center gap-2"><span className="text-[0.72rem] font-extrabold text-slate-900 dark:text-slate-100">{kr}<span className="text-[0.55rem] text-slate-400 font-medium"> kr.</span></span><span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[0.5rem] font-bold">TÆNDT</span></div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <TapPulse x={50} y={90} on={tap} />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 14) PRISBEREGNER
// ════════════════════════════════════════════════════════════════════════════
function PricingMobile() {
    const step = useSteps([1500, 1400, 2200]); // toggles, scroll, timepris
    const scrolled = step >= 1;
    return (
        <div className="relative h-full">
            <Scroller y={scrolled ? -140 : 0}>
                <div className={`${glass} rounded-2xl p-3`}>
                    <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500"><SlidersMini /></span><span className="font-bold text-[0.72rem] text-slate-900 dark:text-slate-100">Tilpas din beregner</span></div>
                    <div className="space-y-2">
                        {['Vinduer', 'Døre', 'Nyt Gulv', 'Træterrasse', 'Tagprojekt', 'Hegn'].map((t) => (
                            <div key={t} className="flex items-center justify-between rounded-xl bg-emerald-50/60 dark:bg-emerald-500/10 px-3 py-2">
                                <span className="text-[0.72rem] font-semibold text-slate-800 dark:text-slate-200">{t}</span>
                                <span className="w-9 h-5 rounded-full bg-emerald-500 relative"><span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow" /></span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`${glass} rounded-2xl p-3`}>
                    <div className="flex items-center gap-2 mb-2.5"><span className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500"><Users size={13} /></span><span className="font-bold text-[0.72rem] text-slate-900 dark:text-slate-100">Timepris & Avance</span></div>
                    <div className="space-y-2.5">
                        {[['Svendens timepris (ekskl. moms)', '500'], ['Materialeavance (1.15 = 15%)', '1,15'], ['Materiel/maskin-avance', '1,05'], ['Risiko/projekt-buffer', '1,25']].map(([l, v]) => (
                            <div key={l}>
                                <div className="text-[0.5rem] font-bold uppercase tracking-wide text-slate-400 mb-1">{l}</div>
                                <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"><span className="text-[0.8rem] font-extrabold text-slate-900 dark:text-slate-100">{v}</span><ChevronDown size={12} className="text-slate-400" /></div>
                            </div>
                        ))}
                    </div>
                </div>
            </Scroller>
        </div>
    );
}
// Lille slider-ikon (SlidersHorizontal findes ikke i import-sættet her).
function SlidersMini() {
    return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2" fill="currentColor" /><line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2" fill="currentColor" /></svg>;
}

// ── Loop-tider pr. modul (sum af step-varigheder + luft) ────────────────────
export const MOBILE_LOOP_MS = {
    overview: 6900, customers: 5900, leads: 6200, cases: 9000,
    calendar: 5800, chat: 7100, finance: 6600, payroll: 5400,
    map: 6000, drawings: 6200, integrations: 5600, team: 5200,
    materials: 6000, pricing: 5100,
};

const SCREENS = {
    overview: OverviewMobile, customers: CustomersMobile, leads: LeadsMobile, cases: CasesMobile,
    calendar: CalendarMobile, chat: ChatMobile, finance: FinanceMobile, payroll: PayrollMobile,
    map: MapMobile, drawings: DrawingsMobile, integrations: IntegrationsMobile, team: TeamMobile,
    materials: MaterialsMobile, pricing: PricingMobile,
};

export function MobilePreview({ id }) {
    const Screen = SCREENS[id] || OverviewMobile;
    return (
        <PhoneFrame id={id}>
            {/* key sikrer at demo-loopet nulstilles når man skifter modul */}
            <Screen key={id} />
        </PhoneFrame>
    );
}
