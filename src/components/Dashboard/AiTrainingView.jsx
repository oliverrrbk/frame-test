import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { 
    Bot, 
    MessageSquare, 
    Database, 
    AlertCircle, 
    Star, 
    Check, 
    X as CloseIcon, 
    Sparkles, 
    Download, 
    Search, 
    Filter, 
    Clock, 
    Coins 
} from 'lucide-react';

const AiTrainingView = ({ carpenterId }) => {
    const [aiLeads, setAiLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState(null);
    
    // Curation states for selected lead
    const [curationStatus, setCurationStatus] = useState('pending'); // 'pending' | 'qualified' | 'rejected'
    const [curationRating, setCurationRating] = useState(0); // 1 to 5
    const [curationNotes, setCurationNotes] = useState('');
    const [overrideHours, setOverrideHours] = useState('');
    const [overrideMaterials, setOverrideMaterials] = useState('');
    
    const [saving, setSaving] = useState(false);
    
    // Filter and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'qualified' | 'rejected'
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | standard categories
    const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | etc.

    useEffect(() => {
        fetchAiLeads();
    }, [carpenterId]);

    const fetchAiLeads = async () => {
        setLoading(true);
        try {
            let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
            
            if (carpenterId) {
                query = query.eq('carpenter_id', carpenterId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter leads where project_category is 'AI Opgave' or raw_data has isAiEstimate
            const filtered = (data || []).filter(lead => {
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

    // Load curation values when selecting a lead
    const handleSelectLead = (lead) => {
        setSelectedLead(lead);
        
        // Extract values using columns, falling back to raw_data.curation JSON object
        const curStatus = lead.ai_curation_status || lead.raw_data?.curation?.status || 'pending';
        const curRating = lead.ai_curation_rating || lead.raw_data?.curation?.rating || 0;
        const curNotes = lead.ai_curation_notes || lead.raw_data?.curation?.notes || lead.ai_feedback || lead.raw_data?.aiFeedbackFallback || '';
        
        const curOverrides = lead.ai_curation_overrides || lead.raw_data?.curation?.overrides || {};
        const originalHours = lead.raw_data?.details?.aiLaborHours || 0;
        const originalMaterials = lead.raw_data?.details?.aiMaterialCost || 0;
        
        setCurationStatus(curStatus);
        setCurationRating(curRating);
        setCurationNotes(curNotes);
        setOverrideHours(curOverrides.laborHours !== undefined ? curOverrides.laborHours : originalHours);
        setOverrideMaterials(curOverrides.materialCost !== undefined ? curOverrides.materialCost : originalMaterials);
    };

    const handleSaveCuration = async () => {
        if (!selectedLead) return;
        setSaving(true);
        
        const curationPayload = {
            status: curationStatus,
            rating: curationRating,
            notes: curationNotes,
            overrides: {
                laborHours: Number(overrideHours) || 0,
                materialCost: Number(overrideMaterials) || 0
            }
        };

        try {
            // Attempt to update utilizing dedicated database columns first
            const { error } = await supabase
                .from('leads')
                .update({ 
                    ai_curation_status: curationStatus,
                    ai_curation_rating: curationRating,
                    ai_curation_notes: curationNotes,
                    ai_curation_overrides: curationPayload.overrides,
                    ai_feedback: curationNotes // Keep sync with old column for backward compatibility
                })
                .eq('id', selectedLead.id);

            if (error) throw error;

            toast.success('Kvalificering gemt succesfuldt!');
            
            // Update local state
            const updatedLead = { 
                ...selectedLead, 
                ai_curation_status: curationStatus,
                ai_curation_rating: curationRating,
                ai_curation_notes: curationNotes,
                ai_curation_overrides: curationPayload.overrides,
                ai_feedback: curationNotes
            };
            setAiLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
            setSelectedLead(updatedLead);
        } catch (error) {
            console.warn('Kolonner ikke fuldt migreret i DB. Gemmer robust i raw_data fallback...', error);
            // Fallback: If columns do not exist, save structure in raw_data JSONB
            try {
                const newRawData = { 
                    ...(selectedLead.raw_data || {}), 
                    curation: curationPayload,
                    aiFeedbackFallback: curationNotes // Fallback sync
                };
                
                const { error: fallbackError } = await supabase
                    .from('leads') 
                    .update({ raw_data: newRawData })
                    .eq('id', selectedLead.id);
                
                if (fallbackError) throw fallbackError;
                
                toast.success('Kvalificering gemt i raw_data fallback.');
                
                const updatedLead = { ...selectedLead, raw_data: newRawData };
                setAiLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
                setSelectedLead(updatedLead);
            } catch (fallbackError) {
                console.error('Fejl ved gem:', fallbackError);
                toast.error('Kunne ikke gemme kvalificering.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Export qualified leads into JSONL format for OpenAI / Anthropic fine-tuning
    const handleExportJSONL = () => {
        // We select qualified records with status 'qualified' OR rating >= 4
        const qualifiedLeads = aiLeads.filter(lead => {
            const status = lead.ai_curation_status || lead.raw_data?.curation?.status;
            const rating = lead.ai_curation_rating || lead.raw_data?.curation?.rating || 0;
            return status === 'qualified' || rating >= 4;
        });

        if (qualifiedLeads.length === 0) {
            toast.error('Der er ingen godkendte (kvalificerede) samtaler at eksportere endnu.');
            return;
        }

        try {
            const jsonlLines = qualifiedLeads.map(lead => {
                const chatLog = lead.raw_data?.details?.chatLog || [];
                const curation = lead.raw_data?.curation || {};
                
                // Incorporate overrides or fallback to original values
                const finalHours = lead.ai_curation_overrides?.laborHours !== undefined 
                    ? lead.ai_curation_overrides.laborHours 
                    : (curation.overrides?.laborHours !== undefined ? curation.overrides.laborHours : (lead.raw_data?.details?.aiLaborHours || 0));
                
                const finalMaterials = lead.ai_curation_overrides?.materialCost !== undefined 
                    ? lead.ai_curation_overrides.materialCost 
                    : (curation.overrides?.materialCost !== undefined ? curation.overrides.materialCost : (lead.raw_data?.details?.aiMaterialCost || 0));

                const category = lead.project_category !== 'AI Opgave' 
                    ? lead.project_category 
                    : (lead.raw_data?.details?.category || 'special');

                // Standard system prompt skeleton
                const systemPrompt = `Du er en AI-assistent for en tømrer. Din opgave er at afklare opgaven for kunden. Gem hemmeligt beregninger. Ved afslutning, kald calculate_${category} eller submit_estimate.`;

                // Build structural fine-tuning message array
                const messages = [
                    { role: 'system', content: systemPrompt }
                ];

                // Append user and assistant logs
                chatLog.forEach(msg => {
                    if (msg.role !== 'system') {
                        messages.push({
                            role: msg.role,
                            content: msg.content || ''
                        });
                    }
                });

                // Inject the final golden calculation result output as a simulated tool call response
                const toolArguments = {
                    formState: lead.raw_data?.details?.formState || {},
                    summaryBullets: lead.raw_data?.details?.summaryBullets || [lead.price_estimate],
                    obsNotes: lead.ai_curation_notes || curation.notes || "Ingen særlige forbehold."
                };

                // Add simulated execution output
                messages.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: [
                        {
                            id: `call_${lead.id}`,
                            type: 'function',
                            function: {
                                name: category === 'special' ? 'submit_estimate' : `calculate_${category}`,
                                arguments: JSON.stringify(
                                    category === 'special' 
                                    ? {
                                        projectTitle: lead.raw_data?.details?.projectTitle || "Specialopgave",
                                        laborHours: finalHours,
                                        materialCost: finalMaterials,
                                        breakdown: lead.raw_data?.details?.breakdown || [],
                                        summaryBullets: toolArguments.summaryBullets,
                                        obsNotes: toolArguments.obsNotes
                                      }
                                    : toolArguments
                                )
                            }
                        }
                    ]
                });

                return JSON.stringify({ messages });
            });

            const blob = new Blob([jsonlLines.join('\n')], { type: 'application/jsonl+json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bison_ai_training_data_${new Date().toISOString().split('T')[0]}.jsonl`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast.success(`Eksporterede ${qualifiedLeads.length} gyldne træningseksempler!`);
        } catch (err) {
            console.error('Eksporteringsfejl:', err);
            toast.error('Kunne ikke generere JSONL fil.');
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('da-DK', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    // Filter logic
    const filteredLeads = aiLeads.filter(lead => {
        const status = lead.ai_curation_status || lead.raw_data?.curation?.status || 'pending';
        const rating = lead.ai_curation_rating || lead.raw_data?.curation?.rating || 0;
        const category = lead.project_category === 'AI Opgave' 
            ? (lead.raw_data?.details?.category || 'special') 
            : lead.project_category;
        
        // Search query
        const matchesSearch = searchQuery === '' || 
            (lead.customer_name && lead.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (lead.customer_email && lead.customer_email.toLowerCase().includes(searchQuery.toLowerCase()));

        // Status filter
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        // Rating filter
        const matchesRating = ratingFilter === 'all' || String(rating) === ratingFilter;

        // Category filter
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;

        return matchesSearch && matchesStatus && matchesRating && matchesCategory;
    });

    // Unique categories for filtering
    const categories = Array.from(new Set(aiLeads.map(lead => 
        lead.project_category === 'AI Opgave' ? (lead.raw_data?.details?.category || 'special') : lead.project_category
    ))).filter(Boolean);

    return (
        <div style={{ maxWidth: '1350px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* TOP BAR / EXPORTER */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                background: '#1e293b',
                padding: '20px 24px',
                borderRadius: '16px',
                border: '1px solid #334155'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={20} style={{ color: '#38bdf8' }} />
                        Custom AI Pipeline
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        Kvalificer samtaler og eksporter dem direkte til din egen AI-træningsmodel.
                    </p>
                </div>
                
                <button
                    onClick={handleExportJSONL}
                    className="btn-primary"
                    style={{ 
                        background: '#38bdf8', 
                        color: '#0f172a',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Download size={16} />
                    Eksporter til OpenAI/Claude (.jsonl)
                </button>
            </div>

            {/* FILTER PANEL */}
            <div style={{ 
                background: '#1e293b', 
                border: '1px solid #334155', 
                borderRadius: '16px', 
                padding: '16px 20px', 
                marginBottom: '24px',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Søg efter kunde eller e-mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '10px 16px 10px 42px',
                            background: '#0f172a', 
                            border: '1px solid #334155',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
                
                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={14} style={{ color: '#64748b' }} />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ 
                            padding: '10px 14px', 
                            background: '#0f172a', 
                            border: '1px solid #334155', 
                            borderRadius: '10px', 
                            color: '#fff',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Alle Statuser</option>
                        <option value="pending">Afventer (Pending)</option>
                        <option value="qualified">Kvalificeret (Golden)</option>
                        <option value="rejected">Afvist (Rejected)</option>
                    </select>
                </div>

                {/* Rating Filter */}
                <select 
                    value={ratingFilter} 
                    onChange={(e) => setRatingFilter(e.target.value)}
                    style={{ 
                        padding: '10px 14px', 
                        background: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '10px', 
                        color: '#fff',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">Alle Ratings</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5 Stjerner)</option>
                    <option value="4">⭐⭐⭐⭐ (4+ Stjerner)</option>
                    <option value="3">⭐⭐⭐ (3 Stjerner)</option>
                    <option value="2">⭐⭐ (2 Stjerner)</option>
                    <option value="1">⭐ (1 Stjerne)</option>
                </select>

                {/* Category Filter */}
                <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ 
                        padding: '10px 14px', 
                        background: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '10px', 
                        color: '#fff',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                    }}
                >
                    <option value="all">Alle Kategorier</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    Viser {filteredLeads.length} af {aiLeads.length} sager
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            {loading ? (
                <div style={{ padding: '80px', display: 'flex', justifyContent: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: '16px' }}>
                    Henter AI-samtaler og træningssæt...
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '320px 1fr', 
                    gap: '24px', 
                    alignItems: 'start' 
                }}>
                    
                    {/* LEFT PANEL - LEAD LIST */}
                    <div style={{ 
                        background: '#1e293b', 
                        borderRadius: '16px', 
                        border: '1px solid #334155',
                        overflow: 'hidden'
                    }}>
                        <div style={{ 
                            padding: '16px 20px', 
                            borderBottom: '1px solid #334155', 
                            background: '#0f172a',
                            fontWeight: '600' 
                        }}>
                            AI Samtaler
                        </div>
                        <div style={{ maxHeight: '680px', overflowY: 'auto' }}>
                            {filteredLeads.length === 0 ? (
                                <div style={{ padding: '32px 20px', color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>
                                    Ingen samtaler fundet.
                                </div>
                            ) : (
                                filteredLeads.map(lead => {
                                    const status = lead.ai_curation_status || lead.raw_data?.curation?.status || 'pending';
                                    const rating = lead.ai_curation_rating || lead.raw_data?.curation?.rating || 0;
                                    const category = lead.project_category === 'AI Opgave' 
                                        ? (lead.raw_data?.details?.category || 'special') 
                                        : lead.project_category;
                                        
                                    return (
                                        <div 
                                            key={lead.id}
                                            onClick={() => handleSelectLead(lead)}
                                            style={{ 
                                                padding: '16px 20px', 
                                                cursor: 'pointer',
                                                background: selectedLead?.id === lead.id ? '#0f172a' : 'transparent',
                                                borderBottom: '1px solid #334155',
                                                borderLeft: selectedLead?.id === lead.id ? '4px solid #38bdf8' : '4px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover:bg-slate-800/30"
                                        >
                                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{lead.customer_name || 'Anonym Kunde'}</span>
                                                <span style={{ 
                                                    fontSize: '0.75rem', 
                                                    textTransform: 'uppercase', 
                                                    color: '#38bdf8', 
                                                    background: 'rgba(56, 189, 248, 0.1)', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px' 
                                                }}>
                                                    {category}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                                                {formatDate(lead.created_at)}
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                                {/* Rating stars */}
                                                {rating > 0 ? (
                                                    <div style={{ display: 'flex', color: '#fbbf24' }}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star 
                                                                key={i} 
                                                                size={11} 
                                                                fill={i < rating ? '#fbbf24' : 'none'} 
                                                                stroke={i < rating ? '#fbbf24' : '#475569'}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ingen rating</span>
                                                )}
                                                
                                                {/* Status badge */}
                                                <span style={{ 
                                                    fontSize: '0.7rem', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px',
                                                    marginLeft: 'auto',
                                                    fontWeight: '600',
                                                    background: status === 'qualified' ? 'rgba(16, 185, 129, 0.15)' : status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                                    color: status === 'qualified' ? '#34d399' : status === 'rejected' ? '#f87171' : '#94a3b8'
                                                }}>
                                                    {status === 'qualified' ? 'Golden' : status === 'rejected' ? 'Afvist' : 'Afventer'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL - DETAILED VIEW & CURATION PANEL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {!selectedLead ? (
                            <div style={{ 
                                background: '#1e293b', 
                                borderRadius: '16px', 
                                border: '1px solid #334155',
                                padding: '60px 40px',
                                textAlign: 'center',
                                color: '#94a3b8'
                            }}>
                                <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.15, color: '#38bdf8' }} />
                                <h3>Vælg en samtale fra listen</h3>
                                <p style={{ fontSize: '0.9rem', margin: '4px 0 0 0' }}>Her kan du læse loggen igennem og justere timers/materialers træningsværdier.</p>
                            </div>
                        ) : (
                            <>
                                {/* MASTER DATA OVERVIEW & CURATION CONFIG */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 340px', 
                                    gap: '24px',
                                    alignItems: 'stretch'
                                }}>
                                    
                                    {/* SAMTALE LOG */}
                                    <div style={{ 
                                        background: '#1e293b', 
                                        border: '1px solid #334155', 
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ 
                                            padding: '16px 20px', 
                                            borderBottom: '1px solid #334155', 
                                            background: '#0f172a',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ fontWeight: '600', color: '#fff' }}>Samtale med {selectedLead.customer_name}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Kunde ID: #{selectedLead.id.slice(0, 8)}</span>
                                        </div>
                                        
                                        <div style={{ 
                                            padding: '24px', 
                                            overflowY: 'auto', 
                                            maxHeight: '440px', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '16px',
                                            background: '#0f172a'
                                        }}>
                                            {selectedLead.raw_data?.details?.chatLog?.map((msg, idx) => (
                                                msg.role !== 'system' && (
                                                    <div 
                                                        key={idx} 
                                                        style={{ 
                                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                            background: msg.role === 'user' ? '#38bdf8' : '#1e293b',
                                                            color: msg.role === 'user' ? '#0f172a' : '#fff',
                                                            border: msg.role !== 'user' ? '1px solid #334155' : 'none',
                                                            padding: '12px 16px',
                                                            borderRadius: '16px',
                                                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                                            borderBottomLeftRadius: msg.role !== 'user' ? '4px' : '16px',
                                                            maxWidth: '85%',
                                                            whiteSpace: 'pre-wrap',
                                                            fontSize: '0.9rem',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                        }}
                                                    >
                                                        <span style={{ 
                                                            fontSize: '0.7rem', 
                                                            opacity: 0.6, 
                                                            display: 'block', 
                                                            marginBottom: '4px', 
                                                            fontWeight: '700', 
                                                            textTransform: 'uppercase' 
                                                        }}>
                                                            {msg.role === 'user' ? 'Kunde' : 'AI-Assistent'}
                                                        </span>
                                                        {msg.content}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>

                                    {/* CURATION / KVALIFICERING PANEL */}
                                    <div style={{ 
                                        background: '#1e293b', 
                                        border: '1px solid #334155', 
                                        borderRadius: '16px',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Sparkles size={16} style={{ color: '#38bdf8' }} />
                                                Kvalificeringspanel
                                            </h4>

                                            {/* Status Selection */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Kvalitet Status</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <button
                                                        onClick={() => setCurationStatus('qualified')}
                                                        style={{ 
                                                            padding: '8px', 
                                                            borderRadius: '8px', 
                                                            border: 'none', 
                                                            background: curationStatus === 'qualified' ? '#10b981' : '#0f172a',
                                                            color: '#fff',
                                                            fontWeight: '600',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            border: curationStatus === 'qualified' ? '1px solid #10b981' : '1px solid #334155'
                                                        }}
                                                    >
                                                        <Check size={14} /> Golden
                                                    </button>
                                                    <button
                                                        onClick={() => setCurationStatus('rejected')}
                                                        style={{ 
                                                            padding: '8px', 
                                                            borderRadius: '8px', 
                                                            border: 'none', 
                                                            background: curationStatus === 'rejected' ? '#ef4444' : '#0f172a',
                                                            color: '#fff',
                                                            fontWeight: '600',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            border: curationStatus === 'rejected' ? '1px solid #ef4444' : '1px solid #334155'
                                                        }}
                                                    >
                                                        <CloseIcon size={14} /> Afvis
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Star rating */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Vurdering af Samtale</label>
                                                <div style={{ display: 'flex', gap: '8px', color: '#fbbf24' }}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setCurationRating(star)}
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                                        >
                                                            <Star 
                                                                size={24} 
                                                                fill={star <= curationRating ? '#fbbf24' : 'none'} 
                                                                stroke={star <= curationRating ? '#fbbf24' : '#475569'}
                                                                style={{ transition: 'transform 0.1s' }}
                                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* OVERRIDES OF DEDICATED VALUES */}
                                            <div style={{ 
                                                background: '#0f172a', 
                                                padding: '12px', 
                                                borderRadius: '10px', 
                                                border: '1px solid #334155',
                                                marginBottom: '16px'
                                            }}>
                                                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Kalkulations Korrigeringer</label>
                                                
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Timer (Estimeret)</span>
                                                        <div style={{ position: 'relative' }}>
                                                            <Clock size={12} style={{ position: 'absolute', left: '8px', top: '10px', color: '#64748b' }} />
                                                            <input 
                                                                type="number" 
                                                                value={overrideHours}
                                                                onChange={(e) => setOverrideHours(e.target.value)}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '6px 6px 6px 26px', 
                                                                    background: '#1e293b', 
                                                                    border: '1px solid #334155', 
                                                                    borderRadius: '6px', 
                                                                    color: '#fff',
                                                                    fontSize: '0.85rem'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Materialer (DKK)</span>
                                                        <div style={{ position: 'relative' }}>
                                                            <Coins size={12} style={{ position: 'absolute', left: '8px', top: '10px', color: '#64748b' }} />
                                                            <input 
                                                                type="number" 
                                                                value={overrideMaterials}
                                                                onChange={(e) => setOverrideMaterials(e.target.value)}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '6px 6px 6px 26px', 
                                                                    background: '#1e293b', 
                                                                    border: '1px solid #334155', 
                                                                    borderRadius: '6px', 
                                                                    color: '#fff',
                                                                    fontSize: '0.85rem'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveCuration}
                                            disabled={saving}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: '#fff',
                                                color: '#0f172a',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {saving ? 'Gemmer...' : 'Gem Kvalificering'}
                                        </button>
                                    </div>
                                </div>

                                {/* ORIGINAL CALCULATION & INTERNE FEEDBACK NOTES */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '24px'
                                }}>
                                    
                                    {/* ORIGINAL ESTIMATE DATA */}
                                    <div style={{ 
                                        background: '#111827', 
                                        border: '1px solid #374151', 
                                        borderRadius: '16px',
                                        padding: '20px'
                                    }}>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Database size={16} />
                                            Oprindelige AI Kalkulationer
                                        </h4>
                                        
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Timer Gæt</span>
                                                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>
                                                    {selectedLead.raw_data?.details?.aiLaborHours || '?'} t
                                                </strong>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Materialepris Netto</span>
                                                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>
                                                    {selectedLead.raw_data?.details?.aiMaterialCost ? `${new Intl.NumberFormat('da-DK').format(selectedLead.raw_data.details.aiMaterialCost)} DKK` : '?'}
                                                </strong>
                                            </div>
                                        </div>
                                        
                                        <div style={{ 
                                            fontSize: '0.85rem', 
                                            color: '#d1d5db', 
                                            background: 'rgba(56, 189, 248, 0.08)', 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            borderLeft: '3px solid #38bdf8' 
                                        }}>
                                            <strong>Estimat vist til kunde:</strong> {selectedLead.price_estimate}
                                        </div>
                                    </div>

                                    {/* INTERNAL CURATION NOTES (FEEDBACK) */}
                                    <div style={{ 
                                        background: '#1e293b', 
                                        border: '1px solid #334155', 
                                        borderRadius: '16px',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertCircle size={16} style={{ color: '#fbbf24' }} />
                                            Træningsnoter & Byggeteknisk Feedback
                                        </h4>
                                        <textarea
                                            value={curationNotes}
                                            onChange={(e) => setCurationNotes(e.target.value)}
                                            placeholder="Indtast noter til træningen (fx 'AI glemte at spørge om jordforhold, overvejede ikke minimumsareal på 15m2')..."
                                            style={{ 
                                                width: '100%', 
                                                height: '100px', 
                                                resize: 'vertical',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '12px',
                                                color: '#fff',
                                                fontSize: '0.85rem',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            Disse noter hjælper med at bevare byggetekniske nuancer, som systemet skal tilpasse i fremtidige opdateringer.
                                        </span>
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
