import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { performCalculation } from '../../utils/calculator';
import { fetchCalibrationFactor } from '../../utils/calibration';
import { generateTaskDescription } from '../../utils/taskDescription';
import { MATERIAL_INDEX } from '../../prices';
import { speakText, stopSpeaking } from '../../utils/speech';

/**
 * SimulatorTuner — "Tilpas beregning" i simulatoren.
 *
 * Venstre: resultat (inkl./ekskl. moms), timer, opgavebeskrivelse + prisberegning
 *          (foldes ud). Alt opdateres live.
 * Højre: arbejdstempo (ændrer de kalkulerede timer), timepris, materialeavance,
 *        samlet avance (simulator-overlay) + editor til materialepriser for den
 *        valgte opgave.
 *
 * Genberegner ved at KLONE settings/materialer + kalde den eksisterende
 * performCalculation. Rører hverken calculator.js, prices.js eller Wizard.jsx'
 * beregningslogik. Materialeavance/tempo/timepris gemmes til DB og gælder
 * universelt; "Samlet avance" er kun en simulator-overlay og gemmes ikke.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (n) => new Intl.NumberFormat('da-DK').format(Math.round(n || 0));

// Arbejdstempo: slider 0..100 (venstre=langsom, 50=neutral, højre=hurtig)
// → faktor 1.5 (langsom/dyrere) .. 1.0 .. 0.5 (hurtig/billigere).
const SPEED_AMPLITUDE = 0.5;
const sliderToSpeed = (s) => clamp(1.0 + ((50 - s) / 50) * SPEED_AMPLITUDE, 0.5, 1.5);
const speedToSlider = (f) => clamp(50 - ((f - 1.0) / SPEED_AMPLITUDE) * 50, 0, 100);

const GlassSlider = ({ label, hint, value, min, max, step, onChange, accent = '#007aff', displayValue, leftLabel, rightLabel }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="bftuner-control">
            <div className="bftuner-control-head">
                <span className="bftuner-control-label">{label}</span>
                <span className="bftuner-control-value" style={{ color: accent }}>{displayValue}</span>
            </div>
            <input
                type="range"
                className="bftuner-range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(17,17,17,0.08) ${pct}%, rgba(17,17,17,0.08) 100%)` }}
            />
            {(leftLabel || rightLabel) && (
                <div className="bftuner-range-ends">
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
            )}
            {hint && <span className="bftuner-control-hint">{hint}</span>}
        </div>
    );
};

// Oplæsnings-knap (browserens danske stemme via utils/speech).
const SpeakButton = ({ text }) => {
    const [speaking, setSpeaking] = useState(false);
    useEffect(() => () => stopSpeaking(), []);
    const toggle = () => {
        if (speaking) { stopSpeaking(); setSpeaking(false); }
        else { speakText(text, () => setSpeaking(true), () => setSpeaking(false)); }
    };
    if (!text) return null;
    return (
        <button className={`bftuner-btn speak ${speaking ? 'active' : ''}`} onClick={toggle}>
            {speaking ? '⏹ Stop oplæsning' : '🔊 Læs højt'}
        </button>
    );
};

// Deler en pris-/opgavelinje op i fed ledetekst + brødtekst for bedre læsbarhed.
const renderPoints = (lines) => lines.map((line, i) => {
    const clean = line.replace(/^---\s*|\s*---$/g, '');
    if (line.startsWith('---')) return <div key={i} className="bftuner-point-head">{clean}</div>;
    const idx = clean.indexOf(': ');
    if (idx > 0 && idx < 42) {
        return (
            <div key={i} className="bftuner-point">
                <span className="bftuner-point-dot" />
                <div><strong>{clean.slice(0, idx)}:</strong> {clean.slice(idx + 2)}</div>
            </div>
        );
    }
    return (
        <div key={i} className="bftuner-point">
            <span className="bftuner-point-dot" />
            <div>{clean}</div>
        </div>
    );
});

// Genbrugelig fuldskærms-info-modal (opgavebeskrivelse / prisberegning).
const InfoModal = ({ eyebrow, title, onClose, speak, children }) => createPortal(
    <div className="bftuner-matmodal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bftuner-matmodal">
            <div className="bftuner-matmodal-top">
                <div>
                    <span className="bftuner-eyebrow">{eyebrow}</span>
                    <h2 className="bftuner-title">{title}</h2>
                </div>
                <button className="bftuner-close" onClick={onClose} aria-label="Luk">✕</button>
            </div>
            <div className="bftuner-matmodal-body">{children}</div>
            <div className="bftuner-matmodal-footer">
                <SpeakButton text={speak} />
                <button className="bftuner-btn primary" onClick={onClose}>Luk</button>
            </div>
        </div>
    </div>,
    document.body
);

const SimulatorTuner = ({ projectData, dbSettings, dbMaterials, carpenter, onClose, onSaved }) => {
    const baseCalc = projectData?.calc_data || {};
    const baseIncVat = baseCalc.finalEstimateIncVat || 0;
    const category = projectData?.category;
    const isKombi = category === 'Kombi-projekt' || Array.isArray(projectData?.projects);

    // Startværdier fra tømrerens gemte indstillinger.
    const savedSpeed = clamp(Number(dbSettings?.speed_factor) || 1.0, 0.5, 1.5);
    const initial = useRef({
        hourlyRate: Number(dbSettings?.hourly_rate) || 550,
        materialMarkup: Number(dbSettings?.material_markup) || 1.15,
        speedSlider: speedToSlider(savedSpeed),
    });

    const [hourlyRate, setHourlyRate] = useState(initial.current.hourlyRate);
    const [materialMarkup, setMaterialMarkup] = useState(initial.current.materialMarkup);
    const [speedSlider, setSpeedSlider] = useState(initial.current.speedSlider);
    const [overallMarginPct, setOverallMarginPct] = useState(0);

    const [autoFactor, setAutoFactor] = useState(1.0);
    const [result, setResult] = useState({ incVat: baseIncVat, exVat: baseCalc.finalEstimateExVat || 0, breakdownArr: [], besigtigelse: false, calcData: baseCalc });
    const [isCalcing, setIsCalcing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Materialepris-editor
    const [materialEdits, setMaterialEdits] = useState({}); // { navn: pris }
    const [materialRows, setMaterialRows] = useState(null); // rå rækker fra DB (til persist)
    const [showMaterials, setShowMaterials] = useState(false);
    const [savingMaterials, setSavingMaterials] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showTasks, setShowTasks] = useState(false);

    const speedFactor = sliderToSpeed(speedSlider);
    const reqToken = useRef(0);

    const taskList = useMemo(
        () => generateTaskDescription(category, projectData?.details, projectData?.customerDetails?.customerType) || [],
        [category, projectData?.details, projectData?.customerDetails?.customerType]
    );

    // Materialer for den valgte kategori: standard-indeks flettet med tømrerens egne priser.
    const materialCatalog = useMemo(() => {
        if (isKombi || !category) return [];
        const indexCat = MATERIAL_INDEX[category] || {};
        const dbCat = (dbMaterials && dbMaterials[category]) || {};
        const names = Array.from(new Set([...Object.keys(dbCat), ...Object.keys(indexCat)]));
        const chosen = (projectData?.details?.material || '').toString();
        return names
            .map((name) => ({
                name,
                dbPrice: dbCat[name],
                indexPrice: indexCat[name],
                missing: !(name in dbCat), // bruger standard/fallback — ikke sat af tømreren
                chosen: chosen && name === chosen,
            }))
            .sort((a, b) => (b.chosen - a.chosen) || (a.missing - b.missing) || a.name.localeCompare(b.name, 'da'));
    }, [isKombi, category, dbMaterials, projectData?.details?.material]);

    // Effektive materialer til genberegning (tømrer-priser + live-redigeringer).
    const effectiveMaterials = useMemo(() => {
        if (!dbMaterials) return dbMaterials;
        if (!Object.keys(materialEdits).length || !category) return dbMaterials;
        return { ...dbMaterials, [category]: { ...(dbMaterials[category] || {}), ...materialEdits } };
    }, [dbMaterials, materialEdits, category]);

    // Hent den rene AUTO-kalibrering (uden manuelt tempo) som baseline.
    useEffect(() => {
        let alive = true;
        (async () => {
            const calib = await fetchCalibrationFactor(carpenter?.id, category);
            if (alive) setAutoFactor(calib?.autoFactor ?? 1.0);
        })();
        return () => { alive = false; };
    }, [carpenter?.id, category]);

    const recompute = useCallback(async () => {
        if (!dbSettings || !dbMaterials) return;
        const token = ++reqToken.current;
        setIsCalcing(true);
        try {
            const overridden = { ...dbSettings, hourly_rate: hourlyRate, material_markup: materialMarkup };
            const calibration = { factor: clamp(autoFactor * speedFactor, 0.4, 2.2), source: 'manual', sampleSize: 0 };
            const recalcProject = { category, details: projectData.details, projects: projectData.projects };
            const customerDetails = projectData.customerDetails || { customerType: 'privat' };
            const res = await performCalculation(recalcProject, customerDetails, overridden, effectiveMaterials, carpenter, calibration);

            if (token !== reqToken.current) return; // stale

            const besigtigelse = res.priceRange === 'Besigtigelse kræves';
            const marginMult = 1 + (overallMarginPct / 100);
            const baseExVat = res.calcData?.finalEstimateExVat || 0;
            const exVat = Math.ceil((baseExVat * marginMult) / 1000) * 1000;
            const incVat = Math.round(exVat * 1.25);

            setResult({ incVat, exVat, breakdownArr: res.breakdownArr || [], besigtigelse, calcData: res.calcData || {} });
        } catch (err) {
            console.warn('Tuner-genberegning fejlede', err);
        } finally {
            if (token === reqToken.current) setIsCalcing(false);
        }
    }, [dbSettings, dbMaterials, effectiveMaterials, carpenter, category, projectData, hourlyRate, materialMarkup, autoFactor, speedFactor, overallMarginPct]);

    useEffect(() => {
        const t = setTimeout(() => { recompute(); }, 220);
        return () => clearTimeout(t);
    }, [recompute]);

    // Hent tømrerens materialerækker til persistering, første gang editoren åbnes.
    const loadMaterialRows = useCallback(async () => {
        if (materialRows || !carpenter?.id || !category) return;
        const { data } = await supabase
            .from('materials')
            .select('id, name, price, category')
            .eq('carpenter_id', carpenter.id)
            .eq('category', category);
        setMaterialRows(data || []);
    }, [materialRows, carpenter?.id, category]);

    const handleReset = () => {
        setHourlyRate(initial.current.hourlyRate);
        setMaterialMarkup(initial.current.materialMarkup);
        setSpeedSlider(initial.current.speedSlider);
        setOverallMarginPct(0);
        setMaterialEdits({});
    };

    const handleSave = async () => {
        if (!dbSettings?.id) { toast.error('Kunne ikke finde dine indstillinger at gemme til.'); return; }
        setIsSaving(true);
        const payload = {
            hourly_rate: Math.round(hourlyRate),
            material_markup: Number(materialMarkup.toFixed(3)),
            speed_factor: Number(speedFactor.toFixed(3)),
        };
        let { error } = await supabase.from('settings').update(payload).eq('id', dbSettings.id);
        if (error && /speed_factor/.test(error.message || '')) {
            const { speed_factor: _omit, ...rest } = payload;
            ({ error } = await supabase.from('settings').update(rest).eq('id', dbSettings.id));
            if (!error) {
                setIsSaving(false);
                toast('Priser gemt — kør SQL-scriptet setup_speed_factor.sql for at aktivere arbejdstempo.', { icon: '⚠️' });
                onSaved?.(payload);
                return;
            }
        }
        setIsSaving(false);
        if (error) { toast.error('Kunne ikke gemme: ' + error.message); return; }
        toast.success('Dine standardpriser er gemt — de gælder nu alle fremtidige tilbud.');
        initial.current = { hourlyRate: payload.hourly_rate, materialMarkup: payload.material_markup, speedSlider: speedToSlider(payload.speed_factor) };
        onSaved?.(payload);
    };

    const handleSaveMaterials = async () => {
        const edits = Object.entries(materialEdits);
        if (!edits.length) { toast('Ingen materialepriser er ændret endnu.', { icon: 'ℹ️' }); return; }
        if (!carpenter?.id) { toast.error('Mangler tømrer-id.'); return; }
        setSavingMaterials(true);
        try {
            const rows = materialRows || [];
            const inserts = [];
            for (const [name, price] of edits) {
                const existing = rows.find((r) => r.name === name || r.name === `INACTIVE||${name}`);
                if (existing) {
                    await supabase.from('materials').update({ price }).eq('id', existing.id);
                } else {
                    inserts.push({ carpenter_id: carpenter.id, category, name, price });
                }
            }
            if (inserts.length) await supabase.from('materials').insert(inserts);
            toast.success('Materialepriserne er gemt og bruges fremover.');
            setMaterialRows(null); // tving genindlæsning næste gang
        } catch (err) {
            toast.error('Kunne ikke gemme materialepriser: ' + (err?.message || 'ukendt fejl'));
        } finally {
            setSavingMaterials(false);
        }
    };

    const dirty = Math.abs(result.incVat - baseIncVat);
    const cheaper = result.incVat < baseIncVat;
    const speedEffectPct = Math.round((1 - speedFactor) * 100); // +tal = hurtigere/billigere
    const baseHours = result.calcData?.laborHours || 0;
    const adjHours = Math.max(0, Math.round(baseHours * speedFactor));

    return (
      <>
        {createPortal(
        <div className="bftuner-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <style>{TUNER_CSS}</style>
            <div className="bftuner-shell">
                <div className="bftuner-topbar">
                    <div>
                        <span className="bftuner-eyebrow">Simulator · Tilpas beregning</span>
                        <h2 className="bftuner-title">Skru prisen til din virksomhed</h2>
                    </div>
                    <button className="bftuner-close" onClick={onClose} aria-label="Luk">✕</button>
                </div>

                <div className="bftuner-body">
                    {/* VENSTRE: resultat */}
                    <div className="bftuner-result">
                        {result.besigtigelse ? (
                            <div className="bftuner-price-card">
                                <span className="bftuner-price-eyebrow">Komplekst projekt</span>
                                <div className="bftuner-price-main">Kræver besigtigelse</div>
                                <p className="bftuner-price-note">Denne opgave prissættes ikke automatisk — der er derfor intet at tilpasse her.</p>
                            </div>
                        ) : (
                            <>
                                <div className={`bftuner-price-card ${isCalcing ? 'is-calcing' : ''}`}>
                                    <span className="bftuner-price-eyebrow">Din pris · inkl. moms</span>
                                    <div className="bftuner-price-main">{fmt(result.incVat)} kr.</div>
                                    <div className="bftuner-price-sub">{fmt(result.exVat)} kr. ekskl. moms</div>
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
                                            {adjHours !== baseHours && <em> (standard {baseHours} t)</em>}
                                        </span>
                                    </div>
                                    <div className="bftuner-stat">
                                        <span className="bftuner-stat-label">Materialer (m. avance)</span>
                                        <span className="bftuner-stat-value">{fmt(result.calcData?.materialCost)} kr.</span>
                                    </div>
                                    <div className="bftuner-stat">
                                        <span className="bftuner-stat-label">Timepris</span>
                                        <span className="bftuner-stat-value">{fmt(hourlyRate)} kr./t</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {taskList.length > 0 && (
                            <button className="bftuner-materials-open" style={{ marginTop: '14px' }} onClick={() => setShowTasks(true)}>
                                <span className="bftuner-materials-open-text">
                                    <strong>Opgavebeskrivelse</strong>
                                    <em>{taskList.length} trin · se hele opgaven</em>
                                </span>
                                <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                            </button>
                        )}

                        {!result.besigtigelse && result.breakdownArr.length > 0 && (
                            <button className="bftuner-materials-open" style={{ marginTop: '12px' }} onClick={() => setShowBreakdown(true)}>
                                <span className="bftuner-materials-open-text">
                                    <strong>Sådan er prisen regnet</strong>
                                    <em>{result.breakdownArr.length} linjer · timer, materialer, tillæg</em>
                                </span>
                                <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                            </button>
                        )}
                    </div>

                    {/* HØJRE: knapper */}
                    <div className="bftuner-controls">
                        <div className="bftuner-hero">
                            <GlassSlider
                                label="Hvor hurtigt laver du opgaven?"
                                accent="#0f172a"
                                value={speedSlider}
                                min={0}
                                max={100}
                                step={1}
                                onChange={setSpeedSlider}
                                leftLabel="Langsommere"
                                rightLabel="Hurtigere"
                                displayValue={speedEffectPct === 0 ? 'Neutral' : (speedEffectPct > 0 ? `${speedEffectPct}% hurtigere` : `${Math.abs(speedEffectPct)}% langsommere`)}
                                hint="Ændrer de kalkulerede arbejdstimer på alle opgaver — aldrig materialer."
                            />
                            {!result.besigtigelse && baseHours > 0 && (
                                <div className="bftuner-hero-hours">
                                    Timer på denne opgave: <strong>{adjHours} t</strong>
                                    {adjHours !== baseHours && <span> i stedet for {baseHours} t</span>}
                                </div>
                            )}
                        </div>

                        <GlassSlider
                            label="Timepris"
                            accent="#007aff"
                            value={hourlyRate}
                            min={250}
                            max={1200}
                            step={5}
                            onChange={setHourlyRate}
                            displayValue={`${fmt(hourlyRate)} kr./t`}
                            hint="Ekskl. moms. Grundlag for alle arbejdstimer."
                        />

                        <GlassSlider
                            label="Materialeavance"
                            accent="#10b981"
                            value={Math.round((materialMarkup - 1) * 100)}
                            min={0}
                            max={60}
                            step={1}
                            onChange={(pct) => setMaterialMarkup(1 + pct / 100)}
                            displayValue={`+${Math.round((materialMarkup - 1) * 100)}%`}
                            hint="Fortjeneste/svind oven på indkøbte råmaterialer."
                        />

                        <div className="bftuner-overlay-knob">
                            <GlassSlider
                                label="Samlet avance (kun simulator)"
                                accent="#ef4444"
                                value={overallMarginPct}
                                min={-20}
                                max={40}
                                step={1}
                                onChange={setOverallMarginPct}
                                displayValue={`${overallMarginPct > 0 ? '+' : ''}${overallMarginPct}%`}
                                hint="Hurtig 'hvad-nu-hvis' oven på hele prisen. Gemmes ikke i dine faste priser."
                            />
                        </div>

                        {/* Materialepris-editor åbnes som fuldskærms-modal */}
                        {!isKombi && materialCatalog.length > 0 && (
                            <button
                                className="bftuner-materials-open"
                                onClick={() => { setShowMaterials(true); loadMaterialRows(); }}
                            >
                                <span className="bftuner-materials-open-text">
                                    <strong>Materialepriser for denne opgave</strong>
                                    <em>{materialCatalog.length} materialer · ret indkøbspriser</em>
                                </span>
                                <span className="bftuner-materials-open-arrow" aria-hidden>→</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="bftuner-footer">
                    <button className="bftuner-btn ghost" onClick={handleReset}>Nulstil</button>
                    <div className="bftuner-footer-right">
                        <button className="bftuner-btn secondary" onClick={onClose}>Luk</button>
                        <button className="bftuner-btn primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Gemmer…' : 'Gem som mine standardpriser'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
        )}

        {showMaterials && !isKombi && createPortal(
            <div className="bftuner-matmodal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowMaterials(false); }}>
                <div className="bftuner-matmodal">
                    <div className="bftuner-matmodal-top">
                        <div>
                            <span className="bftuner-eyebrow">Materialepriser</span>
                            <h2 className="bftuner-title">Ret indkøbspriser for denne opgave</h2>
                        </div>
                        <button className="bftuner-close" onClick={() => setShowMaterials(false)} aria-label="Luk">✕</button>
                    </div>
                    <p className="bftuner-matmodal-note">Indkøbspriser ekskl. moms og avance. Rettelser slår igennem i beregningen med det samme, og "Gem" skriver dem til dine faste priser. <span className="bftuner-tag missing-inline">Standard</span> = pris du ikke selv har sat endnu.</p>
                    <div className="bftuner-matmodal-body">
                        <div className="bftuner-matmodal-grid">
                            {materialCatalog.map((m) => {
                                const current = materialEdits[m.name] ?? m.dbPrice ?? m.indexPrice ?? 0;
                                return (
                                    <div key={m.name} className={`bftuner-mat-row ${m.chosen ? 'chosen' : ''}`}>
                                        <div className="bftuner-mat-name">
                                            {m.chosen && <span className="bftuner-mat-tag">valgt</span>}
                                            {m.missing && !(m.name in materialEdits) && <span className="bftuner-mat-tag missing">standard</span>}
                                            {m.name}
                                        </div>
                                        <div className="bftuner-mat-input">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                step={5}
                                                value={current}
                                                onChange={(e) => setMaterialEdits((prev) => ({ ...prev, [m.name]: parseFloat(e.target.value) || 0 }))}
                                            />
                                            <span>kr.</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bftuner-matmodal-footer">
                        <button className="bftuner-btn secondary" onClick={() => setShowMaterials(false)}>Luk</button>
                        <button className="bftuner-btn primary" onClick={handleSaveMaterials} disabled={savingMaterials}>
                            {savingMaterials ? 'Gemmer…' : 'Gem materialepriser'}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {showTasks && taskList.length > 0 && (
            <InfoModal
                eyebrow="Opgavebeskrivelse"
                title="Sådan udføres opgaven"
                speak={`Opgavebeskrivelse. ${taskList.join('. ')}.`}
                onClose={() => setShowTasks(false)}
            >
                <ol className="bftuner-tasklist wide">
                    {taskList.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
            </InfoModal>
        )}

        {showBreakdown && result.breakdownArr.length > 0 && (
            <InfoModal
                eyebrow="Prisberegning"
                title="Sådan er prisen regnet"
                speak={`Sådan er prisen regnet. ${result.breakdownArr.map((l) => l.replace(/^---\s*|\s*---$/g, '')).join('. ')}.`}
                onClose={() => setShowBreakdown(false)}
            >
                <div className="bftuner-points">
                    {renderPoints(result.breakdownArr)}
                </div>
            </InfoModal>
        )}
      </>
    );
};

const TUNER_CSS = `
.bftuner-overlay {
    position: fixed; inset: 0; z-index: 2147483000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    animation: bftunerFade 0.2s ease;
}
@keyframes bftunerFade { from { opacity: 0; } to { opacity: 1; } }
.bftuner-shell {
    width: min(1080px, 100%); max-height: 92vh; display: flex; flex-direction: column;
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4);
    border: 1px solid rgba(255,255,255,0.6);
    border-radius: 28px;
    box-shadow: 0 40px 100px rgba(15,23,42,0.35);
    overflow: hidden;
    animation: bftunerPop 0.28s cubic-bezier(0.16,1,0.3,1);
}
@keyframes bftunerPop { from { transform: translateY(16px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
.bftuner-topbar {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 22px 28px; border-bottom: 1px solid rgba(15,23,42,0.07);
    background: linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1));
}
.bftuner-eyebrow { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
.bftuner-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
.bftuner-close {
    width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(15,23,42,0.1);
    background: rgba(255,255,255,0.7); color: #475569; font-size: 1rem; cursor: pointer;
    transition: all 0.18s ease; flex-shrink: 0;
}
.bftuner-close:hover { background: #0f172a; color: #fff; transform: rotate(90deg); }
.bftuner-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
.bftuner-result { padding: 24px 28px; overflow-y: auto; border-right: 1px solid rgba(15,23,42,0.07); }
.bftuner-controls { padding: 24px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
.bftuner-price-card {
    background: linear-gradient(135deg, rgba(15,23,42,0.03), rgba(15,23,42,0.01));
    border: 1px solid rgba(15,23,42,0.08); border-radius: 20px; padding: 28px 24px; text-align: center;
    transition: opacity 0.15s ease;
}
.bftuner-price-card.is-calcing { opacity: 0.55; }
.bftuner-price-eyebrow { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
.bftuner-price-main { font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; color: #0f172a; line-height: 1.05; }
.bftuner-price-sub { font-size: 1.1rem; font-weight: 600; color: #64748b; margin-top: 4px; }
.bftuner-price-note { font-size: 0.95rem; color: #64748b; margin: 12px 0 0; line-height: 1.5; }
.bftuner-delta { display: inline-block; margin-top: 14px; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; }
.bftuner-delta.down { background: rgba(16,185,129,0.12); color: #047857; }
.bftuner-delta.up { background: rgba(239,68,68,0.12); color: #b91c1c; }
.bftuner-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 16px; }
.bftuner-stat { background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.06); border-radius: 14px; padding: 12px; }
.bftuner-stat-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #94a3b8; margin-bottom: 4px; }
.bftuner-stat-value { font-size: 0.98rem; font-weight: 800; color: #0f172a; }
.bftuner-stat-value em { font-style: normal; font-weight: 600; font-size: 0.78rem; color: #94a3b8; }
.bftuner-fold { margin-top: 16px; border: 1px solid rgba(15,23,42,0.08); border-radius: 14px; overflow: hidden; }
.bftuner-fold.materials { margin-top: 4px; }
.bftuner-fold-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 16px; background: rgba(15,23,42,0.03); border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; color: #0f172a; text-align: left; }
.bftuner-fold-head:hover { background: rgba(15,23,42,0.06); }
.bftuner-chevron { transition: transform 0.2s ease; color: #64748b; }
.bftuner-chevron.open { transform: rotate(180deg); }
.bftuner-tasklist { margin: 0; padding: 12px 16px 14px 32px; display: flex; flex-direction: column; gap: 6px; }
.bftuner-tasklist li { font-size: 0.86rem; color: #475569; line-height: 1.45; }
.bftuner-breakdown { list-style: none; margin: 0; padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 6px; }
.bftuner-breakdown li { font-size: 0.84rem; color: #475569; line-height: 1.45; padding-left: 14px; position: relative; }
.bftuner-breakdown li::before { content: '·'; position: absolute; left: 2px; color: #cbd5e1; }
.bftuner-breakdown li.is-heading { font-weight: 800; color: #0f172a; padding-left: 0; margin-top: 8px; }
.bftuner-breakdown li.is-heading::before { content: ''; }
.bftuner-tasklist.wide { padding: 4px 0 4px 24px; gap: 14px; }
.bftuner-tasklist.wide li { font-size: 0.98rem; line-height: 1.55; padding-left: 6px; }
.bftuner-tasklist.wide li::marker { color: #94a3b8; font-weight: 800; }
.bftuner-points { display: flex; flex-direction: column; }
.bftuner-point { display: flex; gap: 12px; padding: 13px 4px; border-bottom: 1px solid rgba(15,23,42,0.06); font-size: 0.95rem; color: #475569; line-height: 1.55; }
.bftuner-point:last-child { border-bottom: none; }
.bftuner-point strong { color: #0f172a; font-weight: 800; }
.bftuner-point-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; margin-top: 8px; flex-shrink: 0; }
.bftuner-point-head { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 18px 0 6px; padding-bottom: 6px; border-bottom: 2px solid rgba(15,23,42,0.08); }
.bftuner-point-head:first-child { margin-top: 0; }
.bftuner-btn.speak { background: rgba(0,122,255,0.1); color: #0369a1; margin-right: auto; }
.bftuner-btn.speak:hover { background: rgba(0,122,255,0.18); }
.bftuner-btn.speak.active { background: #ef4444; color: #fff; }
.bftuner-breakdown.wide { padding: 0; gap: 9px; }
.bftuner-breakdown.wide li { font-size: 0.92rem; }
.bftuner-breakdown.wide li.is-heading { font-size: 1rem; margin-top: 12px; }
.bftuner-control { display: flex; flex-direction: column; gap: 8px; }
.bftuner-control-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.bftuner-control-label { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
.bftuner-control-value { font-size: 0.95rem; font-weight: 800; white-space: nowrap; }
.bftuner-control-hint { font-size: 0.78rem; color: #94a3b8; line-height: 1.4; }
.bftuner-range-ends { display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-top: -2px; }
.bftuner-range { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; cursor: pointer; }
.bftuner-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #0f172a; box-shadow: 0 4px 12px rgba(15,23,42,0.25); cursor: grab; transition: transform 0.12s ease; }
.bftuner-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
.bftuner-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.05); }
.bftuner-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #0f172a; box-shadow: 0 4px 12px rgba(15,23,42,0.25); cursor: grab; }
.bftuner-hero { padding: 18px; border-radius: 18px; background: linear-gradient(135deg, rgba(15,23,42,0.05), rgba(0,122,255,0.05)); border: 1px solid rgba(15,23,42,0.08); }
.bftuner-hero-hours { margin-top: 12px; font-size: 0.85rem; color: #475569; }
.bftuner-hero-hours strong { color: #0f172a; }
.bftuner-overlay-knob { padding: 16px; border-radius: 16px; background: rgba(239,68,68,0.05); border: 1px dashed rgba(239,68,68,0.3); }
.bftuner-materials-open { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; border-radius: 16px; border: 1px solid rgba(15,23,42,0.12); background: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.18s ease; text-align: left; }
.bftuner-materials-open:hover { border-color: #0f172a; background: #fff; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
.bftuner-materials-open-text { display: flex; flex-direction: column; gap: 2px; }
.bftuner-materials-open-text strong { font-size: 0.95rem; color: #0f172a; }
.bftuner-materials-open-text em { font-style: normal; font-size: 0.78rem; color: #94a3b8; }
.bftuner-materials-open-arrow { font-size: 1.2rem; color: #0f172a; flex-shrink: 0; }
/* Fuldskærms materialepris-modal */
.bftuner-matmodal-overlay { position: fixed; inset: 0; z-index: 2147483100; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: bftunerFade 0.2s ease; }
.bftuner-matmodal { width: min(760px, 100%); max-height: 92vh; display: flex; flex-direction: column; background: rgba(255,255,255,0.9); backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4); border: 1px solid rgba(255,255,255,0.6); border-radius: 24px; box-shadow: 0 40px 100px rgba(15,23,42,0.4); overflow: hidden; animation: bftunerPop 0.28s cubic-bezier(0.16,1,0.3,1); }
.bftuner-matmodal-top { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(15,23,42,0.07); }
.bftuner-matmodal-note { margin: 0; padding: 14px 24px; font-size: 0.82rem; color: #64748b; line-height: 1.5; border-bottom: 1px solid rgba(15,23,42,0.05); }
.bftuner-tag.missing-inline { display: inline-block; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 1px 6px; border-radius: 6px; background: #f59e0b; color: #fff; vertical-align: middle; }
.bftuner-matmodal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 24px; }
.bftuner-matmodal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px; }
.bftuner-matmodal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid rgba(15,23,42,0.07); background: linear-gradient(0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2)); }
.bftuner-mat-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(15,23,42,0.02); border: 1px solid rgba(15,23,42,0.05); }
.bftuner-mat-row.chosen { background: rgba(0,122,255,0.07); border-color: rgba(0,122,255,0.25); }
.bftuner-mat-name { font-size: 0.84rem; color: #0f172a; font-weight: 600; display: flex; align-items: center; gap: 6px; flex: 1; }
.bftuner-mat-tag { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 2px 6px; border-radius: 6px; background: #007aff; color: #fff; }
.bftuner-mat-tag.missing { background: #f59e0b; }
.bftuner-mat-input { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.bftuner-mat-input input { width: 84px; padding: 6px 8px; border: 1px solid rgba(15,23,42,0.15); border-radius: 8px; font-size: 0.86rem; text-align: right; background: #fff; }
.bftuner-mat-input input:focus { outline: none; border-color: #007aff; }
.bftuner-mat-input span { font-size: 0.78rem; color: #94a3b8; }
.bftuner-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 28px; border-top: 1px solid rgba(15,23,42,0.07); background: linear-gradient(0deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2)); }
.bftuner-footer-right { display: flex; gap: 12px; }
.bftuner-btn { padding: 12px 22px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: all 0.18s ease; }
.bftuner-btn.sm { padding: 9px 16px; font-size: 0.85rem; margin-top: 12px; }
.bftuner-btn.ghost { background: transparent; color: #94a3b8; }
.bftuner-btn.ghost:hover { color: #475569; }
.bftuner-btn.secondary { background: rgba(15,23,42,0.06); color: #475569; }
.bftuner-btn.secondary:hover { background: rgba(15,23,42,0.12); }
.bftuner-btn.primary { background: #0f172a; color: #fff; box-shadow: 0 8px 20px rgba(15,23,42,0.25); }
.bftuner-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15,23,42,0.3); }
.bftuner-btn.primary:disabled { opacity: 0.6; cursor: default; transform: none; }
@media (max-width: 820px) {
    .bftuner-overlay { padding: 0; align-items: stretch; }
    .bftuner-shell { width: 100%; max-height: 100%; height: 100%; border-radius: 0; border: none; }
    .bftuner-body { grid-template-columns: 1fr; display: block; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .bftuner-result { border-right: none; border-bottom: 8px solid rgba(15,23,42,0.04); overflow: visible; padding: 18px 18px 24px; }
    .bftuner-controls { overflow: visible; padding: 18px 18px 28px; gap: 16px; }
    .bftuner-topbar { padding: 16px 18px; position: sticky; top: 0; z-index: 2; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); }
    .bftuner-title { font-size: 1.2rem; }
    .bftuner-stats { grid-template-columns: 1fr 1fr; }
    .bftuner-footer { padding: 14px 18px; flex-wrap: wrap; position: sticky; bottom: 0; }
    .bftuner-footer-right { flex: 1; justify-content: flex-end; }
    .bftuner-btn { padding: 13px 18px; }
    .bftuner-btn.primary { flex: 1; }
    .bftuner-range { height: 12px; }
    .bftuner-range::-webkit-slider-thumb { width: 30px; height: 30px; }
    .bftuner-range::-moz-range-thumb { width: 30px; height: 30px; }
    /* Materialepris-modal fylder hele skærmen på telefon */
    .bftuner-matmodal-overlay { padding: 0; align-items: stretch; }
    .bftuner-matmodal { width: 100%; height: 100%; max-height: 100%; border-radius: 0; border: none; }
    .bftuner-matmodal-top { padding: 16px 18px; }
    .bftuner-matmodal-note { padding: 12px 18px; }
    .bftuner-matmodal-body { padding: 14px 18px; }
    .bftuner-matmodal-grid { grid-template-columns: 1fr; }
    .bftuner-matmodal-footer { padding: 14px 18px; }
    .bftuner-matmodal-footer .bftuner-btn.primary { flex: 1; }
    .bftuner-mat-input input { width: 92px; padding: 10px 8px; font-size: 0.95rem; }
}
`;

export default SimulatorTuner;
