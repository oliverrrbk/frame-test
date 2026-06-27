// ============================================================================
// FoundersWelcome.jsx — personlig velkomst fra Oliver & Mads, allerførst på
// kontrolpanelet (før overant-rundturen). Historien i små bidder, glas-stil,
// ingen emojis. Spring-bar. markCoachSeen('founders_welcome') ved afslutning.
// Billeder: public/founders/mads.jpg + oliver.jpg (initial-fallback hvis de mangler).
// ============================================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { markCoachSeen } from './coachmarks';

const BLUE = '#2563eb';

const Avatar = ({ src, name, size = 88 }) => {
    const [ok, setOk] = useState(true);
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 30px rgba(15,23,42,0.28)', border: '3px solid #fff', flexShrink: 0 }}>
            {ok
                ? <img src={src} alt={name} onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.34 }}>{initials}</span>}
        </div>
    );
};

const MADS = '/founders/mads.jpg';
const OLIVER = '/founders/oliver.jpg';

export default function FoundersWelcome({ onDone }) {
    const [step, setStep] = useState(0);
    const finish = () => { markCoachSeen('founders_welcome'); onDone && onDone(); };

    // Lille duo-stak til toppen af de øvrige slides.
    const duo = (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <div style={{ marginRight: -14 }}><Avatar src={MADS} name="Mads" size={52} /></div>
            <Avatar src={OLIVER} name="Oliver" size={52} />
        </div>
    );

    const STEPS = [
        {
            hero: (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 6 }}>
                    <div style={{ textAlign: 'center' }}><Avatar src={MADS} name="Mads" size={92} /><div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Mads</div></div>
                    <div style={{ textAlign: 'center' }}><Avatar src={OLIVER} name="Oliver" size={92} /><div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Oliver</div></div>
                </div>
            ),
            title: 'Hej — vi er Oliver & Mads',
            body: 'Det er os, der har bygget Frame. Lad os lige hilse på, inden du går i gang.',
        },
        {
            hero: duo,
            title: 'Vi har ti tommelfingre',
            body: 'Men sammen med en flok tømrer-venner — der var dødtrætte af, at der ikke fandtes et system, der bare gav mening — byggede vi Frame.',
        },
        {
            hero: duo,
            title: 'Vi hader irriterende guides',
            body: 'Også selv, når vi prøver nye systemer. Derfor har vi gjort vores så korte og lette som overhovedet muligt.',
        },
        {
            hero: duo,
            title: 'Du møder en lille guide hvert nyt sted',
            body: 'Den viser, hvordan det er tænkt brugt — ikke en lov. Du bestemmer, og vi finder den bedste måde sammen. Giv den en chance: de 10-15 minutter sparer dig timer og gør det hurtigere at tjene penge.',
        },
        {
            hero: duo,
            title: 'Driller noget? Så ring',
            body: 'Vi fikser det. Mangler du en feature, laver vi den med det samme. Ærlighed kommer længst — derfor holder vi alt så gennemsigtigt som muligt.',
        },
        {
            hero: duo,
            title: 'Du er ikke bare bruger',
            body: 'Du er med-udvikler af Frame. Vi bygger det videre sammen med dig. Velkommen — lad os komme i gang.',
        },
    ];

    const total = STEPS.length;
    const isLast = step === total - 1;
    const canBack = step > 0;
    const s = STEPS[step];

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100150, background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 28, boxShadow: '0 34px 90px rgba(0,0,0,0.45)', padding: '30px 28px 22px', position: 'relative', animation: 'fwPop .35s cubic-bezier(.34,1.4,.64,1) both' }}>
                <button onClick={finish} title="Luk" style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={18} /></button>

                <div style={{ fontSize: 11, letterSpacing: '.10em', textTransform: 'uppercase', fontWeight: 800, color: BLUE, marginBottom: 18, textAlign: 'center' }}>Fra Oliver & Mads</div>

                <div key={step} style={{ minHeight: 250, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fwFade .3s ease both' }}>
                    {s.hero}
                    <h2 style={{ margin: '18px 0 8px', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>{s.title}</h2>
                    <p style={{ margin: 0, fontSize: 14.5, color: '#5e5e5e', lineHeight: 1.6, maxWidth: 380 }}>{s.body}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '20px 0 16px' }}>
                    {[...Array(total)].map((_, i) => (
                        <div key={i} style={{ height: 6, borderRadius: 99, transition: 'all .25s', width: i === step ? 24 : 6, background: i <= step ? BLUE : '#e2e8f0' }} />
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {canBack && (
                        <button onClick={() => setStep(s => s - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '8px 6px' }}><ChevronLeft size={16} /> Tilbage</button>
                    )}
                    <button onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                        {isLast ? 'Lad os komme i gang' : 'Næste'} {!isLast && <ChevronRight size={16} />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button onClick={finish} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Spring over</button>
                </div>

                <style>{`
                    @keyframes fwPop { from { opacity:0; transform: translateY(14px) scale(.97); } to { opacity:1; transform:none; } }
                    @keyframes fwFade { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:none; } }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
