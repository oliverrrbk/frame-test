import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'framer-motion';
import { Hammer, MousePointer2, Check, Info, Plus, Loader2, ZoomIn } from 'lucide-react';
import { initialCategories } from '../Wizard/questionsConfig';

// Universel demo-branding (ikke en bestemt person) — nemt at ændre.
const BRAND = 'Tømrerforretning';

// De ægte opgavekort (genbruger de rigtige billeder fra /public).
const DEMO_CATS = ['windows', 'doors', 'floor', 'roof', 'kitchen', 'terrace']
    .map(id => initialCategories.find(c => c.id === id))
    .filter(Boolean);

const TARGET_ID = 'floor';           // demoen vælger "Nyt Gulv"

const ESTIMATE = 72500;

const STEPS = ['Opgave', 'Detaljer', 'Kontakt'];

// Rigtige gulv-spørgsmål fra questionsConfig (skåret sammen)
const GULV = [
    { label: 'Træ', img: '/images/floor_wood_1776266012828.png' },
    { label: 'Parket', img: '/images/floor_parquet_1776265864234.png' },
    { label: 'Laminat', img: '/images/floor_laminate_1776265833274.png' },
];
const FOUNDATION = [
    { label: 'Beton / Støbt dæk', img: '/images/subfloor_concrete.png' },
    { label: 'Strøer / Trækonstruktion', img: '/images/subfloor_joists.png' },
    { label: 'Ved ikke / Andet', img: '/images/subfloor_unknown.png' },
];

// "Overslaget inkluderer" — rigtige gulv-linjer (skåret sammen)
const INCLUDES = [
    'Nedbrydning og bortskaffelse af eksisterende gulv og fodpaneler',
    'Opretning af undergulv samt underlag med dampspærre',
    'Levering og lægning af 20 m² trægulv',
    'Kørsel, værktøj og oprydning — vi efterlader altid dit hjem pænt',
];

const CONTACT_FIELDS = [
    { label: 'Fulde navn', value: 'Anders Sørensen', full: true },
    { label: 'Vejnavn og husnummer', value: 'Skovvejen 15', full: true },
    { label: 'Postnummer', value: '8000' },
    { label: 'By', value: 'Aarhus C' },
    { label: 'Telefon', value: '+45 20 30 40 50' },
    { label: 'E-mail', value: 'anders@mail.dk' },
];

// Falsk cursor + tap-ring — placeres i et relative-forældreelement.
function TapCursor() {
    return (
        <>
            <motion.span initial={{ scale: 0.4, opacity: 0.6 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }}
                className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full bg-blue-500/40 pointer-events-none z-20" />
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 0.9, 1], opacity: 1 }} transition={{ duration: 0.5 }}
                className="absolute left-1/2 top-1/2 text-slate-900 drop-shadow-lg pointer-events-none z-20">
                <MousePointer2 size={20} fill="currentColor" />
            </motion.div>
        </>
    );
}

