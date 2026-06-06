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
            {/* Header bar */}
            <div style={{ 
                height: '64px', 
                background: 'linear-gradient(to right, #0f172a, #1e293b)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 24px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button 
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                        <ChevronLeft size={18} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tilbage</span>
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                    
                    <input 
                        type="text" 
                        value={drawingName}
                        onChange={(e) => setDrawingName(e.target.value)}
                        placeholder="Navngiv din skitse..."
                        style={{
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'white',
                            fontSize: '1.15rem',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            outline: 'none',
                            width: '350px',
                            transition: 'all 0.2s',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onFocus={(e) => { e.target.style.border = '1px solid #3b82f6'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                        onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.05)'; e.target.style.background = 'rgba(0,0,0,0.2)'; }}
                    />
                </div>
                
                <div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                        }}
                        onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(37, 99, 235, 0.4)'; } }}
                        onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.3)'; } }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Gemmer...' : 'Gem Skitse'}
                    </button>
                </div>
            </div>
            
            {/* The Drawing Area */}
            <div style={{ flex: 1, position: 'relative' }}>
                {isLoading ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                        Indlæser skitse...
                    </div>
                ) : (
                    <Tldraw onMount={handleMount} persistenceKey={drawingId ? null : 'bison-frame-sketch-draft'} />
                )}
            </div>
        </div>
    );
};

export default DrawingBoard;
