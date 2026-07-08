import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Users, FileText, Briefcase, Calendar, MessageSquare, Wallet, MapPin,
    PenTool, Link as LinkIcon, HardHat, Search, Phone, ChevronRight, CheckCircle,
    Send, Inbox, TrendingUp, Wrench, ChevronDown, Plus, ArrowRight, Copy, Mic, Calculator, X, Mail, Sparkles, Pencil, Trash2, Eye, Clock, CheckCircle2, AlertCircle, AlertTriangle, Download, Upload, Package, Lock, Folder, UserPlus, Building2,
} from 'lucide-react';
import { DenmarkLand } from './DenmarkMap';

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
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] flex bg-[#f6f8fb] dark:bg-slate-950 min-h-[440px]"
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
            <div className="flex-1 min-w-0 p-4 sm:p-5 relative">{children}</div>
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

function DemoCursor({ x, y, clicking, carry }) {
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
            {carry && (
                <span className="absolute left-3 top-3 px-2 py-1 rounded-md bg-indigo-600 text-white text-[0.52rem] font-bold shadow-lg whitespace-nowrap rotate-[-3deg]">{carry}</span>
            )}
        </motion.div>
    );
}

// "Opret ny sag"-modal (vises når musen klikker "Lav et tilbud")
function OpretSagModal({ cardRef }) {
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
                    <div ref={cardRef} className="relative rounded-xl border-2 border-orange-400 bg-white dark:bg-slate-950 p-3 text-center">
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
function HurtigtTilbudScreen({ sendRef, sent }) {
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
                {/* Kol 1 — rediger (1:1 med den rigtige skærm, hele vejen ned til Materialer) */}
                <div className="space-y-1 overflow-hidden">
                    <div className="text-[0.5rem] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1"><PenTool size={9} /> Rediger tilbuddet</div>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center gap-1 py-1"><Mic size={10} /> Udfyld med stemme (AI)</div>
                    <div className="text-[0.44rem] text-slate-400 leading-snug text-center">Fortæl frit om kunden og opgaven — Frame udfylder felterne, og du retter til bagefter.</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Users size={10} /> Kunde</div>
                    <div className="text-[0.44rem] font-bold text-slate-600 dark:text-slate-300">Vælg fra dit kunde-bibliotek</div>
                    <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-slate-400"><span>Genbrug en eksisterende kunde…</span><ChevronDown size={9} /></div>
                    <div className="inline-flex gap-0.5 p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 w-full">
                        <span className="flex-1 text-center py-0.5 rounded bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200">Privat</span>
                        <span className="flex-1 text-center py-0.5 rounded text-slate-400">Erhverv</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <div><div className={lbl}>Navn *</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Telefon</div><div className={field}>+45 12 34 56 78</div></div>
                        <div><div className={lbl}>Email</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Adresse</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Postnummer</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>By</div><div className={field}>&nbsp;</div></div>
                    </div>
                    <div><div className={lbl}>Opgavetitel</div><div className={field}>F.eks. 'Nyt tag på Nørrevænget 1'</div></div>
                    <div><div className={lbl}>Tilbuddet er gyldigt i (dage)</div><div className={field}>14</div></div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 pt-0.5"><Package size={10} /> Materialer</div>
                    <div className="grid grid-cols-2 gap-1">
                        <div><div className={lbl}>Indkøbspris</div><div className={field}>&nbsp;</div></div>
                        <div><div className={lbl}>Avance %</div><div className={field}>10</div></div>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-1.5 py-1"><span className="text-slate-500">Materialer i tilbud</span><span className="font-bold text-slate-900 dark:text-slate-100">0,00 kr</span></div>
                    <div><div className={lbl}>Materialeliste (PDF)</div>
                        <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center gap-1 py-1"><Upload size={9} /> Vedhæft PDF</div>
                    </div>
                </div>
                {/* Kol 2 — PDF */}
                <div className="space-y-1 min-w-0 overflow-hidden">
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
                        <div className="text-[0.42rem] font-bold text-slate-600 dark:text-slate-400 mt-1.5">Tak for tilliden. Dette tilbud er gældende i 14 dage fra ovenstående dato.</div>
                        <div className="text-[0.4rem] text-slate-400 leading-snug mt-1">Arbejdet udføres i henhold til AB Forbruger (Almindelige Betingelser for byggearbejder). Eventuelle uforudsete forhindringer (skjult råd, svamp, asbest) er ikke inkluderet og udbedres i samråd til gældende timepris.</div>
                    </div>
                    <div className="text-[0.5rem] font-bold text-blue-600 dark:text-blue-400">Åbn i nyt vindue ›</div>
                </div>
                {/* Kol 3 — mail (hele vejen ned: knapper + gyldighed + spørgsmål) */}
                <div className="space-y-1 min-w-0 overflow-hidden">
                    <div className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><MessageSquare size={9} /> Mailen til kunden</div>
                    <div className="text-[0.48rem] text-slate-500">Personlig besked i mailen</div>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 leading-snug text-[0.48rem]">Tak for en god snak. Her er det tilbud, vi aftalte — du kan se og bekræfte det via knappen herunder.<br /><br />Sig endelig til, hvis du har spørgsmål.</div>
                    <div className="rounded-lg bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-center">
                        <div className="w-6 h-6 mx-auto rounded bg-slate-900 mb-1" />
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[0.52rem] mb-1">Thomas Byg</div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.66rem] mb-1">Dit tilbud er klar!</div>
                        <div className="text-slate-500 leading-snug text-[0.46rem] mb-1.5">Hej kunde, tak for en god snak. Her er det tilbud, vi aftalte…</div>
                        <div className="inline-flex mx-auto px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[0.46rem]">Se som PDF</div>
                        <div className="rounded-md bg-emerald-500 text-white font-bold py-1 text-[0.5rem] mt-1 flex items-center justify-center gap-1"><CheckCircle size={9} /> Bekræft tilbud her</div>
                        <div className="text-[0.42rem] text-slate-400 italic leading-snug mt-1">Linket fører til en sikker portal, hvor kunden kan læse hele tilbuddet og bekræfte opgaven.</div>
                        <div className="text-[0.42rem] text-slate-400 mt-1">Tilbuddet er gyldigt i <b className="text-slate-600 dark:text-slate-300">14 dage</b> fra dato.</div>
                    </div>
                    <div className="rounded-md border-l-2 border-blue-500 bg-blue-50/60 dark:bg-blue-500/10 px-1.5 py-1">
                        <div className="font-bold text-blue-700 dark:text-blue-300 text-[0.46rem]">Har du spørgsmål eller ændringer?</div>
                        <div className="text-slate-500 leading-snug text-[0.42rem]">Er der noget, vi skal rette, kan du blot besvare denne e-mail — så sender vi en opdateret version.</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div><div className="text-[0.5rem] text-slate-400">I alt inkl. moms</div><div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">0,00 kr</div></div>
                <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[0.64rem] font-bold text-slate-700 dark:text-slate-300">Gem kladde</span>
                    <span ref={sendRef} className={`px-3 py-1.5 rounded-lg text-white text-[0.64rem] font-bold inline-flex items-center gap-1 transition-colors ${sent ? 'bg-emerald-600' : 'bg-emerald-500'}`}><Send size={11} /> {sent ? 'Sender…' : 'Send tilbud'}</span>
                </div>
            </div>
            <AnimatePresence>
                {sent && (
                    <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm rounded-2xl">
                        <motion.div initial={{ scale: 0.8, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="flex flex-col items-center gap-2">
                            <span className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle size={26} /></span>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Tilbud sendt!</div>
                            <div className="text-[0.62rem] text-slate-500">Kunden har fået det på mail.</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
    const STEP_DUR = [800, 900, 450, 1400, 450, 1500, 450, 1600];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const btnRef = useRef(null);
    const cardRef = useRef(null);
    const sendRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const clicking = step === 2 || step === 4 || step === 6;
    const btnActive = step === 1 || step === 2;
    const showModal = step === 3 || step === 4;
    const showQuote = step >= 5;
    const sent = step === 7;
    useLayoutEffect(() => {
        const cont = containerRef.current;
        if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => {
            if (!el) return fb;
            const r = el.getBoundingClientRect();
            return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 };
        };
        let t;
        if (step === 1 || step === 2) t = center(btnRef.current, { x: 45, y: 12 });
        else if (step === 3 || step === 4) t = center(cardRef.current, { x: 37, y: 50 });
        else if (step >= 5) t = center(sendRef.current, { x: 78, y: 92 });
        else t = { x: 50, y: 92 };
        setPos(t);
    }, [step]);
    return (
        <div ref={containerRef} className="relative h-full">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">Velkommen tilbage, Thomas!</h2>
                <div className="flex items-center gap-2 flex-nowrap">
                    <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 shrink-0">Her er dit visuelle overblik for forretningen lige nu.</p>
                    <motion.button ref={btnRef} animate={{ scale: btnActive ? 1.08 : 1 }} transition={{ duration: 0.2 }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[0.7rem] font-bold shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.32)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
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
            <AnimatePresence>{showModal && <OpretSagModal key="m" cardRef={cardRef} />}</AnimatePresence>
            <AnimatePresence>{showQuote && <HurtigtTilbudScreen key="q" sendRef={sendRef} sent={sent} />}</AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// Kunde-detalje modal (åbnes når musen klikker et kundekort)
function CustomerDetailModal({ tab, overblikRef, sagerRef, tilbudRef }) {
    const tabCls = (t) => `pb-2 flex items-center gap-1.5 border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400'}`;
    const pill = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300';
    const stat = 'rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-3';
    return (
        <motion.div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/70 dark:border-slate-800 p-4 w-[92%] max-w-[560px]">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <span className="w-11 h-11 rounded-[13px] flex items-center justify-center font-extrabold text-sm shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">SA</span>
                    <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">Søren Andersen</div>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400"><Users size={9} /> Privatkunde</span>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0"><X size={13} /></span>
                </div>
                {/* Kontakt-pills */}
                <div className="flex gap-2 flex-wrap mb-3 text-[0.6rem] font-medium">
                    <span className={pill}><Phone size={10} className="text-blue-500" /> +45 40 12 34 56</span>
                    <span className={pill}><Mail size={10} className="text-blue-500" /> soren.andersen@gmail.com</span>
                    <span className={pill}><MapPin size={10} className="text-blue-500" /> Birkevej 12, 8210 Aarhus V</span>
                </div>
                {/* Handlinger */}
                <div className="flex gap-2 mb-3 text-[0.66rem] font-bold">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white shadow-[0_4px_14px_rgba(37,99,235,0.32)]" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><FileText size={12} /> Lav tilbud til Søren</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"><Pencil size={12} /> Rediger</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400"><Trash2 size={12} /> Slet</span>
                </div>
                {/* Faner */}
                <div className="flex gap-5 border-b border-slate-100 dark:border-slate-800 mb-3 text-[0.72rem] font-bold">
                    <span ref={overblikRef} className={tabCls('overblik')}><Sparkles size={12} /> Overblik</span>
                    <span ref={sagerRef} className={tabCls('sager')}><Briefcase size={12} /> Sager (1)</span>
                    <span ref={tilbudRef} className={tabCls('tilbud')}><FileText size={12} /> Tilbud (0)</span>
                </div>
                {/* Indhold */}
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                        {tab === 'overblik' && (
                            <div>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    <div className={stat}><div className="flex items-center gap-1 text-[0.55rem] font-bold text-blue-500 mb-1"><Briefcase size={10} /> Sager</div><div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">1</div></div>
                                    <div className={stat}><div className="flex items-center gap-1 text-[0.55rem] font-bold text-indigo-500 mb-1"><FileText size={10} /> Tilbud</div><div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">0</div></div>
                                    <div className={stat}><div className="flex items-center gap-1 text-[0.55rem] font-bold text-blue-500 mb-1"><FileText size={10} /> Aftalt værdi</div><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">215.000 kr</div></div>
                                    <div className={stat}><div className="flex items-center gap-1 text-[0.55rem] font-bold text-slate-400 mb-1"><Wallet size={10} /> Faktureret</div><div className="text-xs font-bold text-slate-400 pt-1.5">Endnu ikke</div></div>
                                </div>
                                <div className="text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 mb-2">Seneste aktivitet</div>
                                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-3">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0"><Briefcase size={14} /></span>
                                    <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Nyt tag</div><div className="text-[0.6rem] text-emerald-600 dark:text-emerald-400 font-semibold">● Bekræftet opgave · 2. jul. 2026</div></div>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">215.000 kr</span>
                                </div>
                            </div>
                        )}
                        {tab === 'sager' && (
                            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-3">
                                <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0"><Briefcase size={14} /></span>
                                <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Nyt tag</div><div className="text-[0.6rem] text-emerald-600 dark:text-emerald-400 font-semibold">● Bekræftet opgave · 2. jul. 2026</div></div>
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">215.000 kr</span>
                            </div>
                        )}
                        {tab === 'tilbud' && (
                            <div className="text-center text-[0.7rem] text-slate-400 py-8">Ingen tilbud på denne kunde endnu.</div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
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
    const STEP_DUR = [800, 900, 450, 1300, 450, 1200, 450, 1100, 450, 1500];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const overblikRef = useRef(null);
    const sagerRef = useRef(null);
    const tilbudRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const hovered = (step === 1 || step === 2) ? 0 : -1;
    const clicking = step === 2 || step === 4 || step === 6 || step === 8;
    const showModal = step >= 3;
    const tab = (step === 4 || step === 5) ? 'sager' : (step === 6 || step === 7) ? 'tilbud' : 'overblik';
    useLayoutEffect(() => {
        const cont = containerRef.current;
        if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        let t;
        if (step === 1 || step === 2) t = center(cardRef.current, { x: 26, y: 58 });
        else if (step === 3 || step === 4) t = center(sagerRef.current, { x: 46, y: 44 });
        else if (step === 5 || step === 6) t = center(tilbudRef.current, { x: 56, y: 44 });
        else if (step >= 7) t = center(overblikRef.current, { x: 36, y: 44 });
        else t = { x: 50, y: 92 };
        setPos(t);
    }, [step]);
    return (
        <div ref={containerRef} className="relative h-full">
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
                    <motion.div key={c.name} ref={i === 0 ? cardRef : null} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: active ? -5 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24, opacity: { delay: 0.06 * i } }}
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
            <AnimatePresence>{showModal && <CustomerDetailModal key="cd" tab={tab} overblikRef={overblikRef} sagerRef={sagerRef} tilbudRef={tilbudRef} />}</AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Tilbud & Forespørgsler ─────────────────────────────────────────────────
function LeadsScreen() {
    const STEP_DUR = [800, 1000, 450, 1100, 450, 1800, 900, 450, 1800];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const nyRef = useRef(null);
    const sendtRef = useRef(null);
    const bekraeftetRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const clicking = step === 2 || step === 4 || step === 7;
    const folder = (step === 7 || step === 8) ? 'bekraeftet' : (step >= 4 && step <= 6) ? 'sendt' : 'ny';
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        let t;
        if (step === 1 || step === 2) t = center(nyRef.current, { x: 30, y: 15 });
        else if (step === 3 || step === 4 || step === 5) t = center(sendtRef.current, { x: 48, y: 15 });
        else if (step >= 6) t = center(bekraeftetRef.current, { x: 66, y: 15 });
        else t = { x: 50, y: 92 };
        setPos(t);
    }, [step]);

    const folders = [
        { id: 'kladder', txt: 'Tilbudskladder', n: 2 },
        { id: 'ny', txt: 'Ny forespørgsel', n: 16, ref: nyRef },
        { id: 'sendt', txt: 'Sendt tilbud', n: 2, ref: sendtRef },
        { id: 'bekraeftet', txt: 'Bekræftet opgave', n: 3, ref: bekraeftetRef },
        { id: 'bero', txt: 'Sæt i bero', n: 0 },
        { id: 'historik', txt: 'Historik', n: 1 },
    ];
    const badge = (txt, cls) => <span className={`px-2 py-0.5 rounded-full text-[0.58rem] font-bold ${cls}`}>{txt}</span>;

    return (
        <div ref={containerRef} className="relative h-full">
            <div className="mb-3">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Kunder & Forespørgsler</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Her styrer du dine kunder hele vejen — fra forespørgsel til færdig opgave.</p>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {folders.map((f) => {
                    const active = folder === f.id;
                    return (
                        <span key={f.id} ref={f.ref || null} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.68rem] font-bold whitespace-nowrap transition-colors ${active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-500/40' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
                            {f.txt}<span className={active ? 'text-indigo-500' : 'text-slate-400'}>{f.n}</span>
                        </span>
                    );
                })}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={folder} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-3">
                    {folder === 'ny' && [
                        { name: 'Søren Andersen', task: 'Tag', date: '2.7.2026 kl. 11.14' },
                        { name: 'Mette Holm', task: 'Nyt gulv', date: '1.7.2026 kl. 09.30' },
                    ].map((l) => (
                        <div key={l.name} className={`${glass} rounded-2xl p-4`}>
                            <div className="flex items-start justify-between mb-2">
                                <div><div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.name}</div><div className="text-[0.66rem] text-slate-400 mt-0.5">Modtaget: {l.date}</div></div>
                                {badge('Ny forespørgsel', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300')}
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> {l.task}</div>
                            <div className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"><Clock size={11} /> Afventer tilbud</div>
                        </div>
                    ))}
                    {folder === 'sendt' && [
                        { name: 'Jensen Byg ApS', task: 'Tilbygning', date: '1.7.2026', price: '92.750 kr.', opened: false },
                        { name: 'P. Mikkelsen', task: 'Nyt tag', date: '30.6.2026', price: '148.000 kr.', opened: true },
                    ].map((l) => (
                        <div key={l.name} className={`${glass} rounded-2xl p-4`}>
                            <div className="flex items-start justify-between mb-2">
                                <div><div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.name}</div><div className="text-[0.66rem] text-slate-400 mt-0.5">Sendt: {l.date}</div></div>
                                {badge('Sendt tilbud', 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300')}
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> {l.task}</div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-1.5"><span className="text-[0.6rem] text-slate-400">Tilbudspris </span><span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{l.price}</span></div>
                                {l.opened
                                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.64rem] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Eye size={12} /> Åbnet af kunden · set 2 gange</span>
                                    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.64rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"><Send size={11} /> Afventer svar</span>}
                            </div>
                        </div>
                    ))}
                    {folder === 'bekraeftet' && (
                        <div className={`${glass} rounded-2xl p-4`}>
                            <div className="flex items-start justify-between mb-2">
                                <div><div className="font-bold text-sm text-slate-900 dark:text-slate-100">Søren Andersen</div><div className="text-[0.66rem] text-slate-400 mt-0.5">Modtaget: 2.7.2026 kl. 11.14</div></div>
                                {badge('Bekræftet opgave', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300')}
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 mb-2"><Wrench size={12} className="text-blue-500" /> Tag</div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    <div><div className="text-[0.58rem] font-bold text-emerald-600 dark:text-emerald-400">Accepteret tilbud</div><div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">215.000 kr. <span className="text-[0.55rem] font-medium">inkl. moms</span></div></div>
                                </div>
                                <div className="text-[0.62rem] text-slate-500 dark:text-slate-400 space-y-1 flex flex-col justify-center">
                                    <div className="flex items-center gap-1.5"><Phone size={10} className="text-slate-400" /> +45 40 12 34 56</div>
                                    <div className="flex items-center gap-1.5"><MapPin size={10} className="text-slate-400" /> Birkevej 12, 8210 Aarhus V</div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[0.66rem] font-bold">Se Opgavedetaljer</span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[0.66rem] font-bold"><FileText size={12} /> Regnskabsprogram</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Sager & Ordrestyring ───────────────────────────────────────────────────
// Sags-detalje (åbnes når musen klikker en sag) — overblik + under-faner
function CaseDetailView({ scrolled, subtab, refs }) {
    const chip = (id, txt, color) => {
        const active = subtab === id;
        return <span ref={refs[id] || null} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.62rem] font-bold whitespace-nowrap border transition-colors ${active ? `${color}` : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>{txt}</span>;
    };
    return (
        <motion.div className="absolute inset-0 z-40 rounded-2xl bg-[#f6f8fb] dark:bg-slate-950 overflow-hidden flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.08) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(249,115,22,0.08) 0%, transparent 55%)' }}>
            <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="inline-flex items-center gap-1 text-[0.62rem] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1 mb-2">← Tilbage til sagsliste</div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Sag 142 - Nyt tag</h3>
                <div className="text-[0.62rem] text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin size={10} /> Birkevej 12, 8210 Aarhus V <span className="text-slate-300">|</span> Kunde: Søren Andersen</div>
            </div>
            <div className="flex-1 min-h-0 px-4 pb-3">
                <AnimatePresence mode="wait">
                    {!scrolled ? (
                        <motion.div key="ov" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 text-[0.62rem] font-bold"><MessageSquare size={11} /> Åben Chat</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[0.62rem] font-bold"><MessageSquare size={11} /> Dagens Besked</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[0.62rem] font-bold shadow-[0_4px_14px_rgba(16,185,129,0.3)]" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}><Wallet size={11} /> Opret Faktura</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[0.62rem] font-bold">Skift Status ›</span>
                                <div className="flex items-center gap-2 ml-auto"><span className="text-[0.58rem] text-slate-400 font-bold">Færdiggørelse</span><div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full w-[65%] bg-emerald-500" /></div><span className="text-[0.62rem] font-bold text-slate-700 dark:text-slate-300">65%</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 p-3">
                                    <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center"><Clock size={13} /></span><div><div className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100">Tidsregistrering</div><div className="text-[0.5rem] text-slate-400">Status på timebudgettet</div></div></div>
                                    <div className="flex items-end justify-between"><div className="text-base font-extrabold text-slate-900 dark:text-slate-100">41,75 <span className="text-[0.58rem] text-slate-400 font-medium">/ 125 timer</span></div><span className="text-[0.62rem] font-bold text-emerald-600">33%</span></div>
                                    <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-500/20 overflow-hidden my-1.5"><div className="h-full w-1/3 bg-emerald-500 rounded-full" /></div>
                                    <div className="text-[0.55rem] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-2 py-1">Du har 83,25 timer tilbage at gøre godt med.</div>
                                </div>
                                <div className={`${glass} rounded-xl p-3`}>
                                    <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center"><Wrench size={13} /></span><div><div className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100">Materialer</div><div className="text-[0.5rem] text-slate-400">Indkøbs- & leveringsstatus</div></div></div>
                                    <div className="flex gap-1.5 mb-2">
                                        <span className="px-2 py-0.5 rounded-full text-[0.52rem] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">● Bestilt</span>
                                        <span className="px-2 py-0.5 rounded-full text-[0.52rem] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800">Ikke leveret endnu</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[0.55rem] border-t border-slate-100 dark:border-slate-800 pt-1.5"><div><div className="text-slate-400 font-bold uppercase tracking-wide">Forbrugt / budget</div><div className="font-bold text-slate-700 dark:text-slate-300">69.500 / 66.637 kr.</div></div><div className="text-right"><div className="text-slate-400 font-bold uppercase tracking-wide">Restbudget</div><div className="font-extrabold text-rose-500">-2.863 kr.</div></div></div>
                                </div>
                            </div>
                            <div className={`${glass} rounded-xl p-3`}>
                                <div className="flex items-center justify-between mb-2"><div className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100">Holdet på sagen</div><span className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[0.55rem] font-bold">Gem holdet</span></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-[0.6rem] font-bold text-slate-700 dark:text-slate-300"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-500/30 text-amber-700 flex items-center justify-center text-[0.48rem] font-extrabold">KH</span> Kasper Holm · <span className="text-amber-600">Projektleder</span></span>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[0.58rem] font-bold text-slate-400"><Plus size={10} /> Tilføj til holdet</span>
                                </div>
                                <div className="text-[0.52rem] font-bold uppercase tracking-wide text-violet-500 mb-1.5">🏢 Eksterne underleverandører (1)</div>
                                <div className="rounded-lg border border-violet-100 dark:border-violet-500/20 bg-violet-50/40 dark:bg-violet-500/5 px-2.5 py-2 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-[0.62rem]">Hansen El <span className="text-violet-600 dark:text-violet-400 font-semibold">· Elektriker</span></div><span className="text-[0.55rem] text-slate-500">Marius Hansen · 12 34 56 78</span>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="tabs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full flex flex-col min-h-0">
                            <div className="flex gap-1.5 mb-3 flex-wrap shrink-0">
                                {chip('todo', 'Bygge To-Do (KS)', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40')}
                                {chip('materialer', 'Materialer & Indkøb', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/40')}
                                {chip('byggeproces', 'Byggeproces', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40')}
                                {chip('timer', 'Timeregistrering', 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/40')}
                                {chip('bilag', 'Bilag', 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/40')}
                                {chip('aftalesedler', 'Aftalesedler', 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/40')}
                                {chip('tegninger', 'Tegninger', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/40')}
                            </div>
                            <div className={`${glass} rounded-xl p-3 flex-1 min-h-0 overflow-hidden text-[0.6rem]`}>
                                <AnimatePresence mode="wait">
                                    <motion.div key={subtab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2">
                                        {subtab === 'todo' && (<>
                                            <div className="font-bold text-slate-700 dark:text-slate-300 text-[0.66rem] mb-1">Udførelsesmetode & Bygge-anvisninger</div>
                                            {[['Opstart & forberedelse', '2 / 2'], ['Udførelse', 'Udført'], ['Afslutning & oprydning', 'Udført'], ['Aflevering & KS', '2 / 2']].map(([t, s]) => (
                                                <div key={t} className="flex items-center gap-2 rounded-lg border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 px-2.5 py-1.5">
                                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /><span className="font-bold text-emerald-700 dark:text-emerald-300 flex-1">{t}</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">{s}</span>
                                                </div>
                                            ))}
                                        </>)}
                                        {subtab === 'byggeproces' && (<>
                                            <div className="flex items-center justify-between mb-1"><div className="font-bold text-slate-700 dark:text-slate-300 text-[0.66rem]">Projektets byggeproces</div><span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white font-bold"><Plus size={10} /> Tilføj status</span></div>
                                            {[
                                                { init: 'KH', av: 'bg-amber-200 text-amber-700', name: 'Kasper Holm', role: 'PROJEKTLEDER', time: 'I dag kl. 14.02', text: 'Tagpap brændt på ved 25° hældning. Stern sat hele vejen rundt og klemlister monteret med korrekt afstand.', imgs: 2 },
                                                { init: 'TN', av: 'bg-blue-200 text-blue-700', name: 'Thomas', role: 'MESTER', time: '26. jun. kl. 08.10', text: 'Materialer leveret på pladsen — alt stemmer med bestillingen. Stillads er sikret.', imgs: 1 },
                                                { init: 'KH', av: 'bg-amber-200 text-amber-700', name: 'Kasper Holm', role: 'PROJEKTLEDER', time: '24. jun. kl. 18.17', text: 'Nedrivning af gammelt tag færdig. Klar til at lægge nyt undertag i morgen.', imgs: 0 },
                                            ].map((p, i) => (
                                                <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.48rem] font-extrabold ${p.av}`}>{p.init}</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[0.62rem]">{p.name}</span>
                                                        <span className="text-[0.48rem] font-bold tracking-wide text-slate-400">{p.role}</span>
                                                        <span className="ml-auto text-[0.5rem] text-slate-400">{p.time}</span>
                                                    </div>
                                                    <div className="text-slate-600 dark:text-slate-300 text-[0.58rem] leading-snug mb-1">{p.text}</div>
                                                    {p.imgs > 0 && (
                                                        <div className="flex gap-1.5">
                                                            {Array.from({ length: p.imgs }).map((_, k) => (
                                                                <div key={k} className="w-14 h-10 rounded-md bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400"><FileText size={12} /></div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>)}
                                        {subtab === 'timer' && (<>
                                            <div className="grid grid-cols-3 gap-2 mb-1">
                                                {[['Forbrug', '0 t', 'text-slate-700 dark:text-slate-300'], ['Dine timer', '0,00 t', 'text-slate-700 dark:text-slate-300'], ['Underlev. timer', '7,50 t', 'text-fuchsia-600 dark:text-fuchsia-400']].map(([l, v, c]) => (
                                                    <div key={l} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-center"><div className="text-[0.5rem] font-bold uppercase tracking-wide text-slate-400 mb-1">{l}</div><div className={`text-sm font-extrabold ${c}`}>{v}</div></div>
                                                ))}
                                            </div>
                                            <div className="rounded-lg bg-slate-900 text-white text-center py-2 font-bold text-[0.64rem] flex items-center justify-center gap-1"><Plus size={11} /> Tilføj timer</div>
                                            <div className="rounded-lg border border-fuchsia-100 dark:border-fuchsia-500/20 bg-fuchsia-50/50 dark:bg-fuchsia-500/5 px-2.5 py-2 flex items-center justify-between"><div><div className="font-bold text-slate-800 dark:text-slate-200">Hansen El</div><div className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold">7,50 timer i alt på sagen</div></div><span className="px-2 py-1 rounded-md bg-fuchsia-600 text-white font-bold">Afstem faktura</span></div>
                                        </>)}
                                        {subtab === 'materialer' && (<>
                                            <div className="grid grid-cols-3 gap-2 mb-1">
                                                {[['Budget', '200.000 kr', 'text-slate-900 dark:text-slate-100'], ['Forbrugt', '245.000 kr', 'text-slate-900 dark:text-slate-100'], ['Rest', '-45.000 kr', 'text-rose-500']].map(([l, v, c]) => (
                                                    <div key={l} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-center"><div className="text-[0.5rem] font-bold uppercase tracking-wide text-slate-400 mb-1">{l}</div><div className={`text-[0.66rem] font-extrabold ${c}`}>{v}</div></div>
                                                ))}
                                            </div>
                                            {[['Trælast A/S bilag', '222.000 kr'], ['Tag-materialer', '23.000 kr']].map(([t, v]) => (
                                                <div key={t} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"><div className="flex items-center gap-2"><FileText size={12} className="text-blue-500" /><span className="font-bold text-slate-800 dark:text-slate-200">{t}</span></div><div className="flex items-center gap-2"><span className="font-bold text-slate-700 dark:text-slate-300">{v}</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">● Bestilt</span></div></div>
                                            ))}
                                        </>)}
                                        {subtab === 'bilag' && (<>
                                            <div className="flex items-center justify-between mb-1"><div className="font-bold text-slate-700 dark:text-slate-300 text-[0.66rem]">Fakturaer & Udgifter</div><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold">3 bilag</span></div>
                                            {[['Faktura Hansen El', 'Underentreprenør', '- 65.000 kr.'], ['Trælast A/S bilag', 'Materialer', '- 222.000 kr.'], ['Tag-materialer', 'Materialer', '- 23.000 kr.']].map(([t, cat, v]) => (
                                                <div key={t} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"><div className="flex items-center gap-2"><FileText size={12} className="text-emerald-500" /><div><span className="font-bold text-slate-800 dark:text-slate-200">{t}</span> <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[0.5rem] font-bold">{cat}</span></div></div><span className="font-extrabold text-rose-500">{v}</span></div>
                                            ))}
                                        </>)}
                                        {subtab === 'aftalesedler' && (
                                            <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
                                                <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-500 flex items-center justify-center"><PenTool size={18} /></span>
                                                <div className="font-bold text-slate-700 dark:text-slate-300 text-[0.66rem]">Aftalesedler (Ekstraarbejde)</div>
                                                <div className="text-slate-400 text-[0.58rem] max-w-[220px]">Beder kunden om noget ekstra, opretter du en aftaleseddel her og får deres underskrift med det samme.</div>
                                                <span className="px-2.5 py-1 rounded-lg bg-violet-600 text-white font-bold mt-1">+ Opret Ny Aftale</span>
                                            </div>
                                        )}
                                        {subtab === 'tegninger' && (
                                            <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
                                                <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center"><PenTool size={18} /></span>
                                                <div className="font-bold text-slate-700 dark:text-slate-300 text-[0.66rem]">Ingen tegninger på denne sag endnu</div>
                                                <div className="flex gap-2"><span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">Upload tegning</span><span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold">Tegn ny skitse</span></div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function CasesScreen() {
    const cases = [
        { date: '2.7.2026', no: '142', title: 'Nyt tag', customer: 'Søren Andersen', addr: 'Birkevej 12, 8210 Aarhus V', pct: 50, timer: '15 t', pm: { init: 'KH', name: 'Kasper Holm' } },
        { date: '1.7.2026', no: '138', title: 'Tilbygning', customer: 'Jensen Byg ApS', addr: 'Bragesvej 5, 8680 Ry', pct: 0, timer: '0 t / 40 t', pm: null },
    ];
    const STEP_DUR = [700, 800, 450, 1700, 1500, 450, 1400, 450, 1700, 450, 1400, 450, 1400, 450, 1300, 450, 1500];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const refs = { todo: useRef(null), materialer: useRef(null), byggeproces: useRef(null), timer: useRef(null), bilag: useRef(null), aftalesedler: useRef(null), tegninger: useRef(null) };
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const showDetail = step >= 2;
    const scrolled = step >= 4;
    const clicking = [2, 5, 7, 9, 11, 13, 15].includes(step);
    const cardActive = step === 1 || step === 2;
    const subtab = step <= 4 ? 'todo' : (step <= 6) ? 'materialer' : (step <= 8) ? 'byggeproces' : (step <= 10) ? 'timer' : (step <= 12) ? 'bilag' : (step <= 14) ? 'aftalesedler' : 'tegninger';
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        let t;
        if (step === 1 || step === 2) t = center(cardRef.current, { x: 26, y: 62 });
        else if (step === 3) t = { x: 50, y: 26 };
        else if (step === 4) t = center(refs.todo.current, { x: 18, y: 28 });
        else if (step === 5 || step === 6) t = center(refs.materialer.current, { x: 33, y: 28 });
        else if (step === 7 || step === 8) t = center(refs.byggeproces.current, { x: 48, y: 28 });
        else if (step === 9 || step === 10) t = center(refs.timer.current, { x: 62, y: 28 });
        else if (step === 11 || step === 12) t = center(refs.bilag.current, { x: 74, y: 28 });
        else if (step === 13 || step === 14) t = center(refs.aftalesedler.current, { x: 84, y: 28 });
        else if (step >= 15) t = center(refs.tegninger.current, { x: 93, y: 28 });
        else t = { x: 50, y: 92 };
        setPos(t);
    }, [step]);
    return (
        <div ref={containerRef} className="relative h-full">
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
                    <motion.div key={c.no} ref={i === 0 ? cardRef : null} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: (cardActive && i === 0) ? -5 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24, opacity: { delay: 0.08 * i } }}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-shadow duration-300 ${(cardActive && i === 0) ? 'border-emerald-200 dark:border-emerald-500/40 shadow-[0_16px_38px_rgba(15,23,42,0.10)]' : 'border-slate-100 dark:border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'}`}>
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
            <AnimatePresence>{showDetail && <CaseDetailView key="cd" scrolled={scrolled} subtab={subtab} refs={refs} />}</AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Kalender ───────────────────────────────────────────────────────────────
function CalendarScreen() {
    const STEP_DUR = [900, 1200, 400, 1400, 400, 1700];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const dayRef = useRef(null);
    const planRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const showPopup = step === 2 || step === 3;
    const planned = step >= 4;
    const clicking = step === 2 || step === 4;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        let t;
        if (step === 1 || step === 2) t = center(dayRef.current, { x: 46, y: 40 });
        else if (step === 3 || step === 4) t = center(planRef.current, { x: 50, y: 46 });
        else if (step === 5) t = center(dayRef.current, { x: 46, y: 40 });
        else t = { x: 50, y: 92 };
        setPos(t);
    }, [step]);
    const events = { 8: '285: Tag', 9: '285: Tag', 10: '285: Tag', 14: '285: Tag', 15: '285: Tag' };
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return (
        <div ref={containerRef} className="relative h-full">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Juli 2026</h2>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-[0.58rem] text-slate-400"><Search size={11} /> Søg i kalender…</div>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-[0.58rem] font-bold text-slate-700 dark:text-slate-300"><Users size={11} className="text-blue-500" /> Alle medarbejdere <ChevronDown size={11} className="text-slate-400" /></div>
                <span className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[0.62rem] font-bold"><Plus size={11} /> Ny Aftale</span>
            </div>
            <div className="flex items-center gap-1.5 mb-3 text-[0.6rem] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">Måned</span>
                <span className="px-2.5 py-1 rounded-lg text-slate-400">Uge</span>
                <span className="px-2.5 py-1 rounded-lg text-slate-400">År</span>
                <span className="px-2.5 py-1 rounded-lg text-slate-400 inline-flex items-center gap-1"><Users size={10} /> Personale</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-slate-400"><span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">‹</span><span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">I dag</span><span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">›</span></span>
            </div>
            <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-7 gap-1 text-[0.48rem] font-bold text-slate-400 uppercase mb-1">{['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((d) => <div key={d} className="text-center">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((d) => {
                            const isTarget = d === 7;
                            return (
                                <div key={d} ref={isTarget ? dayRef : null} className={`h-9 rounded-md border p-1 text-[0.48rem] transition-colors ${isTarget ? 'border-blue-300 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/5' : 'border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40'}`}>
                                    <div className="text-slate-400 font-bold leading-none">{d}</div>
                                    {events[d] && <div className="mt-0.5 px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold truncate">{events[d]}</div>}
                                    {isTarget && planned && <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-0.5 px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold truncate">142: Nyt tag</motion.div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-32 shrink-0">
                    <div className={`${glass} rounded-xl p-3 h-full`}>
                        <div className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100 mb-1">Klar til planlægning</div>
                        <div className="text-[0.52rem] text-slate-400 mb-2">Træk ind i kalenderen.</div>
                        {!planned ? (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5">
                                <div className="text-[0.55rem] font-bold text-slate-800 dark:text-slate-200">Sag 142 · Nyt tag</div>
                                <div className="text-[0.48rem] text-slate-400">Søren Andersen</div>
                            </div>
                        ) : (
                            <div className="text-[0.52rem] text-slate-400 italic">Ingen sager venter.</div>
                        )}
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {showPopup && (
                    <motion.div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
                        <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/70 dark:border-slate-800 p-4 w-[80%] max-w-[360px]">
                            <div className="flex items-start justify-between mb-3">
                                <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Tilføj til kalenderen</h3><p className="text-[0.6rem] text-slate-400">Tirsdag 7. Juli</p></div>
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><X size={12} /></span>
                            </div>
                            <div ref={planRef} className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 mb-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center shrink-0"><Briefcase size={15} /></span>
                                <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-[0.68rem]">Planlæg en sag</div><div className="text-[0.55rem] text-slate-400">Vælg en sag og læg den i kalenderen</div></div>
                                <ChevronRight size={13} className="text-slate-300" />
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0"><Calendar size={15} /></span>
                                <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-[0.68rem]">Opret kalenderaftale</div><div className="text-[0.55rem] text-slate-400">Møde, levering, arrangement m.m.</div></div>
                                <ChevronRight size={13} className="text-slate-300" />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Intern Chat ────────────────────────────────────────────────────────────
function ChatScreen() {
    const STEP_DUR = [900, 1100, 400, 2400];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const threadRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const opened = step >= 2;
    const clicking = step === 2;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(threadRef.current, { x: 18, y: 40 }));
        else if (step >= 3) setPos({ x: 60, y: 60 });
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const msgs = [
        { me: false, name: 'Kasper Holm', text: 'Vi mangler 3 pakker skruer til i morgen 🔩' },
        { me: true, text: 'Jeg tager dem med — vi ses kl. 7 👍' },
        { me: false, name: 'Kasper Holm', text: 'Super. Tagpappet er brændt på i dag.' },
    ];
    return (
        <div ref={containerRef} className="relative h-full flex gap-3">
            <div className="w-40 shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-2"><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Beskeder</div><span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 text-[0.5rem] font-bold">✨ Realtime</span></div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-[0.55rem] text-slate-400 flex items-center gap-1.5 mb-2"><Search size={10} /> Søg i samtaler…</div>
                <div className="flex gap-1 mb-2 text-[0.52rem] font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white">Alle</span><span className="px-2 py-0.5 rounded-full text-slate-400">Direkte</span><span className="px-2 py-0.5 rounded-full text-slate-400">Sager</span>
                </div>
                <div className="space-y-1.5">
                    <div ref={threadRef} className={`flex items-center gap-2 rounded-lg p-2 border transition-colors ${opened ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0"><HardHat size={12} /></span>
                        <div className="min-w-0"><div className="text-[0.58rem] font-bold text-slate-800 dark:text-slate-200 truncate">Sag 142 · Nyt tag</div><div className="text-[0.5rem] text-slate-400 truncate">Kasper: Vi mangler skruer…</div></div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shrink-0 text-[0.5rem] font-extrabold">KH</span>
                        <div className="min-w-0"><div className="text-[0.58rem] font-bold text-slate-800 dark:text-slate-200 truncate">Kasper Holm</div><div className="text-[0.5rem] text-slate-400 truncate">Ses i morgen 👍</div></div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0"><MessageSquare size={11} /></span>
                        <div className="min-w-0"><div className="text-[0.58rem] font-bold text-slate-800 dark:text-slate-200 truncate">Firma-fællestråd</div><div className="text-[0.5rem] text-slate-400 truncate">Ingen beskeder endnu</div></div>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-w-0 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 flex flex-col">
                <AnimatePresence mode="wait">
                    {!opened ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-4">
                            <span className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 flex items-center justify-center"><MessageSquare size={20} /></span>
                            <div className="text-[0.66rem] font-bold text-slate-400">Vælg en samtale for at starte</div>
                        </motion.div>
                    ) : (
                        <motion.div key="thread" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center"><HardHat size={12} /></span><div className="text-[0.62rem] font-bold text-slate-800 dark:text-slate-200">Sag 142 · Nyt tag</div></div>
                            <div className="flex-1 p-3 space-y-2 overflow-hidden">
                                {msgs.map((m, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.35 }} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-2.5 py-1.5 text-[0.56rem] leading-snug ${m.me ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                                            {!m.me && <div className="text-[0.5rem] font-bold text-slate-400 mb-0.5">{m.name}</div>}
                                            {m.text}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"><div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[0.55rem] text-slate-400">Skriv en besked…</div><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center"><Send size={11} /></span></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Kortvisning ────────────────────────────────────────────────────────────
function MapScreen() {
    const STEP_DUR = [800, 1000, 400, 1300, 900, 400, 1300, 900, 400, 1400];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const refs = { ny: useRef(null), sendt: useRef(null), bekraeftet: useRef(null) };
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const active = step >= 8 ? 'bekraeftet' : step >= 5 ? 'sendt' : step >= 2 ? 'ny' : 'ny';
    const clicking = step === 2 || step === 5 || step === 8;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(refs.ny.current, { x: 20, y: 32 }));
        else if (step === 3 || step === 4 || step === 5) setPos(center(refs.sendt.current, { x: 40, y: 32 }));
        else if (step >= 6) setPos(center(refs.bekraeftet.current, { x: 62, y: 32 }));
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const pins = [
        { cx: 500, cy: 205, cat: 'ny' },        // Aalborg
        { cx: 470, cy: 430, cat: 'sendt' },     // Midtjylland
        { cx: 430, cy: 640, cat: 'bekraeftet' },// Sydjylland
        { cx: 600, cy: 430, cat: 'ny' },        // Aarhus (klynge)
        { cx: 655, cy: 610, cat: 'sendt' },     // Fyn
        { cx: 815, cy: 520, cat: 'bekraeftet' },// Sjælland
        { cx: 875, cy: 548, cat: 'ny' },        // København
    ];
    const catColor = { ny: '#3b82f6', sendt: '#f59e0b', bekraeftet: '#10b981' };
    const pill = (id, ref, txt, dot) => (
        <span ref={ref} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.62rem] font-bold border transition-all ${active === id ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-sm text-slate-900 dark:text-slate-100' : 'bg-white/60 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-500'}`}><span className="w-2 h-2 rounded-full" style={{ background: dot }} /> {txt}</span>
    );
    return (
        <div ref={containerRef} className="relative h-full">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Geografisk Overblik</h2>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 mb-3">Se dine tilbud og forespørgsler direkte på Danmarkskortet.</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {pill('ny', refs.ny, 'Nye forespørgsler', catColor.ny)}
                {pill('sendt', refs.sendt, 'Sendt tilbud', catColor.sendt)}
                {pill('bekraeftet', refs.bekraeftet, 'Bekræftet opgave', catColor.bekraeftet)}
            </div>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[270px]" style={{ background: 'linear-gradient(160deg,#d3ecfb,#a9d6f2)' }}>
                <svg viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
                    {/* Præcist Danmarkskort (mapsicon) */}
                    <DenmarkLand />
                    {/* Kort-markører (pins) */}
                    {pins.map((p, i) => {
                        const on = active === p.cat;
                        return (
                            <motion.g key={i} animate={{ y: on ? [0, -22, 0] : 0, opacity: on ? 1 : 0.4 }} transition={{ y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}>
                                <circle cx={p.cx} cy={p.cy} r={on ? 26 : 16} fill={catColor[p.cat]} stroke="#ffffff" strokeWidth="7" />
                            </motion.g>
                        );
                    })}
                    {/* Klynge */}
                    <g>
                        <circle cx="600" cy="430" r="38" fill="#f59e0b" stroke="#ffffff" strokeWidth="7" />
                        <text x="600" y="430" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="36" fontWeight="800">19</text>
                    </g>
                    {/* Bynavne */}
                    {[['Aalborg', 520, 150], ['Aarhus', 660, 445], ['Odense', 690, 660], ['København', 900, 470]].map(([n, x, y]) => (
                        <text key={n} x={x} y={y} fill="#475569" fontSize="26" fontWeight="600" opacity="0.7">{n}</text>
                    ))}
                </svg>
            </div>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Økonomi & Faktura ──────────────────────────────────────────────────────
function FinanceScreen() {
    const STEP_DUR = [800, 1100, 400, 1600, 1000, 400, 1700];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const opretRef = useRef(null);
    const dineroRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const showKladde = step >= 2;
    const overfoert = step === 6;
    const clicking = step === 2 || step === 5;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(opretRef.current, { x: 88, y: 62 }));
        else if (step === 4 || step === 5 || step === 6) setPos(center(dineroRef.current, { x: 42, y: 88 }));
        else if (step === 3) setPos({ x: 30, y: 40 });
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const kpis = [
        { label: 'Samlet værdi', value: '1.423.294 kr', color: '#3b82f6', icon: Wallet },
        { label: 'Allerede faktureret', value: '0 kr', color: '#10b981', icon: TrendingUp },
        { label: 'Mangler at faktureres', value: '1.423.294 kr', color: '#ef4444', icon: AlertCircle, danger: true },
    ];
    const rows = [
        { sag: 'Sag 261 · Tag på nørregade', kunde: 'Søren Andersen', total: '340.000', mangler: '340.000' },
        { sag: 'Sag 222 · Nye lofter', kunde: 'Mette Holm', total: '286.250', mangler: '286.250' },
        { sag: 'Sag 237 · Nyt gulv', kunde: 'Jensen Byg ApS', total: '252.544', mangler: '252.544' },
    ];
    return (
        <div ref={containerRef} className="relative h-full">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Økonomi & Faktura</h2>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 mb-3">Få overblik over dit cashflow og manglende faktureringer</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {kpis.map((k) => (
                    <div key={k.label} className={`rounded-xl p-3 border ${k.danger ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5' : 'border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60'}`}>
                        <div className="flex items-center gap-1.5 mb-1.5"><span className="p-1 rounded-md" style={{ background: `${k.color}22`, color: k.color }}><k.icon size={12} /></span><span className="text-[0.52rem] font-bold uppercase tracking-wide leading-tight" style={{ color: k.danger ? '#ef4444' : '#64748b' }}>{k.label}</span></div>
                        <div className="text-sm font-extrabold" style={{ color: k.danger ? '#ef4444' : '#0f172a' }}>{k.value}</div>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[0.66rem] font-bold text-slate-900 dark:text-slate-100">Åbne sager med restbeløb</div>
                    <div className="text-[0.55rem] text-slate-400">Fakturér disse sager for at få penge i kassen</div>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-[0.5rem] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <span>Kunde & sag</span><span className="text-right text-rose-500">Manglende</span><span className="text-right">Handling</span>
                </div>
                {rows.map((r, i) => (
                    <div key={r.sag} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <div className="min-w-0"><div className="text-[0.6rem] font-bold text-slate-800 dark:text-slate-200 truncate">{r.sag}</div><div className="text-[0.52rem] text-slate-400">{r.kunde}</div></div>
                        <div className="text-[0.6rem] font-extrabold text-rose-500 text-right">{r.mangler} kr.</div>
                        <span ref={i === 0 ? opretRef : null} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.55rem] font-bold ${i === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Opret Faktura →</span>
                    </div>
                ))}
            </div>
            {/* Faktura-kladde overlay */}
            <AnimatePresence>
                {showKladde && (
                    <motion.div className="absolute inset-0 z-40 rounded-2xl bg-[#f6f8fb] dark:bg-slate-950 overflow-hidden flex flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div><div className="text-[0.55rem] text-slate-400 flex items-center gap-1">← Faktura-kladde</div><div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Søren Andersen · Tag på nørregade</div></div>
                            <span className="text-[0.58rem] font-bold text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">Åbn sag i Ordrestyring →</span>
                        </div>
                        <div className="flex-1 grid grid-cols-[1.4fr_1fr] gap-3 p-3 min-h-0 text-[0.58rem]">
                            <div className="space-y-2">
                                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
                                    <div className="flex items-center justify-between mb-1"><span className="font-bold text-slate-700 dark:text-slate-300">Fakturamodtager</span><span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.5rem] font-bold">Privatkunde</span></div>
                                    <div className="text-slate-800 dark:text-slate-200 font-bold">Søren Andersen</div>
                                    <div className="text-slate-400 text-[0.52rem]">Birkevej 12, 8210 Aarhus V · 40 12 34 56</div>
                                </div>
                                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
                                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1"><FileText size={11} className="text-blue-500" /> Fakturalinjer</div>
                                    <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-950 px-2 py-1.5 mb-1.5"><span className="text-slate-500">Oprindeligt tilbud</span><span className="font-bold text-slate-900 dark:text-slate-100">340.000 kr.</span></div>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5"><span className="font-bold text-slate-800 dark:text-slate-200">Samlet inkl. moms</span><span className="font-extrabold text-slate-900 dark:text-slate-100">340.000 kr.</span></div>
                                </div>
                                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
                                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Hvad skal der faktureres?</div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <div className="rounded-lg border-2 border-blue-400 bg-blue-50/50 dark:bg-blue-500/10 p-2"><div className="text-blue-600 dark:text-blue-300 font-bold flex items-center gap-1"><CheckCircle2 size={11} /> Fakturér alt</div><div className="font-extrabold text-slate-900 dark:text-slate-100 text-[0.66rem]">340.000 kr.</div></div>
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2"><div className="text-slate-500 font-bold">Aconto</div><div className="text-slate-400 text-[0.5rem]">Vælg beløb</div></div>
                                    </div>
                                </div>
                                <div ref={dineroRef} className="rounded-lg bg-slate-900 text-white text-center py-2 font-bold text-[0.64rem] flex items-center justify-center gap-1"><Send size={11} /> Overfør som kladde til Dinero</div>
                            </div>
                            <div className="rounded-lg border border-amber-100 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 p-2.5">
                                <div className="flex items-center justify-between mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Fakturaer & Udgifter</span><span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-[0.5rem] font-bold">3 bilag</span></div>
                                {[['Faktura Hansen El', '-65.000'], ['Trælast A/S bilag', '-222.000'], ['Tag-materialer', '-23.000']].map(([t, v]) => (
                                    <div key={t} className="flex items-center justify-between rounded-md bg-white dark:bg-slate-900 px-2 py-1.5 mb-1"><span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold"><FileText size={10} className="text-emerald-500" /> {t}</span><span className="font-bold text-rose-500">{v} kr.</span></div>
                                ))}
                                <div className="rounded-md bg-slate-900 text-white text-center py-1.5 font-bold text-[0.56rem] mt-1.5">Overfør bilag (3)</div>
                            </div>
                        </div>
                        <AnimatePresence>
                            {overfoert && (
                                <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
                                        <span className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle size={26} /></span>
                                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Overført til Dinero!</div>
                                        <div className="text-[0.6rem] text-slate-500">Fakturakladden ligger klar i dit regnskab.</div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Løn & Timer ────────────────────────────────────────────────────────────
function PayrollScreen() {
    const STEP_DUR = [800, 1200, 400, 2200];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const eksportRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const exported = step >= 3;
    const clicking = step === 2;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step >= 1) setPos(center(eksportRef.current, { x: 18, y: 30 }));
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const kpis = [
        { label: 'Arbejdstimer (md.)', value: '320,00', color: '#3b82f6', icon: Clock },
        { label: 'Kørte km (md.)', value: '240 km', color: '#10b981', icon: TrendingUp },
        { label: 'Fravær / internt', value: '8,00 t', color: '#f59e0b', icon: AlertTriangle },
        { label: 'Gns. feriesaldo', value: '25 dage', color: '#3b82f6', icon: Calendar },
    ];
    const rows = [
        { init: 'KH', av: 'bg-amber-200 text-amber-700', name: 'Kasper Holm', sag: '142 · Nyt tag', tid: '07:00 – 15:00', t: '7,5' },
        { init: 'MS', av: 'bg-blue-200 text-blue-700', name: 'Mikkel Sørensen', sag: '142 · Nyt tag', tid: '07:00 – 15:00', t: '7,5' },
        { init: 'KH', av: 'bg-amber-200 text-amber-700', name: 'Kasper Holm', sag: '138 · Tilbygning', tid: '08:00 – 16:00', t: '8,0' },
    ];
    return (
        <div ref={containerRef} className="relative h-full">
            <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-slate-700 dark:text-slate-300" /><h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Løn & Timer</h2></div>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 mb-3">Kontrol, redigering og eksport af medarbejdernes tids- og kørselsregistreringer.</p>
            <div className="flex items-center gap-1.5 mb-3 flex-wrap text-[0.58rem] font-bold">
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-700 dark:text-slate-300"><Users size={10} /> Alle medarbejdere <ChevronDown size={10} className="text-slate-400" /></span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-700 dark:text-slate-300">Denne måned <ChevronDown size={10} className="text-slate-400" /></span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-500"><Download size={10} /> Eksportér visning</span>
                <span ref={eksportRef} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-2.5 py-1.5"><FileText size={10} /> Løneksport</span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-slate-400"><Lock size={10} /> Auto-låst til 28. jun.</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-2.5">
                        <span className="inline-flex p-1 rounded-md mb-1" style={{ background: `${k.color}22`, color: k.color }}><k.icon size={12} /></span>
                        <div className="text-[0.48rem] font-bold uppercase tracking-wide text-slate-400 leading-tight mb-0.5">{k.label}</div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{k.value}</div>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 overflow-hidden text-[0.58rem]">
                <div className="grid grid-cols-[auto_1.2fr_1fr_1fr_auto] gap-2 px-3 py-1.5 font-bold uppercase tracking-wide text-slate-400 text-[0.48rem] border-b border-slate-100 dark:border-slate-800"><span>Dato</span><span>Medarbejder</span><span>Sag</span><span>Tidsrum</span><span className="text-right">Timer</span></div>
                {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[auto_1.2fr_1fr_1fr_auto] gap-2 items-center px-3 py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <span className="text-slate-400">02. jul</span>
                        <span className="flex items-center gap-1.5 min-w-0"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.45rem] font-extrabold shrink-0 ${r.av}`}>{r.init}</span><span className="font-bold text-slate-800 dark:text-slate-200 truncate">{r.name}</span></span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold truncate">{r.sag}</span>
                        <span className="text-slate-500">{r.tid}</span>
                        <span className="text-right font-extrabold text-slate-900 dark:text-slate-100">{r.t}</span>
                    </div>
                ))}
            </div>
            <AnimatePresence>
                {exported && (
                    <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
                            <span className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle size={26} /></span>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Lønfil klar!</div>
                            <div className="text-[0.6rem] text-slate-500">Eksporteret i Danløn / Salary.dk-format.</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Integrationer ──────────────────────────────────────────────────────────
function IntegrationsScreen() {
    const STEP_DUR = [800, 1200, 400, 1500, 400, 1900];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const loginRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const expanded = step === 2 || step === 3;
    const connected = step >= 4;
    const clicking = step === 2 || step === 4;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(cardRef.current, { x: 88, y: 40 }));
        else if (step === 3 || step === 4 || step === 5) setPos(center(loginRef.current, { x: 50, y: 56 }));
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const connBadge = <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.55rem] font-bold"><CheckCircle2 size={11} /> Forbundet</span>;
    return (
        <div ref={containerRef} className="relative h-full">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Integrationer</h2>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 mb-4">Forbind din profil automatisk til dit foretrukne regnskabsprogram for let overførsel.</p>
            <div className="space-y-2.5">
                {/* Dinero (foldbar — her vises selve forbind-flowet: fold ud → log ind → Forbundet) */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 overflow-hidden">
                    <div ref={cardRef} className="p-3 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-500/20 text-blue-600"><LinkIcon size={16} /></span>
                        <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-[0.7rem]">Dinero Regnskab</div><div className="text-[0.55rem] text-slate-400">Overfør tilbud som fakturakladder</div></div>
                        {connected && connBadge}
                        <ChevronDown size={13} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                    <AnimatePresence>
                        {expanded && !connected && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                                <div className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[0.58rem] text-slate-500 dark:text-slate-400 leading-relaxed my-2.5">Når du har bekræftet en opgave, kan du med ét klik overføre kunden og opgaven til dit Dinero regnskab som en fakturakladde. Tryk på knappen for at godkende adgangen.</p>
                                    <div ref={loginRef} className="rounded-lg text-white text-center py-2 font-bold text-[0.66rem]" style={{ background: '#0ea5e9' }}>Log ind med Dinero</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* e-conomic — det ANDET regnskabsprogram (ikke forbundet; man vælger ét, ikke begge) */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600"><LinkIcon size={16} /></span>
                    <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-[0.7rem]">e-conomic</div><div className="text-[0.55rem] text-slate-400">Danmarks mest brugte regnskabsprogram</div></div>
                    <ChevronDown size={13} className="text-slate-300" />
                </div>
                {/* SMTP — separat e-mail-mulighed (ikke forbundet endnu) */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-500/20 text-rose-600"><Mail size={16} /></span>
                    <div className="flex-1 min-w-0"><div className="font-bold text-slate-900 dark:text-slate-100 text-[0.7rem]">Egen E-mail (SMTP)</div><div className="text-[0.55rem] text-slate-400">Send tilbud via din egen e-mailadresse</div></div>
                    <ChevronDown size={13} className="text-slate-300" />
                </div>
            </div>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Skitser & Tegninger ────────────────────────────────────────────────────
function DrawingsScreen() {
    const STEP_DUR = [800, 1200, 400, 2400];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const btnRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const drawing = step >= 2;
    const clicking = step === 2;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(btnRef.current, { x: 86, y: 22 }));
        else if (step >= 3) setPos({ x: 55, y: 55 });
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const strokes = [
        'M40 150 L40 90 L120 40 L200 90 L200 150 Z', // hus
        'M40 90 L120 40 L200 90',                     // tag
        'M95 150 L95 105 L145 105 L145 150',          // dør
    ];
    return (
        <div ref={containerRef} className="relative h-full">
            <div className={`${glass} rounded-2xl p-3.5 flex items-center gap-3 mb-3`}>
                <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0"><PenTool size={19} /></span>
                <div className="flex-1 min-w-0"><h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Mit Skitse-bibliotek</h2><p className="text-[0.6rem] text-slate-500 dark:text-slate-400 truncate">Tegn frit, og kobl dem senere på dine opgaver.</p></div>
                <span ref={btnRef} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-[0.62rem] font-bold shrink-0"><Plus size={12} /> Opret Ny Skitse</span>
            </div>
            <div className="flex items-center gap-1.5 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 mb-2"><Folder size={12} className="text-blue-500" /> Tilknyttede Sager</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                {[['Sag: 259', '24. jun. 2026'], ['Sag: 285', '2. jul. 2026']].map(([s, d]) => (
                    <div key={s} className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between mb-4"><span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center"><Folder size={15} /></span><span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[0.5rem] font-bold text-slate-500">1 tegning</span></div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[0.66rem]">{s}</div>
                        <div className="text-[0.52rem] text-slate-400">Sidste tegning: {d}</div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-1.5 text-[0.6rem] font-bold text-slate-500 dark:text-slate-400 mb-2"><PenTool size={12} className="text-orange-500" /> Skrivebordet (Løse Kladder)</div>
            <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                    <div key={i} className={`${glass} rounded-xl h-16 flex items-center justify-center`}>
                        <svg viewBox="0 0 120 80" className="w-12 h-9 text-slate-300 dark:text-slate-600"><path d="M20 65 L20 35 L60 15 L100 35 L100 65 Z M20 35 L60 15 L100 35" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /></svg>
                    </div>
                ))}
            </div>
            {/* Tegne-canvas overlay */}
            <AnimatePresence>
                {drawing && (
                    <motion.div className="absolute inset-0 z-40 rounded-2xl bg-white dark:bg-slate-950 flex flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><PenTool size={14} className="text-blue-500" /> Ny skitse</div>
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><X size={13} /></span>
                        </div>
                        <div className="flex-1 m-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.25) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                            <svg viewBox="0 0 240 190" className="w-[70%] h-[80%]">
                                {strokes.map((d, i) => (
                                    <motion.path key={i} d={d} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"
                                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.7, duration: 0.7, ease: 'easeInOut' }} />
                                ))}
                            </svg>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// ── Team & Medarbejdere ────────────────────────────────────────────────────
function TeamScreen() {
    const STEP_DUR = [800, 1000, 400, 1100, 400, 1900];
    const step = useSteps(STEP_DUR);
    const containerRef = useRef(null);
    const roleRef = useRef(null);
    const createRef = useRef(null);
    const [pos, setPos] = useState({ x: 50, y: 92 });
    const dropdownOpen = step === 2;
    const added = step >= 4;
    const clicking = step === 2 || step === 4;
    useLayoutEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const cr = cont.getBoundingClientRect();
        const center = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(); return { x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100, y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100 }; };
        if (step === 1 || step === 2) setPos(center(roleRef.current, { x: 26, y: 62 }));
        else if (step === 3 || step === 4 || step === 5) setPos(center(createRef.current, { x: 26, y: 80 }));
        else setPos({ x: 50, y: 92 });
    }, [step]);
    const field = 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-[0.58rem]';
    return (
        <div ref={containerRef} className="relative h-full">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Dit Team</h2>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 mb-3">Administrer dine medarbejdere og deres adgangsniveau.</p>
            <div className="grid grid-cols-[1fr_1.1fr] gap-3">
                {/* Tilføj medarbejder */}
                <div className={`${glass} rounded-xl p-3`}>
                    <div className="flex items-center gap-2 mb-2.5"><span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center"><UserPlus size={13} /></span><div className="text-[0.66rem] font-bold text-slate-900 dark:text-slate-100">Tilføj Medarbejder</div></div>
                    <div className="space-y-2">
                        <div><div className="text-[0.5rem] font-bold text-slate-500 mb-0.5">FULDE NAVN</div><div className={`${field} text-slate-800 dark:text-slate-200`}>Mikkel Sørensen</div></div>
                        <div><div className="text-[0.5rem] font-bold text-slate-500 mb-0.5">E-MAIL ADRESSE</div><div className={`${field} text-slate-400`}>mikkel@firma.dk</div></div>
                        <div><div className="text-[0.5rem] font-bold text-slate-500 mb-0.5">TELEFON</div><div className={`${field} flex items-center gap-1.5 text-slate-400`}><Phone size={10} className="text-slate-400" /><span className="font-bold text-slate-500">+45</span> 40 12 34 56</div></div>
                        <div className="relative">
                            <div className="text-[0.5rem] font-bold text-slate-500 mb-0.5">ROLLE</div>
                            <div ref={roleRef} className={`${field} flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold`}>Svend <ChevronDown size={12} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} /></div>
                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden text-[0.56rem]">
                                        {['Projektleder', 'Svend', 'Lærling', 'Bogholder'].map((r) => (
                                            <div key={r} className={`px-2.5 py-1.5 ${r === 'Svend' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{r}</div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="text-[0.46rem] text-slate-400 leading-snug">Projektledere ser kun egne leads. Bogholdere ser kun bekræftede opgaver. Svende og lærlinge kan registrere timer og se byggechecklister på sager.</div>
                        <div className="text-[0.5rem] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-2 py-1">$ Gratis — I betaler ikke pr. bruger.</div>
                        <div ref={createRef} className="rounded-lg bg-slate-900 text-white text-center py-2 font-bold text-[0.62rem] flex items-center justify-center gap-1"><UserPlus size={12} /> Opret Medarbejder</div>
                    </div>
                </div>
                {/* Medarbejdere + underlev */}
                <div className="space-y-3">
                    <div className={`${glass} rounded-xl p-3`}>
                        <div className="text-[0.62rem] font-bold text-slate-900 dark:text-slate-100 mb-2">Dine Medarbejdere ({added ? 2 : 1})</div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-[0.48rem] font-extrabold">KH</span>
                                <div className="flex-1 min-w-0"><div className="text-[0.58rem] font-bold text-slate-800 dark:text-slate-200">Kasper Holm</div><div className="text-[0.5rem] text-slate-400">Projektleder</div></div>
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.48rem] font-bold">● Aktiv</span>
                            </div>
                            <AnimatePresence>
                                {added && (
                                    <motion.div initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5 p-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[0.48rem] font-extrabold">MS</span>
                                        <div className="flex-1 min-w-0"><div className="text-[0.58rem] font-bold text-slate-800 dark:text-slate-200">Mikkel Sørensen</div><div className="text-[0.5rem] text-slate-400">Svend</div></div>
                                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[0.48rem] font-bold">● Aktiv</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}><Building2 size={12} /></span>
                                <span className="text-[0.6rem] font-bold text-slate-900 dark:text-slate-100">Underleverandører (2)</span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-white text-[0.5rem] font-bold shadow-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}><Plus size={9} /> Tilføj underleverandør</span>
                        </div>
                        <div className="text-[0.46rem] text-slate-400 leading-snug mb-2">Eksterne partnere (elektriker, VVS, m.m.) uden login. Gemte underleverandører kan tilføjes direkte til en sag under "Holdet på sagen".</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[['Madsen Byg', 'Tømrer', 'Mads Madsen', '45 40 26 50'], ['Hansen El', 'Elektriker', 'Marius Hansen', '12 32 34 56']].map(([n, r, mester, phone]) => (
                                <div key={n} className="rounded-lg border border-violet-100 dark:border-violet-500/20 bg-violet-50/40 dark:bg-violet-500/5 p-2 flex flex-col gap-1.5">
                                    <div className="flex items-start justify-between gap-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0"><Building2 size={11} /></span>
                                            <div className="min-w-0">
                                                <div className="text-[0.55rem] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{n}</div>
                                                <span className="inline-flex items-center gap-0.5 mt-0.5 text-[0.42rem] font-bold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 px-1 py-0.5 rounded-full"><Wrench size={7} /> {r}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 text-slate-300 dark:text-slate-600 shrink-0"><Pencil size={10} /><Trash2 size={10} /></div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 pt-1 border-t border-violet-100 dark:border-violet-500/20 text-[0.44rem] text-slate-500">
                                        <span className="flex items-center gap-1 truncate"><HardHat size={8} className="text-slate-400 shrink-0" /> {mester} <span className="text-slate-400">(mester)</span></span>
                                        <span className="flex items-center gap-1"><Phone size={8} className="text-slate-400 shrink-0" /> {phone}</span>
                                    </div>
                                    <div className="rounded-md text-[0.48rem] font-bold py-1 text-center text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center gap-1"><Send size={8} /> Send gæste-login</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <DemoCursor x={pos.x} y={pos.y} clicking={clicking} />
        </div>
    );
}

// Loop-varighed pr. modul (sum af hver skærms STEP_DUR) — bruges til auto-rotation.
export const LOOP_MS = {
    overview: 8550, customers: 8600, leads: 8750, cases: 16550,
    calendar: 6000, chat: 4800, finance: 7000, payroll: 4600,
    map: 8800, drawings: 4800, integrations: 6200, team: 5600,
};

export function Preview({ id }) {
    let screen = null;
    switch (id) {
        case 'overview': screen = <OverviewScreen />; break;
        case 'customers': screen = <CustomersScreen />; break;
        case 'leads': screen = <LeadsScreen />; break;
        case 'cases': screen = <CasesScreen />; break;
        case 'calendar': screen = <CalendarScreen />; break;
        case 'chat': screen = <ChatScreen />; break;
        case 'finance': screen = <FinanceScreen />; break;
        case 'payroll': screen = <PayrollScreen />; break;
        case 'map': screen = <MapScreen />; break;
        case 'drawings': screen = <DrawingsScreen />; break;
        case 'integrations': screen = <IntegrationsScreen />; break;
        case 'team': screen = <TeamScreen />; break;
        default: return null;
    }
    return <AppFrame activeId={id}>{screen}</AppFrame>;
}
