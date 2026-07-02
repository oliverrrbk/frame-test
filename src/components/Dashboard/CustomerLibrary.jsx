// ============================================================================
// CustomerLibrary.jsx — Kunde-bibliotek ("Kunder"-fanen).
// Ét rigtigt kundekort pr. firma. Søg i alle kunder, se pr. kunde alt hvad du
// har lavet (tilbud + sager + hvad der er faktureret), og klik dig direkte ind
// på den enkelte sag igen. Alt er connected via leads.customer_id.
//
// To blå handlinger i toppen: "Opret kunde" (rigtigt kundekort) og "Lav tilbud".
// Bison Frame-stil hele vejen: glas, hover-lift, portalerede modaler, FrameSelect.
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import {
    Search, Plus, User, Building2, Phone, Mail, MapPin, FileText, Briefcase,
    Wallet, Pencil, Trash2, X, ChevronRight, Users as UsersIcon, Sparkles
} from 'lucide-react';

// Status-grupper (spejler klientens pipeline)
const QUOTE_STATUSES = ['Tilbudskladder', 'Intern Kladde', 'Sendt Kladde', 'Ny forespørgsel', 'Sendt tilbud', 'Overslag (Afventer)'];
const CASE_STATUSES = ['Bekræftet opgave', 'Sæt i bero', 'Historik', 'Afbrudt Sag'];

const fmtKr = (n) => new Intl.NumberFormat('da-DK').format(Math.round(Number(n) || 0));

// Hvad blev der reelt tjent på et lead? Faktureret beløb (ekskl. moms) hvis det
// findes, ellers den endeligt aftalte pris.
const leadRevenue = (l) => {
    const inv = Number(l?.raw_data?.invoiced_amount) || 0;
    if (inv > 0) return inv;
    const aqp = l?.raw_data?.actual_quote_price;
    if (aqp) return typeof aqp === 'number' ? aqp : (parseInt(String(aqp).replace(/[^0-9]/g, '')) || 0);
    return 0;
};

const norm = (s) => (s || '').trim().toLowerCase();

