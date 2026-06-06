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
            let query = supabase.from('drawings').select('*, leads(case_number)').order('created_at', { ascending: false });
            
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
        <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
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

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Henter dine skitser...</span>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {drawings.map(drawing => (
                        <div 
                            key={drawing.id}
                            onClick={() => handleOpenDrawing(drawing.id)}
                            style={{
                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                                overflow: 'hidden', cursor: 'pointer',
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
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                            }}>
                                {drawing.type === 'upload' && drawing.document_data?.url ? (
                                    <img src={drawing.document_data.url} alt="Officiel Tegning" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                    onClick={(e) => handleDelete(e, drawing.id)}
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
                                        Sag: {drawing.leads?.case_number || 'Ukendt'}
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
