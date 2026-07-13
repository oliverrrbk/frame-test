import React, { useState } from 'react';
import { Lock, Check, ArrowRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { getPlan } from '../../utils/features';

/**
 * PaywallLock — den plan-specifikke "din adgang er låst"-skærm der vises i
 * indholds-området når prøven er udløbet / abonnementet er inaktivt.
 *
 * Erstatter KUN den gamle generiske paywall-boks. Selve gating-logikken
 * (isPaywallActive i Dashboard.jsx) er URØRT — vi ændrer kun UDSEENDET for de
 * brugere der allerede var ramt. Sidebar + topbar bliver stående, så "Log ud"
 * og "Abonnement" altid kan nås.
 *
 * Psykologi:
 *   • Loss aversion + ejerskab: vi viser brugerens EGNE tal (sager, kunder,
 *     timeregistreringer) og understreger at INTET er slettet — kun låst.
 *   • Plan-specifik: en Solo-bruger mister Solo-funktionerne; en Hold-bruger
 *     hele holdet. Teksten + tallene følger planen.
 *   • Solo → Hold opsalg: i prøven havde man fuld adgang (også timeregistrering),
 *     så en Solo-bruger mindes om at DEN forsvinder — medmindre man vælger Hold.
 */
export default function PaywallLock({ reason, carpenterProfile, role, leadsData = [], onGoToBilling }) {
    const [busy, setBusy] = useState(false);

    const plan = getPlan(carpenterProfile);                 // 'solo' | 'hold' | 'legacy'
    const isOwner = ['admin', 'boss'].includes(role || carpenterProfile?.role);

    // Brugerens egne tal (kun læsning) — grundlaget for ejerskabs-effekten.
    const casesCount = leadsData.length;
    const customersCount = new Set(leadsData.map(l => l.customer_id).filter(Boolean)).size;
    const timeEntries = leadsData.reduce(
        (n, l) => n + (Array.isArray(l.raw_data?.time_entries) ? l.raw_data.time_entries.length : 0), 0
    );

    const planLabel = plan === 'solo' ? 'Solo' : plan === 'legacy' ? 'dit abonnement' : 'Hold';
    const price = plan === 'solo' ? '390' : '890';

    const loseSolo = ['Lave tilbud & beregne priser', 'Styre dine sager', 'Kundehåndtering', 'Økonomi & faktura', 'Tegneprogram'];
    const loseHold = ['Alt i Solo — tilbud, sager, kunder & faktura', 'Timeregistrering', 'Løn til dit hold', 'Styring af dit hold'];
    const loseList = plan === 'solo' ? loseSolo : loseHold;

    const goUpgradeHold = async () => {
        setBusy(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-checkout', { body: { plan: 'hold' } });
            if (error) throw error;
            if (data?.url) { window.location.href = data.url; return; }
            toast.error('Kunne ikke åbne betalingssiden. Prøv igen.');
        } catch (e) {
            toast.error('Kunne ikke starte opgradering: ' + (e?.message || 'ukendt fejl'));
        } finally {
            setBusy(false);
        }
    };

    // Delte stilarter (matcher app'ens glas-tema + slate-primærknapper).
    const primaryBtn = {
        width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: 'var(--accent)', color: 'var(--text-contrast, #fff)', border: 'none', borderRadius: '12px',
        padding: '13px 18px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
        boxShadow: '0 8px 20px -6px rgba(15,23,42,0.35)', transition: 'transform 0.15s',
    };
    const blueBtn = {
        ...primaryBtn, background: '#2563eb',
        boxShadow: '0 10px 24px -8px rgba(37,99,235,0.55)',
    };
    const hoverUp = (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; };
    const hoverDown = (e) => { e.currentTarget.style.transform = 'translateY(0)'; };

    const chips = [
        { n: casesCount, l: 'sager & tilbud' },
        customersCount > 0 && { n: customersCount, l: 'kunder' },
        timeEntries > 0 && { n: timeEntries, l: 'timeregistreringer' },
    ].filter(Boolean);

    return (
        <div className="smooth-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div style={{
                width: '100%', maxWidth: '480px', textAlign: 'center',
                background: 'var(--bg-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', padding: '32px 30px 30px',
            }}>
                {/* Lås-badge */}
                <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: 'var(--bg-muted)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', margin: '0 auto 16px' }}>
                    <Lock size={26} strokeWidth={1.8} />
                </div>

                {isOwner ? (
                    <>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {reason === 'trial_expired' ? 'Din prøve er slut — adgangen er låst' : 'Din adgang er låst'}
                        </h2>
                        <p style={{ margin: '0 0 16px', fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            Du har ikke længere adgang til Frame. Du får adgang igen med det samme, så snart du fornyer {plan === 'legacy' ? 'dit abonnement' : `din ${planLabel}`}.
                        </p>

                        {/* Deres egne ting (ejerskab) */}
                        {chips.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
                                {chips.map((c, i) => (
                                    <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '7px 12px' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{c.n}</span>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{c.l}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Det man mister adgang til */}
                        <div style={{ textAlign: 'left', background: 'var(--bg-muted)', border: '1px solid var(--border-light)', borderRadius: '13px', padding: '13px 15px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Det du ikke længere har adgang til</div>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {loseList.map((t, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                                        <Lock size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* "Intet slettet"-tryghed */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-done-text)', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.22)', padding: '6px 12px', borderRadius: '999px', marginBottom: '18px' }}>
                            <Check size={15} strokeWidth={2.6} /> Alt du har bygget er gemt og intakt — intet er slettet
                        </span>

                        {/* Handlinger */}
                        {plan === 'solo' ? (
                            <>
                                <div style={{ textAlign: 'left', background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.28)', borderRadius: '15px', padding: '15px 16px', marginBottom: '12px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563eb', marginBottom: '8px' }}>
                                        <Clock size={13} /> Behold også timeregistrering
                                    </div>
                                    <p style={{ margin: '0 0 12px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        {timeEntries > 0
                                            ? <>Du har allerede lavet <b style={{ color: 'var(--text-primary)' }}>{timeEntries} timeregistreringer</b> i din prøve. Timeregistrering følger med <b style={{ color: 'var(--text-primary)' }}>Hold</b> — ikke Solo. Vælg Hold, så beholder du den.</>
                                            : <>Timeregistrering, løn og plads til dit hold følger med <b style={{ color: 'var(--text-primary)' }}>Hold</b> — ikke Solo.</>}
                                    </p>
                                    <button style={blueBtn} onMouseOver={hoverUp} onMouseOut={hoverDown} onClick={goUpgradeHold} disabled={busy}>
                                        {busy ? 'Åbner betaling…' : <>Vælg Hold · 890 kr/md <ArrowRight size={16} /></>}
                                    </button>
                                </div>
                                <button
                                    onClick={onGoToBilling}
                                    style={{ display: 'block', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, padding: '8px 0 0', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                                >
                                    Nej tak — forny bare Solo · 390 kr/md
                                </button>
                            </>
                        ) : (
                            <>
                                <button style={primaryBtn} onMouseOver={hoverUp} onMouseOut={hoverDown} onClick={onGoToBilling}>
                                    Få adgang igen — forny {planLabel}{plan !== 'legacy' ? ` · ${price} kr/md` : ''} <ArrowRight size={16} />
                                </button>
                                <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', margin: '10px 0 0' }}>Alt følger med — også dit holds timer og løn</p>
                            </>
                        )}
                    </>
                ) : (
                    /* Medarbejder: kan ikke betale — vis rolig besked, ingen betalingsknapper. */
                    <>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Firmaets adgang er sat på pause</h2>
                        <p style={{ margin: '0 0 16px', fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            Din mester skal forny firmaets abonnement, før I kan bruge Frame igen. Så snart det sker, er alt tilbage præcis som før.
                        </p>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-done-text)', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.22)', padding: '6px 12px', borderRadius: '999px' }}>
                            <Check size={15} strokeWidth={2.6} /> Alt jeres arbejde er gemt og intakt — intet er slettet
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
