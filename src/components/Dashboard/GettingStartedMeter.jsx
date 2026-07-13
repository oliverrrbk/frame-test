import React, { useState } from 'react';
import { Check, ArrowRight, X, Rocket } from 'lucide-react';

/**
 * GettingStartedMeter — "Kom godt i gang"-kort øverst på oversigten.
 *
 * Psykologi (goal-gradient): måleren starter ALDRIG på 0 — "Konto oprettet" er
 * allerede hakket af, så man møder 20% og fremdrift, ikke en tom liste. Fremdrift
 * motiverer til at gøre resten færdigt.
 *
 * Rent visnings-lag: læser kun eksisterende data (logo_url + leads-status). Ændrer
 * intet, gemmer intet nyt (udover et "skjul"-flag i localStorage). Vises kun for
 * ejeren/admin, kun efter onboarding er gennemført, og forsvinder helt ved 100%
 * eller hvis man lukker den. Aldrig i vejen — man kan altid lukke den.
 */
export default function GettingStartedMeter({ carpenterProfile, leadsData = [], setActiveTab, onCreateQuote, goToTab }) {
    const role = carpenterProfile?.role;
    const dismissKey = `bison_getting_started_dismissed_${carpenterProfile?.id || 'x'}`;
    const [dismissed, setDismissed] = useState(() => {
        try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; }
    });

    // Kun ejeren/admin, og først når første-gangs-onboarding er ovre (så vi ikke
    // konkurrerer med OnboardingModal). Medarbejdere ser den aldrig.
    if (!carpenterProfile || !['admin', 'boss'].includes(role)) return null;
    if (!carpenterProfile.has_completed_onboarding) return null;
    if (dismissed) return null;

    const hasSent = leadsData.some(l =>
        ['Sendt tilbud', 'Bekræftet opgave', 'Historik'].includes(l.status || '') &&
        (l.raw_data?.quote_sent_at || l.raw_data?.actual_quote_price || l.raw_data?.quote_pdf_url)
    );
    const hasWon = leadsData.some(l => ['Bekræftet opgave', 'Historik'].includes(l.status || ''));

    const goCreate = () => { if (onCreateQuote) onCreateQuote(); else if (setActiveTab) setActiveTab('leads'); };
    const goCases = () => { if (goToTab) goToTab('cases'); else if (setActiveTab) setActiveTab('cases'); };

    const steps = [
        { key: 'account', label: 'Konto oprettet', done: true },
        { key: 'logo', label: 'Tilføj dit logo', done: !!carpenterProfile.logo_url, cta: 'Tilføj', onClick: () => setActiveTab && setActiveTab('account_settings') },
        { key: 'first', label: 'Lav dit første tilbud', done: leadsData.length > 0, cta: 'Lav tilbud', onClick: goCreate },
        { key: 'sent', label: 'Send et tilbud til en kunde', done: hasSent, cta: 'Lav tilbud', onClick: goCreate },
        { key: 'won', label: 'Få dit første tilbud bekræftet', done: hasWon, cta: 'Se sager', onClick: goCases },
    ];
    const doneCount = steps.filter(s => s.done).length;
    const pct = Math.round((doneCount / steps.length) * 100);
    if (pct >= 100) return null; // Alt gjort → forsvind af sig selv.

    const dismiss = () => {
        try { localStorage.setItem(dismissKey, '1'); } catch { /* ignore */ }
        setDismissed(true);
    };

    return (
        <div style={{
            position: 'relative',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            padding: '24px 26px',
            overflow: 'hidden',
        }}>
            {/* Luk */}
            <button
                onClick={dismiss}
                aria-label="Skjul Kom godt i gang"
                style={{ position: 'absolute', top: '14px', right: '14px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
                <X size={17} />
            </button>

            {/* Top: titel + procent */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', paddingRight: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(0,122,255,0.10)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Rocket size={20} />
                    </span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Kom godt i gang</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Du er allerede i gang — færdiggør opsætningen, så spiller Frame til din forretning.</p>
                    </div>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, flexShrink: 0 }}>{pct}%</span>
            </div>

            {/* Fremdriftsbjælke */}
            <div style={{ height: '10px', background: 'var(--bg-muted)', border: '1px solid var(--border-light)', borderRadius: '999px', overflow: 'hidden', margin: '16px 0 18px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #007aff, #3b82f6)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.25,1,0.5,1)' }} />
            </div>

            {/* Trin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map(s => (
                    <div key={s.key} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '11px 13px', borderRadius: '13px',
                        border: '1px solid ' + (s.done ? 'rgba(5,150,105,0.22)' : 'var(--border-light)'),
                        background: s.done ? 'rgba(5,150,105,0.06)' : 'transparent',
                    }}>
                        <span style={{
                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: s.done ? '#059669' : 'transparent',
                            border: s.done ? 'none' : '2px dashed var(--text-tertiary)',
                            color: '#fff',
                        }}>
                            {s.done && <Check size={14} strokeWidth={3} />}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.92rem', fontWeight: 600, color: s.done ? 'var(--status-done-text)' : 'var(--text-primary)' }}>{s.label}</span>
                        {!s.done && s.cta && (
                            <button
                                onClick={s.onClick}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', transition: 'gap 0.15s, background 0.15s' }}
                                onMouseOver={(e) => { e.currentTarget.style.gap = '8px'; e.currentTarget.style.background = 'rgba(0,122,255,0.08)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.gap = '5px'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                {s.cta} <ArrowRight size={13} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
