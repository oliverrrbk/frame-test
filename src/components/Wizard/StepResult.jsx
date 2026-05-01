import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const StepResult = ({ projectData, notes, priceRange, breakdownArr, resetWizard, nextStep, carpenter, isManualCreation = false, onComplete = null }) => {
    const [wantsQuote, setWantsQuote] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedTime, setSelectedTime] = useState('Hele dagen');
    const [isAsap, setIsAsap] = useState(false);

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
                    import('../../utils/emailTemplates').then(({ getCustomerRequestReceivedTemplate, getCarpenterNewRequestTemplate }) => {
                        // Email to customer
                        sendEmail({
                            to: customerEmail,
                            subject: `Tak for din forespørgsel - ${carpenterName}`,
                            html: getCustomerRequestReceivedTemplate(customerName, categoryName, carpenter),
                            fromName: carpenterName,
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
        <section className="wizard-step active">
            <div className="result-card">
                <div className="result-header">
                    <h3>Vejledende Prisramme</h3>
                    <span className="badge">SaaS Auto-Estimat</span>
                </div>
                
                <div className="estimate-value-box">
                    <h1>{priceRange}</h1>
                    <p className="tax-info">Prisen er inkl. moms, arbejdstid, valgte maskiner/materialer samt standard kørsel.</p>
                </div>

                <div className="estimate-breakdown">
                    <h4>Faktorer der påvirker rammen:</h4>
                    <ul>
                        {breakdownArr.map((txt, idx) => (
                            <li key={idx}>{txt}</li>
                        ))}
                    </ul>
                </div>

                <div className="disclaimer-alert" style={{ background: '#fef2f2', borderColor: '#f87171', color: '#991b1b', marginTop: '24px', padding: '16px', borderRadius: '8px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>⚠️ Vigtig information om overslaget</strong>
                    Dette er udelukkende et <strong>automatisk genereret overslag</strong>. For at sikre dig bedst muligt, regner vores system bevidst med "sikre marginer". Det betyder, at den faktiske pris <em>oftest vil være lavere</em> end estimatet heroppe, når jeg personligt har vurderet opgaven. Dette estimat udgør ikke et juridisk bindende tilbud.
                </div>
            </div>

            {!wantsQuote ? (
                <div className="result-actions" style={{ marginTop: '30px' }}>
                    <button className="btn-primary full-width" onClick={() => setWantsQuote(true)}>Ja tak - Jeg vil gerne have et eksakt tilbud!</button>
                    <button className="btn-secondary full-width" onClick={resetWizard}>Nej tak - Start forfra</button>
                </div>
            ) : (
                <div className="visit-booking" style={{ marginTop: '40px', padding: '25px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '10px', fontSize: '1.25rem', color: '#1e293b' }}>Lad os få aftalt det sidste</h3>
                    <p style={{ marginBottom: '20px', color: '#64748b' }}>For at kunne give dig en helt eksakt og bindende pris, tager jeg som oftest ud og ser personligt på opgaven. Markér gerne herunder, hvilke dage og tidspunkter på en almindelig uge, der passer dig bedst til en eventuel besigtigelse eller opkald.</p>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <button 
                            onClick={() => {
                                setIsAsap(!isAsap);
                                if (!isAsap) {
                                    setSelectedDays([]);
                                }
                            }}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '8px',
                                border: `2px solid ${isAsap ? '#10b981' : '#cbd5e1'}`,
                                backgroundColor: isAsap ? '#ecfdf5' : 'white',
                                color: isAsap ? '#059669' : '#475569',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                width: '100%',
                                marginBottom: '20px',
                                fontSize: '1rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            🚀 Kontakt mig hurtigst muligt
                        </button>

                        {!isAsap && (
                            <>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>Eller vælg hvilke ugedage der passer dig: (Vælg gerne flere)</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                            </>
                        )}
                    </div>

                    {!isAsap && (
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>Tidspunkt på dagen?</label>
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
                        className="btn-primary full-width" 
                        onClick={submitFinalQuote}
                        disabled={(!isAsap && selectedDays.length === 0) || isSaving}
                        style={{ opacity: ((!isAsap && selectedDays.length === 0) || isSaving) ? 0.5 : 1 }}
                    >
                        {isSaving ? 'Arbejder...' : (isManualCreation ? 'Opret Kunde og Gem Overslag' : `Send forespørgsel til ${carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : 'William'}`)}
                    </button>
                    {selectedDays.length === 0 && <p style={{ textAlign: 'center', marginTop: '10px', color: '#ef4444', fontSize: '0.85rem' }}>* Vælg mindst én dag for at fortsætte</p>}
                </div>
            )}
        </section>
    );
};

export default StepResult;