export default function CustomerLibrary({ carpenter, myProfile, leadsData = [], isMobile = false, onOpenCase, onOpenLead, onCreateQuote, onCreateQuoteForCustomer }) {
    const companyId = carpenter?.id;
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);   // 'new' | customer-object | null
    const [detail, setDetail] = useState(null);      // customer-object | null

    const fetchCustomers = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('carpenter_id', companyId)
            .order('name', { ascending: true });
        if (error) {
            console.error('Kunne ikke hente kunder:', error);
            toast.error('Kunne ikke hente kunder.');
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    }, [companyId]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    // Alle leads knyttet til en kunde: primært customer_id, fallback navn+telefon/mail
    // (så gamle leads uden kobling stadig vises).
    const leadsFor = useCallback((c) => {
        if (!c) return [];
        const byId = leadsData.filter(l => l.customer_id && l.customer_id === c.id);
        if (byId.length) return byId;
        const nameKey = norm(c.name);
        const contactKey = norm(c.phone) || norm(c.email);
        return leadsData.filter(l => {
            if (l.customer_id) return false; // allerede koblet til en anden kunde
            if (norm(l.customer_name) !== nameKey) return false;
            if (!contactKey) return true;
            return norm(l.customer_phone) === contactKey || norm(l.customer_email) === contactKey;
        });
    }, [leadsData]);

    // Statistik pr. kunde (memoiseret for hele listen)
    const statsById = useMemo(() => {
        const map = {};
        customers.forEach(c => {
            const leads = leadsFor(c);
            const cases = leads.filter(l => CASE_STATUSES.includes(l.status));
            const quotes = leads.filter(l => QUOTE_STATUSES.includes(l.status || 'Ny forespørgsel'));
            const revenue = leads.reduce((s, l) => s + leadRevenue(l), 0);
            const lastActivity = leads.reduce((t, l) => {
                const d = new Date(l.updated_at || l.created_at || 0).getTime();
                return d > t ? d : t;
            }, 0);
            map[c.id] = { total: leads.length, cases: cases.length, quotes: quotes.length, revenue, lastActivity };
        });
        return map;
    }, [customers, leadsFor]);

    const filtered = useMemo(() => {
        const q = norm(search);
        const list = q
            ? customers.filter(c =>
                norm(c.name).includes(q) ||
                norm(c.phone).includes(q) ||
                norm(c.email).includes(q) ||
                norm(c.address).includes(q) ||
                norm(c.city).includes(q) ||
                norm(c.cvr).includes(q))
            : customers;
        // Sortér: seneste aktivitet først, derefter navn
        return [...list].sort((a, b) => {
            const la = statsById[a.id]?.lastActivity || 0;
            const lb = statsById[b.id]?.lastActivity || 0;
            if (lb !== la) return lb - la;
            return (a.name || '').localeCompare(b.name || '', 'da');
        });
    }, [customers, search, statsById]);

    const handleSaved = (saved) => {
        setCustomers(prev => {
            const exists = prev.some(c => c.id === saved.id);
            return exists ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved];
        });
        setEditing(null);
        // Hvis vi redigerede fra detalje-visningen, opdatér den
        setDetail(d => (d && d.id === saved.id) ? saved : d);
    };

    const handleDeleted = (id) => {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setDetail(d => (d && d.id === id) ? null : d);
    };

    const blueBtn = {
        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px',
        borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
        boxShadow: '0 4px 14px rgba(37,99,235,0.32)', transition: 'transform .18s, box-shadow .18s',
    };
    const onBlueHover = (e, on) => {
        e.currentTarget.style.transform = on ? 'translateY(-2px)' : 'none';
        e.currentTarget.style.boxShadow = on ? '0 8px 22px rgba(37,99,235,0.42)' : '0 4px 14px rgba(37,99,235,0.32)';
    };

    return (
        <div className="dashboard-workspace space-y-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: isMobile ? '20px' : '28px' }}>
                {/* Titel + handlinger */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            <UsersIcon size={24} color="#3b82f6" /> Kunder
                        </h2>
                        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.92rem' }}>
                            Dit kunde-bibliotek — alt hvad du har lavet, samlet ét sted.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button style={{ ...blueBtn, background: '#fff', color: '#2563eb', border: '1.5px solid #bfdbfe', boxShadow: 'none' }}
                            onClick={() => setEditing('new')}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; }}
                        >
                            <Plus size={18} /> Opret kunde
                        </button>
                        <button style={blueBtn} onClick={() => onCreateQuote && onCreateQuote()}
                            onMouseEnter={(e) => onBlueHover(e, true)} onMouseLeave={(e) => onBlueHover(e, false)}
                        >
                            <FileText size={18} /> Lav tilbud
                        </button>
                    </div>
                </div>

                {/* Søgning */}
                <div style={{ position: 'relative', maxWidth: '460px', marginBottom: '22px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Søg på navn, telefon, mail, adresse, CVR…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', background: '#fff' }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>

                {/* Indhold */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Henter kunder…</div>
                ) : customers.length === 0 ? (
                    <EmptyState onCreate={() => setEditing('new')} />
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Ingen kunder matcher "{search}".</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {filtered.map(c => (
                            <CustomerCard key={c.id} customer={c} stats={statsById[c.id]} onClick={() => setDetail(c)} />
                        ))}
                    </div>
                )}
            </div>

            {editing && createPortal(
                <CustomerFormModal
                    customer={editing === 'new' ? null : editing}
                    companyId={companyId}
                    createdBy={myProfile?.id}
                    isMobile={isMobile}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />,
                document.body
            )}

            {detail && createPortal(
                <CustomerDetailModal
                    customer={detail}
                    leads={leadsFor(detail)}
                    stats={statsById[detail.id]}
                    isMobile={isMobile}
                    onClose={() => setDetail(null)}
                    onEdit={() => setEditing(detail)}
                    onDeleted={handleDeleted}
                    onOpenCase={onOpenCase}
                    onOpenLead={onOpenLead}
                    onCreateQuoteForCustomer={onCreateQuoteForCustomer}
                />,
                document.body
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tom-tilstand
// ---------------------------------------------------------------------------
function EmptyState({ onCreate }) {
    return (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', margin: '0 auto 18px', borderRadius: '20px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={34} color="#3b82f6" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Ingen kunder endnu</h3>
            <p style={{ margin: '0 auto 20px', maxWidth: '380px', color: '#64748b', fontSize: '0.92rem' }}>
                Opret dine kunder her, så kan du genbruge dem hver gang du laver et nyt tilbud — uden at skrive alt ind igen.
            </p>
            <button
                onClick={onCreate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 4px 14px rgba(37,99,235,0.32)' }}
            >
                <Plus size={18} /> Opret din første kunde
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Kort i grid
// ---------------------------------------------------------------------------
function CustomerCard({ customer: c, stats, onClick }) {
    const isBiz = c.customer_type === 'erhverv';
    return (
        <div
            onClick={onClick}
            style={{
                background: '#fff', border: '1px solid #eef2f7', borderRadius: '18px', padding: '18px',
                cursor: 'pointer', transition: 'transform .28s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow .28s, border-color .28s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 38px rgba(15,23,42,0.10)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#eef2f7'; }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isBiz ? 'linear-gradient(135deg,#eef2ff,#e0e7ff)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
                    {isBiz ? <Building2 size={22} color="#4f46e5" /> : <User size={22} color="#2563eb" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{isBiz ? 'Erhvervskunde' : 'Privatkunde'}</div>
                </div>
                <ChevronRight size={18} color="#cbd5e1" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                {c.phone && <Line icon={<Phone size={13} />} text={c.phone} />}
                {c.city && <Line icon={<MapPin size={13} />} text={[c.address, c.city].filter(Boolean).join(', ')} />}
                {!c.phone && !c.city && c.email && <Line icon={<Mail size={13} />} text={c.email} />}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <Pill icon={<Briefcase size={12} />} label={`${stats?.cases || 0} sager`} />
                <Pill icon={<FileText size={12} />} label={`${stats?.quotes || 0} tilbud`} />
                {stats?.revenue > 0 && <Pill icon={<Wallet size={12} />} label={`${fmtKr(stats.revenue)} kr`} accent />}
            </div>
        </div>
    );
}

function Line({ icon, text }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem', overflow: 'hidden' }}>
            <span style={{ color: '#94a3b8', flexShrink: 0, display: 'inline-flex' }}>{icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        </div>
    );
}

function Pill({ icon, label, accent }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, background: accent ? '#ecfdf5' : '#f1f5f9', color: accent ? '#059669' : '#475569' }}>
            {icon} {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Opret / rediger kunde
// ---------------------------------------------------------------------------
function CustomerFormModal({ customer, companyId, createdBy, isMobile, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: customer?.name || '',
        customer_type: customer?.customer_type === 'erhverv' ? 'erhverv' : 'privat',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        zip: customer?.zip || '',
        city: customer?.city || '',
        cvr: customer?.cvr || '',
        notes: customer?.notes || '',
    });
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Auto-udfyld by fra postnr (DAWA) — samme oplevelse som i tilbud
    useEffect(() => {
        const zip = (form.zip || '').trim();
        if (zip.length !== 4) return;
        let cancelled = false;
        fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!cancelled && d && d.navn) setForm(f => (f.zip === zip ? { ...f, city: d.navn } : f)); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [form.zip]);

    const save = async () => {
        if (!form.name.trim()) { toast.error('Kunden skal have et navn.'); return; }
        setBusy(true);
        const payload = {
            carpenter_id: companyId,
            name: form.name.trim(),
            customer_type: form.customer_type,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            zip: form.zip.trim() || null,
            city: form.city.trim() || null,
            cvr: form.customer_type === 'erhverv' ? (form.cvr.trim() || null) : null,
            notes: form.notes.trim() || null,
        };
        try {
            let data, error;
            if (customer?.id) {
                ({ data, error } = await supabase.from('customers').update(payload).eq('id', customer.id).select().single());
            } else {
                ({ data, error } = await supabase.from('customers').insert([{ ...payload, created_by: createdBy || null }]).select().single());
            }
            if (error) throw error;
            toast.success(customer?.id ? 'Kunde opdateret.' : 'Kunde oprettet.');
            onSaved(data);
        } catch (e) {
            console.error('Kunne ikke gemme kunde:', e);
            toast.error('Kunne ikke gemme kunden. Prøv igen.');
        } finally {
            setBusy(false);
        }
    };

    const label = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' };
    const input = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', background: '#fff' };
    const focusable = {
        onFocus: (e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; },
        onBlur: (e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; },
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: isMobile ? '0' : '24px', width: '100%', maxWidth: '560px', maxHeight: isMobile ? '100dvh' : '92vh', height: isMobile ? '100dvh' : 'auto', overflowY: 'auto', boxShadow: '0 30px 80px rgba(15,23,42,0.3)' }}
            >
                <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{customer?.id ? 'Rediger kunde' : 'Opret kunde'}</h3>
                    <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><X size={18} /></button>
                </div>

                <div style={{ padding: '22px 24px' }}>
                    {/* Type-toggle */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                        {[['privat', 'Privat', User], ['erhverv', 'Erhverv', Building2]].map(([val, txt, Icon]) => {
                            const active = form.customer_type === val;
                            return (
                                <button key={val} onClick={() => set('customer_type', val)}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '13px', cursor: 'pointer', fontWeight: 700, fontSize: '0.92rem', transition: 'all .18s', border: `1.5px solid ${active ? '#3b82f6' : '#e2e8f0'}`, background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#64748b' }}>
                                    <Icon size={17} /> {txt}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={label}>{form.customer_type === 'erhverv' ? 'Virksomhedsnavn' : 'Navn'} *</label>
                        <input style={input} {...focusable} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={form.customer_type === 'erhverv' ? 'Fx Byg & Bo ApS' : 'Fx Anders Andersen'} />
                    </div>

                    {form.customer_type === 'erhverv' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={label}>CVR</label>
                            <input style={input} {...focusable} value={form.cvr} onChange={(e) => set('cvr', e.target.value)} placeholder="12345678" />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={label}>Telefon</label>
                            <input style={input} {...focusable} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="12 34 56 78" />
                        </div>
                        <div>
                            <label style={label}>E-mail</label>
                            <input style={input} {...focusable} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="navn@mail.dk" />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={label}>Adresse</label>
                        <input style={input} {...focusable} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Vej og nummer" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={label}>Postnr.</label>
                            <input style={input} {...focusable} value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="0000" maxLength={4} />
                        </div>
                        <div>
                            <label style={label}>By</label>
                            <input style={input} {...focusable} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="By" />
                        </div>
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                        <label style={label}>Noter (kun internt)</label>
                        <textarea style={{ ...input, minHeight: '72px', resize: 'vertical' }} {...focusable} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Fx foretrukken kontakt, aftaler, adgangsforhold…" />
                    </div>
                </div>

                <div style={{ position: 'sticky', bottom: 0, background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '13px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Annullér</button>
                    <button onClick={save} disabled={busy}
                        style={{ padding: '12px 24px', borderRadius: '13px', border: 'none', cursor: busy ? 'wait' : 'pointer', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', boxShadow: '0 4px 14px rgba(37,99,235,0.32)', opacity: busy ? 0.7 : 1 }}>
                        {busy ? 'Gemmer…' : (customer?.id ? 'Gem ændringer' : 'Opret kunde')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Kunde-detalje — overblik + tilbud + sager + klik-gennem
// ---------------------------------------------------------------------------
function CustomerDetailModal({ customer: c, leads, stats, isMobile, onClose, onEdit, onDeleted, onOpenCase, onOpenLead, onCreateQuoteForCustomer }) {
    const [tab, setTab] = useState('overblik');
    const [confirmDel, setConfirmDel] = useState(false);
    const [busyDel, setBusyDel] = useState(false);
    const isBiz = c.customer_type === 'erhverv';

    const cases = leads.filter(l => CASE_STATUSES.includes(l.status));
    const quotes = leads.filter(l => QUOTE_STATUSES.includes(l.status || 'Ny forespørgsel'));

    const del = async () => {
        if (busyDel) return;
        setBusyDel(true);
        try {
            const { error } = await supabase.from('customers').delete().eq('id', c.id);
            if (error) throw error;
            toast.success('Kunde slettet. (Sager og tilbud bevares.)');
            setConfirmDel(false);
            onDeleted(c.id);
        } catch (e) {
            console.error('Kunne ikke slette kunde:', e);
            toast.error('Kunne ikke slette kunden.');
            setBusyDel(false);
        }
    };

    const tabs = [
        { key: 'overblik', label: 'Overblik', icon: Sparkles },
        { key: 'sager', label: `Sager (${cases.length})`, icon: Briefcase },
        { key: 'tilbud', label: `Tilbud (${quotes.length})`, icon: FileText },
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000040, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#f8fafc', borderRadius: isMobile ? '0' : '24px', width: '100%', maxWidth: '680px', maxHeight: isMobile ? '100dvh' : '92vh', height: isMobile ? '100dvh' : 'auto', overflowY: 'auto', boxShadow: '0 30px 80px rgba(15,23,42,0.3)' }}
            >
                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: isMobile ? '20px' : '26px 28px', color: '#fff', borderRadius: isMobile ? '0' : '24px 24px 0 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '15px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)' }}>
                                {isBiz ? <Building2 size={26} color="#93c5fd" /> : <User size={26} color="#93c5fd" />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h3>
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                                    {isBiz ? 'Erhvervskunde' : 'Privatkunde'}{c.cvr ? ` · CVR ${c.cvr}` : ''}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><X size={18} /></button>
                    </div>

                    {/* Kontakt-chips */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                        {c.phone && <a href={`tel:${c.phone}`} style={chip}><Phone size={13} /> {c.phone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} style={chip}><Mail size={13} /> {c.email}</a>}
                        {(c.address || c.city) && <span style={chip}><MapPin size={13} /> {[c.address, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</span>}
                    </div>

                    {/* Handlinger */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                        <button onClick={() => { onCreateQuoteForCustomer && onCreateQuoteForCustomer(c); onClose(); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff' }}>
                            <FileText size={16} /> Lav tilbud til {c.name.split(' ')[0]}
                        </button>
                        <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
                            <Pencil size={15} /> Rediger
                        </button>
                        <button onClick={() => setConfirmDel(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>
                            <Trash2 size={15} /> Slet
                        </button>
                    </div>
                </div>

                {/* Faner */}
                <div style={{ display: 'flex', gap: '6px', padding: '14px 20px 0', background: '#f8fafc', position: 'sticky', top: isMobile ? '0' : undefined, borderBottom: '1px solid #e2e8f0' }}>
                    {tabs.map(t => {
                        const active = tab === t.key;
                        const Icon = t.icon;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 16px', border: 'none', borderBottom: `2.5px solid ${active ? '#2563eb' : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: active ? '#1d4ed8' : '#64748b' }}>
                                <Icon size={16} /> {t.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '20px' }}>
                    {tab === 'overblik' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                <Stat label="Sager" value={stats?.cases || 0} icon={<Briefcase size={16} color="#2563eb" />} />
                                <Stat label="Tilbud" value={stats?.quotes || 0} icon={<FileText size={16} color="#8b5cf6" />} />
                                <Stat label="Faktureret" value={`${fmtKr(stats?.revenue || 0)} kr`} icon={<Wallet size={16} color="#059669" />} accent />
                            </div>
                            {c.notes && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>Note</div>
                                    <div style={{ fontSize: '0.9rem', color: '#78350f', whiteSpace: 'pre-wrap' }}>{c.notes}</div>
                                </div>
                            )}
                            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>Seneste aktivitet</h4>
                            <LeadList leads={[...leads].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 6)} onOpenCase={onOpenCase} onOpenLead={onOpenLead} emptyText="Ingen tilbud eller sager på denne kunde endnu." />
                        </>
                    )}
                    {tab === 'sager' && <LeadList leads={cases} onOpenCase={onOpenCase} onOpenLead={onOpenLead} emptyText="Ingen sager på denne kunde endnu." />}
                    {tab === 'tilbud' && <LeadList leads={quotes} onOpenCase={onOpenCase} onOpenLead={onOpenLead} emptyText="Ingen tilbud på denne kunde endnu." />}
                </div>

            </motion.div>

            {confirmDel && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000090, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => !busyDel && setConfirmDel(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.18 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '24px', padding: '30px 28px', maxWidth: '420px', width: '100%', boxShadow: '0 30px 80px rgba(15,23,42,0.35)', textAlign: 'center' }}
                    >
                        <div style={{ width: '64px', height: '64px', margin: '0 auto 18px', borderRadius: '20px', background: 'linear-gradient(135deg,#fee2e2,#fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={30} color="#dc2626" />
                        </div>
                        <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Slet {c.name}?</h3>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5 }}>
                            Kundekortet fjernes fra dit bibliotek. Tilbud og sager bevares — de mister blot koblingen til kunden.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setConfirmDel(false)} disabled={busyDel}
                                style={{ flex: 1, padding: '13px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', cursor: busyDel ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.95rem', color: '#475569', transition: 'background .18s' }}
                                onMouseEnter={(e) => { if (!busyDel) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}>
                                Behold kunde
                            </button>
                            <button onClick={del} disabled={busyDel}
                                style={{ flex: 1, padding: '13px', borderRadius: '14px', border: 'none', cursor: busyDel ? 'wait' : 'pointer', fontWeight: 700, fontSize: '0.95rem', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', boxShadow: '0 4px 14px rgba(220,38,38,0.32)', opacity: busyDel ? 0.75 : 1, transition: 'transform .18s' }}
                                onMouseEnter={(e) => { if (!busyDel) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
                                {busyDel ? 'Sletter…' : 'Slet kunde'}
                            </button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}

const chip = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' };

function Stat({ label, value, icon, accent }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #eef2f7', borderRadius: '15px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>{icon}<span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8' }}>{label}</span></div>
            <div style={{ fontSize: accent ? '1.15rem' : '1.4rem', fontWeight: 800, color: accent ? '#059669' : '#0f172a' }}>{value}</div>
        </div>
    );
}

function LeadList({ leads, onOpenCase, onOpenLead, emptyText }) {
    if (!leads || leads.length === 0) {
        return <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>{emptyText}</div>;
    }
    const statusColor = (s) => ({
        'Bekræftet opgave': '#10b981', 'Sæt i bero': '#f97316', 'Historik': '#6b7280', 'Afbrudt Sag': '#ef4444',
        'Sendt tilbud': '#eab308', 'Ny forespørgsel': '#3b82f6', 'Tilbudskladder': '#8b5cf6',
    }[s] || '#94a3b8');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leads.map(l => {
                const isCase = CASE_STATUSES.includes(l.status);
                const rev = leadRevenue(l);
                const when = l.updated_at || l.created_at;
                return (
                    <button key={l.id}
                        onClick={() => { if (isCase) { onOpenCase && onOpenCase(l.id); } else { onOpenLead && onOpenLead(l); } }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', transition: 'transform .18s, box-shadow .18s, border-color .18s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(15,23,42,0.08)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#eef2f7'; }}
                    >
                        <div style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isCase ? '#ecfdf5' : '#eff6ff' }}>
                            {isCase ? <Briefcase size={18} color="#059669" /> : <FileText size={18} color="#2563eb" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.project_category || 'Opgave'}{l.case_number ? ` · #${l.case_number}` : ''}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', fontWeight: 700, color: statusColor(l.status) }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor(l.status) }} />{l.status || 'Ny forespørgsel'}
                                </span>
                                {when && <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>· {new Date(when).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {rev > 0 && <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>{fmtKr(rev)} kr</div>}
                            <ChevronRight size={16} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
