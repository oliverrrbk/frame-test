import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { isTrialActive, getPlan } from '../../utils/features';

/**
 * TimesheetTrialBanner — rolig, permanent linje øverst i Timeregistrering/Løn,
 * KUN mens man er på prøve og planen ellers er Solo. Fortæller at man har fuld
 * adgang i prøven, at det bliver en Hold-funktion bagefter, og at alt gemmes.
 * Knappen fører til opgradering (Solo → Hold), hvor der først trækkes ved
 * prøvens udløb — og man skal have et betalingskort.
 */
export default function TimesheetTrialBanner({ carpenterProfile }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!carpenterProfile) return null;
    // Vis kun når prøven er aktiv OG planen ellers ville være Solo (dvs. man
    // mister timeregistrering ved prøve-slut). Hold/legacy/exempt ser intet.
    if (!isTrialActive(carpenterProfile) || getPlan(carpenterProfile) !== 'solo') return null;

    const trialEnds = carpenterProfile.trial_ends_at ? new Date(carpenterProfile.trial_ends_at) : null;
    const trialEndLabel = trialEnds
        ? trialEnds.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'prøvens udløb';

    const goUpgrade = async () => {
        setBusy(true);
        try {
            // Ønsket plan sendes med til checkout — kort + Hold-abonnement, der
            // først trækkes ved prøvens udløb. (Vi persister IKKE Hold før betaling.)
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

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '15px 18px', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: '260px', fontSize: '0.9rem', color: '#475569', lineHeight: 1.55 }}>
                    <strong style={{ color: '#0f172a' }}>Du er på prøve, så du har fuld adgang.</strong> Dit nuværende abonnement er Solo — her kan du registrere og se dit holds timer. Når prøven slutter, bliver timeregistrering en Hold-funktion. Alt du taster ind bliver gemt, så det er der stadig, når du opgraderer.
                </div>
                <button
                    onClick={() => setOpen(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 18px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0, transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 8px 20px -6px rgba(15,23,42,0.35)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    Opgradér til Hold <ArrowRight size={16} />
                </button>
            </div>

            {createPortal(
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}
                            style={{ position: 'fixed', inset: 0, zIndex: 2147483200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                        >
                            <motion.div
                                initial={{ y: 16, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                                style={{ width: 'min(480px, 100%)', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 40px 100px -20px rgba(15,23,42,0.5)', overflow: 'hidden' }}
                            >
                                <div style={{ padding: '28px 28px 20px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>Opgradér abonnement</div>
                                    <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Fra Solo til Hold</h2>
                                    <p style={{ margin: 0, fontSize: '0.98rem', color: '#475569', lineHeight: 1.6 }}>
                                        Hold koster <strong style={{ color: '#0f172a' }}>890 kr./md</strong> — 3 brugere inkl. (mester + 2), med timeregistrering og løn.
                                    </p>
                                    <div style={{ marginTop: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', fontSize: '0.9rem', color: '#475569', lineHeight: 1.55 }}>
                                        Du bliver <strong style={{ color: '#0f172a' }}>først trukket ved prøvens udløb ({trialEndLabel})</strong>, og abonnementet løber fra den dato. Du skal bruge et betalingskort. Alle timer, du allerede har tastet, følger med.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 28px', borderTop: '1px solid #f1f5f9', background: 'linear-gradient(0deg, #f8fafc, #fff)' }}>
                                    <button onClick={() => !busy && setOpen(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', padding: '12px 18px', fontWeight: 700, fontSize: '0.92rem', cursor: busy ? 'default' : 'pointer' }}>Annullér</button>
                                    <button onClick={goUpgrade} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 20px', fontWeight: 700, fontSize: '0.92rem', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 8px 20px -6px rgba(15,23,42,0.35)' }}>
                                        {busy ? 'Åbner betaling…' : 'Fortsæt til betaling'} {!busy && <ArrowRight size={16} />}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
