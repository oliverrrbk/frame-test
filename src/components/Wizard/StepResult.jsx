import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { QUESTIONS } from './questionsConfig';
import { generateTaskDescription } from '../../utils/taskDescription';

const StepResult = ({ projectData, notes, priceRange, breakdownArr, resetWizard, nextStep, carpenter, isManualCreation = false, onComplete = null, editProject }) => {
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
            const getKombiTitle = (kombiProjects) => {
                if (!kombiProjects || kombiProjects.length === 0) return 'Kombi-projekt';
                const categoryShortNames = {
                    windows: 'Vinduer',
                    doors: 'Døre',
                    floor: 'Gulv',
                    terrace: 'Terrasse',
                    roof: 'Tag',
                    kitchen: 'Køkken',
                    ceilings: 'Lofter',
                    facades: 'Facade',
                    extensions: 'Tilbygning',
                    annex: 'Anneks',
                    carport: 'Carport',
                    fence: 'Hegn',
                    special: 'Specialopgave'
                };
                const names = kombiProjects.map(p => categoryShortNames[p.category] || p.category);
                const uniqueNames = Array.from(new Set(names));
                if (uniqueNames.length === 1) return `Kombi-projekt (${uniqueNames[0]})`;
                if (uniqueNames.length === 2) return `Kombi-projekt (${uniqueNames[0]} & ${uniqueNames[1]})`;
                const last = uniqueNames.pop();
                return `Kombi-projekt (${uniqueNames.join(', ')} & ${last})`;
            };

            const categoryName = isKombi 
                ? getKombiTitle(projectData.projects)
                : (categoryMap[projectData.category] || projectData.category);
            const carpenterName = carpenter?.owner_name || carpenter?.company_name || 'Bison Frame Tømrer';
            const carpenterEmail = carpenter?.email;

            const contactPreferenceStr = isAsap ? 'Hurtigst muligt' : `${selectedDays.join(', ')} (${selectedTime})`;

            const customerName = projectData.customerDetails?.fullName || projectData.customerDetails?.name || 'Ukendt Kunde';
            const customerEmail = projectData.customerDetails?.email || 'Ukendt';
            const customerPhone = projectData.customerDetails?.phone || 'Ukendt';

            // Vi opdaterer den eksisterende lead, der blev oprettet som kladde
            let newLeadId = projectData.leadId;
            if (newLeadId) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newLeadId);
                
                if (isUUID) {
                    // Brug den sikre RPC til at omgå RLS-opdateringsproblemer for anonyme brugere
                    const { data, error } = await supabase.rpc('accept_estimate_by_token', {
                        token_val: newLeadId,
                        preference_val: contactPreferenceStr
                    });
                    if (error || !data) throw error || new Error("Kunne ikke acceptere overslag via RPC");
                } else {
                    const { error } = await supabase
                        .from('leads')
                        .update({
                            contact_preference: contactPreferenceStr,
                            status: 'Ny forespørgsel',
                            raw_data: projectData
                        })
                        .eq('id', newLeadId);
                    if (error) throw error;
                }
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

    const isKombi = projectData.category === 'Kombi-projekt';

    const needsPhysicalInspection = priceRange === 'Besigtigelse kræves';

    return (
        <section className="wizard-step active result-step-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                    <div className="price-box-card" style={{ 
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
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}>At bygge en tilbygning, carport, køkkenmontage eller et isoleret/større anneks er et fantastisk projekt. Fordi den endelige pris afhænger stærkt af de specifikke forhold, eksisterende konstruktioner og eventuelle byggetilladelser, er det ikke muligt at give et retvisende overslag gennem en beregner.</p>
                        <p style={{ fontSize: '1.05rem', marginTop: '16px', color: '#64748b', maxWidth: '550px', marginInline: 'auto', lineHeight: '1.6' }}><strong>Men dit forarbejde er guld værd!</strong> Vi har nu de helt rigtige forudsætninger for at forstå din drøm. Send opgaven ind til os nedenfor, så ringer vi dig op og aftaler et møde.</p>
                    </div>
                ) : (
                    <div className="price-box-card" style={{ 
                        background: '#f8fafc', 
                        border: '2px solid #e2e8f0',
                        borderRadius: 'var(--radius-xl)', 
                        padding: '40px', 
                        color: 'var(--text-primary)', 
                        textAlign: 'center', 
                        marginBottom: '32px'
                    }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Forventet prisramme</span>
                        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{priceRange}</h1>
                        <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Dette er et stærkt vejledende overslag inkl. moms. Vores erfaring er, at det endelige, bindende tilbud fra os oftest lander lidt lavere – men med denne pris har du et realistisk udgangspunkt.</p>
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
                        boxShadow: 'var(--shadow-sm)',
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

                {(() => {
                    let taskList = [];
                    if (isKombi && Array.isArray(projectData.projects)) {
                        projectData.projects.forEach(p => {
                            const subTasks = generateTaskDescription(p.category, p.details);
                            taskList.push(...subTasks);
                        });
                        taskList = Array.from(new Set(taskList)); // Deduplicate task items!
                    } else if (projectData.category === 'special' && Array.isArray(projectData.details?.aiBreakdown)) {
                        taskList = projectData.details.aiBreakdown.map(itemObj => itemObj.item);
                    } else {
                        taskList = generateTaskDescription(projectData.category, projectData.details);
                    }

                    if (taskList.length > 0) {
                        return (
                            <div className="task-list-card" style={{ 
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

                <div className="details-list-card" style={{ 
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
                        {isKombi && Array.isArray(projectData.projects) ? (
                            projectData.projects.map((p, pIdx) => {
                                const catName = categoryMap[p.category] || p.category;
                                return (
                                    <div key={p.id || pIdx} style={{ marginBottom: '24px', padding: '24px', background: 'rgba(255,255,255,0.3)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-xs)', width: '100%' }}>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ background: 'var(--accent)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{pIdx + 1}</span>
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
                                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                        <span style={{ color: '#10b981', marginRight: '4px', fontWeight: 'bold' }}>✓</span>
                                                        <div>
                                                            <strong style={{ color: 'var(--text-primary)' }}>{question.label}</strong>
                                                            <span style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: '2px', color: 'var(--text-secondary)' }}>{displayValue}</span>
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
                        {needsPhysicalInspection ? (
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
                        {needsPhysicalInspection ? 'Send oplysninger og bliv ringet op' : `Vælg ${carpenter?.company_name || 'os'} til at udføre opgaven`}
                    </button>
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        {/* Ret opgaven knappen er flyttet op under opsummeringen */}
                        <button className="wizard-btn wizard-btn-secondary" style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '0.9rem' }} onClick={resetWizard}>
                            Annuller og start helt forfra
                        </button>
                    </div>
                </div>
            ) : (
                <div ref={bookingRef} className="visit-booking visit-booking-card" style={{ marginTop: '40px', padding: '32px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>Lad os få aftalt det sidste</h3>
                    <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.5' }}>Vælg hvordan du foretrækker at blive kontaktet for at få et eksakt og bindende tilbud.</p>
                    
                    <div className="booking-options-row" style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexDirection: 'row' }}>
                        <button 
                            className="booking-option-btn"
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
                            className="booking-option-btn"
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
                            <div className="days-selector-flex" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                {daysOfWeek.map(day => (
                                    <button 
                                        key={day}
                                        className="day-select-btn"
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
                            <div className="days-selector-flex" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {['Formiddag (8-12)', 'Eftermiddag (12-16)', 'Hele dagen'].map(time => (
                                    <button 
                                        key={time}
                                        className="day-select-btn"
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
                            Når du trykker send, lander opgaven direkte i vores system. Vi tager hurtigt fat i dig for at planlægge en besigtigelse.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};

export default StepResult;
