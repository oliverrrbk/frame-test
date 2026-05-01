import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const Step3Photos = ({ category, photos, setPhotos, notes, setNotes, nextStep, prevStep }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsUploading(true);
        const uploadedUrls = [];

        for (const file of files) {
            try {
                // Ensure unique file name
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('lead-images')
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                // Get public URL
                const { data: publicUrlData } = supabase.storage
                    .from('lead-images')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrlData.publicUrl);
            } catch (error) {
                console.error("Error uploading image:", error);
                toast.error(`Kunne ikke uploade billedet: ${file.name}`);
            }
        }

        if (uploadedUrls.length > 0) {
            setPhotos([...photos, ...uploadedUrls]);
            toast.success(`${uploadedUrls.length} billede(r) uploadet!`);
        }
        
        setIsUploading(false);
        // Reset input so the same files can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removePhoto = (indexToRemove) => {
        setPhotos(photos.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <section className="wizard-step active">
            <div className="step-header">
                <h2>{category === 'special' ? 'Vedhæft billeder af opgaven' : 'Beskriv de særlige forhold'}</h2>
                <p>{category === 'special' ? 'AI-tømreren har noteret dine ønsker. Vedhæft meget gerne et par billeder, så tømreren kan se opgaven med egne øjne.' : 'Har du nogle specifikke krav, udfordringer eller drømme? Skriv dem her og vedhæft meget gerne et par billeder af området.'}</p>
            </div>
            
            <div className="form-group" style={{ marginBottom: '30px' }}>
                <label>Eksakt situation og specielle ønsker (Valgfrit men godt)</label>
                <textarea 
                    rows="4" 
                    placeholder="F.eks. Der er ret skæve lister i stuen, og jeg drømmer om at gulvet skal lægges i forlængelse af køkkenet uden overgange..." 
                    style={{ width: '100%', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div 
                className="upload-area" 
                onClick={() => !isUploading && fileInputRef.current && fileInputRef.current.click()}
                style={{ 
                    cursor: isUploading ? 'wait' : 'pointer', 
                    opacity: isUploading ? 0.7 : 1,
                    border: '2px dashed #94a3b8',
                    padding: '30px',
                    textAlign: 'center',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    marginBottom: '20px'
                }}
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
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📸</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
                    {isUploading ? 'Uploader billeder...' : 'Klik for at uploade billeder af området'}
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Tag et billede med mobilen eller vælg fra galleriet (Valgfrit)</p>
            </div>
            
            {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginBottom: '30px' }}>
                    {photos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                            <img src={url} alt="Uploadet" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                                onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '12px', lineHeight: '1' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="actions" style={{ marginTop: '30px' }}>
                <button className="btn-secondary" onClick={prevStep} disabled={isUploading}>Tilbage</button>
                <button className="btn-primary" onClick={nextStep} disabled={isUploading}>Fortsæt</button>
            </div>
        </section>
    );
};

export default Step3Photos;
