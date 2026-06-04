const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/CaseManagement.jsx', 'utf8');

const regex = /\{\/\* MANDSKABS DELEGERING BAR \*\/\}[\s\S]*?(?=\{\/\* CASE WORKSPACE TABS \*\/\})/m;

const replacement = `{/* MANDSKABS DELEGERING BAR (NYT DESIGN) */}
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Holdet på sagen</h3>
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <button 
                                    onClick={handleSaveAssignedTeam}
                                    style={{ 
                                        padding: '8px 16px', 
                                        backgroundColor: isSavedTeam ? '#10b981' : '#0f172a', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 'bold', 
                                        cursor: isSavingTeam ? 'wait' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isSavedTeam ? '✓ Gemt' : isSavingTeam ? 'Gemmer...' : 'Gem holdet'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {/* Rendér Projektledere først, derefter Byggehold */}
                            {[...pmIds, ...assignedWorkers].map(memberId => {
                                const w = team.find(t => t.id === memberId);
                                if (!w) return null;
                                
                                const isPM = pmIds.includes(memberId);
                                const roleColors = {
                                    'admin': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Admin' },
                                    'sales': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Projektleder' },
                                    'worker': { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Tømrersvend' },
                                    'apprentice': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', label: 'Lærling' }
                                };
                                const roleInfo = isPM ? roleColors['sales'] : (roleColors[w.role] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', label: 'Medarbejder' });
                                
                                const initials = w.owner_name ? w.owner_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '?';

                                return (
                                    <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', position: 'relative' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: roleInfo.bg, color: roleInfo.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', border: \`1px solid \${roleInfo.border}\` }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>{w.owner_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: roleInfo.text, fontWeight: '600', textTransform: 'uppercase' }}>{roleInfo.label}</div>
                                        </div>
                                        {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (isPM) setPmIds(pmIds.filter(id => id !== memberId));
                                                    else handleWorkerToggle(memberId);
                                                }}
                                                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#94a3b8', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                title="Fjern fra holdet"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Tilføj Medarbejder Knap */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setWorkerDropdownOpen(!workerDropdownOpen)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', height: '100%' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                                        Tilføj til holdet
                                    </button>

                                    {workerDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '280px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projektledere</div>
                                            {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => {
                                                const isSelected = pmIds.includes(pm.id);
                                                return (
                                                    <div 
                                                        key={pm.id} 
                                                        onClick={() => {
                                                            if (isSelected) setPmIds(pmIds.filter(id => id !== pm.id));
                                                            else setPmIds([...pmIds, pm.id]);
                                                        }}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', backgroundColor: isSelected ? '#eff6ff' : 'transparent', transition: 'all 0.1s' }}
                                                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #cbd5e1', backgroundColor: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isSelected && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', color: isSelected ? '#1d4ed8' : '#334155', fontWeight: isSelected ? '600' : 'normal' }}>{pm.owner_name}</span>
                                                    </div>
                                                );
                                            })}
                                            
                                            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }}></div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Byggehold (Svende & Lærlinge)</div>
                                            {team.filter(t => t.role === 'worker' || t.role === 'apprentice').map(worker => {
                                                const isAssigned = assignedWorkers.includes(worker.id);
                                                return (
                                                    <div 
                                                        key={worker.id} 
                                                        onClick={() => handleWorkerToggle(worker.id)}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', backgroundColor: isAssigned ? '#eff6ff' : 'transparent', transition: 'all 0.1s' }}
                                                        onMouseEnter={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                                        onMouseLeave={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isAssigned ? 'none' : '1px solid #cbd5e1', backgroundColor: isAssigned ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isAssigned && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', color: isAssigned ? '#1d4ed8' : '#334155', fontWeight: isAssigned ? '600' : 'normal' }}>{worker.owner_name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tomt hold besked */}
                            {(pmIds.length === 0 && assignedWorkers.length === 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', padding: '12px 0' }}>
                                    Der er endnu ikke tilføjet nogen til sagen...
                                </div>
                            )}
                        </div>
                    </div>
                    
                    `;
                    
content = content.replace(regex, replacement);

fs.writeFileSync('src/components/Dashboard/CaseManagement.jsx', content);
