import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, Users } from 'lucide-react';

const GorgeousMultiSelect = ({ options, selectedIds, onChange, title = "Vælg" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleId = (id) => {
        if (id === 'all') {
            if (selectedIds.includes('all')) onChange([]);
            else onChange(['all']);
            return;
        }
        
        let newIds = selectedIds.filter(i => i !== 'all');
        if (newIds.includes(id)) {
            newIds = newIds.filter(i => i !== id);
        } else {
            newIds = [...newIds, id];
        }
        
        if (newIds.length === 0) newIds = ['all'];
        onChange(newIds);
    };

    const filteredOptions = useMemo(() => {
        return options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const getDisplayTitle = () => {
        if (selectedIds.includes('all') || selectedIds.length === 0) return "Alle Medarbejdere";
        if (selectedIds.length === 1) {
            const opt = options.find(o => String(o.id) === String(selectedIds[0]));
            return opt ? opt.name : "Valgt (1)";
        }
        return `Valgt (${selectedIds.length})`;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div style={{ position: 'relative', minWidth: '240px' }} ref={ref}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    width: '100%', padding: '12px 16px', borderRadius: '12px', 
                    border: isOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0', 
                    background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)',
                    fontWeight: '600', color: '#0f172a', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 2px 8px rgba(0,0,0,0.04)', 
                    transition: 'all 0.2s' 
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6' }}>
                        <Users size={16} />
                    </div>
                    <span>{getDisplayTitle()}</span>
                </div>
                <ChevronDown size={18} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', 
                            background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', 
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', 
                            overflow: 'hidden', zIndex: 100 
                        }}
                    >
                        <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Søg medarbejder..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '10px 10px 10px 36px', 
                                        borderRadius: '8px', border: '1px solid #e2e8f0', 
                                        background: '#f8fafc', fontSize: '0.9rem', outline: 'none' 
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
                            <div 
                                onClick={() => toggleId('all')}
                                style={{ 
                                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', gap: '12px', 
                                    background: selectedIds.includes('all') ? '#eff6ff' : 'transparent', 
                                    transition: 'background 0.15s'
                                }}
                                onMouseOver={e=> { if(!selectedIds.includes('all')) e.currentTarget.style.background='#f8fafc'; }} 
                                onMouseOut={e=> { if(!selectedIds.includes('all')) e.currentTarget.style.background='transparent'; }}
                            >
                                <div style={{ 
                                    width: '20px', height: '20px', borderRadius: '6px', 
                                    border: selectedIds.includes('all') ? 'none' : '1px solid #cbd5e1', 
                                    background: selectedIds.includes('all') ? '#3b82f6' : '#fff', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {selectedIds.includes('all') && <Check size={14} color="#fff" />}
                                </div>
                                <span style={{ fontWeight: selectedIds.includes('all') ? '700' : '500', color: selectedIds.includes('all') ? '#1e40af' : '#0f172a' }}>
                                    Fælles for alle
                                </span>
                            </div>

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

                            {filteredOptions.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Ingen fundet</div>
                            ) : (
                                filteredOptions.map(opt => {
                                    const isSelected = selectedIds.includes(String(opt.id)) || selectedIds.includes('all');
                                    return (
                                        <div 
                                            key={opt.id}
                                            onClick={() => toggleId(String(opt.id))}
                                            style={{ 
                                                padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', 
                                                display: 'flex', alignItems: 'center', gap: '12px', 
                                                background: isSelected ? '#f8fafc' : 'transparent', 
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseOver={e=> { if(!isSelected) e.currentTarget.style.background='#f8fafc'; }} 
                                            onMouseOut={e=> { if(!isSelected) e.currentTarget.style.background='transparent'; }}
                                        >
                                            <div style={{ 
                                                width: '20px', height: '20px', borderRadius: '6px', 
                                                border: isSelected ? 'none' : '1px solid #cbd5e1', 
                                                background: isSelected ? '#3b82f6' : '#fff', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {isSelected && <Check size={14} color="#fff" />}
                                            </div>
                                            
                                            <div style={{ 
                                                width: '32px', height: '32px', borderRadius: '50%', 
                                                background: opt.isMe ? '#8b5cf6' : '#e2e8f0', 
                                                color: opt.isMe ? '#fff' : '#475569', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 
                                            }}>
                                                {getInitials(opt.name)}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                    fontWeight: isSelected ? '700' : '500', 
                                                    color: isSelected ? '#0f172a' : '#334155',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {opt.name} {opt.isMe && <span style={{ fontSize: '0.75rem', color: '#8b5cf6', marginLeft: '4px' }}>(Mig)</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GorgeousMultiSelect;
