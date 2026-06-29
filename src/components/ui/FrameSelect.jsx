// ============================================================================
// FrameSelect.jsx — Frame-lækker dropdown der erstatter en native <select>.
// Hvid, blød afrunding, flueben på den valgte, åbner via portal (så den ALDRIG
// klippes inde i en modal/scroll-container). Luk ved klik udenfor / scroll / Esc.
//
// Brug:
//   <FrameSelect value={v} onChange={setV} placeholder="-- Vælg --"
//      options={[{ value: 'a', label: 'Anders' }, ...]} />
// ============================================================================
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export default function FrameSelect({ value, onChange, options = [], placeholder = 'Vælg…', disabled = false, icon = null }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const popRef = useRef(null);
    const [pos, setPos] = useState(null);
    const selected = options.find(o => o.value === value);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = btnRef.current?.getBoundingClientRect();
            if (!r) return;
            const vh = window.innerHeight;
            const listH = Math.min(options.length * 46 + 10, 300);
            const openUp = r.bottom + listH + 10 > vh && r.top - listH - 10 > 0;
            setPos({
                left: Math.round(r.left),
                width: Math.round(r.width),
                top: openUp ? Math.round(r.top - 6) : Math.round(r.bottom + 6),
                openUp,
                maxH: Math.max(140, Math.min(listH, openUp ? r.top - 16 : vh - r.bottom - 16)),
            });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    }, [open, options.length]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => {
            if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc, true);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey); };
    }, [open]);

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
                {icon}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={18} color="#64748b" style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && pos && createPortal(
                <div
                    ref={popRef}
                    style={{
                        position: 'fixed', left: pos.left, width: pos.width, zIndex: 1000060,
                        ...(pos.openUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                        maxHeight: pos.maxH, overflowY: 'auto',
                        background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px',
                        boxShadow: '0 18px 44px rgba(15,23,42,.22)', padding: '6px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                        animation: 'frameSelectIn .15s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    {options.length === 0 && (
                        <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '.9rem' }}>Ingen valg</div>
                    )}
                    {options.map(o => {
                        const active = o.value === value;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                    padding: '11px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: active ? '#eff6ff' : 'transparent', color: active ? '#1d4ed8' : '#334155',
                                    fontSize: '.97rem', fontWeight: active ? 700 : 500, textAlign: 'left', fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                                {active && <Check size={17} style={{ flexShrink: 0 }} />}
                            </button>
                        );
                    })}
                    <style>{`@keyframes frameSelectIn { from { opacity:0; transform: translateY(-6px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
                </div>,
                document.body
            )}
        </>
    );
}
