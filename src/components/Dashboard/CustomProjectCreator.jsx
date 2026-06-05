import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, Save, X, Plus, Search, Trash2, Cpu, FileText } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { MATERIAL_INDEX } from '../../prices';
import toast from 'react-hot-toast';

const CustomProjectCreator = ({ carpenter, onComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [viewMode, setViewMode] = useState('selection'); // 'selection', 'notepad', 'editor'
    const [notepadText, setNotepadText] = useState('');
    
    // Voice Recording Refs
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    
    // Customer Details
    const [customerInfo, setCustomerInfo] = useState({
        name: '', address: '', zip: '', city: '', phone: '', email: ''
    });
    
    // Project Details
    const [projectTitle, setProjectTitle] = useState('');
    const [projectNotes, setProjectNotes] = useState('');
    const [hourlyRate, setHourlyRate] = useState(carpenter?.hourly_rate || 550);
    
    // Global Costs (Entreprenøromkostninger)
    const [globalCosts, setGlobalCosts] = useState({
        containers: 0,
        scaffolding: 0,
        invisibleMaterials: 0,
        transportHours: 0
    });
    
    // Phases (Etaper)
    const [phases, setPhases] = useState([
        { id: crypto.randomUUID(), name: 'Etape 1: Generelt', hours: '', materials: [] }
    ]);
    
    // Auto-complete / Combo box state
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(null); // { phaseIndex, matIndex } eller null
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        // Flatten MATERIAL_INDEX for search
        const allMats = [];
        Object.entries(MATERIAL_INDEX).forEach(([catKey, itemsObj]) => {
            Object.entries(itemsObj).forEach(([itemKey, itemPrice]) => {
                // Determine a sensible default unit based on name
                let defaultUnit = 'stk';
                const lowerName = itemKey.toLowerCase();
                if (lowerName.includes('m2') || lowerName.includes('m²')) defaultUnit = 'm2';
                else if (lowerName.includes('løbende meter') || lowerName.includes('lm')) defaultUnit = 'lm';
                else if (lowerName.includes('time')) defaultUnit = 'timer';
                
                allMats.push({
                    id: `${catKey}_${itemKey}`,
                    name: itemKey,
                    price: typeof itemPrice === 'number' ? itemPrice : 0,
                    unit: defaultUnit,
                    markup: carpenter?.material_markup || 30
                });
            });
        });
        setSuggestions(allMats);
    }, [carpenter]);

    const handleAddPhase = () => {
        setPhases([...phases, { id: crypto.randomUUID(), name: `Etape ${phases.length + 1}`, hours: '', materials: [] }]);
    };

    const handleRemovePhase = (phaseIndex) => {
        const newPhases = [...phases];
        newPhases.splice(phaseIndex, 1);
        setPhases(newPhases);
    };

    const updatePhase = (phaseIndex, field, value) => {
        const newPhases = [...phases];
        newPhases[phaseIndex][field] = value;
        setPhases(newPhases);
    };

    const handleAddMaterialRow = (phaseIndex) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].materials.push({ name: '', quantity: 1, unit: 'stk', price: 0, markup: carpenter?.material_markup || 30 });
        setPhases(newPhases);
    };

    const handleRemoveMaterial = (phaseIndex, matIndex) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].materials.splice(matIndex, 1);
        setPhases(newPhases);
    };

    const updateMaterial = (phaseIndex, matIndex, field, value) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].materials[matIndex][field] = value;
        setPhases(newPhases);
    };

    const selectSuggestion = (phaseIndex, matIndex, suggestion) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].materials[matIndex].name = suggestion.name;
        newPhases[phaseIndex].materials[matIndex].price = suggestion.price;
        newPhases[phaseIndex].materials[matIndex].unit = suggestion.unit;
        newPhases[phaseIndex].materials[matIndex].markup = suggestion.markup;
        setPhases(newPhases);
        setShowSuggestions(null);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            // Stop optagelse
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            setIsProcessingAI(true);
            toast("Transskriberer din tale...", { icon: '⚙️' });
            
        } else {
            // Start optagelse
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    // Frigiv mikrofonen
                    stream.getTracks().forEach(track => track.stop());
                    
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice.webm');
                    formData.append('mode', 'transcribe');

                    try {
                        const response = await fetch('/api/process-voice', {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) throw new Error('Netværksfejl ved kald til AI');

                        const result = await response.json();
                        
                        if (result.error) {
                            throw new Error(result.error);
                        }

                        // Opdater notesblokken
                        setNotepadText(prev => prev + (prev ? ' ' : '') + result.transcription);
                        toast.success("Tale indsat!");
                    } catch (error) {
                        console.error('AI Processing Error:', error);
                        toast.error("Kunne ikke behandle tale: " + error.message);
                    } finally {
                        setIsProcessingAI(false);
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
                toast("Optager... (Snak nu)", { icon: '🎙️' });
            } catch (err) {
                console.error("Mikrofon fejl:", err);
                toast.error("Kunne ikke få adgang til mikrofonen. Tjek tilladelser.");
            }
        }
    };

    const handleStructureAI = async () => {
        if (!notepadText.trim()) {
            toast.error("Du skal skrive eller indtale noget først.");
            return;
        }
        
        setIsProcessingAI(true);
        toast.loading("AI bygger tilbuddet...", { id: "structuring" });
        
        const formData = new FormData();
        formData.append('mode', 'structure');
        formData.append('text', notepadText);

        try {
            const response = await fetch('/api/process-voice', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Netværksfejl ved strukturering');
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);

            setProjectTitle(result.title || '');
            setProjectNotes(result.notes || '');
            setAiSummary(`Kilde-noter:\n${notepadText}`);
            
            if (result.phases && result.phases.length > 0) {
                const mappedPhases = result.phases.map((p, pIndex) => {
                    const mappedMats = (p.materials || []).map(m => {
                        const foundMat = suggestions.find(s => s.name.toLowerCase() === m.name?.toLowerCase());
                        return {
                            name: m.name || '',
                            quantity: m.quantity || 1,
                            unit: m.unit || foundMat?.unit || 'stk',
                            price: m.price || foundMat?.price || 0,
                            markup: foundMat?.markup || carpenter?.material_markup || 30
                        };
                    });
                    return {
                        id: crypto.randomUUID(),
                        name: p.name || `Etape ${pIndex + 1}`,
                        hours: p.hours ? p.hours.toString() : '',
                        materials: mappedMats
                    };
                });
                setPhases(mappedPhases);
            }
            
            if (result.global_costs) {
                setGlobalCosts({
                    containers: result.global_costs.containers || 0,
                    scaffolding: result.global_costs.scaffolding || 0,
                    invisibleMaterials: result.global_costs.invisible_materials || 0,
                    transportHours: result.global_costs.transport_hours || 0
                });
            }
            
            toast.success("Tilbud bygget!", { id: "structuring" });
            setViewMode('editor');
        } catch (error) {
            console.error('AI Structuring Error:', error);
            toast.error("Kunne ikke strukturere: " + error.message, { id: "structuring" });
        } finally {
            setIsProcessingAI(false);
        }
    };

    const calculateTotals = () => {
        let totalMatCost = 0;
        let totalMatSales = 0;
        let sumHours = 0;
        
        phases.forEach(p => {
            sumHours += (parseFloat(p.hours) || 0);
            p.materials.forEach(m => {
                const cost = (parseFloat(m.price) || 0) * (parseFloat(m.quantity) || 0);
                const markupObj = 1 + ((parseFloat(m.markup) || 0) / 100);
                totalMatCost += cost;
                totalMatSales += (cost * markupObj);
            });
        });

        const laborSales = sumHours * (parseFloat(hourlyRate) || 0);
        
        // Globale Omkostninger
        const globalContainers = parseFloat(globalCosts.containers) || 0;
        const containerCost = globalContainers * 2500; // Fast pris, ingen avance (SOP #4)

        const globalScaffolding = parseFloat(globalCosts.scaffolding) || 0;
        const scaffoldMarkup = 1 + ((carpenter?.equipment_markup || 5) / 100);
        const scaffoldSales = globalScaffolding * scaffoldMarkup;

        const globalInvMats = parseFloat(globalCosts.invisibleMaterials) || 0;
        const invMatsMarkup = 1 + ((carpenter?.material_markup || 30) / 100);
        const invMatsSales = globalInvMats * invMatsMarkup;

        const globalTransportHours = parseFloat(globalCosts.transportHours) || 0;
        const transportSales = globalTransportHours * (parseFloat(hourlyRate) || 0);

        return {
            totalCost: totalMatCost + containerCost + globalScaffolding + globalInvMats,
            totalSales: totalMatSales + laborSales + containerCost + scaffoldSales + invMatsSales + transportSales,
            laborSales: laborSales + transportSales,
            materialsSales: totalMatSales + containerCost + scaffoldSales + invMatsSales,
            totalHours: sumHours + globalTransportHours
        };
    };

    const handleSaveProject = async () => {
        if (!customerInfo.name) {
            toast.error("Kundenavn er påkrævet.");
            return;
        }

        const totals = calculateTotals();

        // Byg "Breakdown" format som wizard'en gør det
        const breakdownArr = [];
        
        phases.forEach(p => {
            p.materials.forEach(m => {
                const cost = (parseFloat(m.price) || 0) * (parseFloat(m.quantity) || 0);
                const markupObj = 1 + ((parseFloat(m.markup) || 0) / 100);
                const sales = cost * markupObj;
                
                breakdownArr.push({
                    id: crypto.randomUUID(),
                    category: p.name, // Brug etapenavnet som kategori i oversigten
                    text: `${m.quantity} ${m.unit} x ${m.name}`,
                    materialCost: cost,
                    profitTotal: sales - cost,
                    hours: 0
                });
            });

            // Add labor line for this phase
            if (parseFloat(p.hours) > 0) {
                breakdownArr.push({
                    id: crypto.randomUUID(),
                    category: p.name,
                    text: `Håndværker timer`,
                    materialCost: 0,
                    profitTotal: 0,
                    hours: parseFloat(p.hours)
                });
            }
        });

        // Tilføj Globale Omkostninger til Breakdown
        if (parseFloat(globalCosts.containers) > 0) {
            const count = parseFloat(globalCosts.containers);
            breakdownArr.push({
                id: crypto.randomUUID(),
                category: 'Tillæg & Udstyr',
                text: `${count}x Containerleje og bortskaffelse (Uden avance)`,
                materialCost: count * 2500,
                profitTotal: 0,
                hours: 0
            });
        }
        if (parseFloat(globalCosts.scaffolding) > 0) {
            const cost = parseFloat(globalCosts.scaffolding);
            const markup = 1 + ((carpenter?.equipment_markup || 5) / 100);
            breakdownArr.push({
                id: crypto.randomUUID(),
                category: 'Tillæg & Udstyr',
                text: `Lift / Stilladsleje`,
                materialCost: cost,
                profitTotal: (cost * markup) - cost,
                hours: 0
            });
        }
        if (parseFloat(globalCosts.invisibleMaterials) > 0) {
            const cost = parseFloat(globalCosts.invisibleMaterials);
            const markup = 1 + ((carpenter?.material_markup || 30) / 100);
            breakdownArr.push({
                id: crypto.randomUUID(),
                category: 'Tillæg & Udstyr',
                text: `Tømrer-beskyttelse (Skruer, fuge, lim, beslag, kiler)`,
                materialCost: cost,
                profitTotal: (cost * markup) - cost,
                hours: 0
            });
        }
        if (parseFloat(globalCosts.transportHours) > 0) {
            breakdownArr.push({
                id: crypto.randomUUID(),
                category: 'Tillæg & Udstyr',
                text: `Kørsel / Transport`,
                materialCost: 0,
                profitTotal: 0,
                hours: parseFloat(globalCosts.transportHours)
            });
        }

        const customLines = [];
        if (parseFloat(globalCosts.containers) > 0) {
            customLines.push({
                description: `${parseFloat(globalCosts.containers)}x Containerleje og bortskaffelse (Uden avance)`,
                price: parseFloat(globalCosts.containers) * 2500
            });
        }
        if (parseFloat(globalCosts.scaffolding) > 0) {
            const cost = parseFloat(globalCosts.scaffolding);
            const markup = 1 + ((carpenter?.equipment_markup || 5) / 100);
            customLines.push({
                description: `Lift / Stilladsleje`,
                price: cost * markup
            });
        }
        if (parseFloat(globalCosts.invisibleMaterials) > 0) {
            const cost = parseFloat(globalCosts.invisibleMaterials);
            const markup = 1 + ((carpenter?.material_markup || 30) / 100);
            customLines.push({
                description: `Tømrer-beskyttelse (Skruer, fuge, lim mv.)`,
                price: cost * markup
            });
        }

        let phaseMaterialsCost = 0;
        let phaseMaterialsSales = 0;
        phases.forEach(p => {
            p.materials.forEach(m => {
                const cost = (parseFloat(m.price) || 0) * (parseFloat(m.quantity) || 0);
                const markupObj = 1 + ((parseFloat(m.markup) || 0) / 100);
                phaseMaterialsCost += cost;
                phaseMaterialsSales += (cost * markupObj);
            });
        });

        const effectiveMaterialMarkup = phaseMaterialsCost > 0 ? (phaseMaterialsSales / phaseMaterialsCost) : 1;

        const payload = {
            customer_name: customerInfo.name,
            customer_address: customerInfo.address,
            customer_zip: customerInfo.zip,
            customer_city: customerInfo.city,
            customer_email: customerInfo.email || 'Ukendt',
            customer_phone: customerInfo.phone || 'Ukendt',
            status: 'Ny forespørgsel',
            project_category: 'special',
            details: { 
                title: projectTitle || 'Skræddersyet Opgave',
                notes: projectNotes,
                ai_summary: aiSummary,
                phases: phases
            },
            calc_data: { 
                breakdown: breakdownArr, 
                totals: { min: totals.totalSales, max: totals.totalSales },
                laborHours: totals.totalHours,
                hourlyRate: parseFloat(hourlyRate) || 0,
                materialCostBase: phaseMaterialsCost,
                materialMarkup: effectiveMaterialMarkup,
                materialCost: phaseMaterialsSales,
                customLines: customLines,
                drivingCost: 0,
                extraMaterialsCost: 0
            },
            actual_quote_price: totals.totalSales,
            carpenter_id: carpenter?.id || null,
            assigned_to: carpenter?.id || null
        };

        try {
            toast.loading("Opretter skræddersyet sag...", { id: "save_custom" });
            const { data, error } = await supabase.from('leads').insert([payload]).select();
            if (error) throw error;
            
            toast.success("Sagen er oprettet!", { id: "save_custom" });
            if (onComplete) onComplete(data[0]);
        } catch (err) {
            console.error("Fejl:", err);
            toast.error("Kunne ikke oprette sagen: " + err.message, { id: "save_custom" });
        }
    };

    const totals = calculateTotals();

    return (
        <div style={{ padding: '0px', backgroundColor: '#f8fafc', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={24} color="#10b981" /> Skræddersyet Opgave
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Indtal dine noter eller opret en sag manuelt fra bunden.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {viewMode === 'editor' && (
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Live Total (ekskl. moms)</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{totals.totalSales.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</span>
                        </div>
                    )}
                    {viewMode === 'editor' && <div style={{ height: '40px', width: '1px', backgroundColor: '#e2e8f0' }}></div>}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onCancel} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>Annuller</button>
                        <button onClick={handleSaveProject} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }}>
                            <Save size={18} /> Gem & Opret Tilbud
                        </button>
                    </div>
                </div>
            </div>

            <div className="custom-project-main" style={{ padding: '32px' }}>
                
                {/* VIEW: SELECTION */}
                {viewMode === 'selection' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                        <h3 style={{ margin: '0 0 40px 0', fontSize: '1.5rem', color: '#1e293b' }}>Hvordan vil du starte opgaven?</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', width: '100%', maxWidth: '800px' }}>
                            <div 
                                onClick={() => setViewMode('notepad')}
                                style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#10b981'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                <div style={{ width: '80px', height: '80px', backgroundColor: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
                                    <Mic size={40} />
                                </div>
                                <h4 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0 0 12px 0' }}>Brug AI Notesblok</h4>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                                    Skriv eller diktér dine noter direkte ind i appen, og lad AI'en bygge det fulde tilbud og opdele i etaper for dig.
                                </p>
                            </div>
                            
                            <div 
                                onClick={() => setViewMode('editor')}
                                style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                <div style={{ width: '80px', height: '80px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#3b82f6' }}>
                                    <FileText size={40} />
                                </div>
                                <h4 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0 0 12px 0' }}>Opret manuelt fra bunden</h4>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                                    Gå direkte til tabellerne, opret dine egne etaper og slå materialer op i databasen fra bunden af.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: NOTEPAD */}
                {viewMode === 'notepad' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} color="#10b981" /> Den Magiske Notesblok
                                </h3>
                                <button onClick={() => setViewMode('editor')} style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer' }}>
                                    Spring over og byg manuelt
                                </button>
                            </div>
                            
                            <textarea 
                                value={notepadText}
                                onChange={e => setNotepadText(e.target.value)}
                                placeholder="Start med at skrive dine noter her... eller tryk på mikrofonen i bunden for at diktere dem..."
                                style={{ width: '100%', minHeight: '300px', padding: '20px', fontSize: '1.1rem', lineHeight: '1.6', borderRadius: '12px', border: '1px solid #e2e8f0', resize: 'vertical', backgroundColor: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <button 
                                        onClick={!isProcessingAI ? toggleRecording : null}
                                        style={{ 
                                            width: '60px', height: '60px', 
                                            borderRadius: '50%', 
                                            backgroundColor: isRecording ? '#ef4444' : (isProcessingAI ? '#f1f5f9' : '#10b981'),
                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            cursor: isProcessingAI ? 'not-allowed' : 'pointer',
                                            border: 'none',
                                            color: '#fff',
                                            boxShadow: isRecording ? '0 0 0 6px rgba(239, 68, 68, 0.2)' : '0 4px 10px rgba(16, 185, 129, 0.2)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {isProcessingAI ? <Loader2 size={24} className="animate-spin" color="#64748b" /> : 
                                         isRecording ? <MicOff size={24} /> : 
                                         <Mic size={24} />}
                                    </button>
                                    <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
                                        {isProcessingAI ? 'Transskriberer...' : (isRecording ? 'Optager...' : 'Tryk for at diktere')}
                                    </span>
                                </div>
                                
                                <button 
                                    onClick={handleStructureAI}
                                    disabled={isProcessingAI || isRecording}
                                    style={{ padding: '12px 24px', background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: (isProcessingAI || isRecording) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isProcessingAI || isRecording) ? 0.7 : 1 }}
                                >
                                    {isProcessingAI ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />} 
                                    Omdan noter til Tilbud (AI)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: EDITOR */}
                {viewMode === 'editor' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Customer Info Card */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Kundeinformation</h3>
                        <div className="customer-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Kundenavn *</label>
                                <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="F.eks. Jens Hansen" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Telefon</label>
                                <input type="text" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="Tlf. nr." className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} placeholder="Email adresse" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Adresse</label>
                                <input type="text" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} placeholder="Vej og nummer" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Postnummer</label>
                                <input type="text" value={customerInfo.zip} onChange={e => setCustomerInfo({...customerInfo, zip: e.target.value})} placeholder="Postnr." className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>By</label>
                                <input type="text" value={customerInfo.city} onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})} placeholder="By" className="modern-input" />
                            </div>
                        </div>
                    </div>

                    {/* Phases rendering */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {phases.map((phase, pIndex) => (
                            <div key={phase.id} className="phase-card">
                                
                                {/* Phase Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 20px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                    <div style={{ width: '40%' }}>
                                        <input 
                                            type="text" 
                                            value={phase.name} 
                                            onChange={e => updatePhase(pIndex, 'name', e.target.value)} 
                                            placeholder="Etapenavn (f.eks. Råhus)"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid transparent', borderRadius: '6px', color: '#1e293b' }}
                                            onFocus={e => e.target.style.border = '1px solid #e2e8f0'}
                                            onBlur={e => e.target.style.border = '1px solid transparent'}
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontSize: '0.9rem', color: '#64748b' }}>Timer:</label>
                                            <input 
                                                type="number" 
                                                value={phase.hours} 
                                                onChange={e => updatePhase(pIndex, 'hours', e.target.value)}
                                                placeholder="0"
                                                className="modern-input"
                                                style={{ width: '80px', textAlign: 'right', padding: '6px 10px' }}
                                            />
                                        </div>
                                        {phases.length > 1 && (
                                            <button onClick={() => handleRemovePhase(pIndex)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Phase Materials */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>Materialer til etapen</h4>
                                        <button onClick={() => handleAddMaterialRow(pIndex)} style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Plus size={14} /> Tilføj
                                        </button>
                                    </div>

                                    {phase.materials.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                                            Ingen materialer.
                                        </div>
                                    ) : (
                                        <div className="material-table-container">
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '40%' }}>Beskrivelse</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Antal</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Indkøb</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Avance %</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '10%' }}>I alt</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '5%' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {phase.materials.map((mat, matIndex) => (
                                                    <tr key={matIndex} className="material-row">
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <input 
                                                                    type="text" 
                                                                    value={mat.name} 
                                                                    onChange={e => updateMaterial(pIndex, matIndex, 'name', e.target.value)}
                                                                    onFocus={() => setShowSuggestions({ pIndex, matIndex })}
                                                                    onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                                                    placeholder="Søg i database..."
                                                                    className="modern-input"
                                                                    style={{ padding: '6px 10px' }}
                                                                />
                                                                {showSuggestions?.pIndex === pIndex && showSuggestions?.matIndex === matIndex && mat.name.length > 1 && (
                                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                                        {suggestions.filter(s => s.name.toLowerCase().includes(mat.name.toLowerCase())).slice(0, 5).map(s => (
                                                                            <div 
                                                                                key={s.id} 
                                                                                onClick={() => selectSuggestion(pIndex, matIndex, s)}
                                                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <span style={{ fontWeight: '500', color: '#1e293b' }}>{s.name}</span>
                                                                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{s.price} kr/{s.unit}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '6px 8px', display: 'flex', gap: '4px' }}>
                                                            <input type="number" min="0" step="0.1" value={mat.quantity} onChange={e => updateMaterial(pIndex, matIndex, 'quantity', e.target.value)} className="modern-input" style={{ width: '60%', padding: '6px 10px' }} />
                                                            <input type="text" value={mat.unit} onChange={e => updateMaterial(pIndex, matIndex, 'unit', e.target.value)} className="modern-input" style={{ width: '40%', padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <input type="number" min="0" value={mat.price} onChange={e => updateMaterial(pIndex, matIndex, 'price', e.target.value)} className="modern-input" style={{ padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <input type="number" min="0" value={mat.markup} onChange={e => updateMaterial(pIndex, matIndex, 'markup', e.target.value)} className="modern-input" style={{ padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px', fontWeight: '600', color: '#0f172a' }}>
                                                            {((parseFloat(mat.price) || 0) * (parseFloat(mat.quantity) || 0) * (1 + ((parseFloat(mat.markup) || 0) / 100))).toFixed(0)} kr
                                                        </td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                            <button onClick={() => handleRemoveMaterial(pIndex, matIndex)} className="delete-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button onClick={handleAddPhase} style={{ padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', color: '#64748b', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.backgroundColor = '#ecfdf5'; e.currentTarget.style.transform = 'scale(1.01)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                            <Plus size={20} /> Tilføj Ny Etape
                        </button>
                    </div>

                    {/* Tillæg, Udstyr & Tømrer-beskyttelse */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Tillæg, Udstyr & Tømrer-beskyttelse</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Antal Containere (á 2500,- ex avance)</label>
                                <input type="number" min="0" value={globalCosts.containers || ''} onChange={e => setGlobalCosts({...globalCosts, containers: e.target.value})} placeholder="F.eks. 1" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Lift / Stilladsleje (Indkøbspris)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" value={globalCosts.scaffolding || ''} onChange={e => setGlobalCosts({...globalCosts, scaffolding: e.target.value})} placeholder="F.eks. 5000" className="modern-input" style={{ paddingRight: '40px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Usynlige Materialer (Skruer, fuge, lim)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" value={globalCosts.invisibleMaterials || ''} onChange={e => setGlobalCosts({...globalCosts, invisibleMaterials: e.target.value})} placeholder="F.eks. 1500" className="modern-input" style={{ paddingRight: '40px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Kørsel & Transport (Timer)</label>
                                <input type="number" min="0" step="0.5" value={globalCosts.transportHours || ''} onChange={e => setGlobalCosts({...globalCosts, transportHours: e.target.value})} placeholder="F.eks. 2" className="modern-input" />
                            </div>
                        </div>
                    </div>

                    {/* Description and Hours */}
                    <div className="desc-hours-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Projekt Detaljer & Samlet Pris</h3>
                            <div className="input-group" style={{ marginBottom: '16px' }}>
                                <label>Opgavetitel</label>
                                <input type="text" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="F.eks. Udskiftning af Vinduer" className="modern-input" />
                            </div>
                            <div className="input-group" style={{ marginBottom: '24px' }}>
                                <label>Intern Note / Beskrivelse (Kundens PDF)</label>
                                <textarea value={projectNotes} onChange={e => setProjectNotes(e.target.value)} placeholder="Beskriv opgaven i detaljer..." className="modern-input" style={{ minHeight: '80px', resize: 'vertical' }} />
                            </div>

                            <div className="input-group" style={{ marginBottom: '24px' }}>
                                <label>Din Timepris (Salgspris inkl. avance)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="modern-input" style={{ paddingRight: '40px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr/t</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px dashed #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '8px' }}>
                                    <span>Materialer i alt (Salgspris):</span>
                                    <span>{totals.materialsSales.toFixed(0)} kr</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '8px' }}>
                                    <span>Arbejdsløn i alt ({totals.totalHours} t):</span>
                                    <span>{totals.laborSales.toFixed(0)} kr</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 'bold', fontSize: '1.3rem', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    <span>Total (ekskl. moms):</span>
                                    <span style={{ color: '#10b981' }}>{totals.totalSales.toFixed(0)} kr</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .modern-input {
                    width: 100% !important;
                    padding: 10px 12px !important;
                    border-radius: 8px !important;
                    border: 1px solid #94a3b8 !important;
                    background-color: #f1f5f9 !important;
                    transition: all 0.2s ease !important;
                    color: #0f172a !important;
                    box-sizing: border-box !important;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05) !important;
                }
                .modern-input:hover {
                    border-color: #64748b !important;
                    background-color: #e2e8f0 !important;
                }
                .modern-input:focus {
                    background-color: #fff !important;
                    border-color: #10b981 !important;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
                    outline: none !important;
                }
                .phase-card {
                    background-color: #fff;
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                    transition: all 0.3s ease;
                }
                .phase-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(0,0,0,0.06);
                    border-color: #cbd5e1;
                }
                .material-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: all 0.2s ease;
                }
                .material-row:hover {
                    background-color: #f8fafc;
                }
                .material-row .delete-btn {
                    opacity: 0.2;
                    transition: all 0.2s ease;
                }
                .material-row:hover .delete-btn {
                    opacity: 1;
                }
                @media (max-width: 1024px) {
                    .customer-info-grid, .desc-hours-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .material-table-container {
                        overflow-x: auto;
                    }
                }
            `}</style>
        </div>
    );
};

export default CustomProjectCreator;
