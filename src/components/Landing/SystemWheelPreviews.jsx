import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Users, FileText, Briefcase, Calendar, MessageSquare, Wallet, MapPin,
    PenTool, Link as LinkIcon, HardHat, Search, Phone, ChevronRight, CheckCircle,
    Send, Inbox, TrendingUp, Wrench, ChevronDown, Plus, ArrowRight, Copy, Mic, Calculator, X,
} from 'lucide-react';

/*
 * Skærm-tro, ANONYMISEREDE replikaer af hver modul-skærm — bygget med samme
 * glas-design som det rigtige system. Ingen rigtige personer, billeder eller data.
 * Fiktive navne overalt: Thomas (mester), Søren Andersen, Jensen Byg ApS …
 */

// Sidebar-rælen i systemets rækkefølge (samme ikoner som den rigtige sidebar).
const RAIL = [
    { id: 'overview', icon: Home },
    { id: 'customers', icon: Users },
    { id: 'leads', icon: FileText },
    { id: 'cases', icon: Briefcase },
    { id: 'calendar', icon: Calendar },
    { id: 'chat', icon: MessageSquare },
    { id: 'finance', icon: Wallet },
    { id: 'payroll', icon: FileText },
    { id: 'map', icon: MapPin },
    { id: 'drawings', icon: PenTool },
    { id: 'integrations', icon: LinkIcon },
    { id: 'team', icon: HardHat },
];

