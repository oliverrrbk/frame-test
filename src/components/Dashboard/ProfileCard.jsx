import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, Briefcase } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';

/*
 * Lille, lækkert profil-kort til "Holdet på sagen".
 * Viser KUN arbejdsrelaterede oplysninger (navn, rolle, telefon, email) —
 * adresse/private oplysninger vises bevidst ALDRIG her (privatliv).
 */
export default function ProfileCard({ open, onClose, person }) {
    const p = person || {};
    const name = p.name || 'Ukendt';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div key="profilecard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '340px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 30px 60px -15px rgba(15,23,42,0.3)', border: '1px solid #eef2f7', overflow: 'hidden', position: 'relative' }}>

                        {/* Luk */}
                        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.8)', border: '1px solid #eef2f7', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', zIndex: 2, transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.color = '#64748b'; }}>
                            <X size={16} />
                        </button>

                        {/* Top: avatar + navn + rolle */}
                        <div style={{ padding: '36px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(180deg, #faf9ff 0%, #ffffff 100%)' }}>
                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, boxShadow: '0 12px 24px rgba(124,58,237,0.3)', marginBottom: '16px' }}>
                                {initials}
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{name}</h3>
                            {p.role && (
                                <span style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '5px 14px', borderRadius: '999px' }}>
                                    <Briefcase size={13} /> {getRoleLabel(p.role)}
                                </span>
                            )}
                        </div>

                        {/* Kontakt */}
                        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {p.phone ? (
                                <a href={`tel:${p.phone}`} style={contactRow}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#ddd6fe'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#eef2f7'; }}>
                                    <span style={iconWrap}><Phone size={17} /></span>
                                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={contactLabel}>Telefon</span>
                                        <span style={contactValue}>{p.phone}</span>
                                    </span>
                                </a>
                            ) : null}
                            {p.email ? (
                                <a href={`mailto:${p.email}`} style={contactRow}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#ddd6fe'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#eef2f7'; }}>
                                    <span style={iconWrap}><Mail size={17} /></span>
                                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={contactLabel}>Email</span>
                                        <span style={{ ...contactValue, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</span>
                                    </span>
                                </a>
                            ) : null}
                            {!p.phone && !p.email && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
                                    Ingen kontaktoplysninger registreret.
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

const contactRow = {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '14px',
    background: '#f8fafc', border: '1px solid #eef2f7', textDecoration: 'none', color: '#0f172a',
    transition: 'all 0.18s'
};
const iconWrap = { width: '38px', height: '38px', borderRadius: '10px', background: '#fff', border: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 };
const contactLabel = { fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' };
const contactValue = { fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' };
