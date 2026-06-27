import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Lock, Unlock, X, Loader2, CalendarClock, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    canManagePayroll, savePayrollSettings, lastCompletedPeriodEnd,
    previousPeriodEnd, currentPeriod, formatDa, getConfig, getEffectiveLockedUntil, nextLonnummer
} from '../../utils/payroll';

/*
 * Løn-styring til "Løn & Timer": vælg lønperiode (måned / 14 dage), kør og lås
 * lønperioden, samt genåbn. Kun Mester (admin) og Bogholder (accountant).
 * Selve låsen håndhæves i timesheet-komponenterne via isDateLocked().
 */
export default function PayrollControls({ companyId, role, actorId, actorName, settings, onUpdated, actorLonnummer = '', existingLonnumre = [], onSaveActorLonnummer, tourOpen = false }) {
    const [showSettings, setShowSettings] = useState(false);
    const [showLock, setShowLock] = useState(false);
    const [showReopen, setShowReopen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);
    const [lockDate, setLockDate] = useState('');
    const [reopenDate, setReopenDate] = useState('');

    // Rundvisningen kan åbne/lukke indstillings-modalen, så den kan spotlightes.
    useEffect(() => {
        if (!canManagePayroll(role)) return;
        if (tourOpen) openSettings();
        else setShowSettings(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourOpen]);

    if (!canManagePayroll(role)) return null;

    const cycle = settings?.cycle || 'monthly';
    const anchor = settings?.anchor;
    const cfg = getConfig(settings);
    const effectiveLock = getEffectiveLockedUntil(settings);
    const proposedLock = lastCompletedPeriodEnd(cycle, anchor);

    const appendLog = (action, until) => ([
        ...(settings?.log || []),
        { action, until, by: actorId, by_name: actorName, at: new Date().toISOString() }
    ]);

    const setCfg = (patch) => setForm(f => ({ ...f, config: { ...f.config, ...patch } }));
    const setLonart = (patch) => setForm(f => ({ ...f, config: { ...f.config, lonart: { ...f.config.lonart, ...patch } } }));

    const openSettings = () => {
        setForm({
            cycle,
            anchor: anchor || new Date().toISOString().substring(0, 10),
            config: { ...cfg },
            lonnummer: actorLonnummer || nextLonnummer(existingLonnumre)
        });
        setShowSettings(true);
    };

    const openLock = () => { setLockDate(proposedLock); setShowLock(true); };

    const saveSettings = async () => {
        setSaving(true);
        try {
            // Gem eget lønnummer først (kaster ved ugyldigt/optaget nummer)
            if (onSaveActorLonnummer) await onSaveActorLonnummer(form.lonnummer);
            const data = await savePayrollSettings(companyId, {
                cycle: form.cycle,
                anchor: form.cycle === 'biweekly' ? form.anchor : null,
                config: form.config
            });
            onUpdated(data);
            toast.success('Løn-indstillinger gemt!');
            setShowSettings(false);
        } catch (err) {
            console.error('Gem løn-indstillinger fejlede:', err);
            toast.error(`Kunne ikke gemme: ${err?.message || 'ukendt fejl'}`);
        } finally { setSaving(false); }
    };

    const doLock = async () => {
        if (!lockDate) { toast.error('Vælg en dato at låse til og med.'); return; }
        setSaving(true);
        try {
            const data = await savePayrollSettings(companyId, {
                cycle, anchor: cycle === 'biweekly' ? anchor : null,
                locked_until: lockDate, log: appendLog('lock', lockDate)
            });
            onUpdated(data);
            toast.success(`Lønperioden er låst til og med ${formatDa(lockDate)}.`);
            setShowLock(false);
        } catch (err) {
            console.error('Lås lønperiode fejlede:', err);
            toast.error(`Kunne ikke låse: ${err?.message || 'ukendt fejl'}`);
        } finally { setSaving(false); }
    };

    // Forslag til hvor langt der åbnes op: én periode tilbage fra den nuværende lås.
    const reopenDefault = previousPeriodEnd(cycle, anchor, effectiveLock) || '';

    const openReopen = () => { setReopenDate(reopenDefault); setShowReopen(true); };

    const doReopen = async () => {
        setSaving(true);
        try {
            const openTo = reopenDate || null; // tom = lås helt op
            let fields;
            if (cfg.auto_lock) {
                // Gem 'open_to' + tidspunktets auto-dato, så den genlåser når næste periode er afsluttet.
                const atAuto = lastCompletedPeriodEnd(cycle, anchor, new Date(Date.now() - (Number(cfg.grace_days) || 0) * 86400000));
                fields = { config: { ...cfg, reopen: { open_to: openTo, at_auto: atAuto } }, log: appendLog('reopen', openTo) };
            } else {
                fields = { locked_until: openTo, log: appendLog('reopen', openTo) };
            }
            const data = await savePayrollSettings(companyId, fields);
            onUpdated(data);
            toast.success(openTo ? `Genåbnet — nu låst til og med ${formatDa(openTo)}.` : 'Hele perioden er låst op.');
            setShowReopen(false);
        } catch (err) {
            console.error('Genåbn lønperiode fejlede:', err);
            toast.error(`Kunne ikke genåbne: ${err?.message || 'ukendt fejl'}`);
        } finally { setSaving(false); }
    };

    return (
        <>
            {/* Status-chip */}
            {effectiveLock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Lock size={15} style={{ color: '#0f172a' }} />
                    {cfg.auto_lock ? 'Auto-låst til' : 'Låst til'} {formatDa(effectiveLock)}
                    <button onClick={openReopen} title="Genåbn seneste lønperiode"
                        style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#ddd6fe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                        <Unlock size={13} /> Genåbn
                    </button>
                </div>
            )}

            {/* Tandhjul: Løn-indstillinger */}
            <button data-tour="payroll-settings-btn" onClick={openSettings} title="Løn-indstillinger"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px) rotate(45deg)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}>
                <Settings size={20} />
            </button>

            {/* Manuel lås — kun når auto-lås er slået fra */}
            {!cfg.auto_lock && (
                <button onClick={openLock}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(124,58,237,0.35)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.25)'; }}>
                    <Lock size={18} /> Afslut & lås lønperiode
                </button>
            )}

            {/* ---- SETTINGS MODAL ---- */}
            <Overlay open={showSettings && !!form} onClose={() => setShowSettings(false)}>
                {form && <>
                        <ModalHeader icon={<CalendarClock size={22} />} title="Løn-indstillinger" subtitle="Lønperiode, fravær og lønart-koder" onClose={() => setShowSettings(false)} />
                        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div data-tour="payroll-cycle">
                            <Section title="Lønperiode">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <CycleCard active={form.cycle === 'monthly'} onClick={() => setForm(f => ({ ...f, cycle: 'monthly' }))} title="Månedligt" desc="Løn én gang om måneden" />
                                    <CycleCard active={form.cycle === 'biweekly'} onClick={() => setForm(f => ({ ...f, cycle: 'biweekly' }))} title="Hver 14. dag" desc="Løn hver anden uge" />
                                </div>
                                <AnimatePresence>
                                    {form.cycle === 'biweekly' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Startdato for en periode (anker)</span>
                                                <input type="date" value={form.anchor} onChange={(e) => setForm(f => ({ ...f, anchor: e.target.value }))} style={fieldStyle} />
                                            </label>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px', fontSize: '0.82rem', color: '#475569', marginTop: '12px' }}>
                                    Nuværende åbne periode: <strong>{formatDa(currentPeriod(form.cycle, form.anchor).start)} – {formatDa(currentPeriod(form.cycle, form.anchor).end)}</strong>
                                </div>
                            </Section>
                            </div>

                            <Section title="Mit eget lønnummer" hint="Dit nummer i lønsystemet — bruges når du selv får løn.">
                                <input value={form.lonnummer} inputMode="numeric" onChange={(e) => setForm(f => ({ ...f, lonnummer: e.target.value }))} placeholder="f.eks. 1001" style={fieldStyle} />
                            </Section>

                            <div data-tour="payroll-lock">
                            <Section title="Automatisk lås">
                                <Toggle checked={form.config.auto_lock} onChange={(v) => setCfg({ auto_lock: v })}
                                    label="Lås perioder automatisk" desc="Hver afsluttet periode låses af sig selv — ingen manuel handling." />
                                <AnimatePresence>
                                    {form.config.auto_lock && (
                                        <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'block' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginTop: '10px', marginBottom: '6px' }}>Frist før lås (dage efter periodeslut)</span>
                                            <input type="number" min="0" max="14" value={form.config.grace_days} onChange={(e) => setCfg({ grace_days: parseInt(e.target.value) || 0 })} style={fieldStyle} />
                                        </motion.label>
                                    )}
                                </AnimatePresence>
                            </Section>
                            </div>

                            <div data-tour="payroll-absence">
                            <Section title="Fravær & arbejdsdag">
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Standard arbejdsdag (timer)</span>
                                    <input type="number" step="0.1" min="0" value={form.config.daily_hours} onChange={(e) => setCfg({ daily_hours: parseFloat(e.target.value) || 0 })} style={fieldStyle} />
                                </label>

                                <div style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Automatisk frokostpause</span>
                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Bruges som standard i timeregistreringen — trækkes automatisk fra, når arbejdsdagen er over grænsen.</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Pause (minutter)</span>
                                            <input type="number" step="5" min="0" value={form.config.auto_break_minutes ?? 30} onChange={(e) => setCfg({ auto_break_minutes: parseInt(e.target.value) || 0 })} style={fieldStyle} />
                                        </label>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Når over (timer)</span>
                                            <input type="number" step="0.5" min="0" value={form.config.auto_break_threshold_hours ?? 5} onChange={(e) => setCfg({ auto_break_threshold_hours: parseFloat(e.target.value) || 0 })} style={fieldStyle} />
                                        </label>
                                    </div>
                                </div>

                                <div style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Eksportér ferie/fravær som</span>
                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Gælder kun ferie/fravær — arbejdstimer eksporteres altid som timer. De fleste lønsystemer bruger dage til ferie.</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <CycleCard active={form.config.absence_unit === 'days'} onClick={() => setCfg({ absence_unit: 'days' })} title="Dage" desc="Antal feriedage (anbefalet)" />
                                        <CycleCard active={form.config.absence_unit === 'hours'} onClick={() => setCfg({ absence_unit: 'hours' })} title="Timer" desc={`Dage × ${form.config.daily_hours || 7.4}t`} />
                                    </div>
                                </div>
                            </Section>
                            </div>

                            <div data-tour="payroll-codes">
                            <Section title="Lønart-koder" hint="Indtast jeres egne numre fra lønsystemet — hver type skal have sit eget nummer.">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <LonartField label="Normaltimer" placeholder="f.eks. 1000" value={form.config.lonart.normal} onChange={(v) => setLonart({ normal: v })} />
                                    <LonartField label="Ferie" placeholder="f.eks. 3000" value={form.config.lonart.vacation} onChange={(v) => setLonart({ vacation: v })} />
                                    <LonartField label="Sygdom" placeholder="f.eks. 3100" value={form.config.lonart.sick} onChange={(v) => setLonart({ sick: v })} />
                                    <LonartField label="Øvrigt fravær" placeholder="f.eks. 3200" value={form.config.lonart.other_absence} onChange={(v) => setLonart({ other_absence: v })} />
                                    <LonartField label="Kørsel (km)" placeholder="f.eks. 8000" value={form.config.lonart.mileage} onChange={(v) => setLonart({ mileage: v })} />
                                </div>
                                {(() => {
                                    const codes = Object.values(form.config.lonart).map(c => String(c).trim()).filter(Boolean);
                                    const hasDup = new Set(codes).size !== codes.length;
                                    return hasDup ? (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '10px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', fontSize: '0.8rem', color: '#b45309' }}>
                                            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                                            To lønarter har samme nummer — er det med vilje? Normalt har hver type sit eget nummer.
                                        </div>
                                    ) : null;
                                })()}
                            </Section>
                            </div>

                            <ModalActions onCancel={() => setShowSettings(false)} onConfirm={saveSettings} saving={saving} confirmLabel="Gem indstillinger" confirmIcon={<CalendarClock size={18} />} />
                        </div>
                </>}
            </Overlay>

            {/* ---- LOCK MODAL ---- */}
            <Overlay open={showLock} onClose={() => setShowLock(false)}>
                        <ModalHeader icon={<Lock size={22} />} title="Afslut & lås lønperiode" subtitle="Fastlås timerne efter lønkørsel" onClose={() => setShowLock(false)} />
                        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '14px', padding: '16px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lås alle timer til og med</span>
                                <input type="date" value={lockDate} onChange={(e) => setLockDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #ddd6fe', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', background: '#fff', outline: 'none' }} />
                                <span style={{ fontSize: '0.78rem', color: '#7c3aed' }}>Foreslået: {formatDa(proposedLock)} (sidste afsluttede periode) — du kan vælge en anden dato.</span>
                            </label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                                <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                                Timer på/inden den valgte dato bliver skrivebeskyttede for alle. Alt kan stadig <strong>ses</strong> — intet slettes. Ekstra arbejde registreres fremad i den nye periode.
                            </div>
                            <ModalActions onCancel={() => setShowLock(false)} onConfirm={doLock} saving={saving} confirmLabel="Lås perioden" confirmIcon={<Lock size={18} />} />
                        </div>
            </Overlay>

            {/* ---- REOPEN MODAL ---- */}
            <Overlay open={showReopen} onClose={() => setShowReopen(false)}>
                        <ModalHeader icon={<Unlock size={22} />} title="Genåbn lønperiode" subtitle="Lås op til en valgt dato" onClose={() => setShowReopen(false)} accent="#f59e0b" />
                        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '14px', padding: '16px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lås op til og med</span>
                                <input type="date" value={reopenDate} onChange={(e) => setReopenDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #fde68a', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', background: '#fff', outline: 'none' }} />
                                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>Alt EFTER denne dato kan redigeres igen. Vælg en tidligere dato for at åbne længere tilbage — eller ryd feltet for at låse helt op.</span>
                            </label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                                <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                                {cfg.auto_lock
                                    ? <span>Perioden låses automatisk igen, så snart den næste lønperiode er afsluttet. Handlingen logges.</span>
                                    : <span>Låsen flyttes til den valgte dato. Handlingen logges.</span>}
                            </div>
                            <ModalActions onCancel={() => setShowReopen(false)} onConfirm={doReopen} saving={saving} confirmLabel="Genåbn" confirmIcon={<Unlock size={18} />} confirmColor="#f59e0b" />
                        </div>
            </Overlay>
        </>
    );
}

