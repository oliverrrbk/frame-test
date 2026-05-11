import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { QUESTIONS } from './questionsConfig';

const EstimateAcceptPage = () => {
    const { slug, lead_id } = useParams();
    const navigate = useNavigate();
    
    const [lead, setLead] = useState(null);
    const [carpenter, setCarpenter] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [wantsQuote, setWantsQuote] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedTime, setSelectedTime] = useState('Hele dagen');
    const [isAsap, setIsAsap] = useState(true);
    const bookingRef = React.useRef(null);

    const daysOfWeek = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

    useEffect(() => {
        const fetchLead = async () => {
            try {
                // Fetch lead via token (RPC) or just select
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead_id);
                
                let data, error;
                if (isUUID) {
                    const res = await supabase.rpc('get_lead_by_token', { token_val: lead_id });
                    data = res.data ? res.data[0] : null;
                    error = res.error;
                } else {
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

                if (data.status && data.status !== 'Overslag (Afventer)' && data.status !== 'Ny forespørgsel') {
                    // Hvis opgaven allerede er bekræftet
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

    const handleDayToggle = (day) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const submitFinalQuote = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const contactPreferenceStr = isAsap ? 'Hurtigst muligt' : `${selectedDays.join(', ')} (${selectedTime})`;

            const { error } = await supabase
                .from('leads')
                .update({
                    contact_preference: contactPreferenceStr,
                    status: 'Ny forespørgsel'
                })
                .eq('id', lead.id);
                
            if (error) throw error;

            // Send Email to Carpenter
            const customerEmail = lead.customer_email;
            const customerName = lead.customer_name;
            const customerPhone = lead.customer_phone;
            const categoryName = lead.project_category;
            const carpenterName = carpenter?.owner_name || carpenter?.company_name || 'Bison Frame Tømrer';
            const carpenterEmail = carpenter?.email;

            if (carpenterEmail) {
                // Byg project details HTML
                let projectDetailsHtml = '';
                const projectData = lead.raw_data || {};
                if (projectData.category === 'special') {
                    projectDetailsHtml = `
                        <li style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                            <strong style="display: block; color: #0f172a; margin-bottom: 4px;">AI Opgave-beskrivelse:</strong>
                            <span style="color: #334155;">${projectData.details?.aiSummary || projectData.details?.aiProjectTitle || 'Specialopgave'}</span>
                        </li>
                    `;
                } else {
                    const categoryQuestions = QUESTIONS[projectData.category] || [];
                    projectDetailsHtml = Object.entries(projectData.details || {})
                        .map(([key, value]) => {
                            const question = categoryQuestions.find(q => q.id === key);
                            if (!question || value === undefined || value === null || value === '') return '';
                            if (question.type === 'textarea' || question.type === 'file') return '';
                            
                            let displayValue = value;
                            if (question.type === 'window_configurator' && Array.isArray(value)) {
                                displayValue = value.map(v => `${v.type || 'Standard'} (${v.width}x${v.height} cm)`).join(', ');
                            } else if (typeof value === 'boolean') {
                                displayValue = value ? 'Ja' : 'Nej';
                            }

                            return `
                                <li style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                                    <strong style="display: block; color: #0f172a; margin-bottom: 4px;">${question.label}</strong>
                                    <span style="color: #334155;">${displayValue}</span>
                                </li>
                            `;
                        })
                        .join('');
                }

                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    import('../../utils/emailTemplates').then(({ getCarpenterNewRequestTemplate, getCarpenterSenderName }) => {
                        const appUrl = window.location.origin;
                        sendEmail({
                            to: carpenterEmail,
                            subject: `Ny forespørgsel (Overslag Godkendt) fra ${customerName} - ${categoryName}`,
                            html: getCarpenterNewRequestTemplate(carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl, lead.id, projectDetailsHtml, lead.price_estimate, contactPreferenceStr),
                            fromName: carpenterName,
                            replyTo: customerEmail
                        });
                    });
                });
            }
            
            window.scrollTo(0, 0);
            navigate('/bekraeftet');
        } catch (err) {
            console.error("Fejl ved accept af overslag:", err);
            toast.error("Hov! Der skete en fejl. Prøv igen.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Åbner dit overslag...</h2>
            </div>
        );
    }

    if (!lead) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Overslaget blev ikke fundet.</h2>
            </div>
        );
    }

    if (lead.status !== 'Overslag (Afventer)' && lead.status !== 'Ny forespørgsel') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Denne opgave er allerede i proces.</h2>
                <p>Tømreren kigger på den.</p>
            </div>
        );
    }

    const projectData = lead.raw_data || {};

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
            </div>

            {/* Document Container */}
            <div style={{ maxWidth: '800px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0', padding: '40px' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                        Dit vejledende overslag
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                        Du kan trygt bruge dette overslag til at sammenligne markedet. Vi tror på fuld gennemsigtighed fra start.
                    </p>
                </div>

                <div style={{ 
                    background: '#f8fafc', 
                    border: '2px solid #e2e8f0',
                    borderRadius: '16px', 
                    padding: '40px', 
                    color: '#0f172a', 
                    textAlign: 'center', 
                    marginBottom: '32px'
                }}>
                    <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Forventet prisramme</span>
                    <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', margin: '0 0 16px 0', color: '#0f172a' }}>{lead.price_estimate}</h1>
                    <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Dette er et stærkt vejledende overslag inkl. moms. Vores erfaring er, at det endelige, bindende tilbud fra tømreren oftest lander lidt lavere – men med denne pris har du et realistisk udgangspunkt.</p>
                </div>

                <div style={{ 
                    background: '#fff', 
                    borderRadius: '12px', 
                    padding: '32px', 
                    border: '1px solid #e2e8f0', 
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Opsummering af din opgave:
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                        {projectData.category === 'special' ? (
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', color: '#64748b', lineHeight: '1.5' }}>
                                <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                <span>{projectData.details?.aiSummary || projectData.details?.aiProjectTitle || 'Specialopgave'}</span>
                            </li>
                        ) : (
                            Object.entries(projectData.details || {}).map(([key, value]) => {
                                const categoryQuestions = QUESTIONS[projectData.category] || [];
                                const question = categoryQuestions.find(q => q.id === key);
                                
                                if (!question || value === undefined || value === null || value === '') return null;
                                if (question.type === 'textarea' || question.type === 'file') return null;

                                let displayValue = value;
                                if (question.type === 'window_configurator' && Array.isArray(value)) {
                                    displayValue = value.map(v => `${v.type || 'Standard'} (${v.width}x${v.height} cm)`).join(', ');
                                } else if (typeof value === 'boolean') {
                                    displayValue = value ? 'Ja' : 'Nej';
                                }

                                return (
                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: '#64748b', lineHeight: '1.5', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                                        <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                        <div>
                                            <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>{question.label}</strong>
                                            <span>{displayValue}</span>
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {!wantsQuote ? (
                    <div className="result-actions" style={{ marginTop: '40px', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        <button 
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                padding: '18px', 
                                fontSize: '1.2rem', 
                                background: '#10b981', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer', 
                                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s'
                            }} 
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => {
                                setWantsQuote(true);
                                setTimeout(() => {
                                    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                            }}
                        >
                            Vælg {carpenter?.company_name || 'os'} til at udføre opgaven
                        </button>
                    </div>
                ) : (
                    <div ref={bookingRef} className="visit-booking" style={{ marginTop: '40px', padding: '32px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Lad os få aftalt det sidste</h3>
                        <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '1.05rem', lineHeight: '1.5' }}>Vælg hvordan du foretrækker at blive kontaktet for at få et eksakt og bindende tilbud.</p>
                        
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexDirection: 'row' }}>
                            <button 
                                onClick={() => {
                                    setIsAsap(true);
                                    setSelectedDays([]);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: `2px solid ${isAsap ? '#10b981' : '#e2e8f0'}`,
                                    backgroundColor: isAsap ? '#ecfdf5' : 'white',
                                    color: isAsap ? '#059669' : '#0f172a',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '1.05rem',
                                    transition: 'all 0.2s',
                                    boxShadow: isAsap ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                                }}
                            >
                                Kontakt mig hurtigst muligt
                            </button>
                            <button 
                                onClick={() => setIsAsap(false)}
                                style={{
                                    flex: 1,
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: `2px solid ${!isAsap ? '#2563eb' : '#e2e8f0'}`,
                                    backgroundColor: !isAsap ? '#eff6ff' : 'white',
                                    color: !isAsap ? '#1d4ed8' : '#0f172a',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '1.05rem',
                                    transition: 'all 0.2s',
                                    boxShadow: !isAsap ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
                                }}
                            >
                                Planlæg et tidspunkt
                            </button>
                        </div>

                        {!isAsap && (
                            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontWeight: '700', marginBottom: '12px', color: '#0f172a' }}>Hvilke ugedage passer dig bedst? (Vælg gerne flere)</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                    {daysOfWeek.map(day => (
                                        <button 
                                            key={day}
                                            onClick={() => handleDayToggle(day)}
                                            style={{
                                                padding: '10px 16px',
                                                borderRadius: '8px',
                                                border: `2px solid ${selectedDays.includes(day) ? '#2563eb' : '#cbd5e1'}`,
                                                backgroundColor: selectedDays.includes(day) ? '#eff6ff' : 'white',
                                                color: selectedDays.includes(day) ? '#1d4ed8' : '#475569',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                                
                                <label style={{ display: 'block', fontWeight: '700', marginBottom: '12px', color: '#0f172a' }}>Tidspunkt på dagen?</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {['Formiddag (8-12)', 'Eftermiddag (12-16)', 'Hele dagen'].map(time => (
                                        <button 
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            style={{
                                                padding: '10px 16px',
                                                borderRadius: '8px',
                                                border: `2px solid ${selectedTime === time ? '#2563eb' : '#cbd5e1'}`,
                                                backgroundColor: selectedTime === time ? '#eff6ff' : 'white',
                                                color: selectedTime === time ? '#1d4ed8' : '#475569',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={submitFinalQuote}
                            disabled={(!isAsap && selectedDays.length === 0) || isSaving}
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                padding: '18px', 
                                fontSize: '1.2rem', 
                                marginTop: '20px',
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                opacity: ((!isAsap && selectedDays.length === 0) || isSaving) ? 0.5 : 1,
                                cursor: ((!isAsap && selectedDays.length === 0) || isSaving) ? 'not-allowed' : 'pointer',
                                boxShadow: ((!isAsap && selectedDays.length === 0) || isSaving) ? 'none' : '0 10px 25px rgba(59,130,246,0.3)'
                            }}
                        >
                            {isSaving ? 'Arbejder...' : `Bekræft valget af ${carpenter?.company_name || 'os'}`}
                        </button>
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ fontSize: '0.85rem' }}>Dette er et fortroligt dokument udsendt sikkert via <strong>Bison Frame</strong> for {carpenter?.company_name || 'Tømrer'}</span>
            </div>
        </div>
    );
};

export default EstimateAcceptPage;
