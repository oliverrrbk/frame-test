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
            
            // Set trial end date to 30 days from created_at if not set
            if (!finalCompany.trial_ends_at && !finalCompany.subscription_end_date) {
                const created = new Date(finalCompany.created_at);
                created.setDate(created.getDate() + 30);
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
        basis: { name: 'Basis', price: '390', features: ['Beregn Standardopgaver (Tag, Gulv mm.)', 'Op til 20 tilbud / måned', 'Integration til e-conomic & Dinero'] },
        standard: { name: 'Professionel', price: '790', features: ['Alt fra Basis', 'AI-Agent til Special- & Kombiprojekter', 'Ubegrænsede tilbud', 'Ordrestyring integration'] },
        enterprise: { name: 'Enterprise', price: '1.890', features: ['Alt fra Professionel', 'Multi-bruger adgang', 'Specialtilpasset CSS Design'] }
    };

    const currentTier = tiers[company.tier] || tiers.standard;

    return (
        <div className="space-y-6 animate-fadeIn" style={{ maxWidth: '600px', margin: '0 auto' }}>

            {/* Trial Banner */}
            {company.subscription_status === 'trialing' && daysLeft > 0 && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        <Calendar size={18} color="#10b981" />
                        Prøveperiode: {daysLeft} dage tilbage
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: '1.4' }}>Jeres firma har fuld adgang til <strong>{currentTier.name}-pakken</strong>. Tilknyt et firmakort for at undgå afbrydelser i driften.</p>
                    <button 
                        onClick={() => setShowPricingWall(true)}
                        disabled={isManaging}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                    >
                        Tilknyt Firmakort
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
                        onClick={() => setShowPricingWall(true)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                    >
                        Aktiver Abonnement
                    </button>
                </div>
            )}

            {/* ABONNEMENT */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                {/* Nuværende Plan */}
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Nuværende Plan</span>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} /> AKTIV
                        </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{currentTier.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>{currentTier.price} kr. / md. (ex. moms)</div>
                    <button 
                        onClick={() => company.subscription_status === 'active' ? handleManagePortal() : setShowPricingWall(true)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                    >
                        Skift Plan
                    </button>
                </div>
                
                {/* Betalingsmetode */}
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <CreditCard size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Betalingsmetode</div>
                            {company.subscription_status === 'trialing' ? (
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Intet kort tilknyttet</div>
                            ) : (
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Aktivt betalingskort</div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={company.payment_customer_id ? handleManagePortal : handleManageSubscription}
                        disabled={isManaging}
                        style={{ background: 'transparent', color: '#3b82f6', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
                    >
                        Opdater
                    </button>
                </div>
                
                {/* Opsigelse */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={20} color="#ef4444" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Opsig Aftale</div>
                        </div>
                    </div>
                    <button 
                        onClick={handleManagePortal}
                        disabled={isManaging || !company.payment_customer_id}
                        style={{ background: 'transparent', color: '#ef4444', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: isManaging || !company.payment_customer_id ? 'not-allowed' : 'pointer', padding: 0, opacity: !company.payment_customer_id ? 0.5 : 1 }}
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
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Bogholderi PDF'er</div>
                        </div>
                    </div>
                    <button 
                        onClick={handleManagePortal}
                        disabled={isManaging || !company.payment_customer_id}
                        style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: '600', cursor: isManaging || !company.payment_customer_id ? 'not-allowed' : 'pointer', opacity: !company.payment_customer_id ? 0.5 : 1 }}
                    >
                        Åbn
                    </button>
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
