import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Home, Users, FileText, Briefcase, Calendar, MessageSquare, Wallet, MapPin,
    PenTool, Link as LinkIcon, HardHat, Menu, Bell, Search, Plus, ChevronRight,
    Phone, Clock, CheckCircle2, Send, Wrench, Eye, ArrowRight, Copy, Signal, Wifi,
    BatteryFull, Mic, Sparkles, TrendingUp, Inbox, Check, Download, Layers,
} from 'lucide-react';

/*
 * MOBIL-tro replikaer af hver modul-skærm — vist i en rigtig telefon-ramme,
 * med finger-tap + scroll-animationer i stedet for en muse-markør.
 * Samme glas-design og ANONYMISEREDE data som desktop-previews (Thomas, Søren
 * Andersen, Jensen Byg ApS …). Bruges under `lg` af SystemWheel.
 */

const glass = 'bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800';

// Accent pr. modul (matcher hjulets ACCENTS + tab-header-ikonet).
const ACCENT = {
    overview: '#3b82f6', customers: '#f97316', leads: '#6366f1', cases: '#10b981',
    calendar: '#3b82f6', chat: '#f97316', finance: '#10b981', payroll: '#6366f1',
    map: '#10b981', drawings: '#3b82f6', integrations: '#3b82f6', team: '#f97316',
};

const META = {
    overview: { icon: Home, title: 'Oversigt' },
    customers: { icon: Users, title: 'Kunder' },
    leads: { icon: FileText, title: 'Tilbud & Forespørgsler' },
    cases: { icon: Briefcase, title: 'Sager' },
    calendar: { icon: Calendar, title: 'Kalender' },
    chat: { icon: MessageSquare, title: 'Intern Chat' },
    finance: { icon: Wallet, title: 'Økonomi & Faktura' },
    payroll: { icon: FileText, title: 'Løn & Timer' },
    map: { icon: MapPin, title: 'Kortvisning' },
    drawings: { icon: PenTool, title: 'Skitser' },
    integrations: { icon: LinkIcon, title: 'Integrationer' },
    team: { icon: HardHat, title: 'Team' },
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

// ── Telefon-ramme: bezel + statusbjælke + app-bar + tab-header + indhold ─────
const CONTENT_H = 452; // px — det scrollbare skærm-område

function PhoneFrame({ id, children }) {
    const { icon: Icon, title } = META[id];
    const accent = ACCENT[id];
    return (
        <div className="mx-auto w-full max-w-[318px] select-none">
            <div className="relative rounded-[2.6rem] bg-slate-900 dark:bg-black p-2.5 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.5)]">
                {/* skærm */}
                <div className="relative rounded-[2.1rem] overflow-hidden bg-[#f4f7fb] dark:bg-slate-950"
                    style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.10) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(249,115,22,0.10) 0%, transparent 55%)' }}>
                    {/* statusbjælke */}
                    <div className="relative flex items-center justify-between px-6 pt-2.5 pb-1 text-[0.62rem] font-bold text-slate-700 dark:text-slate-300">
                        <span>9:41</span>
                        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-20 h-5 rounded-full bg-slate-900 dark:bg-black" />
                        <div className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></div>
                    </div>
                    {/* app-bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5">
                        <span className="w-8 h-8 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm"><Menu size={16} /></span>
                        <img src="/clean-transparent.png" alt="" className="w-6 h-6 object-contain" />
                        <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100 text-sm">Bison Frame</span>
                        <span className="ml-auto w-8 h-8 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm relative"><Bell size={15} /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></span>
                    </div>
                    {/* tab-header (som appens rigtige mobil-header) */}
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
                    {/* home-indikator */}
                    <div className="flex justify-center pb-2 pt-0.5"><span className="w-28 h-1 rounded-full bg-slate-900/25 dark:bg-white/30" /></div>
                </div>
            </div>
        </div>
    );
}

