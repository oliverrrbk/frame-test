// ============================================================================
// CustomerPicker.jsx — søgbar kundevælger i Bison Frame-stil.
// Erstatter en native <select> når man skal vælge en eksisterende kunde fra
// kunde-biblioteket (fx i Hurtigt tilbud). Åbner via portal (klippes aldrig i
// en modal), glas-look, flueben på den valgte, live-søgning i navn/telefon/mail.
//
// Brug:
//   <CustomerPicker
//      customers={customers}          // [{ id, name, phone, email, ... }]
//      value={customerId}             // valgt id (eller null)
//      onSelect={(c) => ...}          // hele kunde-objektet
//      onClear={() => ...}            // ryd valg (valgfrit)
//      onCreateNew={() => ...}        // "+ Ny kunde" i bunden (valgfrit)
//   />
// ============================================================================
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, User, Building2, Plus, X } from 'lucide-react';

export default function CustomerPicker({ customers = [], value = null, onSelect, onClear = null, onCreateNew = null, placeholder = 'Vælg kunde fra biblioteket…', disabled = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const btnRef = useRef(null);
    const popRef = useRef(null);
    const inputRef = useRef(null);
    const [pos, setPos] = useState(null);
    const selected = customers.find(c => c.id === value) || null;

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = btnRef.current?.getBoundingClientRect();
            if (!r) return;
            const vh = window.innerHeight;
            const listH = 360;
            const openUp = r.bottom + listH + 10 > vh && r.top - listH - 10 > 0;
            setPos({
                left: Math.round(r.left),
                width: Math.round(r.width),
                top: openUp ? Math.round(r.top - 6) : Math.round(r.bottom + 6),
                openUp,
                maxH: Math.max(220, Math.min(listH, openUp ? r.top - 16 : vh - r.bottom - 16)),
            });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        // Fokus søgefeltet når den åbner
        const t = setTimeout(() => inputRef.current?.focus(), 30);
        const onDoc = (e) => {
            if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc, true);
        document.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const q = query.trim().toLowerCase();
    const filtered = q
        ? customers.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q))
        : customers;

    return (
        <>
            <button
                type="button"
                ref={btnRef}
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                style={{
                    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '14px 16px', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
                    border: `1px solid ${open ? '#3b82f6' : '#cbd5e1'}`,
                    boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                    background: '#fff', color: selected ? '#0f172a' : '#94a3b8',
                    fontSize: '1rem', fontWeight: 500, textAlign: 'left', transition: 'border-color .15s, box-shadow .15s',
                    fontFamily: 'inherit',
                }}
            >
                {selected ? (selected.customer_type === 'erhverv' ? <Building2 size={18} color="#3b82f6" /> : <User size={18} color="#3b82f6" />) : <Search size={18} color="#94a3b8" />}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.name : placeholder}
                </span>
                {selected && onClear && (
                    <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        style={{ display: 'inline-flex', padding: '2px', borderRadius: '6px', color: '#94a3b8' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                        <X size={16} />
                    </span>
                )}
                <ChevronDown size={18} color="#64748b" style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && pos && createPortal(
                <div
                    ref={popRef}
                    style={{
                        position: 'fixed', left: pos.left, width: pos.width, zIndex: 1000060,
                        ...(pos.openUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                        maxHeight: pos.maxH, display: 'flex', flexDirection: 'column',
                        background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px',
                        boxShadow: '0 18px 44px rgba(15,23,42,.22)', padding: '6px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                        animation: 'frameSelectIn .15s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    <div style={{ position: 'relative', padding: '2px 2px 6px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Søg navn, telefon, mail…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '.92rem', outline: 'none', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filtered.length === 0 && (
                            <div style={{ padding: '14px', color: '#94a3b8', fontSize: '.9rem', textAlign: 'center' }}>
                                {customers.length === 0 ? 'Ingen kunder endnu' : 'Ingen match'}
                            </div>
                        )}
                        {filtered.map(c => {
                            const active = c.id === value;
                            const sub = [c.phone, c.city].filter(Boolean).join(' · ');
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => { onSelect && onSelect(c); setOpen(false); setQuery(''); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: active ? '#eff6ff' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {c.customer_type === 'erhverv'
                                        ? <Building2 size={16} style={{ flexShrink: 0, color: active ? '#1d4ed8' : '#64748b' }} />
                                        : <User size={16} style={{ flexShrink: 0, color: active ? '#1d4ed8' : '#64748b' }} />}
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? '#1d4ed8' : '#334155', fontWeight: active ? 700 : 600, fontSize: '.95rem' }}>{c.name}</span>
                                        {sub && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '.8rem' }}>{sub}</span>}
                                    </span>
                                    {active && <Check size={16} style={{ flexShrink: 0, color: '#1d4ed8' }} />}
                                </button>
                            );
                        })}
                    </div>

                    {onCreateNew && (
                        <button
                            type="button"
                            onClick={() => { onCreateNew(); setOpen(false); setQuery(''); }}
                            style={{ marginTop: '4px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 12px', borderRadius: '10px', border: 'none', borderTop: '1px solid #f1f5f9', cursor: 'pointer', background: 'transparent', color: '#3b82f6', fontWeight: 700, fontSize: '.92rem', fontFamily: 'inherit' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Plus size={16} /> Opret ny kunde
                        </button>
                    )}
                    <style>{`@keyframes frameSelectIn { from { opacity:0; transform: translateY(-6px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
                </div>,
                document.body
            )}
        </>
    );
}
