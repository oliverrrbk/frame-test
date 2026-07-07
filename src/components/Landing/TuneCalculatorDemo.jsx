import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useReducedMotion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

/**
 * TuneCalculatorDemo — marketing-mockup af den ægte "Skru prisen til din
 * virksomhed"-simulator (Wizard/SimulatorTuner.jsx). Bygget 1:1 med SAMME
 * klasser + CSS og samme glas-design, men selvkørende: ÉN sammenhængende mus
 * glider hen til hvert punkt, klikker, trækker sliderne og åbner/lukker
 * modalerne det rigtige sted, mens "Din pris" opdaterer live.
 *
 * Retning i loopet: vis det beregnede forslag → skru på alle slidere →
 * åbn så forklaringerne (opgave → prisberegning → materialepriser).
 *
 * Rører ikke den låste beregningsmotor — priserne beregnes med en lokal,
 * retvisende formel der rammer de rigtige tal. Samme gulvopgave som top-demoen.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (n) => new Intl.NumberFormat('da-DK').format(Math.round(n || 0));

// ── Referencetal for gulvopgaven (matcher StepResult/tuneren 1:1) ──
const BASE_HOURS = 42;          // arbejdstimer ved neutralt tempo
const RAW_MATERIAL = 38416;     // råmateriale ekskl. avance (×1.15 = 44.178)
const FIXED_EXTRAS = 7822;      // kørsel, buffere, tillæg (ekskl. moms)
const BASE_INC = 91250;         // standard-pris inkl. moms

// Arbejdstempo: slider 0..100 (venstre=langsom, 50=neutral) → faktor 1.5..0.5
const sliderToSpeed = (s) => clamp(1.0 + ((50 - s) / 50) * 0.5, 0.5, 1.5);

const RANGE = { speed: [0, 100], rate: [250, 1200], markup: [0, 60], overall: [-20, 40] };
const isSlider = (k) => k in RANGE;

// ── Sub-modal-indhold (1:1 med den rigtige gulvberegning) ──
const TASK_LIST = [
    'Nedbrydning og bortskaffelse af eksisterende trægulv / parket / laminat og fodpaneler',
    'Opretning/slibning af betonundergulv samt underlag med dampspærre',
    'Levering og lægning af 20 m² Massivt træ',
    'Afsluttende finish: Montering og geringsskæring af nye fodlister samt fugning',
    'Kørsel, logistik, professionelt værktøj samt løbende og afsluttende oprydning (vi efterlader altid dit hjem pænt og ryddeligt)',
];

const BREAKDOWN = [
    'Basis montering vurderet til ca. 8.0 arbejdstimer',
    'Hovedmateriale: Massivt træ. Forbrug: 20 enhed(er) á 1200 kr. = 24.000 kr. (Hertil lægges automatisk +15% avance)',
    'Miljøtillæg: Bortskaffelse af mindre volumen på trailer (+ 4.0 arbejdstimer incl. sortering) - Uden avance',
    'Tillæg: 15% materialespild (afskær) medregnet til specialmønster (Nej, helt standard montering)',
    'Tillæg: Nedbrydning af eksisterende trægulv/parket/laminat',
    'Miljøtillæg: Containerleje og affaldsgebyrer for bortskaffelse af eksisterende gulv (Uden avance)',
    'Standard: Opretning af undergulv (inkl. tid og materialer)',
    'Standard: Montering af trinlydsdæmpende underlag (foam/pap)',
    'Standard: Levering og montering af nye fodlister langs alle vægge for komplet finish',
    'Tillæg: Forøget tidsforbrug (+100%) samt dyr speciallim til fuldlimning af mønstergulv (Nej, helt standard montering)',
    'Sikkerhedsbuffer tillagt prisen for at dække uforudsete forhindringer/udgifter',
    'Tillæg: 10% forbrugsstoffer (lim, skruer, underlagstape, kiler, afdækning) lagt på fysiske materialer: 3853 kr.',
    'Kørsel & Logistik (Peter Fabers vej 45 1. tv → Kundens adresse): 33.6 km hver vej.',
    'Slitage-takst (bil) samt lukkede timer under transport (Estimeret 3 dag(e)) udregnet til i alt: 2400 kr',
    'Tillæg: 20% tømrer-risikobuffer lagt på arbejdsløn og transport for uforudsete forhold: 4680 kr.',
];

const MATERIALS = [
    { name: 'Massivt træ', price: 1200, tag: 'valgt' },
    { name: 'Beton', price: 800 },
    { name: 'Fliser (keramik/porcelæn)', price: 500 },
    { name: 'Fodlister (pr. m2 gulvareal proxy)', price: 50 },
    { name: 'Fodpaneler (pr. løbende meter)', price: 120 },
    { name: 'Kork', price: 550 },
    { name: 'Laminat', price: 300 },
    { name: 'Linoleum', price: 400 },
    { name: 'Natursten', price: 1000 },
    { name: 'Opretning af undergulv', price: 120 },
    { name: 'Parket', price: 750 },
    { name: 'Sikkerhed (Buffer-pris)', price: 400 },
    { name: 'Sildebensparket', price: 1500 },
    { name: 'Trinlydsunderlag (Foam)', price: 45 },
    { name: 'Træ', price: 600 },
    { name: 'Tæppe', price: 250 },
    { name: 'Undergulv / Strøer (pr. m2)', price: 350 },
    { name: 'Vinyl', price: 350 },
    { name: 'Bortskaffelse af gulv (pr m2)', price: 50, tag: 'standard' },
    { name: 'Bortskaffelse af tungt gulv (pr m2)', price: 120, tag: 'standard' },
    { name: 'Bærende undergulv (Spånplader)', price: 120, tag: 'standard' },
    { name: 'Default', price: 400, tag: 'standard' },
    { name: 'Gulvvarme (Specialunderlag)', price: 80, tag: 'standard' },
    { name: 'Gulvvarme (Sporplader)', price: 450, tag: 'standard' },
    { name: 'Limning (Fuldlimning af mønstergulv)', price: 60, tag: 'standard' },
];

// Deler en linje op i fed ledetekst + brødtekst (1:1 med tunerens renderPoints).
const renderPoints = (lines) => lines.map((line, i) => {
    const idx = line.indexOf(': ');
    if (idx > 0 && idx < 42) {
        return (
            <div key={i} className="bftuner-point">
                <span className="bftuner-point-dot" />
                <div><strong>{line.slice(0, idx)}:</strong> {line.slice(idx + 2)}</div>
            </div>
        );
    }
    return (
        <div key={i} className="bftuner-point">
            <span className="bftuner-point-dot" />
            <div>{line}</div>
        </div>
    );
});

// Slider bygget 1:1 med tunerens GlassSlider (inputRef bruges til at måle knappen).
function DemoSlider({ label, value, min, max, accent = '#007aff', displayValue, leftLabel, rightLabel, hint, inputRef }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="bftuner-control">
            <div className="bftuner-control-head">
                <span className="bftuner-control-label">{label}</span>
                <span className="bftuner-control-value" style={{ color: accent }}>{displayValue}</span>
            </div>
            <input
                ref={inputRef}
                type="range" className="bftuner-range" min={min} max={max} value={value} readOnly tabIndex={-1}
                style={{ background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(17,17,17,0.08) ${pct}%, rgba(17,17,17,0.08) 100%)` }}
            />
            {(leftLabel || rightLabel) && (
                <div className="bftuner-range-ends"><span>{leftLabel}</span><span>{rightLabel}</span></div>
            )}
            {hint && <span className="bftuner-control-hint">{hint}</span>}
        </div>
    );
}

// Loopet: musen glider til hvert punkt (move), klikker, og udfører handlingen.
const STEPS = [
    { hold: 1300 },                                          // 0 · vis det beregnede forslag
    { move: 'speed', drag: { key: 'speed', to: 66 }, hold: 1200 },   // 1 · hurtigere
    { move: 'rate', drag: { key: 'rate', to: 650 }, hold: 1200 },    // 2 · timepris
    { move: 'markup', drag: { key: 'markup', to: 25 }, hold: 1200 }, // 3 · materialeavance
    { move: 'overall', drag: { key: 'overall', to: 8 }, hold: 1200 },// 4 · samlet avance
    { move: 'opgBtn', open: 'tasks', hold: 1900 },           // 5 · opgavebeskrivelse
    { move: 'modalClose', close: true, hold: 450 },          // 6 · luk
    { move: 'breakdownBtn', open: 'breakdown', hold: 2100 }, // 7 · sådan er prisen regnet
    { move: 'modalClose', close: true, hold: 450 },          // 8 · luk
    { move: 'materialsBtn', open: 'materials', hold: 2300 }, // 9 · materialepriser (til sidst)
    { move: 'modalClose', close: true, hold: 450 },          // 10 · luk
    { move: 'saveBtn', hold: 1500 },                         // 11 · gem som standardpriser
    { reset: true, hold: 800 },                              // 12 · nulstil → loop
];

export default function TuneCalculatorDemo() {
    const reduce = useReducedMotion();
    const [paused, setPaused] = useState(false);
    const [inView, setInView] = useState(false);
    const [step, setStep] = useState(0);
    const [modal, setModal] = useState(null);
    const [clickTick, setClickTick] = useState(0);

    const [speed, setSpeed] = useState(50);      // 50 = neutral
    const [rate, setRate] = useState(500);       // timepris kr./t
    const [markup, setMarkup] = useState(15);    // materialeavance %
    const [overall, setOverall] = useState(0);   // samlet avance %

    const containerRef = useRef(null);
    const refs = useRef({});
    const setRef = (k) => (el) => { if (el) refs.current[k] = el; };
    const cx = useMotionValue(140);
    const cy = useMotionValue(320);

    // Live-beregning (retvisende, men uden den låste motor).
    const speedFactor = sliderToSpeed(speed);
    const adjHours = Math.max(0, Math.round(BASE_HOURS * speedFactor));
    const speedEffectPct = Math.round((1 - speedFactor) * 100);
    const materialCost = Math.round(RAW_MATERIAL * (1 + markup / 100));
    const exVatBase = adjHours * rate + materialCost + FIXED_EXTRAS;
    const exVat = Math.ceil((exVatBase * (1 + overall / 100)) / 1000) * 1000;
    const incVat = Math.round(exVat * 1.25);
    const dirty = Math.abs(incVat - BASE_INC);
    const cheaper = incVat < BASE_INC;

    const pulseSave = STEPS[step]?.move === 'saveBtn';

    // Kør kun når demoen er i syne — og start altid forfra når man ruller til den,
    // så man ser hele forløbet fra begyndelsen (ikke midt i et loop).
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;
        setStep(0);
        setSpeed(50); setRate(500); setMarkup(15); setOverall(0);
        setModal(null);
        cx.set(140); cy.set(320);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView]);

    // Loop-motor: glider musen til hvert punkt, klikker og udfører handlingen.
    useEffect(() => {
        if (reduce || paused || !inView) return;

        const vals = { speed, rate, markup, overall };
        const setters = { speed: setSpeed, rate: setRate, markup: setMarkup, overall: setOverall };
        const s = STEPS[step];
        let cancelled = false;
        const anims = [];
        const timers = [];
        const sleep = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)));

        const rel = (el) => {
            const c = containerRef.current?.getBoundingClientRect();
            const r = el?.getBoundingClientRect?.();
            if (!c || !r) return null;
            return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
        };
        const pointFor = (key, value) => {
            const box = rel(refs.current[key]);
            if (!box) return null;
            if (isSlider(key)) {
                const [mn, mx] = RANGE[key];
                const pct = (value - mn) / (mx - mn);
                const half = 12; // thumb 24px
                return { x: box.x + half + pct * (box.w - 2 * half), y: box.y + box.h / 2 };
            }
            return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
        };
        const moveTo = async (p) => {
            if (!p) return;
            const dist = Math.hypot(p.x - cx.get(), p.y - cy.get());
            const dur = clamp(dist / 900, 0.35, 0.85);
            const a1 = animate(cx, p.x, { duration: dur, ease: [0.22, 1, 0.36, 1] });
            const a2 = animate(cy, p.y, { duration: dur, ease: [0.22, 1, 0.36, 1] });
            anims.push(a1, a2);
            await Promise.all([a1.finished, a2.finished]);
        };
        const click = () => setClickTick((t) => t + 1);

        (async () => {
            if (s.reset) {
                setSpeed(50); setRate(500); setMarkup(15); setOverall(0);
                await sleep(s.hold);
                if (!cancelled) setStep((i) => (i + 1) % STEPS.length);
                return;
            }

            if (s.move) {
                await moveTo(isSlider(s.move) ? pointFor(s.move, vals[s.move]) : pointFor(s.move));
                if (cancelled) return;
                click();
                await sleep(140);
                if (cancelled) return;
            }

            if (s.open) setModal(s.open);
            if (s.close) setModal(null);

            if (s.drag) {
                const { key, to } = s.drag;
                const dur = 0.9;
                const av = animate(vals[key], to, {
                    duration: dur, ease: [0.16, 1, 0.3, 1],
                    onUpdate: (v) => setters[key](key === 'rate' ? Math.round(v / 5) * 5 : Math.round(v)),
                });
                const endX = pointFor(key, to)?.x;
                const ax = endX != null ? animate(cx, endX, { duration: dur, ease: [0.16, 1, 0.3, 1] }) : null;
                anims.push(av); if (ax) anims.push(ax);
                await Promise.all([av.finished, ax?.finished].filter(Boolean));
                if (cancelled) return;
            }

            await sleep(s.hold);
            if (!cancelled) setStep((i) => (i + 1) % STEPS.length);
        })();

        return () => { cancelled = true; anims.forEach((a) => a.stop && a.stop()); timers.forEach(clearTimeout); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, paused, reduce, inView]);

    return (
        <div
            ref={containerRef}
            className="tunerdemo"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{ position: 'relative', width: '100%', height: 'clamp(700px, 88vh, 880px)', borderRadius: '24px', overflow: 'hidden' }}
        >
            <style>{DEMO_CSS}</style>

            <div className="bftuner-shell" style={{ width: '100%', height: '100%', maxHeight: 'none', animation: 'none', borderRadius: '24px' }}>
                <div className="bftuner-topbar">
                    <div>
                        <span className="bftuner-eyebrow">Simulator · Tilpas beregning</span>
                        <h2 className="bftuner-title">Skru prisen til din virksomhed</h2>
                    </div>
                    <button className="bftuner-close" tabIndex={-1} aria-hidden>✕</button>
                </div>

                <div className="bftuner-body">
                    {/* VENSTRE: resultat */}
                    <div className="bftuner-result">
                        <div className="bftuner-price-card">
                            <span className="bftuner-price-eyebrow">Din pris · inkl. moms</span>
                            <div className="bftuner-price-main tabular-nums">{fmt(incVat)} kr.</div>
                            <div className="bftuner-price-sub tabular-nums">{fmt(exVat)} kr. ekskl. moms</div>
                            {dirty > 0 && (
                                <div className={`bftuner-delta ${cheaper ? 'down' : 'up'}`}>
                                    {cheaper ? '▼' : '▲'} {fmt(dirty)} kr. {cheaper ? 'lavere' : 'højere'} end standard
                                </div>
                            )}
                        </div>

                        <div className="bftuner-stats">
                            <div className="bftuner-stat">
                                <span className="bftuner-stat-label">Arbejdstimer</span>
                                <span className="bftuner-stat-value">
                                    {adjHours} t
                                    {adjHours !== BASE_HOURS && <em> (standard {BASE_HOURS} t)</em>}
                                </span>
                            </div>
                            <div className="bftuner-stat">
                                <span className="bftuner-stat-label">Materialer (m. avance)</span>
                                <span className="bftuner-stat-value tabular-nums">{fmt(materialCost)} kr.</span>
                            </div>
                            <div className="bftuner-stat">
                                <span className="bftuner-stat-label">Timepris</span>
                                <span className="bftuner-stat-value tabular-nums">{fmt(rate)} kr./t</span>
                            </div>
                        </div>

                        <button ref={setRef('opgBtn')} className="bftuner-materials-open" style={{ marginTop: '14px' }} tabIndex={-1}>
                            <span className="bftuner-materials-open-text">
                                <strong>Opgavebeskrivelse</strong>
                                <em>{TASK_LIST.length} trin · se hele opgaven</em>
                            </span>
                            <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                        </button>

                        <button ref={setRef('breakdownBtn')} className="bftuner-materials-open" style={{ marginTop: '12px' }} tabIndex={-1}>
                            <span className="bftuner-materials-open-text">
                                <strong>Sådan er prisen regnet</strong>
                                <em>{BREAKDOWN.length} linjer · timer, materialer, tillæg</em>
                            </span>
                            <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                        </button>
                    </div>

                    {/* HØJRE: skruer */}
                    <div className="bftuner-controls">
                        <div className="bftuner-hero">
                            <DemoSlider
                                label="Hvor hurtigt laver du opgaven?"
                                accent="#0f172a"
                                value={speed} min={0} max={100}
                                inputRef={setRef('speed')}
                                leftLabel="Langsommere" rightLabel="Hurtigere"
                                displayValue={speedEffectPct === 0 ? 'Neutral' : (speedEffectPct > 0 ? `${speedEffectPct}% hurtigere` : `${Math.abs(speedEffectPct)}% langsommere`)}
                                hint="Ændrer de kalkulerede arbejdstimer på alle opgaver — aldrig materialer."
                            />
                            <div className="bftuner-hero-hours">
                                Timer på denne opgave: <strong>{adjHours} t</strong>
                                {adjHours !== BASE_HOURS && <span> i stedet for {BASE_HOURS} t</span>}
                            </div>
                        </div>

                        <DemoSlider
                            label="Timepris" accent="#007aff"
                            value={rate} min={250} max={1200} inputRef={setRef('rate')}
                            displayValue={`${fmt(rate)} kr./t`}
                            hint="Ekskl. moms. Grundlag for alle arbejdstimer."
                        />

                        <DemoSlider
                            label="Materialeavance" accent="#10b981"
                            value={markup} min={0} max={60} inputRef={setRef('markup')}
                            displayValue={`+${markup}%`}
                            hint="Fortjeneste/svind oven på indkøbte råmaterialer."
                        />

                        <div className="bftuner-overlay-knob">
                            <DemoSlider
                                label="Samlet avance (kun simulator)" accent="#ef4444"
                                value={overall} min={-20} max={40} inputRef={setRef('overall')}
                                displayValue={`${overall > 0 ? '+' : ''}${overall}%`}
                                hint="Hurtig 'hvad-nu-hvis' oven på hele prisen. Gemmes ikke i dine faste priser."
                            />
                        </div>

                        <button ref={setRef('materialsBtn')} className="bftuner-materials-open" tabIndex={-1}>
                            <span className="bftuner-materials-open-text">
                                <strong>Materialepriser for denne opgave</strong>
                                <em>{MATERIALS.length} materialer · ret indkøbspriser</em>
                            </span>
                            <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                        </button>
                    </div>
                </div>

                <div className="bftuner-footer">
                    <button className="bftuner-btn ghost" tabIndex={-1}>Nulstil</button>
                    <div className="bftuner-footer-right">
                        <button className="bftuner-btn secondary" tabIndex={-1}>Luk</button>
                        <button ref={setRef('saveBtn')} className={`bftuner-btn primary ${pulseSave ? 'is-pulsing' : ''}`} tabIndex={-1}>
                            Gem som mine standardpriser
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-modaler — vises INDE i rammen (ikke fuld skærm) */}
            <AnimatePresence>
                {modal === 'tasks' && (
                    <DemoModal key="tasks" eyebrow="Opgavebeskrivelse" title="Sådan udføres opgaven" closeRef={setRef('modalClose')}>
                        <div className="bftuner-matmodal-body">
                            <ol className="bftuner-tasklist wide">
                                {TASK_LIST.map((t, i) => <li key={i}>{t}</li>)}
                            </ol>
                        </div>
                        <div className="bftuner-matmodal-footer">
                            <button className="bftuner-btn speak" tabIndex={-1} style={{ marginRight: 'auto' }}>🔊 Læs højt</button>
                            <button className="bftuner-btn primary" tabIndex={-1}>Luk</button>
                        </div>
                    </DemoModal>
                )}

                {modal === 'breakdown' && (
                    <DemoModal key="breakdown" eyebrow="Prisberegning" title="Sådan er prisen regnet" width="min(900px, 96%)" closeRef={setRef('modalClose')}>
                        <div className="bftuner-matmodal-body">
                            <div className="bftuner-points cols2">{renderPoints(BREAKDOWN)}</div>
                        </div>
                        <div className="bftuner-matmodal-footer">
                            <button className="bftuner-btn speak" tabIndex={-1} style={{ marginRight: 'auto' }}>🔊 Læs højt</button>
                            <button className="bftuner-btn primary" tabIndex={-1}>Luk</button>
                        </div>
                    </DemoModal>
                )}

                {modal === 'materials' && (
                    <DemoModal key="materials" eyebrow="Materialepriser" title="Ret indkøbspriser for denne opgave" width="min(980px, 97%)" closeRef={setRef('modalClose')}>
                        <p className="bftuner-matmodal-note">Indkøbspriser ekskl. moms og avance. Rettelser slår igennem i beregningen med det samme, og "Gem" skriver dem til dine faste priser. <span className="bftuner-tag missing-inline">Standard</span> = pris du ikke selv har sat endnu.</p>
                        <div className="bftuner-matmodal-body">
                            <div className="bftuner-matmodal-grid">
                                {MATERIALS.map((m) => (
                                    <div key={m.name} className={`bftuner-mat-row ${m.tag === 'valgt' ? 'chosen' : ''}`}>
                                        <div className="bftuner-mat-name">
                                            {m.tag === 'valgt' && <span className="bftuner-mat-tag">valgt</span>}
                                            {m.tag === 'standard' && <span className="bftuner-mat-tag missing">standard</span>}
                                            {m.name}
                                        </div>
                                        <div className="bftuner-mat-input">
                                            <input type="text" value={m.price} readOnly tabIndex={-1} />
                                            <span>kr.</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bftuner-matmodal-footer">
                            <button className="bftuner-btn secondary" tabIndex={-1}>Luk</button>
                            <button className="bftuner-btn primary" tabIndex={-1}>Gem materialepriser</button>
                        </div>
                    </DemoModal>
                )}
            </AnimatePresence>

            {/* Den ene sammenhængende mus der kører hele vejen igennem */}
            {!reduce && (
                <motion.div style={{ position: 'absolute', top: 0, left: 0, x: cx, y: cy, zIndex: 60, pointerEvents: 'none' }}>
                    <div style={{ position: 'relative' }}>
                        <MousePointer2 size={22} fill="#0f172a" color="#0f172a" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))' }} />
                        <motion.span
                            key={clickTick}
                            initial={{ scale: 0.3, opacity: 0.55 }}
                            animate={{ scale: 2.4, opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ position: 'absolute', top: 2, left: 2, width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: '50%', background: 'rgba(59,130,246,0.5)' }}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// Modal-skal der ligger INDE i demo-rammen (absolut, ikke fixed).
function DemoModal({ eyebrow, title, children, width = 'min(680px, 96%)', closeRef }) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
        >
            <motion.div
                className="bftuner-matmodal"
                initial={{ y: 16, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ width, maxHeight: '94%' }}
            >
                <div className="bftuner-matmodal-top">
                    <div>
                        <span className="bftuner-eyebrow">{eyebrow}</span>
                        <h2 className="bftuner-title">{title}</h2>
                    </div>
                    <button ref={closeRef} className="bftuner-close" tabIndex={-1} aria-hidden>✕</button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}

// ── CSS: kopi af den ægte TUNER_CSS (Wizard/SimulatorTuner.jsx) så det er 1:1,
// scoped under .tunerdemo. Kun positionering er tilpasset til at ligge i rammen.
const DEMO_CSS = `
.tunerdemo, .tunerdemo * { box-sizing: border-box; }
.tunerdemo .bftuner-shell {
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #ffffff, #fbfcfe);
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 30px 80px -24px rgba(15,23,42,0.28), 0 8px 24px -14px rgba(15,23,42,0.16);
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
}
.tunerdemo .bftuner-topbar {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 22px 28px; border-bottom: 1px solid rgba(15,23,42,0.07);
    background: linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1));
}
.tunerdemo .bftuner-eyebrow { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
.tunerdemo .bftuner-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
.tunerdemo .bftuner-close {
    width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(15,23,42,0.1);
    background: rgba(255,255,255,0.7); color: #475569; font-size: 1rem; cursor: default;
    transition: all 0.18s ease; flex-shrink: 0;
}
.tunerdemo .bftuner-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
.tunerdemo .bftuner-result { padding: 24px 28px; overflow-y: auto; border-right: 1px solid rgba(15,23,42,0.07); display: flex; flex-direction: column; justify-content: safe center; }
.tunerdemo .bftuner-controls { padding: 24px 28px; overflow-y: auto; display: flex; flex-direction: column; justify-content: safe center; gap: 18px; }
.tunerdemo .bftuner-price-card {
    background: linear-gradient(135deg, rgba(15,23,42,0.03), rgba(15,23,42,0.01));
    border: 1px solid rgba(15,23,42,0.08); border-radius: 20px; padding: 28px 24px; text-align: center;
}
.tunerdemo .bftuner-price-eyebrow { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
.tunerdemo .bftuner-price-main { font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; color: #0f172a; line-height: 1.05; }
.tunerdemo .bftuner-price-sub { font-size: 1.1rem; font-weight: 600; color: #64748b; margin-top: 4px; }
.tunerdemo .bftuner-delta { display: inline-block; margin-top: 14px; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; }
.tunerdemo .bftuner-delta.down { background: rgba(16,185,129,0.12); color: #047857; }
.tunerdemo .bftuner-delta.up { background: rgba(239,68,68,0.12); color: #b91c1c; }
.tunerdemo .bftuner-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 16px; }
.tunerdemo .bftuner-stat { background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.06); border-radius: 14px; padding: 12px; }
.tunerdemo .bftuner-stat-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #94a3b8; margin-bottom: 4px; }
.tunerdemo .bftuner-stat-value { font-size: 0.98rem; font-weight: 800; color: #0f172a; }
.tunerdemo .bftuner-stat-value em { font-style: normal; font-weight: 600; font-size: 0.78rem; color: #94a3b8; }
.tunerdemo .bftuner-points { display: flex; flex-direction: column; }
.tunerdemo .bftuner-points.cols2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; }
.tunerdemo .bftuner-point { display: flex; gap: 12px; padding: 13px 4px; border-bottom: 1px solid rgba(15,23,42,0.06); font-size: 0.95rem; color: #475569; line-height: 1.55; }
.tunerdemo .bftuner-point:last-child { border-bottom: none; }
.tunerdemo .bftuner-point strong { color: #0f172a; font-weight: 800; }
.tunerdemo .bftuner-point-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; margin-top: 8px; flex-shrink: 0; }
.tunerdemo .bftuner-tasklist.wide { padding: 4px 0 4px 24px; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.tunerdemo .bftuner-tasklist.wide li { font-size: 0.98rem; line-height: 1.55; padding-left: 6px; color: #475569; }
.tunerdemo .bftuner-tasklist.wide li::marker { color: #94a3b8; font-weight: 800; }
.tunerdemo .bftuner-control { display: flex; flex-direction: column; gap: 8px; }
.tunerdemo .bftuner-control-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.tunerdemo .bftuner-control-label { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
.tunerdemo .bftuner-control-value { font-size: 0.95rem; font-weight: 800; white-space: nowrap; }
.tunerdemo .bftuner-control-hint { font-size: 0.78rem; color: #94a3b8; line-height: 1.4; }
.tunerdemo .bftuner-range-ends { display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-top: -2px; }
.tunerdemo .bftuner-range { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; cursor: default; }
.tunerdemo .bftuner-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #0f172a; box-shadow: 0 4px 12px rgba(15,23,42,0.25); }
.tunerdemo .bftuner-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #0f172a; box-shadow: 0 4px 12px rgba(15,23,42,0.25); }
.tunerdemo .bftuner-hero { padding: 18px; border-radius: 18px; background: linear-gradient(135deg, rgba(15,23,42,0.05), rgba(0,122,255,0.05)); border: 1px solid rgba(15,23,42,0.08); }
.tunerdemo .bftuner-hero-hours { margin-top: 12px; font-size: 0.85rem; color: #475569; }
.tunerdemo .bftuner-hero-hours strong { color: #0f172a; }
.tunerdemo .bftuner-overlay-knob { padding: 16px; border-radius: 16px; background: rgba(239,68,68,0.05); border: 1px dashed rgba(239,68,68,0.3); }
.tunerdemo .bftuner-materials-open { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; border-radius: 16px; border: 1px solid rgba(15,23,42,0.12); background: rgba(255,255,255,0.7); cursor: default; transition: all 0.18s ease; text-align: left; }
.tunerdemo .bftuner-materials-open:hover { border-color: #0f172a; background: #fff; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
.tunerdemo .bftuner-materials-open-text { display: flex; flex-direction: column; gap: 2px; }
.tunerdemo .bftuner-materials-open-text strong { font-size: 0.95rem; color: #0f172a; }
.tunerdemo .bftuner-materials-open-text em { font-style: normal; font-size: 0.78rem; color: #94a3b8; }
.tunerdemo .bftuner-materials-open-arrow { font-size: 1.2rem; color: #0f172a; flex-shrink: 0; }
.tunerdemo .bftuner-matmodal { display: flex; flex-direction: column; background: linear-gradient(180deg, #ffffff, #fbfcfe); border: 1px solid rgba(15,23,42,0.08); border-radius: 24px; box-shadow: 0 40px 100px -20px rgba(15,23,42,0.5); overflow: hidden; -webkit-font-smoothing: antialiased; }
.tunerdemo .bftuner-matmodal-top { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(15,23,42,0.07); }
.tunerdemo .bftuner-matmodal-note { margin: 0; padding: 14px 24px; font-size: 0.82rem; color: #64748b; line-height: 1.5; border-bottom: 1px solid rgba(15,23,42,0.05); }
.tunerdemo .bftuner-tag.missing-inline { display: inline-block; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 1px 6px; border-radius: 6px; background: #f59e0b; color: #fff; vertical-align: middle; }
.tunerdemo .bftuner-matmodal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 24px; }
.tunerdemo .bftuner-matmodal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.tunerdemo .bftuner-matmodal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid rgba(15,23,42,0.07); background: linear-gradient(0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2)); }
.tunerdemo .bftuner-mat-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(15,23,42,0.02); border: 1px solid rgba(15,23,42,0.05); }
.tunerdemo .bftuner-mat-row.chosen { background: rgba(0,122,255,0.07); border-color: rgba(0,122,255,0.25); }
.tunerdemo .bftuner-mat-name { font-size: 0.84rem; color: #0f172a; font-weight: 600; display: flex; align-items: center; gap: 6px; flex: 1; }
.tunerdemo .bftuner-mat-tag { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 2px 6px; border-radius: 6px; background: #007aff; color: #fff; }
.tunerdemo .bftuner-mat-tag.missing { background: #f59e0b; }
.tunerdemo .bftuner-mat-input { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.tunerdemo .bftuner-mat-input input { width: 84px; padding: 6px 8px; border: 1px solid rgba(15,23,42,0.15); border-radius: 8px; font-size: 0.86rem; text-align: right; background: #fff; color: #0f172a; }
.tunerdemo .bftuner-mat-input span { font-size: 0.78rem; color: #94a3b8; }
.tunerdemo .bftuner-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 28px; border-top: 1px solid rgba(15,23,42,0.07); background: linear-gradient(0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2)); }
.tunerdemo .bftuner-footer-right { display: flex; gap: 12px; }
.tunerdemo .bftuner-btn { padding: 12px 22px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; cursor: default; border: 1px solid transparent; transition: all 0.18s ease; }
.tunerdemo .bftuner-btn.ghost { background: transparent; color: #94a3b8; }
.tunerdemo .bftuner-btn.secondary { background: rgba(15,23,42,0.06); color: #475569; }
.tunerdemo .bftuner-btn.primary { background: #0f172a; color: #fff; box-shadow: 0 8px 20px rgba(15,23,42,0.25); }
.tunerdemo .bftuner-btn.primary.is-pulsing { animation: tunerdemoPulse 1s ease infinite; }
.tunerdemo .bftuner-btn.speak { background: rgba(0,122,255,0.1); color: #0369a1; }
@keyframes tunerdemoPulse { 0%,100% { box-shadow: 0 8px 20px rgba(15,23,42,0.25); } 50% { box-shadow: 0 8px 30px rgba(15,23,42,0.45); transform: translateY(-2px); } }
@media (max-width: 860px) {
    .tunerdemo .bftuner-body { grid-template-columns: 1fr; display: block; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .tunerdemo .bftuner-result { border-right: none; border-bottom: 8px solid rgba(15,23,42,0.04); overflow: visible; padding: 18px 18px 24px; }
    .tunerdemo .bftuner-controls { overflow: visible; padding: 18px 18px 28px; gap: 16px; }
    .tunerdemo .bftuner-topbar { padding: 16px 18px; }
    .tunerdemo .bftuner-title { font-size: 1.2rem; }
    .tunerdemo .bftuner-stats { grid-template-columns: 1fr 1fr; }
    .tunerdemo .bftuner-footer { padding: 14px 18px; flex-wrap: wrap; }
    .tunerdemo .bftuner-matmodal-grid { grid-template-columns: 1fr; }
}
`;
