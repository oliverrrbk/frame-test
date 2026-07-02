import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { CreditCard, FileText, CheckCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { computePrice, formatKr } from '../../utils/pricing';
import UpdateCardModal from './UpdateCardModal';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Normalisér firmaets gemte hold til pricing.js-formen { mester, pl, bog, svend, laer }.
// raw_data.team kan være gemt i to former:
//   - fra oprettelse/beregner:  { mester, pl, bog, svend, laer }
//   - fra sync-subscription-seats: { mester, kontor, felt }
// Begge mappes korrekt: kontor -> pl, felt -> svend (mester er altid 1 sæde).
const teamForPricing = (rawTeam = {}) => {
    if ('kontor' in rawTeam || 'felt' in rawTeam) {
        return { mester: 1, pl: Number(rawTeam.kontor) || 0, bog: 0, svend: Number(rawTeam.felt) || 0, laer: 0 };
    }
    return {
        mester: Math.max(1, Number(rawTeam.mester) || 1),
        pl: Number(rawTeam.pl) || 0,
        bog: Number(rawTeam.bog) || 0,
        svend: Number(rawTeam.svend) || 0,
        laer: Number(rawTeam.laer) || 0,
    };
};

// Opsigelses-grunde (churn-feedback). Ét klik — så vi altid får en grund.
const CANCEL_REASONS = [
    { key: 'for_dyrt', label: 'For dyrt' },
    { key: 'bruger_ikke_nok', label: 'Bruger det ikke nok' },
    { key: 'mangler_funktion', label: 'Mangler en funktion' },
    { key: 'for_besvaerligt', label: 'For besværligt at bruge' },
    { key: 'skiftet_system', label: 'Skiftet til andet system' },
    { key: 'andet', label: 'Andet' },
];

const SubscriptionSettings = () => {
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManaging, setIsManaging] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [billing, setBilling] = useState(null);        // { cancelAtPeriodEnd, periodEnd, status }
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [subBusy, setSubBusy] = useState(false);
    const [cancelReason, setCancelReason] = useState(null);
    const [cancelNote, setCancelNote] = useState('');
    const [invoices, setInvoices] = useState([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);

    useEffect(() => {
        loadSubscriptionData();
    }, []);

    // Når man kommer tilbage fra Stripe (?success=true) — ELLER har et betalingskort men
    // stadig står som 'trialing' — så bekræfter vi DIREKTE mod Stripe og henter status igen.
    // Det gør at siden viser "AKTIV" med det samme efter betaling, uden manuelt reload, og
    // uafhængigt af om webhook'en nåede frem.
    useEffect(() => {
        if (!company) return;
        const params = new URLSearchParams(window.location.search);
        const justPaid = params.get('success') === 'true';
        const maybePaid = !!company.payment_customer_id && company.subscription_status === 'trialing';
        if (!justPaid && !maybePaid) return;

        let cancelled = false;
        (async () => {
            setVerifying(true);
            for (let i = 0; i < 4 && !cancelled; i++) {
                try { await supabase.functions.invoke('verify-subscription'); } catch { /* prøv igen */ }
                const fresh = await loadSubscriptionData();
                // Færdig når abonnementet enten trækker (active) ELLER kortet er tilknyttet
                // og vi bevarer prøven (trialing + kunde-id). Sidstnævnte er nu en gyldig,
                // stabil tilstand — man er ikke trukket, men kortet ligger klar.
                const done = fresh?.subscription_status === 'active'
                    || (!!fresh?.payment_customer_id && fresh?.subscription_status === 'trialing');
                if (done) { if (justPaid) setShowWelcome(true); break; }
                await new Promise(r => setTimeout(r, 1500));
            }
            if (!cancelled) setVerifying(false);
            if (justPaid) {
                params.delete('success');
                window.history.replaceState({}, '', window.location.pathname + (params.toString() ? `?${params}` : ''));
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [company?.id]);

    const loadSubscriptionData = async () => {
        setIsLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            // Fetch company/carpenter data to get subscription info
            const { data: carpenterData, error: carpenterError } = await supabase
                .from('carpenters')
                .select('*')
                .eq('id', userData.user.id)
                .single();

            if (carpenterError) throw carpenterError;

            // Hvis brugeren er del af et firma, hentes firmaets (ejerens) abonnement.
            const companyIdToUse = carpenterData.company_id || carpenterData.id;

            const { data: finalCompany, error: finalError } = await supabase
                .from('carpenters')
                .select('*')
                .eq('id', companyIdToUse)
                .single();

            if (finalError) throw finalError;

            if (!finalCompany.subscription_status) finalCompany.subscription_status = 'trialing';

            // Sæt trial-slut til 30 dage fra created_at hvis ikke sat
            if (!finalCompany.trial_ends_at && !finalCompany.subscription_end_date) {
                const created = new Date(finalCompany.created_at);
                created.setDate(created.getDate() + 30);
                finalCompany.trial_ends_at = created.toISOString();
            }

            setCompany(finalCompany);
            return finalCompany;
        } catch (error) {
            console.error('Error fetching subscription:', error);
            toast.error('Kunne ikke hente abonnementsdata');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Starter sæde-baseret Stripe Checkout (tilknyt kort / aktivér abonnement).
    const handleStartCheckout = async () => {
        setIsManaging(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-checkout');
            if (error) throw new Error(error.message || 'Netværksfejl ved kald til Supabase');
            if (data?.error) throw new Error(data.error);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('Ingen URL returneret fra Stripe');
            }
        } catch (error) {
            console.error('Error opening checkout:', error);
            toast.error(`Stripe Fejl: ${error.message}`);
            setIsManaging(false);
        }
    };

    // Åbner Stripe Customer Portal (opdater kort, fakturaer, opsigelse).
    const handleManagePortal = async () => {
        setIsManaging(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-portal');
            if (error) throw new Error(error.message || 'Netværksfejl ved kald til Supabase');
            if (data?.error) throw new Error(data.error);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('Ingen URL returneret fra Stripe Portal');
            }
        } catch (error) {
            console.error('Error opening portal:', error);
            toast.error(`Stripe Fejl: ${error.message}`);
            setIsManaging(false);
        }
    };

    // Aflæs opsigelses-status: brug DB-værdien straks, og frisk fra Stripe ved load,
    // så UI'et er retvisende (også hvis man har opsagt/genaktiveret i Stripe-portalen).
    useEffect(() => {
        if (!company) return;
        if (company.raw_data?.billing) setBilling(company.raw_data.billing);
        if (company.payment_customer_id && company.subscription_status !== 'exempt') {
            (async () => {
                try {
                    const { data } = await supabase.functions.invoke('manage-subscription', { body: { action: 'status' } });
                    if (data?.success && data.hasSubscription) {
                        setBilling({ cancelAtPeriodEnd: data.cancelAtPeriodEnd, periodEnd: data.periodEnd, status: data.status });
                    }
                } catch { /* DB-værdien bruges */ }
            })();
            (async () => {
                setInvoicesLoading(true);
                try {
                    const { data: inv } = await supabase.functions.invoke('get-invoices');
                    if (inv?.success) setInvoices(inv.invoices || []);
                } catch { /* ingen fakturaer vises */ }
                finally { setInvoicesLoading(false); }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [company?.id]);

    const applyBilling = (data) => setBilling({ cancelAtPeriodEnd: data.cancelAtPeriodEnd, periodEnd: data.periodEnd, status: data.status });

    const closeCancel = () => { setConfirmCancel(false); setCancelReason(null); setCancelNote(''); };

    // Send opsigelses-feedback til teamet (best-effort, via den eksisterende mail-rute).
    const sendChurnEmail = async (reasonLabel, note) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const row = (k, v) => `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">${k}</td><td style="padding:6px 0 6px 16px;color:#0f172a;font-size:14px;font-weight:600;">${v}</td></tr>`;
            const html = `
              <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:28px;">
                <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                  <div style="background:#0f172a;padding:18px 24px;color:#fff;font-weight:700;">Opsigelse i Bison Frame</div>
                  <div style="padding:24px;">
                    <p style="margin:0 0 16px;color:#334155;">En kunde har opsagt sit abonnement. Her er deres begrundelse:</p>
                    <table style="width:100%;border-collapse:collapse;">
                      ${row('Firma', company.company_name || '—')}
                      ${row('E-mail', company.email || '—')}
                      ${row('Pris/md', `${formatKr(price.total)} kr`)}
                      ${row('Grund', reasonLabel)}
                    </table>
                    ${note ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#334155;font-size:14px;font-style:italic;">"${note}"</div>` : ''}
                    <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;">Abonnementet kører perioden ud — kunden kan stadig nås for et opkald.</p>
                  </div>
                </div>
              </div>`;
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) },
                body: JSON.stringify({ to: 'team@bisoncompany.dk', subject: `Opsigelse: ${company.company_name || 'Et firma'} (${reasonLabel})`, html }),
            });
        } catch { /* notifikation er best-effort — opsigelsen lykkes uanset */ }
    };

    // Opsig i appen (kører perioden ud — ingen ny opkrævning).
    const handleCancel = async () => {
        setSubBusy(true);
        try {
            const reasonLabel = CANCEL_REASONS.find(r => r.key === cancelReason)?.label || 'Ikke angivet';
            const { data, error } = await supabase.functions.invoke('manage-subscription', { body: { action: 'cancel', reason: reasonLabel, note: cancelNote } });
            if (error || !data?.success) throw new Error(data?.error || error?.message || 'Kunne ikke opsige abonnementet.');
            applyBilling(data);
            await sendChurnEmail(reasonLabel, cancelNote.trim());
            closeCancel();
            toast.success('Abonnementet er opsagt — det kører den betalte periode ud.');
        } catch (e) {
            toast.error(e.message);
        } finally { setSubBusy(false); }
    };

    // Fortryd opsigelsen — abonnementet fornyes som normalt igen.
    const handleReactivate = async () => {
        setSubBusy(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-subscription', { body: { action: 'reactivate' } });
            if (error || !data?.success) throw new Error(data?.error || error?.message || 'Kunne ikke genaktivere abonnementet.');
            applyBilling(data);
            toast.success('Abonnementet er genaktiveret — det fornyes som normalt.');
        } catch (e) {
            toast.error(e.message);
        } finally { setSubBusy(false); }
    };

    const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    // Betalingskort-knap: nyt kort i app (Elements) hvis nøgle findes, ellers Stripe-side.
    const handleCardClick = () => {
        if (!hasCard) return handleStartCheckout();      // intet abonnement endnu → opret
        if (STRIPE_PK) return setShowCardModal(true);    // in-app kort-boks
        return handleManagePortal();                     // fallback til Stripe-portal
    };

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Indlæser firmaaftale...</div>;
    if (!company) return null;

    // Beregn dage tilbage af trial
    let daysLeft = 0;
    if (company.subscription_status === 'trialing' && company.trial_ends_at) {
        const end = new Date(company.trial_ends_at);
        const now = new Date();
        const diffTime = end - now;
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Din månedlige pris — udregnet fra firmaets faktiske hold (samme facit som prissiden).
    const price = computePrice(teamForPricing(company.raw_data?.team));
    const hasCard = !!company.payment_customer_id;
    const isCanceling = company.subscription_status === 'active' && !!billing?.cancelAtPeriodEnd;
    // Kort tilknyttet MEN stadig i prøve = intet trukket endnu, første træk falder på trial_ends_at.
    const cardOnTrial = company.subscription_status === 'trialing' && hasCard;
    const trialEndFmt = company.trial_ends_at
        ? new Date(company.trial_ends_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    return (
        <div className="space-y-6 animate-fadeIn" style={{ maxWidth: '600px', margin: '0 auto' }}>

            {/* Fuld-skærms loader: enten på vej til Stripe, eller mens vi bekræfter betalingen. */}
            {(isManaging || verifying) && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <Loader2 size={48} color="#fff" className="spin" />
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>
                        {verifying ? 'Aktiverer dit abonnement…' : 'Sender dig til sikker betaling…'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                        {verifying ? 'Vi bekræfter din betaling — et øjeblik.' : 'Et øjeblik — du føres videre til Stripe.'}
                    </div>
                </div>,
                document.body
            )}

            {/* Velkomst-bekræftelse efter betaling — rolig, ingen pop-up. */}
            {showWelcome && (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 8px 24px rgba(16,185,129,0.10)', padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <CheckCircle size={20} color="#10b981" />
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{cardOnTrial ? 'Dit kort er tilknyttet' : 'Tak fordi I valgte Bison Frame'}</span>
                    </div>
                    <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {cardOnTrial ? (
                            <>Du beholder hele din gratis prøveperiode — vi trækker <strong>først</strong> betaling d. {trialEndFmt}. Du har fuld adgang til hele systemet indtil da. Spørgsmål? Ring til os på <a href="tel:+4540265002" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>40 26 50 02</a>.</>
                        ) : (
                            <>Jeres abonnement er aktivt, og I har fuld adgang til hele systemet. Har I brug for hjælp, så ring til os på <a href="tel:+4540265002" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>40 26 50 02</a> — vi sidder klar.</>
                        )}
                    </p>
                    <button
                        onClick={() => { try { localStorage.setItem('dashboard_active_tab', 'overview'); } catch { /* ignore */ } window.location.assign('/dashboard'); }}
                        style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}
                    >
                        Gå til dit dashboard →
                    </button>
                    <button
                        onClick={() => setShowWelcome(false)}
                        style={{ background: 'transparent', color: '#64748b', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginLeft: '12px' }}
                    >
                        Bliv her
                    </button>
                </div>
            )}

            {/* Trial Banner */}
            {company.subscription_status === 'trialing' && daysLeft > 0 && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        <Calendar size={18} color="#10b981" />
                        Prøveperiode: {daysLeft} dage tilbage
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: '1.4' }}>Jeres firma har fuld adgang til hele platformen. Tilknyt et firmakort for at undgå afbrydelser i driften, når prøveperioden udløber.</p>
                    <button
                        onClick={handleStartCheckout}
                        disabled={isManaging}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', fontWeight: '600', border: 'none', cursor: isManaging ? 'not-allowed' : 'pointer' }}
                    >
                        {isManaging ? 'Vent venligst...' : 'Tilknyt Firmakort'}
                    </button>
                    <p style={{ color: '#10b981', margin: '10px 0 0 0', fontSize: '0.8rem', lineHeight: '1.4', fontWeight: 600, textAlign: 'center' }}>
                        ✓ Du beholder dine fulde {daysLeft} dage — {trialEndFmt ? `vi trækker først d. ${trialEndFmt}` : 'vi trækker først, når prøveperioden udløber'}.
                    </p>
                </div>
            )}

            {company.subscription_status === 'trialing' && daysLeft <= 0 && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        <AlertTriangle size={18} />
                        Prøveperiode udløbet
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: '1.4' }}>Jeres prøveperiode er udløbet. Tilknyt et betalingskort for fortsat at bruge platformen.</p>
                    <button
                        onClick={handleStartCheckout}
                        disabled={isManaging}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: isManaging ? 'not-allowed' : 'pointer' }}
                    >
                        {isManaging ? 'Vent venligst...' : 'Aktiver Abonnement'}
                    </button>
                </div>
            )}

            {/* Betaling fejlede (past_due) — bed dem opdatere kort */}
            {company.subscription_status === 'past_due' && (
                <div style={{ background: '#fff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        <AlertTriangle size={18} /> Betalingen kunne ikke gennemføres
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: '1.5' }}>Vi kunne ikke trække den seneste betaling. Opdater jeres betalingskort, så genoptages adgangen automatisk — der prøves igen af sig selv.</p>
                    <button onClick={handleManagePortal} disabled={isManaging}
                        style={{ width: '100%', padding: '11px', borderRadius: '10px', background: '#ef4444', color: 'white', fontWeight: 700, border: 'none', cursor: isManaging ? 'not-allowed' : 'pointer' }}>
                        {isManaging ? 'Vent venligst...' : 'Opdater betalingskort'}
                    </button>
                </div>
            )}

            {/* Opsagt/udløbet — tilbyd at starte igen */}
            {company.subscription_status === 'canceled' && (
                <div style={{ background: '#fff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        <AlertTriangle size={18} /> Abonnementet er udløbet
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: '1.5' }}>Jeres adgang er sat på pause. Start abonnementet igen, så er I i gang med det samme — alle jeres data er bevaret.</p>
                    <button onClick={handleStartCheckout} disabled={isManaging}
                        style={{ width: '100%', padding: '11px', borderRadius: '10px', background: '#0f172a', color: 'white', fontWeight: 700, border: 'none', cursor: isManaging ? 'not-allowed' : 'pointer' }}>
                        {isManaging ? 'Vent venligst...' : 'Start abonnement igen'}
                    </button>
                </div>
            )}

            {/* ABONNEMENT */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>

                {/* Din månedlige pris */}
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Din månedlige pris</span>
                        {company.subscription_status === 'active' && isCanceling ? (
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={12} /> OPSAGT
                            </div>
                        ) : company.subscription_status === 'active' ? (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={12} /> AKTIV
                            </div>
                        ) : company.subscription_status === 'canceled' ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                                UDLØBET
                            </div>
                        ) : company.subscription_status === 'past_due' ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={12} /> BETALING FEJLEDE
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                                PRØVEPERIODE
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '2.4rem', lineHeight: 1, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatKr(price.total)}</span>
                        <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>kr / md · eks. moms</span>
                    </div>
                    <div style={{ color: isCanceling ? '#b45309' : '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                        {price.heads} bruger{price.heads > 1 ? 'e' : ''} · {isCanceling ? `aktiv til ${fmtDate(billing?.periodEnd)} — fornyes ikke` : 'fornyes automatisk hver måned'}
                    </div>

                    {/* Opdeling pr. rolle */}
                    <div style={{ marginTop: '14px', background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {price.lines.map((l) => (
                            <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
                                <span>{l.label} ({l.count})</span>
                                <b style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatKr(l.amount)} kr</b>
                            </div>
                        ))}
                    </div>

                    {price.isEnterprise && (
                        <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#64748b', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}>
                            Over 40 brugere? Så laver vi en fast entreprisepris til jer — <a href="mailto:kontakt@bisonframe.dk" style={{ color: '#2563eb', fontWeight: 700 }}>kontakt os</a>.
                        </div>
                    )}
                </div>

                {/* Betalingsmetode */}
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <CreditCard size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Betalingskort</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{hasCard ? 'Aktivt betalingskort' : 'Intet kort tilknyttet'}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleCardClick}
                        disabled={isManaging}
                        style={{ background: 'transparent', color: '#3b82f6', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: isManaging ? 'not-allowed' : 'pointer', padding: 0 }}
                    >
                        {hasCard ? 'Opdater' : 'Tilføj'}
                    </button>
                </div>

                {/* Opsigelse / genaktivering */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={20} color={isCanceling ? '#10b981' : '#ef4444'} style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>{isCanceling ? 'Abonnement opsagt' : 'Opsig abonnement'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {isCanceling ? `Aktiv til ${fmtDate(billing?.periodEnd)} · fornyes ikke` : 'Løber til udgangen af betalt periode'}
                            </div>
                        </div>
                    </div>
                    {isCanceling ? (
                        <button
                            onClick={handleReactivate}
                            disabled={subBusy}
                            style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: '700', fontSize: '0.88rem', cursor: subBusy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {subBusy ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />} Aktivér igen
                        </button>
                    ) : (
                        <button
                            onClick={() => setConfirmCancel(true)}
                            disabled={isManaging || subBusy || !hasCard}
                            style={{ background: 'transparent', color: '#ef4444', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: isManaging || !hasCard ? 'not-allowed' : 'pointer', padding: 0, opacity: !hasCard ? 0.5 : 1 }}
                        >
                            Opsig
                        </button>
                    )}
                </div>
            </div>

            {/* Faktura-arkiv — vises direkte i Frame */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: invoices.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <FileText size={20} color="#94a3b8" style={{ flexShrink: 0 }}/>
                    <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a' }}>Faktura-arkiv</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Bogførings-PDF'er — alle jeres kvitteringer</div>
                    </div>
                </div>

                {invoicesLoading ? (
                    <div style={{ padding: '28px', display: 'flex', justifyContent: 'center', color: '#94a3b8' }}>
                        <Loader2 size={22} className="spin" />
                    </div>
                ) : invoices.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                        {hasCard ? 'Ingen fakturaer endnu — de dukker op her efter første betaling.' : 'Fakturaer vises her, når I har et aktivt abonnement.'}
                    </div>
                ) : (
                    <div>
                        {invoices.map((inv) => {
                            const st = inv.status === 'paid'
                                ? { t: 'Betalt', bg: 'rgba(16,185,129,0.1)', c: '#047857' }
                                : inv.status === 'open'
                                    ? { t: 'Åben', bg: 'rgba(245,158,11,0.12)', c: '#b45309' }
                                    : { t: inv.status, bg: 'rgba(100,116,139,0.1)', c: '#64748b' };
                            return (
                                <div key={inv.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f6f8fa' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
                                            {inv.created ? new Date(inv.created).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }) : (inv.number || 'Faktura')}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                            <span style={{ background: st.bg, color: st.c, padding: '1px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem' }}>{st.t}</span>
                                            {inv.total != null && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inv.total.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currency} · inkl. moms</span>}
                                        </div>
                                    </div>
                                    {inv.pdf && (
                                        <a href={inv.pdf} target="_blank" rel="noopener noreferrer"
                                            style={{ flexShrink: 0, background: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '9px', padding: '8px 13px', fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <FileText size={14} /> Hent PDF
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                Kort og fakturaer håndteres sikkert via Stripe.
            </div>

            {showCardModal && (
                <UpdateCardModal
                    defaultName={company.owner_name || company.company_name}
                    defaultEmail={company.email}
                    trialNote={cardOnTrial && trialEndFmt ? `Du er stadig i din gratis prøveperiode — der trækkes først betaling d. ${trialEndFmt}.` : ''}
                    onClose={() => setShowCardModal(false)}
                    onSuccess={() => { setShowCardModal(false); loadSubscriptionData(); }}
                />
            )}

            {/* Opsigelse + churn-feedback — lækker, interaktiv Bison-popup */}
            {confirmCancel && createPortal(
                <div onClick={() => !subBusy && closeCancel()}
                    style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '470px', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: '24px', boxShadow: '0 30px 60px -15px rgba(15,23,42,0.4)' }}>
                        <div style={{ padding: '32px 30px 28px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '62px', height: '62px', borderRadius: '18px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 12px 24px -6px rgba(245,158,11,0.5)' }}>
                                    <AlertTriangle size={30} />
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>Før I opsiger</h3>
                                <p style={{ margin: '0 0 22px', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.55 }}>
                                    I beholder fuld adgang frem til <strong style={{ color: '#334155' }}>{fmtDate(billing?.periodEnd) || 'udgangen af perioden'}</strong>. Der trækkes ikke mere, og I kan altid <strong style={{ color: '#334155' }}>aktivere igen</strong> inden da.
                                </p>
                            </div>

                            <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>
                                Hvorfor opsiger I?
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                {CANCEL_REASONS.map((r) => {
                                    const sel = cancelReason === r.key;
                                    return (
                                        <button key={r.key} type="button" onClick={() => setCancelReason(r.key)}
                                            style={{
                                                padding: '9px 14px', borderRadius: '11px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer',
                                                border: sel ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                                background: sel ? '#0f172a' : '#fff',
                                                color: sel ? '#fff' : '#475569',
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => { if (!sel) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                            onMouseLeave={(e) => { if (!sel) e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                            {r.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ position: 'relative', marginBottom: '22px' }}>
                                <textarea
                                    value={cancelNote}
                                    onChange={(e) => setCancelNote(e.target.value.slice(0, 300))}
                                    placeholder="Vil I uddybe? (valgfrit) — det hjælper os med at blive bedre."
                                    rows={3}
                                    style={{ width: '100%', resize: 'none', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                                <span style={{ position: 'absolute', right: '12px', bottom: '8px', fontSize: '0.72rem', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{cancelNote.length}/300</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={closeCancel} disabled={subBusy}
                                    style={{ flex: 1, padding: '13px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                                    Behold abonnement
                                </button>
                                <button onClick={handleCancel} disabled={subBusy || !cancelReason}
                                    title={!cancelReason ? 'Vælg en grund først' : undefined}
                                    style={{ flex: 1, padding: '13px', borderRadius: '14px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: (subBusy || !cancelReason) ? 'not-allowed' : 'pointer', opacity: (!cancelReason) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {subBusy ? <Loader2 size={17} className="spin" /> : null} Ja, opsig
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default SubscriptionSettings;
