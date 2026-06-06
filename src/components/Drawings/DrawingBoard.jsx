import React, { useState, useEffect, useCallback } from 'react';
import { Tldraw, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { ChevronLeft, Save } from 'lucide-react';

const DrawingBoard = ({ drawingId, leadId, onClose }) => {
    const [editor, setEditor] = useState(null);
    const [isLoading, setIsLoading] = useState(!!drawingId);
    const [drawingName, setDrawingName] = useState('Ny Skitse');
    const [isSaving, setIsSaving] = useState(false);

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
            `}</style>

            {/* The Drawing Area (now takes full screen) */}
            <div style={{ flex: 1, position: 'relative' }}>
                <Tldraw onMount={handleMount} persistenceKey={drawingId ? null : 'bison-frame-sketch-draft'} />
                
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
                
                <div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
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
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.3)'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.2)'; } }}
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
