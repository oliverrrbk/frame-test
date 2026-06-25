import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, User, Phone, Building, Send } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

// Genbrugelig "Send gæste-login"-modal. Bruges på en sag (leadId kendt).
// Opretter et projekt-medlemskab + sender en invitations-mail hvor gæsten
// vælger adgangskode og godkender vilkår. Mester bruger ALDRIG tid på timer.
const ROLES = [
    { value: 'subcontractor_owner', label: 'Underentreprenør (mester)' },
    { value: 'journeyman', label: 'Svend' },
    { value: 'apprentice', label: 'Lærling' },
    { value: 'project_manager', label: 'Projektleder' },
];

export default function GuestInviteModal({ open, onClose, leadId, invitedByCompanyId, projectTitle, onSent, selectableLeads = null }) {
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('subcontractor_owner');
    const [pickedLeadId, setPickedLeadId] = useState('');
    const [sending, setSending] = useState(false);

    if (!open) return null;

    // Når modalen åbnes UDEN en bestemt sag (fx fra "Holdet"), vælger mester sagen her.
    const titleOf = (l) => l?.raw_data?.project_title || l?.project_category || `Sag #${l?.case_number || String(l?.id || '').slice(0, 6)}`;
    const showPicker = !leadId && Array.isArray(selectableLeads);
    const effectiveLeadId = leadId || pickedLeadId || (selectableLeads && selectableLeads[0]?.id) || '';
    const pickedLead = selectableLeads?.find(l => String(l.id) === String(effectiveLeadId));
    const effectiveTitle = projectTitle || (pickedLead ? titleOf(pickedLead) : '');

    const send = async () => {
        if (!name.trim() || !email.trim()) { toast.error('Udfyld navn og e-mail.'); return; }
        if (!effectiveLeadId) { toast.error('Vælg hvilken sag de skal have adgang til.'); return; }
        setSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/invite-guest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    leadId: effectiveLeadId, invitedByCompanyId, name, email, phone, companyName, role,
                    projectTitle: effectiveTitle, origin: window.location.origin,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Kunne ikke sende invitationen.');
            toast.success('Gæste-login sendt! 📨');
            if (onSent) onSent();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    };

    const inputStyle = { width: '100%', padding: '13px 14px 13px 42px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a' };
    const label = { display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 7px 2px' };
    const wrap = { position: 'relative' };
    const iconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' };

    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease-out' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '26px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'fadeInDown 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ padding: '24px 26px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Send gæste-login</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>De får adgang til {effectiveTitle ? <strong>{effectiveTitle}</strong> : 'sagen'} og kan føre egne timer.</p>
                    </div>
                    <button onClick={onClose} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                </div>

                <div style={{ padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {showPicker && (
                        <div>
                            <label style={label}>Sag *</label>
                            {selectableLeads.length === 0 ? (
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>Du har ingen aktive sager at give adgang til endnu.</p>
                            ) : (
                                <select value={effectiveLeadId} onChange={e => setPickedLeadId(e.target.value)} style={{ ...inputStyle, paddingLeft: 14 }}>
                                    {selectableLeads.map(l => <option key={l.id} value={l.id}>{titleOf(l)}{l.customer_name ? ` · ${l.customer_name}` : ''}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                    <div><label style={label}>Navn *</label><div style={wrap}><User size={17} style={iconStyle} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Jacob Jensen" style={inputStyle} /></div></div>
                    <div><label style={label}>Firmanavn</label><div style={wrap}><Building size={17} style={iconStyle} /><input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Jacobs VVS ApS" style={inputStyle} /></div></div>
                    <div><label style={label}>E-mail *</label><div style={wrap}><Mail size={17} style={iconStyle} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jacob@firma.dk" style={inputStyle} /></div></div>
                    <div><label style={label}>Telefon</label><div style={wrap}><Phone size={17} style={iconStyle} /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+45 12 34 56 78" style={inputStyle} /></div></div>
                    <div>
                        <label style={label}>Rolle på sagen</label>
                        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, paddingLeft: 14 }}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ padding: '18px 26px calc(18px + env(safe-area-inset-bottom))', borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={send} disabled={sending}
                        style={{ width: '100%', padding: '15px', background: sending ? '#64748b' : '#0f172a', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1.05rem', cursor: sending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Send size={18} /> {sending ? 'Sender…' : 'Send invitation'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
