import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Step1Category from './Step1Category';
import Step2Dynamic from './Step2Dynamic';
import Step3Photos from './Step3Photos';
import Step4Contact from './Step4Contact';
import StepResult from './StepResult';
import Step5Success from './Step5Success';
import ChatEstimator from './ChatEstimator';
import AiSupportWidget from './AiSupportWidget';
import { QUESTIONS } from './questionsConfig';
import { performCalculation } from '../../utils/calculator';
import { fetchCalibrationFactor } from '../../utils/calibration';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const Wizard = ({ carpenter, isManualCreation = false, onComplete = null }) => {
    const [projectData, setProjectData] = useState({
        category: null,
        details: {},
    });
    const [projects, setProjects] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();

    const handleAddAnotherProject = () => {
        if (!isStep2Valid()) {
            toast.error('Udfyld venligst alle obligatoriske felter under detaljer først.');
            return;
        }
        
        const newProject = {
            id: crypto.randomUUID(),
            category: projectData.category,
            details: { ...projectData.details }
        };
        
        setProjects(prev => [...prev, newProject]);
        setProjectData({
            category: null,
            details: {}
        });
        
        toast.success('Opgaven er tilføjet til dit Kombi-projekt. Vælg nu den næste opgave!');
        goToStep(1);
    };

    const handleUpdateProjectPhotosAndNotes = (id, updatedData) => {
        if (id === 'active') {
            setProjectData(prev => ({
                ...prev,
                details: {
                    ...prev.details,
                    photos: updatedData.photos,
                    notes: updatedData.notes
                }
            }));
        } else {
            setProjects(prev => prev.map(p => p.id === id ? {
                ...p,
                details: {
                    ...p.details,
                    photos: updatedData.photos,
                    notes: updatedData.notes
                }
            } : p));
        }
    };

    const stepToParam = {
        1: 'opgave',
        2: 'detaljer',
        3: 'billeder',
        4: 'kontakt',
        'special_chat': 'chat',
        5: 'result',
        6: 'success'
    };

    const paramToStep = {
        'opgave': 1,
        'detaljer': 2,
        'billeder': 3,
        'kontakt': 4,
        'chat': 'special_chat',
        'result': 5,
        'success': 6
    };

    const isStep2Valid = () => {
        const category = projectData.category;
        if (!category) return false;
        if (category === 'special') return true;
        
        const questionsForCategory = QUESTIONS[category] || [];
        const details = projectData.details || {};
        
        const isVisible = (condition) => {
            if (!condition) return true;
            if (typeof condition === 'function') {
                return condition(details);
            }
            let visible = true;
            if (condition.field) {
                visible = visible && details[condition.field] === condition.value;
            }
            if (condition.field2) {
                visible = visible && details[condition.field2] === condition.value2;
            }
            if (condition.notField2) {
                 visible = visible && details[condition.notField2] !== condition.notValue2;
            }
            return visible;
        };

        const visibleQuestions = questionsForCategory.filter(q => isVisible(q.condition));
        
        const missingField = visibleQuestions.find(q => {
            if (q.type === 'textarea' || q.type === 'file' || q.type === 'checkbox') return false;
            
            const value = details[q.id];

            if (q.type === 'window_configurator') {
                if (!value || value.length === 0) return true;
                for (let i = 0; i < value.length; i++) {
                    const w = value[i];
                    if (!w || !w.photoInside || !w.photoOutside || !w.width || !w.height || !w.count || w.count < 1) {
                        return true;
                    }
                }
                return false;
            }

            return value === undefined || value === null || value === '';
        });

        return !missingField;
    };

    const canAccessStepNumber = (stepNum) => {
        if (stepNum === 1) return true;
        if (stepNum === 2) return !!projectData.category;
        if (stepNum === 3 || stepNum === 4) return !!projectData.category && isStep2Valid();
        return false;
    };

    const goToStep = (step) => {
        const param = stepToParam[step] || 'opgave';
        setSearchParams({ step: param });
    };

    const handleStepClick = (stepNum) => {
        if (stepNum === 1) {
            goToStep(1);
        } else if (stepNum === 2) {
            if (projectData.category) {
                goToStep(2);
            } else {
                toast.error('Du skal vælge et byggeprojekt først.');
            }
        } else if (stepNum === 3 || stepNum === 4) {
            if (!projectData.category) {
                toast.error('Du skal vælge et byggeprojekt først.');
            } else if (!isStep2Valid()) {
                toast.error('Udfyld venligst alle obligatoriske felter under detaljer først.');
            } else {
                goToStep(stepNum);
            }
        }
    };
    
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
        const stepParam = searchParams.get('step');
        if (!stepParam) {
            if (currentStep !== 1) setCurrentStep(1);
            return;
        }
        
        const mappedStep = paramToStep[stepParam] || 1;
        
        if (mappedStep !== 1 && !projectData.category) {
            setSearchParams({ step: 'opgave' }, { replace: true });
            return;
        }

        if ((mappedStep === 3 || mappedStep === 4) && !isStep2Valid()) {
            setSearchParams({ step: 'detaljer' }, { replace: true });
            return;
        }

        if (currentStep !== mappedStep) {
            setCurrentStep(mappedStep);
        }
    }, [searchParams, projectData.category, projectData.details]);

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
    
    const [notes, setNotes] = useState("");
    const [priceRange, setPriceRange] = useState("-- kr.");
    const [breakdownArr, setBreakdownArr] = useState([]);

    const totalSteps = 4;
    const progressPercentage = (currentStep / totalSteps) * 100;

    const updateCategory = (category) => {
        if (category === 'special') {
            setProjectData({ category, details: { isAiEstimate: true } });
            setTimeout(() => {
                goToStep('special_chat');
            }, 300);
            return;
        }

        let defaultDetails = {};
        if (category === 'windows' || category === 'doors') {
            defaultDetails = { amount: 1, finish: 'yes', material: category === 'windows' ? 'Træ' : 'Massivt træ' };
        } else if (category === 'floor') {
            defaultDetails = { amount: 20, finish: 'yes', material: 'laminat' };
        } else {
            defaultDetails = { amount: 30, material: '' };
        }
        
        setProjectData({
            category,
            details: defaultDetails
        });
        
        setTimeout(() => {
            goToStep(2);
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
        const next = typeof currentStep === 'number' ? currentStep + 1 : 1;
        goToStep(next);
    };

    const prevStep = () => {
        if (currentStep === 'special_chat') {
            goToStep(1);
        } else {
            const prev = typeof currentStep === 'number' ? currentStep - 1 : 1;
            goToStep(prev);
        }
    };

    const calculateEstimate = async (customerDetails, isUpdateContext = false) => {
        setIsCalculating(true);
        
        const isKombi = projects.length > 0;
        
        // Sørg for at latest data er i projectData objektet inden det sendes afsted
        const updatedProjectData = isKombi ? {
            category: 'Kombi-projekt',
            projects: [...projects, { id: 'active', category: projectData.category, details: projectData.details }],
            customerDetails,
            leadId: projectData.leadId
        } : {
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
                ? getKombiTitle(updatedProjectData.projects)
                : (categoryMap[updatedProjectData.category] || updatedProjectData.category);

            const isFastTrack = isKombi 
                ? res.priceRange === 'Besigtigelse kræves'
                : ['extensions', 'carport', 'kitchen'].includes(updatedProjectData.category) || 
                    (updatedProjectData.category === 'annex' && (
                        updatedProjectData.details?.annexType === 'Isoleret skur/værksted' || 
                        updatedProjectData.details?.annexType === 'Fuldt beboeligt anneks' || 
                        parseFloat(updatedProjectData.details?.amount) > 12
                    ));

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
                        contact_preference: isFastTrack ? 'Hurtigst muligt' : 'Afventer accept',
                        raw_data: { ...updatedProjectData, calc_data: res.calcData },
                        carpenter_id: carpenter?.id || null,
                        status: isFastTrack ? 'Ny forespørgsel' : 'Overslag (Afventer)'
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
                            if (isFastTrack) {
                                // Fast-track flow for extensions, carport, kitchen and complex annex
                                import('../../utils/emailTemplates').then(({ getCustomerFastTrackTemplate, getCarpenterNewRequestTemplate }) => {
                                    const notesText = updatedProjectData.details?.notes || '';
                                    
                                    const sendCarpenterNotification = (detailsHtml) => {
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
                                                    detailsHtml, 
                                                    '', 
                                                    'Hurtigst muligt'
                                                ),
                                                fromName: customerDetails.fullName,
                                                replyTo: customerDetails.email
                                            });
                                        }
                                    };

                                     if (updatedProjectData.category === 'annex' || updatedProjectData.category === 'Kombi-projekt') {
                                         import('../../utils/taskDescription').then(({ generateTaskAndQaHtml }) => {
                                             const detailsHtml = generateTaskAndQaHtml(updatedProjectData, true);
                                             sendCarpenterNotification(detailsHtml);
                                         });
                                     } else {
                                        const detailsHtml = `
                                            <li style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                                                <strong style="display: block; color: #0f172a; margin-bottom: 4px;">Kundens beskrivelse:</strong>
                                                <span style="color: #334155; white-space: pre-wrap;">${notesText}</span>
                                            </li>
                                        `;
                                        sendCarpenterNotification(detailsHtml);
                                    }
                                    
                                    // Send to customer
                                    sendEmail({
                                        to: customerDetails.email,
                                        subject: `Vi har modtaget din forespørgsel - ${carpenterCompanyName}`,
                                        html: getCustomerFastTrackTemplate(customerDetails.fullName, categoryName, carpenter, notesText),
                                        fromName: senderName,
                                        replyTo: carpenter?.email
                                    });
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
            goToStep(isFastTrack ? 6 : 5);
        } catch (error) {
            console.error(error);
            import('react-hot-toast').then(toast => {
                toast.default.error(`Fejl: ${error.message || 'Ukendt fejl under beregning.'}. Prøv igen.`);
            });
            setIsCalculating(false);
        }
    };

    const resetWizard = () => {
        setProjectData({ category: null, details: {} });
        setNotes("");
        goToStep(1);
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
                            const isClickable = canAccessStepNumber(stepNum);
                            return (
                                <div 
                                    key={name} 
                                    className="progress-step-item" 
                                    onClick={() => handleStepClick(stepNum)}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        zIndex: 1, 
                                        position: 'relative', 
                                        background: 'transparent',
                                        cursor: isClickable ? 'pointer' : 'not-allowed',
                                        opacity: isClickable ? 1 : 0.65,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div 
                                        className="progress-step-circle" 
                                        style={{ 
                                            width: '34px', height: '34px', borderRadius: '50%', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            background: isCompleted ? '#10b981' : (isActive ? '#2563eb' : '#f1f5f9'),
                                            color: isCompleted || isActive ? 'white' : '#94a3b8',
                                            fontWeight: 'bold', fontSize: '0.95rem',
                                            border: `3px solid ${isCompleted ? '#10b981' : (isActive ? '#eff6ff' : '#f1f5f9')}`,
                                            boxShadow: isActive ? '0 0 0 3px #bfdbfe' : 'none',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => { if (isClickable) e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseOut={(e) => { if (isClickable) e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
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

            {currentStep === 1 && <Step1Category projectData={projectData} updateCategory={updateCategory} disabledCategories={disabledCategories} carpenter={carpenter} projects={projects} />}
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
                            toast.success("Vi har udfyldt formularen baseret på vores snak. Tjek venligst om alt stemmer, og tryk 'Videre'!", { duration: 6000 });
                            goToStep(2); // Rescue Guard: Vis kunden dataen i visual form for implicit godkendelse
                        } else {
                            goToStep(3); // Gå til foto-upload for specialopgaver
                        }
                    }} 
                />
            )}
            {currentStep === 2 && <Step2Dynamic category={projectData.category} details={projectData.details} updateDetails={updateDetails} nextStep={nextStep} prevStep={prevStep} quickRecalculate={projectData.customerDetails ? handleQuickRecalculate : null} onAddAnotherProject={projectData.category !== 'special' ? handleAddAnotherProject : null} />}
            {currentStep === 3 && <Step3Photos category={projectData.category} photos={projectData.details.photos || []} setPhotos={(photos) => updateDetails('photos', photos)} notes={projectData.details.notes || ''} setNotes={(notes) => updateDetails('notes', notes)} nextStep={nextStep} prevStep={() => projectData.category === 'special' ? goToStep('special_chat') : prevStep()} quickRecalculate={projectData.customerDetails ? handleQuickRecalculate : null} allProjects={projects.length > 0 ? [...projects, { id: 'active', category: projectData.category, details: projectData.details }] : null} onUpdateProject={handleUpdateProjectPhotosAndNotes} />}
            {currentStep === 4 && <Step4Contact calculateEstimate={calculateEstimate} prevStep={prevStep} prefillData={projectData.customerDetails} />}
            {currentStep === 5 && <StepResult projectData={projectData} notes={projectData.details?.notes || ''} priceRange={priceRange} breakdownArr={breakdownArr} resetWizard={resetWizard} nextStep={nextStep} carpenter={carpenter} isManualCreation={isManualCreation} onComplete={onComplete} editProject={() => goToStep(projectData.category === 'special' ? 'special_chat' : 2)} />}
            {currentStep === 6 && <Step5Success resetWizard={resetWizard} carpenter={carpenter} />}

            <AiSupportWidget 
                carpenter={carpenter} 
                currentStep={currentStep} 
                projectData={projectData} 
                projects={projects} 
            />

            <div style={{ position: 'absolute', bottom: '16px', left: '0', right: '0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                Overslaget er sikkert udarbejdet med platformen Bison Frame
            </div>
        </main>
    );
};

export default Wizard;