// Ét spørgsmål i samme "wizard-question-card"-stil som den rigtige beregner
function QuestionCard({ label, children }) {
    return (
        <div className="wizard-question-card" style={{ marginBottom: '18px', background: 'var(--bg-card)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '10px' }}>{label}</label>
            {children}
        </div>
    );
}

// Billed-valg (visual_select) — genbruger de rigtige klasser
function VisualSelect({ options, selected, cursorOn }) {
    return (
        <div className="materials-grid" style={{ marginTop: '4px' }}>
            {options.map((opt, i) => (
                <div key={opt.label} className={`material-card ${selected === i ? 'selected' : ''}`} style={{ position: 'relative' }}>
                    <img src={opt.img} alt={opt.label} className="material-img" style={{ height: '74px' }} loading="lazy" />
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.95)', border: '1px solid #cbd5e1', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                        <ZoomIn size={12} />
                    </span>
                    <div className="material-label"><h3 style={{ fontSize: '0.9rem', margin: 0 }}>{opt.label}</h3></div>
                    {cursorOn === i && <TapCursor />}
                </div>
            ))}
        </div>
    );
}

// Scene-wrapper: absolut placeret, krydsfader — så rammen ALDRIG ændrer højde
function Scene({ id, children, center = true }) {
    return (
        <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto"
            style={{ background: 'linear-gradient(180deg,#f8fafc,#eef1f6)' }}
        >
            <div className={`min-h-full flex flex-col px-6 py-6 ${center ? 'justify-center' : 'justify-start'}`}>
                {children}
            </div>
        </motion.div>
    );
}

export default function CustomerCalculatorDemo() {
    const reduce = useReducedMotion();
    const [step, setStep] = useState(0);           // 0 opgave · 1 detaljer · 2 kontakt · 3 udarbejder · 4 overslag
    const [picked, setPicked] = useState(false);
    const [phase, setPhase] = useState(0);         // sub-trin i Detaljer
    const [typed, setTyped] = useState(0);
    const [paused, setPaused] = useState(false);
    const [amount, setAmount] = useState(0);
    const timers = useRef([]);

    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

    // Hovedforløb
    useEffect(() => {
        clearTimers();
        if (reduce || paused) return;
        if (step === 0) { setPicked(false); later(() => setPicked(true), 1200); later(() => setStep(1), 2400); }
        else if (step === 1) { later(() => setStep(2), 3800); }
        else if (step === 2) { later(() => setStep(3), 3400); }
        else if (step === 3) { later(() => setStep(4), 1700); }
        else if (step === 4) { later(() => setStep(0), 5200); }
        return clearTimers;
    }, [step, paused, reduce]);

    // Detaljer: cursoren trykker forskellige valg, til sidst "Bekræft & fortsæt"
    useEffect(() => {
        if (step !== 1) { setPhase(0); return; }
        if (reduce) { setPhase(3); return; }
        setPhase(0);
        later(() => setPhase(1), 800);
        later(() => setPhase(2), 1900);
        later(() => setPhase(3), 3000);
        return clearTimers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, reduce]);

    // Kontakt: felterne "skrives" sekventielt
    useEffect(() => {
        if (step !== 2) { setTyped(0); return; }
        if (reduce) { setTyped(CONTACT_FIELDS.length); return; }
        let n = 0; setTyped(0);
        const iv = setInterval(() => { n += 1; setTyped(n); if (n >= CONTACT_FIELDS.length) clearInterval(iv); }, 340);
        return () => clearInterval(iv);
    }, [step, reduce]);

    // Overslag: beløbet tæller op
    useEffect(() => {
        if (step !== 4) { setAmount(0); return; }
        if (reduce) { setAmount(ESTIMATE); return; }
        const controls = animate(0, ESTIMATE, { duration: 1.4, ease: 'easeOut', onUpdate: v => setAmount(Math.round(v)) });
        return () => controls.stop();
    }, [step, reduce]);

    const handlePick = () => { clearTimers(); setPicked(true); later(() => setStep(1), 500); };

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative flex flex-col"
        >
            {/* Accent-toplinje */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-orange-500"></div>

            {/* Brand-header */}
            <div className="flex items-center justify-between px-7 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-sm">
                        <Hammer size={18} className="text-orange-400 dark:text-orange-500" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">{BRAND}</span>
                </div>
                <span className="text-[0.65rem] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">Beregn overslag</span>
            </div>

            {/* Trin-indikator */}
            <div className="flex items-center gap-2 px-7 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                {STEPS.map((label, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                        <React.Fragment key={label}>
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold transition-colors duration-300 ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                                </div>
                                <span className={`text-xs font-bold hidden sm:inline transition-colors duration-300 ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Scene-område: FAST højde, scenerne krydsfader oven på hinanden → ingen hop */}
            <div className="relative" style={{ height: 'clamp(560px, 74vh, 720px)' }}>
                <AnimatePresence>

                    {/* ─── SCENE 1: Vælg opgave ─── */}
                    {step === 0 && (
                        <Scene id="s1">
                            <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-4 mb-5 shadow-sm">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 mb-1 text-lg">Hvilken opgave?</h4>
                                    <p className="text-sm text-slate-500 leading-snug">Vi ser frem til at blive en del af dit projekt.</p>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
                                    <Hammer size={24} className="text-orange-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {DEMO_CATS.map((cat) => {
                                    const isTarget = cat.id === TARGET_ID;
                                    const selected = isTarget && picked;
                                    return (
                                        <button key={cat.id} onClick={handlePick}
                                            className={`relative rounded-xl overflow-hidden border text-left transition-all duration-300 bg-white ${selected ? 'border-slate-900 ring-2 ring-slate-900/10 scale-[1.03]' : 'border-slate-100 hover:border-slate-300'}`}>
                                            <img src={cat.img} alt={cat.label} className="w-full h-20 object-cover" loading="lazy" />
                                            <div className="px-2 py-2.5"><span className="text-xs font-bold text-slate-900 leading-tight">{cat.label}</span></div>
                                            {isTarget && picked && !reduce && <TapCursor />}
                                            {selected && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow z-10"><Check size={12} strokeWidth={3} /></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </Scene>
                    )}

                    {/* ─── SCENE 2: Detaljer (1:1 med rigtig beregner) ─── */}
                    {step === 1 && (
                        <Scene id="s2" center={false}>
                            <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3 mb-4 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0"><Hammer size={18} className="text-orange-400" /></div>
                                <div className="text-sm leading-tight">
                                    <div className="text-slate-500">Dit tilbud udarbejdes af:</div>
                                    <div className="font-bold text-slate-900">{BRAND}</div>
                                </div>
                            </div>

                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>Specifikation af projekt</h2>
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>Besvar spørgsmålene nedenfor, så vi kan give dig et retvisende estimat.</p>

                            <div style={{ background: '#f8fafc', borderLeft: '4px solid #10b981', padding: '12px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <Info size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div><strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px' }}>Vejledende oplysninger</strong>Du binder dig ikke til noget — vi tager altid præcise kontrolmål på adressen før en bindende aftale.</div>
                                </div>
                            </div>

                            <QuestionCard label="Hvilken type gulv skal der lægges?">
                                <VisualSelect options={GULV} selected={phase >= 1 ? 0 : -1} cursorOn={phase === 1 && !reduce ? 0 : -1} />
                            </QuestionCard>

                            <QuestionCard label="Ligger gulvet på beton eller strøer (trækonstruktion)?">
                                <VisualSelect options={FOUNDATION} selected={phase >= 2 ? 0 : -1} cursorOn={phase === 2 && !reduce ? 0 : -1} />
                            </QuestionCard>

                            <button type="button" style={{ width: '100%', padding: '13px', border: '2px dashed #10b981', background: '#f0fdf4', color: '#059669', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Plus size={18} /> Tilføj endnu en opgave
                            </button>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <button type="button" className="wizard-btn wizard-btn-secondary">← Tilbage</button>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <button type="button" className="wizard-btn wizard-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Bekræft & Fortsæt til prisberegning →</button>
                                    {phase >= 3 && !reduce && <TapCursor />}
                                </div>
                            </div>
                        </Scene>
                    )}

                    {/* ─── SCENE 3: Kontakt ─── */}
                    {step === 2 && (
                        <Scene id="s3">
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>Kontaktoplysninger</h2>
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>Så vi kan sende dig dit personlige overslag.</p>

                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 mb-5">
                                <div className="text-center text-sm font-bold py-2 rounded-lg bg-white text-slate-900 shadow-sm">Privatkunde</div>
                                <div className="text-center text-sm font-semibold py-2 text-slate-500">Erhvervskunde</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {CONTACT_FIELDS.map((f, i) => {
                                    const filled = i < typed;
                                    const focus = i === typed;
                                    return (
                                        <div key={f.label} className={f.full ? 'col-span-2' : 'col-span-1'}>
                                            <div className="text-xs font-semibold text-slate-600 mb-1">{f.label} <span className="text-orange-500">*</span></div>
                                            <div className={`rounded-lg border-2 px-3 py-2.5 text-sm truncate bg-white transition-all duration-200 ${focus ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} ${filled ? 'text-slate-900 font-medium' : 'text-slate-300'}`}>
                                                {filled ? f.value : '—'}
                                                {focus && !reduce && <span className="inline-block w-px h-4 bg-blue-500 align-middle ml-0.5 animate-pulse" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ position: 'relative', marginTop: '20px' }}>
                                <button type="button" className="wizard-btn wizard-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.05rem' }}>Se mit overslag →</button>
                                {!reduce && typed >= CONTACT_FIELDS.length && <TapCursor />}
                            </div>
                        </Scene>
                    )}

                    {/* ─── SCENE 4: Udarbejder overslag ─── */}
                    {step === 3 && (
                        <Scene id="gen">
                            <div className="flex flex-col items-center justify-center text-center">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-blue-600 mb-6"><Loader2 size={44} strokeWidth={2.5} /></motion.div>
                                <div className="font-bold text-slate-900 text-lg mb-1">Udarbejder dit overslag…</div>
                                <p className="text-sm text-slate-500">Beregner ud fra {BRAND}s egne priser</p>
                            </div>
                        </Scene>
                    )}

                    {/* ─── SCENE 5: Vejledende overslag (1:1 med StepResult) ─── */}
                    {step === 4 && (
                        <Scene id="s5" center={false}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Dit vejledende overslag er klar!</h2>
                                <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.55 }}>Et realistisk udgangspunkt, du trygt kan bruge til at sammenligne markedet.</p>
                            </div>

                            <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 'var(--radius-xl)', padding: '26px', textAlign: 'center', marginBottom: '18px' }}>
                                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Forventet prisramme</span>
                                <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: 900, margin: '0 0 8px 0', color: 'var(--text-primary)' }} className="tabular-nums">{amount.toLocaleString('da-DK')} kr.</h1>
                                <p style={{ fontSize: '0.9rem', margin: 0, color: '#64748b', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.5 }}>Vejledende pris inkl. moms. Et endeligt tilbud fra os vil oftest lande lidt lavere.</p>
                            </div>

                            <div style={{ background: '#f0fdf4', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
                                <h3 style={{ fontSize: '1.1rem', color: '#166534', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                    <Check size={20} strokeWidth={2.5} color="#16a34a" /> Overslaget inkluderer:
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
                                    {INCLUDES.map((task, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.1 }} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#166534', lineHeight: 1.45 }}>
                                            <Check size={16} strokeWidth={3} color="#22c55e" style={{ marginTop: 3, flexShrink: 0 }} />
                                            <span>{task}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: '16px 18px', borderRadius: 'var(--radius-lg)', marginBottom: '18px' }}>
                                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1.02rem' }}>Er du klar til at vælge {BRAND}?</strong>
                                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55 }}>Overslaget er sendt til din mail. Går du videre herfra, sender du opgaven til os. Vi kontakter dig for at aftale de sidste detaljer og låse den endelige pris i en aftale.</p>
                            </div>

                            <button type="button" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16,185,129,0.3)' }}>
                                Vælg {BRAND} til at udføre opgaven
                            </button>
                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Annuller og start helt forfra</span>
                            </div>
                        </Scene>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer-linje (som den rigtige portal) */}
            <div className="text-center py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[0.7rem] text-slate-400 dark:text-slate-500">Overslaget er sikkert udarbejdet med platformen Bison Frame</span>
            </div>
        </div>
    );
}
