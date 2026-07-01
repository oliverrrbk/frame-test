import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { PlusSquare, PenTool, Trash2, Calendar, FileText, X, FolderOutput, FileDown, Search, Check, ArrowLeft, Folder, Tag } from 'lucide-react';
import GorgeousSingleSelect from '../Dashboard/GorgeousSingleSelect';
import DrawingBoard from './DrawingBoard';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { renderElementsToCanvas } from './renderUtils';
import SectionTour from '../Dashboard/SectionTour';
import { shouldShowCoach } from '../Dashboard/coachmarks';
import { cacheGet, cacheSet } from '../../utils/dataCache';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

// Rundtur for Skitser & Tegninger — let men grundig. Kun desktop, første gang,
// og kun på hoved-biblioteket (ikke når galleriet er indlejret i en sagsmappe).
const DRAWINGS_TOUR_STEPS = [
    { sel: '[data-tour="drawings-new"]', placement: 'bottom', eyebrow: 'Skitser & Tegninger', title: 'Tegn direkte i Frame', body: 'Lav en plantegning, opmåling eller en hurtig idé til kunden — på computer eller tablet. Ingen ekstra programmer.' },
    { sel: '[data-tour="drawings-demo"]', placement: 'right', eyebrow: 'Dit bibliotek', title: 'Sådan ser en skitse ud', body: 'Dine tegninger samles her. Åbn for at redigere, hent som PDF til kunden, eller knyt skitsen til en sag — så ligger den i sagens mappe.' },
];

