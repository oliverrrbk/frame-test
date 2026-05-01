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

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Indlæser firmaaftale...</div>;
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
        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building size={24} color="#3b82f6" />
                    Firmaaftale & Fakturering
                </h2>
                <p style={{ color: '#94a3b8', margin: 0 }}>Administrer jeres B2B abonnement, betalingskort og find tidligere fakturaer til bogholderiet.</p>
            </div>

            {/* Trial Banner */}
            {company.subscription_status === 'trialing' && daysLeft > 0 && (
                <div style={{ background: 'linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15)), #1e293b', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            <Calendar size={18} color="#3b82f6" />
                            Prøveperiode: {daysLeft} dage tilbage
                        </div>
                        <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px' }}>Jeres firma har fuld adgang til <strong>{currentTier.name}-pakken</strong>. Tilknyt et firmakort for at undgå afbrydelser i driften.</p>
                    </div>
                    <button 
                        onClick={() => setShowPricingWall(true)}
                        disabled={isManaging}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isManaging ? 'wait' : 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
                    >
                        Tilknyt Firmakort
                    </button>
                </div>
            )}

            {company.subscription_status === 'trialing' && daysLeft <= 0 && (
                <div style={{ background: 'linear-gradient(rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.15)), #1e293b', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            <AlertTriangle size={18} />
                            Prøveperiode udløbet
                        </div>
                        <p style={{ color: '#cbd5e1', margin: 0, fontSize: '14px' }}>Jeres prøveperiode er udløbet. Tilknyt et betalingskort for fortsat at bruge platformen.</p>
                    </div>
                    <button 
                        onClick={() => setShowPricingWall(true)}
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Aktiver Abonnement
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                {/* Nuværende Plan */}
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ color: '#f8fafc', margin: '0 0 4px 0', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Nuværende Plan</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{currentTier.name}</span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>{currentTier.price} kr. / md. (ex. moms)</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Aktiv
                        </div>
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                        {currentTier.features.map((feat, idx) => (
                            <li key={idx} style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={14} color="#3b82f6" /> {feat}
                            </li>
                        ))}
                    </ul>

                    <button 
                        onClick={() => company.subscription_status === 'active' ? handleManagePortal() : setShowPricingWall(true)}
                        style={{ width: '100%', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        Skift Plan
                    </button>
                </div>

                {/* Betalingsmetode & Opsigelse */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', flex: 1 }}>
                        <h3 style={{ color: '#f8fafc', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CreditCard size={18} color="#94a3b8" /> Betalingsmetode
                        </h3>
                        {company.subscription_status === 'trialing' ? (
                            <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                                Der er endnu ikke tilknyttet et firmakort. Betaling trækkes først, når prøveperioden udløber.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: '#fff', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>VISA</div>
                                    <span style={{ color: '#f8fafc', fontSize: '14px' }}>•••• 4242</span>
                                </div>
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Udløber 12/26</span>
                            </div>
                        )}
                        <button 
                            onClick={company.payment_customer_id ? handleManagePortal : handleManageSubscription}
                            disabled={isManaging}
                            style={{ display: 'block', width: '100%', background: '#334155', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: isManaging ? 'wait' : 'pointer', marginTop: '16px' }}
                        >
                            {company.payment_customer_id ? 'Åbn Kundeportal' : 'Opdater betalingsoplysninger'}
                        </button>
                    </div>

                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                        <h3 style={{ color: '#f8fafc', margin: '0 0 8px 0', fontSize: '16px' }}>Opsig Firmaaftale</h3>
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                            Når du opsiger, vil platformen forblive aktiv perioden ud. Vi binder jer ikke til noget, I ikke bruger.
                        </p>
                        <button 
                            onClick={handleManagePortal}
                            disabled={isManaging || !company.payment_customer_id}
                            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: isManaging || !company.payment_customer_id ? 'not-allowed' : 'pointer', fontSize: '13px', transition: 'all 0.2s', opacity: !company.payment_customer_id ? 0.5 : 1 }}
                            onMouseOver={e => { if(company.payment_customer_id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
                            onMouseOut={e => { if(company.payment_customer_id) e.currentTarget.style.background = 'transparent' }}
                        >
                            Opsig abonnement
                        </button>
                    </div>
                </div>
            </div>

            {/* Fakturering (Bogholderi) */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="#94a3b8" /> Fakturaer til Bogholderiet
                    </h3>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                        <Shield size={14} /> Sikker B2B Fakturering
                    </div>
                </div>
                
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                    Her vil du kunne downloade alle firmaets månedlige fakturaer som PDF med udspecificeret moms, når abonnementet er aktivt.
                </p>

                {company.payment_customer_id ? (
                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                            Alle fakturaer gemmes automatisk i din kundekonto.
                        </div>
                        <button 
                            onClick={handleManagePortal}
                            disabled={isManaging}
                            style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: isManaging ? 'wait' : 'pointer', fontSize: '13px' }}
                        >
                            Åbn Faktura-arkiv
                        </button>
                    </div>
                ) : (
                    <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '8px', padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                        Ingen betalte fakturaer endnu.
                    </div>
                )}
            </div>

            {/* Pricing Wall Modal */}
            {showPricingWall && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px', maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <button 
                            onClick={() => setShowPricingWall(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ color: '#f8fafc', fontSize: '28px', marginBottom: '10px' }}>Vælg den rigtige pakke</h2>
                            <p style={{ color: '#94a3b8', fontSize: '16px' }}>Vælg den løsning, der passer bedst til jeres virksomhed. I kan altid skifte senere.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {Object.entries(tiers).map(([tierKey, tierData]) => (
                                <div key={tierKey} style={{ background: '#0f172a', border: `2px solid ${company.tier === tierKey ? '#3b82f6' : '#334155'}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    {company.tier === tierKey && <div style={{ background: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', alignSelf: 'flex-start', marginBottom: '16px' }}>Nuværende Valg</div>}
                                    <h3 style={{ color: '#f8fafc', fontSize: '20px', margin: '0 0 10px 0' }}>{tierData.name}</h3>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '20px' }}>{tierData.price} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>kr/md (ex. moms)</span></div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', flex: 1 }}>
                                        {tierData.features.map((feat, idx) => (
                                            <li key={idx} style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle size={16} color="#3b82f6" /> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        onClick={() => handleManageSubscription(tierKey)}
                                        disabled={isManaging}
                                        style={{ width: '100%', background: company.tier === tierKey ? '#334155' : '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: isManaging ? 'wait' : 'pointer', transition: 'background 0.2s' }}
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
