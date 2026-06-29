import React, { useState, useRef, useEffect } from 'react';
import { Calculator, FileText, ChevronRight, SlidersHorizontal, Package, HardHat } from 'lucide-react';
import Coachmark from './Coachmark';
import { shouldShowCoach, markCoachSeen } from './coachmarks';

// Kortenes design er uændret — kun rækkefølgen er ny (Hurtigt tilbud først,
// derefter Prisberegner, så Tilbud fra bunden) + et lille "Nemmest"-mærke +
// en kort guidet gennemgang første gang (kun desktop).
const CARD_BASE = {
    backgroundColor: '#fff',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    position: 'relative',
};

// Guidet gennemgang — ét kort lyses op ad gangen (de andre dæmpes).
const TOUR = [
    { eyebrow: 'Sådan laver du tilbud', title: 'Hurtigt tilbud — start her', body: 'Lettest og hurtigst: skriv din materialepris og avance, se tilbuddet, og send det på mail med det samme.' },
    { eyebrow: 'Sådan laver du tilbud', title: 'Prisberegner', body: 'Gå igennem som var du kunden — få et hurtigt overslag på opgaven, og ret til bagefter.' },
];

const CreateLeadSelector = ({ onSelectClassic, onSelectCustom, onSelectQuick, onSelectCase, onSelectMaterials, onCustomizeCalculator, isMobile = false, allowCalculator = true }) => {
    const cardRefs = [useRef(null), useRef(null)];
    // Guidet gennemgang kun på computer + første gang — og kun når der er flere kort
    // (ikke-tømrere ser kun Hurtigt tilbud, så ingen gennemgang).
    const [tourStep, setTourStep] = useState(() => (!isMobile && allowCalculator && shouldShowCoach('chooser_tour')) ? 0 : -1);
    const guiding = tourStep >= 0;

    useEffect(() => {
        if (guiding) markCoachSeen('chooser_tour'); // markér set, så den ikke kommer igen
    }, [guiding]);

    const endTour = () => setTourStep(-1);
    const nextTour = () => setTourStep((s) => (s < 1 ? s + 1 : -1));
    // Per-guide: at springe DENNE guide over markerer kun chooser_tour som set —
    // Hurtigt tilbud-introen kommer stadig, når man går ind på den.
    const skipTour = () => { markCoachSeen('chooser_tour'); endTour(); };

    // Dæmp de ikke-aktive kort under gennemgangen; lys det aktive op.
    const cardStyle = (idx) => {
        if (!guiding) return CARD_BASE;
        if (idx === tourStep) return {
            ...CARD_BASE,
            transform: 'translateY(-4px)',
            boxShadow: '0 0 0 6px rgba(255,255,255,0.95), 0 22px 50px rgba(0,0,0,0.18)',
            zIndex: 2,
        };
        return { ...CARD_BASE, opacity: 0.35, filter: 'saturate(.6)', pointerEvents: 'none' };
    };

    const hover = (e, color, on) => {
        if (guiding) return;
        e.currentTarget.style.transform = on ? 'translateY(-5px)' : 'translateY(0)';
        e.currentTarget.style.borderColor = on ? color : 'transparent';
        e.currentTarget.style.boxShadow = on ? `0 20px 40px ${color}26` : '0 10px 30px rgba(0,0,0,0.05)';
    };
    const pad = isMobile ? '24px' : '32px';

    return (
        <div className="create-lead-selector" style={{ padding: isMobile ? '64px 16px 24px' : '20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: isMobile ? '1.7rem' : '2rem', color: '#0f172a' }}>Opret ny sag</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: isMobile ? '24px' : '40px', fontSize: isMobile ? '1rem' : '1.1rem' }}>Vælg hvordan du vil oprette</p>

            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || !allowCalculator) ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '16px' : '24px', maxWidth: allowCalculator ? '760px' : '460px', margin: '0 auto' }}>

                {/* 1) Hurtigt tilbud (manuelt) — letteste, står først */}
                <div
                    ref={cardRefs[0]}
                    onClick={onSelectQuick}
                    style={{ ...cardStyle(0), padding: pad }}
                    onMouseEnter={(e) => hover(e, '#f59e0b', true)}
                    onMouseLeave={(e) => hover(e, '#f59e0b', false)}
                >
                    {!isMobile && allowCalculator && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>Nemmest · start her</div>}
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={40} color="#f59e0b" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Hurtigt tilbud</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Materialepris + avance + send. Du styrer tallene.' : 'Smid din materialepris ind, sæt din avance og send et tilbud med det samme. Vedhæft din liste fra Davidsen — du har hands-on kontrol.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold' }}>
                        Lav tilbud <ChevronRight size={18} />
                    </div>
                </div>

                {allowCalculator && (<>
                {/* 2) Prisberegner (standard-skabeloner) */}
                <div
                    ref={cardRefs[1]}
                    onClick={onSelectClassic}
                    style={{ ...cardStyle(1), padding: pad }}
                    onMouseEnter={(e) => hover(e, '#3b82f6', true)}
                    onMouseLeave={(e) => hover(e, '#3b82f6', false)}
                >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calculator size={40} color="#3b82f6" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Prisberegner</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Standard-skabeloner med faste priser.' : 'Opret et tilbud via de standardiserede skabeloner for gulve, tage, vinduer osv. med foruddefinerede priser.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold' }}>
                        Start beregner <ChevronRight size={18} />
                    </div>
                </div>

                </>)}
            </div>

            {/* Opret sag uden tilbud — for tømreren der bare kører ud, arbejder på timepris
                og fakturerer bagefter. Fuld bredde under kortene, så den passer uanset om
                beregneren er slået til (2 kort) eller ej (1 kort). */}
            {onSelectCase && !guiding && (
                <div style={{ maxWidth: allowCalculator ? '760px' : '460px', margin: '20px auto 0' }}>
                    <div
                        onClick={onSelectCase}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: isMobile ? '18px' : '20px 24px', background: '#fff', borderRadius: '16px', border: '2px solid #d1fae5', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 6px 18px rgba(16,185,129,0.06)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 16px 32px rgba(16,185,129,0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#d1fae5'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.06)'; }}
                    >
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <HardHat size={28} color="#10b981" />
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0 0 4px' }}>Opret sag (uden tilbud)</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.45', margin: 0, fontSize: isMobile ? '0.9rem' : '0.95rem' }}>{isMobile ? 'Kører du bare ud på timepris? Opret sagen direkte.' : 'Kører du bare ud, arbejder på timepris og fakturerer bagefter? Opret sagen direkte med kundeoplysninger — uden et tilbud.'}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 'bold', flexShrink: 0 }}>
                            {!isMobile && 'Opret sag'} <ChevronRight size={18} />
                        </div>
                    </div>
                </div>
            )}

            {/* Selvstændig genvej: lav en materialeliste uden et tilbud (fx send til Davidsen
                for en pris, før du laver tilbuddet). Diskret link så de tre kort holder fokus. */}
            {onSelectMaterials && !guiding && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: isMobile ? '16px' : '20px' }}>
                    <button
                        onClick={onSelectMaterials}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '999px', border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#1d4ed8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                    >
                        <Package size={16} /> Lav kun en materialeliste (send til leverandør)
                    </button>
                </div>
            )}

            {/* "Tilbud fra bunden" er helt taget ud af oprettelses-vælgeren (kan ikke vælges
                af nogen). Komponenten (CustomProjectCreator) er bevaret i koden, men har
                ingen indgang længere — let at genaktivere senere hvis ønsket. */}

            {/* Tilpas hvilke opgaver beregneren viser — lige ved Prisberegneren (ikke gemt i Indstillinger) */}
            {allowCalculator && onCustomizeCalculator && !guiding && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: isMobile ? '20px' : '28px' }}>
                    <button
                        onClick={onCustomizeCalculator}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '999px', border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(59,130,246,0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.05)'; }}
                    >
                        <SlidersHorizontal size={16} /> Tilpas hvilke opgaver beregneren viser
                    </button>
                </div>
            )}

            {/* Guidet gennemgang — boble peger på det aktive kort */}
            {guiding && (
                <Coachmark
                    key={tourStep}
                    anchorRef={cardRefs[tourStep]}
                    placement="bottom"
                    halo={false}
                    step={`${tourStep + 1} / 2`}
                    eyebrow={TOUR[tourStep].eyebrow}
                    title={TOUR[tourStep].title}
                    body={TOUR[tourStep].body}
                    primaryLabel={tourStep < 1 ? 'Næste' : 'Kom i gang'}
                    onPrimary={nextTour}
                    onSkip={skipTour}
                    onClose={endTour}
                />
            )}

            <style>{`
                @media (max-width: 768px) {
                    .create-lead-selector > div {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CreateLeadSelector;
