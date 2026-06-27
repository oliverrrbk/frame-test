// ============================================================================
// MobileInstallGuide.jsx — "Få Frame på mobilen"-guide (efter første intro).
// Centreret glas-modal, trin-for-trin med ILLUSTRATIVE mockups (ikoner + pile,
// ingen rigtige screenshots). Vælg iPhone/Android → platform-tilpassede trin.
// Per-guide spring-bar (markerer kun 'mobile_install_guide' som set). Kun desktop.
// ============================================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Share, MoreVertical, PlusSquare, Check, ChevronRight, ChevronLeft, X, Globe, ArrowDown } from 'lucide-react';
import { markCoachSeen } from './coachmarks';

const BLUE = '#2563eb';

// Lille telefon-ramme til mockups.
const Phone = ({ children, label }) => (
    <div style={{ width: 188, margin: '0 auto', borderRadius: 28, border: '8px solid #0f172a', background: '#0f172a', boxShadow: '0 24px 50px -16px rgba(15,23,42,0.5)' }}>
        <div style={{ background: '#f1f5f9', borderRadius: 20, overflow: 'hidden', minHeight: 300, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {children}
        </div>
        {label && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '6px 0 2px' }}>{label}</div>}
    </div>
);

const Pulse = ({ children }) => (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
        <span style={{ position: 'absolute', inset: -6, borderRadius: 14, boxShadow: `0 0 0 3px ${BLUE}`, animation: 'miPulse 1.6s ease-out infinite' }} />
        {children}
    </span>
);

