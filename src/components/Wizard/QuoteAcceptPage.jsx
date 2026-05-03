import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const QuoteAcceptPage = () => {
    const { lead_id } = useParams();
    
    const [lead, setLead] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [carpenter, setCarpenter] = useState(null);

    useEffect(() => {
        const fetchLead = async () => {
            try {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead_id);
                
                let data, error;
                if (isUUID) {
                    // Brug RPC funktion til at hente via public token (bypasser RLS sikkert)
                    const res = await supabase.rpc('get_lead_by_token', { token_val: lead_id });
                    data = res.data ? res.data[0] : null;
                    error = res.error;
                } else {
                    // Gammel metode (kræver at man er logget ind pga RLS)
                    const res = await supabase.from('leads').select('*').eq('id', lead_id).single();
                    data = res.data;
                    error = res.error;
                }

                if (error || !data) throw error || new Error("Lead not found");
                
                setLead(data);

                if (data && data.carpenter_id) {
                    const { data: carpenterData } = await supabase
                        .from('carpenters')
                        .select('*')
                        .eq('id', data.carpenter_id)
                        .single();
                    setCarpenter(carpenterData);
                }

                // Tracking: Registrer at kunden har åbnet tilbuddet
                if (data && !data.opened_at && isUUID) {
                    const now = new Date().toISOString();
                    let ipAddress = 'Ukendt';
                    try {
                        const ipRes = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipRes.json();
                        ipAddress = ipData.ip;
                    } catch(_e) {
                        // ignore error
                    }
                    
                    const auditTrailOpened = {
                        opened_at: now,
                        opened_ip: ipAddress,
                        opened_user_agent: navigator.userAgent
                    };
                    
                    const newRawData = { ...(data.raw_data || {}), audit_trail_opened: auditTrailOpened };
                    
                    await supabase.rpc('update_lead_by_token', {
                        token_val: lead_id,
                        new_opened_at: now,
                        new_raw_data: newRawData
                    });
                }

            } catch (error) {
                console.error('Fejl ved hentning af lead:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (lead_id) {
            fetchLead();
        }
    }, [lead_id]);

    const handleAccept = async () => {
        if (!termsAccepted) {
            toast.error("Du skal acceptere betingelserne for at fortsætte.");
            return;
        }
        
        setIsAccepting(true);
        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead_id);
            
            // Hent IP adresse til audit trail
            let ipAddress = 'Ukendt';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ipAddress = ipData.ip;
            } catch (_e) {
                console.warn("Kunne ikke hente IP-adresse", _e);
            }

            const auditTrail = {
                accepted_at: new Date().toISOString(),
                ip_address: ipAddress,
                user_agent: navigator.userAgent
            };

            const newRawData = { ...(lead?.raw_data || {}), audit_trail: auditTrail };

            if (isUUID) {
                const { error } = await supabase.rpc('update_lead_by_token', {
                    token_val: lead_id,
                    new_status: 'Bekræftet opgave',
                    new_raw_data: newRawData
                });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('leads')
                    .update({ 
                        status: 'Bekræftet opgave',
                        raw_data: newRawData
                    })
                    .eq('id', lead_id);
                if (error) throw error;
            }
            
            // Succes
            setAccepted(true);
            
            // Send bekræftelses-emails
            if (lead && lead.carpenter_id) {
                // Hent tømrerens info for at få email og navn
                const { data: carpenter } = await supabase
                    .from('carpenters')
                    .select('*')
                    .eq('id', lead.carpenter_id)
                    .single();
                
                if (carpenter) {
                    import('../../utils/sendEmail').then(({ sendEmail }) => {
                        import('../../utils/emailTemplates').then(({ getCustomerOfferAcceptedTemplate, getCarpenterOfferAcceptedTemplate }) => {
                            const carpenterName = carpenter.company_name || carpenter.owner_name || 'Bison Frame Tømrer';
                            const customerName = lead.customer_name;
                            const categoryName = lead.project_category;
                            
                            // Til kunden
                            if (lead.customer_email && lead.customer_email !== 'Ukendt') {
                                sendEmail({
                                    to: lead.customer_email,
                                    subject: `Dit tilbud fra ${carpenterName} er bekræftet!`,
                                    html: getCustomerOfferAcceptedTemplate(customerName, categoryName, carpenter, lead.raw_data?.quote_pdf_url),
                                    fromName: carpenterName,
                                    replyTo: carpenter.email
                                });
                            }
                            
                            // Til tømreren
                            if (carpenter.email) {
                                const appUrl = window.location.origin;
                                sendEmail({
                                    to: carpenter.email,
                                    subject: `✅ Tilbud accepteret: ${categoryName} - ${lead.customer_name}`,
                                    html: getCarpenterOfferAcceptedTemplate(carpenter.company_name, lead.customer_name, categoryName, appUrl),
                                    fromName: carpenterName,
                                    replyTo: lead.customer_email
                                });
                            }
                        });
                    });
                }
            }
            
        } catch (error) {
            toast.error('Der opstod en fejl ved godkendelse: ' + error.message);
        } finally {
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Åbner den sikre portal...</h2>
            </div>
        );
    }

    if (!lead) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Tilbuddet blev ikke fundet. Kontakt din håndværker.</h2>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 0 }).format(amount);
    };

    const calcData = lead?.raw_data?.calc_data;
    const settings = lead?.raw_data?.quote_settings;

    const totalPris = calcData ? (calcData.laborHours * calcData.hourlyRate) + calcData.materialCost + calcData.drivingCost : 0;
    const moms = totalPris * 0.25;
    const totalMedMoms = totalPris + moms;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
            
            {/* Tømrer Branding Header */}
            <div style={{ maxWidth: '800px', width: '100%', marginBottom: '24px', textAlign: 'center' }}>
                {carpenter?.logo_url ? (
                    <img src={carpenter.logo_url} alt="Firma Logo" style={{ maxHeight: '80px', marginBottom: '16px', objectFit: 'contain' }} />
                ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px', fontWeight: 'bold', color: '#64748b' }}>
                        {carpenter?.company_name ? carpenter.company_name.charAt(0) : 'T'}
                    </div>
                )}
                <h1 style={{ color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', fontWeight: '800' }}>Tilbud: {{
                    roof: 'Nyt Tag', floor: 'Nyt Gulv', windows: 'Nye Vinduer', doors: 'Nye Døre',
                    terrace: 'Ny Terrasse', ceilings: 'Nye Lofter', facades: 'Ny Facade', kitchen: 'Nyt Køkken'
                }[lead.project_category] || lead.project_category}</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0' }}>Udarbejdet til {lead.customer_name} af {carpenter?.company_name || 'Bison Frame Tømrer'}</p>
            </div>

            {/* Document Container */}
            <div style={{ maxWidth: '800px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                
                {(accepted || lead.status === 'Bekræftet opgave') && (
                    <div style={{ backgroundColor: '#ecfdf5', borderBottom: '1px solid #10b981', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>✓</div>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', color: '#065f46', fontSize: '1.4rem' }}>Tilbuddet er bekræftet</h2>
                            <p style={{ margin: 0, color: '#047857', fontSize: '0.95rem' }}>Mange tak for din accept. Vi glæder os til at gå i gang med opgaven.</p>
                        </div>
                    </div>
                )}

                {/* Opgavebeskrivelse */}
                <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#1e293b' }}>Opgavebeskrivelse</h3>
                    <p style={{ margin: '0', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                        {lead?.raw_data?.custom_message || `Vi takker for muligheden for at byde på din opgave vedr. ${lead.project_category}. Nedenfor finder du vores fulde tilbud på opgaven inkl. materialer og arbejdsløn.`}
                    </p>
                </div>

                {/* Digital Prisoversigt */}
                {calcData && (
                    <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#1e293b' }}>Prisoverslag</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(!settings || settings.showDetailedBreakdown) ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                        <span style={{ color: '#475569' }}>Materialer (inkl. spild)</span>
                                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(calcData.materialCost)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                        <span style={{ color: '#475569' }}>Arbejdsløn ({calcData.laborHours} timer)</span>
                                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(calcData.laborHours * calcData.hourlyRate)}</span>
                                    </div>
                                    {calcData.drivingCost > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                            <span style={{ color: '#475569' }}>Kørsel & Slitage</span>
                                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(calcData.drivingCost)}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ color: '#475569' }}>Samlet entreprise (Ekskl. moms)</span>
                                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(totalPris)}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', paddingTop: '8px' }}>
                                <span style={{ color: '#64748b' }}>Moms (25%)</span>
                                <span style={{ color: '#64748b' }}>{formatCurrency(moms)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '8px' }}>
                                <span style={{ fontWeight: '800', color: '#1d4ed8', fontSize: '1.2rem' }}>Total inkl. moms</span>
                                <span style={{ fontWeight: '900', color: '#1e40af', fontSize: '1.3rem' }}>{formatCurrency(totalMedMoms)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Eventuel PDF vedhæftet */}
                {lead.raw_data?.quote_pdf_url && (
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#334155' }}>Vedhæftet PDF-dokument</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Download tilbuddet til dine egne filer.</p>
                        </div>
                        <a 
                            href={lead.raw_data.quote_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                        >
                            Åbn PDF
                        </a>
                    </div>
                )}

                {/* Betingelser & Forbehold */}
                <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#1e293b' }}>Betingelser & Forbehold</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.7' }}>
                        <li style={{ marginBottom: '8px' }}>Tilbuddet er gældende i <strong>30 dage</strong> fra modtagelsen.</li>
                        <li style={{ marginBottom: '8px' }}>Arbejdet udføres i henhold til <strong>AB Forbruger</strong> (Almindelige Betingelser for byggearbejder), hvilket sikrer klare og trygge rammer for aftalen.</li>
                        <li>Eventuelle uforudsete forhindringer (f.eks. skjult råd, svamp, ulovlige installationer eller asbest), der ikke med rimelighed kunne forudses ved tilbudsgivningen, er <strong>ikke inkluderet</strong> og vil blive udbedret i samråd til gældende timepris.</li>
                    </ul>
                </div>

                {/* Consent & Actions */}
                {!(accepted || lead.status === 'Bekræftet opgave') && (
                    <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', backgroundColor: '#fff' }}>
                    <div style={{ textAlign: 'left', maxWidth: '600px', width: '100%', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                style={{ marginTop: '4px', width: '24px', height: '24px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <span style={{ color: '#1e293b', fontSize: '1.05rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                                    Godkendelse af tilbud
                                </span>
                                <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', display: 'block' }}>
                                    Jeg bekræfter hermed at have læst og accepteret ovenstående tilbud samt AB Forbruger / almindelige betingelser. Aftalen er bindende ved accept.
                                </span>
                            </div>
                        </label>
                    </div>
                    
                    <button 
                        onClick={handleAccept}
                        disabled={isAccepting || !termsAccepted}
                        style={{ 
                            background: termsAccepted ? '#10b981' : '#cbd5e1', 
                            color: 'white', 
                            border: 'none', 
                            padding: '20px 48px', 
                            fontSize: '1.25rem', 
                            fontWeight: '700', 
                            borderRadius: '12px', 
                            cursor: (isAccepting || !termsAccepted) ? 'not-allowed' : 'pointer',
                            boxShadow: termsAccepted ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' : 'none',
                            transition: 'all 0.2s',
                            opacity: isAccepting ? 0.7 : 1,
                            width: '100%',
                            maxWidth: '400px'
                        }}
                        onMouseOver={(e) => { if(!isAccepting && termsAccepted) e.target.style.transform = 'translateY(-2px)' }}
                        onMouseOut={(e) => { if(!isAccepting && termsAccepted) e.target.style.transform = 'translateY(0)' }}
                    >
                        {isAccepting ? 'Behandler...' : '✓ Accepter Tilbud'}
                    </button>
                    
                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#475569'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>
                        Jeg har spørgsmål til tilbuddet / Afvis
                    </button>
                </div>
                )}
            </div>
            
            {/* Footer Trust */}
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ fontSize: '0.85rem' }}>Dette er et fortroligt dokument udsendt sikkert via <strong>Bison Frame</strong> for {carpenter?.company_name || 'Tømrer'}</span>
            </div>
        </div>
    );
};

export default QuoteAcceptPage;
