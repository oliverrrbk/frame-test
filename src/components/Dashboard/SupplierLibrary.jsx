// ============================================================================
// SupplierLibrary.jsx — Leverandør-bibliotek ("Leverandører"-fanen under Kunder).
// Ét leverandørkort pr. firma (fx Davidsen, Stark). Søg, opret/ret, slet — og
// genvælg leverandøren i materialeliste-flowet via SupplierPicker.
// Bison Frame-stil: glas, hover-lift, portaleret modal, monogram-avatar, FileDropzone.
// Data: suppliers-tabellen, firma-scopet på carpenter_id (RLS spejler customers).
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { cacheGet, cacheSet } from '../../utils/dataCache';
import FileDropzone from '../ui/FileDropzone';
import { Search, Plus, Truck, Phone, Mail, MapPin, User, Pencil, Trash2, X, Loader2 } from 'lucide-react';

const norm = (s) => (s || '').trim().toLowerCase();

// Monogram-farve: stabil pastel-gradient hashet fra navnet (som kundekortene).
const MONOGRAM_PALETTE = [
    ['#eff6ff', '#dbeafe', '#2563eb'], ['#eef2ff', '#e0e7ff', '#4f46e5'],
    ['#f0fdfa', '#ccfbf1', '#0d9488'], ['#fef3c7', '#fde68a', '#b45309'],
    ['#fce7f3', '#fbcfe8', '#be185d'], ['#f0fdf4', '#dcfce7', '#16a34a'],
    ['#fef2f2', '#fee2e2', '#dc2626'], ['#f5f3ff', '#ede9fe', '#7c3aed'],
];
const monogramFor = (name) => {
    const s = (name || '?').trim();
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const [c1, c2, fg] = MONOGRAM_PALETTE[h % MONOGRAM_PALETTE.length];
    const initials = s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    return { bg: `linear-gradient(135deg, ${c1}, ${c2})`, fg, initials };
};

function SupplierAvatar({ supplier: s, size = 44, radius = 13 }) {
    const mono = monogramFor(s?.name);
    if (s?.logo_url) {
        return (
            <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', background: '#fff', border: '1px solid #eef2f7' }}>
                <img src={s.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
        );
    }
    return (
        <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, background: mono.bg, color: mono.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.36, border: '1px solid rgba(0,0,0,0.03)' }}>
            {mono.initials}
        </div>
    );
}