// ── App-vindue: sidebar-ræl + skærm-indhold ──────────────────────────────
function AppFrame({ activeId, children }) {
    return (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] flex bg-[#f6f8fb] dark:bg-slate-950"
            style={{
                backgroundImage:
                    'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.10) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(249,115,22,0.10) 0%, transparent 55%)',
            }}>
            {/* Sidebar-ræl */}
            <div className="w-[52px] shrink-0 bg-white/55 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-800 flex flex-col items-center py-3 gap-1.5">
                <img src="/clean-transparent.png" alt="Bison Frame" className="w-8 h-8 object-contain mb-1.5 shrink-0" />
                {RAIL.map(({ id, icon: Icon }) => {
                    const active = id === activeId;
                    return (
                        <div key={id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${active
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                : 'bg-white/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-white/70 dark:border-slate-700'}`}>
                            <Icon size={15} />
                        </div>
                    );
                })}
            </div>
            {/* Skærm */}
            <div className="flex-1 min-w-0 p-4 sm:p-5">{children}</div>
        </div>
    );
}

const glass = 'bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-slate-800';

// ── Auto-demo motor: musemarkør + step-loop ────────────────────────────────
function useSteps(durations) {
    const [step, setStep] = useState(0);
    useEffect(() => {
        let i = 0, timer;
        const tick = () => { timer = setTimeout(() => { i = (i + 1) % durations.length; setStep(i); tick(); }, durations[i]); };
        setStep(0); tick();
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return step;
}

function DemoCursor({ x, y, clicking }) {
    return (
        <motion.div className="absolute z-[60] pointer-events-none"
            animate={{ left: `${x}%`, top: `${y}%`, scale: clicking ? 0.8 : 1 }}
            transition={{ left: { type: 'spring', stiffness: 80, damping: 15 }, top: { type: 'spring', stiffness: 80, damping: 15 }, scale: { duration: 0.15 } }}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
                <path d="M4 2 L4 19 L8.5 14.5 L11.8 21.5 L14.2 20.4 L11 13.7 L17.5 13.7 Z" fill="#fff" stroke="#0f172a" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            {clicking && (
                <motion.span className="absolute left-0 top-0 w-5 h-5 rounded-full border-2 border-blue-500"
                    initial={{ scale: 0.4, opacity: 0.7 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.45 }} />
            )}
        </motion.div>
    );
}

// "Opret ny sag"-modal (vises når musen klikker "Lav et tilbud")
function OpretSagModal() {
    return (
        <motion.div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/70 dark:border-slate-800 p-4 w-[88%] max-w-[520px]">
                <div className="text-center mb-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Opret ny sag</h3>
                    <p className="text-[0.68rem] text-slate-500">Vælg hvordan du vil oprette</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative rounded-xl border-2 border-orange-400 bg-white dark:bg-slate-950 p-3 text-center">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[0.52rem] font-bold whitespace-nowrap">Nemmest · start her</span>
                        <span className="w-9 h-9 mx-auto rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-2 mt-1"><FileText size={16} /></span>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">Hurtigt tilbud</div>
                        <p className="text-[0.58rem] text-slate-500 leading-snug mb-2">Smid din materialepris ind, sæt din avance og send et tilbud med det samme.</p>
                        <span className="text-orange-500 font-bold text-[0.7rem]">Lav tilbud ›</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-center">
                        <span className="w-9 h-9 mx-auto rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-2 mt-1"><Calculator size={16} /></span>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">Prisberegner</div>
                        <p className="text-[0.58rem] text-slate-500 leading-snug mb-2">Opret et tilbud via de standardiserede skabeloner med foruddefinerede priser.</p>
                        <span className="text-blue-500 font-bold text-[0.7rem]">Start beregner ›</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><HardHat size={15} /></span>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[0.76rem]">Opret sag (uden tilbud)</div>
                        <p className="text-[0.56rem] text-slate-500 leading-snug">Kører du på timepris og fakturerer bagefter? Opret sagen direkte.</p>
                    </div>
                    <span className="text-emerald-600 font-bold text-[0.68rem] shrink-0">Opret sag ›</span>
                </div>
            </motion.div>
        </motion.div>
    );
}

// "Hurtigt tilbud"-skærmen (vises efter modal-klik) — tro mod den rigtige skærm
function HurtigtTilbudScreen() {
    const field = 'rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 py-1 text-slate-400';
    const lbl = 'text-[0.5rem] font-bold text-slate-600 dark:text-slate-300 mb-0.5';
    return (
        <motion.div className="absolute inset-0 z-40 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden flex flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Hurtigt tilbud</div>
                    <div className="text-[0.55rem] text-slate-400">Ret tilbuddet og mailen — kunden ser det live til højre.</div>
                </div>
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><X size={13} /></span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2.5 p-3 min-h-0 text-[0.55rem] overflow-hidden">
                {/* Kol 1 — rediger */}
                <div className="space-y-1.5">
                    <div className="text-[0.5rem] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1"><PenTool size={9} /> Rediger tilbuddet</div>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center gap-1 py-1.5"><Mic size={11} /> Udfyld med stemme (AI)</div>
                    <div className="text-[0.5rem] text-slate-400 leading-snug text-center">Fortæl frit om kunden og opgaven — Frame udfylder felterne.</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 pt-0.5"><Users size={10} /> Kunde</div>
                    <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-1.5 py-1 text-slate-400"><span>Genbrug en eksisterende kunde…</span><ChevronDown size={10} /></div>
                    <div className="inline-flex gap-0.5 p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 w-full">
                        <span className="flex-1 text-center py-0.5 rounded bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200">Privat</span>
                        <span className="flex-1 text-center py-0.5 rounded text-slate-400">Erhverv</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <div><div className={lbl}>Navn *</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Telefon</div><div className={field}>+45 12 34 56 78</div></div>
                        <div><div className={lbl}>Email</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Adresse</div><div className={field}>&nbsp;</div></div>
                    </div>
                </div>
                {/* Kol 2 — PDF */}
                <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><FileText size={9} /> Sådan ser PDF'en ud</div>
                        <span className="text-[0.45rem] font-bold text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5">⤢ Forstør</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-sm">
                        <div className="flex justify-between items-start mb-1.5">
                            <div>
                                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.58rem]">THOMAS BYG</div>
                                <div className="text-[0.42rem] text-slate-400 leading-tight">Thomas Nielsen<br />thomas@thomasbyg.dk<br />40 12 34 56</div>
                            </div>
                            <div className="text-right">
                                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.7rem]">TILBUD</div>
                                <div className="text-[0.42rem] text-slate-400">Dato: 3.7.2026</div>
                            </div>
                        </div>
                        <div className="text-[0.45rem] font-bold text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-1">Til kunde</div>
                        <div className="text-[0.45rem] font-bold text-slate-500 mt-1">BESKRIVELSE</div>
                        <div className="text-[0.45rem] text-slate-500 leading-snug mb-1">Udførelse af aftalt arbejde inkl. materialer.</div>
                        <div className="flex justify-between text-[0.45rem] text-slate-500"><span>I alt ekskl. moms</span><span>0,00 kr</span></div>
                        <div className="flex justify-between text-[0.45rem] text-slate-400"><span>Moms (25%)</span><span>0,00 kr</span></div>
                        <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1 mt-1 font-bold text-slate-900 dark:text-slate-100 text-[0.5rem]"><span>I ALT INKL. MOMS</span><span>0,00 kr</span></div>
                        <div className="text-[0.42rem] font-bold text-slate-600 dark:text-slate-400 mt-1.5">Tak for tilliden. Dette tilbud er gældende i 14 dage.</div>
                    </div>
                    <div className="text-[0.5rem] font-bold text-blue-600 dark:text-blue-400">Åbn i nyt vindue ›</div>
                </div>
                {/* Kol 3 — mail */}
                <div className="space-y-1.5 min-w-0">
                    <div className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><MessageSquare size={9} /> Mailen til kunden</div>
                    <div className="text-[0.5rem] text-slate-500">Personlig besked i mailen</div>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 leading-snug text-[0.5rem]">Tak for en god snak. Her er det tilbud, vi aftalte — du kan se og bekræfte det via knappen herunder.<br /><br />Sig endelig til, hvis du har spørgsmål.</div>
                    <div className="rounded-lg bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-center">
                        <div className="w-6 h-6 mx-auto rounded bg-slate-900 mb-1" />
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[0.55rem] mb-1">Thomas Byg</div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.7rem] mb-1">Dit tilbud er klar!</div>
                        <div className="text-slate-500 leading-snug text-[0.48rem]">Hej kunde, tak for en god snak. Her er det tilbud, vi aftalte…</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div><div className="text-[0.5rem] text-slate-400">I alt inkl. moms</div><div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">0,00 kr</div></div>
                <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[0.64rem] font-bold text-slate-700 dark:text-slate-300">Gem kladde</span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[0.64rem] font-bold inline-flex items-center gap-1"><Send size={11} /> Send tilbud</span>
                </div>
            </div>
        </motion.div>
    );
}

// ── Oversigt ──────────────────────────────────────────────────────────────
function OverviewScreen() {
    const kpis = [
        { label: 'Omsætning', value: '284.500', suffix: 'DKK', color: '#10b981', icon: CheckCircle },
        { label: 'Aktive sager', value: '5', suffix: '', color: '#f59e0b', icon: Briefcase },
        { label: 'Tilbud sendt', value: '4', suffix: '', color: '#6366f1', icon: Send },
        { label: 'Nye forespørgsler', value: '15', suffix: '', color: '#3b82f6', icon: Inbox },
        { label: 'Konvertering', value: '17', suffix: '%', color: '#14b8a6', icon: TrendingUp },
    ];
    const cases = [
        { no: '142', title: 'Nyt tag', customer: 'Søren Andersen', addr: 'Birkevej 12, 8210 Aarhus V', pct: 65 },
        { no: '138', title: 'Tilbygning', customer: 'Jensen Byg ApS', addr: 'Bragesvej 5, 8680 Ry', pct: 30 },
    ];
    const STEP_DUR = [900, 1100, 450, 1900, 450, 3200];
    const step = useSteps(STEP_DUR);
    const cur = [{ x: 50, y: 95 }, { x: 47, y: 14 }, { x: 47, y: 14 }, { x: 37, y: 55 }, { x: 37, y: 55 }, { x: 30, y: 40 }][step];
    const clicking = step === 2 || step === 4;
    const btnActive = step === 1 || step === 2;
    const showModal = step === 3 || step === 4;
    const showQuote = step === 5;
    return (
        <div className="relative">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">Velkommen tilbage, Thomas!</h2>
                <div className="flex items-center gap-2 flex-nowrap">
                    <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 shrink-0">Her er dit visuelle overblik for forretningen lige nu.</p>
                    <motion.button animate={{ scale: btnActive ? 1.08 : 1 }} transition={{ duration: 0.2 }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[0.7rem] font-bold shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.32)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                        <FileText size={11} /> Lav et tilbud
                    </motion.button>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-[0.6rem] ml-auto shrink-0">
                        <LinkIcon size={10} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Dit tilbudslink:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">bisonframe.dk/thomasbyg</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-bold ml-0.5"><Copy size={9} /> Kopiér</span>
                    </div>
                </div>
            </div>
            {/* KPI grid */}
            <div className="grid grid-cols-5 gap-2 mb-5">
                {kpis.map((k, i) => (
                    <motion.div key={k.label} initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, -4, 0] }} transition={{ opacity: { delay: 0.05 * i }, y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 } }}
                        className={`${glass} relative overflow-hidden rounded-xl p-2.5`} style={{ borderTop: `3px solid ${k.color}` }}>
                        <k.icon size={54} style={{ position: 'absolute', right: -10, bottom: -10, color: k.color, opacity: 0.06, transform: 'rotate(-15deg)' }} />
                        <span className="inline-flex p-1 rounded-md mb-1.5" style={{ background: `${k.color}22`, color: k.color }}><k.icon size={12} /></span>
                        <div className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight mb-1">{k.label}</div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-none">{k.value}<span className="text-[0.6rem] text-slate-400 font-semibold ml-0.5">{k.suffix}</span></div>
                    </motion.div>
                ))}
            </div>
            {/* Sager i drift */}
            <div className="flex items-end justify-between mb-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sager i drift <span className="text-slate-400 font-normal">(Igangværende)</span></h3>
                    <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">Overblik over byggepladser med accepterede tilbud.</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[0.7rem] font-semibold text-slate-700 dark:text-slate-300">Se alle <ArrowRight size={11} /></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {cases.map((c, i) => (
                    <motion.div key={c.no} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + 0.08 * i }}
                        className={`${glass} rounded-xl overflow-hidden`}>
                        <div className="flex items-start justify-between p-3 border-b border-slate-100 dark:border-slate-800" style={{ background: 'rgba(248,250,252,0.5)' }}>
                            <div>
                                <div className="text-[0.55rem] font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">SAG #{c.no}</div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{c.title}</h4>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,0.1)' }} />
                        </div>
                        <div className="p-3 space-y-2.5">
                            <div className="flex items-center gap-2 text-[0.72rem] text-slate-500 dark:text-slate-400">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"><Briefcase size={10} /></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.customer}</span>
                            </div>
                            <div className="flex items-start gap-2 text-[0.72rem] text-slate-500 dark:text-slate-400">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"><MapPin size={10} /></span>
                                <span className="leading-snug">{c.addr}</span>
                            </div>
                            <div>
                                <div className="flex justify-between text-[0.6rem] font-bold text-slate-400 dark:text-slate-500 mb-1"><span>Færdiggørelse</span><span className="text-slate-700 dark:text-slate-300">{c.pct}%</span></div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#34d399,#10b981)' }} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: 0.35 + 0.1 * i, duration: 0.8, ease: 'easeOut' }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <DemoCursor x={cur.x} y={cur.y} clicking={clicking} />
            <AnimatePresence>{showModal && <OpretSagModal key="m" />}</AnimatePresence>
            <AnimatePresence>{showQuote && <HurtigtTilbudScreen key="q" />}</AnimatePresence>
        </div>
    );
}

// ── Kunder ──────────────────────────────────────────────────────────────
function CustomersScreen() {
    const custs = [
        { init: 'SA', name: 'Søren Andersen', biz: false, av: 'bg-amber-100 text-amber-700', sager: 2, tilbud: 3, phone: '40 12 34 56', addr: 'Birkevej 12, Aarhus V' },
        { init: 'JB', name: 'Jensen Byg ApS', biz: true, av: 'bg-emerald-100 text-emerald-700', sager: 4, tilbud: 6, phone: '70 20 40 60', addr: 'Bragesvej 5, Ry' },
        { init: 'PM', name: 'P. Mikkelsen', biz: false, av: 'bg-rose-100 text-rose-700', sager: 1, tilbud: 1, phone: '26 55 88 12', addr: 'Engvej 8, Aarhus C' },
        { init: 'MH', name: 'Mette Holm', biz: false, av: 'bg-indigo-100 text-indigo-700', sager: 3, tilbud: 2, phone: '31 44 77 90', addr: 'Skovvej 3, Skanderborg' },
    ];
    const pills = [['Alle', 31, true], ['Private', 30, false], ['Erhverv', 1, false]];
    const STEP_DUR = [900, 1300, 450, 1300, 450, 1600];
    const step = useSteps(STEP_DUR);
    const cur = [{ x: 50, y: 95 }, { x: 26, y: 58 }, { x: 26, y: 58 }, { x: 26, y: 86 }, { x: 26, y: 86 }, { x: 30, y: 80 }][step];
    const hovered = (step === 1 || step === 2) ? 0 : (step === 3 || step === 4) ? 2 : -1;
    const clicking = step === 2 || step === 4;
    return (
        <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-slate-100"><Users size={18} className="text-blue-500" /> Kunder</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dit kunde-bibliotek — alt hvad du har lavet, samlet ét sted.</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-white border-[1.5px] border-blue-200"><Plus size={14} /> Opret kunde</button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.32)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><FileText size={14} /> Lav tilbud</button>
                </div>
            </div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <div className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400">Søg på navn, telefon, mail, adresse, CVR…</div>
                </div>
                <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {pills.map(([txt, n, active]) => (
                        <span key={txt} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.72rem] font-bold ${active ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                            {txt}<span className={`text-[0.62rem] font-extrabold px-1.5 rounded-full ${active ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{n}</span>
                        </span>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {custs.map((c, i) => {
                    const active = hovered === i;
                    const pressed = active && clicking;
                    return (
                    <motion.div key={c.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: active ? -5 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24, opacity: { delay: 0.06 * i } }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 transition-shadow duration-300 ${active ? 'border-blue-200 dark:border-blue-500/40 shadow-[0_16px_38px_rgba(15,23,42,0.10)]' : 'border-slate-100 dark:border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'} ${pressed ? 'ring-2 ring-blue-400/60' : ''}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center font-extrabold text-sm shrink-0 ${c.av}`}>{c.init}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{c.name}</div>
                                <div className="text-[0.68rem] font-semibold text-slate-400">{c.biz ? 'Erhvervskunde' : 'Privatkunde'}</div>
                            </div>
                            <ChevronRight size={16} className={`shrink-0 transition-all duration-300 ${active ? 'text-blue-500 translate-x-1' : 'text-slate-300'}`} />
                        </div>
                        <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-2 text-[0.72rem] text-slate-500 dark:text-slate-400"><Phone size={12} className="text-slate-400 shrink-0" /> {c.phone}</div>
                            <div className="flex items-center gap-2 text-[0.72rem] text-slate-500 dark:text-slate-400"><MapPin size={12} className="text-slate-400 shrink-0" /> {c.addr}</div>
                        </div>
                        <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                            <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><Briefcase size={11} /> {c.sager} sager</span>
                            <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"><FileText size={11} /> {c.tilbud} tilbud</span>
                        </div>
                    </motion.div>
                    );
                })}
            </div>
            <DemoCursor x={cur.x} y={cur.y} clicking={clicking} />
        </div>
    );
}

// ── Tilbud & Forespørgsler ─────────────────────────────────────────────────
function LeadsScreen() {
    const tabs = [['Tilbudskladder', 2, true], ['Ny forespørgsel', 16, false], ['Sendt tilbud', 0, false], ['Bekræftet opgave', 5, false], ['Sæt i bero', 0, false]];
    const leads = [
        { name: 'Søren Andersen', date: '26.6.2026 kl. 14.41', price: '184.500,00 DKK', phone: '40 12 34 56' },
        { name: 'Jensen Byg ApS', date: '25.6.2026 kl. 15.58', price: '92.750,00 DKK', phone: '70 20 40 60' },
    ];
    return (
        <div>
            <div className="mb-3">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Kunder & Forespørgsler</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Her styrer du dine kunder hele vejen — fra forespørgsel til færdig opgave.</p>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {tabs.map(([txt, n, active]) => (
                    <span key={txt} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-bold whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-500/40' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
                        {txt}<span className={`${active ? 'text-indigo-500' : 'text-slate-400'}`}>{n}</span>
                    </span>
                ))}
            </div>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold mb-3"><Plus size={14} /> Nyt tilbud</button>
            <div className="mb-3 w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-2"><Search size={13} /> Søg i "Tilbudskladder" på kundenavn, adresse…</div>
            <div className="space-y-3">
                {leads.map((l, i) => (
                    <motion.div key={l.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
                        className={`${glass} rounded-2xl p-4`}>
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.name}</div>
                                <div className="text-[0.68rem] text-slate-400 mt-0.5">Modtaget: {l.date}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">Tilbudskladder</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> Manuelt tilbud</div>
                        <div className="flex items-end justify-between gap-3">
                            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 flex-1">
                                <div className="text-[0.62rem] text-slate-400">Tilbudspris</div>
                                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{l.price} <span className="text-[0.6rem] font-medium text-slate-400">inkl. moms</span></div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-[0.7rem] font-bold shrink-0">Se Opgavedetaljer</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ── Sager & Ordrestyring ───────────────────────────────────────────────────
function CasesScreen() {
    const cases = [
        { date: '2.7.2026', no: '142', title: 'Nyt tag', customer: 'Søren Andersen', addr: 'Birkevej 12, 8210 Aarhus V', pct: 50, timer: '15 t', pm: { init: 'KH', name: 'Kasper Holm' } },
        { date: '1.7.2026', no: '138', title: 'Tilbygning', customer: 'Jensen Byg ApS', addr: 'Bragesvej 5, 8680 Ry', pct: 0, timer: '0 t / 40 t', pm: null },
    ];
    return (
        <div>
            <div className={`${glass} rounded-2xl p-4 flex items-center justify-between gap-3 mb-4`}>
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><HardHat size={20} /></span>
                    <div className="min-w-0">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Sager & Ordrestyring</h2>
                        <p className="text-[0.72rem] text-slate-500 dark:text-slate-400 truncate">Fuld styring af bekræftede tømreropgaver, timer og materialer.</p>
                    </div>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shrink-0 shadow-[0_4px_14px_rgba(16,185,129,0.32)]" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}><Plus size={14} /> Opret sag</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100">Mine sager (6)</span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400">Alle sager (6)</span>
            </div>
            <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Aktive sager (5)</span></div>
            <div className="grid grid-cols-2 gap-3">
                {cases.map((c, i) => (
                    <motion.div key={c.no} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-500/30">Aktiv Sag</span>
                            <span className="text-[0.68rem] text-slate-400">{c.date}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">Sag {c.no} - {c.title}</h4>
                        <div className="text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-1">Kunde: {c.customer}</div>
                        <div className="flex items-start gap-1 text-[0.68rem] text-slate-400 mb-3"><MapPin size={11} className="shrink-0 mt-0.5" /> {c.addr}</div>
                        <div className="flex justify-between text-[0.68rem] text-slate-500 dark:text-slate-400 mb-1"><span>Fremdrift (To-Do)</span><span className="font-bold text-slate-700 dark:text-slate-300">{c.pct}%</span></div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#34d399,#10b981)' }} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: 0.35, duration: 0.8, ease: 'easeOut' }} />
                        </div>
                        <div className="flex items-center justify-between text-[0.68rem] border-t border-slate-100 dark:border-slate-800 pt-2">
                            <span className="text-slate-400">Timer registreret:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{c.timer}</span>
                        </div>
                        {c.pm && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[0.65rem] font-bold text-blue-600 dark:text-blue-300">
                                <span className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 flex items-center justify-center text-[0.5rem] font-extrabold">{c.pm.init}</span>
                                {c.pm.name} (PM)
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export function Preview({ id }) {
    let screen = null;
    switch (id) {
        case 'overview': screen = <OverviewScreen />; break;
        case 'customers': screen = <CustomersScreen />; break;
        case 'leads': screen = <LeadsScreen />; break;
        case 'cases': screen = <CasesScreen />; break;
        default: return null;
    }
    return <AppFrame activeId={id}>{screen}</AppFrame>;
}
