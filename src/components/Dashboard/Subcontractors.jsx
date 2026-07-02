import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Phone, Mail, Pencil, Trash2, Plus, X, Loader2, Wrench, HardHat, ChevronDown, MapPin, CheckCircle } from 'lucide-react';

/*
 * Underleverandører = eksterne partnere/kontakter UDEN login.
 * Helt adskilt fra carpenters (medarbejdere med auth/login).
 * Denne fil rummer:
 *   - SubcontractorModal: genbrugelig opret/redigér-box (bruges både her og inde på en sag)
 *   - SubcontractorManager: fast administrationssektion (under Team/medarbejdere)
 */

const TRADES = ['Tømrer', 'Elektriker', 'VVS', 'Maler', 'Murer', 'Kloak / Anlæg', 'Gulv', 'Smed', 'Andet'];

// ---------------------------------------------------------------------------
// MODAL — opret eller redigér en underleverandør (firma + mester)
// ---------------------------------------------------------------------------
export function SubcontractorModal({ open, onClose, companyId, initial = null, onSaved, leadId = null, selectableLeads = null, invitedByCompanyId = null }) {
    const blank = { company_name: '', trade: '', contact_name: '', contact_phone: '', contact_email: '', cvr: '', address: '', zip: '', city: '', notes: '', workers: [] };
    const [form, setForm] = useState(blank);
    const [isSaving, setIsSaving] = useState(false);
    const [pickedLeadId, setPickedLeadId] = useState('');
    const [sentEmails, setSentEmails] = useState({});   // e-mail -> true (sendt i denne session)
    const [sendingEmail, setSendingEmail] = useState(null);

    useEffect(() => {
        if (open) {
            setForm(initial ? {
                company_name: initial.company_name || '',
                trade: initial.trade || '',
                contact_name: initial.contact_name || '',
                contact_phone: initial.contact_phone || '',
                contact_email: initial.contact_email || '',
                cvr: initial.cvr || '',
                address: initial.address || '',
                zip: initial.zip || '',
                city: initial.city || '',
                notes: initial.notes || '', workers: initial.workers || []
            } : blank);
        }
    }, [open, initial]);

    if (!open) return null;

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    // --- Gæste-login (integreret) ---
    // Aktiveres når modalen åbnes med et firma-id OG enten en konkret sag (leadId)
    // eller en liste af sager man kan vælge imellem (selectableLeads).
    const guestEnabled = !!invitedByCompanyId && (!!leadId || (Array.isArray(selectableLeads) && selectableLeads.length > 0));
    const effLeadId = leadId || pickedLeadId || (selectableLeads && selectableLeads[0]?.id) || '';
    const leadTitleOf = (l) => l?.raw_data?.project_title || l?.project_category || `Sag #${l?.case_number || ''}`;
    const mapWorkerRole = (r) => (r === 'Lærling' ? 'apprentice' : r === 'Projektleder' ? 'project_manager' : 'journeyman');

    const sendGuestLogin = async ({ name, email, phone, role }) => {
        if (!name?.trim() || !email?.trim()) { toast.error('Personen skal have navn og e-mail først.'); return; }
        if (!effLeadId) { toast.error('Vælg hvilken sag de skal have adgang til.'); return; }
        setSendingEmail(email);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/invite-guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
                body: JSON.stringify({
                    leadId: effLeadId, invitedByCompanyId, name, email, phone: phone || '',
                    companyName: form.company_name, role, origin: window.location.origin,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Kunne ikke sende.');
            setSentEmails(prev => ({ ...prev, [email]: true }));
            toast.success(data.isNewUser === false ? 'Tilføjet til sagen! 📨' : 'Gæste-login sendt! 📨');
        } catch (e) {
            console.error(e);
            toast.error(e.message);
        } finally {
            setSendingEmail(null);
        }
    };

    // Lille genbrugelig "Send gæste-login"-knap pr. person.
    const GuestButton = ({ person }) => {
        if (!guestEnabled) return null;
        const done = sentEmails[person.email];
        const busy = sendingEmail === person.email;
        return (
            <button type="button" onClick={() => sendGuestLogin(person)} disabled={busy || done}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '10px', border: done ? '1px solid #a7f3d0' : '1px solid #bfdbfe', background: done ? '#ecfdf5' : '#eff6ff', color: done ? '#059669' : '#2563eb', fontWeight: 700, fontSize: '0.8rem', cursor: busy || done ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                {done ? '✓ Login sendt' : busy ? 'Sender…' : '📨 Send gæste-login'}
            </button>
        );
    };

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
                style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px' }}
                className="subcontractor-modal-overlay"
            >
                <style>{`
                    .subcontractor-modal-container {
                        width: 100%;
                        max-width: 520px;
                        max-height: 90vh;
                        overflow-y: auto;
                        background: #ffffff;
                        border-radius: 24px;
                        box-shadow: 0 24px 48px -12px rgba(0,0,0,0.25);
                        border: 1px solid #e2e8f0;
                        margin: 20px;
                    }
                    @media (max-width: 768px) {
                        .subcontractor-modal-overlay {
                            align-items: flex-end !important;
                        }
                        .subcontractor-modal-container {
                            margin: 0 !important;
                            max-height: 90vh !important;
                            border-radius: 32px 32px 0 0 !important;
                            border: none !important;
                            padding-bottom: env(safe-area-inset-bottom, 20px) !important;
                        }
                    }
                `}</style>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="subcontractor-modal-container"
                >
                    {/* Mobile grabber */}
                    <div style={{ display: 'none' }} className="mobile-grabber-container">
                        <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: '#cbd5e1', margin: '16px auto 0 auto' }} />
                    </div>
                    <style>{`
                        @media (max-width: 768px) {
                            .mobile-grabber-container { display: block !important; }
                        }
                    `}</style>
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

                        {guestEnabled && (
                            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #dbeafe', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>📨 Gæste-login til Frame</div>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                                    Giv mesteren og/eller svendene adgang til sagen + deres egne timer. De vælger selv adgangskode første gang — tilføjes de senere til flere sager, sker det helt uden nyt login.
                                </p>
                                {!leadId && (
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' }}>Gæste-login gælder sagen</label>
                                        <LeadSelect
                                            value={effLeadId}
                                            onChange={(id) => setPickedLeadId(id)}
                                            options={selectableLeads.map(l => ({ id: l.id, label: `${leadTitleOf(l)}${l.customer_name ? ` · ${l.customer_name}` : ''}` }))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mester / fast kontaktperson</div>

                        <Field label="Navn på mester">
                            <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="F.eks. Jens Hansen" style={inputStyle} />
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <Field label="Telefon">
                                <BeautifulPhoneInput value={form.contact_phone} onChange={(val) => set('contact_phone', val)} />
                            </Field>
                            <Field label="E-mail">
                                <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="jens@firma.dk" style={inputStyle} />
                            </Field>
                        </div>
                        {guestEnabled && (form.contact_name || form.contact_email) && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                                <GuestButton person={{ name: form.contact_name, email: form.contact_email, phone: form.contact_phone, role: 'subcontractor_owner' }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Firmaadresse</span>
                            <AddressFields
                                street={form.address} zip={form.zip} city={form.city}
                                onStreet={(v) => set('address', v)} onZip={(v) => set('zip', v)} onCity={(v) => set('city', v)}
                            />
                        </div>

                        <Field label="Noter (valgfrit)">
                            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="F.eks. fast samarbejdspartner på tagprojekter" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                        </Field>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '16px 0 8px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medarbejdere (Svende & Lærlinge)</div>
                            <button type="button" onClick={() => set('workers', [...(form.workers || []), { id: `sw-${Date.now()}`, name: '', phone: '', email: '', role: 'Svend' }])} style={{ background: '#f5f3ff', color: '#7c3aed', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <Plus size={14} /> Tilføj
                            </button>
                        </div>
                        
                        <AnimatePresence>
                            {(form.workers || []).map((w, i) => (
                                <motion.div 
                                    key={w.id}
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                >
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input value={w.name} onChange={(e) => { const nw = [...form.workers]; nw[i].name = e.target.value; set('workers', nw); }} placeholder="Navn (fx Lars Lærling)" style={inputStyle} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <BeautifulPhoneInput value={w.phone} onChange={(val) => { const nw = [...form.workers]; nw[i].phone = val; set('workers', nw); }} />
                                            <CustomRoleSelect value={w.role} onChange={(val) => { const nw = [...form.workers]; nw[i].role = val; set('workers', nw); }} />
                                        </div>
                                        {guestEnabled && (
                                            <>
                                                <input type="email" value={w.email || ''} onChange={(e) => { const nw = [...form.workers]; nw[i].email = e.target.value; set('workers', nw); }} placeholder="E-mail (til gæste-login)" style={inputStyle} />
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <GuestButton person={{ name: w.name, email: w.email, phone: w.phone, role: mapWorkerRole(w.role) }} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => { const nw = form.workers.filter(x => x.id !== w.id); set('workers', nw); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '24px 0 16px 0' }} />

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

// Adresse-felter med DAWA-forslag (samme kilde som resten af systemet). Deler
// adressen op i vej / postnr / by, så firmaadressen bliver rigtig og struktureret.
function AddressFields({ street, zip, city, onStreet, onZip, onCity }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSug, setShowSug] = useState(false);
    const debRef = useRef(null);
    const blurRef = useRef(null);

    const handleStreet = (val) => {
        onStreet(val);
        if (debRef.current) clearTimeout(debRef.current);
        if (!val || val.trim().length < 3) { setSuggestions([]); setShowSug(false); return; }
        debRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.dataforsyningen.dk/adgangsadresser/autocomplete?q=${encodeURIComponent(val)}&per_side=6`);
                if (!res.ok) return;
                const data = await res.json();
                setSuggestions(Array.isArray(data) ? data : []);
                setShowSug(true);
            } catch { /* netværksfejl — brugeren kan skrive manuelt */ }
        }, 200);
    };

    const pick = (item) => {
        const a = item?.adgangsadresse || {};
        let s = [a.vejnavn, a.husnr].filter(Boolean).join(' ').trim();
        let p = a.postnr || '';
        let b = a.postnrnavn || '';
        if ((!s || !p) && item?.tekst) {
            const m = item.tekst.match(/^(.*?),\s*(\d{4})\s+(.+)$/);
            if (m) { s = s || m[1].trim(); p = p || m[2]; b = b || m[3].trim(); }
        }
        if (s) onStreet(s);
        if (p) onZip(p);
        if (b) onCity(b);
        setSuggestions([]); setShowSug(false);
        if (blurRef.current) clearTimeout(blurRef.current);
    };

    const handleZip = (val) => {
        const z = val.replace(/[^\d]/g, '').slice(0, 4);
        onZip(z);
        if (z.length === 4) {
            fetch(`https://api.dataforsyningen.dk/postnumre/${z}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(d => { if (d && d.navn) onCity(d.navn); })
                .catch(() => { /* ukendt postnr — lad brugeren skrive by selv */ });
        }
    };

    const subLabel = { fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
                <label style={subLabel}>Vej og nr.</label>
                <input
                    value={street}
                    onChange={(e) => handleStreet(e.target.value)}
                    onFocus={() => { if (suggestions.length) setShowSug(true); }}
                    onBlur={() => { blurRef.current = setTimeout(() => setShowSug(false), 150); }}
                    placeholder="F.eks. Industrivej 4"
                    style={inputStyle}
                    autoComplete="off"
                />
                {showSug && suggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: '6px', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.18)', maxHeight: '240px', overflowY: 'auto' }}>
                        {suggestions.map((item, idx) => (
                            <li
                                key={item.tekst || idx}
                                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                                style={{ padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                {item.tekst}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px' }}>
                <div>
                    <label style={subLabel}>Postnr.</label>
                    <input value={zip} onChange={(e) => handleZip(e.target.value)} placeholder="8000" inputMode="numeric" style={inputStyle} />
                </div>
                <div>
                    <label style={subLabel}>By</label>
                    <input value={city} onChange={(e) => onCity(e.target.value)} placeholder="Aarhus C" style={inputStyle} />
                </div>
            </div>
        </div>
    );
}

// Bison-stil dropdown til at vælge hvilken sag et gæste-login gælder (options: {id, label}).
function LeadSelect({ value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedLabel = options.find(o => String(o.id) === String(value))?.label || '— Vælg sag —';

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', borderColor: open ? '#7c3aed' : '#e2e8f0', boxShadow: open ? '0 0 0 3px rgba(124, 58, 237, 0.12)' : 'none' }}
            >
                <span style={{ color: value ? '#0f172a' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
                <ChevronDown size={18} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.18)', zIndex: 60, overflow: 'hidden', padding: '6px', maxHeight: '240px', overflowY: 'auto' }}
                    >
                        {options.length === 0 && (
                            <div style={{ padding: '10px 14px', fontSize: '0.88rem', color: '#94a3b8' }}>Ingen aktive sager</div>
                        )}
                        {options.map(o => {
                            const selected = String(o.id) === String(value);
                            const isHover = hovered === o.id;
                            return (
                                <div
                                    key={o.id}
                                    onClick={() => { onChange(o.id); setOpen(false); }}
                                    onMouseEnter={() => setHovered(o.id)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: selected ? 600 : 500, color: selected ? '#6d28d9' : '#334155', background: selected ? '#f5f3ff' : (isHover ? '#f8fafc' : 'transparent'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', transition: 'background 0.12s' }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                                    {selected && <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>✓</span>}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MANAGER — fast administrationssektion (under Team)
// ---------------------------------------------------------------------------
export function SubcontractorManager({ profile, isMobile = false, leadsData = [] }) {
    const companyId = profile.company_id || profile.id;
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    // Bekræftede sager til gæste-login-vælgeren — genbruger den allerede indlæste
    // leadsData (samme kilde som resten af appen), så listen altid er korrekt.
    const activeLeads = (leadsData || []).filter(l => ['Bekræftet opgave', 'Sæt i bero'].includes(l.status));

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
            <div className="card-header" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? '14px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', flexShrink: 0 }}>
                        <Building2 size={24} />
                    </div>
                    <h3 style={{ whiteSpace: 'nowrap' }}>Underleverandører ({list.length})</h3>
                </div>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '16px' : '10px 16px', width: isMobile ? '100%' : 'auto', borderRadius: isMobile ? '14px' : '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 700, fontSize: isMobile ? '1rem' : '0.88rem', whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 6px 14px rgba(124, 58, 237, 0.22)', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Plus size={18} /> Tilføj underleverandør
                </button>
            </div>

            <div className="card-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px' }}>
                    {isMobile ? 'Eksterne partnere uden login.' : 'Eksterne partnere (elektriker, VVS, m.m.) uden login. Gemte underleverandører kan tilføjes direkte til en sag under "Holdet på sagen".'}
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

                                {(() => { const fullAddr = [sc.address, [sc.zip, sc.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); return (
                                (sc.contact_name || sc.contact_phone || sc.contact_email || fullAddr) && (
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
                                        {fullAddr && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} /> {fullAddr}
                                            </div>
                                        )}
                                    </div>
                                )); })()}
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
                selectableLeads={activeLeads}
                invitedByCompanyId={companyId}
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


export function BeautifulPhoneInput({ value, onChange, placeholder }) {
    const [focused, setFocused] = useState(false);
    return (
        <div 
            style={{
                display: 'flex',
                alignItems: 'center',
                border: focused ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '12px',
                background: '#ffffff',
                boxShadow: focused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                transition: 'all 0.2s',
                overflow: 'hidden'
            }}
        >
            <div style={{ padding: '0 12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', height: '100%' }}>
                <Phone size={14} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>+45</span>
            </div>
            <input
                value={value}
                onChange={(e) => {
                    // Formatér som dansk nummer: 8 cifre i par (12 34 56 78).
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    onChange(digits.match(/.{1,2}/g)?.join(' ') || '');
                }}
                inputMode="numeric"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder || '12 34 56 78'} 
                style={{
                    flex: 1,
                    border: 'none',
                    padding: '12px 14px',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%'
                }} 
            />
        </div>
    );
}

function CustomRoleSelect({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: '#ffffff',
                    border: isOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: value === 'Svend' ? '#10b981' : '#3b82f6' }} />
                    <span style={{ fontWeight: 600, color: '#334155' }}>{value}</span>
                </div>
                <ChevronDown size={16} style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            background: '#1e293b',
                            borderRadius: '12px',
                            padding: '6px',
                            zIndex: 50,
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #334155'
                        }}
                    >
                        {['Svend', 'Lærling'].map(role => (
                            <div
                                key={role}
                                onClick={() => { onChange(role); setIsOpen(false); }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    color: value === role ? '#ffffff' : '#cbd5e1',
                                    background: value === role ? '#3b82f6' : 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: value === role ? 600 : 500,
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { if (value !== role) e.currentTarget.style.background = '#334155'; }}
                                onMouseLeave={(e) => { if (value !== role) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {value === role && <CheckCircle size={14} />}
                                {role}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
