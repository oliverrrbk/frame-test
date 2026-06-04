                            <ShieldAlert size={24} />
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Advarsel: Timebudgettet skrider!</strong>
                                <span style={{ fontSize: '0.8rem' }}>Sagen har brugt {totalActualHours} t ud af det estimerede budget på {budgetedHours} t ({Math.round(hourBudgetRatio * 100)}%), men bygge-to-do listen er kun {progressPercent}% færdig. Kontroller eventuelt tidsregistreringerne eller pladsen.</span>
                            </div>
                        </div>
                    )}

                    {/* MANDSKABS DELEGERING BAR */}
                    {(profile?.role === 'worker' || profile?.role === 'apprentice') ? (
                        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                                <strong style={{ color: '#1a1a1a', marginRight: '6px' }}>Projektleder:</strong> 
                                {pmIds.length === 0 ? 'Ikke tilknyttet endnu' : pmIds.map(id => team.find(t => t.id === id)?.owner_name).filter(Boolean).join(', ')}
                            </div>
                            <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }} />
                            <div style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: '#1a1a1a' }}>Dit Byggehold:</strong>
                                {assignedWorkers.length === 0 ? 'Kun dig' : (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {assignedWorkers.map(wId => {
                                            const w = team.find(t => t.id === wId);
                                            return w ? <span key={wId} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '30px', background: '#f3f4f6', color: '#374151', fontWeight: '500' }}>{w.owner_name}</span> : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Projektleder</span>
                                    <div 
                                        onClick={() => setPmDropdownOpen(!pmDropdownOpen)}
                                        style={{ 
                                            padding: '8px 12px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #e8e6e1', 
                                            fontSize: '0.85rem', 
                                            minWidth: '220px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                            transition: 'border-color 0.2s',
                                        }}
                                    >
                                        <span style={{ color: pmIds.length ? '#1a1a1a' : '#9ca3af', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {pmIds.length === 0 ? '-- Vælg Projektleder --' : pmIds.map(id => team.find(t => t.id === id)?.owner_name).filter(Boolean).join(', ')}
                                        </span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: pmDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                    
                                    {pmDropdownOpen && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '100%', 
                                            left: 0, 
                                            marginTop: '4px', 
                                            width: '100%', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e8e6e1', 
                                            borderRadius: '8px', 
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                            zIndex: 100,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => {
                                                const isSelected = pmIds.includes(pm.id);
                                                return (
                                                    <div 
                                                        key={pm.id} 
                                                        onClick={() => {
                                                            if (isSelected) setPmIds(pmIds.filter(id => id !== pm.id));
                                                            else setPmIds([...pmIds, pm.id]);
                                                        }}
                                                        style={{ 
                                                            padding: '10px 12px', 
                                                            cursor: 'pointer', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '8px',
                                                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                            transition: 'background-color 0.1s'
                                                        }}
                                                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ 
                                                            width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #cbd5e1', 
                                                            backgroundColor: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {isSelected && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', color: isSelected ? '#1d4ed8' : '#1a1a1a', fontWeight: isSelected ? '500' : 'normal' }}>
                                                            {pm.owner_name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Tildelt Byggehold (Svende & Lærlinge)</span>
                                    
                                    {/* Valgte workers vist som tags */}
                                    {assignedWorkers.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            {assignedWorkers.map(wId => {
                                                const w = team.find(t => t.id === wId);
                                                if (!w) return null;
                                                return (
                                                    <div key={wId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
                                                        {w.owner_name}
                                                        <span 
                                                            onClick={(e) => { e.stopPropagation(); handleWorkerToggle(wId); }}
                                                            style={{ cursor: 'pointer', marginLeft: '4px', fontSize: '0.85rem' }}
                                                        >×</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div 
                                        onClick={() => setWorkerDropdownOpen(!workerDropdownOpen)}
                                        style={{ 
                                            padding: '8px 12px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #e8e6e1', 
                                            fontSize: '0.85rem', 
                                            minWidth: '220px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                            transition: 'border-color 0.2s',
                                        }}
                                    >
                                        <span style={{ color: '#9ca3af' }}>
                                            -- Tilføj medarbejder --
                                        </span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: workerDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                    
                                    {workerDropdownOpen && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '100%', 
                                            left: 0, 
                                            marginTop: '4px', 
                                            width: '100%', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e8e6e1', 
                                            borderRadius: '8px', 
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                            zIndex: 100,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {team
                                                .filter(t => t.role === 'worker' || t.role === 'apprentice')
                                                .sort((a, b) => (a.owner_name || '').localeCompare(b.owner_name || ''))
                                                .map(worker => {
                                                    const isAssigned = assignedWorkers.includes(worker.id);
                                                    return (
                                                        <div 
                                                            key={worker.id} 
                                                            onClick={() => handleWorkerToggle(worker.id)}
                                                            style={{ 
                                                                padding: '10px 12px', 
                                                                cursor: 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '8px',
                                                                backgroundColor: isAssigned ? '#eff6ff' : 'transparent',
                                                                transition: 'background-color 0.1s'
                                                            }}
                                                            onMouseEnter={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                                            onMouseLeave={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                        >
                                                            <div style={{ 
                                                                width: '16px', height: '16px', borderRadius: '4px', border: isAssigned ? 'none' : '1px solid #cbd5e1', 
                                                                backgroundColor: isAssigned ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                {isAssigned && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', color: isAssigned ? '#1d4ed8' : '#1a1a1a', fontWeight: isAssigned ? '500' : 'normal' }}>
                                                                {worker.owner_name}
                                                            </span>
                                                        </div>
                                                    );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
    
                            <button 
                                onClick={handleSaveAssignments}
                                disabled={isSavingTeam}
                                style={{ 
                                    padding: '10px 18px', 
                                    backgroundColor: isSavedTeam ? '#10b981' : '#1e293b', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 'bold', 
                                    cursor: isSavingTeam ? 'wait' : 'pointer',
                                    transition: 'background-color 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isSavedTeam ? '✓ Gemt' : isSavingTeam ? 'Gemmer...' : 'Gem bemanding'}
                            </button>
                        </div>
                    )}

                    {/* CASE WORKSPACE TABS */}
                                        {/* MODERN HORIZONTAL TABS (2026 DESIGN) */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingTop: '4px', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', marginBottom: '16px', marginTop: '24px' }}>
                        <style>{`
