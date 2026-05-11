import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ value, options, onChange, placeholder = "Vælg en mulighed", style = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Lyt efter klik uden for komponenten for at lukke dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Konverter options array til et format vi let kan rendere
    // Understøtter både ['Mulighed 1', 'Mulighed 2'] og [{value: '1', label: 'En'}]
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'string') return { value: opt, label: opt };
        return opt;
    });

    const selectedLabel = normalizedOptions.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div ref={containerRef} style={{ position: 'relative', ...style }}>
            {/* Selve feltet man klikker på */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${isOpen ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: '#ffffff',
                    fontSize: '1.05rem',
                    color: value ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none'
                }}
            >
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedLabel}
                </span>
                <svg 
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                    strokeLinecap="round" strokeLinejoin="round" 
                    style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.3s ease',
                        color: isOpen ? '#2563eb' : '#94a3b8',
                        flexShrink: 0,
                        marginLeft: '12px'
                    }}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>

            {/* Dropdown listen */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '8px',
                    animation: 'dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <style>
                        {`
                        @keyframes dropdownFadeIn {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .custom-select-option {
                            padding: 12px 16px;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.15s ease;
                            color: #334155;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        .custom-select-option:hover {
                            background-color: #f1f5f9;
                            color: #0f172a;
                        }
                        .custom-select-option.selected {
                            background-color: #eff6ff;
                            color: #1d4ed8;
                            font-weight: 600;
                        }
                        `}
                    </style>
                    {normalizedOptions.map((opt, index) => (
                        <div 
                            key={index}
                            className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            <span>{opt.label}</span>
                            {value === opt.value && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
