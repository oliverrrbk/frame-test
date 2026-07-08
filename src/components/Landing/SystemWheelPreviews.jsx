import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Users, FileText, Briefcase, Calendar, MessageSquare, Wallet, MapPin,
    PenTool, Link as LinkIcon, HardHat, Search, Phone, ChevronRight, CheckCircle,
    Send, Inbox, TrendingUp, Wrench, ChevronDown, Plus, ArrowRight, Copy, Mic, Calculator, X, Mail, Sparkles, Pencil, Trash2, Eye, Clock, CheckCircle2, AlertCircle, AlertTriangle, Download, Upload, Package, Lock, Folder, UserPlus, Building2,
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
                    <g transform="translate(0,1024) scale(0.1,-0.1)" fill="#c3e6b8" stroke="#93c987" strokeWidth="18" strokeLinejoin="round">
                        <path d="M5464 10221 c-42 -19 -150 -108 -269 -221 -83 -79 -169 -150 -182 -150 -5 0 -31 -14 -59 -32 -123 -80 -305 -125 -428 -107 -139 21 -145 20 -193 -49 -22 -31 -54 -84 -71 -117 -17 -33 -65 -96 -106 -140 -41 -44 -83 -98 -92 -120 -126 -298 -293 -600 -417 -755 -56 -69 -233 -223 -281 -244 -12 -5 -45 -12 -74 -16 -29 -5 -74 -19 -100 -31 -41 -20 -63 -23 -172 -24 -73 0 -135 4 -150 11 -14 6 -43 15 -65 18 -22 4 -51 14 -64 23 -15 10 -27 11 -33 5 -5 -5 -27 -8 -48 -5 -33 5 -47 -1 -113 -46 -166 -114 -296 -152 -393 -116 -27 10 -53 22 -59 26 -5 4 -34 14 -63 23 -67 19 -81 12 -124 -64 -81 -142 -131 -199 -164 -186 -9 3 -27 -18 -55 -67 -46 -80 -126 -197 -145 -212 -18 -14 -110 -177 -150 -263 -93 -203 -153 -486 -110 -521 9 -7 16 -24 16 -37 0 -28 15 -32 25 -6 4 9 10 61 13 115 2 53 7 97 9 97 3 0 18 -9 34 -21 22 -15 29 -28 29 -53 0 -35 33 -121 50 -131 13 -8 50 -89 50 -109 0 -10 9 -16 23 -16 59 0 102 -23 163 -87 47 -50 63 -74 68 -104 3 -21 11 -39 16 -39 6 0 10 -6 10 -13 0 -18 48 -67 65 -67 19 0 19 -11 -1 -54 -9 -19 -28 -39 -43 -46 -23 -10 -28 -9 -52 18 -14 16 -56 43 -93 61 -65 31 -103 34 -218 22 -4 -1 -13 -20 -19 -43 l-12 -43 -8 30 c-12 54 -10 85 6 85 8 0 15 9 15 20 0 17 -7 20 -44 20 -53 0 -99 30 -78 51 22 23 13 37 -38 55 -27 10 -50 21 -50 25 0 19 14 39 27 39 11 0 13 7 9 25 -4 17 0 34 14 53 18 25 19 31 7 71 l-14 44 -19 -29 c-44 -64 -71 -122 -83 -179 -7 -33 -26 -114 -41 -180 l-29 -120 3 -395 c2 -217 7 -456 11 -530 6 -120 4 -156 -19 -315 -15 -99 -30 -232 -33 -296 -5 -101 -3 -128 17 -200 12 -46 30 -105 40 -130 11 -27 25 -110 34 -200 8 -85 20 -177 25 -204 41 -209 11 -427 -100 -724 -28 -74 -54 -142 -59 -151 -10 -19 13 -60 34 -60 27 0 173 -80 201 -110 17 -18 56 -50 88 -71 31 -22 57 -44 57 -49 0 -6 9 -10 20 -10 16 0 20 7 20 33 0 33 -12 50 -64 95 -26 22 -27 25 -12 41 15 16 14 19 -13 39 -38 28 -44 65 -17 116 18 35 26 41 57 44 50 4 68 -19 38 -47 -22 -20 -22 -22 -7 -53 13 -28 53 -76 166 -204 10 -11 26 -25 37 -31 29 -16 12 -43 -28 -43 -35 0 -57 -13 -76 -45 -11 -18 -12 -17 -6 7 7 34 -8 36 -29 6 -22 -30 -21 -33 19 -75 46 -48 116 -192 123 -249 6 -53 36 -80 77 -70 28 7 49 45 34 60 -5 6 -9 18 -9 28 0 9 -8 33 -17 53 -14 29 -14 39 -4 58 10 20 10 32 -2 68 -15 45 -42 63 -53 34 -10 -26 -34 3 -34 42 0 41 20 52 56 28 23 -15 28 -15 40 -3 23 23 150 3 194 -30 19 -15 45 -32 59 -37 21 -9 30 -32 68 -160 52 -180 51 -206 -6 -224 -21 -6 -44 -18 -51 -26 -7 -9 -29 -15 -54 -15 -68 0 -106 -43 -77 -88 15 -24 60 -3 76 34 8 19 19 34 24 34 6 0 27 11 47 25 20 14 42 25 48 25 13 0 15 -79 2 -99 -5 -8 -4 -16 2 -20 22 -13 31 -57 21 -101 -6 -26 -6 -46 -1 -49 7 -5 42 -165 42 -193 0 -5 -9 -8 -20 -8 -25 0 -26 -16 -3 -29 17 -9 17 -13 -1 -68 -11 -32 -25 -67 -31 -78 -7 -11 -20 -57 -30 -101 l-17 -81 26 -89 c30 -102 31 -128 11 -204 -8 -30 -15 -70 -15 -87 0 -34 5 -37 60 -34 14 1 40 -9 59 -23 29 -21 41 -24 79 -19 25 3 57 12 72 20 34 17 70 16 91 -3 15 -14 22 -14 61 -1 73 25 210 -9 282 -70 28 -23 34 -24 120 -18 86 6 93 5 127 -18 20 -14 52 -28 70 -32 48 -10 59 -22 53 -54 -8 -39 20 -91 49 -91 13 0 28 -5 35 -12 7 -7 12 -8 12 -2 0 5 15 8 34 6 49 -6 93 21 112 68 14 34 21 40 45 40 19 0 29 -5 29 -15 0 -9 9 -15 25 -15 14 0 25 3 25 8 0 4 14 13 32 21 34 15 77 58 78 77 0 14 67 47 79 40 11 -7 77 20 86 35 4 6 -2 13 -14 16 -33 9 -26 30 9 25 20 -3 36 -14 47 -33 10 -17 26 -29 38 -29 19 -1 19 -1 3 -14 -23 -17 -23 -31 2 -56 12 -12 33 -20 55 -20 24 0 37 -6 45 -19 15 -28 67 -37 91 -15 24 22 24 49 -1 74 -11 11 -20 29 -20 40 0 21 -27 40 -47 33 -8 -3 -13 4 -13 16 0 24 3 25 48 12 21 -6 43 -6 61 0 23 8 35 6 62 -10 46 -28 70 -26 113 8 41 33 63 32 113 -5 17 -13 36 -24 42 -24 15 0 51 -41 65 -73 l12 -28 26 21 c15 11 37 20 51 20 60 0 71 22 38 75 -10 17 -20 53 -23 81 -4 40 -19 75 -68 158 -72 122 -108 156 -166 156 -35 0 -46 7 -109 71 -91 93 -150 124 -222 115 -53 -6 -133 -46 -133 -66 0 -6 -7 -10 -15 -10 -10 0 -15 -10 -15 -30 0 -27 3 -30 31 -30 17 0 39 5 51 11 11 6 22 8 25 6 3 -3 -13 -15 -36 -27 -23 -11 -41 -24 -41 -28 1 -4 17 -17 36 -30 30 -18 49 -22 120 -22 85 0 96 -4 68 -24 -26 -19 -2 -66 34 -66 36 0 74 -36 52 -50 -12 -7 -11 -10 4 -16 18 -7 17 -8 -5 -16 -20 -8 -28 -4 -49 22 -14 16 -30 30 -36 30 -6 0 -17 7 -24 15 -21 25 -32 17 -25 -16 13 -59 22 -139 15 -139 -4 0 -10 28 -14 61 -3 34 -10 67 -15 73 -5 6 -11 22 -13 36 -2 20 -11 27 -48 35 -25 5 -56 18 -70 27 -14 9 -38 22 -53 29 -16 7 -37 30 -48 51 -24 46 -65 70 -83 47 -6 -8 -35 -27 -64 -42 -83 -42 -175 -34 -188 18 -11 43 11 58 77 50 56 -7 57 -7 98 35 43 43 52 77 28 106 -32 41 -73 74 -92 74 -11 0 -26 4 -34 9 -21 13 4 24 39 16 31 -7 60 3 43 14 -15 10 -41 68 -34 77 6 9 24 21 75 52 16 9 41 27 56 39 37 30 67 29 82 -2 14 -31 26 -31 68 0 19 14 42 25 53 25 16 0 17 5 11 46 -6 40 -4 48 20 73 22 23 27 36 24 66 -3 33 -10 43 -52 72 -57 39 -109 45 -126 13 -6 -11 -17 -20 -25 -20 -8 0 -20 -12 -27 -27 -8 -18 -22 -29 -38 -31 l-25 -2 26 14 c15 9 29 24 32 36 3 12 13 20 26 20 12 0 21 4 21 8 0 5 10 18 21 31 15 16 24 20 32 12 6 -6 21 -11 34 -11 l23 0 -26 40 c-15 22 -32 40 -38 40 -6 0 -3 5 7 11 11 6 17 22 17 45 0 47 -13 69 -50 84 -34 14 -35 17 -15 44 23 30 18 71 -11 106 -23 27 -25 34 -15 56 8 19 16 24 31 19 10 -3 30 -1 42 6 29 15 88 75 88 89 0 6 -24 35 -53 65 -38 39 -61 55 -80 55 -14 0 -28 -4 -31 -9 -7 -11 -126 -11 -126 1 0 4 23 8 50 8 44 0 50 3 50 21 0 11 -5 29 -11 41 -6 11 -9 22 -6 24 10 10 55 -9 60 -25 6 -26 76 -21 95 7 10 15 25 22 48 22 44 0 53 -18 12 -22 -33 -3 -33 -3 -33 -56 1 -59 25 -96 47 -74 10 10 10 17 0 33 -8 12 -11 23 -9 25 10 10 56 -20 61 -41 5 -21 43 -45 71 -45 7 0 15 -10 17 -22 2 -15 15 -28 36 -37 38 -17 42 -41 6 -41 -17 0 -41 16 -74 50 -27 28 -56 50 -64 50 -22 0 -20 -12 6 -40 13 -13 21 -34 20 -46 -2 -16 4 -23 23 -28 15 -4 35 -4 46 -1 10 4 32 -2 49 -12 35 -20 41 -48 9 -40 -24 6 -49 -1 -49 -14 0 -5 7 -9 16 -9 9 0 29 -8 45 -17 46 -27 37 -63 -20 -83 -24 -8 -46 -21 -49 -28 -4 -14 64 -47 119 -57 34 -6 39 -11 58 -64 22 -61 21 -131 -2 -179 -9 -19 -7 -25 11 -38 30 -21 28 -36 -4 -28 -42 11 -25 -18 24 -40 27 -12 42 -26 42 -37 0 -13 12 -21 43 -29 66 -17 67 -18 67 -47 0 -15 5 -35 10 -43 8 -13 11 -13 22 -1 10 11 10 14 1 18 -7 3 -13 9 -13 14 0 18 29 -4 40 -31 19 -45 106 -56 146 -19 l23 21 20 -41 c12 -22 21 -47 21 -55 0 -8 3 -16 8 -18 15 -7 53 -69 47 -78 -3 -6 -25 -13 -47 -17 -57 -9 -107 -56 -115 -107 -6 -35 -4 -39 13 -33 95 30 103 31 139 14 20 -9 42 -17 49 -17 8 0 16 -9 19 -20 8 -31 32 -24 50 15 15 31 21 35 57 35 29 0 40 -4 40 -15 0 -19 31 -55 47 -55 6 0 16 -6 20 -14 13 -22 63 -26 82 -7 21 21 41 16 41 -10 0 -27 50 -49 112 -49 31 -1 61 -7 72 -15 27 -21 51 -19 110 9 52 24 116 42 116 32 0 -3 -16 -13 -35 -22 -19 -9 -35 -23 -35 -31 0 -8 -15 -20 -32 -28 -62 -27 -69 -37 -62 -91 4 -27 14 -58 24 -69 10 -11 20 -32 24 -48 6 -24 10 -26 34 -21 15 4 30 12 34 18 5 8 13 7 28 -2 26 -16 40 -15 40 1 0 21 43 56 78 63 20 4 32 13 32 23 0 9 3 26 6 39 10 34 -27 28 -48 -8 -19 -33 -52 -40 -62 -14 -4 9 0 24 9 34 8 9 15 28 15 42 0 14 7 31 15 38 20 16 19 30 -2 46 -24 17 -15 21 32 13 22 -3 30 -7 17 -8 -41 -2 -13 -20 29 -18 36 1 40 3 37 27 -2 16 -13 30 -31 38 -21 10 -26 17 -18 25 8 8 14 8 22 0 7 -7 21 -5 48 8 32 15 40 26 50 63 6 25 17 49 25 53 8 5 18 43 25 98 8 56 20 103 33 125 29 48 32 153 6 240 -10 36 -18 77 -16 92 2 18 -4 32 -17 41 -18 14 -18 15 7 46 15 17 30 40 33 52 10 32 -15 110 -47 147 -15 18 -28 37 -28 43 0 20 -75 108 -93 109 -9 0 -23 12 -29 28 -7 15 -23 36 -36 47 -43 37 -1 91 77 97 45 4 60 28 37 59 -9 13 -28 39 -41 58 -15 20 -25 48 -25 68 0 19 -8 46 -18 61 -64 95 -93 142 -111 182 -11 25 -21 39 -21 32 0 -10 -8 -12 -30 -7 -35 8 -41 -8 -10 -25 11 -6 20 -17 20 -24 0 -8 7 -19 15 -26 10 -8 15 -29 15 -59 l-1 -46 -25 45 -25 45 6 -35 c4 -19 10 -44 14 -55 14 -33 32 -128 25 -134 -3 -3 -16 6 -28 22 -23 29 -45 34 -64 15 -17 -17 3 -45 41 -57 38 -13 63 -51 44 -70 -6 -6 -27 -11 -47 -11 -19 0 -44 -7 -54 -15 -10 -8 -22 -12 -27 -10 -4 3 -10 1 -14 -5 -3 -5 -27 -10 -52 -10 l-45 0 6 -31 c8 -39 -9 -56 -60 -61 -31 -2 -38 0 -35 12 2 8 6 31 9 50 5 43 28 70 59 70 12 0 23 5 23 11 0 7 8 18 18 25 16 13 16 15 0 28 -10 7 -18 20 -18 28 0 8 -5 19 -11 25 -7 7 -6 15 5 26 9 9 16 20 16 26 0 6 6 11 13 11 15 0 36 -20 68 -62 22 -30 39 -36 39 -15 -1 18 -40 59 -90 94 -25 17 -72 55 -105 85 -61 55 -222 158 -246 158 -27 0 -44 -17 -32 -32 6 -7 13 -31 15 -53 2 -30 -1 -40 -12 -40 -10 0 -16 12 -18 39 l-3 38 -51 -6 c-28 -4 -61 -12 -72 -19 -12 -6 -25 -10 -30 -9 -5 2 -12 -2 -17 -9 -7 -12 -69 -39 -99 -43 -9 -1 -27 -10 -40 -19 -14 -9 -32 -17 -41 -17 -17 0 -107 -58 -192 -123 -51 -39 -101 -57 -159 -57 -46 0 -68 28 -68 87 0 38 -3 43 -27 49 -19 5 -38 1 -64 -14 -21 -12 -47 -22 -58 -22 -17 0 -20 -5 -14 -30 4 -23 2 -30 -10 -30 -23 0 -47 39 -47 77 0 29 4 33 36 39 31 6 38 13 59 60 13 30 28 54 34 54 10 0 94 68 99 80 6 16 -106 23 -139 10 -40 -17 -56 -2 -68 63 -10 53 -34 87 -63 87 -10 0 -29 12 -42 26 -20 24 -32 27 -99 32 -47 3 -81 10 -88 18 -15 18 -5 21 89 32 55 6 80 5 99 -5 14 -7 30 -13 37 -13 6 0 22 -18 36 -40 24 -38 27 -40 77 -40 33 0 57 -5 67 -15 17 -17 64 -11 81 10 18 21 216 69 287 69 20 0 35 4 32 8 -3 4 0 16 6 27 9 18 6 20 -22 23 -50 5 -46 30 7 51 25 11 45 23 45 29 0 5 8 7 18 4 24 -8 46 9 39 28 -4 11 -19 16 -46 16 -30 0 -43 5 -51 19 -17 33 -11 54 28 100 35 41 38 48 28 73 -7 19 -17 28 -33 28 -24 0 -27 9 -17 48 6 19 13 22 61 22 59 0 93 13 93 34 0 29 -103 35 -137 8 -12 -9 -28 -34 -37 -55 -8 -20 -22 -40 -30 -43 -8 -3 -54 4 -103 16 -125 31 -144 50 -69 69 31 8 53 8 72 1 31 -12 28 -14 41 25 9 29 12 30 89 38 113 11 153 10 168 -2 7 -6 20 -9 28 -6 12 5 17 -4 22 -34 7 -44 47 -81 86 -81 18 0 21 4 17 22 -4 12 -2 27 3 33 6 7 5 26 -3 50 -9 31 -9 39 2 43 7 2 27 18 45 36 18 17 40 36 49 41 13 8 16 28 17 95 1 47 -2 105 -5 128 -5 28 -3 48 4 55 6 6 11 19 11 29 0 9 7 21 16 26 13 7 14 13 5 30 -6 11 -11 37 -11 57 0 20 -5 46 -11 58 -7 11 -20 54 -30 94 -10 40 -28 91 -39 113 -19 37 -20 46 -9 103 12 63 43 111 81 123 10 3 30 28 43 55 17 32 32 49 44 49 27 0 42 23 49 77 6 41 11 49 37 58 36 12 44 21 38 45 -4 14 4 18 36 23 56 7 78 0 85 -29 7 -25 25 -31 42 -14 7 7 18 3 34 -12 l25 -23 -23 -3 c-12 -2 -22 -10 -22 -18 0 -8 -16 -31 -35 -53 -40 -44 -42 -51 -16 -51 13 0 20 -10 25 -32 9 -45 -21 -62 -59 -34 -16 12 -17 16 -6 30 23 28 -28 20 -55 -9 -13 -14 -33 -26 -46 -27 -13 0 -30 -1 -38 -2 -23 -2 -24 -33 -1 -41 13 -4 23 -18 27 -40 9 -49 24 -58 74 -45 22 6 43 17 46 25 10 25 43 27 79 5 19 -12 39 -19 45 -15 18 11 28 -5 21 -33 -5 -20 -15 -28 -37 -32 -17 -3 -30 -12 -32 -23 -4 -18 52 -147 63 -147 22 0 66 35 71 56 9 35 -3 113 -21 141 -20 30 -11 67 29 118 18 22 39 52 48 66 31 50 148 41 148 -10 0 -11 -14 -33 -31 -50 -34 -34 -33 -55 5 -103 11 -15 29 -39 39 -53 14 -19 26 -25 44 -23 22 2 29 12 44 58 10 30 19 84 19 120 0 58 4 70 30 102 17 21 43 43 57 50 15 8 38 38 58 75 17 35 43 75 58 90 l44 58 7 126 c8 136 16 171 43 181 50 18 30 67 -56 137 -56 46 -70 63 -82 103 -13 44 -19 50 -74 77 l-60 29 -65 -17 c-36 -9 -90 -16 -120 -16 -30 0 -95 -11 -143 -25 -107 -29 -172 -33 -212 -13 -16 8 -50 18 -75 21 -38 5 -52 13 -94 59 -60 66 -86 106 -86 135 0 26 -36 63 -62 63 -12 0 -18 -7 -18 -23 0 -13 -18 -43 -40 -67 -22 -24 -40 -49 -40 -55 0 -5 -11 -20 -25 -33 -14 -14 -25 -38 -28 -60 -3 -27 -4 -21 -5 21 -1 31 2 57 8 57 5 0 13 16 19 35 11 40 121 152 158 161 34 9 66 67 58 104 -4 17 -2 36 3 43 6 8 4 31 -6 65 -18 65 -48 82 -97 59 -20 -9 -38 -11 -53 -6 -25 9 -60 -1 -103 -32 -28 -20 -28 -20 -45 -1 -56 66 -64 72 -96 72 -27 0 -37 -6 -51 -30 -25 -42 -50 -53 -83 -38 -23 11 -28 10 -40 -7 -8 -10 -14 -25 -14 -32 0 -7 -8 -13 -17 -13 -27 0 -80 -36 -87 -58 -6 -18 -18 -21 -107 -24 -74 -2 -102 -7 -109 -18 -5 -8 -12 -11 -16 -7 -15 15 13 27 99 40 75 12 93 19 121 46 17 17 40 31 50 31 11 0 35 16 54 36 31 32 39 35 73 30 34 -5 40 -3 59 24 18 25 28 30 64 30 23 0 51 -7 62 -15 28 -21 46 -18 70 12 19 24 25 26 45 16 13 -6 44 -14 69 -17 25 -3 60 -8 78 -12 29 -6 32 -5 32 19 0 14 -11 42 -24 62 -39 57 -65 150 -81 289 -19 161 -14 366 10 402 9 14 13 33 10 43 -3 12 0 21 10 25 8 3 15 17 15 31 0 24 -2 25 -65 25 -36 0 -81 6 -99 14 -39 16 -156 95 -156 105 0 4 -32 33 -71 65 -39 32 -78 74 -87 92 -21 46 -63 47 -109 2 -18 -17 -35 -29 -38 -26 -12 11 9 40 50 68 47 33 48 32 119 -34 21 -20 55 -45 75 -55 20 -11 55 -39 77 -63 127 -132 180 -167 231 -152 16 4 55 8 87 8 l59 1 33 100 c19 54 34 111 34 125 0 42 69 269 102 333 33 67 96 147 114 147 6 0 28 18 48 40 33 37 36 45 36 100 0 33 -13 145 -30 250 -21 139 -27 197 -20 216 6 14 10 40 10 59 0 33 8 58 34 103 15 27 4 88 -19 107 -7 5 -21 25 -31 44 -11 19 -40 64 -66 99 -78 105 -108 207 -88 294 13 53 79 160 164 263 23 28 57 71 76 97 19 26 46 52 60 57 14 6 39 22 55 36 29 25 29 26 11 40 -27 20 -72 18 -122 -4z m-598 -4137 c-3 -8 -11 -14 -17 -14 -8 0 -9 12 -5 38 13 69 21 81 24 33 2 -24 1 -50 -2 -57z" />
                        <path d="M6443 8809 c-35 -16 -52 -18 -97 -11 -48 8 -55 7 -59 -9 -3 -12 -19 -19 -53 -24 -113 -14 -146 -27 -171 -70 -39 -65 -54 -105 -48 -124 7 -24 54 -46 69 -31 5 5 17 10 26 10 21 0 80 -61 80 -83 0 -23 6 -22 87 18 85 42 123 86 123 142 0 22 -5 44 -12 51 -18 18 -1 29 71 47 60 16 75 16 112 0 13 -5 20 2 28 28 16 49 7 63 -46 71 -59 8 -61 8 -110 -15z" />
                        <path d="M6248 8444 c-31 -16 -28 -44 4 -44 46 0 78 40 42 54 -19 7 -13 8 -46 -10z" />
                        <path d="M8425 4896 c-73 -23 -121 -56 -355 -241 -151 -120 -230 -173 -308 -206 -52 -21 -60 -28 -44 -33 11 -4 26 -20 32 -37 15 -35 52 -53 89 -44 13 3 57 22 98 41 41 20 81 34 90 32 16 -3 50 -95 74 -201 7 -32 16 -60 21 -63 14 -9 9 -54 -7 -60 -21 -8 -19 -25 15 -123 16 -47 34 -111 39 -141 5 -30 15 -75 21 -100 13 -52 12 -51 7 -110 -6 -51 -15 -80 -27 -80 -14 0 -20 -31 -9 -51 12 -23 2 -62 -14 -56 -6 2 -14 14 -17 28 -8 31 -40 39 -40 9 0 -16 -5 -21 -22 -18 -17 2 -24 11 -26 32 -3 27 -2 29 28 23 23 -5 32 -3 37 9 7 20 -13 34 -50 34 -24 0 -27 3 -22 21 6 17 3 20 -12 17 -12 -2 -18 -12 -19 -29 -2 -46 -12 -59 -44 -59 -23 0 -30 -4 -30 -19 0 -26 -10 -51 -21 -51 -17 0 5 66 43 124 21 32 38 67 38 77 0 28 11 49 26 49 8 0 14 -9 14 -19 0 -27 25 -33 45 -11 9 10 27 20 39 22 13 2 20 9 17 18 -2 8 -4 63 -5 121 -1 65 -6 111 -13 120 -6 8 -15 38 -19 67 -5 39 -12 56 -28 64 -11 6 -24 16 -28 22 -13 20 -8 66 11 104 24 46 13 72 -29 72 -19 0 -33 7 -40 19 -11 21 -23 26 -86 36 l-41 6 -6 -38 c-5 -31 -2 -42 18 -63 17 -18 25 -37 25 -63 0 -26 4 -37 15 -37 25 0 45 -42 39 -82 -8 -45 -45 -81 -101 -97 -31 -8 -43 -17 -43 -31 0 -10 -4 -21 -9 -24 -5 -4 -12 -41 -16 -84 -12 -155 -63 -317 -87 -280 -4 7 -8 23 -8 34 0 12 -7 24 -15 28 -8 3 -15 16 -15 28 0 48 -11 53 -97 40 -43 -7 -93 -12 -111 -12 -52 0 -34 24 24 31 27 4 62 12 77 18 16 6 39 11 53 11 31 0 34 35 3 43 -17 5 -20 11 -15 31 6 25 -19 106 -34 106 -4 0 -37 -16 -74 -35 -73 -38 -116 -44 -137 -19 -10 13 -10 17 2 25 8 5 19 9 26 9 7 0 18 18 24 39 14 46 34 58 59 36 24 -21 67 -19 80 4 26 49 -6 138 -72 200 -36 33 -38 83 -6 105 29 21 50 20 46 -1 -2 -11 7 -21 23 -27 44 -15 59 -3 59 51 1 53 13 76 48 87 18 6 22 15 22 51 0 30 -5 45 -16 49 -19 7 -20 6 -101 -52 -76 -57 -143 -76 -191 -56 -19 7 -36 23 -39 34 -6 23 -9 24 -67 8 -36 -9 -57 -9 -117 5 -41 9 -98 19 -126 22 -69 8 -179 57 -227 103 -21 20 -35 30 -31 22 5 -8 11 -30 15 -50 4 -29 13 -39 52 -60 25 -14 61 -33 79 -44 19 -11 60 -21 99 -23 78 -6 141 -27 170 -58 20 -21 22 -32 19 -109 -4 -81 -5 -86 -38 -120 -28 -29 -42 -36 -73 -36 -22 0 -57 -9 -79 -21 -37 -19 -42 -19 -58 -5 -10 9 -26 16 -36 16 -17 0 -17 -1 0 -20 23 -25 32 -143 15 -194 -12 -39 -51 -66 -93 -66 -12 0 -28 -5 -35 -12 -7 -7 -12 -8 -12 -3 0 6 -9 -5 -20 -23 -18 -29 -25 -33 -48 -28 -15 4 -34 16 -44 26 -21 26 -25 25 -32 -5 -8 -32 -34 -32 -46 -1 -16 44 -127 48 -165 6 -22 -24 -56 -25 -155 -4 -72 15 -195 15 -220 -1 -6 -4 -1 -15 14 -26 18 -14 40 -19 86 -19 64 0 100 -12 100 -33 0 -21 92 -104 133 -121 42 -17 47 -30 16 -47 -23 -12 -44 -10 -169 16 -93 19 -90 19 -90 -4 0 -27 15 -34 83 -42 90 -11 237 -92 266 -147 20 -38 41 -121 41 -163 0 -46 -17 -60 -74 -62 -36 -2 -46 -6 -46 -19 0 -9 -3 -23 -6 -32 -4 -11 3 -19 22 -26 23 -9 31 -8 41 5 6 9 9 24 6 32 -3 8 17 -9 44 -39 31 -33 53 -66 58 -88 4 -19 16 -52 27 -73 14 -29 17 -49 13 -82 -4 -26 -2 -57 5 -78 7 -18 10 -45 7 -58 -7 -28 -78 -69 -120 -69 -72 0 -93 -60 -36 -100 17 -13 34 -32 39 -45 8 -21 89 -81 145 -107 26 -11 27 -15 22 -60 -3 -26 0 -70 7 -97 8 -31 9 -54 3 -60 -14 -14 10 -50 41 -57 15 -4 32 -10 37 -15 18 -14 137 -30 225 -30 83 0 132 10 144 29 7 11 44 5 63 -11 7 -5 36 -11 65 -12 64 -4 143 -36 158 -64 11 -21 50 -30 50 -12 0 21 -13 41 -26 41 -8 0 -14 2 -14 5 0 16 31 63 45 69 27 10 73 7 81 -5 5 -8 -1 -10 -18 -6 -21 6 -26 2 -36 -26 -16 -45 -16 -47 13 -47 14 0 25 5 25 10 0 6 7 10 15 10 21 0 19 -13 -5 -28 -23 -14 -26 -35 -7 -50 6 -6 39 -12 72 -15 64 -6 95 -14 95 -27 0 -25 -13 -36 -38 -32 -18 2 -36 -4 -51 -17 -26 -22 -41 -27 -41 -12 0 22 -31 19 -42 -4 -10 -21 -7 -30 24 -67 19 -24 40 -53 47 -65 6 -13 19 -23 28 -23 13 0 13 3 3 15 -27 32 10 13 54 -28 54 -50 65 -93 18 -68 -95 50 -287 116 -318 109 -13 -3 -4 -9 26 -17 25 -7 52 -19 60 -26 8 -7 41 -22 72 -33 95 -35 167 -81 194 -124 14 -22 38 -44 55 -50 21 -7 29 -16 29 -33 0 -13 6 -25 13 -28 8 -3 13 4 12 22 0 21 5 27 29 29 46 6 75 -6 91 -38 18 -34 90 -70 141 -70 25 0 45 10 74 36 l40 36 0 -28 0 -29 26 32 c29 37 53 42 77 15 22 -24 21 -32 -2 -32 -11 0 -32 -10 -47 -23 -22 -19 -26 -29 -20 -50 4 -16 14 -27 24 -28 10 0 6 -4 -10 -11 -23 -8 -28 -16 -28 -43 0 -20 -6 -35 -15 -39 -30 -11 -14 -26 28 -26 29 0 38 -3 28 -9 -12 -8 -13 -14 -3 -36 12 -26 16 -27 67 -23 29 3 61 11 70 18 9 8 45 53 81 100 48 65 77 94 115 114 47 26 56 28 127 21 47 -4 98 -16 131 -31 66 -30 126 -32 141 -5 17 33 11 75 -17 131 -23 44 -34 56 -62 63 -18 4 -44 15 -57 24 -17 11 -67 18 -162 25 l-137 9 -40 45 -40 45 -24 -25 c-27 -29 -22 -41 25 -61 27 -11 34 -19 34 -42 0 -16 -5 -34 -10 -39 -8 -8 -7 -19 1 -38 14 -31 18 -28 -50 -48 -47 -15 -57 -15 -81 -3 -40 21 -62 45 -56 62 3 8 -5 41 -19 73 -14 33 -25 66 -25 75 0 8 -6 15 -14 15 -24 0 -35 60 -17 89 6 10 13 10 28 2 26 -13 53 13 53 52 0 15 5 27 10 27 6 0 10 8 10 18 0 39 -87 86 -115 62 -22 -18 -135 -3 -142 19 -4 9 -12 20 -20 24 -17 11 -16 38 3 65 12 18 25 22 64 22 l50 0 -16 -41 c-21 -52 -10 -81 25 -68 22 9 23 13 16 65 l-7 56 77 74 c42 41 84 74 93 74 9 0 36 11 59 24 39 23 50 24 133 19 76 -5 90 -4 90 9 0 21 32 48 57 48 11 0 28 10 39 21 10 12 29 25 42 30 30 11 44 51 31 86 -5 14 -7 45 -4 67 8 54 -4 84 -70 165 -57 70 -94 91 -163 91 -17 0 -33 4 -36 9 -3 4 -26 14 -50 21 -25 7 -63 28 -85 46 -34 30 -40 40 -43 86 -6 65 37 212 81 277 27 41 143 141 163 141 5 0 29 19 53 41 43 39 48 41 95 37 28 -3 58 -12 68 -22 10 -9 30 -16 45 -16 24 0 26 4 25 34 -2 47 25 86 59 86 l27 0 -28 -29 c-19 -20 -28 -40 -28 -63 0 -45 26 -105 49 -112 10 -3 23 -16 28 -28 15 -34 82 -29 111 8 12 14 39 34 61 44 34 15 41 23 46 56 11 65 8 80 -23 110 -22 22 -30 38 -30 66 0 51 -42 128 -62 117 -37 -21 -63 89 -38 157 14 36 15 118 1 185 -5 30 -15 83 -22 119 -6 35 -30 106 -54 156 -41 87 -43 96 -38 161 8 95 47 177 106 223 46 36 57 54 57 102 0 20 -15 40 -64 83 -66 58 -113 78 -279 120 -38 10 -81 28 -96 41 -16 13 -40 28 -55 34 -44 16 -135 10 -211 -14z" />
                        <path d="M5417 4478 c-37 -36 -38 -39 -35 -100 l3 -63 35 -5 c19 -3 50 -16 68 -29 37 -28 40 -51 17 -128 -12 -42 -21 -54 -50 -67 -66 -32 -81 -105 -47 -243 l17 -73 53 -2 c28 -1 59 -2 69 -2 25 -1 58 118 43 161 -9 27 -8 39 11 75 12 24 35 59 50 79 38 49 38 70 0 63 -35 -7 -86 18 -94 44 -6 25 2 38 31 46 33 11 27 23 -25 48 -59 28 -89 78 -100 168 l-9 65 -37 -37z" />
                        <path d="M6380 4236 c0 -8 18 -28 39 -46 22 -17 43 -40 46 -50 4 -11 12 -20 18 -20 7 0 39 -14 71 -30 32 -16 63 -27 68 -24 14 9 9 22 -12 29 -12 4 -42 26 -68 51 -26 24 -61 57 -79 74 -34 31 -83 41 -83 16z" />
                        <path d="M4989 3801 c-19 -35 -27 -40 -62 -43 -39 -3 -70 -28 -54 -45 5 -4 28 -8 52 -8 24 0 47 -3 51 -7 19 -20 41 -6 52 31 15 49 15 72 -2 94 -13 17 -16 15 -37 -22z" />
                        <path d="M1767 2000 c-27 -21 -37 -54 -42 -133 -1 -23 -6 -78 -10 -122 -7 -75 -6 -84 19 -133 15 -29 33 -55 42 -59 19 -7 74 16 74 31 0 6 9 19 20 29 21 18 27 61 10 72 -6 4 -7 23 -4 44 4 22 1 48 -6 60 -9 18 -9 26 3 39 25 29 58 116 53 137 -4 15 -21 26 -61 38 -69 21 -67 21 -98 -3z" />
                        <path d="M6089 1832 c-15 -21 -32 -55 -38 -75 -7 -20 -17 -39 -22 -42 -5 -4 -9 -27 -9 -52 0 -34 -11 -68 -43 -132 -24 -47 -49 -107 -56 -133 -10 -36 -22 -53 -52 -72 -21 -14 -43 -26 -48 -26 -8 0 -36 -30 -91 -101 -31 -40 -70 -115 -70 -135 0 -9 11 -14 30 -14 20 0 33 -6 37 -17 4 -10 11 -21 17 -25 14 -9 -12 -38 -35 -38 -10 0 -21 5 -24 10 -14 22 -33 8 -39 -27 -4 -21 -12 -53 -18 -72 -10 -33 -11 -33 -54 -27 -26 3 -44 2 -44 -4 0 -10 7 -17 63 -68 42 -37 60 -108 51 -202 l-7 -80 40 0 c27 0 46 6 58 20 20 23 75 180 75 217 0 25 34 113 79 203 18 36 32 85 39 140 12 96 37 162 88 233 23 32 39 68 46 106 5 31 21 90 34 131 13 41 24 89 24 107 0 17 9 53 20 79 16 37 19 56 12 88 -10 53 -30 55 -63 8z" />
                        <path d="M7135 1320 c-17 -19 -17 -21 -2 -33 10 -6 28 -30 41 -52 l24 -40 7 28 c4 15 19 37 34 48 l26 21 -28 24 c-34 29 -78 31 -102 4z" />
                        <path d="M4810 1261 c0 -14 60 -101 70 -101 5 0 10 -8 10 -18 0 -30 80 -132 118 -150 23 -11 39 -28 46 -49 10 -27 142 -162 150 -152 1 2 12 18 24 35 19 27 29 32 82 37 72 8 80 12 80 38 0 27 -93 119 -121 119 l-22 0 23 -25 c19 -21 21 -25 7 -25 -9 0 -17 -4 -17 -10 0 -25 -30 -7 -40 24 -6 19 -17 37 -25 40 -8 3 -15 12 -15 19 0 8 -9 22 -19 31 -19 17 -19 17 -14 -3 3 -11 3 -28 -1 -37 -5 -14 -9 -13 -35 5 -16 12 -36 21 -44 21 -9 0 -18 8 -21 18 -3 9 -24 27 -46 40 -25 14 -40 30 -40 42 0 13 -7 20 -19 20 -19 0 -81 53 -81 70 0 4 -11 10 -25 12 -14 3 -25 2 -25 -1z" />
                        <path d="M6964 1241 c-4 -17 -10 -28 -14 -26 -5 3 -23 7 -40 9 -29 3 -31 2 -25 -21 5 -21 61 -83 75 -82 3 0 14 14 25 32 16 25 28 33 58 35 28 2 37 8 37 21 0 25 -36 55 -55 47 -9 -3 -25 -1 -36 4 -17 10 -20 7 -25 -19z" />
                        <path d="M7568 1249 c-10 -5 -18 -21 -18 -34 0 -14 -6 -25 -13 -25 -8 0 -22 -9 -31 -19 -17 -19 -17 -20 21 -23 l38 -3 0 -61 c0 -34 6 -67 12 -76 17 -20 7 -28 -34 -28 -35 0 -92 37 -139 90 -17 19 -25 22 -34 14 -8 -8 -9 -18 -2 -30 5 -11 12 -42 16 -70 6 -47 5 -51 -19 -62 -15 -7 -44 -9 -70 -5 -54 7 -66 -10 -39 -53 l18 -27 -74 7 c-41 4 -77 11 -80 15 -3 5 -15 12 -28 16 -18 5 -22 13 -20 33 3 23 -1 27 -26 30 -16 2 -38 13 -50 24 -11 11 -35 26 -52 34 -39 16 -55 36 -63 76 -5 23 -17 37 -46 53 -22 13 -50 38 -63 56 -28 40 -49 47 -163 54 -77 4 -89 3 -113 -16 -14 -11 -26 -16 -26 -10 0 6 -7 8 -15 5 -8 -4 -15 -12 -15 -20 0 -9 -12 -14 -34 -14 -26 0 -45 -10 -85 -46 -48 -43 -51 -49 -51 -93 0 -50 20 -81 52 -81 11 0 14 -6 11 -19 -3 -14 2 -20 22 -25 21 -5 25 -11 20 -27 -9 -26 12 -51 36 -44 26 8 25 -17 -1 -40 -17 -15 -22 -16 -36 -4 -15 12 -16 11 -10 -19 7 -30 6 -32 -18 -32 -17 0 -26 6 -26 15 0 17 -38 35 -72 35 -18 0 -19 -2 -7 -16 11 -14 10 -18 -6 -30 -10 -8 -24 -14 -31 -14 -14 0 -36 78 -23 86 17 10 9 34 -11 34 -34 0 -25 -58 22 -150 50 -96 73 -112 225 -159 56 -17 135 -47 175 -66 40 -19 80 -35 90 -35 10 0 25 -11 34 -26 9 -14 29 -31 45 -39 15 -8 37 -30 49 -49 12 -21 45 -49 78 -67 31 -18 74 -47 95 -66 20 -18 41 -33 46 -33 4 0 25 -13 46 -30 27 -21 48 -30 74 -29 l36 0 -47 15 c-73 22 -61 70 27 109 29 13 55 27 56 32 2 4 22 17 44 28 31 15 52 19 92 15 29 -3 54 -2 56 3 1 5 29 3 62 -3 33 -7 78 -15 100 -19 22 -4 50 -14 62 -21 19 -12 27 -12 58 3 20 10 35 23 33 29 -3 7 3 21 13 31 10 11 15 25 12 33 -3 8 0 14 6 14 23 0 10 30 -19 45 -39 20 -38 35 8 72 l38 30 32 -26 32 -27 -30 -42 c-20 -26 -33 -58 -36 -89 -6 -43 -2 -57 40 -135 29 -56 46 -100 46 -123 0 -32 4 -37 49 -60 38 -19 50 -21 54 -11 3 7 1 80 -5 162 -14 211 -11 225 51 288 36 36 56 68 66 100 19 62 75 137 119 161 24 13 40 31 47 53 8 23 20 37 40 44 41 14 39 53 -6 102 -19 21 -37 45 -40 55 -9 29 -60 50 -136 57 -96 9 -106 15 -114 69 -8 52 -20 64 -69 72 -31 5 -36 3 -36 -14 0 -25 -22 -45 -42 -38 -8 3 -20 21 -27 40 -11 30 -70 85 -92 85 -4 0 -17 -16 -29 -37 l-21 -36 -42 41 c-47 46 -45 45 -69 31z" />
                        <path d="M8090 1180 c-8 -5 -27 -10 -42 -10 -21 0 -28 -5 -28 -19 0 -11 6 -23 13 -28 16 -10 120 -32 129 -27 14 9 20 65 8 79 -14 17 -58 19 -80 5z" />
                    </g>
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
