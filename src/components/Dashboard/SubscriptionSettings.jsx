import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { CreditCard, FileText, CheckCircle, AlertTriangle, Building, Shield, ExternalLink, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const SubscriptionSettings = () => {
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManaging, setIsManaging] = useState(false);
    const [showPricingWall, setShowPricingWall] = useState(false);
    useEffect(() => {
        loadSubscriptionData();
    }, []);

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
            
            // If they are part of a company, we should ideally fetch the parent company's subscription.
            // For now, we assume the logged in user is the owner or we just show their record.
            const companyIdToUse = carpenterData.company_id || carpenterData.id;
            
            const { data: finalCompany, error: finalError } = await supabase
                .from('carpenters')
                .select('*')
                .eq('id', companyIdToUse)
                .single();

            if (finalError) throw finalError;

            // Mock some default values if they are empty since we just added the columns
            if (!finalCompany.subscription_status) finalCompany.subscription_status = 'trialing';
            if (!finalCompany.tier) finalCompany.tier = 'standard';
            
            // Set trial end date to 14 days from created_at if not set
            if (!finalCompany.trial_ends_at && !finalCompany.subscription_end_date) {
                const created = new Date(finalCompany.created_at);
                created.setDate(created.getDate() + 14);
                finalCompany.trial_ends_at = created.toISOString();
            }

            setCompany(finalCompany);
        } catch (error) {
            console.error('Error fetching subscription:', error);
            toast.error('Kunne ikke hente abonnementsdata');
        } finally {
            setIsLoading(false);
        }
    };

    const handleManageSubscription = async (targetTier = null) => {
        setIsManaging(true);
        try {
            const body = targetTier ? JSON.stringify({ targetTier }) : undefined;
            const { data, error } = await supabase.functions.invoke('create-stripe-checkout', { body });
            
            if (error) {
                throw new Error(error.message || "Netværksfejl ved kald til Supabase");
            }
            
            if (data?.error) {
                throw new Error(data.error);
            }
            
            if (data?.url) {
                // Sender kunden videre til Stripe Checkout Flow
                window.location.href = data.url;
            } else {
                throw new Error("Ingen URL returneret fra Stripe");
            }
        } catch (error) {
            console.error('Error opening checkout:', error);
            toast.error(`Stripe Fejl: ${error.message}`);
            setIsManaging(false);
        }
    };

    const handleManagePortal = async () => {
        setIsManaging(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-portal');
            
            if (error) {
                throw new Error(error.message || "Netværksfejl ved kald til Supabase");
            }
            
            if (data?.error) {
                throw new Error(data.error);
            }
            
            if (data?.url) {
                // Sender kunden videre til Stripe Customer Portal
                window.location.href = data.url;
            } else {
                throw new Error("Ingen URL returneret fra Stripe Portal");
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

    const tiers = {
        basis: { name: 'Basis', price: '390', features: ['Grundlæggende funktioner', 'Standard support'] },
        standard: { name: 'Professionel', price: '790', features: ['Alt i Basis', 'AI-Kalkulationer', 'Udvidet support', 'Fuld adgang'] },
        enterprise: { name: 'Enterprise', price: '1.890', features: ['Alt i Professionel', 'Dedikeret Account Manager', 'Custom integrationer'] }
    };

    const currentTier = tiers[company.tier] || tiers.standard;

    return (
        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>


            {/* Trial Banner */}
            {company.subscription_status === 'trialing' && daysLeft > 0 && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            <Calendar size={18} color="var(--accent-primary)" />
                            Prøveperiode: {daysLeft} dage tilbage
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Jeres firma har fuld adgang til <strong>{currentTier.name}-pakken</strong>. Tilknyt et firmakort for at undgå afbrydelser i driften.</p>
                    </div>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowPricingWall(true)}
                        disabled={isManaging}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        Tilknyt Firmakort
                    </button>
                </div>
            )}

            {company.subscription_status === 'trialing' && daysLeft <= 0 && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #ef4444' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            <AlertTriangle size={18} />
                            Prøveperiode udløbet
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Jeres prøveperiode er udløbet. Tilknyt et betalingskort for fortsat at bruge platformen.</p>
                    </div>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowPricingWall(true)}
                        style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                    >
                        Aktiver Abonnement
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Nuværende Plan */}
                <div className="settings-card flex flex-col">
                    <div className="card-body flex-1 flex flex-col">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: '600' }}>Nuværende Plan</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentTier.name}</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>{currentTier.price} kr. / md. (ex. moms)</div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={14} /> Aktiv
                            </div>
                        </div>
                        
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                            {currentTier.features.map((feat, idx) => (
                                <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCircle size={16} color="var(--accent-primary)" /> {feat}
                                </li>
                            ))}
                        </ul>

                        <button 
                            className="btn-secondary"
                            onClick={() => company.subscription_status === 'active' ? handleManagePortal() : setShowPricingWall(true)}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            Skift Plan
                        </button>
                    </div>
                </div>

                {/* Betalingsmetode & Opsigelse */}
                <div className="space-y-8">
                    <div className="settings-card">
                        <div className="card-header">
                            <div className="icon-wrapper">
                                <CreditCard size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem' }}>Betalingsmetode</h3>
                        </div>
                        <div className="card-body">
                            {company.subscription_status === 'trialing' ? (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    Der er endnu ikke tilknyttet et firmakort. Betaling trækkes først, når prøveperioden udløber.
                                </div>
                            ) : (
                                <div className="glass-panel flex items-center justify-between" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'white', color: '#1a1a1a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>VISA</div>
                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '500' }}>•••• 4242</span>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Udløber 12/26</span>
                                </div>
                            )}
                            <button 
                                className="btn-secondary"
                                onClick={company.payment_customer_id ? handleManagePortal : handleManageSubscription}
                                disabled={isManaging}
                                style={{ display: 'flex', width: '100%', marginTop: '24px', justifyContent: 'center' }}
                            >
                                {company.payment_customer_id ? 'Åbn Kundeportal' : 'Opdater betalingsoplysninger'}
                            </button>
                        </div>
                    </div>

                    <div className="settings-card">
                        <div className="card-body">
                            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.1rem' }}>Opsig Firmaaftale</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                                Når du opsiger, vil platformen forblive aktiv perioden ud. Vi binder jer ikke til noget, I ikke bruger.
                            </p>
                            <button 
                                onClick={handleManagePortal}
                                disabled={isManaging || !company.payment_customer_id}
                                style={{ 
                                    background: 'transparent', 
                                    color: '#ef4444', 
                                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    fontWeight: '600', 
                                    cursor: isManaging || !company.payment_customer_id ? 'not-allowed' : 'pointer', 
                                    fontSize: '0.9rem', 
                                    transition: 'all 0.2s', 
                                    opacity: !company.payment_customer_id ? 0.5 : 1 
                                }}
                                className={company.payment_customer_id ? "hover:bg-red-50 dark:hover:bg-red-900/10" : ""}
                            >
                                Opsig abonnement
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fakturering (Bogholderi) */}
            <div className="settings-card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'none', paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="icon-wrapper">
                            <FileText size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Fakturaer til Bogholderiet</h3>
                    </div>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                        <Shield size={14} /> Sikker B2B Fakturering
                    </div>
                </div>
                <div className="card-body">
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                        Her vil du kunne downloade alle firmaets månedlige fakturaer som PDF med udspecificeret moms, når abonnementet er aktivt.
                    </p>

                    {company.payment_customer_id ? (
                        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                Alle fakturaer gemmes automatisk i din kundekonto.
                            </div>
                            <button 
                                className="btn-secondary"
                                onClick={handleManagePortal}
                                disabled={isManaging}
                            >
                                Åbn Faktura-arkiv
                            </button>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface-bg)', border: '1px dashed var(--border-light)', borderRadius: '12px', padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Ingen betalte fakturaer endnu.
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing Wall Modal */}
            {showPricingWall && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
                    <div className="glass-panel" style={{ padding: '40px', maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button 
                            onClick={() => setShowPricingWall(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ color: 'var(--text-primary)', fontSize: '28px', marginBottom: '10px' }}>Vælg den rigtige pakke</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Vælg den løsning, der passer bedst til jeres virksomhed. I kan altid skifte senere.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {Object.entries(tiers).map(([tierKey, tierData]) => (
                                <div key={tierKey} style={{ background: 'var(--surface-bg)', border: `2px solid ${company.tier === tierKey ? 'var(--accent-primary)' : 'var(--border-light)'}`, borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    {company.tier === tierKey && <div style={{ background: 'var(--accent-primary)', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', alignSelf: 'flex-start', marginBottom: '16px' }}>Nuværende Valg</div>}
                                    <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', margin: '0 0 10px 0' }}>{tierData.name}</h3>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '20px' }}>{tierData.price} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'normal' }}>kr/md (ex. moms)</span></div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', flex: 1 }}>
                                        {tierData.features.map((feat, idx) => (
                                            <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle size={16} color="var(--accent-primary)" /> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        className={company.tier === tierKey ? "btn-secondary" : "btn-primary"}
                                        onClick={() => handleManageSubscription(tierKey)}
                                        disabled={isManaging}
                                        style={{ width: '100%', padding: '12px' }}
                                    >
                                        {isManaging ? 'Vent venligst...' : `Fortsæt med ${tierData.name}`}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default SubscriptionSettings;
