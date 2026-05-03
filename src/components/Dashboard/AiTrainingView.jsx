import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { Bot, MessageSquare, Database, AlertCircle } from 'lucide-react';

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
        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {loading ? (
                <div style={{ padding: '48px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>Henter AI-samtaler...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Venstre Menu - Liste over AI Leads */}
                    <div className="lg:col-span-1">
                        <div className="settings-card sticky top-6">
                            <div className="card-header">
                                <div className="icon-wrapper">
                                    <Bot size={24} />
                                </div>
                                <h3>Seneste AI-overslag</h3>
                            </div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {aiLeads.length === 0 ? (
                                        <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>Ingen AI-samtaler endnu.</div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                                            {aiLeads.map(lead => (
                                                <div 
                                                    key={lead.id}
                                                    onClick={() => {
                                                        setSelectedLead(lead);
                                                        setFeedbackText(lead.ai_feedback || lead.raw_data?.aiFeedbackFallback || '');
                                                    }}
                                                    style={{ 
                                                        padding: '16px 20px', 
                                                        cursor: 'pointer',
                                                        background: selectedLead?.id === lead.id ? 'var(--surface-bg)' : 'transparent',
                                                        transition: 'background 0.2s',
                                                        borderLeft: selectedLead?.id === lead.id ? '3px solid var(--accent-primary)' : '3px solid transparent'
                                                    }}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                >
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{lead.customer_name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{formatDate(lead.created_at)}</div>
                                                    {lead.ai_feedback || lead.raw_data?.aiFeedbackFallback ? (
                                                        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '10px' }}>Feedback givet</span>
                                                    ) : (
                                                        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '10px' }}>Mangler vurdering</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Højre Sektion - Samtale & Feedback */}
                    <div className="lg:col-span-2 space-y-6">
                        {!selectedLead ? (
                            <div className="settings-card">
                                <div className="card-body" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    Vælg en samtale til venstre for at læse med.
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* JSON DATA BOKS */}
                                <div className="settings-card" style={{ background: '#111827', border: '1px solid #374151' }}>
                                    <div className="card-body">
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Database size={18} />
                                            AI'ens Udtrukne Data (JSON)
                                        </h3>
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Arbejdstimer estimeret</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>{selectedLead.raw_data?.details?.aiLaborHours || '?'} t</span>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Materialer (før avance)</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>{selectedLead.raw_data?.details?.aiMaterialCost || '?'} kr</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '16px', fontSize: '0.9rem', color: '#d1d5db', background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                                            <strong>Prisramme vist til kunde:</strong> {selectedLead.price_estimate}
                                        </div>
                                    </div>
                                </div>

                                {/* CHAT LOGGEN */}
                                <div className="settings-card">
                                    <div className="card-header">
                                        <div className="icon-wrapper">
                                            <MessageSquare size={24} />
                                        </div>
                                        <h3>Chat Log</h3>
                                    </div>
                                    <div className="card-body" style={{ overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {selectedLead.raw_data?.details?.chatLog?.map((msg, idx) => (
                                            msg.role !== 'system' && (
                                                <div key={idx} style={{ 
                                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--surface-bg)',
                                                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                                    border: msg.role !== 'user' ? '1px solid var(--border-light)' : 'none',
                                                    padding: '12px 16px',
                                                    borderRadius: '16px',
                                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                                    borderBottomLeftRadius: msg.role !== 'user' ? '4px' : '16px',
                                                    maxWidth: '85%',
                                                    whiteSpace: 'pre-wrap',
                                                    fontSize: '0.95rem',
                                                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                                                }}>
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {msg.role === 'user' ? 'Kunde' : 'AI Assistant'}
                                                    </span>
                                                    {msg.content}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {/* FEEDBACK BOKS */}
                                <div className="settings-card">
                                    <div className="card-header">
                                        <div className="icon-wrapper">
                                            <AlertCircle size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>Rapporter manglende viden</h3>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', fontWeight: 'normal' }}>Hvilke byggetekniske detaljer glemte AI'en at stille kunden?</p>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="input-group">
                                            <textarea 
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="F.eks.: 'Den glemte at spørge om skråvægge' eller 'Den udregnede for få timer til nedrivning af beton.'"
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100px', 
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px' }}>
                                        <button 
                                            className="btn-primary"
                                            onClick={handleSaveFeedback}
                                            disabled={saving}
                                        >
                                            {saving ? 'Gemmer...' : 'Gem Feedback til Træning'}
                                        </button>
                                    </div>
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
