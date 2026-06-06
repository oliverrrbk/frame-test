import React, { useState, useEffect, useCallback } from 'react';
import { Tldraw } from 'tldraw';
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
                            editorInstance.store.loadSnapshot(data.document_data);
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
             // New drawing - clear store just in case
             editorInstance.store.clear();
        }
    }, [drawingId]);

    const handleSave = async () => {
        if (!editor) return;
        setIsSaving(true);
        
        try {
            const snapshot = editor.store.getSnapshot();
            
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
            toast.error("Kunne ikke gemme skitsen.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            {/* Header bar */}
            <div style={{ 
                height: '60px', 
                backgroundColor: '#1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 20px',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronLeft size={20} />
                        <span style={{ fontWeight: 500 }}>Tilbage</span>
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }}></div>
                    
                    <input 
                        type="text" 
                        value={drawingName}
                        onChange={(e) => setDrawingName(e.target.value)}
                        placeholder="Navngiv din skitse..."
                        style={{
                            background: 'transparent',
                            border: '1px solid transparent',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            outline: 'none',
                            width: '300px'
                        }}
                        onFocus={(e) => e.target.style.border = '1px solid #475569'}
                        onBlur={(e) => e.target.style.border = '1px solid transparent'}
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
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            transition: 'background-color 0.2s'
                        }}
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
