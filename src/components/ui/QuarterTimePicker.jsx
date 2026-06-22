import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// ============================================================================
// QuarterTimePicker — kvarter-baseret tidsvælger (timer + kvart).
// Lønnen køres per kvarter, så man kan KUN vælge 00 / 15 / 30 / 45 — aldrig
// frie minutter (ingen "07:59"). To ruller: time (00–23) og kvarter.
// Selvstændig komponent (ingen eksterne afhængigheder) så den kan genbruges
// alle steder hvor en tid registreres.
// ============================================================================

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const QUARTER_OPTIONS = ['00', '15', '30', '45'];

// Runder ethvert "HH:MM" (eller "HH.MM") til nærmeste kvarter, så gamle/skæve
// tider altid vises og gemmes som et lovligt kvarter.
export const snapToQuarter = (timeStr) => {
    if (!timeStr) return timeStr;
    const [h, m] = String(timeStr).replace('.', ':').split(':').map(Number);
    if (Number.isNaN(h)) return timeStr;
    let total = h * 60 + (Number.isNaN(m) ? 0 : m);
    total = Math.round(total / 15) * 15;
    if (total >= 24 * 60) total = 24 * 60 - 15; // hold inden for samme døgn
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};

const Roller = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div
                onClick={() => setIsOpen(o => !o)}
                style={{
                    padding: '12px 12px', borderRadius: '12px',
                    border: isOpen ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                    background: '#fff', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '1rem', fontWeight: '700', color: '#0f172a',
                    transition: 'all 0.15s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(59,130,246,0.1)' : 'none'
                }}
            >
                <span>{value}</span>
                <ChevronDown size={16} style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', zIndex: 100000,
                    maxHeight: '220px', overflowY: 'auto', padding: '6px 0'
                }}>
                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            style={{
                                padding: '10px 16px', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'center',
                                background: opt === value ? '#f1f5f9' : 'transparent',
                                color: opt === value ? '#3b82f6' : '#1e293b',
                                fontWeight: opt === value ? '700' : '500'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = opt === value ? '#f1f5f9' : '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = opt === value ? '#f1f5f9' : 'transparent'}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function QuarterTimePicker({ value, onChange }) {
    const safe = snapToQuarter(value || '07:00');
    const [h, m] = safe.split(':');
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Roller value={h} options={HOUR_OPTIONS} onChange={(nh) => onChange(`${nh}:${m}`)} />
            <span style={{ fontWeight: 900, color: '#94a3b8', fontSize: '1.1rem' }}>:</span>
            <Roller value={m} options={QUARTER_OPTIONS} onChange={(nm) => onChange(`${h}:${nm}`)} />
        </div>
    );
}
