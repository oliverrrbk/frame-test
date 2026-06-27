// ============================================================================
// PayrollGuide.jsx — selvstændig illustreret guide til "Løn & Timer".
// Forklarer especially Løn-indstillingerne (lønperiode, automatisk lås, arbejdsdag/
// frokost, ferie-eksport, lønart-koder) simpelt men dybdegående — så også en
// bogholder er i tvivl. Mockups (ikke rigtig UI). Per-guide, kun desktop.
// ============================================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, Clock, Lock, Coffee, FileText, Download, Settings, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { markCoachSeen } from './coachmarks';

const PURPLE = '#7c3aed';

const Screen = ({ children, label }) => (
    <div style={{ width: 280, margin: '0 auto' }}>
        <div style={{ borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 22px 46px -18px rgba(15,23,42,0.4)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 5, padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #eef2f6' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
            </div>
            <div style={{ padding: 16, minHeight: 168 }}>{children}</div>
        </div>
        {label && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '8px 0 0' }}>{label}</div>}
    </div>
);

const Pill = ({ children, on }) => (
    <span style={{ flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 9, fontSize: 11, fontWeight: 800, background: on ? '#fff' : 'transparent', color: on ? PURPLE : '#64748b', boxShadow: on ? '0 2px 6px rgba(15,23,42,0.1)' : 'none' }}>{children}</span>
);