export default function SupplierLibrary({ carpenter, isMobile = false }) {
    const companyId = carpenter?.id;
    const [suppliers, setSuppliers] = useState(() => cacheGet(`bf:suppliers:${companyId}`) || []);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null); // supplier-objekt eller {} for ny

    const fetchSuppliers = useCallback(async () => {
        if (!companyId) return;
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('carpenter_id', companyId)
                .order('name', { ascending: true });
            if (error) throw error;
            setSuppliers(data || []);
            cacheSet(`bf:suppliers:${companyId}`, data || []);
        } catch (e) {
            console.error('Kunne ikke hente leverandører:', e);
            toast.error('Kunne ikke hente leverandører');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const filtered = useMemo(() => {
        const q = norm(search);
        if (!q) return suppliers;
        return suppliers.filter(s =>
            norm(s.name).includes(q) || norm(s.contact_name).includes(q) ||
            norm(s.email).includes(q) || norm(s.phone).includes(q) || norm(s.city).includes(q));
    }, [suppliers, search]);

    const handleDelete = async (s) => {
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', s.id);
            if (error) throw error;
            toast.success('Leverandør slettet');
            setEditing(null);
            fetchSuppliers();
        } catch (e) {
            toast.error('Kunne ikke slette: ' + (e.message || e));
        }
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
            {/* Handlinger */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '420px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Søg leverandør, kontakt, mail…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px 13px 42px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: isMobile ? '16px' : '0.95rem', outline: 'none', background: '#fff' }}
                        onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                </div>
                <button
                    onClick={() => setEditing({})}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37,99,235,0.25)', transition: 'transform 0.15s, box-shadow 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(37,99,235,0.32)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.25)'; }}
                >
                    <Plus size={18} /> Opret leverandør
                </button>
            </div>

            {loading && suppliers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Loader2 size={26} className="spin" style={{ margin: '0 auto 10px' }} /> Henter leverandører…
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '16px', background: '#fff' }}>
                    <Truck size={30} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        {suppliers.length === 0 ? 'Ingen leverandører endnu' : 'Ingen match'}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>Opret fx Davidsen eller Stark — så kan du vælge dem igen, når du sender en materialeliste.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {filtered.map(s => (
                        <div
                            key={s.id}
                            onClick={() => setEditing(s)}
                            style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.2s, border-color 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(15,23,42,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <SupplierAvatar supplier={s} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.02rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                    {s.contact_name && <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><User size={13} /> {s.contact_name}</div>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.85rem', color: '#475569' }}>
                                {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail size={13} color="#94a3b8" /> {s.email}</div>}
                                {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} color="#94a3b8" /> {s.phone}</div>}
                                {(s.city || s.address) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MapPin size={13} color="#94a3b8" /> {[s.address, s.city].filter(Boolean).join(', ')}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <SupplierFormModal
                    supplier={editing.id ? editing : null}
                    carpenter={carpenter}
                    isMobile={isMobile}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); fetchSuppliers(); }}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

function SupplierFormModal({ supplier, carpenter, isMobile, onClose, onSaved, onDelete }) {
    const companyId = carpenter?.id;
    const [form, setForm] = useState({
        name: supplier?.name || '', contact_name: supplier?.contact_name || '',
        email: supplier?.email || '', phone: supplier?.phone || '',
        address: supplier?.address || '', zip: supplier?.zip || '', city: supplier?.city || '',
        notes: supplier?.notes || '', logo_url: supplier?.logo_url || '',
    });
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // DAWA zip→by autofyld (samme som kundekortene).
    const onZip = async (zip) => {
        set('zip', zip);
        if (/^\d{4}$/.test(zip)) {
            try {
                const r = await fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`);
                if (r.ok) { const d = await r.json(); if (d?.navn) set('city', d.navn); }
            } catch { /* offline — ignorér */ }
        }
    };

    const uploadLogo = async (file) => {
        if (!file) return;
        setUploadingLogo(true);
        try {
            const ext = (file.name.split('.').pop() || 'png').toLowerCase();
            const fn = `supplier_${companyId}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('avatars').upload(fn, file, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fn);
            set('logo_url', publicUrl);
            toast.success('Logo uploadet');
        } catch (e) {
            toast.error('Logo-upload fejlede: ' + (e.message || e));
        } finally {
            setUploadingLogo(false);
        }
    };

    const save = async () => {
        if (!form.name.trim()) { toast.error('Skriv leverandørens navn'); return; }
        setSaving(true);
        try {
            const payload = {
                carpenter_id: companyId,
                name: form.name.trim(), contact_name: form.contact_name.trim() || null,
                email: form.email.trim() || null, phone: form.phone.trim() || null,
                address: form.address.trim() || null, zip: form.zip.trim() || null, city: form.city.trim() || null,
                notes: form.notes.trim() || null, logo_url: form.logo_url || null,
            };
            let error;
            if (supplier?.id) {
                ({ error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id));
            } else {
                ({ error } = await supabase.from('suppliers').insert([{ ...payload, created_by: carpenter?.id || null }]));
            }
            if (error) throw error;
            toast.success(supplier?.id ? 'Leverandør opdateret' : 'Leverandør oprettet');
            onSaved();
        } catch (e) {
            toast.error('Kunne ikke gemme: ' + (e.message || e));
        } finally {
            setSaving(false);
        }
    };

    const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: isMobile ? '16px' : '0.95rem', outline: 'none' };
    const lbl = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' };

    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px', animation: 'fadeIn 0.2s ease-out' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: '540px', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto', borderRadius: isMobile ? '24px 24px 0 0' : '24px', boxShadow: '0 24px 60px -12px rgba(15,23,42,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '24px 24px 0' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Truck size={23} color="#2563eb" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{supplier?.id ? 'Ret leverandør' : 'Ny leverandør'}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Gemmes så du kan vælge den igen</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}><X size={18} /></button>
                </div>

                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <SupplierAvatar supplier={form} size={56} radius={16} />
                        <div style={{ flex: 1 }}>
                            <FileDropzone
                                accept="image/*"
                                disabled={uploadingLogo}
                                onFiles={(files) => uploadLogo(files[0])}
                                selectedName={form.logo_url ? 'Logo valgt — klik for at skifte' : null}
                                title={uploadingLogo ? 'Uploader…' : 'Træk logo hertil eller klik'}
                                hint="Valgfrit"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={lbl}>Firmanavn</label>
                        <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="F.eks. Davidsen" style={field}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={lbl}>Kontaktperson</label>
                            <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="F.eks. Kenneth" style={field}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                        <div>
                            <label style={lbl}>Telefon</label>
                            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Telefonnummer" style={field}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                    </div>
                    <div>
                        <label style={lbl}>E-mail</label>
                        <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="salg@davidsen.dk" style={field}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                    </div>
                    <div>
                        <label style={lbl}>Adresse</label>
                        <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Vej og nr." style={field}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
                        <div>
                            <label style={lbl}>Postnr.</label>
                            <input inputMode="numeric" value={form.zip} onChange={(e) => onZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="0000" style={field}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                        <div>
                            <label style={lbl}>By</label>
                            <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="By" style={field}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                        </div>
                    </div>
                    <div>
                        <label style={lbl}>Noter</label>
                        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Fx kontonr., leveringsaftaler…" style={{ ...field, resize: 'vertical', fontFamily: 'inherit' }}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center' }}>
                        {supplier?.id && (
                            confirmDelete ? (
                                <button onClick={() => onDelete(supplier)} style={{ padding: '13px 16px', borderRadius: '12px', border: 'none', background: '#e11d48', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Bekræft slet?</button>
                            ) : (
                                <button onClick={() => setConfirmDelete(true)} title="Slet leverandør" style={{ padding: '13px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fff', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={18} /></button>
                            )
                        )}
                        <button onClick={onClose} disabled={saving} style={{ flex: '0 0 auto', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annullér</button>
                        <button onClick={save} disabled={saving || !form.name.trim()}
                            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: form.name.trim() ? '#0f172a' : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: form.name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {saving ? <Loader2 size={18} className="spin" /> : <Pencil size={18} />} {supplier?.id ? 'Gem ændringer' : 'Opret leverandør'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
