import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileEdit, Plus, Send, Clock, User, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle, ChevronRight, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateLeadSelector from './CreateLeadSelector';
import Wizard from '../Wizard/Wizard';
import CustomProjectCreator from './CustomProjectCreator';

const WorkerDrafts = ({ profile, carpenterProfile, supabase, leadsData, setLeadsData }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createMode, setCreateMode] = useState(null); // 'classic' or 'custom'
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const requestConfirm = (title, message, type, onConfirm) => {
        setConfirmDialog({
            title,
            message,
            type, // 'danger' or 'warning'
            onConfirm: () => {
                onConfirm();
                setConfirmDialog(null);
            },
            onCancel: () => setConfirmDialog(null)
        });
    };

    const [draftFilter, setDraftFilter] = useState('all'); // 'all', 'drafts', 'sent'
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // Filter leads to only show drafts created by this worker or sales person
    const myDrafts = useMemo(() => {
        let filtered = leadsData.filter(lead => {
            const isMine = lead.raw_data?.created_by === profile?.id;
            
            // Allow backward compatibility for old drafts without created_by if they have draft_mode = true AND status is Kladde
            const isMineFallback = isMine || (lead.raw_data?.draft_mode === true && profile?.role !== 'admin');
            
            if (!isMineFallback) return false;

            const isUnsent = lead.status === 'Kladde' || lead.status === 'Intern Kladde';
            const isSent = lead.status === 'Ny forespørgsel' && lead.raw_data?.draft_mode === true;
            
            if (!isUnsent && !isSent) return false;

            // Status filter
            if (draftFilter === 'drafts' && !isUnsent) return false;
            if (draftFilter === 'sent' && !isSent) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (lead.customer_name || '').toLowerCase().includes(q);
                const matchAddress = (lead.customer_address || '').toLowerCase().includes(q);
                const matchEmail = (lead.customer_email || '').toLowerCase().includes(q);
                const matchPhone = (lead.customer_phone || '').toLowerCase().includes(q);
                const matchCat = (lead.project_category || '').toLowerCase().includes(q);
                
                if (!matchName && !matchAddress && !matchEmail && !matchPhone && !matchCat) return false;
            }

            return true;
        });
        
        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [leadsData, profile, draftFilter, searchQuery]);

    const handleSendToMester = async (draftId) => {
        try {
            toast.loading("Sender til mester...", { id: "send_draft" });
            const { error } = await supabase
                .from('leads')
                .update({ status: 'Ny forespørgsel', is_read: false })
                .eq('id', draftId);

            if (error) throw error;

            toast.success("Kladde sendt til mester!", { id: "send_draft" });
            
            // Local state update
            if (setLeadsData) {
                setLeadsData(prev => prev.map(l => l.id === draftId ? { ...l, status: 'Ny forespørgsel', is_read: false } : l));
            }
            setSelectedDraft(null);
        } catch (err) {
            console.error(err);
            toast.error("Fejl ved afsendelse: " + err.message, { id: "send_draft" });
        }
    };

    const handleDeleteDraft = async (draftId) => {
        requestConfirm(
            'Slet Kladde', 
            'Er du sikker på, at du vil slette denne kladde? Den kan ikke gendannes.', 
            'danger', 
            async () => {
                try {
                    toast.loading("Sletter kladde...", { id: "delete_draft" });
                    const { error } = await supabase
                        .from('leads')
                        .update({ status: 'Slettet' })
                        .eq('id', draftId);

                    if (error) throw error;

                    toast.success("Kladde slettet", { id: "delete_draft" });
                    
                    if (setLeadsData) {
                        setLeadsData(prev => prev.map(l => l.id === draftId ? { ...l, status: 'Slettet' } : l));
                    }
                    setSelectedDraft(null);
                } catch (err) {
                    console.error(err);
                    toast.error("Kunne ikke slette: " + err.message, { id: "delete_draft" });
                }
            }
        );
    };

    return (
        <div className="worker-drafts-container" style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '1.5rem' : '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileEdit size={isMobile ? 24 : 28} color="#2563eb" /> Dine Tilbudskladder
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>Opret og administrer kladdetilbud, inden de sendes til mester.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedDraft(null);
                        setIsCreateModalOpen(true);
                    }}
                    style={{ padding: isMobile ? '16px 24px' : '12px 24px', width: isMobile ? '100%' : 'auto', flexShrink: 0, justifyContent: 'center', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.3)'; }}
                >
                    <Plus size={20} /> Opret Kladde
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                gap: '16px', 
                marginBottom: '32px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)'
            }}>
                {isMobile ? (
                    <div style={{ position: 'relative', flexShrink: 0, width: '100%' }}>
                        <button 
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '12px 16px', 
                                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '16px', 
                                fontSize: '1.05rem', 
                                color: '#0f172a', 
                                fontWeight: '700', 
                                boxShadow: '0 4px 15px rgba(0,0,0,0.03), inset 0 2px 4px rgba(255,255,255,0.8)', 
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
                                    <Filter size={18} color="#4f46e5" /> 
                                </div>
                                {draftFilter === 'all' ? 'Alle Kladder' : draftFilter === 'drafts' ? 'Kun Kladder' : 'Sendt til Mester'}
                            </span>
                            <div style={{ background: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.06)' }}>
                                <ChevronRight size={18} color="#64748b" style={{ transform: isFilterMenuOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                            </div>
                        </button>

                        {isFilterMenuOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', padding: '8px', zIndex: 10, animation: 'fadeIn 0.2s ease-out' }}>
                                {[
                                    { id: 'all', label: 'Alle Kladder', icon: <FileEdit size={18} /> },
                                    { id: 'drafts', label: 'Kun Kladder', icon: <Clock size={18} /> },
                                    { id: 'sent', label: 'Sendt til Mester', icon: <CheckCircle size={18} /> }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setDraftFilter(tab.id);
                                            setIsFilterMenuOpen(false);
                                        }}
                                        style={{ width: '100%', textAlign: 'left', padding: '14px 20px', backgroundColor: draftFilter === tab.id ? '#eff6ff' : 'transparent', color: draftFilter === tab.id ? '#2563eb' : '#475569', border: 'none', borderRadius: '14px', fontSize: '1.05rem', fontWeight: draftFilter === tab.id ? '700' : '600', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <div style={{ color: draftFilter === tab.id ? '#3b82f6' : '#94a3b8' }}>
                                            {tab.icon}
                                        </div>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '14px', padding: '4px', flexShrink: 0 }}>
                        {[
                            { id: 'all', label: 'Alle Kladder' },
                            { id: 'drafts', label: 'Kun Kladder' },
                            { id: 'sent', label: 'Sendt til Mester' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setDraftFilter(tab.id)}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    backgroundColor: draftFilter === tab.id ? '#fff' : 'transparent',
                                    color: draftFilter === tab.id ? '#0f172a' : '#64748b',
                                    fontWeight: draftFilter === tab.id ? '600' : '500',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: draftFilter === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '320px' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text"
                        placeholder="Søg i kladder..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 42px',
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            fontSize: '0.95rem',
                            color: '#1e293b',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                            boxSizing: 'border-box'
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={e => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
                        }}
                    />
                </div>
            </div>

            {myDrafts.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <FileEdit size={40} color="#3b82f6" />
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#1e293b' }}>Ingen kladder endnu</h3>
                    <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '1.05rem', maxWidth: '400px', marginInline: 'auto' }}>Du har ikke oprettet nogen tilbudskladder endnu. Opret en ny for at komme i gang.</p>
                    <button 
                        onClick={() => {
                            setSelectedDraft(null);
                            setIsCreateModalOpen(true);
                        }}
                        style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Start din første kladde
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {myDrafts.map(draft => {
                        const isSent = draft.status === 'Ny forespørgsel';
                        
                        return (
                            <div 
                                key={draft.id} 
                                onClick={() => setSelectedDraft(draft)}
                                style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', backgroundColor: isSent ? '#10b981' : '#f59e0b' }}></div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: isSent ? '#ecfdf5' : '#fef3c7', color: isSent ? '#059669' : '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isSent ? <CheckCircle size={14} /> : <Clock size={14} />}
                                        {isSent ? 'Sendt til Mester' : 'Kladde'}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                        {new Date(draft.created_at).toLocaleDateString('da-DK', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>{draft.customer_name || 'Ukendt kunde'}</h3>
                                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.95rem' }}>{draft.project_category}</p>
                                
                                <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{draft.price_estimate || 'Beregnes...'}</span>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEWER MODAL */}
            {selectedDraft && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'stretch' : 'center', padding: isMobile ? '0' : '20px' }} onClick={() => setSelectedDraft(null)}>
                    <div style={{ backgroundColor: '#fff', borderRadius: isMobile ? '0' : '24px', width: '100%', maxWidth: isMobile ? '100%' : '600px', height: isMobile ? '100dvh' : 'auto', maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

                        <div style={{ padding: isMobile ? 'calc(env(safe-area-inset-top) + 16px) 20px 16px' : '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>Kladde Detaljer</h3>
                            <button onClick={() => setSelectedDraft(null)} style={{ background: isMobile ? '#fff' : 'none', border: isMobile ? '1px solid #e2e8f0' : 'none', borderRadius: isMobile ? '10px' : '0', width: isMobile ? '40px' : 'auto', height: isMobile ? '40px' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>

                        <div style={{ padding: isMobile ? '20px' : '32px', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#1e293b' }}>{selectedDraft.customer_name}</h4>
                                    <p style={{ margin: '0 0 4px 0', color: '#64748b' }}>{selectedDraft.customer_address}</p>
                                    <p style={{ margin: 0, color: '#64748b' }}>{selectedDraft.customer_email} • {selectedDraft.customer_phone}</p>
                                </div>
                                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Estimeret Pris</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{selectedDraft.price_estimate}</span>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
                                <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Projektinfo</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Kategori</span>
                                        <span style={{ fontWeight: '500', color: '#1e293b', textTransform: 'capitalize' }}>{selectedDraft.project_category === 'special' ? 'Skræddersyet Opgave' : selectedDraft.project_category}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Status</span>
                                        <span style={{ fontWeight: '500', color: selectedDraft.status === 'Intern Kladde' ? '#059669' : '#d97706' }}>{selectedDraft.status}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedDraft.status === 'Ny forespørgsel' && (
                                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ color: '#3b82f6', marginTop: '2px' }}><CheckCircle size={24} /></div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px 0', color: '#1e3a8a', fontSize: '1.05rem' }}>Sendt til Mester</h4>
                                        <p style={{ margin: 0, color: '#1e40af', fontSize: '0.95rem', lineHeight: '1.5' }}>Denne kladde er afleveret og behandles nu af mester. Du kan stadig se overslaget, men det er ikke længere muligt at ændre i detaljerne.</p>
                                    </div>
                                </div>
                            )}

                            {selectedDraft.raw_data && selectedDraft.raw_data.calc_data && (
                                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                    <h5 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Økonomi & Tidsforbrug</h5>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                            <Clock size={16} /> Estimeret arbejdstid
                                        </div>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                            {selectedDraft.raw_data.calc_data.laborHours || 0} timer
                                        </span>
                                    </div>

                                    {selectedDraft.raw_data.calc_data.materialCost !== undefined && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                            <span style={{ color: '#64748b' }}>Estimeret materialepris</span>
                                            <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                                {selectedDraft.raw_data.calc_data.materialCost.toLocaleString('da-DK')} kr.
                                            </span>
                                        </div>
                                    )}

                                    {selectedDraft.raw_data.details && selectedDraft.raw_data.details.phases && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h6 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '0.9rem' }}>Faser:</h6>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {selectedDraft.raw_data.details.phases.map((phase, idx) => (
                                                    <div key={idx} style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: '#334155' }}>
                                                        <strong>{phase.name}</strong>
                                                        {phase.materials && phase.materials.length > 0 && (
                                                            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                                                                {phase.materials.length} materialer tilknyttet
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedDraft.raw_data.answers && Object.keys(selectedDraft.raw_data.answers).length > 0 && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h6 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '0.9rem' }}>Besvarelser:</h6>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {Object.entries(selectedDraft.raw_data.answers).slice(0, 5).map(([key, val], idx) => (
                                                    <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                                        <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</span>
                                                        <span style={{ color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                                            {typeof val === 'boolean' ? (val ? 'Ja' : 'Nej') : (typeof val === 'object' ? 'Flere valgt' : String(val))}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {selectedDraft.status !== 'Ny forespørgsel' && (
                            <div style={{ padding: isMobile ? '16px 20px calc(env(safe-area-inset-bottom) + 16px)' : '24px 32px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? '12px' : '16px', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                                <button
                                    onClick={() => handleDeleteDraft(selectedDraft.id)}
                                    style={{ padding: isMobile ? '16px 20px' : '12px 20px', width: '100%', justifyContent: 'center', background: '#fff', border: '1px solid #ef4444', borderRadius: isMobile ? '12px' : '10px', color: '#ef4444', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                >
                                    <Trash2 size={18} /> Slet
                                </button>
                                <button
                                    onClick={() => {
                                        const mode = selectedDraft.project_category === 'special' ? 'custom' : 'classic';
                                        setCreateMode(mode);
                                        setIsCreateModalOpen(true);
                                    }}
                                    style={{ padding: isMobile ? '16px 20px' : '12px 20px', width: '100%', justifyContent: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: isMobile ? '12px' : '10px', color: '#334155', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                >
                                    <FileEdit size={18} /> Rediger
                                </button>
                            </div>

                            {selectedDraft.status === 'Kladde' && (
                                <button
                                    onClick={() => handleSendToMester(selectedDraft.id)}
                                    style={{ padding: isMobile ? '16px 24px' : '12px 24px', width: isMobile ? '100%' : 'auto', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: isMobile ? '12px' : '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }}
                                >
                                    <Send size={18} /> Send til Mester
                                </button>
                            )}
                        </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* CREATE MODAL */}
            {isCreateModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'stretch' : 'center', zIndex: 100000, padding: isMobile ? '0' : '20px' }} onClick={() => {
                    if (createMode !== null) {
                        requestConfirm('Afbryd Oprettelse', 'Er du sikker på, at du vil lukke? Du mister din indtastning.', 'warning', () => {
                            setIsCreateModalOpen(false);
                            setCreateMode(null);
                        });
                    } else {
                        setIsCreateModalOpen(false);
                    }
                }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: isMobile ? '0' : '20px', width: '100%', maxWidth: isMobile ? '100%' : '1000px', height: isMobile ? '100dvh' : 'auto', maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => {
                            if (createMode !== null) {
                                requestConfirm('Afbryd Oprettelse', 'Er du sikker på, at du vil lukke? Du mister din indtastning.', 'warning', () => {
                                    setIsCreateModalOpen(false);
                                    setCreateMode(null);
                                });
                            } else {
                                setIsCreateModalOpen(false);
                            }
                        }} style={{ position: isMobile ? 'fixed' : 'absolute', top: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : '20px', right: isMobile ? '16px' : '20px', background: '#f3f1ed', border: 'none', fontSize: isMobile ? '1.4rem' : '1.2rem', width: isMobile ? '42px' : '36px', height: isMobile ? '42px' : '36px', borderRadius: '50%', cursor: 'pointer', color: '#6b7280', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100001, boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>×</button>

                        <div style={{ padding: '0' }}>
                            {createMode === null && (
                                <CreateLeadSelector
                                    isMobile={isMobile}
                                    onSelectClassic={() => setCreateMode('classic')}
                                    onSelectCustom={() => setCreateMode('custom')}
                                />
                            )}
                            
                            {createMode === 'classic' && (
                                <Wizard 
                                    carpenter={carpenterProfile || profile} 
                                    isManualCreation={true} 
                                    draftCreator={profile}
                                    initialData={selectedDraft}
                                    onComplete={async (data) => {
                                        setIsCreateModalOpen(false);
                                        setCreateMode(null);
                                        toast.success('Ny kladde gemt!');
                                        // Refresh leads
                                        const { data: newLeads } = await supabase.from('leads').select('*').eq('carpenter_id', carpenterProfile.id).order('created_at', { ascending: false });
                                        if (newLeads && setLeadsData) {
                                            const filteredLeads = newLeads.filter(l => {
                                                if (l.status === 'Slettet') return false;
                                                if (profile.role === 'admin') return true;
                                                const assignedWorkers = l.raw_data?.assigned_workers || [];
                                                const assignedPM = l.raw_data?.assigned_pm;
                                                const createdBy = l.raw_data?.created_by;
                                                
                                                if (profile.role === 'worker' || profile.role === 'apprentice') {
                                                    return assignedWorkers.includes(profile.id) || createdBy === profile.id;
                                                }
                                                if (profile.role === 'sales') {
                                                    return assignedPM === profile.id || createdBy === profile.id;
                                                }
                                                return true;
                                            });
                                            setLeadsData(filteredLeads);
                                        }
                                    }} 
                                />
                            )}

                            {createMode === 'custom' && (
                                <CustomProjectCreator
                                    carpenter={carpenterProfile || profile}
                                    isMobile={isMobile}
                                    draftCreator={profile}
                                    initialData={selectedDraft}
                                    onCancel={() => {
                                        requestConfirm('Afbryd Oprettelse', 'Er du sikker på, at du vil afbryde?', 'warning', () => {
                                            setIsCreateModalOpen(false);
                                            setCreateMode(null);
                                        });
                                    }}
                                    onComplete={async (data) => {
                                        setIsCreateModalOpen(false);
                                        setCreateMode(null);
                                        toast.success('Ny skræddersyet kladde gemt!');
                                        const { data: newLeads } = await supabase.from('leads').select('*').eq('carpenter_id', carpenterProfile.id).order('created_at', { ascending: false });
                                        if (newLeads && setLeadsData) {
                                            const filteredLeads = newLeads.filter(l => {
                                                if (l.status === 'Slettet') return false;
                                                if (profile.role === 'admin') return true;
                                                const assignedWorkers = l.raw_data?.assigned_workers || [];
                                                const assignedPM = l.raw_data?.assigned_pm;
                                                const createdBy = l.raw_data?.created_by;
                                                
                                                if (profile.role === 'worker' || profile.role === 'apprentice') {
                                                    return assignedWorkers.includes(profile.id) || createdBy === profile.id;
                                                }
                                                if (profile.role === 'sales') {
                                                    return assignedPM === profile.id || createdBy === profile.id;
                                                }
                                                return true;
                                            });
                                            setLeadsData(filteredLeads);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* CONFIRM MODAL */}
            {confirmDialog && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 200000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={confirmDialog.onCancel}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', padding: '32px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: confirmDialog.type === 'danger' ? '#fef2f2' : '#fffbeb', color: confirmDialog.type === 'danger' ? '#ef4444' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            {confirmDialog.type === 'danger' ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem', color: '#0f172a' }}>{confirmDialog.title}</h3>
                        <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: '1.05rem', lineHeight: '1.5' }}>{confirmDialog.message}</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={confirmDialog.onCancel}
                                style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={confirmDialog.onConfirm}
                                style={{ flex: 1, padding: '12px', backgroundColor: confirmDialog.type === 'danger' ? '#ef4444' : '#d97706', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: confirmDialog.type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(217, 119, 6, 0.3)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Bekræft
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default WorkerDrafts;
