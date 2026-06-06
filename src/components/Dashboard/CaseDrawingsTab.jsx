import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { PenTool, Upload, Trash2, Calendar, FileText, Image as ImageIcon, X } from 'lucide-react';
import DrawingBoard from '../Drawings/DrawingBoard';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

export default function CaseDrawingsTab({ selectedCase, profile }) {
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    // For Sletning
    const [drawingToDelete, setDrawingToDelete] = useState(null);
    
    // For DrawingBoard
    const [activeDrawingId, setActiveDrawingId] = useState(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    
    const fileInputRef = useRef(null);

    const fetchDrawings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('drawings')
                .select('*')
                .eq('lead_id', selectedCase.id)
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code !== '42P01') throw error;
            } else {
                setDrawings(data || []);
            }
        } catch (err) {
            console.error("Fejl ved hentning af tegninger:", err);
            toast.error("Kunne ikke hente tegninger.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDrawings();
    }, [selectedCase.id]);

    const handleNewDrawing = () => {
        setActiveDrawingId(null);
        setIsBoardOpen(true);
    };

    const handleOpenDrawing = (id) => {
        setActiveDrawingId(id);
        setIsBoardOpen(true);
    };

    const handleBoardClose = () => {
        setIsBoardOpen(false);
        fetchDrawings();
    };

    const triggerDelete = (e, d) => {
        e.stopPropagation();
        setDrawingToDelete(d);
    };

    const confirmDelete = async () => {
        if (!drawingToDelete) return;
        
        try {
            // Slet selve filen fra storage, hvis det er en upload
            if (drawingToDelete.type === 'upload' && drawingToDelete.document_data?.filename) {
                // Filnavnet er gemt i DB
                const { error: storageError } = await supabase.storage
                    .from('uploads')
                    .remove([drawingToDelete.document_data.filename]);
                if (storageError) console.error("Kunne ikke slette filen i storage:", storageError);
            }

            // Slet fra databasen
            const { error } = await supabase.from('drawings').delete().eq('id', drawingToDelete.id);
            if (error) throw error;
            
            toast.success("Tegning slettet!");
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved sletning:", err);
            toast.error("Kunne ikke slette tegningen");
        } finally {
            setDrawingToDelete(null);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading("Uploader tegning...");

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `drawing_${selectedCase.id}_${Date.now()}.${fileExt}`;

            // Upload til Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
                
            if (uploadError) throw uploadError;

            // Hent den offentlige URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);

            // Indsæt i 'drawings' tabellen som type='upload'
            const newDrawing = {
                name: file.name,
                type: 'upload',
                lead_id: selectedCase.id,
                user_id: profile?.id,
                document_data: {
                    url: publicUrl,
                    filename: fileName,
                    size: file.size,
                    fileType: file.type
                }
            };

            const { error: dbError } = await supabase
                .from('drawings')
                .insert([newDrawing]);

            if (dbError) throw dbError;

            toast.success("Tegning uploadet!", { id: toastId });
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved upload:", err);
            toast.error("Kunne ikke uploade tegningen", { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const renderDrawingCard = (d) => {
        const isUpload = d.type === 'upload';
        const isPdf = isUpload && d.document_data?.fileType === 'application/pdf';
        const isImage = isUpload && d.document_data?.fileType?.startsWith('image/');
        
        return (
            <div 
                key={d.id} 
                onClick={() => {
                    if (isUpload) {
                        window.open(d.document_data.url, '_blank');
                    } else {
                        handleOpenDrawing(d.id);
                    }
                }}
                style={{
                    backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#0ea5e9';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                }}
            >
                <button 
                    onClick={(e) => triggerDelete(e, d)}
                    style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'white', border: '1px solid #fee2e2', color: '#ef4444',
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', zIndex: 10
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
                    title="Slet"
                >
                    <Trash2 size={16} />
                </button>

                <div style={{ 
                    width: '100%', height: '140px', background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '8px', 
                    marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #f1f5f9', overflow: 'hidden'
                }}>
                    {isUpload && d.document_data?.url ? (
                        <img src={d.document_data.url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : !isUpload && d.image_url ? (
                        <img src={d.image_url} alt="Skitse Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : !isUpload && d.document_data?.thumbnail_svg ? (
                        <div 
                            style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            dangerouslySetInnerHTML={{ __html: d.document_data.thumbnail_svg }} 
                        />
                    ) : (
                        <div style={{ background: 'white', padding: '16px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                            {isUpload ? (
                                <FileText size={32} strokeWidth={1.5} style={{ color: '#64748b' }} />
                            ) : (
                                <PenTool size={32} strokeWidth={1.5} style={{ color: '#64748b' }} />
                            )}
                        </div>
                    )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUpload ? (
                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                {isPdf ? 'PDF' : 'BILLEDE'}
                            </span>
                        ) : (
                            <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                SKITSE
                            </span>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {format(new Date(d.created_at), 'd. MMM yyyy', { locale: da })}
                        </span>
                    </div>
                    <h4 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1rem', fontWeight: 600, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {d.name}
                    </h4>
                </div>
            </div>
        );
    };

    // Hvis tegnebrættet er åbent, vis det i fuld skærm (modal look)
    if (isBoardOpen) {
        return createPortal(
            <DrawingBoard drawingId={activeDrawingId} leadId={selectedCase.id} onClose={handleBoardClose} />,
            document.body
        );
    }

    return (
        <div style={{ padding: '24px', backgroundColor: '#fafaf9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Tegninger & Skitser
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
                        Tegn egne skitser direkte i appen, eller upload officielle arkitekttegninger (PDF/Billeder).
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Skjult file input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="application/pdf,image/*" 
                        style={{ display: 'none' }} 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'white', color: '#0f172a', border: '1px solid #cbd5e1',
                            padding: '10px 16px', borderRadius: '8px',
                            fontWeight: 600, fontSize: '0.95rem', cursor: isUploading ? 'wait' : 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => !isUploading && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseOut={e => !isUploading && (e.currentTarget.style.backgroundColor = 'white')}
                    >
                        <Upload size={18} />
                        {isUploading ? 'Uploader...' : 'Upload Tegning'}
                    </button>

                    <button 
                        onClick={handleNewDrawing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white', border: 'none',
                            padding: '10px 16px', borderRadius: '8px',
                            fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(2, 132, 199, 0.2)', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(2, 132, 199, 0.3)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(2, 132, 199, 0.2)'; }}
                    >
                        <PenTool size={18} />
                        Tegn Ny Skitse
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    Henter tegninger...
                </div>
            ) : drawings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                    <div style={{ width: '60px', height: '60px', backgroundColor: '#f0f9ff', color: '#0ea5e9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <FileText size={30} />
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.1rem' }}>Ingen tegninger på denne sag endnu</h4>
                    <p style={{ margin: 0, color: '#64748b' }}>Upload en eksisterende tegning eller start en ny skitse fra bunden.</p>
                </div>
            ) : (
                <>
                    {/* SEKTION 1: OFFICIELLE TEGNINGER (LÅSTE) */}
                    {drawings.filter(d => d.type === 'upload').length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} style={{ color: '#0ea5e9' }} />
                                Officielle Tegninger
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {drawings.filter(d => d.type === 'upload').map(d => renderDrawingCard(d))}
                            </div>
                        </div>
                    )}

                    {/* SEKTION 2: VÆRKSTEDET (SKITSER & IDÉER) */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PenTool size={18} style={{ color: '#8b5cf6' }} />
                            Værkstedet (Arbejds-skitser)
                        </h4>
                        {drawings.filter(d => d.type !== 'upload').length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {drawings.filter(d => d.type !== 'upload').map(d => renderDrawingCard(d))}
                            </div>
                        ) : (
                            <div style={{ padding: '30px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                Ingen skitser endnu. Tryk på "Tegn Ny Skitse" for at starte værkstedet.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Custom Delete Modal using createPortal to escape parent layout contexts */}
            {drawingToDelete && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                            <Trash2 size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Slet tegning?</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            Er du sikker på, at du vil slette tegningen <strong>{drawingToDelete.name}</strong>? Dette kan ikke fortrydes.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setDrawingToDelete(null)}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={confirmDelete}
                                style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(239, 68, 68, 0.3)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(239, 68, 68, 0.2)'; }}
                            >
                                Ja, slet
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
