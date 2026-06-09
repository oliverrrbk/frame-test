import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const GorgeousSingleSelect = ({ options, selectedId, onChange, placeholder = "Vælg", showSearch = false, icon: CustomIcon = null }) => {
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

    const filteredOptions = useMemo(() => {
        if (!showSearch) return options;
        return options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, showSearch]);

    const selectedOption = options.find(o => String(o.id) === String(selectedId));

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={ref}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    width: '100%', padding: '12px 16px', borderRadius: '12px', 
                    border: isOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0', 
                    background: '#fff',
                    fontWeight: '600', color: selectedOption ? '#0f172a' : '#64748b', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)', 
                    transition: 'all 0.2s' 
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {CustomIcon && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6' }}>
                            <CustomIcon size={16} />
                        </div>
                    )}
                    <span>{selectedOption ? selectedOption.name : placeholder}</span>
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
                            overflow: 'hidden', zIndex: 1000 
                        }}
                    >
                        {showSearch && (
                            <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Søg..." 
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
                        )}

                        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
                            {filteredOptions.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Ingen muligheder fundet</div>
                            ) : (
                                filteredOptions.map(opt => {
                                    const isSelected = String(opt.id) === String(selectedId);
                                    const OptIcon = opt.icon;
                                    return (
                                        <div 
                                            key={opt.id}
                                            onClick={() => {
                                                onChange(opt.id);
                                                setIsOpen(false);
                                                setSearchTerm('');
                                            }}
                                            style={{ 
                                                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', 
                                                display: 'flex', alignItems: 'center', gap: '12px', 
                                                background: isSelected ? '#eff6ff' : 'transparent', 
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseOver={e=> { if(!isSelected) e.currentTarget.style.background='#f8fafc'; }} 
                                            onMouseOut={e=> { if(!isSelected) e.currentTarget.style.background='transparent'; }}
                                        >
                                            {OptIcon && (
                                                <div style={{ 
                                                    width: '24px', height: '24px', borderRadius: '6px', 
                                                    background: isSelected ? '#3b82f6' : '#f1f5f9', 
                                                    color: isSelected ? '#fff' : '#64748b', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <OptIcon size={14} />
                                                </div>
                                            )}
                                            
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                    fontWeight: isSelected ? '700' : '500', 
                                                    color: isSelected ? '#1e40af' : '#334155',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {opt.name}
                                                </div>
                                            </div>

                                            {isSelected && <Check size={16} color="#3b82f6" />}
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

export default GorgeousSingleSelect;
