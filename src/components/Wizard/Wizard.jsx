import React, { useState } from 'react';
import Step1Category from './Step1Category';
import Step2Dynamic from './Step2Dynamic';
import Step3Photos from './Step3Photos';
import Step4Contact from './Step4Contact';
import StepResult from './StepResult';
import Step5Success from './Step5Success';
import ChatEstimator from './ChatEstimator';
import { performCalculation } from '../../utils/calculator';
import { fetchCalibrationFactor } from '../../utils/calibration';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const Wizard = ({ carpenter, isManualCreation = false, onComplete = null }) => {
    const [currentStep, setCurrentStep] = useState(1);
    
    // Database State
    const [dbSettings, setDbSettings] = useState(null);
    const [dbMaterials, setDbMaterials] = useState(null);
    const [disabledCategories, setDisabledCategories] = useState([]);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep]);

    React.useEffect(() => {
        const fetchDb = async () => {
            if (!carpenter) return;
            const [settingsRes, materialsRes] = await Promise.all([
                supabase.from('settings').select('*').eq('carpenter_id', carpenter.id).limit(1).single(),
                supabase.from('materials').select('*').eq('carpenter_id', carpenter.id)
            ]);
            
            if (settingsRes.data) {
                setDbSettings(settingsRes.data);
            } else {
                setDbSettings({
                    hourly_rate: 550,
                    material_markup: 1.15,
                    risk_margin: 1.25,
                    trailer_disposal_fee: 800,
                    container_disposal_fee: 2500,
                    vehicle_cost_per_km: 3.8
                });
            }
            if (materialsRes.data) {
                // Udtræk de skjulte kategorier først
                const sysMat = materialsRes.data.find(m => m.category === 'SYSTEM' && m.name && m.name.startsWith('DISABLED_CATEGORIES||'));
                if (sysMat) {
                    const str = sysMat.name.replace('DISABLED_CATEGORIES||', '');
                    setDisabledCategories(str ? str.split(',') : []);
                }

                // Map array to object format format: { roof: { 'Stål': 500, 'Tegl': 1100 } }
                const formattedMaterials = materialsRes.data.reduce((acc, curr) => {
                    // Ignorer System materiale + skjulte INACTIVE|| materialer
                    if (curr.category === 'SYSTEM') return acc;
                    
                    const matName = curr.name || '';
                    const isItemActive = !matName.startsWith('INACTIVE||');
                    if (!isItemActive) return acc; // Filtreres væk totalt fra priserne beregninger/frontenden!

                    if (!acc[curr.category]) acc[curr.category] = {};
                    acc[curr.category][matName] = curr.price;
                    return acc;
                }, {});
                setDbMaterials(formattedMaterials);
            }
            setIsDbLoading(false);
        };
        fetchDb();
    }, [carpenter?.id]);
    
    // Extracted state corresponding to old `projectData`
    const [projectData, setProjectData] = useState({
        category: null,
        details: {},
    });
    
    const [notes, setNotes] = useState("");
    const [priceRange, setPriceRange] = useState("-- kr.");
    const [breakdownArr, setBreakdownArr] = useState([]);

    const totalSteps = 4;
    const progressPercentage = (currentStep / totalSteps) * 100;

    const updateCategory = (category) => {
        if (category === 'special') {
            setProjectData({ category, details: { isAiEstimate: true } });
            setTimeout(() => {
                setCurrentStep('special_chat');
            }, 300);
            return;
        }

        let defaultDetails = {};
        if (category === 'windows' || category === 'doors') {
            defaultDetails = { amount: 1, finish: 'yes', material: category === 'windows' ? 'træ' : 'fyr' };
        } else if (category === 'floor') {
            defaultDetails = { amount: 20, finish: 'yes', material: 'laminat' };
        } else {
            defaultDetails = { amount: 30, material: '' };
        }
        
        setProjectData({
            category,
            details: defaultDetails
        });
        
        // Timeout to mimic the smooth auto-transition from old app
        setTimeout(() => {
            setCurrentStep(2);
        }, 300);
    };

    const updateDetails = (key, value) => {
        setProjectData(prev => ({
            ...prev,
            details: {
                ...prev.details,
                [key]: value
            }
        }));
    };

    const nextStep = () => {
        if (currentStep === 1 && !projectData.category) {
            toast.error('Vejledning: Vælg et overordnet byggeprojekt først for at fortsætte.');
            return;
        }
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep === 'special_chat') {
            setCurrentStep(1);
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const calculateEstimate = async (customerDetails, isUpdateContext = false) => {
        setIsCalculating(true);
        
        // Sørg for at latest data er i projectData objektet inden det sendes afsted
        const updatedProjectData = {
            ...projectData,
            customerDetails
        };
        
        setProjectData(updatedProjectData);

        if (!dbSettings || !dbMaterials) {
            import('react-hot-toast').then(toast => {
                toast.default.error('Kunne ikke få forbindelse til Beregningsmotoren.');
            });
            setIsCalculating(false);
            return;
        }

        try {
            // Hent auto-læring kalibrering for denne (tømrer, kategori) før beregning.
            // Falder lydløst tilbage til factor=1.0 hvis tabeller mangler eller intet match.
            const calibration = await fetchCalibrationFactor(carpenter?.id, updatedProjectData.category);

            const res = await performCalculation(updatedProjectData, customerDetails, dbSettings, dbMaterials, carpenter, calibration);
            
            setPriceRange(res.priceRange);
            setBreakdownArr(res.breakdownArr);

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
            const categoryName = categoryMap[updatedProjectData.category] || updatedProjectData.category;

            let leadId = updatedProjectData.leadId;
            let isUpdate = !!leadId;
            let insertedData = null;

            if (isUpdate) {
                // Tjek om leadId er UUID (fra den nye quote_token) eller BIGINT (fra tidligere)
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId);

                // OPDATER EKSISTERENDE LEAD
                const updateQuery = supabase
                    .from('leads')
                    .update({
                        price_estimate: res.priceRange,
                        raw_data: { ...updatedProjectData, calc_data: res.calcData },
                        updated_at: new Date().toISOString()
                    });
                
                const { error } = await (isUUID ? updateQuery.eq('quote_token', leadId) : updateQuery.eq('id', leadId));
                
                if (error) {
                    console.error("Fejl ved opdatering af lead (RLS blokerer muligvis kunde):", error);
                    // Hvis opdatering fejler (f.eks. pga sikkerhed/RLS), opret et nyt
                    isUpdate = false; 
                } else {
                    insertedData = { id: leadId };
                }
            }

            if (!isUpdate) {
                // OPRET LEAD TIDLIGT SOM "Overslag (Afventer)"
                const newLeadToken = crypto.randomUUID();
                const { error } = await supabase
                    .from('leads')
                    .insert([{
                        quote_token: newLeadToken,
                        customer_name: customerDetails?.fullName || 'Ukendt',
                        customer_email: customerDetails?.email || 'Ukendt',
                        customer_phone: customerDetails?.phone || '',
                        customer_address: `${customerDetails?.street || ''}, ${customerDetails?.zip || ''} ${customerDetails?.city || ''}`,
                        project_category: categoryName,
                        price_estimate: res.priceRange,
                        contact_preference: projectData.category === 'extensions' ? 'Hurtigst muligt' : 'Afventer accept',
                        raw_data: { ...updatedProjectData, calc_data: res.calcData },
                        carpenter_id: carpenter?.id || null,
                        status: projectData.category === 'extensions' ? 'Ny forespørgsel' : 'Overslag (Afventer)'
                    }]);
                
                if (error) throw error;
                leadId = newLeadToken;
                insertedData = { id: newLeadToken };
                updatedProjectData.leadId = leadId;
            }

            if (insertedData && customerDetails?.email) {
                // SEND EMAIL MED OVERSLAGET TIL KUNDEN
                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    import('../../utils/emailTemplates').then(({ getCustomerEstimateTemplate, getCustomerUpdatedEstimateTemplate, getCarpenterSenderName }) => {
                        const carpenterCompanyName = carpenter?.company_name || 'Tømreren';
                        const senderName = getCarpenterSenderName(carpenter);
                        
                        // Generer URL til at åbne overslaget igen
                        const overslagUrl = `${window.location.origin}/${carpenter?.slug || 'demo'}/overslag/${leadId}`;
                        
                        if (res.priceRange === 'Besigtigelse kræves') {
                            if (projectData.category === 'extensions') {
                                // Fast-track flow for extensions
                                import('../../utils/emailTemplates').then(({ getCustomerFastTrackTemplate, getCarpenterNewRequestTemplate }) => {
                                    const notesText = updatedProjectData.details?.notes || '';
                                    const projectDetailsHtml = `
                                        <li style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                                            <strong style="display: block; color: #0f172a; margin-bottom: 4px;">Kundens beskrivelse:</strong>
                                            <span style="color: #334155; white-space: pre-wrap;">${notesText}</span>
                                        </li>
                                    `;
                                    
                                    // Send to customer
                                    sendEmail({
                                        to: customerDetails.email,
                                        subject: `Vi har modtaget din forespørgsel - ${carpenterCompanyName}`,
                                        html: getCustomerFastTrackTemplate(customerDetails.fullName, categoryName, carpenter, notesText),
                                        fromName: senderName,
                                        replyTo: carpenter?.email
                                    });
                                    
                                    // Send to carpenter immediately
                                    if (carpenter?.email) {
                                        const appUrl = window.location.origin;
                                        sendEmail({
                                            to: carpenter.email,
                                            subject: `Ny forespørgsel fra ${customerDetails.fullName} - ${categoryName}`,
                                            html: getCarpenterNewRequestTemplate(
                                                carpenterCompanyName, 
                                                customerDetails.fullName, 
                                                categoryName, 
                                                customerDetails.email, 
                                                customerDetails.phone, 
                                                appUrl, 
                                                leadId, 
                                                projectDetailsHtml, 
                                                '', 
                                                'Hurtigst muligt'
                                            ),
                                            fromName: customerDetails.fullName,
                                            replyTo: customerDetails.email
                                        });
                                    }
                                });
                            } else {
                                // Standard flow for special tasks
                                import('../../utils/emailTemplates').then(({ getCustomerComplexProjectTemplate }) => {
                                    sendEmail({
                                        to: customerDetails.email,
                                        subject: `Din forespørgsel hos ${carpenterCompanyName}`,
                                        html: getCustomerComplexProjectTemplate(customerDetails.fullName, categoryName, carpenter, overslagUrl),
                                        fromName: senderName,
                                        replyTo: carpenter?.email
                                    });
                                });
                            }
                        } else {
                            import('../../utils/taskDescription').then(({ generateTaskAndQaHtml }) => {
                                const fullDetailsHtml = generateTaskAndQaHtml(updatedProjectData);
                                if (!isUpdate) {
                                    sendEmail({
                                        to: customerDetails.email,
                                        subject: `Dit vejledende overslag fra ${carpenterCompanyName}`,
                                        html: getCustomerEstimateTemplate(customerDetails.fullName, categoryName, res.priceRange, carpenter, overslagUrl, fullDetailsHtml),
                                        fromName: senderName,
                                        replyTo: carpenter?.email
                                    });
                                } else {
                                    sendEmail({
                                        to: customerDetails.email,
                                        subject: `Dit opdaterede overslag fra ${carpenterCompanyName}`,
                                        html: getCustomerUpdatedEstimateTemplate(customerDetails.fullName, categoryName, res.priceRange, carpenter, overslagUrl, fullDetailsHtml),
                                        fromName: senderName,
                                        replyTo: carpenter?.email
                                    });
                                }
                            });
                        }
                    });
                }).catch(err => console.error("Kunne ikke sende email:", err));
            }

            setProjectData(prev => ({
                ...prev,
                calc_data: res.calcData,
                leadId: leadId
            }));

            setIsCalculating(false);
            setCurrentStep(projectData.category === 'extensions' ? 6 : 5);
        } catch (error) {
            console.error(error);
            import('react-hot-toast').then(toast => {
                toast.default.error(`Fejl: ${error.message || 'Ukendt fejl under beregning.'}. Prøv igen.`);
            });
            setIsCalculating(false);
        }
    };

    const resetWizard = () => {
        setCurrentStep(1);
        setProjectData({ category: null, details: {} });
        setNotes("");
    };

    const handleQuickRecalculate = () => {
        if (projectData.customerDetails) {
            calculateEstimate(projectData.customerDetails, true);
        }
    };

    if (isDbLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff' }}>
                <h2>Forbinder til systemet...</h2>
            </div>
        );
    }

    if (isCalculating) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff' }}>
                <div className="loading-spinner"></div>
                <h2>Venter på beregnet overslag...</h2>
                <p style={{ marginTop: '12px', color: '#94a3b8' }}>Samler prisrammer, materialer, og klargør logistik.</p>
            </div>
        );
    }

    const activeStepNum = currentStep === 'special_chat' ? 2 : currentStep;

    return (
        <main className="wizard-container" style={{ position: 'relative', paddingBottom: '40px' }}>
            {activeStepNum < 5 && (
                <div className="progress-section progress-steps-container" style={{ marginBottom: '32px', maxWidth: '800px', marginInline: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        <div className="progress-step-line" style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '3px', background: '#e2e8f0', zIndex: 0 }}>
                            <div style={{ width: `${(activeStepNum - 1) / (totalSteps - 1) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #2563eb)', transition: 'width 0.4s ease' }}></div>
                        </div>
                        {['Opgave', 'Detaljer', 'Billeder', 'Kontakt'].map((name, idx) => {
                            const stepNum = idx + 1;
                            const activeStepIndex = currentStep === 'special_chat' ? 2 : currentStep;
                            const isCompleted = activeStepIndex > stepNum;
                            const isActive = activeStepIndex === stepNum;
                            return (
                                <div key={name} className="progress-step-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative', background: 'transparent' }}>
                                    <div className="progress-step-circle" style={{ 
                                        width: '34px', height: '34px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        background: isCompleted ? '#10b981' : (isActive ? '#2563eb' : '#f1f5f9'),
                                        color: isCompleted || isActive ? 'white' : '#94a3b8',
                                        fontWeight: 'bold', fontSize: '0.95rem',
                                        border: `3px solid ${isCompleted ? '#10b981' : (isActive ? '#eff6ff' : '#f1f5f9')}`,
                                        boxShadow: isActive ? '0 0 0 3px #bfdbfe' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {isCompleted ? '✓' : stepNum}
                                    </div>
                                    <span className="progress-step-label" style={{ fontSize: '0.85rem', marginTop: '8px', color: isActive ? '#1e293b' : '#64748b', fontWeight: isActive ? '700' : '500' }}>{name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sticky Tømrer Profil for Steps 2-4 */}
            {activeStepNum > 1 && activeStepNum < 5 && (
                <div className="sticky-carpenter-profile" style={{ maxWidth: '800px', margin: '0 auto 24px auto', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                    <img className="sticky-carpenter-avatar" src={carpenter?.portrait_url || `https://ui-avatars.com/api/?name=${carpenter?.owner_name || 'Tømrer'}&background=0f172a&color=fff&size=250`} alt="Tømrer" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0 }} />
                    <div className="sticky-carpenter-details" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>Dit tilbud udarbejdes af:</span>
                        <span style={{ display: 'block', fontSize: '1.15rem', color: '#0f172a', fontWeight: '800', wordBreak: 'break-word' }}>{carpenter?.owner_name || 'Tømreren'} fra {carpenter?.company_name || 'Tømrerfirmaet'}</span>
                    </div>
                </div>
            )}

            {currentStep === 1 && <Step1Category projectData={projectData} updateCategory={updateCategory} disabledCategories={disabledCategories} carpenter={carpenter} />}
            {currentStep === 'special_chat' && (
                <ChatEstimator 
                    carpenter={carpenter} 
                    settingsData={dbSettings} 
                    materialsData={dbMaterials}
                    prevStep={prevStep}
                    onComplete={(aiData) => {
                        if (aiData.isStandardCategory) {
                            setProjectData({
                                category: aiData.category,
                                details: {
                                    ...aiData.formState,
                                    isAiExtracted: true,
                                    chatLog: aiData.chatLog,
                                    summaryBullets: aiData.summaryBullets,
                                    notes: aiData.obsNotes
                                }
                            });
                        } else {
                            setProjectData(prev => ({ ...prev, details: { ...prev.details, ...aiData } }));
                        }
                        if (aiData.isStandardCategory) {
                            toast.success("Jeg har udfyldt formularen baseret på vores snak. Tjek venligst om alt stemmer, og tryk 'Videre'!", { duration: 6000 });
                            setCurrentStep(2); // Rescue Guard: Vis kunden dataen i visual form for implicit godkendelse
                        } else {
                            setCurrentStep(3); // Gå til foto-upload for specialopgaver
                        }
                    }} 
                />
            )}
            {currentStep === 2 && <Step2Dynamic category={projectData.category} details={projectData.details} updateDetails={updateDetails} nextStep={nextStep} prevStep={prevStep} quickRecalculate={projectData.customerDetails ? handleQuickRecalculate : null} />}
            {currentStep === 3 && <Step3Photos category={projectData.category} photos={projectData.details.photos || []} setPhotos={(photos) => updateDetails('photos', photos)} notes={projectData.details.notes || ''} setNotes={(notes) => updateDetails('notes', notes)} nextStep={nextStep} prevStep={() => projectData.category === 'special' ? setCurrentStep('special_chat') : prevStep()} quickRecalculate={projectData.customerDetails ? handleQuickRecalculate : null} />}
            {currentStep === 4 && <Step4Contact calculateEstimate={calculateEstimate} prevStep={prevStep} prefillData={projectData.customerDetails} />}
            {currentStep === 5 && <StepResult projectData={projectData} notes={projectData.details.notes} priceRange={priceRange} breakdownArr={breakdownArr} resetWizard={resetWizard} nextStep={nextStep} carpenter={carpenter} isManualCreation={isManualCreation} onComplete={onComplete} editProject={() => setCurrentStep(projectData.category === 'special' ? 'special_chat' : 2)} />}
            {currentStep === 6 && <Step5Success resetWizard={resetWizard} carpenter={carpenter} />}

            <div style={{ position: 'absolute', bottom: '16px', left: '0', right: '0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                Overslaget er sikkert udarbejdet med platformen Bison Frame
            </div>
        </main>
    );
};

export default Wizard;
