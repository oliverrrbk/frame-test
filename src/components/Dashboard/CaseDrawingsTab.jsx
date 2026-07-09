import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { PenTool, Upload, Trash2, Calendar, FileText, Image as ImageIcon, X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import DrawingBoard from '../Drawings/DrawingBoard';
import FileDropzone from '../ui/FileDropzone';
import UserAvatar from '../ui/UserAvatar';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

export default function CaseDrawingsTab({ selectedCase, profile, isMobile = false }) {
    const [drawings, setDrawings] = useState([]);
    const [creatorsById, setCreatorsById] = useState({}); // skitse-skabere (id -> profil m. avatar)
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    // For Sletning
    const [drawingToDelete, setDrawingToDelete] = useState(null);
    const [activeOfficialGroup, setActiveOfficialGroup] = useState(null);
    const [activeOfficialIndex, setActiveOfficialIndex] = useState(0);
    
    // For DrawingBoard
    const [activeDrawingId, setActiveDrawingId] = useState(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    
    const fileInputRef = useRef(null);
    const viewerTouchStartX = useRef(null);

    const fetchDrawings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('drawings')
                .select('id, name, created_at, type, image_url, lead_id, user_id, updated_at, document_data')
                .eq('lead_id', selectedCase.id)
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code !== '42P01') throw error;
            } else {
                setDrawings(data || []);
                // Berig med skaber-profiler (navn + profilbillede) til visning på skitserne.
                const ids = [...new Set((data || []).map(x => x.user_id).filter(Boolean))];
                if (ids.length > 0) {
                    const { data: profs } = await supabase
                        .from('profiles')
                        .select('id, owner_name, email, avatar_url')
                        .in('id', ids);
                    const map = {};
                    (profs || []).forEach(p => { map[p.id] = p; });
                    setCreatorsById(map);
                }
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
            // Fjern blot tilknytningen til denne sag, så tegningen overlever i "Skitse-biblioteket"
            const ids = drawingToDelete.ids || [drawingToDelete.id];
            const { error } = await supabase
                .from('drawings')
                .update({ lead_id: null })
                .in('id', ids);
                
            if (error) throw error;
            
            toast.success(ids.length > 1 ? "Tegningssæt fjernet fra sagen!" : "Tegning fjernet fra sagen!");
            if (activeOfficialGroup && ids.includes(activeOfficialGroup.files?.[activeOfficialIndex]?.id)) {
                setActiveOfficialGroup(null);
                setActiveOfficialIndex(0);
            }
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved sletning:", err);
            toast.error("Kunne ikke slette tegningen");
        } finally {
            setDrawingToDelete(null);
        }
    };

    const handleFileUpload = async (event) => {
        await processUploadFiles(Array.from(event.target.files || []));
    };

    const processUploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const toastId = toast.loading(files.length > 1 ? `Uploader ${files.length} tegninger...` : "Uploader tegning...");

        try {
            const uploadStamp = Date.now();
            const groupId = `official_${selectedCase.id}_${uploadStamp}`;
            const groupName = files.length > 1 ? `Officielle tegninger (${files.length})` : files[0].name;
            const newDrawings = [];

            for (let index = 0; index < files.length; index += 1) {
                const file = files[index];
                const fileExt = file.name.split('.').pop();
                const safeExt = fileExt || 'file';
                const fileName = `drawing_${selectedCase.id}_${uploadStamp}_${index}.${safeExt}`;

                // Upload til Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });
                    
                if (uploadError) throw uploadError;

                // Hent den offentlige URL
                const { data: { publicUrl } } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(fileName);

                newDrawings.push({
                    name: file.name,
                    type: 'upload',
                    lead_id: selectedCase.id,
                    user_id: profile?.id,
                    document_data: {
                        url: publicUrl,
                        filename: fileName,
                        originalName: file.name,
                        size: file.size,
                        fileType: file.type,
                        groupId,
                        groupName,
                        groupSize: files.length,
                        fileIndex: index,
                        uploadedAt: new Date(uploadStamp).toISOString()
                    }
                });
            }

            const { error: dbError } = await supabase
                .from('drawings')
                .insert(newDrawings);

            if (dbError) throw dbError;

            toast.success(files.length > 1 ? "Tegningssæt uploadet!" : "Tegning uploadet!", { id: toastId });
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved upload:", err);
            toast.error("Kunne ikke uploade tegningen", { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const uploadDrawings = drawings.filter(d => d.type === 'upload');
    const sketchDrawings = drawings.filter(d => d.type !== 'upload');
    const officialGroups = Object.values(uploadDrawings.reduce((acc, drawing) => {
        const data = drawing.document_data || {};
        const groupId = data.groupId || drawing.id;
        if (!acc[groupId]) {
            acc[groupId] = {
                id: groupId,
                name: data.groupName || drawing.name || 'Officielle tegninger',
                created_at: data.uploadedAt || drawing.created_at,
                files: []
            };
        }
        acc[groupId].files.push(drawing);
        return acc;
    }, {})).map(group => ({
        ...group,
        files: group.files.sort((a, b) => {
            const aIndex = Number.isFinite(Number(a.document_data?.fileIndex)) ? Number(a.document_data.fileIndex) : 0;
            const bIndex = Number.isFinite(Number(b.document_data?.fileIndex)) ? Number(b.document_data.fileIndex) : 0;
            if (aIndex !== bIndex) return aIndex - bIndex;
            return new Date(a.created_at) - new Date(b.created_at);
        })
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const openOfficialGroup = (group, index = 0) => {
        setActiveOfficialGroup(group);
        setActiveOfficialIndex(index);
    };

    const closeOfficialViewer = () => {
        setActiveOfficialGroup(null);
        setActiveOfficialIndex(0);
    };

    const goToOfficialFile = (nextIndex) => {
        if (!activeOfficialGroup?.files?.length) return;
        const maxIndex = activeOfficialGroup.files.length - 1;
        setActiveOfficialIndex(Math.max(0, Math.min(maxIndex, nextIndex)));
    };

    const handleViewerTouchEnd = (e) => {
        if (viewerTouchStartX.current === null) return;
        const diff = viewerTouchStartX.current - e.changedTouches[0].clientX;
        viewerTouchStartX.current = null;
        if (Math.abs(diff) < 45) return;
        goToOfficialFile(activeOfficialIndex + (diff > 0 ? 1 : -1));
    };

    const renderOfficialPreview = (file, compact = false) => {
        const data = file?.document_data || {};
        const isImage = data.fileType?.startsWith('image/');
        const isPdf = data.fileType === 'application/pdf';

        if (isImage && data.url) {
            return <img src={data.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
        }

        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? '6px' : '10px',
                background: isPdf ? 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                color: isPdf ? '#0284c7' : '#64748b'
            }}>
                {isPdf ? <FileText size={compact ? 24 : 34} strokeWidth={1.8} /> : <ImageIcon size={compact ? 24 : 34} strokeWidth={1.8} />}
                {!compact && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                        {isPdf ? 'PDF' : 'FIL'}
                    </span>
                )}
            </div>
        );
    };

    const renderOfficialGroupCard = (group) => {
        const firstFile = group.files[0];
        const fileCount = group.files.length;
        const isMulti = fileCount > 1;
        const deleteTarget = {
            id: group.id,
            ids: group.files.map(file => file.id),
            name: isMulti ? group.name : firstFile?.name
        };

        return (
            <div 
                key={group.id}
                onClick={() => openOfficialGroup(group)}
                style={{
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: isMobile ? '18px' : '14px',
                    padding: isMobile ? '12px' : '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    boxShadow: '0 10px 30px rgba(14, 165, 233, 0.08)',
                    overflow: 'hidden'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 28px rgba(14, 165, 233, 0.14)';
                    e.currentTarget.style.borderColor = '#0ea5e9';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(14, 165, 233, 0.08)';
                    e.currentTarget.style.borderColor = '#bae6fd';
                }}
            >
                <button 
                    onClick={(e) => triggerDelete(e, deleteTarget)}
                    style={{
                        position: 'absolute', top: isMobile ? '14px' : '12px', right: isMobile ? '14px' : '12px',
                        background: 'rgba(255,255,255,0.92)', border: '1px solid #fecaca', color: '#ef4444',
                        width: isMobile ? '42px' : '34px', height: isMobile ? '42px' : '34px', borderRadius: isMobile ? '14px' : '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(15,23,42,0.08)', transition: 'all 0.2s', zIndex: 10,
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; }}
                    title={isMulti ? 'Fjern tegningssæt fra sag' : 'Fjern tegning fra sag'}
                >
                    <Trash2 size={isMobile ? 20 : 16} />
                </button>

                {isMulti && (
                    <div style={{
                        position: 'absolute',
                        top: isMobile ? '14px' : '12px',
                        left: isMobile ? '14px' : '12px',
                        zIndex: 9,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 10px',
                        borderRadius: '999px',
                        background: 'rgba(15, 23, 42, 0.82)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backdropFilter: 'blur(10px)'
                    }}>
                        <FileText size={14} />
                        {fileCount} filer
                    </div>
                )}

                <div style={{ 
                    width: '100%',
                    height: isMobile ? '170px' : '160px',
                    background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: isMobile ? '14px' : '10px', 
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e0f2fe',
                    overflow: 'hidden'
                }}>
                    {renderOfficialPreview(firstFile)}
                </div>
                
                {isMulti && (
                    <div style={{ display: 'flex', gap: '6px', margin: '-4px 0 12px 0', overflow: 'hidden' }}>
                        {group.files.slice(0, 5).map((file, index) => (
                            <div key={file.id} style={{
                                width: '38px',
                                height: '30px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: index === 0 ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                                flexShrink: 0,
                                background: '#f8fafc'
                            }}>
                                {renderOfficialPreview(file, true)}
                            </div>
                        ))}
                        {fileCount > 5 && (
                            <div style={{ width: '38px', height: '30px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                                +{fileCount - 5}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '0.7rem', fontWeight: 800, padding: '3px 7px', borderRadius: '999px', textTransform: 'uppercase' }}>
                            OFFICIEL
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {format(new Date(group.created_at), 'd. MMM yyyy', { locale: da })}
                        </span>
                    </div>
                    <h4 style={{ margin: '2px 0 0 0', color: '#0f172a', fontSize: isMobile ? '1rem' : '1rem', fontWeight: 800, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {group.name}
                    </h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                        {isMulti ? 'Tryk for at swipe mellem tegningerne' : firstFile?.name}
                    </p>
                </div>
            </div>
        );
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
                        // SVG vises via <img> data-URI: browseren kører ALDRIG scripts i
                        // en SVG hentet som billede → ingen stored-XSS fra en gemt tegning.
                        <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(d.document_data.thumbnail_svg)}`}
                            alt="Skitse Thumbnail"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
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
                    {(() => {
                        const c = creatorsById[d.user_id];
                        if (!c) return null;
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                <UserAvatar name={c.owner_name || c.email || ''} avatarUrl={c.avatar_url} size={20} ring={false} />
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{c.owner_name || c.email}</span>
                            </div>
                        );
                    })()}
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

    const activeOfficialFile = activeOfficialGroup?.files?.[activeOfficialIndex] || null;
    const activeOfficialData = activeOfficialFile?.document_data || {};
    const activeOfficialIsImage = activeOfficialData.fileType?.startsWith('image/');
    const activeOfficialIsPdf = activeOfficialData.fileType === 'application/pdf';

    return (
        <div style={{ padding: '24px', backgroundColor: '#fafaf9' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '1.6rem' : '1.4rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Tegninger & Skitser
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
                        Tegn egne skitser direkte i appen, eller upload officielle arkitekttegninger (PDF/Billeder).
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                    {/* Skjult file input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="application/pdf,image/*" 
                        multiple
                        style={{ display: 'none' }} 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'white', color: '#0f172a', border: '1px solid #cbd5e1',
                            padding: isMobile ? '16px' : '10px 16px', borderRadius: isMobile ? '14px' : '8px', width: isMobile ? '100%' : 'auto',
                            fontWeight: 600, fontSize: isMobile ? '1.05rem' : '0.95rem', cursor: isUploading ? 'wait' : 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => !isUploading && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseOut={e => !isUploading && (e.currentTarget.style.backgroundColor = 'white')}
                    >
                        <Upload size={18} />
                        {isUploading ? 'Uploader...' : 'Upload Tegninger'}
                    </button>

                    <button 
                        onClick={handleNewDrawing}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white', border: 'none',
                            padding: isMobile ? '16px' : '10px 16px', borderRadius: isMobile ? '14px' : '8px', width: isMobile ? '100%' : 'auto',
                            fontWeight: 600, fontSize: isMobile ? '1.05rem' : '0.95rem', cursor: 'pointer',
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

            {/* Træk-og-slip: PDF/billede kan trækkes direkte ind her */}
            <div style={{ marginBottom: '24px' }}>
                <FileDropzone
                    accept="application/pdf,image/*"
                    multiple
                    disabled={isUploading}
                    onFiles={(files) => processUploadFiles(files)}
                    title={isUploading ? 'Uploader…' : 'Træk tegninger (PDF/billede) hertil eller klik'}
                    hint="Officielle arkitekttegninger, skitser m.m."
                />
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
                    {officialGroups.length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} style={{ color: '#0ea5e9' }} />
                                Officielle Tegninger
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '14px' : '20px' }}>
                                {officialGroups.map(group => renderOfficialGroupCard(group))}
                            </div>
                        </div>
                    )}

                    {/* SEKTION 2: VÆRKSTEDET (SKITSER & IDÉER) */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PenTool size={18} style={{ color: '#8b5cf6' }} />
                            Værkstedet (Arbejds-skitser)
                        </h4>
                        {sketchDrawings.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
                                {sketchDrawings.map(d => renderDrawingCard(d))}
                            </div>
                        ) : (
                            <div style={{ padding: '30px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                Ingen skitser endnu. Tryk på "Tegn Ny Skitse" for at starte værkstedet.
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeOfficialGroup && activeOfficialFile && createPortal(
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        background: 'rgba(15, 23, 42, 0.82)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: isMobile ? 'max(env(safe-area-inset-top), 14px) 12px max(env(safe-area-inset-bottom), 14px)' : '24px',
                        boxSizing: 'border-box'
                    }}
                    onTouchStart={(e) => { viewerTouchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={handleViewerTouchEnd}
                >
                    <div style={{
                        width: '100%',
                        maxWidth: '1120px',
                        margin: '0 auto 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        color: '#fff'
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <FileText size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                                <strong style={{ fontSize: isMobile ? '0.98rem' : '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                    {activeOfficialGroup.name}
                                </strong>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700 }}>
                                {activeOfficialIndex + 1} / {activeOfficialGroup.files.length} · {activeOfficialFile.name}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {activeOfficialData.url && (
                                <>
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = activeOfficialData.url;
                                            link.download = activeOfficialFile.name || 'tegning';
                                            link.target = '_blank';
                                            link.rel = 'noreferrer';
                                            link.click();
                                        }}
                                        style={{
                                            width: isMobile ? '40px' : '42px',
                                            height: isMobile ? '40px' : '42px',
                                            borderRadius: '14px',
                                            border: '1px solid rgba(255,255,255,0.18)',
                                            background: 'rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(12px)'
                                        }}
                                        title="Download"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => window.open(activeOfficialData.url, '_blank')}
                                        style={{
                                            width: isMobile ? '40px' : '42px',
                                            height: isMobile ? '40px' : '42px',
                                            borderRadius: '14px',
                                            border: '1px solid rgba(255,255,255,0.18)',
                                            background: 'rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(12px)'
                                        }}
                                        title="Åbn original"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={closeOfficialViewer}
                                style={{
                                    width: isMobile ? '42px' : '44px',
                                    height: isMobile ? '42px' : '44px',
                                    borderRadius: '15px',
                                    border: '1px solid rgba(255,255,255,0.18)',
                                    background: 'rgba(255,255,255,0.16)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(12px)'
                                }}
                                title="Luk"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        maxWidth: '1120px',
                        width: '100%',
                        margin: '0 auto',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {activeOfficialGroup.files.length > 1 && (
                            <>
                                <button
                                    onClick={() => goToOfficialFile(activeOfficialIndex - 1)}
                                    disabled={activeOfficialIndex === 0}
                                    style={{
                                        position: 'absolute',
                                        left: isMobile ? '4px' : '14px',
                                        zIndex: 2,
                                        width: isMobile ? '42px' : '48px',
                                        height: isMobile ? '42px' : '48px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: activeOfficialIndex === 0 ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.58)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: activeOfficialIndex === 0 ? 'not-allowed' : 'pointer',
                                        backdropFilter: 'blur(12px)'
                                    }}
                                    title="Forrige"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => goToOfficialFile(activeOfficialIndex + 1)}
                                    disabled={activeOfficialIndex >= activeOfficialGroup.files.length - 1}
                                    style={{
                                        position: 'absolute',
                                        right: isMobile ? '4px' : '14px',
                                        zIndex: 2,
                                        width: isMobile ? '42px' : '48px',
                                        height: isMobile ? '42px' : '48px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: activeOfficialIndex >= activeOfficialGroup.files.length - 1 ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.58)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: activeOfficialIndex >= activeOfficialGroup.files.length - 1 ? 'not-allowed' : 'pointer',
                                        backdropFilter: 'blur(12px)'
                                    }}
                                    title="Næste"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}

                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: isMobile ? '20px' : '24px',
                            overflow: 'hidden',
                            background: '#f8fafc',
                            boxShadow: '0 28px 80px rgba(0,0,0,0.35)',
                            border: '1px solid rgba(255,255,255,0.16)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {activeOfficialIsImage && activeOfficialData.url ? (
                                <img
                                    src={activeOfficialData.url}
                                    alt={activeOfficialFile.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        background: '#f8fafc'
                                    }}
                                />
                            ) : activeOfficialIsPdf && activeOfficialData.url ? (
                                <iframe
                                    src={activeOfficialData.url}
                                    title={activeOfficialFile.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        background: '#fff'
                                    }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
                                    <FileText size={48} style={{ color: '#0ea5e9', marginBottom: '12px' }} />
                                    <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Kan ikke forhåndsvise filen</h3>
                                    <p style={{ margin: 0 }}>Åbn originalen for at se tegningen.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeOfficialGroup.files.length > 1 && (
                        <div style={{
                            maxWidth: '1120px',
                            width: '100%',
                            margin: '12px auto 0',
                            display: 'flex',
                            gap: '8px',
                            overflowX: 'auto',
                            padding: '2px 2px 6px'
                        }}>
                            {activeOfficialGroup.files.map((file, index) => (
                                <button
                                    key={file.id}
                                    onClick={() => goToOfficialFile(index)}
                                    style={{
                                        width: isMobile ? '58px' : '76px',
                                        height: isMobile ? '48px' : '56px',
                                        flexShrink: 0,
                                        borderRadius: '12px',
                                        padding: 0,
                                        overflow: 'hidden',
                                        border: index === activeOfficialIndex ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.18)',
                                        background: '#f8fafc',
                                        cursor: 'pointer',
                                        boxShadow: index === activeOfficialIndex ? '0 0 0 4px rgba(56,189,248,0.16)' : 'none'
                                    }}
                                    title={file.name}
                                >
                                    {renderOfficialPreview(file, true)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}

            {/* Custom Delete Modal using createPortal to escape parent layout contexts */}
            {drawingToDelete && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                            <Trash2 size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Fjern tegning fra sag?</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            Er du sikker på, at du vil fjerne <strong>{drawingToDelete.name}</strong> fra denne sag? <br/><br/>
                            {drawingToDelete.ids?.length > 1 ? 'Tegningssættet' : 'Tegningen'} slettes ikke permanent, men flyttes blot tilbage til dit primære Skitse-bibliotek.
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
                                Fjern fra sag
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
