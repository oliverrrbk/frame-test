// ============================================================================
// FoundersWelcome.jsx — personlig velkomst fra Oliver & Mads, allerførst på
// kontrolpanelet. Større, interaktiv, med en figur pr. slide der afspejler
// emnet. Ingen emojis. Spring-bar. markCoachSeen('founders_welcome') ved slut.
// Fotos: public/founders/mads.jpg + oliver.jpg (initial-fallback hvis de mangler).
// ============================================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X, ThumbsUp, Wrench, Hammer, ListChecks, Clock, MapPin, Coins, Phone, HeartHandshake, Users, Sparkles } from 'lucide-react';
import { markCoachSeen } from './coachmarks';

const BLUE = '#2563eb';
const MADS = '/founders/mads.jpg';
const OLIVER = '/founders/oliver.jpg';

const Avatar = ({ src, name, size = 96 }) => {
    const [ok, setOk] = useState(true);
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 34px rgba(15,23,42,0.30)', border: '4px solid #fff', flexShrink: 0 }}>
            {ok
                ? <img src={src} alt={name} onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.34 }}>{initials}</span>}
        </div>
    );
};

// Scene: blød farve-flade med en stor primær-figur + flydende accent-badges.
const Scene = ({ bg, primary, accents = [] }) => (
    <div style={{ width: '100%', height: 184, borderRadius: 22, background: bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 34px rgba(15,23,42,0.14)' }}>{primary}</div>
        {accents.map((a, i) => (
            <div key={i} style={{ position: 'absolute', ...a.pos, width: 54, height: 54, borderRadius: 17, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px rgba(15,23,42,0.12)' }}>{a.icon}</div>
        ))}
    </div>
);

export default function FoundersWelcome({ onDone }) {
    const [step, setStep] = useState(0);
    const finish = () => { markCoachSeen('founders_welcome'); onDone && onDone(); };

    const duo = (mads = 52) => (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <div style={{ marginRight: -16 }}><Avatar src={MADS} name="Mads" size={mads} /></div>
            <Avatar src={OLIVER} name="Oliver" size={mads} />
        </div>
    );

    const STEPS = [
        {
            scene: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
                    <div style={{ textAlign: 'center' }}><Avatar src={MADS} name="Mads" size={108} /><div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Mads</div></div>
                    <div style={{ textAlign: 'center' }}><Avatar src={OLIVER} name="Oliver" size={108} /><div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Oliver</div></div>
                </div>
            ),
            title: 'Hej — vi er Oliver & Mads',
            body: 'Det er os, der har bygget Frame. Lad os lige hilse på, inden du går i gang.',
        },
        {
            scene: <Scene bg="linear-gradient(135deg,#fffbeb,#fef3c7)" primary={<ThumbsUp size={48} color="#f59e0b" />} accents={[{ icon: <Wrench size={26} color={BLUE} />, pos: { top: 22, left: 26 } }, { icon: <Hammer size={26} color="#0f172a" />, pos: { bottom: 22, right: 26 } }]} />,
            title: 'Vi har ti tommelfingre',
            body: 'Men til gengæld er vi pissegode til at bygge systemer. Vi har en flok tømrer-venner, der sagde, at der ikke fandtes ét, som bare gav mening — så byggede vi Frame sammen med dem, som hvis de selv ville have gjort det. Hver eneste del er afprøvet af rigtige tømrere, der bruger det hver dag.',
        },
        {
            scene: <Scene bg="linear-gradient(135deg,#f8fafc,#eef2f6)" primary={<ListChecks size={46} color="#94a3b8" />} accents={[{ icon: <Clock size={26} color="#ef4444" />, pos: { top: 24, right: 30 } }, { icon: <Sparkles size={24} color="#10b981" />, pos: { bottom: 22, left: 28 } }]} />,
            title: 'Vi hader irriterende guides',
            body: 'Dem der tager ti år at komme igennem, før man overhovedet kan bruge systemet. Derfor har vi gjort vores så korte som overhovedet muligt.',
        },
        {
            scene: <Scene bg="linear-gradient(135deg,#eff6ff,#dbeafe)" primary={<MapPin size={48} color={BLUE} />} accents={[{ icon: <Clock size={26} color="#0f172a" />, pos: { top: 22, left: 28 } }, { icon: <Coins size={26} color="#f59e0b" />, pos: { bottom: 22, right: 28 } }]} />,
            title: 'Du møder en kort guide hvert nyt sted',
            body: 'Den viser, hvordan vi og vores tømrere har tænkt det brugt — ikke en lov, du bestemmer selv. Men giv det en chance: de 10-15 minutter sparer dig en helvedes masse timer og bøvl, så du hurtigere tjener penge.',
        },
        {
            scene: <Scene bg="linear-gradient(135deg,#ecfdf5,#d1fae5)" primary={<Phone size={46} color="#059669" />} accents={[{ icon: <HeartHandshake size={28} color={BLUE} />, pos: { top: 22, right: 28 } }, { icon: <img src="/logo.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />, pos: { bottom: 20, left: 26 } }]} />,
            title: 'Driller noget? Så ring',
            body: <>Er der noget, der driller, eller har du brug for hjælp til at forstå systemet? Så ring — vi fikser det. Og mangler du en feature, laver vi den. Vores motto i Bison Company: <strong style={{ color: '#0f172a' }}>Med ærlighed kommer man længst</strong>. Derfor samarbejder vi så tæt med jer som muligt.</>,
            footer: <a href="tel:+4540265002" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}><Phone size={16} /> Ring til os: 40 26 50 02</a>,
        },
        {
            scene: <Scene bg="linear-gradient(135deg,#eef2ff,#e0e7ff)" primary={<HeartHandshake size={48} color={BLUE} />} accents={[{ icon: <Users size={26} color="#0f172a" />, pos: { top: 24, left: 28 } }, { icon: <Wrench size={24} color="#7c3aed" />, pos: { bottom: 22, right: 30 } }]} />,
            title: 'Du er ikke bare en bruger',
            body: <>Du er med-udvikler af Frame — et system, der hele tiden følger med branchen, så det hjælper jer bedst muligt. Vi glæder os til at bygge videre sammen med jer.<br /><br /><strong style={{ color: '#0f172a' }}>De bedste hilsener, Mads &amp; Oliver</strong></>,
        },
    ];

    const total = STEPS.length;
    const isLast = step === total - 1;
    const canBack = step > 0;
    const s = STEPS[step];

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100150, background: 'rgba(15,23,42,0.80)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 580, maxHeight: '94vh', overflowY: 'auto', background: '#fff', borderRadius: 30, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', padding: '34px 36px 26px', position: 'relative', animation: 'fwPop .38s cubic-bezier(.34,1.4,.64,1) both' }}>
                <img src="/logo.png" alt="Bison Company" style={{ position: 'absolute', top: 18, left: 20, width: 30, height: 30, objectFit: 'contain' }} />
                <button onClick={finish} title="Luk" style={{ position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><X size={18} /></button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 800, color: BLUE, marginBottom: 20 }}>
                    {step > 0 && duo(26)}
                    <span>Fra Oliver &amp; Mads</span>
                </div>

                <div key={step} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', animation: 'fwFade .32s ease both' }}>
                    {s.scene}
                    <h2 style={{ margin: '22px 0 10px', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1.15 }}>{s.title}</h2>
                    <p style={{ margin: '0 auto', fontSize: 15.5, color: '#5e5e5e', lineHeight: 1.65, maxWidth: 440 }}>{s.body}</p>
                    {s.footer && <div style={{ marginTop: 14 }}>{s.footer}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '24px 0 18px' }}>
                    {[...Array(total)].map((_, i) => (
                        <div key={i} style={{ height: 7, borderRadius: 99, transition: 'all .25s', width: i === step ? 26 : 7, background: i <= step ? BLUE : '#e2e8f0' }} />
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {canBack && (
                        <button onClick={() => setStep(s => s - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: '10px 6px' }}><ChevronLeft size={17} /> Tilbage</button>
                    )}
                    <button onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#fff', border: 'none', borderRadius: 14, padding: '13px 26px', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 10px 24px rgba(0,0,0,0.22)' }}>
                        {isLast ? 'Lad os komme i gang' : 'Næste'} {!isLast && <ChevronRight size={17} />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button onClick={finish} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Spring over</button>
                </div>

                {/* Legitimitet: rigtig virksomhed man kan slå op. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11.5, fontWeight: 600 }}>
                    <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.8 }} />
                    Bison Company · CVR 45899713
                </div>

                <style>{`
                    @keyframes fwPop { from { opacity:0; transform: translateY(16px) scale(.96); } to { opacity:1; transform:none; } }
                    @keyframes fwFade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
