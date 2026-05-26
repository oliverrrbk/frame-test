import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { QUESTIONS } from './questionsConfig';
import { generateTaskDescription, generateTaskAndQaHtml } from '../../utils/taskDescription';
const EstimateAcceptPage = () => {
    const { slug, lead_id } = useParams();
    const navigate = useNavigate();
    
    const [lead, setLead] = useState(null);
    const [carpenter, setCarpenter] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    
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

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead_id);
            
            if (isUUID) {
                // Brug den sikre RPC til at omgå RLS-opdateringsproblemer for anonyme brugere
                const { data, error } = await supabase.rpc('accept_estimate_by_token', {
                    token_val: lead_id,
                    preference_val: contactPreferenceStr
                });
                if (error || !data) throw error || new Error("Kunne ikke acceptere overslag via RPC");
            } else {
                const { error } = await supabase
                    .from('leads')
                    .update({
                        contact_preference: contactPreferenceStr,
                        status: 'Ny forespørgsel'
                    })
                    .eq('id', lead.id);
                if (error) throw error;
            }

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
                projectDetailsHtml = generateTaskAndQaHtml ? generateTaskAndQaHtml(projectData, true) : '';

                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    import('../../utils/emailTemplates').then(({ getCarpenterNewRequestTemplate, getCustomerBookingConfirmationTemplate, getCarpenterSenderName }) => {
                        const appUrl = window.location.origin;
                        const senderName = getCarpenterSenderName(carpenter);

                        // Send til tømrer
                        sendEmail({
                            to: carpenterEmail,
                            subject: `Ny forespørgsel (Overslag Godkendt) fra ${customerName} - ${categoryName}`,
                            html: getCarpenterNewRequestTemplate(carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl, lead.id, projectDetailsHtml, lead.price_estimate, contactPreferenceStr),
                            fromName: carpenterName,
                            replyTo: customerEmail
                        });

                        // Send til kunden
                        if (customerEmail && customerEmail !== 'Ukendt') {
                            sendEmail({
                                to: customerEmail,
                                subject: `Tak for din anmodning til ${carpenterName}`,
                                html: getCustomerBookingConfirmationTemplate(customerName, categoryName, carpenter, contactPreferenceStr),
                                fromName: senderName,
                                replyTo: carpenterEmail
                            });
                        }
                    });
                });
            }
            
            // Affyr confetti
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
            });

            window.scrollTo(0, 0);
            setIsAccepted(true);
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
    const needsPhysicalInspection = projectData.category === 'extensions' || (projectData.category === 'special' && (!projectData.details?.aiLaborHours && !projectData.details?.aiMaterialCost));

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
            </div>

            {/* Document Container */}
            <div className="accept-page-card" style={{ maxWidth: '800px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0', padding: '40px' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {needsPhysicalInspection ? (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                                Tak for dit valg!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                For at sikre dig det mest præcise tilbud, kræver dette projekt en fysisk besigtigelse. <br/><br/>
                                <strong style={{ color: '#0f172a' }}>Rul ned og bekræft i bunden</strong> for at sende din forespørgsel direkte afsted til {carpenter?.company_name || 'tømreren'}.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                                Tak for dit valg!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                Vi tager dit projekt meget seriøst og glæder os til at gå detaljerne igennem. <br/><br/>
                                <strong style={{ color: '#0f172a' }}>Rul ned og bekræft i bunden</strong> for at sende din forespørgsel afsted til {carpenter?.company_name || 'tømreren'}. Din forventede prisramme kan ses herunder.
                            </p>
                        </>
                    )}
                </div>

                {needsPhysicalInspection ? (
                    <div style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0',
                        borderRadius: '16px', 
                        padding: '40px', 
                        color: '#0f172a', 
                        textAlign: 'center', 
                        marginBottom: '32px'
                    }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Komplekst Projekt</span>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', margin: '0 0 16px 0', color: '#0f172a' }}>Besigtigelse kræves</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}>At bygge en tilbygning eller en stor specialopgave afhænger stærkt af de præcise forhold på din adresse. Vi vil rigtig gerne besigtige projektet, så vi kan give dig et skarpt og uforpligtende tilbud.</p>
                    </div>
                ) : (
                    <div style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0',
                        borderRadius: '16px', 
                        padding: '40px', 
                        color: '#0f172a', 
                        textAlign: 'center', 
                        marginBottom: '32px'
                    }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Opgavens Prisramme</span>
                        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', margin: '0 0 16px 0', color: '#0f172a' }}>{lead.price_estimate}</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Vejledende pris inkl. moms, materialer og arbejdsløn.</p>
                    </div>
                )}

                {(() => {
                    let taskList = [];
                    if (projectData?.category === 'special' && Array.isArray(projectData?.details?.aiBreakdown)) {
                        taskList = projectData.details.aiBreakdown.map(itemObj => itemObj.item);
                    } else {
                        taskList = generateTaskDescription(projectData?.category, projectData?.details);
                    }
                    if (taskList.length > 0) {
                        return (
                            <div style={{ 
                                background: '#f0fdf4', 
                                borderRadius: '12px', 
                                padding: '32px', 
                                border: '1px solid #bbf7d0', 
                                marginBottom: '24px'
                            }}>
                                <h3 style={{ fontSize: '1.3rem', color: '#166534', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#16a34a' }}>
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Overslaget inkluderer:
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                                    {taskList.map((task, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', color: '#166534', lineHeight: '1.5' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#22c55e', marginTop: '3px', flexShrink: 0 }}>
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            <span>{task}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    }
                    return null;
                })()}

                <div style={{ 
                    background: '#fff', 
                    borderRadius: '12px', 
                    padding: '32px', 
                    border: '1px solid #e2e8f0', 
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Dine indtastede valg:
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                        {projectData.category === 'special' ? (
                            <>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', color: '#64748b', lineHeight: '1.5' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span>
                                    <span><strong>{projectData.details?.aiProjectTitle || 'Specialopgave'}</strong></span>
                                </li>
                                {Array.isArray(projectData.details?.summaryBullets) && projectData.details.summaryBullets.map((bullet, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: '#64748b', lineHeight: '1.5', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                                        <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </>
                        ) : (
                            Object.entries(projectData.details || {}).map(([key, value]) => {
                                const categoryQuestions = QUESTIONS[projectData.category] || [];
                                const question = categoryQuestions.find(q => q.id === key);
                                
                                if (!question || value === undefined || value === null || value === '') return null;
                                if (question.type === 'file') return null;

                                let displayValue = value;
                                if (question.type === 'window_configurator' && Array.isArray(value)) {
                                    displayValue = value.map(v => `${v.count || 1}x ${v.type || 'Standard'} (${v.width}x${v.height} cm)${v.isOpenable === false ? ' (fastkarm)' : ''}${v.safetyGlass ? ' (sikkerhedsglas)' : ''}${v.hasSlidingDoor ? ' (m. skydedør)' : ''}`).join(', ');
                                } else if (typeof value === 'boolean') {
                                    displayValue = value ? 'Ja' : 'Nej';
                                }

                                return (
                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: '#64748b', lineHeight: '1.5', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                                        <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                        <div>
                                            <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>{question.label}</strong>
                                            <span style={{ whiteSpace: 'pre-wrap' }}>{displayValue}</span>
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {isAccepted ? (
                    <div style={{ backgroundColor: '#ecfdf5', borderRadius: '12px', border: '2px solid #10b981', padding: '40px', textAlign: 'center', marginTop: '32px' }}>
                        <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>✓</div>
                        <h2 style={{ margin: '0 0 16px 0', color: '#065f46', fontSize: '1.8rem', fontWeight: '800' }}>Forespørgsel sendt!</h2>
                        <p style={{ margin: '0 0 16px 0', color: '#047857', fontSize: '1.1rem', lineHeight: '1.6' }}>Tak for din tillid. Vi har også sendt en bekræftelse til din e-mail.</p>
                        <p style={{ margin: 0, color: '#065f46', fontSize: '1.05rem', opacity: 0.9 }}><strong>Næste skridt:</strong> Vi kontakter dig {isAsap ? 'hurtigst muligt' : 'på dit valgte tidspunkt'} for at aftale nærmere, så vi kan udarbejde et endeligt og bindende tilbud til dig.</p>
                    </div>
                ) : !wantsQuote ? (
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
                            {['special', 'extensions'].includes(projectData?.category) ? `Anmod om besigtigelse af ${carpenter?.company_name || 'os'}` : `Vælg ${carpenter?.company_name || 'os'} til at udføre opgaven`}
                        </button>
                    </div>
                ) : (
                    <div ref={bookingRef} className="visit-booking" style={{ marginTop: '40px', padding: '32px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                            {['special', 'extensions'].includes(projectData?.category) ? 'Hvornår passer det at vi ringer?' : 'Lad os få aftalt det sidste'}
                        </h3>
                        <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '1.05rem', lineHeight: '1.5' }}>
                            {['special', 'extensions'].includes(projectData?.category) 
                                ? 'Vælg hvordan du foretrækker at blive kontaktet, så vi kan aftale et tidspunkt for besigtigelse.' 
                                : 'Vælg hvordan du foretrækker at blive kontaktet for at få et eksakt og bindende tilbud.'}
                        </p>
                        
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
                            {isSaving ? 'Arbejder...' : (
                                ['special', 'extensions'].includes(projectData?.category) 
                                ? `Anmod om besigtigelse` 
                                : `Bekræft valget af ${carpenter?.company_name || 'os'}`
                            )}
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
