import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Phone, Mail, Pencil, Trash2, Plus, X, Loader2, Wrench, HardHat, ChevronDown } from 'lucide-react';

/*
 * Underleverandører = eksterne partnere/kontakter UDEN login.
 * Helt adskilt fra carpenters (medarbejdere med auth/login).
 * Denne fil rummer:
 *   - SubcontractorModal: genbrugelig opret/redigér-box (bruges både her og inde på en sag)
 *   - SubcontractorManager: fast administrationssektion (under Team/medarbejdere)
 */

const TRADES = ['Elektriker', 'VVS', 'Maler', 'Murer', 'Kloak / Anlæg', 'Gulv', 'Smed', 'Andet'];

// ---------------------------------------------------------------------------
// MODAL — opret eller redigér en underleverandør (firma + mester)
// ---------------------------------------------------------------------------
export function SubcontractorModal({ open, onClose, companyId, initial = null, onSaved }) {
    const blank = { company_name: '', trade: '', contact_name: '', contact_phone: '', contact_email: '', cvr: '', notes: '' };
    const [form, setForm] = useState(blank);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(initial ? {
                company_name: initial.company_name || '',
                trade: initial.trade || '',
                contact_name: initial.contact_name || '',
                contact_phone: initial.contact_phone || '',
                contact_email: initial.contact_email || '',
                cvr: initial.cvr || '',
                notes: initial.notes || ''
            } : blank);
        }
    }, [open, initial]);

    if (!open) return null;

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.company_name.trim()) {
            toast.error('Angiv venligst et firmanavn.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = { ...form, company_id: companyId };
            let saved;
            if (initial?.id) {
                const { data, error } = await supabase
                    .from('subcontractors')
                    .update(payload)
                    .eq('id', initial.id)
                    .select()
                    .single();
                if (error) throw error;
                saved = data;
            } else {
                const { data, error } = await supabase
                    .from('subcontractors')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw error;
                saved = data;
            }
            toast.success(initial?.id ? 'Underleverandør opdateret!' : 'Underleverandør oprettet!');
            if (onSaved) onSaved(saved);
            onClose();
        } catch (err) {
            console.error('Subcontractor save error:', err);
            toast.error('Kunne ikke gemme underleverandøren. Er databasen sat op?');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '20px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
                                    {initial?.id ? 'Redigér underleverandør' : 'Ny underleverandør'}
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Ekstern partner — uden login</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSave} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <Field label="Firmanavn *">
                            <input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="F.eks. El-Hansen ApS" style={inputStyle} autoFocus />
                        </Field>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <Field label="Fag">
                                <TradeSelect value={form.trade} onChange={(val) => set('trade', val)} options={TRADES} />
                            </Field>
                            <Field label="CVR (valgfrit)">
                                <input value={form.cvr} onChange={(e) => set('cvr', e.target.value)} placeholder="12345678" style={inputStyle} />
                            </Field>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mester / fast kontaktperson</div>

                        <Field label="Navn på mester">
                            <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="F.eks. Jens Hansen" style={inputStyle} />
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <Field label="Telefon">
                                <input type="tel" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="12 34 56 78" style={inputStyle} />
                            </Field>
                            <Field label="E-mail">
                                <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="jens@firma.dk" style={inputStyle} />
                            </Field>
                        </div>

                        <Field label="Noter (valgfrit)">
                            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="F.eks. fast samarbejdspartner på tagprojekter" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                        </Field>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <button type="button" onClick={onClose} style={{ flex: '0 0 auto', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}>
                                Annullér
                            </button>
                            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 700, cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 16px rgba(124, 58, 237, 0.25)', transition: 'transform 0.1s' }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Building2 size={18} />}
                                {initial?.id ? 'Gem ændringer' : 'Opret underleverandør'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.95rem',
    color: '#0f172a',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
};

function Field({ label, children }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{label}</span>
            {children}
        </label>
    );
}

// Lækker custom dropdown i platformens stil (erstatter browser-standard <select>)
function TradeSelect({ value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const renderOption = (label, val) => {
        const selected = value === val;
        const isHover = hovered === val;
        return (
            <div
                key={val || '__blank'}
                onClick={() => { onChange(val); setOpen(false); }}
                onMouseEnter={() => setHovered(val)}
                onMouseLeave={() => setHovered(null)}
                style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: selected ? 600 : 500,
                    color: selected ? '#6d28d9' : '#334155',
                    background: selected ? '#f5f3ff' : (isHover ? '#f8fafc' : 'transparent'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.12s'
                }}
            >
                <span>{label}</span>
                {selected && <span style={{ color: '#7c3aed', fontWeight: 700 }}>✓</span>}
            </div>
        );
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderColor: open ? '#7c3aed' : '#e2e8f0',
                    boxShadow: open ? '0 0 0 3px rgba(124, 58, 237, 0.12)' : 'none'
                }}
            >
                <span style={{ color: value ? '#0f172a' : '#94a3b8' }}>{value || '— Vælg fag —'}</span>
                <ChevronDown size={18} style={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.18)',
                            zIndex: 60,
                            overflow: 'hidden',
                            padding: '6px',
                            maxHeight: '240px',
                            overflowY: 'auto'
                        }}
                    >
                        {renderOption('— Vælg fag —', '')}
                        {options.map(o => renderOption(o, o))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MANAGER — fast administrationssektion (under Team)
// ---------------------------------------------------------------------------
export function SubcontractorManager({ profile }) {
    const companyId = profile.company_id || profile.id;
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchList = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('subcontractors')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
        if (!error && data) setList(data);
        setIsLoading(false);
    };

    useEffect(() => { fetchList(); }, [companyId]);

    const handleSaved = (saved) => {
        setList(prev => {
            const exists = prev.find(s => s.id === saved.id);
            return exists ? prev.map(s => s.id === saved.id ? saved : s) : [saved, ...prev];
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Slet denne underleverandør? Den fjernes fra dit register (allerede tilknyttede sager beholder deres oplysninger).')) return;
        const { error } = await supabase.from('subcontractors').delete().eq('id', id);
        if (!error) setList(prev => prev.filter(s => s.id !== id));
        else toast.error('Kunne ikke slette.');
    };

    return (
        <div className="settings-card" style={{ marginTop: '32px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                        <Building2 size={24} />
                    </div>
                    <h3>Underleverandører ({list.length})</h3>
                </div>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 6px 14px rgba(124, 58, 237, 0.22)', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Plus size={18} /> Tilføj underleverandør
                </button>
            </div>

            <div className="card-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px' }}>
                    Eksterne partnere (elektriker, VVS, m.m.) uden login. Gemte underleverandører kan tilføjes direkte til en sag under "Holdet på sagen".
                </p>

                {isLoading ? (
                    <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Loader2 className="animate-spin" size={28} />
                    </div>
                ) : list.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Building2 size={44} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
                        <p style={{ margin: 0 }}>Du har ikke gemt nogen underleverandører endnu.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {list.map(sc => (
                            <div key={sc.id} className="glass-panel" style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem', lineHeight: 1.2 }}>{sc.company_name}</div>
                                            {sc.trade && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: '999px' }}>
                                                    <Wrench size={11} /> {sc.trade}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => { setEditing(sc); setModalOpen(true); }} title="Redigér" style={iconBtn}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(sc.id)} title="Slet" style={iconBtn}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {(sc.contact_name || sc.contact_phone || sc.contact_email) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                                        {sc.contact_name && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <HardHat size={14} style={{ color: '#94a3b8' }} /> {sc.contact_name} <span style={{ color: '#94a3b8' }}>(mester)</span>
                                            </div>
                                        )}
                                        {sc.contact_phone && (
                                            <a href={`tel:${sc.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#7c3aed'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                                                <Phone size={14} style={{ color: '#94a3b8' }} /> {sc.contact_phone}
                                            </a>
                                        )}
                                        {sc.contact_email && (
                                            <a href={`mailto:${sc.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#7c3aed'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                                                <Mail size={14} style={{ color: '#94a3b8' }} /> {sc.contact_email}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SubcontractorModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                companyId={companyId}
                initial={editing}
                onSaved={handleSaved}
            />
        </div>
    );
}

const iconBtn = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s'
};