// Lille genbrugs-scroller: flytter indhold blødt op/ned for at "scrolle".
function Scroller({ y, children }) {
    return (
        <motion.div animate={{ y }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} className="space-y-2.5">
            {children}
        </motion.div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 1) OVERSIGT
// ════════════════════════════════════════════════════════════════════════════
function OverviewMobile() {
    const step = useSteps([1400, 1200, 500, 2200, 1600]); // reveal, scroll, tap FAB, sheet, reset
    const kpis = [
        { label: 'Omsætning', value: '284.500', suffix: 'kr', color: '#10b981', icon: CheckCircle2 },
        { label: 'Aktive sager', value: '5', suffix: '', color: '#f59e0b', icon: Briefcase },
        { label: 'Tilbud sendt', value: '4', suffix: '', color: '#6366f1', icon: Send },
        { label: 'Forespørgsler', value: '15', suffix: '', color: '#3b82f6', icon: Inbox },
    ];
    const cases = [
        { no: '142', title: 'Nyt tag', customer: 'Søren Andersen', pct: 65 },
        { no: '138', title: 'Tilbygning', customer: 'Jensen Byg ApS', pct: 30 },
    ];
    const scrolled = step >= 1 && step < 3;
    const sheet = step === 3;
    const fabTap = step === 2;
    return (
        <div className="relative h-full">
            <Scroller y={scrolled ? -96 : 0}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                    <LinkIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100 truncate">bisonframe.dk/thomasbyg</span>
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500 text-white text-[0.58rem] font-bold shrink-0"><Copy size={9} /> Kopiér</span>
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
                <div className="text-[0.7rem] font-bold text-slate-700 dark:text-slate-300 pt-0.5">Sager i drift</div>
                {cases.map((c, i) => (
                    <div key={c.no} className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div>
                                <div className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #{c.no}</div>
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{c.title}</div>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,0.12)' }} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.66rem] text-slate-500 dark:text-slate-400 mb-2"><Briefcase size={11} className="text-slate-400" /> {c.customer}</div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#34d399,#10b981)' }} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: 0.3, duration: 0.8 }} />
                        </div>
                    </div>
                ))}
            </Scroller>

            {/* FAB */}
            <motion.div animate={{ scale: fabTap ? 0.92 : 1 }} className="absolute bottom-1 right-1 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-white text-xs font-bold shadow-[0_10px_24px_rgba(37,99,235,0.4)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <FileText size={13} /> Lav et tilbud
            </motion.div>
            <TapPulse x={82} y={94} on={fabTap} />

            {/* Hurtigt tilbud-sheet */}
            <AnimatePresence>
                {sheet && (
                    <motion.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        className="absolute inset-x-0 bottom-0 top-6 rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4">
                        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
                        <div className="flex items-center gap-2 mb-3"><Sparkles size={15} className="text-blue-500" /><span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Hurtigt tilbud</span></div>
                        <div className="text-[0.66rem] text-slate-400 mb-3">Fortæl frit om kunden og opgaven — Frame udfylder felterne.</div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 mb-3">
                            <div className="text-[0.72rem] text-slate-700 dark:text-slate-300 leading-snug">"Søren Andersen skal have nyt tag på Birkevej 12, ca. 120 m²…"</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Mic size={16} /></span>
                            <span className="flex-1 text-center py-2.5 rounded-xl text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>Lav tilbud</span>
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
    const step = useSteps([1300, 500, 2400, 1500]); // list, tap card, detail, reset
    const custs = [
        { init: 'SA', name: 'Søren Andersen', type: 'Privatkunde', av: 'bg-amber-100 text-amber-700', sager: 2, tilbud: 3, phone: '40 12 34 56', addr: 'Birkevej 12, Aarhus V' },
        { init: 'JB', name: 'Jensen Byg ApS', type: 'Erhvervskunde', av: 'bg-emerald-100 text-emerald-700', sager: 4, tilbud: 6, phone: '70 20 40 60', addr: 'Bragesvej 5, Ry' },
        { init: 'MH', name: 'Mette Holm', type: 'Privatkunde', av: 'bg-indigo-100 text-indigo-700', sager: 3, tilbud: 2, phone: '31 44 77 90', addr: 'Skovvej 3, Skanderborg' },
    ];
    const tapCard = step === 1;
    const detail = step === 2;
    return (
        <div className="relative h-full">
            <div className="relative mb-2.5">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <div className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[0.68rem] text-slate-400">Søg navn, telefon, adresse…</div>
            </div>
            <div className="flex gap-1.5 mb-2.5">
                {[['Alle', 31, true], ['Private', 30, false], ['Erhverv', 1, false]].map(([t, n, a]) => (
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
                        <div className="flex gap-2 mt-2.5">
                            <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><Briefcase size={10} /> {c.sager} sager</span>
                            <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><FileText size={10} /> {c.tilbud} tilbud</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <TapPulse x={24} y={26} on={tapCard} />

            <AnimatePresence>
                {detail && (
                    <motion.div key="d" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        className="absolute inset-x-0 bottom-0 top-2 rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4">
                        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold">SA</span>
                            <div><div className="font-extrabold text-slate-900 dark:text-slate-100">Søren Andersen</div><div className="text-[0.62rem] text-slate-400 font-semibold">Privatkunde</div></div>
                        </div>
                        <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2 text-[0.72rem] text-slate-600 dark:text-slate-300"><Phone size={13} className="text-slate-400" /> 40 12 34 56</div>
                            <div className="flex items-center gap-2 text-[0.72rem] text-slate-600 dark:text-slate-300"><MapPin size={13} className="text-slate-400" /> Birkevej 12, 8210 Aarhus V</div>
                        </div>
                        <div className="flex gap-1.5 mb-3">
                            {['Overblik', 'Sager', 'Tilbud'].map((t, i) => (
                                <span key={t} className={`flex-1 text-center py-1.5 rounded-lg text-[0.62rem] font-bold ${i === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{t}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 text-center"><div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">2</div><div className="text-[0.58rem] text-slate-400 font-bold uppercase">Aktive sager</div></div>
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 text-center"><div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">3</div><div className="text-[0.58rem] text-slate-400 font-bold uppercase">Tilbud</div></div>
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
    const step = useSteps([1600, 2000, 2200]); // ny, sendt, bekræftet
    const folder = step === 0 ? 'ny' : step === 1 ? 'sendt' : 'bekraeftet';
    const folders = [['kladder', 'Kladder', 2], ['ny', 'Ny forespørgsel', 16], ['sendt', 'Sendt', 2], ['bekraeftet', 'Bekræftet', 3]];
    return (
        <div className="relative h-full">
            <div className="flex gap-1.5 mb-3 overflow-hidden">
                <motion.div className="flex gap-1.5" animate={{ x: step >= 2 ? -70 : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
                    {folders.map(([id, txt, n]) => {
                        const active = folder === id;
                        return (
                            <span key={id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.64rem] font-bold whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-500/40' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}>
                                {txt}<span className={active ? 'text-indigo-500' : 'text-slate-400'}>{n}</span>
                            </span>
                        );
                    })}
                </motion.div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={folder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-2.5">
                    {folder === 'ny' && [
                        { name: 'Søren Andersen', task: 'Nyt tag', date: '2.7.2026 · 11.14' },
                        { name: 'Mette Holm', task: 'Nyt gulv', date: '1.7.2026 · 09.30' },
                    ].map((l) => (
                        <div key={l.name} className={`${glass} rounded-2xl p-3.5`}>
                            <div className="flex items-start justify-between mb-2">
                                <div><div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.name}</div><div className="text-[0.6rem] text-slate-400 mt-0.5">Modtaget: {l.date}</div></div>
                                <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">Ny forespørgsel</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> {l.task}</div>
                            <div className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"><Clock size={11} /> Afventer tilbud</div>
                        </div>
                    ))}
                    {folder === 'sendt' && [
                        { name: 'Jensen Byg ApS', task: 'Tilbygning', price: '92.750 kr.', opened: false },
                        { name: 'P. Mikkelsen', task: 'Nyt tag', price: '148.000 kr.', opened: true },
                    ].map((l) => (
                        <div key={l.name} className={`${glass} rounded-2xl p-3.5`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.name}</div>
                                <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Sendt tilbud</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> {l.task}</div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-1.5"><span className="text-[0.55rem] text-slate-400">Pris </span><span className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.8rem]">{l.price}</span></div>
                                {l.opened
                                    ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.58rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Eye size={11} /> Åbnet</span>
                                    : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.58rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500"><Send size={10} /> Afventer</span>}
                            </div>
                        </div>
                    ))}
                    {folder === 'bekraeftet' && (
                        <div className={`${glass} rounded-2xl p-3.5`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Søren Andersen</div>
                                <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Bekræftet</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> Nyt tag</div>
                            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 flex items-center gap-2 mb-3">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <div><div className="text-[0.55rem] font-bold text-emerald-600 dark:text-emerald-400">Accepteret tilbud</div><div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">215.000 kr.</div></div>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex-1 text-center py-2 rounded-lg bg-slate-900 text-white text-[0.62rem] font-bold">Se opgave</span>
                                <span className="flex-1 text-center py-2 rounded-lg border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[0.62rem] font-bold">Til regnskab</span>
                            </div>
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
    const step = useSteps([1400, 500, 2600, 2600, 1400]); // list, tap, overblik, timer-tab, reset
    const detail = step >= 2 && step < 4;
    const tab = step === 3 ? 'timer' : 'overblik';
    const tapCard = step === 1;
    const detailOpen = step >= 2 && step <= 3;
    return (
        <div className="relative h-full">
            <div className="space-y-2.5">
                {[
                    { no: '142', title: 'Nyt tag', customer: 'Søren Andersen', pct: 65, dot: 'bg-emerald-500' },
                    { no: '138', title: 'Tilbygning', customer: 'Jensen Byg ApS', pct: 30, dot: 'bg-amber-500' },
                    { no: '131', title: 'Nyt gulv', customer: 'Mette Holm', pct: 90, dot: 'bg-emerald-500' },
                ].map((c, i) => (
                    <motion.div key={c.no} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: i === 0 && tapCard ? 0.98 : 1 }} transition={{ delay: 0.05 * i }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 ${i === 0 && tapCard ? 'border-emerald-300 dark:border-emerald-500/50 ring-2 ring-emerald-400/50' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div><div className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #{c.no}</div><div className="font-bold text-sm text-slate-900 dark:text-slate-100">{c.title}</div></div>
                            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.66rem] text-slate-500 dark:text-slate-400 mb-2"><Briefcase size={11} className="text-slate-400" /> {c.customer}</div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.pct}%` }} /></div>
                            <span className="text-[0.6rem] font-bold text-slate-500">{c.pct}%</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <TapPulse x={22} y={16} on={tapCard} />

            <AnimatePresence>
                {detailOpen && (
                    <motion.div key="cd" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 p-1"
                        style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.08) 0%, transparent 55%)' }}>
                        <div className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1 mb-2">← Sagsliste</div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Sag 142 · Nyt tag</div>
                        <div className="text-[0.6rem] text-slate-400 flex items-center gap-1 mb-2.5"><MapPin size={10} /> Birkevej 12 · Søren Andersen</div>
                        <div className="flex gap-1.5 mb-2.5">
                            {[['overblik', 'Overblik'], ['timer', 'Timer'], ['materialer', 'Materialer']].map(([id, t]) => (
                                <span key={id} className={`px-2.5 py-1.5 rounded-full text-[0.6rem] font-bold ${tab === id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-500/40' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}>{t}</span>
                            ))}
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2.5">
                                {tab === 'overblik' ? (<>
                                    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 p-3">
                                        <div className="flex items-center gap-2 mb-1.5"><Clock size={14} className="text-emerald-600" /><span className="text-[0.66rem] font-bold text-slate-900 dark:text-slate-100">Tidsregistrering</span></div>
                                        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">41,75 <span className="text-[0.6rem] text-slate-400 font-medium">/ 125 timer</span></div>
                                        <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-500/20 overflow-hidden my-1.5"><div className="h-full w-1/3 bg-emerald-500 rounded-full" /></div>
                                    </div>
                                    <div className={`${glass} rounded-xl p-3`}>
                                        <div className="flex items-center gap-2 mb-1.5"><Wrench size={14} className="text-blue-600" /><span className="text-[0.66rem] font-bold text-slate-900 dark:text-slate-100">Materialer</span></div>
                                        <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">● Bestilt</span>
                                    </div>
                                    <div className={`${glass} rounded-xl p-3`}>
                                        <div className="text-[0.66rem] font-bold text-slate-900 dark:text-slate-100 mb-1.5">Holdet på sagen</div>
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-[0.58rem] font-bold text-slate-700 dark:text-slate-300"><span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-[0.45rem] font-extrabold">KH</span> Kasper Holm · <span className="text-amber-600">PL</span></span>
                                    </div>
                                </>) : (<>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[['Forbrug', '0 t'], ['Dine timer', '0,00 t'], ['Underlev.', '7,50 t']].map(([l, v]) => (
                                            <div key={l} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-center"><div className="text-[0.48rem] font-bold uppercase text-slate-400 mb-1">{l}</div><div className="text-[0.8rem] font-extrabold text-slate-900 dark:text-slate-100">{v}</div></div>
                                        ))}
                                    </div>
                                    <div className="rounded-lg bg-slate-900 text-white text-center py-2.5 font-bold text-[0.66rem] flex items-center justify-center gap-1"><Plus size={12} /> Tilføj timer</div>
                                    <div className="rounded-lg border border-fuchsia-100 dark:border-fuchsia-500/20 bg-fuchsia-50/50 dark:bg-fuchsia-500/5 px-3 py-2 flex items-center justify-between text-[0.6rem]"><div><div className="font-bold text-slate-800 dark:text-slate-200">Hansen El</div><div className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">7,50 timer på sagen</div></div><span className="px-2 py-1 rounded-md bg-fuchsia-600 text-white font-bold">Afstem</span></div>
                                </>)}
                            </motion.div>
                        </AnimatePresence>
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
    const active = step >= 1 ? 12 : null;
    const days = Array.from({ length: 35 }, (_, i) => i - 2); // start-offset
    const events = { 12: [{ t: '08:00', title: 'Nyt tag · Birkevej 12', color: '#10b981' }, { t: '13:00', title: 'Opmåling · Mette Holm', color: '#3b82f6' }], 18: [{ t: '09:00', title: 'Tilbygning · Jensen Byg', color: '#f59e0b' }] };
    return (
        <div className="relative h-full">
            <div className="flex items-center justify-between mb-2.5">
                <div className="font-extrabold text-slate-900 dark:text-slate-100">Juli 2026</div>
                <div className="flex gap-1"><span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 rotate-180"><ChevronRight size={14} /></span><span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400"><ChevronRight size={14} /></span></div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[0.5rem] font-bold text-slate-400">{['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-1 mb-3">
                {days.map((d, i) => {
                    const valid = d >= 1 && d <= 31;
                    const isActive = d === active;
                    const has = events[d];
                    return (
                        <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[0.6rem] font-bold relative ${!valid ? 'opacity-0' : isActive ? 'bg-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {valid && d}
                            {valid && has && <span className={`w-1 h-1 rounded-full mt-0.5 ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />}
                        </div>
                    );
                })}
            </div>
            <TapPulse x={50} y={34} on={tapDay} />
            <AnimatePresence>
                {step >= 2 && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                        <div className="text-[0.66rem] font-bold text-slate-700 dark:text-slate-300">Fredag 12. juli</div>
                        {events[12].map((e, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className={`${glass} rounded-xl p-2.5 flex items-center gap-3`} style={{ borderLeft: `3px solid ${e.color}` }}>
                                <span className="text-[0.62rem] font-bold text-slate-500 dark:text-slate-400 w-9 shrink-0">{e.t}</span>
                                <span className="text-[0.7rem] font-semibold text-slate-800 dark:text-slate-200">{e.title}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 6) INTERN CHAT
// ════════════════════════════════════════════════════════════════════════════
function ChatMobile() {
    const step = useSteps([1500, 600, 1600, 900, 1600, 1500]); // liste, tap, tråd, typing, ny besked, reset
    const openThread = step >= 2 && step < 5;
    const tapThread = step === 1;
    const typing = step === 3;
    const showNew = step >= 4 && step < 5;
    return (
        <div className="relative h-full">
            <div className="space-y-2.5">
                {[
                    { name: 'Sag 142 · Nyt tag', last: 'Kasper: Tagpap er brændt på ✅', unread: 2, av: 'bg-emerald-100 text-emerald-700', init: '142' },
                    { name: 'Hele holdet', last: 'Thomas: Husk sikkerhedsmøde kl. 7', unread: 0, av: 'bg-blue-100 text-blue-700', init: 'H' },
                    { name: 'Kasper Holm', last: 'Jeg tager Birkevej i morgen', unread: 0, av: 'bg-amber-100 text-amber-700', init: 'KH' },
                ].map((t, i) => (
                    <motion.div key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 flex items-center gap-3 ${i === 0 && tapThread ? 'border-orange-300 dark:border-orange-500/50 ring-2 ring-orange-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[0.7rem] shrink-0 ${t.av}`}>{t.init}</span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100 truncate">{t.name}</div><div className="text-[0.64rem] text-slate-400 truncate">{t.last}</div></div>
                        {t.unread > 0 && <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[0.55rem] font-bold flex items-center justify-center shrink-0">{t.unread}</span>}
                    </motion.div>
                ))}
            </div>
            <TapPulse x={22} y={12} on={tapThread} />

            <AnimatePresence>
                {openThread && (
                    <motion.div key="th" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                        className="absolute inset-0 rounded-2xl bg-[#f4f7fb] dark:bg-slate-950 flex flex-col">
                        <div className="flex items-center gap-2 p-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 rotate-180"><ChevronRight size={16} /></span>
                            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-[0.62rem]">142</span>
                            <div className="font-bold text-[0.75rem] text-slate-900 dark:text-slate-100">Sag 142 · Nyt tag</div>
                        </div>
                        <div className="flex-1 p-3 space-y-2 overflow-hidden">
                            <div className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[0.68rem] text-slate-700 dark:text-slate-200 shadow-sm">Tagpap er brændt på ved 25° hældning ✅</div></div>
                            <div className="flex justify-start text-[0.5rem] text-slate-400 pl-2">Kasper · 14.02</div>
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
                            <div className="flex-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[0.66rem] text-slate-400">Skriv en besked…</div>
                            <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Send size={14} /></span>
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
    const step = useSteps([1500, 500, 1400, 2000]); // vis, tap fakturér, sender, sendt
    const tap = step === 1;
    const sent = step >= 3;
    const sending = step === 2;
    return (
        <div className="relative h-full">
            <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                    { l: 'Faktureret', v: '284.500', c: '#10b981' },
                    { l: 'Udestående', v: '92.750', c: '#f59e0b' },
                ].map((k) => (
                    <div key={k.l} className={`${glass} rounded-xl p-3`} style={{ borderTop: `3px solid ${k.c}` }}>
                        <div className="text-[0.55rem] font-bold uppercase tracking-wide text-slate-400 mb-1">{k.l}</div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{k.v} <span className="text-[0.6rem] text-slate-400">kr</span></div>
                    </div>
                ))}
            </div>
            <div className="text-[0.7rem] font-bold text-slate-700 dark:text-slate-300 mb-2">Klar til fakturering</div>
            <div className="space-y-2.5">
                {[
                    { no: '131', title: 'Nyt gulv · Mette Holm', amount: '78.400 kr.', first: true },
                    { no: '129', title: 'Carport · P. Mikkelsen', amount: '45.900 kr.', first: false },
                ].map((c, i) => (
                    <div key={c.no} className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 ${c.first && tap ? 'border-emerald-300 dark:border-emerald-500/50 ring-2 ring-emerald-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div><div className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #{c.no}</div><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">{c.title}</div></div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.85rem]">{c.amount}</div>
                        </div>
                        {c.first ? (
                            <motion.div animate={{ scale: tap ? 0.96 : 1 }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-[0.66rem] font-bold shadow-[0_4px_14px_rgba(16,185,129,0.3)]" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>
                                {sending ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><Clock size={13} /></motion.span> Sender…</> : sent ? <><CheckCircle2 size={13} /> Sendt til e-conomic</> : <><Wallet size={13} /> Fakturér nu</>}
                            </motion.div>
                        ) : (
                            <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[0.66rem] font-bold"><Wallet size={13} /> Fakturér</div>
                        )}
                    </div>
                ))}
            </div>
            <TapPulse x={50} y={52} on={tap} />
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
    const step = useSteps([1500, 500, 1400, 2000]); // vis, tap eksportér, klargør, fil klar
    const tap = step === 1;
    const done = step >= 3;
    const working = step === 2;
    return (
        <div className="relative h-full">
            <div className={`${glass} rounded-xl p-3 mb-3 flex items-center justify-between`}>
                <div><div className="text-[0.55rem] font-bold uppercase tracking-wide text-slate-400">Periode</div><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Uge 27 · 2026</div></div>
                <div className="text-right"><div className="text-[0.55rem] font-bold uppercase tracking-wide text-slate-400">Timer i alt</div><div className="font-extrabold text-slate-900 dark:text-slate-100">126,5 t</div></div>
            </div>
            <div className="space-y-2.5 mb-3">
                {[
                    { init: 'KH', name: 'Kasper Holm', role: 'Svend', hours: '37,0 t', km: '82 km', av: 'bg-amber-100 text-amber-700' },
                    { init: 'ML', name: 'Mikkel Lund', role: 'Lærling', hours: '37,0 t', km: '0 km', av: 'bg-indigo-100 text-indigo-700' },
                    { init: 'TN', name: 'Thomas', role: 'Mester', hours: '52,5 t', km: '140 km', av: 'bg-blue-100 text-blue-700' },
                ].map((e) => (
                    <div key={e.name} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[0.62rem] shrink-0 ${e.av}`}>{e.init}</span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.78rem] text-slate-900 dark:text-slate-100">{e.name}</div><div className="text-[0.58rem] text-slate-400 font-semibold">{e.role} · {e.km}</div></div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.82rem]">{e.hours}</div>
                    </div>
                ))}
            </div>
            <motion.div animate={{ scale: tap ? 0.96 : 1 }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[0.72rem] font-bold shadow-[0_8px_20px_rgba(99,102,241,0.35)]" style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)' }}>
                {working ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><Clock size={14} /></motion.span> Klargør lønfil…</> : done ? <><CheckCircle2 size={14} /> Lønfil klar</> : <><Download size={14} /> Eksportér til løn</>}
            </motion.div>
            <TapPulse x={50} y={90} on={tap} />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 9) KORTVISNING
// ════════════════════════════════════════════════════════════════════════════
function MapMobile() {
    const step = useSteps([1600, 600, 2400, 1400]); // kort, tap pin, callout, reset
    const tap = step === 1;
    const pins = [
        { x: 42, y: 30, color: '#10b981' }, { x: 58, y: 44, color: '#3b82f6' },
        { x: 35, y: 58, color: '#f59e0b' }, { x: 66, y: 66, color: '#10b981' }, { x: 50, y: 20, color: '#6366f1' },
    ];
    const active = step >= 2;
    return (
        <div className="relative h-full">
            <div className="relative h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                style={{ background: 'linear-gradient(160deg,#e8f0f7 0%,#dce8f2 100%)' }}>
                {/* stiliseret kort */}
                <div className="absolute inset-0 dark:opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(100,130,160,0.08) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(100,130,160,0.08) 0 1px, transparent 1px 34px)' }} />
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-40"><path d="M20 25 Q40 15 55 30 T80 45 Q70 65 55 70 T30 75 Q18 55 20 25Z" fill="#b9cfe0" stroke="#9bb6cc" strokeWidth="0.6" /></svg>
                {pins.map((p, i) => {
                    const isActive = active && i === 0;
                    return (
                        <motion.div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-100%)' }}
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0, scale: isActive ? 1.25 : 1 }} transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300 }}>
                            <MapPin size={isActive ? 26 : 20} fill={p.color} color="#fff" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))' }} />
                        </motion.div>
                    );
                })}
                <TapPulse x={42} y={26} on={tap} />
                <AnimatePresence>
                    {step >= 2 && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                            className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[85%] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[0.5rem] font-bold tracking-wider text-slate-400">SAG #142</span>
                                <span className="px-2 py-0.5 rounded-full text-[0.52rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Igangværende</span>
                            </div>
                            <div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">Nyt tag</div>
                            <div className="text-[0.62rem] text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin size={11} className="text-slate-400" /> Birkevej 12, 8210 Aarhus V</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[0.6rem]"><span className="px-2 py-1 rounded-lg bg-slate-900 text-white font-bold">Åbn sag</span><span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">Rutevejledning</span></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 10) SKITSER & TEGNINGER
// ════════════════════════════════════════════════════════════════════════════
function DrawingsMobile() {
    const step = useSteps([1200, 2400, 1400, 1600]); // værktøj, tegn, mål, reset
    const drawing = step >= 1;
    const measure = step >= 2;
    return (
        <div className="relative h-full">
            <div className="flex items-center gap-1.5 mb-2.5">
                {[PenTool, Layers, MapPin].map((Icon, i) => (
                    <span key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400'}`}><Icon size={16} /></span>
                ))}
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[0.62rem] font-bold text-slate-600 dark:text-slate-300"><Plus size={12} /> Upload</span>
            </div>
            <div className="relative h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(59,130,246,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(59,130,246,0.06) 0 1px, transparent 1px 22px)' }}>
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full p-4">
                    {/* grundplan der "tegnes" */}
                    <motion.path d="M30 40 L160 40 L160 120 L100 120 L100 160 L30 160 Z" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: drawing ? 1 : 0 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
                    {/* indervæg */}
                    <motion.line x1="100" y1="40" x2="100" y2="120" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3"
                        initial={{ pathLength: 0 }} animate={{ pathLength: drawing ? 1 : 0 }} transition={{ delay: 1.4, duration: 0.6 }} />
                    {measure && (
                        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <text x="95" y="32" fontSize="9" fill="#2563eb" fontWeight="bold">6,50 m</text>
                            <text x="168" y="85" fontSize="9" fill="#2563eb" fontWeight="bold">4,0 m</text>
                        </motion.g>
                    )}
                </svg>
                {drawing && !measure && (
                    <motion.span className="absolute" initial={{ left: '15%', top: '20%' }} animate={{ left: ['15%', '80%', '80%', '50%', '15%'], top: ['20%', '20%', '60%', '80%', '80%'] }} transition={{ duration: 1.6, ease: 'easeInOut' }}>
                        <PenTool size={16} className="text-blue-600" fill="#3b82f6" />
                    </motion.span>
                )}
                <div className="absolute bottom-2 left-2 text-[0.55rem] font-bold text-slate-400 bg-white/80 dark:bg-slate-800/80 rounded-md px-2 py-1">Grundplan · Birkevej 12</div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 11) INTEGRATIONER
// ════════════════════════════════════════════════════════════════════════════
function IntegrationsMobile() {
    const step = useSteps([1400, 600, 1500, 2200]); // vis, tap forbind, forbinder, forbundet
    const tap = step === 1;
    const connecting = step === 2;
    const connected = step >= 3;
    return (
        <div className="relative h-full">
            <div className="text-[0.7rem] text-slate-500 dark:text-slate-400 mb-3 leading-snug">Forbind dit regnskab og din mail — så flyder fakturaer og beskeder automatisk.</div>
            <div className="space-y-2.5">
                {[
                    { name: 'e-conomic', desc: 'Regnskab & fakturering', color: '#059669', letter: 'e', primary: true },
                    { name: 'Dinero', desc: 'Regnskab', color: '#7c3aed', letter: 'D', primary: false },
                    { name: 'Egen mail (SMTP)', desc: 'Send tilbud fra din adresse', color: '#2563eb', letter: '@', primary: false, isMail: true },
                ].map((it) => (
                    <div key={it.name} className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 flex items-center gap-3 ${it.primary && tap ? 'border-emerald-300 dark:border-emerald-500/50 ring-2 ring-emerald-400/40' : 'border-slate-100 dark:border-slate-800'}`}>
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white shrink-0" style={{ background: it.color }}>{it.letter}</span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.8rem] text-slate-900 dark:text-slate-100">{it.name}</div><div className="text-[0.6rem] text-slate-400">{it.desc}</div></div>
                        {it.primary ? (
                            <motion.span animate={{ scale: tap ? 0.94 : 1 }} className={`px-2.5 py-1.5 rounded-lg text-[0.62rem] font-bold shrink-0 ${connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'text-white'}`} style={connected ? {} : { background: 'linear-gradient(135deg,#34d399,#10b981)' }}>
                                {connecting ? '…' : connected ? <span className="inline-flex items-center gap-1"><Check size={11} /> Forbundet</span> : 'Forbind'}
                            </motion.span>
                        ) : (
                            <span className="px-2.5 py-1.5 rounded-lg text-[0.62rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">Forbind</span>
                        )}
                    </div>
                ))}
            </div>
            <TapPulse x={82} y={26} on={tap} />
            <AnimatePresence>
                {connected && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-1 inset-x-0 mx-auto w-fit inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-[0.62rem] font-bold shadow-xl">
                        <CheckCircle2 size={13} className="text-emerald-400" /> e-conomic er nu forbundet
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
    const step = useSteps([1500, 600, 1800, 1600]); // vis, tap tilføj, invite-sheet, reset
    const tap = step === 1;
    const showSheet = step === 2;
    return (
        <div className="relative h-full">
            <div className="space-y-2.5">
                {[
                    { init: 'TN', name: 'Thomas', role: 'Mester', tag: 'Fuld adgang', av: 'bg-blue-100 text-blue-700', rc: 'text-blue-600 bg-blue-50 dark:bg-blue-500/20' },
                    { init: 'KH', name: 'Kasper Holm', role: 'Svend', tag: 'Projektleder', av: 'bg-amber-100 text-amber-700', rc: 'text-amber-600 bg-amber-50 dark:bg-amber-500/20' },
                    { init: 'ML', name: 'Mikkel Lund', role: 'Lærling', tag: 'Begrænset', av: 'bg-indigo-100 text-indigo-700', rc: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20' },
                    { init: 'HE', name: 'Hansen El', role: 'Underlev.', tag: 'Ekstern', av: 'bg-violet-100 text-violet-700', rc: 'text-violet-600 bg-violet-50 dark:bg-violet-500/20' },
                ].map((m) => (
                    <div key={m.name} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[0.62rem] shrink-0 ${m.av}`}>{m.init}</span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-[0.78rem] text-slate-900 dark:text-slate-100">{m.name}</div><div className="text-[0.58rem] text-slate-400 font-semibold">{m.role}</div></div>
                        <span className={`px-2 py-1 rounded-lg text-[0.55rem] font-bold shrink-0 ${m.rc}`}>{m.tag}</span>
                    </div>
                ))}
            </div>
            <motion.div animate={{ scale: tap ? 0.96 : 1 }} className="mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[0.72rem] font-bold shadow-[0_8px_20px_rgba(249,115,22,0.32)]" style={{ background: 'linear-gradient(135deg,#fb923c,#f97316)' }}>
                <Plus size={14} /> Tilføj medarbejder
            </motion.div>
            <TapPulse x={50} y={94} on={tap} />
            <AnimatePresence>
                {showSheet && (
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        className="absolute inset-x-0 bottom-0 top-10 rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4">
                        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-3">Inviter medarbejder</div>
                        <div className="space-y-2 mb-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-[0.68rem] text-slate-400">navn@firma.dk</div>
                            <div className="flex gap-2">
                                {['Svend', 'Lærling', 'Projektleder'].map((r, i) => (
                                    <span key={r} className={`flex-1 text-center py-2 rounded-xl text-[0.62rem] font-bold ${i === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{r}</span>
                                ))}
                            </div>
                        </div>
                        <div className="text-center py-2.5 rounded-xl text-white text-[0.72rem] font-bold" style={{ background: 'linear-gradient(135deg,#fb923c,#f97316)' }}>Send invitation</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Loop-tider pr. modul (sum af step-varigheder + luft) ────────────────────
export const MOBILE_LOOP_MS = {
    overview: 6900, customers: 5700, leads: 5800, cases: 8500,
    calendar: 5800, chat: 7100, finance: 5400, payroll: 5400,
    map: 6000, drawings: 6600, integrations: 5700, team: 5500,
};

const SCREENS = {
    overview: OverviewMobile, customers: CustomersMobile, leads: LeadsMobile, cases: CasesMobile,
    calendar: CalendarMobile, chat: ChatMobile, finance: FinanceMobile, payroll: PayrollMobile,
    map: MapMobile, drawings: DrawingsMobile, integrations: IntegrationsMobile, team: TeamMobile,
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
