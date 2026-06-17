import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { QUESTIONS } from './questionsConfig';
import { generateTaskDescription, generateTaskAndQaHtml } from '../../utils/taskDescription';
import AiSupportWidget from './AiSupportWidget';

const EstimateAcceptPage = () => {
    const { slug, lead_id } = useParams();
    const navigate = useNavigate();

    const categoryMap = {
        windows: 'Nye Vinduer',
        doors: 'Nye Døre',
        floor: 'Nyt Gulv',
        terrace: 'Træterrasse',
        roof: 'Tagprojekt',
        kitchen: 'Nyt Køkken',
        ceilings: 'Nye Lofter',
        facades: 'Ny Facadebeklædning',
        extensions: 'Tilbygning',
        annex: 'Anneks',
        carport: 'Carport',
        fence: 'Hegn',
        special: 'Specialopgave'
    };
    
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
                    let { data: carpenterData } = await supabase
                        .rpc('get_public_carpenter', { carpenter_id: data.carpenter_id });
                    if (!carpenterData) {
                        const fb = await supabase.from('carpenters').select('*').eq('id', data.carpenter_id).single();
                        carpenterData = fb.data;
                    }
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

            // Push til tømreren (best-effort — må aldrig blokere flowet)
            if (lead?.id) {
                supabase.functions.invoke('notify-quote-accepted', { body: { leadId: lead.id, kind: 'new_request' } }).catch(() => {});
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
                <p>Vi behandler sagen i vores system.</p>
            </div>
        );
    }

    const projectData = lead.raw_data || {};
    const isKombi = projectData.category === 'Kombi-projekt';
    const needsPhysicalInspection = lead.price_estimate === 'Besigtigelse kræves';

    if (isAccepted) {
        return (
            <div className="accept-page-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '600px', width: '100%' }}>
                    <div style={{ width: '80px', height: '80px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px' }}>
                        ✓
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>Tak for din forespørgsel!</h2>
                    <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '600px', margin: '0 auto 32px', lineHeight: '1.6' }}>
                        Opgaven er nu modtaget i vores system. Vi ringer dig op {isAsap ? 'hurtigst muligt' : 'på dit ønskede tidspunkt'}, så vi kan tage en snak om projektet og aftale det videre forløb.
                    </p>
                    <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '0 auto', textAlign: 'left' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.1rem' }}>Hvad sker der nu?</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: '#475569' }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>1.</span>
                                <span>Tømreren gennemgår dit foreløbige overslag.</span>
                            </li>
                            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: '#475569' }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>2.</span>
                                <span>Vi kontakter dig for at afstemme forventninger og eventuelt aftale besigtigelse.</span>
                            </li>
                            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: '#475569' }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>3.</span>
                                <span>Du modtager et endeligt, bindende tilbud, før arbejdet går i gang.</span>
                            </li>
                        </ul>
                    </div>
                    <button 
                        className="wizard-btn-secondary" 
                        style={{ marginTop: '40px', padding: '14px 32px', border: '2px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                        onClick={() => window.location.href = 'https://bisonframe.dk'}
                    >
                        Tilbage til forsiden
                    </button>
                </div>
            </div>
        );
    }

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
                                <strong style={{ color: '#0f172a' }}>Rul ned og bekræft i bunden</strong> for at sende din forespørgsel direkte afsted til os.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                                Tak for dit valg!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                Vi tager dit projekt meget seriøst og glæder os til at gå detaljerne igennem. <br/><br/>
                                <strong style={{ color: '#0f172a' }}>Rul ned og bekræft i bunden</strong> for at sende din forespørgsel afsted til os. Din forventede prisramme kan ses herunder.
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
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}>At bygge en tilbygning, carport eller et nyt køkken (eller en stor specialopgave) afhænger stærkt af de præcise forhold på din adresse. Vi vil rigtig gerne besigtige projektet, så vi kan give dig et skarpt og uforpligtende tilbud.</p>
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
                        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', margin: '0 0 8px 0', color: '#0f172a' }}>{lead.price_estimate}</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Vejledende pris inkl. moms, materialer og arbejdsløn.</p>
                    </div>
                )}

                {isKombi && projectData.calc_data?.kombiDiscount && (
                    <div style={{
                        marginTop: '0px',
                        marginBottom: '24px',
                        background: '#f0fdf4',
                        border: '2px dashed #10b981',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <span style={{ display: 'block', fontSize: '0.85rem', color: '#047857', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Mængderabat aktiveret</span>
                            <span style={{ display: 'block', fontSize: '1.2rem', color: '#065f46', fontWeight: '800' }}>Kombi-rabat &amp; delt kørsel er fratrukket</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ display: 'inline-block', background: '#d1fae5', border: '1px solid #10b981', color: '#065f46', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem', padding: '4px 10px', borderRadius: '6px' }}>KOMBI-PROJEKT</span>
                            <span style={{ color: '#059669', fontWeight: '800', fontSize: '1.05rem', background: '#d1fae5', padding: '6px 14px', borderRadius: '20px', border: '1px solid #10b981', whiteSpace: 'nowrap' }}>Indregnet i prisen</span>
                        </div>
                    </div>
                )}

                {!needsPhysicalInspection && (() => {
                    let taskList = [];
                    if (isKombi && Array.isArray(projectData.projects)) {
                        projectData.projects.forEach(p => {
                            const subTasks = generateTaskDescription(p.category, p.details);
                            taskList.push(...subTasks);
                        });
                        taskList = Array.from(new Set(taskList)); // Deduplicate task items!
                    } else if (projectData?.category === 'special' && Array.isArray(projectData?.details?.aiBreakdown)) {
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
                        {isKombi && Array.isArray(projectData.projects) ? (
                            projectData.projects.map((p, pIdx) => {
                                const catName = categoryMap[p.category] || p.category;
                                return (
                                    <div key={p.id || pIdx} style={{ marginBottom: '24px', padding: '24px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '12px', width: '100%' }}>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ background: '#0f172a', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{pIdx + 1}</span>
                                            {catName}
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
                                            {Object.entries(p.details || {}).map(([key, value]) => {
                                                const categoryQuestions = QUESTIONS[p.category] || [];
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
                                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>
                                                        <span style={{ color: '#10b981', marginRight: '4px', fontWeight: 'bold' }}>✓</span>
                                                        <div>
                                                            <strong style={{ color: '#0f172a' }}>{question.label}</strong>
                                                            <span style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: '2px', color: '#64748b' }}>{displayValue}</span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })
                        ) : projectData.category === 'special' ? (
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
                                            <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>{question.label}</strong>
                                            <span style={{ whiteSpace: 'pre-wrap' }}>{displayValue}</span>
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {lead.status === 'Ny forespørgsel' ? (
                    <div style={{ backgroundColor: '#ecfdf5', borderRadius: '12px', border: '2px solid #10b981', padding: '32px', textAlign: 'center', marginTop: '32px' }}>
                        <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>✓</div>
                        <h3 style={{ margin: '0 0 12px 0', color: '#065f46', fontSize: '1.4rem', fontWeight: '800' }}>Du har allerede sendt denne forespørgsel afsted</h3>
                        <p style={{ margin: '0 0 16px 0', color: '#047857', fontSize: '1.05rem', lineHeight: '1.6' }}>Vi vender tilbage hurtigst muligt. Hvis du ikke hører fra os, kan du altid kontakte os direkte herunder.</p>
                        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.95rem' }}>
                            <strong style={{ display: 'block', marginBottom: '8px' }}>Kontakt os direkte:</strong>
                            <p style={{ margin: '0 0 4px 0' }}>{carpenter?.company_name || 'Bison Frame Tømrer'}</p>
                            {carpenter?.phone && <p style={{ margin: '0 0 4px 0' }}>📞 {carpenter.phone}</p>}
                            {carpenter?.email && <p style={{ margin: '0' }}>✉️ {carpenter.email}</p>}
                        </div>
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
                            {needsPhysicalInspection ? `Anmod om besigtigelse af ${carpenter?.company_name || 'os'}` : `Vælg ${carpenter?.company_name || 'os'} til at udføre opgaven`}
                        </button>
                    </div>
                ) : (
                    <div ref={bookingRef} className="visit-booking" style={{ marginTop: '40px', padding: '32px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                            {needsPhysicalInspection ? 'Hvornår passer det at vi ringer?' : 'Lad os få aftalt det sidste'}
                        </h3>
                        <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '1.05rem', lineHeight: '1.5' }}>
                            {needsPhysicalInspection 
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
                                needsPhysicalInspection 
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

            <AiSupportWidget 
                carpenter={carpenter} 
                currentStep={5} 
                projectData={projectData} 
                projects={projectData.projects || []} 
            />
        </div>
    );
};

export default EstimateAcceptPage;
