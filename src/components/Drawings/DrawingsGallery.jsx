import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { PlusSquare, PenTool, Trash2, Calendar, FileText } from 'lucide-react';
import DrawingBoard from './DrawingBoard';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

const DrawingsGallery = ({ leadId = null }) => {
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeDrawingId, setActiveDrawingId] = useState(null);
    const [isBoardOpen, setIsBoardOpen] = useState(false);

    const fetchDrawings = async () => {
        setIsLoading(true);
        try {
            let query = supabase.from('drawings').select('*').order('created_at', { ascending: false });
            
            if (leadId) {
                query = query.eq('lead_id', leadId);
            } else {
                // If no leadId is provided, we fetch ALL drawings for the user
                // RLS will ensure they only see their own
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

            setDrawings(data || []);
        } catch (err) {
            console.error("Fejl ved hentning af skitser:", err);
            // toast.error("Kunne ikke hente skitser.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDrawings();
    }, [leadId]);

    const handleNewDrawing = () => {
        setActiveDrawingId(null);
        setIsBoardOpen(true);
    };

    const handleOpenDrawing = (id) => {
        setActiveDrawingId(id);
        setIsBoardOpen(true);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Er du sikker på, at du vil slette denne skitse?")) return;
        
        try {
            const { error } = await supabase.from('drawings').delete().eq('id', id);
            if (error) throw error;
            
            toast.success("Skitse slettet");
            fetchDrawings();
        } catch (err) {
            console.error("Fejl ved sletning:", err);
            toast.error("Kunne ikke slette skitsen");
        }
    };

    const handleBoardClose = () => {
        setIsBoardOpen(false);
        fetchDrawings(); // Refresh the list
    };

    if (isBoardOpen) {
        return <DrawingBoard drawingId={activeDrawingId} leadId={leadId} onClose={handleBoardClose} />;
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PenTool size={24} style={{ color: '#3b82f6' }} />
                        {leadId ? 'Sags-skitser & Tegninger' : 'Mit Skitse-bibliotek'}
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.95rem' }}>
                        {leadId 
                            ? 'Her kan du tegne skitser, notere opmålinger og vedhæfte arkitekttegninger specifikt til denne sag.' 
                            : 'Her har du et fuldt overblik over alle dine skitser. Du kan tegne frit og senere koble dem på sager.'}
                    </p>
                </div>
                
                <button 
                    onClick={handleNewDrawing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backgroundColor: '#3b82f6', color: 'white',
                        padding: '10px 20px', borderRadius: '8px',
                        fontWeight: 600, border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <PlusSquare size={20} />
                    Ny Skitse
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Henter skitser...</div>
            ) : drawings.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', padding: '80px 20px', 
                    backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', 
                    borderRadius: '16px', marginTop: '20px' 
                }}>
                    <PenTool size={48} style={{ color: '#94a3b8', margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '8px' }}>Ingen skitser endnu</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>
                        Kom i gang med at tegne opmålinger, bygningsdetaljer eller upload plantegninger her.
                    </p>
                    <button 
                        onClick={handleNewDrawing}
                        style={{
                            backgroundColor: 'white', color: '#3b82f6', border: '1px solid #3b82f6',
                            padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer'
                        }}
                    >
                        Tegn din første skitse
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {drawings.map(drawing => (
                        <div 
                            key={drawing.id}
                            onClick={() => handleOpenDrawing(drawing.id)}
                            style={{
                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                                overflow: 'hidden', cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                display: 'flex', flexDirection: 'column'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            {/* Thumbnail area */}
                            <div style={{ 
                                height: '160px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                            }}>
                                {drawing.type === 'upload' ? (
                                    <FileText size={40} style={{ color: '#94a3b8' }} />
                                ) : (
                                    <PenTool size={40} style={{ color: '#94a3b8' }} />
                                )}
                                
                                <button
                                    onClick={(e) => handleDelete(e, drawing.id)}
                                    style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
                                        padding: '6px', color: '#ef4444', cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                                    title="Slet skitse"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            {/* Info area */}
                            <div style={{ padding: '16px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {drawing.name}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                    <Calendar size={14} />
                                    <span>Oprettet {format(new Date(drawing.created_at), 'd. MMM yyyy', { locale: da })}</span>
                                </div>
                                {!leadId && drawing.lead_id && (
                                    <div style={{ marginTop: '10px', display: 'inline-block', backgroundColor: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        Tilknyttet en sag
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DrawingsGallery;
