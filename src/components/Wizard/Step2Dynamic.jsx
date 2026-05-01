import React from 'react';
import { QUESTIONS } from './questionsConfig';

const Step2Dynamic = ({ category, details, updateDetails, nextStep, prevStep }) => {
    const questions = QUESTIONS[category] || [];

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

    const renderQuestion = (q) => {
        if (!isVisible(q.condition)) return null;

        return (
            <div key={q.id} className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>{q.label}</label>
                
                {q.type === 'select' && (
                    <select 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="" disabled>-- Vælg en mulighed --</option>
                        {q.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                )}

                {q.type === 'visual_select' && (
                    <div className="material-grid">
                        {q.options.map((opt, idx) => (
                            <div 
                                key={idx} 
                                className={`material-card ${details[q.id] === opt.label ? 'selected' : ''}`}
                                onClick={() => handleInputChange(q.id, opt.label)}
                            >
                                {opt.img && <img src={opt.img} alt={opt.label} className="material-img" />}
                                <div className="material-label">{opt.label}</div>
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
                        placeholder={q.placeholder || ''}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                )}

                {q.type === 'text' && (
                    <input 
                        type="text" 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)} 
                        placeholder={q.placeholder || ''}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                )}

                {q.type === 'textarea' && (
                    <textarea 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)} 
                        placeholder={q.placeholder || ''}
                        rows={4}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                    />
                )}

                {q.type === 'file' && (
                    <div style={{ marginBottom: '10px' }}>
                        <label className="upload-area" style={{ display: 'block', padding: '20px', border: '2px dashed #ccc', textAlign: 'center', borderRadius: '4px', background: '#f9fafb', cursor: 'pointer' }}>
                            <span className="upload-icon">📷</span>
                            <p style={{ margin: '10px 0', fontSize: '14px' }}>Klik her for at uploade billede(r)</p>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                style={{ display: 'none' }} 
                                onChange={(e) => handleFileChange(q.id, e.target.files)}
                            />
                        </label>
                        
                        {(details[q.id] || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                {details[q.id].map((fileObj, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ccc' }}>
                                        <img src={fileObj.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); removeFile(q.id, idx); }}
                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                        >
                                            X
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
                <h2>Specifikation af projekt</h2>
                <p>For at jeg bedst muligt kan give dig det rigtige estimat og forstå opgaven, bedes du svare på følgende få spørgsmål om projektet.</p>
            </div>
            
            <div className="form-grid" style={{ display: 'block' }}>
                {questions.map(q => renderQuestion(q))}
            </div>

            <div className="actions">
                <button className="btn-secondary" onClick={prevStep}>Tilbage</button>
                <button className="btn-primary" onClick={nextStep}>Bekræft & Fortsæt</button>
            </div>
        </section>
    );
};

export default Step2Dynamic;
