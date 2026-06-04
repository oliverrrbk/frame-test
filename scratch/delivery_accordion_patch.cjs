const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// 1. Add Truck icon
content = content.replace(/import \{ (.*?) \} from 'lucide-react';/, "import { $1, Truck } from 'lucide-react';");

// 2. Add state for isDeliveryOpen
const stateRegex = /const \[openLists, setOpenLists\] = useState\(\{ 'default': true \}\);/;
content = content.replace(stateRegex, "const [openLists, setOpenLists] = useState({ 'default': true });\n    const [isDeliveryOpen, setIsDeliveryOpen] = useState(!deliveryInfo?.address);");

// 3. Validation in handleGeneratePDF
const pdfRegex = /const handleGeneratePDF = \(listId, listName\) => \{/;
content = content.replace(pdfRegex, `const handleGeneratePDF = (listId, listName) => {\n        if (!deliveryInfo?.address || deliveryInfo.address.trim() === '') {\n            toast.error("Du skal angive en leveringsadresse for at kunne bestille!");\n            setIsDeliveryOpen(true);\n            return;\n        }`);

// 4. Validation in handleGenerateEmail
const emailRegex = /const handleGenerateEmail = \(listId, listName\) => \{/;
content = content.replace(emailRegex, `const handleGenerateEmail = (listId, listName) => {\n        if (!deliveryInfo?.address || deliveryInfo.address.trim() === '') {\n            toast.error("Du skal angive en leveringsadresse for at kunne bestille!");\n            setIsDeliveryOpen(true);\n            return;\n        }`);

// 5. Replace the Delivery Info UI
const oldDeliveryRegex = /\{\/\* LEVERINGSINFO \(Skjult for svende\) \*\/\}[\s\S]*?(?=\{\/\* MATERIALELISTER \(ACCORDIONS\) \*\/\})/;

const newDeliveryUI = `{/* LEVERINGSINFO (ACCORDION) */}
            {profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
            <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                backgroundColor: '#ffffff',
                marginBottom: '16px',
                boxShadow: isDeliveryOpen ? '0 12px 24px -10px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* ACCORDION HEADER */}
                <div 
                    onClick={() => setIsDeliveryOpen(!isDeliveryOpen)}
                    style={{ 
                        padding: '20px 24px', 
                        backgroundColor: isDeliveryOpen ? '#f8fafc' : '#ffffff', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isDeliveryOpen ? '1px solid #e2e8f0' : 'none',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            width: '40px', height: '40px', 
                            borderRadius: '12px', 
                            backgroundColor: isDeliveryOpen ? '#fef3c7' : '#f8fafc', 
                            color: isDeliveryOpen ? '#d97706' : '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Truck size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold' }}>
                                Leverings- & Fragtoplysninger
                            </h3>
                            {!isDeliveryOpen && (
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? '#ef4444' : '#64748b', fontWeight: (!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? 'bold' : 'normal' }}>
                                    {(!deliveryInfo?.address || deliveryInfo.address.trim() === '') ? 'Mangler leveringsadresse!' : deliveryInfo.address}
                                </p>
                            )}
                        </div>
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                        {isDeliveryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {/* ACCORDION BODY */}
                {isDeliveryOpen && (
                <div style={{ padding: '24px', backgroundColor: '#ffffff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Leveringsadresse</label>
                        <input 
                            type="text" 
                            value={deliveryInfo.address}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                            placeholder="Vejnavn 42, 8000 Aarhus"
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>
                    
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Ønsket leveringsdato</label>
                        <input 
                            type="date"
                            value={deliveryInfo.date}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, date: e.target.value })}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>

                    <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Bemærkninger til fragtmanden</label>
                        <textarea 
                            rows={2}
                            value={deliveryInfo.notes}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                            placeholder="Skriv eventuelle anvisninger til lastbilen..."
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none', resize: 'vertical' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>
                </div>
                )}
            </div>
            )}

            `;
            
content = content.replace(oldDeliveryRegex, newDeliveryUI);

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