// ---- Genbrugelige modal-byggesten (matcher platformens stil) ----
function Overlay({ open, children, onClose }) {
    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div key="payroll-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function ModalHeader({ icon, title, subtitle, onClose, accent = '#7c3aed' }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>{title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>{subtitle}</p>
                </div>
            </div>
            <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                <X size={18} />
            </button>
        </div>
    );
}

function ModalActions({ onCancel, onConfirm, saving, confirmLabel, confirmIcon, confirmColor }) {
    const bg = confirmColor ? confirmColor : 'linear-gradient(135deg, #7c3aed, #9333ea)';
    return (
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button type="button" onClick={onCancel} style={{ flex: '0 0 auto', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>Annullér</button>
            <button type="button" onClick={onConfirm} disabled={saving} style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: 'none', background: bg, color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 16px rgba(124,58,237,0.22)', transition: 'transform 0.1s' }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : confirmIcon}
                {confirmLabel}
            </button>
        </div>
    );
}

const fieldStyle = { width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box' };

function Section({ title, hint, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
            {hint && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>{hint}</div>}
            <div style={{ marginTop: '8px' }}>{children}</div>
        </div>
    );
}

function Toggle({ checked, onChange, label, desc }) {
    return (
        <div onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '44px', height: '24px', borderRadius: '999px', padding: '2px', flexShrink: 0, background: checked ? '#7c3aed' : '#cbd5e1', transition: 'background 0.2s', marginTop: '2px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: checked ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{label}</div>
                {desc && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{desc}</div>}
            </div>
        </div>
    );
}

function LonartField({ label, value, onChange, placeholder = 'f.eks. 1000' }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{label}</span>
            <input value={value} inputMode="numeric" onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                style={{ ...fieldStyle, padding: '10px 12px', fontSize: '0.9rem' }} />
        </label>
    );
}

function CycleCard({ active, onClick, title, desc }) {
    return (
        <div onClick={onClick}
            style={{ cursor: 'pointer', borderRadius: '14px', padding: '16px', border: `2px solid ${active ? '#7c3aed' : '#e2e8f0'}`, background: active ? '#f5f3ff' : '#fff', transition: 'all 0.18s', boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none' }}
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}>
            <div style={{ fontWeight: 700, color: active ? '#6d28d9' : '#0f172a', fontSize: '0.98rem' }}>{title}</div>
            <div style={{ fontSize: '0.8rem', color: active ? '#7c3aed' : '#94a3b8', marginTop: '2px' }}>{desc}</div>
        </div>
    );
}
