const fs = require('fs');
const path = './src/components/Dashboard/CustomProjectCreator.jsx';
let content = fs.readFileSync(path, 'utf8');

const editorStartIdx = content.indexOf("{/* VIEW: EDITOR */}");
const styleStartIdx = content.indexOf("<style>{`");

if (editorStartIdx === -1 || styleStartIdx === -1) {
    console.error('Could not find markers');
    process.exit(1);
}

const beforeEditor = content.substring(0, editorStartIdx);
const afterEditor = content.substring(styleStartIdx);

const newEditorBlock = `
                {/* VIEW: EDITOR */}
                {viewMode === 'editor' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* 1. Projekt Detaljer & Arbejdsløn */}
                    <div className="desc-hours-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Projekt Detaljer & Arbejdsløn</h3>
                            <div className="input-group" style={{ marginBottom: '16px' }}>
                                <label>Opgavetitel</label>
                                <input type="text" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="F.eks. Udskiftning af Vinduer" className="modern-input" />
                            </div>
                            <div className="input-group" style={{ marginBottom: '24px' }}>
                                <label>Intern Note / Beskrivelse (Kundens PDF)</label>
                                <textarea value={projectNotes} onChange={e => setProjectNotes(e.target.value)} placeholder="Beskriv opgaven i detaljer (f.eks. mål, dimensioner, specifikke ønsker)..." className="modern-input" style={{ minHeight: '80px', resize: 'vertical' }} />
                            </div>

                            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: '#1e293b' }}>Afregning af arbejdsløn</label>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <button 
                                        onClick={() => setLaborType('hourly')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: laborType === 'hourly' ? '2px solid #3b82f6' : '1px solid #cbd5e1', backgroundColor: laborType === 'hourly' ? '#eff6ff' : '#fff', color: laborType === 'hourly' ? '#1d4ed8' : '#64748b', fontWeight: laborType === 'hourly' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        Timepris (Beregnes pr. etape)
                                    </button>
                                    <button 
                                        onClick={() => setLaborType('fixed')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: laborType === 'fixed' ? '2px solid #3b82f6' : '1px solid #cbd5e1', backgroundColor: laborType === 'fixed' ? '#eff6ff' : '#fff', color: laborType === 'fixed' ? '#1d4ed8' : '#64748b', fontWeight: laborType === 'fixed' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        Fast Pris (Samlet arbejdsløn)
                                    </button>
                                </div>
                                
                                {laborType === 'hourly' ? (
                                    <div className="input-group">
                                        <label>Din Timepris (Salgspris inkl. avance)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="modern-input" style={{ paddingRight: '40px' }} />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr/t</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="input-group">
                                        <label>Samlet Fast Pris for Arbejdsløn</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" value={fixedLaborPrice} onChange={e => setFixedLaborPrice(e.target.value)} placeholder="Indtast totalbeløb for løn" className="modern-input" style={{ paddingRight: '40px' }} />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Phases rendering */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {phases.map((phase, pIndex) => (
                            <div key={phase.id} className="phase-card">
                                
                                {/* Phase Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 20px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                    <div style={{ width: '40%' }}>
                                        <input 
                                            type="text" 
                                            value={phase.name} 
                                            onChange={e => updatePhase(pIndex, 'name', e.target.value)} 
                                            placeholder="Etapenavn (f.eks. Råhus)"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid transparent', borderRadius: '6px', color: '#1e293b' }}
                                            onFocus={e => e.target.style.border = '1px solid #e2e8f0'}
                                            onBlur={e => e.target.style.border = '1px solid transparent'}
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {laborType === 'hourly' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{ fontSize: '0.9rem', color: '#64748b' }}>Timer:</label>
                                                <input 
                                                    type="number" 
                                                    value={phase.hours} 
                                                    onChange={e => updatePhase(pIndex, 'hours', e.target.value)}
                                                    placeholder="0"
                                                    className="modern-input"
                                                    style={{ width: '80px', textAlign: 'right', padding: '6px 10px' }}
                                                />
                                            </div>
                                        )}
                                        {phases.length > 1 && (
                                            <button onClick={() => handleRemovePhase(pIndex)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Phase Materials */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>Materialer til etapen</h4>
                                        <button onClick={() => handleAddMaterialRow(pIndex)} style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Plus size={14} /> Tilføj
                                        </button>
                                    </div>

                                    {phase.materials.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                                            Ingen materialer.
                                        </div>
                                    ) : (
                                        <div className="material-table-container">
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '40%' }}>Beskrivelse</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Antal</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Indkøb</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '15%' }}>Avance %</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '10%' }}>I alt</th>
                                                    <th style={{ padding: '8px', fontWeight: '600', width: '5%' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {phase.materials.map((mat, matIndex) => (
                                                    <tr key={matIndex} className="material-row">
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <input 
                                                                    type="text" 
                                                                    value={mat.name} 
                                                                    onChange={e => updateMaterial(pIndex, matIndex, 'name', e.target.value)}
                                                                    onFocus={() => setShowSuggestions({ pIndex, matIndex })}
                                                                    onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                                                    placeholder="Søg i database..."
                                                                    className="modern-input"
                                                                    style={{ padding: '6px 10px' }}
                                                                />
                                                                {showSuggestions?.pIndex === pIndex && showSuggestions?.matIndex === matIndex && mat.name.length > 1 && (
                                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                                        {suggestions.filter(s => s.name.toLowerCase().includes(mat.name.toLowerCase())).slice(0, 5).map(s => (
                                                                            <div 
                                                                                key={s.id} 
                                                                                onClick={() => selectSuggestion(pIndex, matIndex, s)}
                                                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <span style={{ fontWeight: '500', color: '#1e293b' }}>{s.name}</span>
                                                                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{s.price} kr/{s.unit}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '6px 8px', display: 'flex', gap: '4px' }}>
                                                            <input type="number" min="0" step="0.1" value={mat.quantity} onChange={e => updateMaterial(pIndex, matIndex, 'quantity', e.target.value)} className="modern-input" style={{ width: '60%', padding: '6px 10px' }} />
                                                            <input type="text" value={mat.unit} onChange={e => updateMaterial(pIndex, matIndex, 'unit', e.target.value)} className="modern-input" style={{ width: '40%', padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <input type="number" min="0" value={mat.price} onChange={e => updateMaterial(pIndex, matIndex, 'price', e.target.value)} className="modern-input" style={{ padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <input type="number" min="0" value={mat.markup} onChange={e => updateMaterial(pIndex, matIndex, 'markup', e.target.value)} className="modern-input" style={{ padding: '6px 10px' }} />
                                                        </td>
                                                        <td style={{ padding: '6px 8px', fontWeight: '600', color: '#0f172a' }}>
                                                            {((parseFloat(mat.price) || 0) * (parseFloat(mat.quantity) || 0) * (1 + ((parseFloat(mat.markup) || 0) / 100))).toFixed(0)} kr
                                                        </td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                            <button onClick={() => handleRemoveMaterial(pIndex, matIndex)} className="delete-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            </table>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                {(() => {
                                                    const phaseMatCost = phase.materials.reduce((acc, m) => {
                                                        return acc + ((parseFloat(m.price) || 0) * (parseFloat(m.quantity) || 0) * (1 + ((parseFloat(m.markup) || 0) / 100)));
                                                    }, 0);
                                                    return (
                                                        <div style={{ fontSize: '0.95rem', color: '#475569' }}>
                                                            Materialer i etapen: <strong>{phaseMatCost.toFixed(0)} kr.</strong> <span style={{ fontSize: '0.8rem' }}>(Ekskl. moms)</span> / <strong>{(phaseMatCost * 1.25).toFixed(0)} kr.</strong> <span style={{ fontSize: '0.8rem' }}>(Inkl. moms)</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button onClick={handleAddPhase} style={{ padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', color: '#64748b', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.backgroundColor = '#ecfdf5'; e.currentTarget.style.transform = 'scale(1.01)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                            <Plus size={20} /> Tilføj Ny Etape
                        </button>
                    </div>

                    {/* 3. Tillæg, Udstyr & Tømrer-beskyttelse */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Tillæg, Udstyr & Tømrer-beskyttelse</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Antal Containere (á 2500,- ex avance)</label>
                                <input type="number" min="0" value={globalCosts.containers || ''} onChange={e => setGlobalCosts({...globalCosts, containers: e.target.value})} placeholder="F.eks. 1" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Lift / Stilladsleje (Indkøbspris)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" value={globalCosts.scaffolding || ''} onChange={e => setGlobalCosts({...globalCosts, scaffolding: e.target.value})} placeholder="F.eks. 5000" className="modern-input" style={{ paddingRight: '40px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Usynlige Materialer (Skruer, fuge, lim)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" value={globalCosts.invisibleMaterials || ''} onChange={e => setGlobalCosts({...globalCosts, invisibleMaterials: e.target.value})} placeholder="F.eks. 1500" className="modern-input" style={{ paddingRight: '40px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>kr</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Kørsel & Transport (Timer)</label>
                                <input type="number" min="0" step="0.5" value={globalCosts.transportHours || ''} onChange={e => setGlobalCosts({...globalCosts, transportHours: e.target.value})} placeholder="F.eks. 2" className="modern-input" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Customer Info Card */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Kundeinformation</h3>
                        <div className="customer-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Kundenavn *</label>
                                <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="F.eks. Jens Hansen" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Telefon</label>
                                <input type="text" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="Tlf. nr." className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} placeholder="Email adresse" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Adresse</label>
                                <input type="text" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} placeholder="Vej og nummer" className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>Postnummer</label>
                                <input type="text" value={customerInfo.zip} onChange={async (e) => {
                                    const val = e.target.value;
                                    setCustomerInfo({...customerInfo, zip: val});
                                    if (val.length === 4 && /^\d+$/.test(val)) {
                                        try {
                                            const res = await fetch(\`https://api.dataforsyningen.dk/postnumre/\${val}\`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                if (data && data.navn) {
                                                    setCustomerInfo(prev => ({...prev, zip: val, city: data.navn}));
                                                }
                                            }
                                        } catch(err) { console.error(err); }
                                    }
                                }} placeholder="Postnr." className="modern-input" />
                            </div>
                            <div className="input-group">
                                <label>By</label>
                                <input type="text" value={customerInfo.city} onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})} placeholder="By" className="modern-input" />
                            </div>
                        </div>
                    </div>

                    {/* 5. Samlet Pris */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Samlet Pris & Opsamling</h3>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '8px' }}>
                                <span>Materialer i alt (Salgspris):</span>
                                <span>{totals.materialsSales.toFixed(0)} kr</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '8px' }}>
                                <span>Arbejdsløn i alt {laborType === 'hourly' ? \`(\${totals.totalHours} t)\` : '(Fast Pris)'}:</span>
                                <span>{totals.laborSales.toFixed(0)} kr</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 'bold', fontSize: '1.3rem', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <span>Total (ekskl. moms):</span>
                                <span style={{ color: '#10b981' }}>{totals.totalSales.toFixed(0)} kr</span>
                            </div>
                        </div>
                    </div>

                    </div>
                )}
`;

fs.writeFileSync(path, beforeEditor + newEditorBlock + '\n            ' + afterEditor);
console.log('Successfully updated CustomProjectCreator.jsx');