export default function MobileInstallGuide({ onDone }) {
    const [step, setStep] = useState(0);          // 0 intro · 1 browser · 2 vælg platform · 3 tryk · 4 tilføj · 5 færdig
    const [platform, setPlatform] = useState(null); // 'ios' | 'android'

    const finish = () => { markCoachSeen('mobile_install_guide'); onDone && onDone(); };
    const isIOS = platform === 'ios';

    // ---- Mockups pr. trin ----
    // Ægte app-ikon: bison-logoet på mørk baggrund (som det ser ud på hjemmeskærmen).
    const appIcon = (
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(15,23,42,0.35)', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Bison Frame" style={{ width: 42, height: 42, objectFit: 'contain' }} />
        </div>
    );

    const screens = {
        intro: (
            <Phone label="Din hjemmeskærm">
                <div style={{ flex: 1, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, alignContent: 'flex-start', paddingTop: 24 }}>
                    {appIcon}
                    {[...Array(7)].map((_, i) => <div key={i} style={{ width: 40, height: 40, borderRadius: 12, background: '#e2e8f0' }} />)}
                </div>
            </Phone>
        ),
        browser: (
            <Phone label="Mobilens browser">
                <div style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `2px solid ${BLUE}`, borderRadius: 999, padding: '8px 12px', boxShadow: `0 0 0 4px ${BLUE}22` }}>
                        <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>bisonframe.dk</span>
                    </div>
                </div>
                <div style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{appIcon}</div>
            </Phone>
        ),
        tapIOS: (
            <Phone label="Safari">
                <div style={{ flex: 1 }} />
                {/* Safari bund-bjælke med Del-ikon fremhævet */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '12px 8px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                    <ChevronLeft size={18} color="#cbd5e1" />
                    <ChevronRight size={18} color="#cbd5e1" />
                    <Pulse><span style={{ display: 'inline-flex', padding: 6, borderRadius: 10, background: '#eff6ff' }}><Share size={20} color={BLUE} /></span></Pulse>
                    <PlusSquare size={18} color="#cbd5e1" />
                </div>
            </Phone>
        ),
        tapAndroid: (
            <Phone label="Chrome">
                {/* Chrome top-bjælke med tre-prikker fremhævet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 999, padding: '6px 10px' }}>
                        <Globe size={12} color="#94a3b8" /><span style={{ fontSize: 11, color: '#64748b' }}>bisonframe.dk</span>
                    </div>
                    <Pulse><span style={{ display: 'inline-flex', padding: 5, borderRadius: 10, background: '#eff6ff' }}><MoreVertical size={20} color={BLUE} /></span></Pulse>
                </div>
                <div style={{ flex: 1 }} />
            </Phone>
        ),
        add: isIOS ? (
            <Phone label="Føj til hjemmeskærm">
                <div style={{ flex: 1, background: '#1c1c1e', color: '#fff', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#3a3a3c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="#fff" /></span>
                        <span style={{ fontSize: 11.5, fontWeight: 700 }}>Føj til hjemmeskærm</span>
                        <Pulse><span style={{ background: '#0a84ff', color: '#fff', borderRadius: 999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700 }}>Tilføj</span></Pulse>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2c2c2e', borderRadius: 10, padding: 8 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Bison Frame</div>
                            <div style={{ fontSize: 10, color: '#8e8e93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>bisonframe.dk</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2c2c2e', borderRadius: 10, padding: '8px 10px' }}>
                        <span style={{ fontSize: 11 }}>Åbn som webapp</span>
                        <span style={{ width: 30, height: 18, borderRadius: 999, background: '#34c759', position: 'relative' }}><span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} /></span>
                    </div>
                </div>
            </Phone>
        ) : (
            <Phone label="Menuen">
                <div style={{ marginTop: 'auto', background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 10, boxShadow: '0 -8px 20px rgba(0,0,0,0.06)' }}>
                    {['Ny fane', 'Historik'].map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 8px', color: '#94a3b8', fontSize: 12 }}>{t}<div style={{ width: 18, height: 18, borderRadius: 5, background: '#e2e8f0' }} /></div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 10px', borderRadius: 12, background: '#eff6ff', border: `2px solid ${BLUE}`, color: '#0f172a', fontSize: 12.5, fontWeight: 800 }}>
                        Føj til startskærm <PlusSquare size={18} color={BLUE} />
                    </div>
                </div>
            </Phone>
        ),
        done: (
            <Phone label="Klar!">
                <div style={{ flex: 1, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, alignContent: 'flex-start', paddingTop: 24 }}>
                    <span style={{ position: 'relative' }}>
                        {appIcon}
                        <span style={{ position: 'absolute', right: -6, bottom: -6, width: 22, height: 22, borderRadius: '50%', background: '#10b981', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#fff" /></span>
                    </span>
                    {[...Array(7)].map((_, i) => <div key={i} style={{ width: 40, height: 40, borderRadius: 12, background: '#e2e8f0' }} />)}
                </div>
            </Phone>
        ),
    };

    // ---- Indhold pr. trin ----
    const renderBody = () => {
        if (step === 0) return (
            <>
                {screens.intro}
                <h2 style={ttl}>Få Frame i lommen</h2>
                <p style={txt}>Det er på computeren du bygger — men ude på pladsen lever arbejdet. Læg Frame på din mobils hjemmeskærm, så har du den som en app. Det tager 20 sekunder.</p>
            </>
        );
        if (step === 1) return (
            <>
                {screens.browser}
                <h2 style={ttl}>Åbn på din mobil</h2>
                <p style={txt}>Tag din telefon, åbn browseren og gå til <strong>bisonframe.dk</strong>. (Du behøver ikke engang logge ind for at installere den.)</p>
            </>
        );
        if (step === 2) return (
            <>
                <h2 style={{ ...ttl, marginTop: 8 }}>Hvilken telefon har du?</h2>
                <p style={txt}>Så viser vi præcis hvor du skal trykke.</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    {[{ k: 'ios', l: 'iPhone' }, { k: 'android', l: 'Android' }].map(o => (
                        <button key={o.k} onClick={() => { setPlatform(o.k); setStep(3); }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 12px', borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 800, color: '#0f172a', transition: 'all .15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(37,99,235,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <Smartphone size={30} color={BLUE} /> {o.l}
                        </button>
                    ))}
                </div>
            </>
        );
        if (step === 3) return (
            <>
                {isIOS ? screens.tapIOS : screens.tapAndroid}
                <h2 style={ttl}>{isIOS ? 'Tryk på Del' : 'Tryk på menuen'}</h2>
                <p style={txt}>
                    {isIOS
                        ? <>På nyere iPhones skal du først trykke på <strong>linjen i bunden</strong> af Safari, så knapperne kommer frem — tryk derefter på <strong>Del</strong>-ikonet (firkant med pil op).</>
                        : <>Tryk på <strong>de tre prikker</strong> øverst til højre i Chrome.</>}
                </p>
            </>
        );
        if (step === 4) return (
            <>
                {screens.add}
                <h2 style={ttl}>Føj til hjemmeskærm</h2>
                <p style={txt}>{isIOS ? <>Rul ned i Del-menuen og vælg <strong>“Føj til hjemmeskærm”</strong> — tryk så <strong>“Tilføj”</strong> øverst. (Lad gerne “Åbn som webapp” være slået til.)</> : <>Vælg <strong>“Installér app”</strong> eller <strong>“Føj til startskærm”</strong>.</>}</p>
            </>
        );
        return (
            <>
                {screens.done}
                <h2 style={ttl}>Så er du klar!</h2>
                <p style={txt}>Frame ligger nu som en app på din telefon. Log ind, og du har hele dit system med i lommen.</p>
                <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <p style={{ margin: 0, color: '#334155', fontSize: 13.5, lineHeight: 1.55 }}>
                        Hos <strong>Bison Frame</strong> ser vi ikke vores kunder som blot brugere — men som <strong>med-udviklere</strong>. Har du en idé, eller er der noget der driller, så skriv altid til os på <a href="mailto:mbc@bisoncompany.dk" style={{ color: BLUE, fontWeight: 700 }}>mbc@bisoncompany.dk</a> eller ring på <a href="tel:40265002" style={{ color: BLUE, fontWeight: 700 }}>40 26 50 02</a>.
                    </p>
                </div>
            </>
        );
    };

    const totalSteps = 6;
    const canBack = step > 0;
    const isLast = step === 5;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100120, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 26, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', padding: '26px 26px 20px', position: 'relative', animation: 'miPop .3s cubic-bezier(.34,1.4,.64,1) both' }}>
                <button onClick={finish} title="Luk" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={18} /></button>

                <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800, color: BLUE, marginBottom: 14 }}>Få Frame på mobilen</div>

                <div style={{ minHeight: 360, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    {renderBody()}
                </div>

                {/* Progress-prikker */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '18px 0 14px' }}>
                    {[...Array(totalSteps)].map((_, i) => (
                        <div key={i} style={{ height: 6, borderRadius: 99, transition: 'all .25s', width: i === step ? 22 : 6, background: i <= step ? BLUE : '#e2e8f0' }} />
                    ))}
                </div>

                {/* Knapper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {canBack && (
                        <button onClick={() => setStep(s => s - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '8px 6px' }}><ChevronLeft size={16} /> Tilbage</button>
                    )}
                    {step !== 2 && (
                        <button onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
                            {isLast ? 'Færdig' : 'Næste'} {!isLast && <ChevronRight size={16} />}
                        </button>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button onClick={finish} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Spring denne guide over</button>
                </div>

                <style>{`
                    @keyframes miPop { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform:none; } }
                    @keyframes miPulse { 0% { opacity:.9; transform: scale(1); } 70% { opacity:0; transform: scale(1.5); } 100% { opacity:0; } }
                `}</style>
            </div>
        </div>,
        document.body
    );
}

const ttl = { margin: '18px 0 6px', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' };
const txt = { margin: 0, fontSize: 14, color: '#5e5e5e', lineHeight: 1.6 };
