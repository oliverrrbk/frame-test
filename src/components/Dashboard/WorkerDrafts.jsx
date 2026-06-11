import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileEdit, Plus, Send, Clock, User, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateLeadSelector from './CreateLeadSelector';
import Wizard from '../Wizard/Wizard';
import CustomProjectCreator from './CustomProjectCreator';

const WorkerDrafts = ({ profile, supabase, leadsData, setLeadsData }) => {
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

    // Filter leads to only show drafts created by this worker or sales person
    const myDrafts = useMemo(() => {
        return leadsData.filter(lead => {
            const isDraftStatus = lead.status === 'Kladde' || lead.status === 'Intern Kladde';
            const isMyDraft = lead.raw_data?.created_by === profile?.id || lead.raw_data?.draft_mode === true;
            return isDraftStatus && isMyDraft;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [leadsData, profile]);

    const handleSendToMester = async (draftId) => {
        try {
            toast.loading("Sender til mester...", { id: "send_draft" });
            const { error } = await supabase
                .from('leads')
                .update({ status: 'Intern Kladde' })
                .eq('id', draftId);

            if (error) throw error;

            toast.success("Kladde sendt til mester!", { id: "send_draft" });
            
            // Local state update
            if (setLeadsData) {
                setLeadsData(prev => prev.map(l => l.id === draftId ? { ...l, status: 'Intern Kladde' } : l));
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
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ padding: isMobile ? '16px 24px' : '12px 24px', width: isMobile ? '100%' : 'auto', flexShrink: 0, justifyContent: 'center', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.3)'; }}
                >
                    <Plus size={20} /> Opret Kladde
                </button>
            </div>

            {myDrafts.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <FileEdit size={40} color="#3b82f6" />
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#1e293b' }}>Ingen kladder endnu</h3>
                    <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '1.05rem', maxWidth: '400px', marginInline: 'auto' }}>Du har ikke oprettet nogen tilbudskladder endnu. Opret en ny for at komme i gang.</p>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Start din første kladde
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {myDrafts.map(draft => {
                        const isSent = draft.status === 'Intern Kladde';
                        
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
                                        <span style={{ fontWeight: '500', color: '#1e293b' }}>{selectedDraft.project_category}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Status</span>
                                        <span style={{ fontWeight: '500', color: selectedDraft.status === 'Intern Kladde' ? '#059669' : '#d97706' }}>{selectedDraft.status}</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div style={{ padding: isMobile ? '16px 20px calc(env(safe-area-inset-bottom) + 16px)' : '24px 32px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? '12px' : '16px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => handleDeleteDraft(selectedDraft.id)}
                                style={{ padding: isMobile ? '16px 20px' : '12px 20px', width: isMobile ? '100%' : 'auto', justifyContent: 'center', background: '#fff', border: '1px solid #ef4444', borderRadius: isMobile ? '12px' : '10px', color: '#ef4444', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                                <Trash2 size={18} /> Slet Kladde
                            </button>

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
                                    carpenter={profile} // profile is worker, so pass them
                                    isManualCreation={true} 
                                    draftCreator={profile}
                                    onComplete={async (data) => {
                                        setIsCreateModalOpen(false);
                                        setCreateMode(null);
                                        toast.success('Ny kladde gemt!');
                                        // Refresh leads
                                        const { data: newLeads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
                                        if (newLeads && setLeadsData) {
                                            setLeadsData(newLeads.filter(l => l.status !== 'Slettet'));
                                        }
                                    }} 
                                />
                            )}

                            {createMode === 'custom' && (
                                <CustomProjectCreator
                                    carpenter={profile}
                                    isMobile={isMobile}
                                    draftCreator={profile}
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
                                        const { data: newLeads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
                                        if (newLeads && setLeadsData) {
                                            setLeadsData(newLeads.filter(l => l.status !== 'Slettet'));
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
