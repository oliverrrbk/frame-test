import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { CreditCard, FileText, CheckCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { computePrice, formatKr } from '../../utils/pricing';

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

const SubscriptionSettings = () => {
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManaging, setIsManaging] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

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
                if (fresh?.subscription_status === 'active') { if (justPaid) setShowWelcome(true); break; }
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
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Tak fordi I valgte Bison Frame</span>
                    </div>
                    <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        Jeres abonnement er aktivt, og I har fuld adgang til hele systemet. Har I brug for hjælp, så ring til os på <a href="tel:+4540265002" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>40 26 50 02</a> — vi sidder klar.
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

            {/* ABONNEMENT */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>

                {/* Din månedlige pris */}
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Din månedlige pris</span>
                        {company.subscription_status === 'active' ? (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={12} /> AKTIV
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
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                        {price.heads} bruger{price.heads > 1 ? 'e' : ''} · fornyes automatisk hver måned
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
                        onClick={hasCard ? handleManagePortal : handleStartCheckout}
                        disabled={isManaging}
                        style={{ background: 'transparent', color: '#3b82f6', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: isManaging ? 'not-allowed' : 'pointer', padding: 0 }}
                    >
                        {hasCard ? 'Opdater' : 'Tilføj'}
                    </button>
                </div>

                {/* Opsigelse */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={20} color="#ef4444" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Opsig abonnement</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Løber til udgangen af betalt periode</div>
                        </div>
                    </div>
                    <button
                        onClick={handleManagePortal}
                        disabled={isManaging || !hasCard}
                        style={{ background: 'transparent', color: '#ef4444', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: isManaging || !hasCard ? 'not-allowed' : 'pointer', padding: 0, opacity: !hasCard ? 0.5 : 1 }}
                    >
                        Opsig
                    </button>
                </div>
            </div>

            {/* Fakturaer */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FileText size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Faktura-arkiv</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Bogførings-PDF'er — alle dine kvitteringer</div>
                        </div>
                    </div>
                    <button
                        onClick={handleManagePortal}
                        disabled={isManaging || !hasCard}
                        style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: '600', cursor: isManaging || !hasCard ? 'not-allowed' : 'pointer', opacity: !hasCard ? 0.5 : 1 }}
                    >
                        Åbn
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                Kort og fakturaer håndteres sikkert via Stripe.
            </div>

        </div>
    );
};

export default SubscriptionSettings;
