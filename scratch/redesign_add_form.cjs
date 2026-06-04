const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

const regex = /<form onSubmit=\{\(e\) => handleAddItem\(e, list\.id\)\} className="material-add-grid"[\s\S]*?<\/form>/;

const newForm = `<form onSubmit={(e) => handleAddItem(e, list.id)} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc', padding: '24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 'bold' }}>Tilføj ny vare til "{list.name}"</h4>
                                                    <button type="button" onClick={() => setAddingToList(null)} style={{ background: '#e2e8f0', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.2rem', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>&times;</button>
                                                </div>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Varebeskrivelse</label>
                                                        <input 
                                                            type="text"
                                                            value={newItem.item}
                                                            onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                                                            placeholder="fx Reglar 45x95 C18..."
                                                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mængde</label>
                                                            <input 
                                                                type="number"
                                                                step="any"
                                                                value={newItem.qty}
                                                                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                                                                placeholder="Antal"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enhed</label>
                                                            <input 
                                                                type="text"
                                                                value={newItem.unit}
                                                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                                                placeholder="stk / m / rulle"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</label>
                                                        <select
                                                            value={newItem.section}
                                                            onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                                                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2364748b\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3e%3cpolyline points=\\'6 9 12 15 18 9\\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                        >
                                                            <option value="Hovedmaterialer">Hovedmaterialer</option>
                                                            <option value="Underkonstruktion">Underkonstruktion</option>
                                                            <option value="Fastgørelse & Beslag">Fastgørelse & Beslag</option>
                                                            <option value="Underlag & Tilbehør">Underlag & Tilbehør</option>
                                                            <option value="Afslutning">Afslutning</option>
                                                            <option value="Forbrugsstoffer & Værktøj">Forbrugsstoffer & Værktøj</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button 
                                                    type="submit"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', fontSize: '1rem' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)'; }}
                                                >
                                                    <Plus size={20} strokeWidth={2.5} /> Tilføj Vare til Listen
                                                </button>
                                            </form>`;

content = content.replace(regex, newForm);

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
