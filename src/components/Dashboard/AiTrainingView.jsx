import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const AiTrainingView = ({ carpenterId }) => {
    const [aiLeads, setAiLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAiLeads();
    }, [carpenterId]);

    const fetchAiLeads = async () => {
        setLoading(true);
        try {
            let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
            
            // If carpenterId is provided, fetch only for this carpenter. If null, it's admin viewing all.
            if (carpenterId) {
                query = query.eq('carpenter_id', carpenterId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Filter leads where project_category is 'AI Opgave' or raw_data has isAiEstimate
            const filtered = data.filter(lead => {
                const raw = lead.raw_data || {};
                const details = raw.details || {};
                return lead.project_category === 'AI Opgave' || details.isAiEstimate === true;
            });

            setAiLeads(filtered);
        } catch (error) {
            console.error('Fejl ved hentning af AI data:', error);
            toast.error('Kunne ikke hente AI data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFeedback = async () => {
        if (!selectedLead) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ ai_feedback: feedbackText })
                .eq('id', selectedLead.id);

            if (error) throw error;

            toast.success('Feedback gemt! AI\'en takker.');
            
            // Update local state
            setAiLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ai_feedback: feedbackText } : l));
            setSelectedLead({ ...selectedLead, ai_feedback: feedbackText });
        } catch (error) {
            console.error('Fejl ved gem:', error);
            // Fallback: If ai_feedback column doesn't exist yet, save it to raw_data
            try {
                const newRawData = { ...(selectedLead.raw_data || {}), aiFeedbackFallback: feedbackText };
                await supabase.from('leads').update({ raw_data: newRawData }).eq('id', selectedLead.id);
                toast.success('Feedback gemt i raw_data! (Opret ai_feedback kolonnen for optimal visning).');
                setAiLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, raw_data: newRawData } : l));
                setSelectedLead({ ...selectedLead, raw_data: newRawData });
            } catch (fallbackError) {
                toast.error('Kunne ikke gemme feedback. Mangler kolonne i databasen.');
            }
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('da-DK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>🤖 AI Træning & Indsigt</h2>
                    <p style={{ color: '#64748b', margin: 0 }}>
                        Gennemgå AI'ens kundesamtaler og rapporter manglende byggeteknisk viden, så systemet bliver klogere.
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Henter AI-samtaler...</div>
            ) : (
                <div style={{ display: 'flex', gap: '20px', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
                    
                    {/* Venstre Menu - Liste over AI Leads */}
                    <div style={{ flex: '1', minWidth: '300px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                            Seneste AI-overslag
                        </div>
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {aiLeads.length === 0 ? (
                                <div style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>Ingen AI-samtaler endnu.</div>
                            ) : (
                                aiLeads.map(lead => (
                                    <div 
                                        key={lead.id}
                                        onClick={() => {
                                            setSelectedLead(lead);
                                            setFeedbackText(lead.ai_feedback || lead.raw_data?.aiFeedbackFallback || '');
                                        }}
                                        style={{ 
                                            padding: '15px 20px', 
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: 'pointer',
                                            background: selectedLead?.id === lead.id ? '#eff6ff' : 'white',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{lead.customer_name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{formatDate(lead.created_at)}</div>
                                        {lead.ai_feedback || lead.raw_data?.aiFeedbackFallback ? (
                                            <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '10px' }}>Feedback givet</span>
                                        ) : (
                                            <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: '10px' }}>Mangler vurdering</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Højre Sektion - Samtale & Feedback */}
                    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {!selectedLead ? (
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                Vælg en samtale til venstre for at læse med.
                            </div>
                        ) : (
                            <>
                                {/* JSON DATA BOKS */}
                                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#38bdf8' }}>AI'ens Udtrukne Data (JSON)</h3>
                                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Arbejdstimer estimeret</span>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedLead.raw_data?.details?.aiLaborHours || '?'} t</span>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Materialer (før avance)</span>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedLead.raw_data?.details?.aiMaterialCost || '?'} kr</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                        <strong>Prisramme vist til kunde:</strong> {selectedLead.price_estimate}
                                    </div>
                                </div>

                                {/* CHAT LOGGEN */}
                                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '400px' }}>
                                    <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                                        Chat Log
                                    </div>
                                    <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {selectedLead.raw_data?.details?.chatLog?.map((msg, idx) => (
                                            msg.role !== 'system' && (
                                                <div key={idx} style={{ 
                                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    background: msg.role === 'user' ? '#2563eb' : '#f1f5f9',
                                                    color: msg.role === 'user' ? 'white' : '#0f172a',
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    maxWidth: '80%',
                                                    whiteSpace: 'pre-wrap',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginBottom: '4px' }}>
                                                        {msg.role === 'user' ? 'Kunde' : 'AI'}
                                                    </span>
                                                    {msg.content}
                                                </div>
                                            )
                                        ))}
                                        {(!selectedLead.raw_data?.details?.chatLog || selectedLead.raw_data.details.chatLog.length === 0) && (
                                            <div style={{ textAlign: 'center', color: '#64748b' }}>Ingen chatlog fundet for dette lead.</div>
                                        )}
                                    </div>
                                </div>

                                {/* FEEDBACK BOKS */}
                                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Rapporter manglende viden</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
                                        Læs samtalen igennem. Hvilke byggetekniske detaljer eller spørgsmål glemte AI'en at stille kunden, før den gav overslaget? Skriv det herunder, så vi kan træne den.
                                    </p>
                                    <textarea 
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="F.eks.: 'Den glemte at spørge om skråvægge' eller 'Den udregnede for få timer til nedrivning af beton.'"
                                        style={{ 
                                            width: '100%', 
                                            height: '100px', 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid #cbd5e1',
                                            marginBottom: '15px',
                                            fontFamily: 'inherit',
                                            resize: 'vertical'
                                        }}
                                    />
                                    <button 
                                        onClick={handleSaveFeedback}
                                        disabled={saving}
                                        style={{ 
                                            background: '#10b981', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '10px 20px', 
                                            borderRadius: '8px', 
                                            fontWeight: 'bold', 
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.7 : 1
                                        }}
                                    >
                                        {saving ? 'Gemmer...' : 'Gem Feedback til Træning'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default AiTrainingView;
