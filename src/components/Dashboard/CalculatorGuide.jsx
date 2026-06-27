// ============================================================================
// CalculatorGuide.jsx — selvstændig illustreret guide til Prisberegneren.
// Beregner-koden (Wizard.jsx m.fl.) er LÅST og må ikke røres, så denne guide
// peger IKKE på rigtig UI — den viser illustrative mockups (samme stil som
// MobileInstallGuide). Per-guide spring-bar (markerer kun 'calculator_guide').
// ============================================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, ChevronRight, ChevronLeft, X, Globe, Copy } from 'lucide-react';
import { markCoachSeen } from './coachmarks';

const BLUE = '#2563eb';

// Lille "skærm"-ramme til mockups.
const Screen = ({ children, label }) => (
    <div style={{ width: 268, margin: '0 auto' }}>
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

const miniCard = (label, color, bg, active) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 12, border: `1.5px solid ${active ? color : '#e2e8f0'}`, background: active ? bg : '#fff', boxShadow: active ? `0 8px 18px ${color}22` : 'none' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: active ? color : '#64748b' }}>{label}</span>
    </div>
);

export default function CalculatorGuide({ onDone, slug }) {
    const [step, setStep] = useState(0); // 0 intro · 1 vælg · 2 spørgsmål · 3 pris · 4 tilbud · 5 del
    const linkText = `bisonframe.dk/${slug || 'dit-firma'}`;

    const finish = () => { markCoachSeen('calculator_guide'); onDone && onDone(); };

    const screens = {
        intro: (
            <Screen label="Prisberegner">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: 136 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calculator size={32} color={BLUE} />
                    </div>
                    <div style={{ width: 150, height: 9, borderRadius: 5, background: '#e2e8f0' }} />
                    <div style={{ width: 110, height: 9, borderRadius: 5, background: '#eef2f6' }} />
                </div>
            </Screen>
        ),
        choose: (
            <Screen label="Vælg opgavetype">
                <div style={{ display: 'flex', gap: 8 }}>
                    {miniCard('Tag', '#f59e0b', '#fff7ed', false)}
                    {miniCard('Gulv', '#3b82f6', '#eff6ff', true)}
                    {miniCard('Vinduer', '#10b981', '#ecfdf5', false)}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>…og mange flere opgavetyper</p>
            </Screen>
        ),
        questions: (
            <Screen label="Svar på spørgsmål">
                <div style={{ height: 6, borderRadius: 99, background: '#e2e8f0', marginBottom: 14 }}>
                    <div style={{ width: '60%', height: '100%', borderRadius: 99, background: BLUE }} />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Hvor mange m² gulv?</div>
                {[['Under 20 m²', false], ['20–50 m²', true], ['Over 50 m²', false]].map(([t, on]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${on ? BLUE : '#e2e8f0'}`, background: on ? '#eff6ff' : '#fff', marginBottom: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${on ? BLUE : '#cbd5e1'}`, background: on ? BLUE : '#fff' }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? '#1e3a8a' : '#475569' }}>{t}</span>
                    </div>
                ))}
            </Screen>
        ),
        price: (
            <Screen label="Pris med det samme">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {[['Materialer', '12.800 kr'], ['Arbejde', '9.000 kr'], ['Moms (25%)', '5.450 kr']].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b' }}><span>{k}</span><span style={{ fontWeight: 700, color: '#334155' }}>{v}</span></div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>I alt inkl. moms</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#047857' }}>27.250 kr</span>
                </div>
            </Screen>
        ),
        quote: (
            <Screen label="Bliv til tilbud + materialeliste">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 110 }}>
                    {/* prisen */}
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 12px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '.05em' }}>Pris</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#047857' }}>27.250</span>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                    {/* to dokumenter: tilbud + materialeliste */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[['Tilbud', '#10b981'], ['Materialer', '#3b82f6']].map(([lbl, col]) => (
                            <div key={lbl} style={{ width: 52, height: 66, borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', gap: 4, padding: 7, boxShadow: '0 6px 14px rgba(15,23,42,0.06)' }}>
                                <div style={{ height: 5, width: '75%', borderRadius: 3, background: '#cbd5e1' }} />
                                <div style={{ height: 4, width: '100%', borderRadius: 2, background: '#eef2f6' }} />
                                <div style={{ height: 4, width: '90%', borderRadius: 2, background: '#eef2f6' }} />
                                <div style={{ marginTop: 'auto', height: 6, width: '60%', borderRadius: 3, background: col }} />
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>{lbl}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Screen>
        ),
        share: (
            <Screen label="Dit personlige link">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${BLUE}`, borderRadius: 12, padding: '9px 10px', boxShadow: `0 0 0 4px ${BLUE}1f`, marginBottom: 14 }}>
                    <Globe size={15} color={BLUE} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{linkText}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8, background: '#0f172a', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0 }}><Copy size={11} /> Kopiér</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 130, borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #eef2f6' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                        </div>
                        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>Din hjemmeside</span>
                            <div style={{ height: 5, width: '80%', borderRadius: 3, background: '#eef2f6' }} />
                            <div style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(145deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: 9, fontWeight: 800 }}>Beregn pris</div>
                        </div>
                    </div>
                </div>
            </Screen>
        ),
    };

    const STEPS = [
        { mockup: screens.intro, title: 'Prisberegner', body: 'Få en pris på de typiske opgaver — uden at regne selv. Perfekt når du vil give kunden et hurtigt, troværdigt overslag.' },
        { mockup: screens.choose, title: 'Vælg opgaven', body: 'Start med at vælge hvad opgaven handler om — fx tag, gulv eller vinduer.' },
        { mockup: screens.questions, title: 'Svar på et par spørgsmål', body: 'Beregneren spørger ind til mål og materialer — næsten som hvis du var kunden. Det tager under et minut.' },
        { mockup: screens.price, title: 'Få prisen med det samme', body: 'Du får et prisoverslag bygget på Frames standardpriser — så du altid rammer rigtigt.' },
        { mockup: screens.quote, title: 'Bliv til tilbud + materialeliste', body: 'Prisen bliver automatisk til både et færdigt tilbud og en materialeliste — ret til hvis du vil, og send direkte til kunden. Det hænger sammen hele vejen.' },
        { mockup: screens.share, title: 'Lad kunden regne selv', body: <>Du har dit eget link — <strong>{linkText}</strong>. Send det på SMS/mail eller læg det på din hjemmeside, så kunden selv regner prisen og sender dig en færdig forespørgsel. Vi hjælper gerne de første med at få det på hjemmesiden.</> },
    ];

    const totalSteps = STEPS.length;
    const isLast = step === totalSteps - 1;
    const canBack = step > 0;
    const s = STEPS[step];

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100120, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 26, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', padding: '26px 26px 20px', position: 'relative', animation: 'cgPop .3s cubic-bezier(.34,1.4,.64,1) both' }}>
                <button onClick={finish} title="Luk" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={18} /></button>

                <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: BLUE, marginBottom: 14 }}>Sådan virker Prisberegneren</div>

                <div style={{ minHeight: 300, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    {s.mockup}
                    <h2 style={{ margin: '18px 0 6px', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>{s.title}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#5e5e5e', lineHeight: 1.6 }}>{s.body}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '18px 0 14px' }}>
                    {[...Array(totalSteps)].map((_, i) => (
                        <div key={i} style={{ height: 6, borderRadius: 99, transition: 'all .25s', width: i === step ? 22 : 6, background: i <= step ? BLUE : '#e2e8f0' }} />
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

                <style>{`@keyframes cgPop { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform:none; } }`}</style>
            </div>
        </div>,
        document.body
    );
}
