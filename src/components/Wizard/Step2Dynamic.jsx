import React from 'react';
import toast from 'react-hot-toast';
import { ImagePlus } from 'lucide-react';
import { QUESTIONS } from './questionsConfig';

const Step2Dynamic = ({ category, details, updateDetails, nextStep, prevStep }) => {
    const questions = QUESTIONS[category] || [];
    const [openTooltips, setOpenTooltips] = React.useState({});

    const toggleTooltip = (id) => {
        setOpenTooltips(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleInputChange = (id, value) => {
        updateDetails(id, value);
    };

    const compressImageToBase64 = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const MAX_WIDTH = 800;
                    if (width > MAX_WIDTH) {
                        height = Math.round(height * (MAX_WIDTH / width));
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Komprimeres som JPEG med ca 70% kvalitet
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve({ name: file.name, preview: dataUrl, isBase64: true });
                };
                img.onerror = () => {
                    // Hvis det ikke er et gyldigt billede (f.eks. PDF eller HEIC på ældre browsere)
                    // Returner bare rå-data så interfacet ikke låser
                    resolve({ name: file.name, preview: event.target.result, isBase64: true });
                };
                img.src = event.target.result;
            };
        });
    };

    const handleFileChange = async (id, files) => {
        if (!files || files.length === 0) return;
        
        const filePromises = Array.from(files).map(file => compressImageToBase64(file));
        const fileArray = await Promise.all(filePromises);
        
        const existingFiles = details[id] || [];
        updateDetails(id, [...existingFiles, ...fileArray]);
    };

    const removeFile = (id, indexToRemove) => {
        const existingFiles = details[id] || [];
        const newFiles = existingFiles.filter((_, idx) => idx !== indexToRemove);
        updateDetails(id, newFiles);
    };

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

    const handleNextStep = () => {
        const questionsForCategory = QUESTIONS[category] || [];
        const visibleQuestions = questionsForCategory.filter(q => isVisible(q.condition));
        
        // Find if any mandatory field is missing
        const missingField = visibleQuestions.find(q => {
            if (q.type === 'textarea' || q.type === 'file') return false; // optional
            
            const value = details[q.id];
            return value === undefined || value === null || value === '';
        });

        if (missingField) {
            toast.error(`Du mangler at udfylde dette felt for at du kan fortsætte, og du kan få dit overslag på den pris: "${missingField.label}"`, {
                position: 'bottom-center',
                style: { borderRadius: '10px', background: '#333', color: '#fff', maxWidth: '500px', lineHeight: '1.5' },
                duration: 4000
            });
            return;
        }

        nextStep();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNextStep();
        }
    };

    const renderQuestion = (q) => {
        if (!isVisible(q.condition)) return null;

        return (
            <div key={q.id} className="form-group" style={{ marginBottom: '32px', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <label style={{ fontWeight: '700', margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        {q.label}
                    </label>
                    {q.tooltip && (
                        <div style={{ position: 'relative' }}>
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); toggleTooltip(q.id); }}
                                style={{ 
                                    background: openTooltips[q.id] ? 'var(--accent)' : '#e2e8f0', 
                                    color: openTooltips[q.id] ? 'white' : '#64748b', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: '24px', 
                                    height: '24px', 
                                    fontSize: '13px', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                    boxShadow: openTooltips[q.id] ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                title="Læs mere"
                            >
                                ?
                            </button>
                            {openTooltips[q.id] && (
                                <>
                                    <div 
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                                        onClick={() => toggleTooltip(q.id)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '32px',
                                        left: '0',
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        boxShadow: 'var(--shadow-lg)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        width: 'max(280px, 100%)',
                                        maxWidth: '350px',
                                        zIndex: 100,
                                        fontSize: '0.95rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.5',
                                        borderLeft: '4px solid var(--accent)'
                                    }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>Hvad betyder det?</div>
                                        {q.tooltip}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                {q.type === 'select' && (
                    <div style={{ position: 'relative' }}>
                        <select 
                            value={details[q.id] || ''} 
                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '14px 20px', 
                                borderRadius: '12px', 
                                border: '2px solid var(--border)', 
                                fontSize: '1rem',
                                color: 'var(--text-primary)',
                                background: 'rgba(255, 255, 255, 0.8)',
                                cursor: 'pointer',
                                appearance: 'none',
                                transition: 'var(--transition-fast)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                        >
                            <option value="" disabled>-- Vælg en mulighed --</option>
                            {q.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                            ▼
                        </div>
                    </div>
                )}

                {q.type === 'visual_select' && (
                    <div className="materials-grid" style={{ marginTop: '12px' }}>
                        {q.options.map((opt, idx) => (
                            <div 
                                key={idx} 
                                className={`material-card ${details[q.id] === opt.label ? 'selected' : ''}`}
                                onClick={() => handleInputChange(q.id, opt.label)}
                            >
                                {opt.img && <img src={opt.img} alt={opt.label} className="material-img" />}
                                <div className="material-label">
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{opt.label}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {q.type === 'number' && (
                    <input 
                        type="number" 
                        min="0"
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, parseFloat(e.target.value))} 
                        onKeyDown={handleKeyDown}
                        placeholder={q.placeholder || ''}
                        style={{ 
                            width: '100%', 
                            padding: '14px 20px', 
                            borderRadius: '12px', 
                            border: '2px solid var(--border)', 
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                )}

                {q.type === 'text' && (
                    <input 
                        type="text" 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)} 
                        onKeyDown={handleKeyDown}
                        placeholder={q.placeholder || ''}
                        style={{ 
                            width: '100%', 
                            padding: '14px 20px', 
                            borderRadius: '12px', 
                            border: '2px solid var(--border)', 
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                )}

                {q.type === 'textarea' && (
                    <textarea 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)} 
                        placeholder={q.placeholder || ''}
                        rows={4}
                        style={{ 
                            width: '100%', 
                            padding: '14px 20px', 
                            borderRadius: '12px', 
                            border: '2px solid var(--border)', 
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            resize: 'vertical',
                            transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(17, 17, 17, 0.05)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                )}

                {q.type === 'file' && (
                    <div style={{ marginTop: '10px' }}>
                        <label className="upload-area" style={{ display: 'block', padding: '32px 20px', border: '2px dashed var(--border)', textAlign: 'center', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', transition: 'var(--transition-fast)' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <div style={{ color: 'var(--text-secondary)' }}>
                                <ImagePlus size={36} />
                            </div>
                            <p style={{ margin: '12px 0 0 0', fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Klik her for at uploade billede(r)</p>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                style={{ display: 'none' }} 
                                onChange={(e) => handleFileChange(q.id, e.target.files)}
                            />
                        </label>
                        
                        {(details[q.id] || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                                {details[q.id].map((fileObj, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                                        <img src={fileObj.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); removeFile(q.id, idx); }}
                                            style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="wizard-step active">
            <div className="step-header">
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>Specifikation af projekt</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '24px' }}>For at jeg bedst muligt kan give dig det rigtige estimat og forstå opgaven, bedes du svare på følgende spørgsmål om projektet.</p>
                
                <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', borderLeft: '4px solid #3b82f6', marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💡</span> Giv blot dit kvalificerede bud
                    </h3>
                    <p style={{ margin: '0', fontSize: '0.95rem', color: '#1e40af', lineHeight: '1.6' }}>
                        Du vil aldrig blive holdt ansvarlig for nøjagtigheden af dine mål eller valg. Tømreren kommer <strong>altid</strong> ud og kigger på projektet inden en endelig aftale indgås. Overslaget her er udelukkende til for at give dig et hurtigt og realistisk prisleje.
                    </p>
                </div>
            </div>
            
            <div className="form-grid" style={{ display: 'block' }}>
                {questions.map(q => renderQuestion(q))}
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button className="wizard-btn wizard-btn-secondary" onClick={prevStep}>← Tilbage</button>
                <button className="wizard-btn wizard-btn-primary" onClick={handleNextStep}>Bekræft & Fortsæt →</button>
            </div>
        </section>
    );
};

export default Step2Dynamic;
