import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Mic, FileText, ChevronRight } from 'lucide-react';
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
    { eyebrow: 'Sådan laver du tilbud', title: 'Tilbud fra bunden (avanceret)', body: 'Byg tilbuddet op trin for trin, og lad AI hjælpe undervejs. Prøv den når du er varm i systemet.' },
];

const CreateLeadSelector = ({ onSelectClassic, onSelectCustom, onSelectQuick, isMobile = false, allowCalculator = true }) => {
    const cardRefs = [useRef(null), useRef(null), useRef(null)];
    // Guidet gennemgang kun på computer + første gang — og kun når der er flere kort
    // (ikke-tømrere ser kun Hurtigt tilbud, så ingen gennemgang).
    const [tourStep, setTourStep] = useState(() => (!isMobile && allowCalculator && shouldShowCoach('chooser_tour')) ? 0 : -1);
    const guiding = tourStep >= 0;

    useEffect(() => {
        if (guiding) markCoachSeen('chooser_tour'); // markér set, så den ikke kommer igen
    }, [guiding]);

    const endTour = () => setTourStep(-1);
    const nextTour = () => setTourStep((s) => (s < 2 ? s + 1 : -1));
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

            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || !allowCalculator) ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '16px' : '24px', maxWidth: allowCalculator ? '1080px' : '460px', margin: '0 auto' }}>

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

                {/* 3) Tilbud fra bunden (AI / avanceret) */}
                <div
                    ref={cardRefs[2]}
                    onClick={onSelectCustom}
                    style={{ ...cardStyle(2), padding: pad }}
                    onMouseEnter={(e) => hover(e, '#10b981', true)}
                    onMouseLeave={(e) => hover(e, '#10b981', false)}
                >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mic size={40} color="#10b981" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Tilbud fra bunden</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Indtal noter med stemmen — AI bygger tilbuddet.' : 'Opret en specialopgave fra bunden. Indtal dine mål og noter med stemmen, og sammensæt selv materialelisten.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold' }}>
                        Opret fra bunden <ChevronRight size={18} />
                    </div>
                </div>
                </>)}
            </div>

            {/* Guidet gennemgang — boble peger på det aktive kort */}
            {guiding && (
                <Coachmark
                    key={tourStep}
                    anchorRef={cardRefs[tourStep]}
                    placement="bottom"
                    halo={false}
                    step={`${tourStep + 1} / 3`}
                    eyebrow={TOUR[tourStep].eyebrow}
                    title={TOUR[tourStep].title}
                    body={TOUR[tourStep].body}
                    primaryLabel={tourStep < 2 ? 'Næste' : 'Kom i gang'}
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
