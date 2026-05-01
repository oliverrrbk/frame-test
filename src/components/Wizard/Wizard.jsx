import React, { useState } from 'react';
import Step1Category from './Step1Category';
import Step2Dynamic from './Step2Dynamic';
import Step3Photos from './Step3Photos';
import Step4Contact from './Step4Contact';
import StepResult from './StepResult';
import Step5Success from './Step5Success';
import ChatEstimator from './ChatEstimator';
import { performCalculation } from '../../utils/calculator';
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
    }, []);
    
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
        setCurrentStep(prev => prev - 1);
    };

    const calculateEstimate = async (customerDetails) => {
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
            const res = await performCalculation(updatedProjectData, customerDetails, dbSettings, dbMaterials, carpenter);
            
            setPriceRange(res.priceRange);
            setBreakdownArr(res.breakdownArr);

            setProjectData(prev => ({
                ...prev,
                calc_data: res.calcData
            }));

            setIsCalculating(false);
            setCurrentStep(5);
        } catch (error) {
            console.error(error);
            setIsCalculating(false);
        }
    };

    const resetWizard = () => {
        setCurrentStep(1);
        setProjectData({ category: null, details: {} });
        setNotes("");
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

    return (
        <main className="wizard-container">
            {currentStep < 5 && (
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            )}

            {currentStep === 1 && <Step1Category projectData={projectData} updateCategory={updateCategory} disabledCategories={disabledCategories} carpenter={carpenter} />}
            {currentStep === 'special_chat' && (
                <ChatEstimator 
                    carpenter={carpenter} 
                    settingsData={dbSettings} 
                    materialsData={dbMaterials}
                    onComplete={(aiData) => {
                        setProjectData(prev => ({ ...prev, details: { ...prev.details, ...aiData } }));
                        setCurrentStep(3); // Gå til foto-upload
                    }} 
                />
            )}
            {currentStep === 2 && <Step2Dynamic category={projectData.category} details={projectData.details} updateDetails={updateDetails} nextStep={nextStep} prevStep={prevStep} />}
            {currentStep === 3 && <Step3Photos category={projectData.category} photos={projectData.details.photos || []} setPhotos={(photos) => updateDetails('photos', photos)} notes={projectData.details.notes || ''} setNotes={(notes) => updateDetails('notes', notes)} nextStep={nextStep} prevStep={() => projectData.category === 'special' ? setCurrentStep('special_chat') : prevStep()} />}
            {currentStep === 4 && <Step4Contact calculateEstimate={calculateEstimate} prevStep={prevStep} />}
            {currentStep === 5 && <StepResult projectData={projectData} notes={projectData.details.notes} priceRange={priceRange} breakdownArr={breakdownArr} resetWizard={resetWizard} nextStep={nextStep} carpenter={carpenter} isManualCreation={isManualCreation} onComplete={onComplete} />}
            {currentStep === 6 && <Step5Success resetWizard={resetWizard} carpenter={carpenter} />}
        </main>
    );
};

export default Wizard;