const DrawingsGallery = ({ leadId = null, myProfile = null }) => {
    // Rundtur kun på hoved-biblioteket (ikke sagsmappe-varianten med leadId).
    const [drawingsTourActive, setDrawingsTourActive] = useState(() => !leadId && shouldShowCoach('drawings_tour'));
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const online = useOnlineStatus();
    const drawingsCacheKey = `bf:drawings:${leadId || myProfile?.id || 'all'}`;
    const [activeDrawingId, setActiveDrawingId] = useState(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [drawingToDelete, setDrawingToDelete] = useState(null);
    const [allLeads, setAllLeads] = useState([]);
    const [assigningDrawingId, setAssigningDrawingId] = useState(null);
    const [leadSearch, setLeadSearch] = useState('');
    const [selectedFolderLeadId, setSelectedFolderLeadId] = useState(null);

    const handleTagChange = async (drawingId, newTag) => {
        try {
            const drawing = drawings.find(d => d.id === drawingId);
            if (!drawing) return;
            const currentData = drawing.document_data || {};
            const newData = { ...currentData, tag: newTag };
            const { error } = await supabase.from('drawings').update({ document_data: newData }).eq('id', drawingId);
            if (error) throw error;
            setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, document_data: newData } : d));
            toast.success("Etiket opdateret");
        } catch (err) {
            console.error("Fejl:", err);
            toast.error("Kunne ikke gemme etiket.");
        }
    };

    const tagOptions = [
        { id: 'Standardtegning', name: 'Standardtegning' },
        { id: 'Inspiration', name: 'Inspiration' },
        { id: 'Hurtigt overslag', name: 'Hurtigt overslag' },
        { id: 'Privat/Sjov', name: 'Privat/Sjov' }
    ];

    const fetchDrawings = async () => {
        // OFFLINE-FØRST: vis straks sidst kendte skitser fra cachen, så galleriet ikke
        // står og loader i det uendelige uden net. Friske hentes bagefter hvis online.
        try {
            const cached = await cacheGet(drawingsCacheKey);
            if (Array.isArray(cached) && cached.length > 0) {
                setDrawings(cached);
                setIsLoading(false);
            }
        } catch { /* cache er best-effort */ }

        setIsLoading(true);
        try {
            let query = supabase.from('drawings').select('*, leads(id)').order('created_at', { ascending: false });
            
            if (leadId) {
                query = query.eq('lead_id', leadId);
            } else if (myProfile?.id) {
                query = query.eq('user_id', myProfile.id);
            }

            const { data, error } = await query;
            
            // If the table doesn't exist yet, this will throw. We catch it.
            if (error) {
                if (error.code === '42P01') {
                     // Table doesn't exist yet, user needs to run the SQL
                     toast.error("Databasen mangler 'drawings' tabellen. Kør SQL scriptet i Supabase.");
                     return;
                }
                throw error;
            }

            let enrichedData = data || [];
            if (enrichedData.length > 0) {
                const userIds = [...new Set(enrichedData.map(d => d.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase.from('profiles').select('id, owner_name, email, avatar_url').in('id', userIds);
                    if (profiles) {
                        const profileMap = {};
                        profiles.forEach(p => profileMap[p.id] = p);
                        enrichedData = enrichedData.map(d => ({
                            ...d,
                            profile: profileMap[d.user_id] || null
                        }));
                    }
                }
            }

            setDrawings(enrichedData);
            // Gem til offline-brug (best-effort). document_data kan være stort, men
            // IndexedDB rummer det fint. Miniaturer/billeder caches af service workeren.
            cacheSet(drawingsCacheKey, enrichedData);
        } catch (err) {
            console.error("Fejl ved hentning af skitser:", err);
            // Offline/fejl: behold de cachede skitser (allerede vist ovenfor).
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDrawings();
        
        // Hent igangværende sager til "Tilknyt Sag" popover
        const loadLeads = async () => {
            const { data, error } = await supabase.from('leads').select('id, customer_name, customer_address, status').order('created_at', { ascending: false });
            if (error) console.error("Fejl ved hentning af sager:", error);
            setAllLeads(data || []);
        };
        if (!leadId) { // Only needed in generic gallery
            loadLeads();
        }

        // Kom nettet tilbage mens man står på fanen? Hent friske skitser med det samme.
        const onOnline = () => { fetchDrawings(); if (!leadId) loadLeads(); };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [leadId, myProfile]);

    const handleNewDrawing = () => {
        setActiveDrawingId(null);
        setIsBoardOpen(true);
    };

    const handleOpenDrawing = (id) => {
        setActiveDrawingId(id);
        setIsBoardOpen(true);
    };

    const handleDeleteClick = (e, drawing) => {
        e.stopPropagation();
        setDrawingToDelete(drawing);
    };

    const confirmDelete = async () => {
        if (!drawingToDelete) return;
        
        try {
            const { error } = await supabase.from('drawings').delete().eq('id', drawingToDelete.id);
            if (error) throw error;
            
            toast.success("Skitse slettet");
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved sletning:", err);
            toast.error("Kunne ikke slette skitsen");
        } finally {
            setDrawingToDelete(null);
        }
    };

    const handleBoardClose = () => {
        setIsBoardOpen(false);
        fetchDrawings(); // Refresh the list
    };

    const handleDownloadPdf = async (e, drawing) => {
        e.stopPropagation();
        
        const hasNativeDocument = Array.isArray(drawing.document_data) && drawing.document_data.length > 0;
        if (!hasNativeDocument && !drawing.image_url && !drawing.document_data?.thumbnail_svg) {
            toast.error("Skitsen har intet billede endnu. Åbn og gem den én gang for at generere et.");
            return;
        }

        try {
            toast.loading("Genererer PDF...", { id: "pdf_gen" });

            let canvas;

            if (hasNativeDocument) {
                const rendered = await renderElementsToCanvas(drawing.document_data, {
                    width: 2480,
                    height: 1754,
                    padding: 140
                });
                canvas = rendered.canvas;
            } else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                if (drawing.image_url) {
                    // We have a direct JPEG/PNG URL
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error("Kunne ikke indlæse tegningen som billede."));
                        img.src = drawing.image_url;
                    });
                } else {
                    // Fallback to old SVG string logic
                    let svgString = drawing.document_data.thumbnail_svg;
                    
                    // Chrome/Safari nægter at tegne SVGer uden xmlns på et canvas
                    if (!svgString.includes('xmlns=')) {
                        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
                    }
                    // Hvis viewBox findes men ingen width/height, sæt default så billedet ikke bliver 0x0
                    if (!svgString.includes('width=') && svgString.includes('viewBox=')) {
                        svgString = svgString.replace('<svg ', '<svg width="1920" height="1080" ');
                    }
                    
                    // Base64 encode for at undgå problemer med specialtegn i blob/data URL'er
                    const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error("Kunne ikke indlæse tegningen som billede. SVG formatfejl."));
                        img.src = url;
                    });
                }
                
                canvas = document.createElement('canvas');
                canvas.width = 2480; 
                canvas.height = 1754;
                const ctx = canvas.getContext('2d');
                
                // Hvid baggrund
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const imgW = img.width || 2480;
                const imgH = img.height || 1754;
                const scale = Math.min(canvas.width / imgW, canvas.height / imgH);
                const w = imgW * scale;
                const h = imgH * scale;
                const x = (canvas.width / 2) - (w / 2);
                const y = (canvas.height / 2) - (h / 2);
                
                ctx.drawImage(img, x, y, w, h);
            }
            
            const pngDataUrl = canvas.toDataURL('image/png', 1.0);

            const { jsPDF } = await import('jspdf'); // udskudt: hentes først ved PDF-download
            const pdf = new jsPDF('l', 'mm', 'a4');
            pdf.addImage(pngDataUrl, 'PNG', 0, 0, 297, 210, '', 'FAST'); 
            
            pdf.save(`Skitse_${drawing.name || 'Dokument'}.pdf`);
            toast.success("PDF Downloadet!", { id: "pdf_gen" });
            
        } catch (err) {
            console.error("PDF Export fejl:", err);
            toast.error("Kunne ikke generere PDF: " + err.message, { id: "pdf_gen" });
        }
    };

    const handleAssignLeadClick = (e, drawingId) => {
        e.stopPropagation();
        setAssigningDrawingId(assigningDrawingId === drawingId ? null : drawingId);
        setLeadSearch('');
    };

    const assignToLead = async (e, drawingId, newLeadId) => {
        e.stopPropagation();
        try {
            const { error } = await supabase.from('drawings').update({ lead_id: newLeadId }).eq('id', drawingId);
            if (error) throw error;
            toast.success("Skitse tilknyttet sag!");
            setAssigningDrawingId(null);
            fetchDrawings();
        } catch (err) {
            console.error(err);
            toast.error("Kunne ikke tilknytte sagen.");
        }
    };


    const renderDrawingCard = (drawing) => (
        <div 
                            key={drawing.id}
                            onClick={() => handleOpenDrawing(drawing.id)}
                            style={{
                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                                cursor: 'pointer', position: 'relative',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                display: 'flex', flexDirection: 'column'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-6px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.04)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03)';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            {/* Thumbnail area */}
                            <div style={{ 
                                height: '180px', background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)', borderBottom: '1px solid #e2e8f0',
                                borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                            }}>
                                {drawing.type === 'upload' && drawing.document_data?.url ? (
                                    <img src={drawing.document_data.url} alt="Officiel Tegning" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : drawing.type === 'tldraw' && drawing.image_url ? (
                                    <img src={drawing.image_url} alt="Skitse Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : drawing.type === 'tldraw' && drawing.document_data?.thumbnail_svg ? (
                                    <div 
                                        style={{ width: '100%', height: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        dangerouslySetInnerHTML={{ __html: drawing.document_data.thumbnail_svg }} 
                                    />
                                ) : (
                                    <div style={{ background: 'white', padding: '20px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                        {drawing.type === 'upload' ? (
                                            <FileText size={40} strokeWidth={1.5} style={{ color: '#64748b' }} />
                                        ) : (
                                            <PenTool size={40} strokeWidth={1.5} style={{ color: '#64748b' }} />
                                        )}
                                    </div>
                                )}
                                
                                <button
                                    onClick={(e) => handleDeleteClick(e, drawing)}
                                    style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        padding: '8px', color: '#ef4444', cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        backdropFilter: 'blur(4px)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                    onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    title="Slet skitse"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            {/* Info area */}
                            <div style={{ padding: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {drawing.name}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                    <Calendar size={16} />
                                    <span>Sidst redigeret: {format(new Date(drawing.created_at), 'd. MMM yyyy', { locale: da })}</span>
                                </div>
                                {drawing.lead_id && (
                                    <div style={{ 
                                        marginTop: '16px',
                                        display: 'inline-flex', padding: '4px 10px', 
                                        backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '6px', 
                                        fontSize: '0.8rem', fontWeight: 600, border: '1px solid #bbf7d0'
                                    }}>
                                        Sag: {drawing.leads?.id ? String(drawing.leads.id).substring(0, 8) : 'Ukendt'}
                                    </div>
                                )}

                                {/* Profil Avatar */}
                                {drawing.profile && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%', 
                                            background: drawing.profile.avatar_url ? `url(${drawing.profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            {!drawing.profile.avatar_url && (drawing.profile.owner_name?.substring(0, 2).toUpperCase() || 'BF')}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {drawing.profile.owner_name || drawing.profile.email}
                                        </span>
                                    </div>
                                )}

                                
                                {/* Etiketter (Tags) */}
                                {!drawing.lead_id && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <Tag size={14} /> Etiket
                                        </div>
                                        <GorgeousSingleSelect 
                                            options={tagOptions}
                                            selectedId={drawing.document_data?.tag || ''}
                                            onChange={(val) => handleTagChange(drawing.id, val)}
                                            placeholder="Vælg etiket..."
                                            icon={Tag}
                                            colorTheme="#f59e0b"
                                        />
                                    </div>
                                )}
    
                                {/* Actions Bar - Gorgeous 2026 Style */}
                                <div className="drawings-card-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px' }} onClick={e => e.stopPropagation()}>
                                    <button 
                                        onClick={(e) => handleAssignLeadClick(e, drawing.id)}
                                        style={{ 
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', 
                                            border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', 
                                            color: '#334155', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', 
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                        }}
                                        onMouseOver={e => { 
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.08)'; 
                                            e.currentTarget.style.borderColor = '#bfdbfe'; 
                                            e.currentTarget.style.color = '#2563eb'; 
                                        }}
                                        onMouseOut={e => { 
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'; 
                                            e.currentTarget.style.borderColor = '#e2e8f0'; 
                                            e.currentTarget.style.color = '#334155'; 
                                        }}
                                    >
                                        <FolderOutput size={16} />
                                        <span>Tilknyt Sag</span>
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => handleDownloadPdf(e, drawing)}
                                        style={{ 
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', 
                                            border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', 
                                            color: '#334155', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', 
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                        }}
                                        onMouseOver={e => { 
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.08)'; 
                                            e.currentTarget.style.borderColor = '#bfdbfe'; 
                                            e.currentTarget.style.color = '#2563eb'; 
                                        }}
                                        onMouseOut={e => { 
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'; 
                                            e.currentTarget.style.borderColor = '#e2e8f0'; 
                                            e.currentTarget.style.color = '#334155'; 
                                        }}
                                    >
                                        <FileDown size={16} />
                                        <span>Hent PDF</span>
                                    </button>
                                </div>

                                {/* Assign Popover */}
                                {assigningDrawingId === drawing.id && (
                                    <div style={{
                                        position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)',
                                        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                                        borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(226,232,240,0.8)',
                                        padding: '16px', zIndex: 100, width: '90%', maxWidth: '320px',
                                        display: 'flex', flexDirection: 'column', gap: '12px'
                                    }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Vælg Sag</h5>
                                            <button onClick={(e) => { e.stopPropagation(); setAssigningDrawingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                                <X size={18} />
                                            </button>
                                        </div>
                                        
                                        <div style={{ position: 'relative' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                                            <input 
                                                type="text" 
                                                placeholder="Søg sagsnr eller navn..." 
                                                value={leadSearch}
                                                onChange={e => setLeadSearch(e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                                            />
                                        </div>

                                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                                            <button 
                                                onClick={(e) => assignToLead(e, drawing.id, null)}
                                                style={{ padding: '10px 12px', textAlign: 'left', background: 'transparent', border: '1px solid transparent', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444', fontWeight: 600, transition: 'all 0.2s' }}
                                                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                            >
                                                Fjern fra sag (Ingen sag)
                                            </button>

                                            {/* Aktive Sager */}
                                            {(() => {
                                                const activeLeads = allLeads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status || '') && (!leadSearch || String(l.id).includes(leadSearch) || l.customer_name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.customer_address?.toLowerCase().includes(leadSearch.toLowerCase())));
                                                const quoteLeads = allLeads.filter(l => !['Bekræftet opgave', 'Historik'].includes(l.status || '') && (!leadSearch || String(l.id).includes(leadSearch) || l.customer_name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.customer_address?.toLowerCase().includes(leadSearch.toLowerCase())));

                                                return (
                                                    <>
                                                        {activeLeads.length > 0 && (
                                                            <>
                                                                <div style={{ padding: '8px 4px 4px', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                                                                    Aktive Sager
                                                                </div>
                                                                {activeLeads.map(lead => (
                                                                    <button
                                                                        key={lead.id}
                                                                        onClick={(e) => assignToLead(e, drawing.id, lead.id)}
                                                                        style={{ 
                                                                            padding: '12px', textAlign: 'left', 
                                                                            background: drawing.lead_id === lead.id ? '#eff6ff' : '#f8fafc', 
                                                                            border: `1px solid ${drawing.lead_id === lead.id ? '#93c5fd' : '#e2e8f0'}`, 
                                                                            borderRadius: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseOver={e => { 
                                                                            e.currentTarget.style.backgroundColor = '#eff6ff'; 
                                                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        }}
                                                                        onMouseOut={e => { 
                                                                            e.currentTarget.style.backgroundColor = drawing.lead_id === lead.id ? '#eff6ff' : '#f8fafc'; 
                                                                            e.currentTarget.style.borderColor = drawing.lead_id === lead.id ? '#93c5fd' : '#e2e8f0';
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                        }}
                                                                    >
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            Sag: {String(lead.id).substring(0,8)}
                                                                            {drawing.lead_id === lead.id && <Check size={16} color="#2563eb" strokeWidth={3} />}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>{lead.customer_name || lead.customer_address || 'Ukendt kunde'}</span>
                                                                    </button>
                                                                ))}
                                                            </>
                                                        )}

                                                        {quoteLeads.length > 0 && (
                                                            <>
                                                                <div style={{ padding: '16px 4px 4px', fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                                                    Leads & Tilbud
                                                                </div>
                                                                {quoteLeads.map(lead => (
                                                                    <button
                                                                        key={lead.id}
                                                                        onClick={(e) => assignToLead(e, drawing.id, lead.id)}
                                                                        style={{ 
                                                                            padding: '12px', textAlign: 'left', 
                                                                            background: drawing.lead_id === lead.id ? '#fffbeb' : '#f8fafc', 
                                                                            border: `1px solid ${drawing.lead_id === lead.id ? '#fde68a' : '#e2e8f0'}`, 
                                                                            borderRadius: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseOver={e => { 
                                                                            e.currentTarget.style.backgroundColor = '#fffbeb'; 
                                                                            e.currentTarget.style.borderColor = '#fde68a';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        }}
                                                                        onMouseOut={e => { 
                                                                            e.currentTarget.style.backgroundColor = drawing.lead_id === lead.id ? '#fffbeb' : '#f8fafc'; 
                                                                            e.currentTarget.style.borderColor = drawing.lead_id === lead.id ? '#fde68a' : '#e2e8f0';
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                        }}
                                                                    >
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            Lead: {String(lead.id).substring(0,8)}
                                                                            {drawing.lead_id === lead.id && <Check size={16} color="#d97706" strokeWidth={3} />}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>{lead.customer_name || lead.customer_address || 'Ukendt kunde'}</span>
                                                                    </button>
                                                                ))}
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
    );
    
    if (isBoardOpen) {
        return createPortal(
            <DrawingBoard drawingId={activeDrawingId} leadId={leadId} onClose={handleBoardClose} />,
            document.body
        );
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="drawings-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em' }}>
                        <div style={{ padding: '10px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '12px', display: 'flex', color: '#2563eb' }}>
                            <PenTool size={24} strokeWidth={2.5} />
                        </div>
                        {leadId ? 'Skitser & Tegninger (Sagsmappe)' : 'Mit Skitse-bibliotek'}
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '1.05rem', lineHeight: 1.5, maxWidth: '600px' }}>
                        {leadId 
                            ? 'Her kan du tegne skitser, notere opmålinger og udarbejde plantegninger specifikt til denne sag.' 
                            : 'Få det fulde overblik over alle dine byggetegninger. Tegn frit, og kobl dem senere på dine opgaver.'}
                    </p>
                </div>
                
                <button
                    data-tour="drawings-new"
                    onClick={handleNewDrawing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white',
                        padding: '12px 24px', borderRadius: '10px',
                        fontWeight: 600, fontSize: '1.05rem', border: 'none', cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.15)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(37, 99, 235, 0.4), 0 10px 10px -5px rgba(37, 99, 235, 0.2)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.15)';
                    }}
                >
                    <PlusSquare size={22} />
                    Opret Ny Skitse
                </button>
            </div>

            {/* Demo-skitse — vises kun under rundvisningen, så man ser hvordan en tegning ser ud. */}
            {drawingsTourActive && (
                <div style={{ position: 'relative', maxWidth: '300px', marginBottom: '32px' }}>
                    <span style={{ position: 'absolute', top: -9, left: 16, zIndex: 1, background: '#0f172a', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '20px' }}>Eksempel</span>
                    <div data-tour="drawings-demo" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: '150px', background: '#f8fafc', borderBottom: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="200" height="120" viewBox="0 0 200 120" role="img" aria-label="Plantegning">
                                <rect x="20" y="18" width="160" height="84" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" />
                                <line x1="110" y1="18" x2="110" y2="102" stroke="#94a3b8" strokeWidth="2.5" />
                                <line x1="110" y1="60" x2="110" y2="78" stroke="#fff" strokeWidth="3" />
                                <path d="M110 78 A18 18 0 0 1 128 60" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                                <line x1="20" y1="110" x2="180" y2="110" stroke="#3b82f6" strokeWidth="1.5" />
                                <line x1="20" y1="106" x2="20" y2="114" stroke="#3b82f6" strokeWidth="1.5" />
                                <line x1="180" y1="106" x2="180" y2="114" stroke="#3b82f6" strokeWidth="1.5" />
                                <text x="100" y="44" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter, sans-serif">Stue</text>
                                <text x="145" y="44" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter, sans-serif">Køkken</text>
                                <text x="100" y="120" textAnchor="middle" fontSize="8" fill="#3b82f6" fontFamily="Inter, sans-serif">8,40 m</text>
                            </svg>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Plantegning – stue</h4>
                            <p style={{ margin: '4px 0 14px', fontSize: '0.85rem', color: '#64748b' }}>Knyttet til Sag 1042 · i dag</p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[[PenTool, 'Åbn'], [FileDown, 'PDF'], [FolderOutput, 'Tilknyt sag']].map(([Ic, lbl]) => (
                                    <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}><Ic size={13} /> {lbl}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Henter dine skitser...</span>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (drawings.length === 0 && !online) ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', background: 'linear-gradient(to bottom, rgba(248,250,252,0.5), rgba(241,245,249,0.8))', border: '2px dashed #cbd5e1', borderRadius: '20px', marginTop: '20px' }}>
                    <div style={{ width: '72px', height: '72px', background: 'linear-gradient(145deg,#fef3c7,#fde68a)', color: '#b45309', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 8px 22px rgba(15,23,42,0.10)' }}>
                        <FileText size={34} />
                    </div>
                    <h3 style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px' }}>Skitser kræver internet</h3>
                    <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
                        Du er offline lige nu. Skitser du har åbnet før vises automatisk — og så snart du har forbindelse igen, henter vi resten med det samme.
                    </p>
                </div>
            ) : drawings.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', padding: '100px 20px', 
                    background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0.5), rgba(241, 245, 249, 0.8))', 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '20px', marginTop: '20px',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.01)'
                }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        <PenTool size={40} style={{ color: '#3b82f6', opacity: 0.8 }} />
                    </div>
                    <h3 style={{ color: '#1e293b', fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>Klar til at tegne?</h3>
                    <p style={{ color: '#64748b', maxWidth: '450px', margin: '0 auto 30px', fontSize: '1.05rem', lineHeight: 1.6 }}>
                        Start med et blankt lærred. Perfekt til opmålinger, bygningsdetaljer eller til at visualisere dine tanker.
                    </p>
                    <button 
                        onClick={handleNewDrawing}
                        style={{
                            backgroundColor: 'white', color: '#2563eb', border: '1px solid #bfdbfe',
                            padding: '12px 24px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                            fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    >
                        <PlusSquare size={20} />
                        Åbn tegneprogrammet
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* HVIS VI ER INDE I EN SAG ELLER HAR VALGT EN MAPPE */}
                    {(leadId || selectedFolderLeadId) ? (
                        <div>
                            {!leadId && (
                                <button 
                                    onClick={() => setSelectedFolderLeadId(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.05rem', fontWeight: 600, padding: 0 }}
                                >
                                    <ArrowLeft size={20} /> Tilbage til Sagsmapper
                                </button>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                {drawings.filter(d => d.lead_id === (leadId || selectedFolderLeadId)).map(drawing => renderDrawingCard(drawing))}
                            </div>
                        </div>
                    ) : (
                        /* HVIS VI ER I DET GENERELLE BIBLIOTEK (Mit Skitse-bibliotek) */
                        <>
                            {/* SEKTION 1: SAGSMAPPER */}
                            <div>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Folder color="#2563eb" /> Tilknyttede Sager
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {Object.entries(drawings.reduce((acc, d) => {
                                        if (d.lead_id) {
                                            if (!acc[d.lead_id]) acc[d.lead_id] = { leadId: d.lead_id, count: 0, lead: allLeads.find(l => l.id === d.lead_id) || d.leads, latestDate: d.created_at };
                                            acc[d.lead_id].count++;
                                        }
                                        return acc;
                                    }, {})).map(([fId, folder]) => (
                                        <div 
                                            key={fId}
                                            onClick={() => setSelectedFolderLeadId(fId)}
                                            style={{
                                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                                                cursor: 'pointer', padding: '24px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                                display: 'flex', flexDirection: 'column', gap: '12px'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03)';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ padding: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '12px', color: '#2563eb' }}>
                                                    <Folder size={32} />
                                                </div>
                                                <span style={{ padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    {folder.count} tegning{folder.count !== 1 ? 'er' : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 700 }}>
                                                    Sag: {String(folder.leadId).substring(0,8)}
                                                </h4>
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                                    Sidste tegning: {format(new Date(folder.latestDate), 'd. MMM yyyy', { locale: da })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />

                            {/* SEKTION 2: LØSE KLADDER */}
                            <div>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PenTool color="#d97706" /> Skrivebordet (Løse Kladder)
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {drawings.filter(d => !d.lead_id).map(drawing => renderDrawingCard(drawing))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            {drawingToDelete && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 999999,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '32px', borderRadius: '24px',
                        width: '100%', maxWidth: '420px', textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        animation: 'slideUpScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Trash2 size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                            Slet skitse?
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '32px' }}>
                            Er du sikker på, at du vil slette skitsen <strong>"{drawingToDelete.name}"</strong>? Denne handling kan ikke fortrydes.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setDrawingToDelete(null)}
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    backgroundColor: '#f1f5f9', color: '#475569',
                                    fontWeight: 600, fontSize: '1.05rem', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={confirmDelete}
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    backgroundColor: '#ef4444', color: 'white',
                                    fontWeight: 600, fontSize: '1.05rem', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.backgroundColor = '#ef4444';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Slet Skitse
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes slideUpScale {
                            from { opacity: 0; transform: scale(0.95) translateY(10px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                    `}</style>
                </div>,
                document.body
            )}

            {drawingsTourActive && (
                <SectionTour tourKey="drawings_tour" steps={DRAWINGS_TOUR_STEPS} onDone={() => setDrawingsTourActive(false)} />
            )}
        </div>
    );
};

export default DrawingsGallery;
