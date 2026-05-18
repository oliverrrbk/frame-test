import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { QUESTIONS } from './questionsConfig';
import { generateTaskDescription } from '../../utils/taskDescription';

const StepResult = ({ projectData, notes, priceRange, breakdownArr, resetWizard, nextStep, carpenter, isManualCreation = false, onComplete = null, editProject }) => {
    const [wantsQuote, setWantsQuote] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedTime, setSelectedTime] = useState('Hele dagen');
    const [isAsap, setIsAsap] = useState(true);
    const bookingRef = React.useRef(null);

    const handleDayToggle = (day) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const submitFinalQuote = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const customerEmail = projectData.customerDetails?.email || 'Ukendt';
            const customerName = projectData.customerDetails?.fullName || 'Ukendt';
            const customerPhone = projectData.customerDetails?.phone || '';
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
                special: projectData.details?.aiProjectTitle || 'Specialopgave'
            };
            const categoryName = categoryMap[projectData.category] || projectData.category;
            const carpenterName = carpenter?.owner_name || carpenter?.company_name || 'Bison Frame Tømrer';
            const carpenterEmail = carpenter?.email;

            const contactPreferenceStr = isAsap ? 'Hurtigst muligt' : `${selectedDays.join(', ')} (${selectedTime})`;

            // Vi opdaterer den eksisterende lead, der blev oprettet som kladde
            let newLeadId = projectData.leadId;
            if (newLeadId) {
                let updateQuery = supabase
                    .from('leads')
                    .update({
                        contact_preference: contactPreferenceStr,
                        status: 'Ny forespørgsel', // Nu gøres den aktiv, så tømreren kan se den
                        raw_data: projectData
                    });
                    
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newLeadId);
                const { error } = await (isUUID ? updateQuery.eq('quote_token', newLeadId) : updateQuery.eq('id', newLeadId));
                    
                if (error) throw error;
            } else {
                // Faldback, hvis der mod forventning ikke var et leadId
                const { data, error } = await supabase.from('leads').insert([{
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    customer_address: `${projectData.customerDetails?.street || ''}, ${projectData.customerDetails?.zip || ''} ${projectData.customerDetails?.city || ''}`,
                    project_category: categoryName,
                    price_estimate: priceRange,
                    contact_preference: contactPreferenceStr,
                    raw_data: projectData,
                    carpenter_id: carpenter?.id || null,
                    status: 'Ny forespørgsel'
                }]).select().single();
                if (error) throw error;
                newLeadId = data.id;
            }

            // Send emails (async so we don't block the UI)
            if (customerEmail !== 'Ukendt' && !isManualCreation) {
                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    import('../../utils/emailTemplates').then(({ getCustomerRequestReceivedTemplate, getCarpenterNewRequestTemplate, getCarpenterSenderName }) => {
                        import('../../utils/taskDescription').then(({ generateTaskAndQaHtml }) => {
                            const senderName = getCarpenterSenderName(carpenter);
                            const fullDetailsHtml = generateTaskAndQaHtml(projectData);
                            const fullDetailsHtmlCarpenter = generateTaskAndQaHtml(projectData, true);
                            
                            // Email to customer
                            sendEmail({
                                to: customerEmail,
                                subject: `Tak for din forespørgsel - ${carpenterName}`,
                                html: getCustomerRequestReceivedTemplate(customerName, categoryName, carpenter, fullDetailsHtml),
                                fromName: senderName,
                                replyTo: carpenterEmail
                            });
                            
                            // Email to carpenter
                            if (carpenterEmail) {
                                const appUrl = window.location.origin;
                                sendEmail({
                                    to: carpenterEmail,
                                    subject: `Ny forespørgsel fra ${customerName} - ${categoryName}`,
                                    html: getCarpenterNewRequestTemplate(carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl, newLeadId, fullDetailsHtmlCarpenter, priceRange, contactPreferenceStr),
                                    fromName: carpenterName,
                                    replyTo: customerEmail
                                });
                            }
                        });
                    });
                });
            }
            
            window.scrollTo(0, 0);
            if (onComplete) {
                onComplete();
            } else {
                nextStep(); // Gå til Landing page (Step 5)
            }
        } catch (err) {
            console.error("Fejl ved afsendelse af lead:", err);
            toast.error("Hov! Der skete en fejl. Prøv igen.");
        } finally {
            setIsSaving(false);
        }
    };

    const daysOfWeek = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

    const needsPhysicalInspection = projectData.category === 'extensions' || (projectData.category === 'special' && (!projectData.details?.aiLaborHours && !projectData.details?.aiMaterialCost));

    return (
        <section className="wizard-step active" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="result-card" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {needsPhysicalInspection ? (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                Vi har forstået din opgave!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                Du har nu givet os et utrolig stærkt udgangspunkt for at hjælpe dig videre med projektet.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                Dit vejledende overslag er klar!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                Du kan trygt bruge dette overslag til at sammenligne markedet. Vi tror på fuld gennemsigtighed fra start.
                            </p>
                        </>
                    )}
                </div>
                
                {needsPhysicalInspection ? (
                    <div style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0',
                        borderRadius: 'var(--radius-xl)', 
                        padding: '40px', 
                        color: 'var(--text-primary)', 
                        textAlign: 'center', 
                        marginBottom: '32px'
                    }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Komplekst Projekt</span>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Kræver fysisk besigtigelse</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}>At bygge en tilbygning (eller en stor specialopgave) er et fantastisk projekt. Fordi den endelige pris afhænger stærkt af jordbundsforhold, ingeniørberegninger og eksisterende konstruktioner, er det ikke muligt at give et retvisende overslag gennem en beregner.</p>
                        <p style={{ fontSize: '1.05rem', marginTop: '16px', color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}><strong>Men dit forarbejde er guld værd!</strong> Vi har nu de helt rigtige forudsætninger for at forstå din drøm. Send opgaven ind til os nedenfor, så ringer vi dig op og aftaler et møde.</p>
                    </div>
                ) : (
                    <div style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0',
                        borderRadius: 'var(--radius-xl)', 
                        padding: '40px', 
                        color: 'var(--text-primary)', 
                        textAlign: 'center', 
                        marginBottom: '32px'
                    }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Forventet prisramme</span>
                        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>{priceRange}</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Dette er et stærkt vejledende overslag inkl. moms. Vores erfaring er, at det endelige, bindende tilbud fra tømreren oftest lander lidt lavere – men med denne pris har du et realistisk udgangspunkt.</p>
                    </div>
                )}

                {(() => {


                    const taskList = generateTaskDescription(projectData.category, projectData.details);

                    if (taskList.length > 0) {
                        return (
                            <div style={{ 
                                background: '#f0fdf4', 
                                borderRadius: 'var(--radius-lg)', 
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
                    background: 'var(--bg-card)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '32px', 
                    border: '1px solid var(--border)', 
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Dine indtastede valg:
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                        {projectData.category === 'special' ? (
                            <>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span>
                                    <span><strong>{projectData.details?.aiProjectTitle || 'Specialopgave'}</strong></span>
                                </li>
                                {Array.isArray(projectData.details?.summaryBullets) && projectData.details.summaryBullets.map((bullet, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
                                        <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                                {Array.isArray(projectData.details?.aiBreakdown) && projectData.details.aiBreakdown.length > 0 && (
                                    <li style={{ marginTop: '16px', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                        <strong>Overslaget inkluderer:</strong>
                                    </li>
                                )}
                                {Array.isArray(projectData.details?.aiBreakdown) && projectData.details.aiBreakdown.map((itemObj, idx) => (
                                    <li key={`breakdown-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(16, 185, 129, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                        <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                                        <span>{itemObj.item}</span>
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
                                    displayValue = value.map(v => `${v.type || 'Standard'} (${v.width}x${v.height} cm)`).join(', ');
                                } else if (typeof value === 'boolean') {
                                    displayValue = value ? 'Ja' : 'Nej';
                                }

                                return (
                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.0rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px' }}>
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
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#64748b' }}>Stemmer opsummeringen overens, eller er der nogle ting, du vil ændre eller mangler?</p>
                    <button className="wizard-btn wizard-btn-secondary" style={{ display: 'inline-block', padding: '10px 20px', border: '2px solid #e2e8f0', background: 'white', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem' }} onClick={editProject}>
                        Ret opgaven
                    </button>
                </div>

                <div style={{ 
                    background: '#eff6ff', 
                    border: '1px solid #bfdbfe', 
                    color: '#1e3a8a', 
                    padding: '24px', 
                    borderRadius: 'var(--radius-lg)', 
                    display: 'flex', 
                    gap: '16px',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        {['special', 'extensions'].includes(projectData.category) ? (
                            <>
                                <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem' }}>Få besøg af {carpenter?.company_name || 'os'}</strong>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>Hvis du går videre herfra, sender du blot opgaven til os. Vi kvitterer med en mail og ringer dig op for at aftale et uforpligtende tidspunkt, hvor vi kan komme ud og se på projektet i virkeligheden.</p>
                            </>
                        ) : (
                            <>
                                <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem' }}>Er du klar til at vælge {carpenter?.company_name || 'os'}?</strong>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>Overslaget er allerede sendt til din mail, så du kan tænke over det. Hvis du går videre herfra, bekræfter du, at vi skal udføre opgaven for dig. Vi kommer ud og kigger på detaljerne, så vi sammen kan låse den endelige pris og lave en fast aftale.</p>
                            </>
                        )}
                    </div>
                </div>
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
                        {['special', 'extensions'].includes(projectData.category) ? 'Send oplysninger og bliv ringet op' : `Vælg ${carpenter?.company_name || 'os'} til at udføre opgaven`}
                    </button>
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        {/* Ret opgaven knappen er flyttet op under opsummeringen */}
                        <button className="wizard-btn wizard-btn-secondary" style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '0.9rem' }} onClick={resetWizard}>
                            Annuller og start helt forfra
                        </button>
                    </div>
                </div>
            ) : (
                <div ref={bookingRef} className="visit-booking" style={{ marginTop: '40px', padding: '32px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>Lad os få aftalt det sidste</h3>
                    <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.5' }}>Vælg hvordan du foretrækker at blive kontaktet for at få et eksakt og bindende tilbud.</p>
                    
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
                                border: `2px solid ${isAsap ? '#10b981' : 'var(--border)'}`,
                                backgroundColor: isAsap ? '#ecfdf5' : 'white',
                                color: isAsap ? '#059669' : 'var(--text-primary)',
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
                                border: `2px solid ${!isAsap ? '#2563eb' : 'var(--border)'}`,
                                backgroundColor: !isAsap ? '#eff6ff' : 'white',
                                color: !isAsap ? '#1d4ed8' : 'var(--text-primary)',
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
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Hvilke ugedage passer dig bedst? (Vælg gerne flere)</label>
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
                            
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Tidspunkt på dagen?</label>
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
                        className="wizard-btn wizard-btn-primary" 
                        onClick={submitFinalQuote}
                        disabled={(!isAsap && selectedDays.length === 0) || isSaving}
                        style={{ 
                            width: '100%', 
                            justifyContent: 'center', 
                            padding: '18px', 
                            fontSize: '1.2rem', 
                            marginTop: '20px',
                            opacity: ((!isAsap && selectedDays.length === 0) || isSaving) ? 0.5 : 1,
                            cursor: ((!isAsap && selectedDays.length === 0) || isSaving) ? 'not-allowed' : 'pointer',
                            boxShadow: ((!isAsap && selectedDays.length === 0) || isSaving) ? 'none' : '0 10px 25px rgba(59,130,246,0.3)'
                        }}
                    >
                        {isSaving ? 'Arbejder...' : (isManualCreation ? 'Opret Kunde og Gem Overslag' : `Bekræft valget af ${carpenter?.company_name || 'os'}`)}
                    </button>
                    {selectedDays.length === 0 && !isAsap && <p style={{ textAlign: 'center', marginTop: '12px', color: '#ef4444', fontSize: '0.9rem', fontWeight: '500' }}>* Vælg mindst én dag for at fortsætte</p>}
                    
                    {!isManualCreation && (
                        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>
                            Når du trykker send, lander opgaven direkte hos {carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : 'tømreren'}. Han tager fat i dig for at planlægge en besigtigelse.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};

export default StepResult;
