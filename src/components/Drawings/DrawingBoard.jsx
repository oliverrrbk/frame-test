import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, FileImage } from 'lucide-react';

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const [editor, setEditor] = useState(null);
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const rotateHandleRef = useRef(null);
    const [snapLines, setSnapLines] = useState(null);

    // Initial load of drawing data
    const handleMount = useCallback((editorInstance) => {
        setEditor(editorInstance);
        
        if (drawingId) {
            const loadDrawing = async () => {
                setIsLoading(true);
                try {
                    const { data, error } = await supabase
                        .from('drawings')
                        .select('*')
                        .eq('id', drawingId)
                        .single();
                    
                    if (error) throw error;
                    
                    if (data) {
                        setDrawingName(data.name || 'Ny Skitse');
                        if (data.document_data) {
                            loadSnapshot(editorInstance.store, data.document_data);
                        }
                    }
                } catch (err) {
                    console.error("Fejl ved indlæsning af skitse:", err);
                    toast.error("Kunne ikke indlæse skitsen");
                } finally {
                    setIsLoading(false);
                }
            };
            loadDrawing();
        } else {
             // New drawing - we don't need to clear the store because tldraw initializes it fresh.
             // editorInstance.store.clear() breaks tldraw v5 because it removes the page records.
        }
    }, [drawingId]);

    // Custom Word-style rotation handle logic using tick event
    useEffect(() => {
        if (!editor) return;

        const handleTick = () => {
            if (!rotateHandleRef.current) return;
            const ids = editor.getSelectedShapeIds();
            if (ids.length === 0) {
                rotateHandleRef.current.style.display = 'none';
                return;
            }

            const selectionPageBounds = editor.getSelectionPageBounds();
            if (!selectionPageBounds) {
                rotateHandleRef.current.style.display = 'none';
                return;
            }

            const center = selectionPageBounds.center;
            const rotation = editor.getSelectionRotation();
            
            // Get screen center
            const screenCenter = editor.pageToViewport(center);
            
            rotateHandleRef.current.style.display = 'flex';
            rotateHandleRef.current.style.left = `${screenCenter.x}px`;
            rotateHandleRef.current.style.top = `${screenCenter.y}px`;
            
            // Calculate distance to move the handle up
            const zoom = editor.getZoomLevel();
            const distanceUp = (selectionPageBounds.h / 2) * zoom + 35; // 35px above shape
            
            rotateHandleRef.current.style.transform = `translate(-50%, -50%) rotate(${rotation}rad) translateY(-${distanceUp}px)`;
        };

        editor.on('tick', handleTick);
        return () => editor.off('tick', handleTick);
    }, [editor]);

    const handleRotationPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!editor) return;
        const startCenterPage = editor.getSelectionPageBounds().center;
        
        const onPointerMove = (ev) => {
            const currentMousePage = editor.screenToPage({ x: ev.clientX, y: ev.clientY });
            
            // Calculate angle from center to mouse
            let angle = Math.atan2(currentMousePage.y - startCenterPage.y, currentMousePage.x - startCenterPage.x);
            // Offset because "top" is -90 degrees (-PI/2)
            angle += Math.PI / 2;
            
            if (angle < 0) angle += 2 * Math.PI;

            // Snapping logic (5 degrees)
            const snapThreshold = 5 * (Math.PI / 180);
            let snapLinesData = null;

            const snapAngles = [0, Math.PI/2, Math.PI, (3*Math.PI)/2, 2*Math.PI];
            for (let target of snapAngles) {
                // We check the raw difference
                let diff = Math.abs(angle - target);
                // Also handle the wrap-around at 0 and 360
                if (diff > Math.PI) diff = 2 * Math.PI - diff;
                
                if (diff < snapThreshold) {
                    angle = target;
                    // For snap lines, just pass the page center
                    snapLinesData = { centerPage: startCenterPage };
                    break;
                }
            }

            setSnapLines(snapLinesData);
            
            // Apply delta rotation
            const currentRot = editor.getSelectionRotation();
            const delta = angle - currentRot;
            if (delta !== 0) {
                editor.rotateShapesBy(editor.getSelectedShapeIds(), delta);
            }
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            setSnapLines(null);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const handleSave = async () => {
        if (!editor) return;
        setIsSaving(true);
        
        try {
            const snapshot = getSnapshot(editor.store);
            
            // Generate a thumbnail (optional, but good for gallery)
            // For now we just save the JSON data
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Ikke logget ind");

            const payload = {
                name: drawingName,
                document_data: snapshot,
                user_id: user.id,
                lead_id: leadId || null,
                type: 'tldraw'
            };

            let response;
            if (drawingId) {
                // Update existing
                response = await supabase
                    .from('drawings')
                    .update(payload)
                    .eq('id', drawingId)
                    .select();
            } else {
                // Insert new
                response = await supabase
                    .from('drawings')
                    .insert([payload])
                    .select();
            }

            if (response.error) throw response.error;
            
            toast.success("Skitse gemt!");
            
            // If it was new, we might want to close or pass back the new ID
            // For now, we'll just close it so it returns to the gallery/lead view
            onClose();

        } catch (err) {
            console.error("Fejl ved gem:", err);
            toast.error("Kunne ikke gemme skitsen: " + (err.message || err.details || "Ukendt fejl"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleMakeOfficial = async () => {
        if (!editor) return;
        setIsExporting(true);

        try {
            // First, save the current sketch
            await handleSave();

            // Next, get all shape IDs from the current page to export
            const shapeIds = Array.from(editor.getCurrentPageShapeIds());
            if (shapeIds.length === 0) {
                toast.error("Tegningen er tom");
                setIsExporting(false);
                return;
            }

            // Export to PNG blob using editor.toImage utility
            const { blob } = await editor.toImage(shapeIds, { format: 'png', background: true });

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("Ikke logget ind");

            const fileName = `official_${Date.now()}.png`;
            const filePath = `${user.id}/${fileName}`;

            // Upload the PNG blob to 'uploads' bucket
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, blob, { contentType: 'image/png' });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath);

            // Insert as 'upload' in drawings table
            const { error: dbError } = await supabase
                .from('drawings')
                .insert([{
                    name: `${drawingName} (Officiel)`,
                    lead_id: leadId || null,
                    user_id: user.id,
                    type: 'upload',
                    document_data: {
                        url: publicUrl,
                        path: filePath,
                        fileType: 'image/png'
                    }
                }]);

            if (dbError) throw dbError;

            toast.success("Skitsen er nu gemt som en Officiel Tegning!");
            onClose();

        } catch (err) {
            console.error("Fejl ved eksport:", err);
            toast.error("Kunne ikke gemme som officiel: " + (err.message || "Ukendt fejl"));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            
            <style>{`
                /* Hide default tldraw watermark */
                .tl-watermark_link, .tl-watermark, [data-testid="watermark"] {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
                
                /* Custom animations for our UI */
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            {/* The Drawing Area (now takes full screen) */}
            <div style={{ flex: 1, position: 'relative' }}>
                
                {/* Floating Modern Header */}
                <div style={{ 
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '8px 12px 8px 16px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    zIndex: 10,
                    width: 'auto',
                    minWidth: '600px',
                    animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button 
                            onClick={onClose}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', transition: 'all 0.2s', fontWeight: 600 }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} />
                            <span>Tilbage</span>
                        </button>
                        
                        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                        
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                value={drawingName}
                                onChange={(e) => setDrawingName(e.target.value)}
                                placeholder="Navngiv din skitse..."
                                style={{
                                    background: 'transparent',
                                    border: '1px solid transparent',
                                    color: '#0f172a',
                                    fontSize: '1.15rem',
                                    fontWeight: 700,
                                    padding: '8px 36px 8px 12px',
                                    borderRadius: '10px',
                                    outline: 'none',
                                    width: '300px',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => { e.target.style.background = 'rgba(59, 130, 246, 0.05)'; e.target.style.color = '#2563eb'; }}
                                onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#0f172a'; }}
                            />
                            <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#94a3b8' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                            </div>
                        </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handleMakeOfficial}
                        disabled={isSaving || isExporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'white',
                            color: '#0ea5e9',
                            border: '1px solid #0ea5e9',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: (isSaving || isExporting) ? 'not-allowed' : 'pointer',
                            opacity: (isSaving || isExporting) ? 0.7 : 1,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { if (!isSaving && !isExporting) { e.currentTarget.style.background = '#f0f9ff'; } }}
                        onMouseOut={(e) => { if (!isSaving && !isExporting) { e.currentTarget.style.background = 'white'; } }}
                    >
                        <FileImage size={18} />
                        {isExporting ? 'Udgiver...' : 'Gør Officiel'}
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isExporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: (isSaving || isExporting) ? 'not-allowed' : 'pointer',
                            opacity: (isSaving || isExporting) ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        onMouseOver={(e) => { if (!isSaving && !isExporting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.3)'; } }}
                        onMouseOut={(e) => { if (!isSaving && !isExporting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.2)'; } }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Gemmer...' : 'Gem Skitse'}
                    </button>
                </div>
                </div>
                
                {/* Custom Watermark */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '24px',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Tegnet med</span>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bison Frame</span>
                </div>

                {/* Word-style Rotation Handle Overlay */}
                <div 
                    ref={rotateHandleRef}
                    onPointerDown={handleRotationPointerDown}
                    style={{
                        position: 'absolute',
                        display: 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        cursor: 'grab',
                        transformOrigin: 'center center' // Important for exact rotation
                    }}
                >
                    {/* The connecting line */}
                    <div style={{ width: '1.5px', height: '24px', backgroundColor: '#3b82f6', marginBottom: '-2px', zIndex: 1 }} />
                    {/* The handle circle */}
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        backgroundColor: 'white', 
                        border: '2px solid #3b82f6',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        transition: 'transform 0.1s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {/* A tiny rotate icon inside */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.44-5.44"/>
                        </svg>
                    </div>
                </div>

                {/* Snap Guidelines (Streger) */}
                {snapLines && editor && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 99998,
                        overflow: 'hidden'
                    }}>
                        {/* Vertical Snap Line */}
                        <div style={{
                            position: 'absolute',
                            left: `${editor.pageToViewport(snapLines.centerPage).x}px`,
                            top: 0,
                            bottom: 0,
                            width: '1.5px',
                            backgroundColor: '#3b82f6',
                            opacity: 0.5,
                            transform: 'translateX(-50%)'
                        }} />
                        {/* Horizontal Snap Line */}
                        <div style={{
                            position: 'absolute',
                            top: `${editor.pageToViewport(snapLines.centerPage).y}px`,
                            left: 0,
                            right: 0,
                            height: '1.5px',
                            backgroundColor: '#3b82f6',
                            opacity: 0.5,
                            transform: 'translateY(-50%)'
                        }} />
                    </div>
                )}

                <Tldraw onMount={handleMount} persistenceKey={drawingId ? null : 'bison-frame-sketch-draft'} />
                
                {isLoading && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 250, 252, 0.8)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <span style={{ fontWeight: 600, color: '#475569', fontSize: '1.1rem' }}>Indlæser skitse...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrawingBoard;
