import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../supabaseClient';
import { Loader2, CreditCard, X } from 'lucide-react';
import toast from 'react-hot-toast';

// Publishable key (offentlig) — sættes i Vercel som VITE_STRIPE_PUBLISHABLE_KEY.
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

const CARD_OPTIONS = {
    hidePostalCode: true, // rent felt — ingen postnummer/Link/e-mail
    style: {
        base: {
            fontSize: '16px',
            color: '#0f172a',
            fontFamily: '-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444' },
    },
};

function CardForm({ clientSecret, onClose, onSuccess, defaultName, defaultEmail }) {
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true); setErr('');
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement),
                billing_details: { name: defaultName || undefined, email: defaultEmail || undefined },
            },
        });
        if (error) { setErr(error.message || 'Kortet kunne ikke gemmes.'); setBusy(false); return; }
        try {
            const pmId = typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent.payment_method?.id;
            const { data, error: e2 } = await supabase.functions.invoke('manage-payment-method', {
                body: { action: 'set-default', paymentMethodId: pmId },
            });
            if (e2 || !data?.success) throw new Error(data?.error || e2?.message || 'Kunne ikke sætte kortet som standard.');
            toast.success('Betalingskortet er opdateret.');
            onSuccess?.();
        } catch (e3) {
            setErr(e3.message);
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <div style={{ padding: '15px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
                <CardElement options={CARD_OPTIONS} onReady={() => setReady(true)} />
            </div>
            {err && (
                <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: '0.85rem' }}>{err}</div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
                <button type="button" onClick={onClose} disabled={busy}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                    Annullér
                </button>
                <button type="submit" disabled={busy || !stripe || !ready}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, cursor: (busy || !ready) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (!stripe || !ready) ? 0.6 : 1 }}>
                    {busy ? <Loader2 size={17} className="spin" /> : <CreditCard size={17} />} Gem kort
                </button>
            </div>
        </form>
    );
}

export default function UpdateCardModal({ onClose, onSuccess, defaultName, defaultEmail }) {
    const [clientSecret, setClientSecret] = useState(null);
    const [loadErr, setLoadErr] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase.functions.invoke('manage-payment-method', { body: { action: 'setup' } });
                if (error || !data?.success) throw new Error(data?.error || error?.message || 'Kunne ikke starte kort-opdatering.');
                if (!cancelled) setClientSecret(data.clientSecret);
            } catch (e) {
                if (!cancelled) setLoadErr(e.message);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return createPortal(
        <div onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 100003, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', boxShadow: '0 30px 60px -15px rgba(15,23,42,0.4)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #1a1a1a, #0f172a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={22} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Opdater betalingskort</h3>
                    </div>
                    <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '28px' }}>
                    {loadErr ? (
                        <div style={{ textAlign: 'center', color: '#b91c1c' }}>
                            <p style={{ margin: '0 0 16px', fontSize: '0.9rem' }}>{loadErr}</p>
                            <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Luk</button>
                        </div>
                    ) : !clientSecret || !stripePromise ? (
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', color: '#94a3b8' }}>
                            <Loader2 size={26} className="spin" />
                        </div>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>Indtast jeres nye kort herunder. Det bliver brugt til jeres næste fornyelse.</p>
                            <Elements stripe={stripePromise} options={{ appearance: { theme: 'stripe' } }}>
                                <CardForm clientSecret={clientSecret} onClose={onClose} onSuccess={onSuccess} defaultName={defaultName} defaultEmail={defaultEmail} />
                            </Elements>
                            <p style={{ margin: '16px 0 0', textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem' }}>Kortet håndteres sikkert af Stripe — vi gemmer aldrig dine kortoplysninger.</p>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
