import React from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { ImagePlus, Info, ZoomIn, Copy, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { QUESTIONS } from './questionsConfig';
import CustomSelect from './CustomSelect';
import AudioPlayerButton from './AudioPlayerButton';

const Step2Dynamic = ({ category, details, updateDetails, nextStep, prevStep, quickRecalculate }) => {
    const questions = QUESTIONS[category] || [];
    const [openTooltips, setOpenTooltips] = React.useState({});
    const [zoomedImage, setZoomedImage] = React.useState(null);
    const [showSketcher, setShowSketcher] = React.useState(false);
    const isMouseDown = React.useRef(false);

    const handleNextImage = React.useCallback(() => {
        setZoomedImage((prev) => {
            if (!prev || !prev.options) return prev;
            const nextIdx = prev.currentIndex + 1;
            if (nextIdx < prev.options.length) {
                const nextOpt = prev.options[nextIdx];
                return {
                    url: nextOpt.img,
                    title: nextOpt.label,
                    options: prev.options,
                    currentIndex: nextIdx,
                    questionId: prev.questionId
                };
            }
            return prev;
        });
    }, []);

    const handlePrevImage = React.useCallback(() => {
        setZoomedImage((prev) => {
            if (!prev || !prev.options) return prev;
            const prevIdx = prev.currentIndex - 1;
            if (prevIdx >= 0) {
                const prevOpt = prev.options[prevIdx];
                return {
                    url: prevOpt.img,
                    title: prevOpt.label,
                    options: prev.options,
                    currentIndex: prevIdx,
                    questionId: prev.questionId
                };
            }
            return prev;
        });
    }, []);

    React.useEffect(() => {
        if (!zoomedImage) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Right') {
                handleNextImage();
            } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                handlePrevImage();
            } else if (e.key === 'Escape') {
                setZoomedImage(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [zoomedImage, handleNextImage, handlePrevImage]);

    React.useEffect(() => {
        const handleMouseUp = () => {
            isMouseDown.current = false;
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    React.useEffect(() => {
        if (category === 'windows') {
            const list = details['windowsConfig'] || [];
            if (list.length === 0) {
                updateDetails('windowsConfig', [{ count: 1, type: 'Standard', isOpenable: true, width: '', height: '' }]);
                updateDetails('amount', 1);
            }
        }
    }, [category]);

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
            if (q.type === 'textarea' || q.type === 'file' || q.type === 'checkbox') return false; // optional/boolean
            
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

        if (missingField) {
            let errorMsg = `Du mangler at udfylde dette felt for at du kan fortsætte: "${missingField.label}"`;
            if (missingField.type === 'window_configurator') {
                errorMsg = "Du mangler at udfylde mål og uploade både indvendigt og udvendigt billede for alle vinduer.";
            }

            toast.error(errorMsg, {
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

        const getWordCount = (str) => str ? str.trim().split(/\s+/).length : 0;
        const showLabelAudio = getWordCount(q.label) > 15 || q.speakable === true;

        const resolvedOptions = typeof q.options === 'function' ? q.options(details) : (q.options || []);

        return (
            <div key={q.id} className="form-group wizard-question-card" style={{ marginBottom: '32px', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: q.subLabel ? '4px' : '12px' }}>
                    <label style={{ fontWeight: '700', margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        {q.label}
                    </label>
                    {showLabelAudio && (
                        <AudioPlayerButton text={q.label} title="Læs spørgsmål op" style={{ width: '28px', height: '28px' }} />
                    )}
                    {q.tooltip && (
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Hvad betyder det?</div>
                                            <AudioPlayerButton text={q.tooltip} title="Læs forklaring op" style={{ width: '26px', height: '26px' }} />
                                        </div>
                                        {q.tooltip}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {q.subLabel && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                        {q.subLabel}
                    </div>
                )}
                {q.type === 'select' && (
                    <div style={{ position: 'relative' }}>
                        <CustomSelect 
                            value={details[q.id] || ''} 
                            onChange={(val) => handleInputChange(q.id, val)}
                            options={resolvedOptions}
                            placeholder="-- Vælg en mulighed --"
                            style={{ width: '100%' }}
                        />
                    </div>
                )}

                {q.type === 'visual_select' && (
                    <div className="materials-grid" style={{ marginTop: '12px' }}>
                        {resolvedOptions.map((opt, idx) => (
                            <div 
                                key={idx} 
                                className={`material-card ${details[q.id] === opt.label ? 'selected' : ''}`}
                                onClick={() => handleInputChange(q.id, opt.label)}
                                style={{ position: 'relative' }}
                            >
                                {opt.img && (
                                    <>
                                        <img src={opt.img} alt={opt.label} className="material-img" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const imageOptions = resolvedOptions.filter(o => o.img);
                                                const currentImageIndex = imageOptions.findIndex(o => o.label === opt.label);
                                                setZoomedImage({
                                                    url: opt.img,
                                                    title: opt.label,
                                                    options: imageOptions,
                                                    currentIndex: currentImageIndex >= 0 ? currentImageIndex : 0,
                                                    questionId: q.id
                                                });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                zIndex: 5,
                                                transition: 'all 0.2s ease',
                                                color: '#475569'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = '#0f172a'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = '#475569'; }}
                                            title="Forstør billede"
                                        >
                                            <ZoomIn size={16} />
                                        </button>
                                    </>
                                )}
                                <div className="material-label">
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{opt.label}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {q.type === 'number' && (
                    <>
                        <input 
                            type="number" 
                            min="0"
                            value={details[q.id] || ''} 
                            onChange={(e) => handleInputChange(q.id, parseFloat(e.target.value))} 
                            onKeyDown={handleKeyDown}
                            placeholder={q.placeholder || 'Indtast tal her...'}
                            style={{ 
                                width: '100%', 
                                padding: '14px 20px', 
                                borderRadius: '12px', 
                                border: '2px solid var(--border)', 
                                fontSize: '1rem',
                                color: 'var(--text-primary)',
                                background: '#f8fafc',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                        />
                        {category === 'terrace' && q.id === 'amount' && (
                            <div style={{ marginTop: '16px' }}>
                                {/* Collapsible trigger button */}
                                <button
                                    type="button"
                                    onClick={() => setShowSketcher(!showSketcher)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#334155',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Info size={16} style={{ color: '#2563eb' }} />
                                        <span>Vil du tegne en skitse af din terrasse? (Valgfrit – klik for at åbne)</span>
                                    </div>
                                    <span style={{ fontSize: '1.2rem', transform: showSketcher ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block' }}>
                                        ▾
                                    </span>
                                </button>
                                 {/* Collapsible body */}
                                 {showSketcher && (
                                     <div style={{
                                         marginTop: '12px',
                                         padding: '20px',
                                         background: '#fff',
                                         border: '1px solid #e2e8f0',
                                         borderRadius: '12px',
                                         boxShadow: 'var(--shadow-sm)'
                                     }}>
                                         <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                             <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
                                                 Tegn formen på din terrasse herunder (Valgfrit)
                                             </h3>
                                             <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                                                 Hver firkant svarer til ca. 1,5 x 1,5 meter. Det hjælper tømreren med at se dine ønsker.
                                             </p>
                                         </div>

                                         {/* The Grid container */}
                                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '100%', overflowX: 'auto', padding: '4px' }}>
                                             {Array.from({ length: 7 }).map((_, rIdx) => (
                                                 <div key={rIdx} style={{ display: 'flex', gap: '4px' }}>
                                                     {Array.from({ length: 8 }).map((_, cIdx) => {
                                                         const cellId = `${cIdx},${rIdx}`;
                                                         const isSelected = (details.terraceGrid || []).includes(cellId);
                                                         const toggleCell = () => {
                                                             const currentGrid = details.terraceGrid || [];
                                                             const newGrid = currentGrid.includes(cellId)
                                                                 ? currentGrid.filter(id => id !== cellId)
                                                                 : [...currentGrid, cellId];
                                                             handleInputChange('terraceGrid', newGrid);
                                                         };

                                                         return (
                                                             <div
                                                                 key={cIdx}
                                                                 onMouseDown={(e) => {
                                                                     e.preventDefault();
                                                                     isMouseDown.current = true;
                                                                     toggleCell();
                                                                 }}
                                                                 onMouseEnter={() => {
                                                                     if (isMouseDown.current) {
                                                                         toggleCell();
                                                                     }
                                                                 }}
                                                                 style={{
                                                                     width: '32px',
                                                                     height: '32px',
                                                                     borderRadius: '4px',
                                                                     cursor: 'pointer',
                                                                     background: isSelected 
                                                                         ? 'linear-gradient(135deg, #d97706, #b45309)' 
                                                                         : '#f0fdf4',
                                                                     border: isSelected 
                                                                         ? '1px solid #92400e' 
                                                                         : '1px solid #dcfce7',
                                                                     transition: 'all 0.15s ease',
                                                                     boxShadow: isSelected 
                                                                         ? 'inset 0 1px 3px rgba(0,0,0,0.2)' 
                                                                         : 'none',
                                                                     display: 'flex',
                                                                     alignItems: 'center',
                                                                     justifyContent: 'center',
                                                                     position: 'relative'
                                                                 }}
                                                                 title={`Koordinat: ${cIdx + 1}, ${7 - rIdx}`}
                                                             >
                                                                 {isSelected && (
                                                                     <div style={{
                                                                         position: 'absolute',
                                                                         width: '100%',
                                                                         height: '2px',
                                                                         background: 'rgba(255,255,255,0.15)',
                                                                         top: '50%',
                                                                         transform: 'translateY(-50%)'
                                                                     }} />
                                                                 )}
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             ))}

                                             {/* House facade line representation */}
                                             <div style={{ 
                                                 width: '100%', 
                                                 maxWidth: '284px', 
                                                 display: 'flex', 
                                                 flexDirection: 'column', 
                                                 alignItems: 'center', 
                                                 marginTop: '12px' 
                                             }}>
                                                 <div style={{ 
                                                     width: '100%', 
                                                     height: '6px', 
                                                     background: '#64748b', 
                                                     borderRadius: '3px',
                                                     boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                 }} />
                                                 <span style={{ 
                                                     fontSize: '0.75rem', 
                                                     fontWeight: '800', 
                                                     color: '#64748b', 
                                                     textTransform: 'uppercase', 
                                                     letterSpacing: '0.15em',
                                                     marginTop: '6px'
                                                 }}>
                                                     HUS
                                                 </span>
                                             </div>
                                         </div>

                                        {/* Actions & Summary */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>
                                                Markerede felter: <strong>{(details.terraceGrid || []).length} stk.</strong>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange('terraceGrid', [])}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'transparent',
                                                    border: '1px dashed #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fef2f2'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                Ryd skitse
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {q.type === 'text' && (
                    <input 
                        type="text" 
                        value={details[q.id] || ''} 
                        onChange={(e) => handleInputChange(q.id, e.target.value)} 
                        onKeyDown={handleKeyDown}
                        placeholder={q.placeholder || 'Indtast tekst her...'}
                        style={{ 
                            width: '100%', 
                            padding: '14px 20px', 
                            borderRadius: '12px', 
                            border: '2px solid var(--border)', 
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            background: '#f8fafc',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
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

                {q.type === 'checkbox' && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--accent)', borderRadius: '12px' }}>
                        <input 
                            type="checkbox" 
                            checked={!!details[q.id]}
                            onChange={(e) => handleInputChange(q.id, e.target.checked)}
                            style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {q.label}
                        </span>
                    </label>
                )}

                {q.type === 'window_configurator' && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '16px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.92rem', color: '#1e3a8a', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: 'var(--shadow-sm)', lineHeight: '1.4' }}>
                            <Info size={18} style={{ flexShrink: 0, color: '#3b82f6' }} />
                            <span><strong>Tip:</strong> Skal du også have udskiftet en terrassedør eller skydedør? Du kan nemt tilføje dem direkte i oversigten nedenfor ved at vælge <strong>"Terrassedør / Skydedør"</strong> under type!</span>
                        </div>
                        {(details[q.id] || [{ count: 1, type: 'Standard', isOpenable: true, width: '', height: '' }]).map((wConf, idx) => {
                            const list = details[q.id] || [{ count: 1, type: 'Standard', isOpenable: true, width: '', height: '' }];
                            
                            // Handlers
                            const updateGroup = (field, val) => {
                                const newArr = [...list];
                                newArr[idx] = { ...wConf, [field]: val };
                                handleInputChange(q.id, newArr);
                                
                                // Recalculate and update totalsum
                                const totalCount = newArr.reduce((acc, item) => acc + (parseInt(item.count) || 1), 0);
                                handleInputChange('amount', totalCount);
                            };
                            
                            const duplicateGroup = () => {
                                const newArr = [...list];
                                const copy = { 
                                    ...wConf, 
                                    // Copy base fields but exclude photos so they can upload separate pictures
                                    photoInside: null,
                                    photoOutside: null
                                };
                                newArr.splice(idx + 1, 0, copy);
                                handleInputChange(q.id, newArr);
                                
                                const totalCount = newArr.reduce((acc, item) => acc + (parseInt(item.count) || 1), 0);
                                handleInputChange('amount', totalCount);
                                toast.success("Vinduesgruppe duplikeret!");
                            };
                            
                            const deleteGroup = () => {
                                if (list.length <= 1) return;
                                const newArr = list.filter((_, i) => i !== idx);
                                handleInputChange(q.id, newArr);
                                
                                const totalCount = newArr.reduce((acc, item) => acc + (parseInt(item.count) || 1), 0);
                                handleInputChange('amount', totalCount);
                                toast.success("Vinduesgruppe slettet!");
                            };

                            return (
                                <div key={idx} style={{ padding: '24px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 'bold' }}>
                                            Vinduesgruppe {idx + 1}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); duplicateGroup(); }}
                                                style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Copy size={14} /> Dupliker
                                            </button>
                                            {list.length > 1 && (
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); deleteGroup(); }}
                                                    style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Trash2 size={14} /> Slet
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        {/* Antal */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>
                                                Antal identiske elementer i denne gruppe
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={wConf.count || 1}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    updateGroup('count', val);
                                                }}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                            />
                                        </div>

                                        {/* Type */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>Type</label>
                                            <CustomSelect 
                                                value={wConf.type || 'Standard'}
                                                onChange={(val) => updateGroup('type', val)}
                                                options={[
                                                    { value: 'Standard', label: 'Standard facadevindue' },
                                                    { value: 'Tagvindue', label: 'Tagvindue (Ovenlys/Velux)' },
                                                    { value: 'Panorama', label: 'Panorama / Gulv-til-loft' },
                                                    { value: 'Skydedør', label: 'Terrassedør / Skydedør' }
                                                ]}
                                                style={{ width: '100%', borderRadius: '8px' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={wConf.isOpenable !== false}
                                                    onChange={(e) => updateGroup('isOpenable', e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                />
                                                Dette element skal kunne åbnes
                                            </label>

                                            {wConf.type === 'Standard' && (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!wConf.safetyGlass}
                                                        onChange={(e) => updateGroup('safetyGlass', e.target.checked)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                    />
                                                    Går glasset ned til gulvet? (Sikkerhedsglas)
                                                </label>
                                            )}

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!wConf.obstacles}
                                                    onChange={(e) => updateGroup('obstacles', e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                />
                                                Hindringer udefra (beplantning/hegn)
                                            </label>
                                        </div>

                                        {wConf.type === 'Panorama' && (
                                            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#1e40af', fontWeight: '600' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!wConf.hasSlidingDoor}
                                                        onChange={(e) => updateGroup('hasSlidingDoor', e.target.checked)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                                                    />
                                                    Integrer en skydedør/terrassedør i dette parti
                                                </label>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>Bredde (cirka cm)</label>
                                                <input 
                                                    type="number" 
                                                    value={wConf.width || ''}
                                                    placeholder="cirka bredde (f.eks. 120)"
                                                    onChange={(e) => updateGroup('width', parseFloat(e.target.value) || '')}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>Højde (cirka cm)</label>
                                                <input 
                                                    type="number" 
                                                    value={wConf.height || ''}
                                                    placeholder="cirka højde (f.eks. 140)"
                                                    onChange={(e) => updateGroup('height', parseFloat(e.target.value) || '')}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="upload-area" style={{ display: 'block', padding: '16px', border: '2px dashed #cbd5e1', textAlign: 'center', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}>
                                                    <div style={{ color: 'var(--text-secondary)' }}><ImagePlus size={24} style={{ margin: '0 auto' }} /></div>
                                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Billede indefra</p>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        style={{ display: 'none' }} 
                                                        onChange={async (e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const fileObj = await compressImageToBase64(e.target.files[0]);
                                                                updateGroup('photoInside', fileObj);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                {wConf.photoInside && (
                                                    <div style={{ position: 'relative', width: '80px', height: '80px', marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                        <img src={wConf.photoInside.preview} alt="Indefra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="upload-area" style={{ display: 'block', padding: '16px', border: '2px dashed #cbd5e1', textAlign: 'center', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}>
                                                    <div style={{ color: 'var(--text-secondary)' }}><ImagePlus size={24} style={{ margin: '0 auto' }} /></div>
                                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Billede udefra</p>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        style={{ display: 'none' }} 
                                                        onChange={async (e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const fileObj = await compressImageToBase64(e.target.files[0]);
                                                                updateGroup('photoOutside', fileObj);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                {wConf.photoOutside && (
                                                    <div style={{ position: 'relative', width: '80px', height: '80px', marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                        <img src={wConf.photoOutside.preview} alt="Udefra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Tilføj ny gruppe knap */}
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                const list = details[q.id] || [];
                                const newArr = [...list, { count: 1, type: 'Standard', isOpenable: true, width: '', height: '' }];
                                handleInputChange(q.id, newArr);
                                
                                const totalCount = newArr.reduce((acc, item) => acc + (parseInt(item.count) || 1), 0);
                                handleInputChange('amount', totalCount);
                                toast.success("Ny vinduesgruppe tilføjet!");
                            }}
                            style={{ width: '100%', padding: '16px', border: '2px dashed #2563eb', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', marginTop: '12px', marginBottom: '24px' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                        >
                            <Plus size={18} /> Tilføj endnu et vindue / anden størrelse
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const isAnnexComplex = category === 'annex' && (
        details?.annexType === 'Isoleret skur/værksted' || 
        details?.annexType === 'Fuldt beboeligt anneks' || 
        parseFloat(details?.amount) > 12
    );

    const isInspectionRequired = ['special', 'extensions', 'carport', 'kitchen'].includes(category) || isAnnexComplex;

    return (
        <section className="wizard-step active dynamic-form-section">
            <div className="step-header">
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>
                    {isInspectionRequired ? 'Projektbeskrivelse' : 'Specifikation af projekt'}
                </h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '24px' }}>
                    {isInspectionRequired 
                        ? 'For at vi kan yde den bedste rådgivning, bedes du beskrive projektet nedenfor. Da denne type opgaver er komplekse, udarbejdes der ikke en automatisk prisberegning på forhånd.' 
                        : 'For at jeg bedst muligt kan give dig det rigtige estimat og forstå opgaven, bedes du svare på følgende spørgsmål om projektet.'}
                </p>
                
                <div style={{ background: '#f8fafc', borderLeft: '4px solid #10b981', padding: '16px', borderRadius: '8px', marginBottom: '32px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                            <Info size={20} color="#10b981" />
                        </span>
                        <div>
                            {isInspectionRequired ? (
                                <>
                                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Fysisk besigtigelse og rådgivning</strong>
                                    Dette trin fungerer som forberedelse til vores indledende dialog. Din beskrivelse sendes direkte til tømreren, som herefter vil kontakte dig for at aftale en uforpligtende besigtigelse af opgaven. Først efter besigtigelsen udarbejdes der et præcist og retvisende prisestimat.
                                </>
                            ) : (
                                <>
                                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Vejledende oplysninger</strong>
                                    Du vil som udgangspunkt aldrig blive holdt ansvarlig for nøjagtigheden af dine mål eller valg. Tømreren kommer <strong>altid</strong> ud og kigger på projektet inden en endelig aftale indgås, medmindre du aktivt fravælger opmålingsbesøget mod en prisreduktion (hvor dette er en mulighed). Overslaget er til for at give dig et realistisk prisleje.
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="form-grid" style={{ display: 'block' }}>
                {questions.map(q => {
                    const qRender = renderQuestion(q);
                    
                    if (q.id === 'notes' && category === 'annex' && isAnnexComplex) {
                        let warningText = "";
                        if (details.annexType === 'Fuldt beboeligt anneks') {
                            warningText = `Da du har valgt 'Fuldt beboeligt anneks', er der tale om et komplekst, helårsisoleret byggeri (BR18) med skrappe krav til ventilation, isoleringstykkelser, el og eventuel VVS. Derfor er det desværre ikke muligt at give et retvisende og automatisk prisestimat her. Tømreren kontakter dig i stedet for en gratis og uforpligtende fysisk besigtigelse, hvorefter du får et skræddersyet tilbud.`;
                        } else if (details.annexType === 'Isoleret skur/værksted') {
                            warningText = `Da du har valgt 'Isoleret skur/værksted', kræver byggeriet komplet isolering, dampspærre samt indvendig beklædning (gips/træpaneler). Da arbejdsbyrden og materialerne varierer kraftigt afhængig af dine specifikke rammer, kan der ikke gives et automatisk prisestimat. Tømreren kontakter dig i stedet for en gratis og uforpligtende fysisk besigtigelse.`;
                        } else {
                            warningText = `Da det ønskede skur/anneks er over 12 m² (i alt ${details.amount} m²), vil byggeriet lovmæssigt kræve byggetilladelse og præcise konstruktionstegninger. Derfor kan vi desværre ikke give et automatisk prisestimat her. Tømreren kontakter dig i stedet for en gratis og uforpligtende fysisk besigtigelse, så I sammen kan gennemgå rammerne og ansøgningen.`;
                        }

                        return (
                            <React.Fragment key="annex-warning">
                                <div style={{ 
                                    background: '#fffbeb', 
                                    border: '1px solid #fef3c7',
                                    borderLeft: '4px solid #d97706', 
                                    padding: '24px', 
                                    borderRadius: '12px', 
                                    marginBottom: '32px', 
                                    fontSize: '0.95rem', 
                                    color: '#92400e', 
                                    lineHeight: '1.6',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '1.3rem', marginTop: '-2px' }}>⚠️</span>
                                        <div>
                                            <strong style={{ display: 'block', color: '#78350f', marginBottom: '6px', fontSize: '1.05rem', fontWeight: '800' }}>OBS: Dette bliver et komplekst projekt</strong>
                                            {warningText}
                                        </div>
                                    </div>
                                </div>
                                {qRender}
                            </React.Fragment>
                        );
                    }
                    
                    return qRender;
                })}
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button className="wizard-btn wizard-btn-secondary" onClick={prevStep}>← Tilbage</button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {quickRecalculate && (
                        <button className="wizard-btn wizard-btn-primary" onClick={quickRecalculate} style={{ boxShadow: '0 10px 25px rgba(59,130,246,0.3)' }}>
                            Gem & Vis Overslag →
                        </button>
                    )}
                    <button className={`wizard-btn ${quickRecalculate ? 'wizard-btn-secondary' : 'wizard-btn-primary'}`} onClick={handleNextStep}>
                        {quickRecalculate ? 'Tilføj Billeder →' : 'Bekræft & Fortsæt →'}
                    </button>
                </div>
            </div>
            {zoomedImage && createPortal(
                <div 
                    onClick={() => setZoomedImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100000,
                        cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                    `}} />
                    
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            maxWidth: '90%',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'default',
                            animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        <img 
                            src={zoomedImage.url} 
                            alt={zoomedImage.title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '75vh',
                                borderRadius: '16px',
                                objectFit: 'contain',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                if (zoomedImage.questionId) {
                                    const currentOpt = zoomedImage.options[zoomedImage.currentIndex];
                                    if (currentOpt) {
                                        handleInputChange(zoomedImage.questionId, currentOpt.label);
                                        toast.success(`Valgt: ${currentOpt.label}`, { duration: 1500 });
                                    }
                                }
                                setZoomedImage(null);
                            }}
                        />
                        <div style={{ 
                            marginTop: '16px', 
                            color: '#fff', 
                            fontSize: '1.25rem', 
                            fontWeight: '700', 
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            background: 'rgba(15, 23, 42, 0.8)',
                            padding: '8px 20px',
                            borderRadius: '99px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(4px)'
                        }}>
                            {zoomedImage.title}
                        </div>
                        
                        <button
                            onClick={() => setZoomedImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-48px',
                                right: '0',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(4px)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }}
                            title="Luk"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Venstre knap */}
                    {zoomedImage.options && zoomedImage.currentIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                            style={{
                                position: 'absolute',
                                left: '40px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(15, 23, 42, 0.65)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                width: '56px',
                                height: '56px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                zIndex: 100001
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            title="Forrige (Venstre piletast)"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {/* Højre knap */}
                    {zoomedImage.options && zoomedImage.currentIndex < zoomedImage.options.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                            style={{
                                position: 'absolute',
                                right: '40px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(15, 23, 42, 0.65)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                width: '56px',
                                height: '56px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                zIndex: 100001
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            title="Næste (Højre piletast)"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}
                </div>,
                document.body
            )}
        </section>
    );
};

export default Step2Dynamic;
