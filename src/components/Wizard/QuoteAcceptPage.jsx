import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, CalendarDays, Phone, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { computeQuoteExpiry } from '../../utils/quoteExpiry';
import { friendlyError } from '../../utils/friendlyError';
import AudioPlayerButton from './AudioPlayerButton';

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
                    let { data: carpenterData } = await supabase
                        .rpc('get_public_carpenter', { carpenter_id: data.carpenter_id });
                    if (!carpenterData) {
                        const fb = await supabase.from('carpenters').select('*').eq('id', data.carpenter_id).single();
                        carpenterData = fb.data;
                    }
                    setCarpenter(carpenterData);
                }

                // Tracking: Registrer at kunden har åbnet tilbuddet.
                // Spring over hvis tilbuddet er trukket tilbage/slettet — linket er dødt.
                const isRevoked = data.status === 'Slettet' || !!data.revoked_at;
                if (data && !data.opened_at && isUUID && !isRevoked) {
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
        if (lead?.status === 'Slettet' || lead?.revoked_at) {
            toast.error("Dette tilbud er trukket tilbage og kan ikke længere bekræftes.");
            return;
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            toast.error('Ingen forbindelse — tjek dit internet og prøv igen.');
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

            // Klargør raw_data med audit trail. Integrationer køres fra appen,
            // hvor der findes bruger-auth og fakturalinjer.
            // confirmed_at bruges til "dagen efter"-påmindelsen om at planlægge sagen i kalenderen.
            const newRawData = {
                ...(lead?.raw_data || {}),
                audit_trail: auditTrail,
                confirmed_at: new Date().toISOString()
            };

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
                let { data: carpenter } = await supabase
                    .rpc('get_public_carpenter', { carpenter_id: lead.carpenter_id });
                if (!carpenter) {
                    const fb = await supabase.from('carpenters').select('*').eq('id', lead.carpenter_id).single();
                    carpenter = fb.data;
                }

                if (carpenter) {
                    import('../../utils/sendEmail').then(({ sendEmail }) => {
                        import('../../utils/emailTemplates').then(({ getCustomerOfferAcceptedTemplate, getCarpenterOfferAcceptedTemplate, getCarpenterSenderName }) => {
                            const carpenterName = carpenter.company_name || carpenter.owner_name || 'Bison Frame Tømrer';
                            const senderName = getCarpenterSenderName(carpenter);
                            const customerName = lead.customer_name;
                            const categoryName = lead.project_category;
                            
                            // Til kunden
                            if (lead.customer_email && lead.customer_email !== 'Ukendt') {
                                sendEmail({
                                    to: lead.customer_email,
                                    subject: `Dit tilbud fra ${carpenterName} er bekræftet!`,
                                    html: getCustomerOfferAcceptedTemplate(customerName, categoryName, carpenter, lead.raw_data?.quote_pdf_url, lead.case_number || String(lead.id).substring(0,8)),
                                    fromName: senderName,
                                    replyTo: carpenter.email,
                                    quoteToken: isUUID ? lead_id : undefined
                                });
                            }
                            
                            // Til tømreren
                            if (carpenter.email) {
                                const appUrl = window.location.origin;
                                sendEmail({
                                    to: carpenter.email,
                                    subject: `Tilbud accepteret: ${categoryName} - ${lead.customer_name}`,
                                    html: getCarpenterOfferAcceptedTemplate(carpenter.company_name, lead.customer_name, categoryName, appUrl, carpenter, lead.id),
                                    fromName: carpenterName,
                                    replyTo: lead.customer_email,
                                    quoteToken: isUUID ? lead_id : undefined
                                });
                            }
                        });
                    });
                }
            }
            
        } catch (error) {
            console.error('Fejl ved godkendelse af tilbud:', error);
            toast.error(friendlyError(error, 'Der opstod en fejl ved godkendelse. Prøv igen.'));
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
                <h2>Tilbuddet blev ikke fundet. Kontakt din tømrer.</h2>
            </div>
        );
    }

    // Tilbagekaldt/slettet tilbud: mailen kan ikke kaldes tilbage, men linket er nu dødt.
    // Vis en pæn besked i stedet for at lade kunden bekræfte et tilbud, der ikke længere gælder.
    if (lead.status === 'Slettet' || lead.revoked_at) {
        const firmaNavn = carpenter?.company_name || 'din tømrer';
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
                {carpenter?.logo_url ? (
                    <img src={carpenter.logo_url} alt="Firma Logo" style={{ maxHeight: '64px', marginBottom: '24px', objectFit: 'contain' }} />
                ) : null}
                <div style={{ maxWidth: '520px', width: '100%', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', padding: '40px 32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.25rem', marginBottom: '12px' }}>📄</div>
                    <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>Tilbuddet er ikke længere gyldigt</h2>
                    <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.05rem', lineHeight: 1.6 }}>
                        Dette tilbud er trukket tilbage af {firmaNavn} og kan ikke længere bekræftes.
                    </p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Har du spørgsmål, eller ønsker du et nyt tilbud, er du velkommen til at kontakte {firmaNavn} direkte.
                    </p>
                    {(carpenter?.phone || carpenter?.email) && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' }}>
                            {carpenter?.phone && (
                                <a href={`tel:${carpenter.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1d4ed8', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                                    <Phone size={18} /> Ring til {firmaNavn}
                                </a>
                            )}
                            {carpenter?.email && (
                                <a href={`mailto:${carpenter.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#fff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                                    <Mail size={18} /> Skriv en mail
                                </a>
                            )}
                        </div>
                    )}
                </div>
                <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <span style={{ fontSize: '0.85rem' }}>Udsendt sikkert via <strong>Bison Frame</strong></span>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 0 }).format(amount);
    };

    const calcData = lead?.raw_data?.calc_data;
    const settings = lead?.raw_data?.quote_settings;

    const customLinesSum = calcData?.customLines ? calcData.customLines.reduce((acc, line) => acc + (line.price || 0), 0) : 0;
    const totalPris = calcData ? (calcData.laborHours * calcData.hourlyRate) + calcData.materialCost + calcData.drivingCost + (calcData.extraMaterialsCost || 0) + customLinesSum : 0;
    const moms = totalPris * 0.25;
    const totalMedMoms = totalPris + moms;

    const { isExpired, validityDays } = computeQuoteExpiry(lead);

    return (
        <div className="accept-page-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
            
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
            <div className="accept-page-card" style={{ maxWidth: '800px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                
                {(accepted || lead.status === 'Bekræftet opgave') && (() => {
                    const firstName = carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : (carpenter?.company_name || 'tømreren');
                    const confirmedAt = new Date(lead.updated_at || Date.now()).toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const steps = [
                        { Icon: CalendarDays, title: 'Vi planlægger opstart', text: `${carpenter?.company_name || 'Vi'} sætter nu opgaven i kalenderen og vender tilbage med en opstartsdato.` },
                        { Icon: Phone, title: 'Vi kontakter dig', text: 'Vi tager fat i dig for at aftale de sidste praktiske detaljer omkring opgaven.' },
                        { Icon: ShieldCheck, title: 'Du behøver ikke gøre mere', text: 'Læn dig tilbage — du hører fra os. Du har også modtaget en bekræftelse på mail.' },
                    ];
                    return (
                    <div style={{ padding: '48px 32px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px', position: 'relative', display: 'inline-flex' }}>
                            <CheckCircle size={64} color="#10b981" />
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#10b981', filter: 'blur(28px)', opacity: 0.18, zIndex: 0, borderRadius: '50%' }}></div>
                        </div>

                        <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '2rem', letterSpacing: '-0.02em', fontWeight: 800 }}>Tak for din bekræftelse</h2>
                        <p style={{ margin: '0 auto 4px', color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '520px' }}>
                            Vi har modtaget din bekræftelse, og opgaven er nu sat i gang. Du er i trygge hænder — herfra tager {firstName} over.
                        </p>
                        <p style={{ margin: '0 auto 36px', color: '#94a3b8', fontSize: '0.85rem' }}>Bekræftet den {confirmedAt}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', maxWidth: '640px', margin: '0 auto 32px', textAlign: 'left' }}>
                            {steps.map((s, i) => (
                                <div key={i} style={{ backgroundColor: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <s.Icon size={26} color="#3b82f6" style={{ marginBottom: '14px' }} />
                                    <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1rem' }}>{i + 1}. {s.title}</h4>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>{s.text}</p>
                                </div>
                            ))}
                        </div>

                        {(carpenter?.phone || carpenter?.email) && (
                            <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px', backgroundColor: '#eff6ff', borderRadius: '16px', border: '1px dashed #bfdbfe' }}>
                                <strong style={{ display: 'block', color: '#1e40af', marginBottom: '6px', fontSize: '1.05rem' }}>Har du spørgsmål til opstart?</strong>
                                <p style={{ color: '#1e3a8a', margin: '0 0 18px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                    Du er altid velkommen til at kontakte {firstName} direkte.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {carpenter?.phone && (
                                        <a href={`tel:${carpenter.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1d4ed8', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                                            <Phone size={18} /> Ring til {firstName}
                                        </a>
                                    )}
                                    {carpenter?.email && (
                                        <a href={`mailto:${carpenter.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#fff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                                            <Mail size={18} /> Skriv en mail
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {/* Opgavebeskrivelse */}
                <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Opgavebeskrivelse</h3>
                        <AudioPlayerButton text={lead?.raw_data?.custom_message || `Vi takker for muligheden for at byde på din opgave vedr. ${lead.project_category}. Nedenfor finder du vores fulde tilbud på opgaven inkl. materialer og arbejdsløn.`} title="Læs opgavebeskrivelsen op" />
                    </div>
                    <p style={{ margin: '0', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                        {lead?.raw_data?.custom_message || `Vi takker for muligheden for at byde på din opgave vedr. ${lead.project_category}. Nedenfor finder du vores fulde tilbud på opgaven inkl. materialer og arbejdsløn.`}
                    </p>
                </div>

                {/* Manuel prisoversigt (Hurtigt tilbud) */}
                {lead?.raw_data?.is_manual_quote && lead?.raw_data?.manual_quote && (() => {
                    const mq = lead.raw_data.manual_quote;
                    const Row = ({ label, amount, bold }) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ color: bold ? '#0f172a' : '#475569', fontWeight: bold ? 700 : 400 }}>{label}</span>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(amount)}</span>
                        </div>
                    );
                    return (
                        <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#1e293b' }}>Samlet Tilbud</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Number(mq.materialSell) > 0 && <Row label={mq.laborMode === 'hourly' ? 'Materialer (estimat)' : 'Materialer'} amount={mq.materialSell} />}
                                {Number(mq.laborTotal) > 0 && <Row label={mq.laborMode === 'hourly' ? `Arbejde (estimat · ${mq.laborHours || 0} timer)` : 'Arbejde (fast pris)'} amount={mq.laborTotal} />}
                                {(mq.extras || []).map((ex, i) => (
                                    <Row key={i} label={ex.desc || 'Tillæg'} amount={ex.amount} />
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', paddingTop: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Moms (25%)</span>
                                    <span style={{ color: '#64748b' }}>{formatCurrency(mq.vat)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '8px' }}>
                                    <span style={{ fontWeight: '800', color: '#1d4ed8', fontSize: '1.2rem' }}>{mq.laborMode === 'hourly' ? 'Estimeret total inkl. moms' : 'Total inkl. moms'}</span>
                                    <span style={{ fontWeight: '900', color: '#1e40af', fontSize: '1.3rem' }}>{formatCurrency(mq.totalIncVat)}</span>
                                </div>
                                {mq.laborMode === 'hourly' && (
                                    <p style={{ margin: '4px 4px 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Dette tilbud er baseret på timepris. Beløbet er et estimat ud fra forventet tidsforbrug — den endelige pris afregnes efter faktisk medgået tid til den aftalte timepris og kan blive både højere og lavere. Materialer afregnes til kostpris med tillæg af sædvanlig avance.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Digital Prisoversigt */}
                {calcData && !lead?.raw_data?.is_manual_quote && (
                    <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#1e293b' }}>Samlet Tilbud</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {settings?.showDetailedBreakdown ? (
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
                                    {calcData.customLines && calcData.customLines.length > 0 && calcData.customLines.map((line, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                            <span style={{ color: '#475569' }}>{line.description || 'Ekstra ydelser'}</span>
                                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(line.price || 0)}</span>
                                        </div>
                                    ))}
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
                        <li style={{ marginBottom: '8px' }}>Tilbuddet er gældende i <strong>{validityDays} dage</strong> fra modtagelsen.</li>
                        <li style={{ marginBottom: '8px' }}>Arbejdet udføres i henhold til <strong>AB Forbruger</strong> (Almindelige Betingelser for byggearbejder), hvilket sikrer klare og trygge rammer for aftalen.</li>
                        <li>Eventuelle uforudsete forhindringer (f.eks. skjult råd, svamp, ulovlige installationer eller asbest), der ikke med rimelighed kunne forudses ved tilbudsgivningen, er <strong>ikke inkluderet</strong> og vil blive udbedret i samråd til gældende timepris.</li>
                    </ul>
                </div>

                {/* Udløbet Tilbud */}
                {isExpired && !(accepted || lead.status === 'Bekræftet opgave') && (
                    <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', backgroundColor: '#fff' }}>
                        <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', background: '#fef2f2', padding: '24px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>⏳</span>
                            <h3 style={{ color: '#991b1b', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Tilbuddet er udløbet</h3>
                            <p style={{ color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
                                Dette tilbud er mere end {validityDays} dage gammelt og er desværre ikke længere gældende. 
                                Kontakt venligst {carpenter?.company_name || 'din tømrer'} for at få et opdateret tilbud.
                            </p>
                        </div>
                    </div>
                )}

                {/* Consent & Actions */}
                {!isExpired && !(accepted || lead.status === 'Bekræftet opgave') && (
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
