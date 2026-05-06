import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

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

            // Gem i leads tabellen
            const { data: insertedData, error } = await supabase
                .from('leads')
                .insert([{
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    customer_address: `${projectData.customerDetails?.street || ''}, ${projectData.customerDetails?.zip || ''} ${projectData.customerDetails?.city || ''}`,
                    project_category: categoryName,
                    price_estimate: priceRange,
                    contact_preference: isAsap ? 'Hurtigst muligt' : `${selectedDays.join(', ')} (${selectedTime})`,
                    raw_data: projectData, // Gemmer alle valg, valgte materialer osv i jsonb!
                    carpenter_id: carpenter?.id || null
                }])
                .select()
                .single();
                
            if (error) throw error;
            const newLeadId = insertedData.id;

            // Send emails (async so we don't block the UI)
            if (customerEmail !== 'Ukendt' && !isManualCreation) {
                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    import('../../utils/emailTemplates').then(({ getCustomerRequestReceivedTemplate, getCarpenterNewRequestTemplate, getCarpenterSenderName }) => {
                        const senderName = getCarpenterSenderName(carpenter);
                        // Email to customer
                        sendEmail({
                            to: customerEmail,
                            subject: `Tak for din forespørgsel - ${carpenterName}`,
                            html: getCustomerRequestReceivedTemplate(customerName, categoryName, carpenter),
                            fromName: senderName,
                            replyTo: carpenterEmail
                        });
                        
                        // Email to carpenter
                        if (carpenterEmail) {
                            const appUrl = window.location.origin;
                            sendEmail({
                                to: carpenterEmail,
                                subject: `Ny forespørgsel fra ${customerName} - ${categoryName}`,
                                html: getCarpenterNewRequestTemplate(carpenterName, customerName, categoryName, customerEmail, customerPhone, appUrl, newLeadId),
                                fromName: carpenterName,
                                replyTo: customerEmail
                            });
                        }
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

    return (
        <section className="wizard-step active" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="result-card" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Vejledende prisramme for {carpenter?.company_name || 'Mads Byg'}
                    </h2>
                </div>
                
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
                    <p style={{ fontSize: '1.05rem', margin: 0, color: '#64748b', maxWidth: '450px', marginInline: 'auto', lineHeight: '1.5' }}>Prisen er inkl. moms, arbejdstid, maskiner/materialer samt standard kørsel.</p>
                </div>

                <div style={{ 
                    background: 'var(--bg-card)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '32px', 
                    border: '1px solid var(--border)', 
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Faktorer der påvirker rammen:
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
                        {breakdownArr.map((txt, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                <span style={{ color: 'var(--accent)', marginTop: '2px' }}>✓</span>
                                <span>{txt}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ 
                    background: '#fffbeb', 
                    border: '1px solid #fde68a', 
                    color: '#92400e', 
                    padding: '24px', 
                    borderRadius: 'var(--radius-lg)', 
                    display: 'flex', 
                    gap: '16px',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1.1rem' }}>Vigtig information om overslaget</strong>
                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>Dette er udelukkende et vejledende pris-overslag for at give dig en idé om lejet. Tømreren tager altid ud og besigtiger opgaven fysisk, før der udarbejdes et endeligt og bindende tilbud.</p>
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
                        Ja Tak - Jeg vil gerne gå videre.
                    </button>
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        <button className="wizard-btn wizard-btn-secondary" style={{ width: '100%', justifyContent: 'center', border: '2px solid #e2e8f0', background: 'white', color: '#475569' }} onClick={editProject}>
                            ← Rediger opgave (Gå tilbage)
                        </button>
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
                        {isSaving ? 'Arbejder...' : (isManualCreation ? 'Opret Kunde og Gem Overslag' : `Send forespørgsel til ${carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : 'Tømreren'}`)}
                    </button>
                    {selectedDays.length === 0 && !isAsap && <p style={{ textAlign: 'center', marginTop: '12px', color: '#ef4444', fontSize: '0.9rem', fontWeight: '500' }}>* Vælg mindst én dag for at fortsætte</p>}
                    
                    {!isManualCreation && (
                        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>
                            Når du trykker send, lander dit overslag direkte hos {carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : 'tømreren'}. Han vil tage fat i dig hurtigst muligt – eller på de tidspunkter du har valgt – for en uforpligtende snak om opgaven.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};

export default StepResult;