const Toggle = ({ on }) => (
    <span style={{ position: 'relative', width: 40, height: 23, borderRadius: 999, background: on ? `linear-gradient(145deg,${PURPLE},#6d28d9)` : '#cbd5e1', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </span>
);

export default function PayrollGuide({ onDone }) {
    const [step, setStep] = useState(0);
    const finish = () => { markCoachSeen('payroll_guide'); onDone && onDone(); };

    const fieldRow = (label, val) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>{val}</span>
        </div>
    );

    const screens = {
        intro: (
            <Screen label="Løn & Timer">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: 136 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={32} color={PURPLE} />
                    </div>
                    <div style={{ width: 150, height: 9, borderRadius: 5, background: '#e2e8f0' }} />
                    <div style={{ width: 110, height: 9, borderRadius: 5, background: '#eef2f6' }} />
                </div>
            </Screen>
        ),
        period: (
            <Screen label="Vælg lønperiode">
                <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 14 }}>
                    <Pill on>Måned</Pill><Pill>Hver 14. dag</Pill>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px' }}>1. jun</span>
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px' }}>30. jun</span>
                </div>
            </Screen>
        ),
        table: (
            <Screen label="Timer & fravær pr. medarbejder">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                    <span>Medarbejder</span><span>Timer</span><span>Fravær</span>
                </div>
                {[['Niklas', '152 t', '—'], ['Kasper', '148 t', '2 dg'], ['Hanne', '160 t', '—']].map(([n, t, f]) => (
                    <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 11.5 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{n}</span>
                        <span style={{ color: '#334155', fontWeight: 700 }}>{t}</span>
                        <span style={{ color: f === '—' ? '#cbd5e1' : '#d946ef', fontWeight: 700 }}>{f}</span>
                    </div>
                ))}
            </Screen>
        ),
        lock: (
            <Screen label="Automatisk lås">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: '#0f172a' }}><Lock size={15} color={PURPLE} /> Lås perioder automatisk</span>
                    <Toggle on />
                </div>
                {fieldRow('Frist før lås (dage)', '2')}
                <p style={{ margin: '10px 2px 0', fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 }}>Når perioden er kørt, låses den — så tallene ikke ændrer sig bagefter.</p>
            </Screen>
        ),
        workday: (
            <Screen label="Arbejdsdag & frokost">
                {fieldRow('Standard arbejdsdag', '7,4 t')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 0 6px', fontSize: 11.5, fontWeight: 700, color: '#475569' }}><Coffee size={14} color={PURPLE} /> Automatisk frokostpause</div>
                {fieldRow('Pause', '30 min')}
                {fieldRow('Når over', '5 t')}
            </Screen>
        ),
        codes: (
            <Screen label="Ferie-eksport & lønart-koder">
                <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 12 }}>
                    <Pill on>Dage</Pill><Pill>Timer</Pill>
                </div>
                {fieldRow('Normaltimer', '1000')}
                {fieldRow('Ferie', '3000')}
                {fieldRow('Sygdom', '3100')}
                {fieldRow('Kørsel (km)', '8000')}
            </Screen>
        ),
        export: (
            <Screen label="Eksportér til lønsystemet">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: 136 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12, background: `linear-gradient(145deg,${PURPLE},#6d28d9)`, color: '#fff', fontSize: 12, fontWeight: 800, boxShadow: '0 10px 22px rgba(124,58,237,0.3)' }}>
                        <Download size={16} /> Eksportér løn
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                        <Settings size={14} color="#94a3b8" /> Alt det her bor under tandhjulet
                    </div>
                </div>
            </Screen>
        ),
    };

    const STEPS = [
        { mockup: screens.intro, title: 'Løn & Timer', body: 'Alle medarbejderes timer og fravær samlet ét sted — klar til lønkørsel.' },
        { mockup: screens.period, title: 'Vælg lønperiode', body: 'Kør løn pr. måned eller hver 14. dag — du vælger rytmen, der passer jer.' },
        { mockup: screens.table, title: 'Se timer & fravær', body: 'Gennemgå, redigér og godkend hver medarbejders timer og fravær for perioden.' },
        { mockup: screens.lock, title: 'Automatisk lås', body: 'Når en periode er kørt, låses den automatisk efter din frist — så tallene ikke ændrer sig bagefter. Genåbn hvis noget skal rettes.' },
        { mockup: screens.workday, title: 'Arbejdsdag & frokost', body: 'Sæt standard arbejdsdag (fx 7,4 t) og automatisk frokostpause, der trækkes fra ved stempling.' },
        { mockup: screens.codes, title: 'Ferie-eksport & lønart-koder', body: 'Vælg om ferie eksporteres i dage eller timer — og indtast jeres egne lønart-numre fra lønsystemet (normaltimer, ferie, sygdom, kørsel …), så filen passer 1:1.' },
        { mockup: screens.export, title: 'Eksportér med ét klik', body: 'Træk den færdige fil direkte ind i lønsystemet. Alle indstillinger finder du under tandhjulet ⚙ "Løn-indstillinger".' },
    ];

    const total = STEPS.length;
    const isLast = step === total - 1;
    const canBack = step > 0;
    const s = STEPS[step];

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100120, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 26, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', padding: '26px 26px 20px', position: 'relative', animation: 'pgPop .3s cubic-bezier(.34,1.4,.64,1) both' }}>
                <button onClick={finish} title="Luk" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={18} /></button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: PURPLE, marginBottom: 14 }}><CalendarClock size={14} /> Løn & Timer</div>

                <div style={{ minHeight: 300, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    {s.mockup}
                    <h2 style={{ margin: '18px 0 6px', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>{s.title}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#5e5e5e', lineHeight: 1.6 }}>{s.body}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '18px 0 14px' }}>
                    {[...Array(total)].map((_, i) => (
                        <div key={i} style={{ height: 6, borderRadius: 99, transition: 'all .25s', width: i === step ? 22 : 6, background: i <= step ? PURPLE : '#e2e8f0' }} />
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {canBack && (
                        <button onClick={() => setStep(s => s - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '8px 6px' }}><ChevronLeft size={16} /> Tilbage</button>
                    )}
                    <button onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
                        {isLast ? 'Kom i gang' : 'Næste'} {!isLast && <ChevronRight size={16} />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button onClick={finish} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Spring denne guide over</button>
                </div>

                <style>{`@keyframes pgPop { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform:none; } }`}</style>
            </div>
        </div>,
        document.body
    );
}
