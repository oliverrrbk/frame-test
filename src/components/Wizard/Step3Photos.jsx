import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { Camera, ImagePlus } from 'lucide-react';

const Step3Photos = ({ 
    category, 
    photos, 
    setPhotos, 
    notes, 
    setNotes, 
    nextStep, 
    prevStep, 
    quickRecalculate, 
    allProjects, 
    onUpdateProject 
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [activeUploadProjectId, setActiveUploadProjectId] = useState(null);

    const categoryNames = {
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

    const getPhotoHint = (cat) => {
        switch (cat) {
            case 'roof': return "Tip: Tag et billede nede fra haven, hvor man kan se tagrenden, og et billede oppe fra loftrummet (hvis muligt).";
            case 'windows': return "Tip: Tag et billede af de nuværende vinduer indefra og udefra, så tømreren kan se murværket omkring.";
            case 'doors': return "Tip: Tag et billede af den eksisterende dør og karmen omkring.";
            case 'floor': return "Tip: Tag et billede af de tilstødende rum, dørtrin og panelerne, så tømreren kan se overgangene.";
            case 'special': return "Tip: Tag et par oversigtsbilleder af området, hvor opgaven skal udføres.";
            default: return "Tip: Tag et par billeder af området, hvor opgaven skal udføres, gerne fra lidt forskellige vinkler.";
        }
    };

    const compressImageForUpload = (file) => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file); // Not an image, just return raw file
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const MAX_WIDTH = 1200; // Optimal for balance between quality and small size
                    if (width > MAX_WIDTH) {
                        height = Math.round(height * (MAX_WIDTH / width));
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = () => resolve(file);
                img.src = event.target.result;
            };
            reader.onerror = () => resolve(file);
        });
    };

    const processFiles = async (filesArray) => {
        if (!filesArray.length) return;

        setIsUploading(true);
        const uploadedUrls = [];

        for (const file of filesArray) {
            try {
                // Compress image to save massive amounts of bandwidth
                const compressedBlob = await compressImageForUpload(file);
                
                // Ensure unique file name, use .jpg for compressed images
                const fileExt = file.type.startsWith('image/') ? 'jpg' : file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('leads_photos')
                    .upload(filePath, compressedBlob, {
                        contentType: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // Get public URL
                const { data: publicUrlData } = supabase.storage
                    .from('leads_photos')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrlData.publicUrl);
            } catch (error) {
                console.error("Error uploading image:", error);
                toast.error(`Kunne ikke uploade billedet: ${file.name}`);
            }
        }

        if (uploadedUrls.length > 0) {
            if (activeUploadProjectId && allProjects) {
                const targetProj = allProjects.find(p => p.id === activeUploadProjectId);
                if (targetProj) {
                    const currentPhotos = targetProj.details?.photos || [];
                    const currentNotes = targetProj.details?.notes || '';
                    onUpdateProject(activeUploadProjectId, {
                        photos: [...currentPhotos, ...uploadedUrls],
                        notes: currentNotes
                    });
                }
            } else {
                setPhotos((prev) => [...prev, ...uploadedUrls]);
            }
            toast.success(`${uploadedUrls.length} billede(r) uploadet!`);
        }
        
        setIsUploading(false);
        setActiveUploadProjectId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (e) => {
        processFiles(Array.from(e.target.files));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isUploading && e.dataTransfer.files) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const triggerUploadForProject = (projId) => {
        if (isUploading) return;
        setActiveUploadProjectId(projId);
        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.click();
            }
        }, 50);
    };

    const removePhotoForProject = (projId, photoIdx) => {
        if (!allProjects) return;
        const targetProj = allProjects.find(p => p.id === projId);
        if (targetProj) {
            const currentPhotos = targetProj.details?.photos || [];
            const currentNotes = targetProj.details?.notes || '';
            onUpdateProject(projId, {
                photos: currentPhotos.filter((_, i) => i !== photoIdx),
                notes: currentNotes
            });
        }
    };

    const removePhoto = (idx) => {
        if (setPhotos) {
            setPhotos((prev) => prev.filter((_, i) => i !== idx));
        }
    };

    const updateNotesForProject = (projId, newNotes) => {
        if (!allProjects) return;
        const targetProj = allProjects.find(p => p.id === projId);
        if (targetProj) {
            const currentPhotos = targetProj.details?.photos || [];
            onUpdateProject(projId, {
                photos: currentPhotos,
                notes: newNotes
            });
        }
    };

    // MULTI-PROJECT LAYOUT
    if (allProjects && allProjects.length > 0) {
        return (
            <section className="wizard-step active photos-upload-section">
                <div className="step-header">
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>Beskriv de særlige forhold & Billeder</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '650px', marginBottom: '32px' }}>
                        Vi har nu et godt overblik over jeres Kombi-projekt! For at vi kan give jer et super skarpt og præcist estimat, vil vi bede jer kort beskrive eventuelle særlige ønsker og uploade et par billeder af områderne for hver opgave.
                    </p>
                </div>

                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />

                {allProjects.map((project, index) => {
                    const pCat = project.category;
                    const pName = categoryNames[pCat] || pCat;
                    const pPhotos = project.details?.photos || [];
                    const pNotes = project.details?.notes || '';

                    return (
                        <div key={project.id} className="project-photo-section" style={{ 
                            marginBottom: '40px', 
                            padding: '32px', 
                            background: 'var(--bg-card)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ background: '#2563eb', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 'bold' }}>{index + 1}</span>
                                {pName}
                            </h3>

                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    Specielle ønsker eller kommentarer til {pName.toLowerCase()}
                                </label>
                                <textarea 
                                    rows="3" 
                                    placeholder={`F.eks. særlige forhold angående ${pName.toLowerCase()}...`}
                                    style={{ 
                                        width: '100%', 
                                        padding: '14px 20px', 
                                        borderRadius: '12px', 
                                        border: '2px solid var(--border)', 
                                        fontSize: '0.95rem',
                                        color: 'var(--text-primary)',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        resize: 'vertical'
                                    }}
                                    value={pNotes}
                                    onChange={(e) => updateNotesForProject(project.id, e.target.value)}
                                />
                            </div>

                            <div style={{ background: '#eff6ff', border: '1px dashed #3b82f6', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ marginTop: '2px', color: '#3b82f6' }}><Camera size={18} /></div>
                                <p style={{ margin: 0, color: '#1e3a8a', fontSize: '0.9rem', lineHeight: '1.4', fontWeight: '500' }}>
                                    {getPhotoHint(pCat)}
                                </p>
                            </div>

                            {/* Clickable upload area for this project */}
                            <div 
                                className="upload-area-mini"
                                onClick={() => triggerUploadForProject(project.id)}
                                style={{ 
                                    cursor: isUploading ? 'wait' : 'pointer', 
                                    opacity: isUploading ? 0.7 : 1,
                                    padding: '24px 20px', 
                                    border: '2px dashed var(--border)', 
                                    textAlign: 'center', 
                                    borderRadius: '12px', 
                                    background: 'rgba(255, 255, 255, 0.3)', 
                                    transition: 'all 0.2s ease',
                                    marginBottom: '16px'
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')} 
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                            >
                                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <ImagePlus size={24} />
                                </div>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    {isUploading && activeUploadProjectId === project.id ? 'Uploader billeder...' : 'Klik for at tilføje billeder til denne del-opgave'}
                                </span>
                            </div>

                            {pPhotos.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                                    {pPhotos.map((url, idx) => (
                                        <div key={idx} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                                            <img src={url} alt="Uploadet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removePhotoForProject(project.id, idx); }}
                                                style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <button className="wizard-btn wizard-btn-secondary" onClick={prevStep} disabled={isUploading}>← Tilbage</button>
                    <button className="wizard-btn wizard-btn-primary" onClick={nextStep} disabled={isUploading}>
                        Bekræft Kontaktinfo →
                    </button>
                </div>
            </section>
        );
    }

    // STANDARD SINGLE-PROJECT LAYOUT (BACKWARD COMPATIBLE)
    return (
        <section className="wizard-step active photos-upload-section">
            <div className="step-header">
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>{category === 'special' ? 'Vedhæft billeder af opgaven' : 'Beskriv de særlige forhold'}</h2>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '24px' }}>{category === 'special' ? 'Vi har nu et godt overblik over dit projekt! Vedhæft meget gerne et par billeder af området, så vi kan se opgaven med egne øjne og få en bedre indsigt i, hvordan den bedst løses. På den måde er vi bedst muligt forberedt til at give dig et hurtigt og præcist tilbud.' : 'Har du nogle specifikke krav, udfordringer eller drømme? Skriv dem her og vedhæft meget gerne et par billeder af området.'}</p>
            </div>
            
            <div className="form-group photos-upload-card" style={{ marginBottom: '32px', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Eksakt situation og specielle ønsker (Valgfrit men godt)</label>
                <textarea 
                    rows="4" 
                    placeholder="F.eks. Der er ret skæve lister i stuen, og jeg drømmer om at gulvet skal lægges i forlængelse af køkkenet uden overgange..." 
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div style={{ background: '#eff6ff', border: '1px dashed #3b82f6', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px', color: '#3b82f6' }}><Camera size={20} /></div>
                <p style={{ margin: 0, color: '#1e3a8a', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: '500' }}>
                    {getPhotoHint(category)}
                </p>
            </div>

            <div 
                className="upload-area" 
                onClick={() => !isUploading && fileInputRef.current && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ 
                    cursor: isUploading ? 'wait' : 'pointer', 
                    opacity: isUploading ? 0.7 : 1,
                    display: 'block', 
                    padding: '40px 20px', 
                    border: `2px dashed ${isDragging ? '#10b981' : 'var(--border)'}`, 
                    textAlign: 'center', 
                    borderRadius: '12px', 
                    background: isDragging ? '#ecfdf5' : 'var(--bg-card)', 
                    transition: 'all 0.3s ease',
                    marginBottom: '20px',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseOver={(e) => !isDragging && (e.currentTarget.style.borderColor = 'var(--accent)')} 
                onMouseOut={(e) => !isDragging && (e.currentTarget.style.borderColor = 'var(--border)')}
            >
                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
                <div style={{ color: isDragging ? '#10b981' : 'var(--text-secondary)', marginBottom: '12px', transform: isDragging ? 'translateY(-5px)' : 'translateY(0)', transition: 'all 0.3s' }}>
                    <ImagePlus size={36} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: isDragging ? '#059669' : 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '700', transition: 'color 0.3s' }}>
                    {isUploading ? 'Uploader billeder...' : (isDragging ? 'Slip filerne her for at uploade' : 'Klik eller træk billeder hertil')}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>Tag et billede med mobilen eller vælg fra galleriet (Valgfrit)</p>
            </div>
            
            {photos && photos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                    {photos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                            <img src={url} alt="Uploadet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                                onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                                style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button className="wizard-btn wizard-btn-secondary" onClick={prevStep} disabled={isUploading}>← Tilbage</button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {quickRecalculate && (
                        <button className="wizard-btn wizard-btn-primary" onClick={quickRecalculate} disabled={isUploading} style={{ boxShadow: '0 10px 25px rgba(59,130,246,0.3)' }}>
                            Gem & Vis Overslag →
                        </button>
                    )}
                    <button className={`wizard-btn ${quickRecalculate ? 'wizard-btn-secondary' : 'wizard-btn-primary'}`} onClick={nextStep} disabled={isUploading}>
                        {quickRecalculate ? 'Bekræft Kontaktinfo →' : 'Fortsæt →'}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Step3Photos;
