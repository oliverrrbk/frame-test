const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

// 1. Add formatPrice and parsePrice helpers and toggle ordered function
const toggleFunc = `
    const handleToggleListOrdered = (listId) => {
        const listMaterials = materials.filter(m => m.listId === listId);
        const isAllOrdered = listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret');
        
        const newStatus = isAllOrdered ? 'Ikke bestilt' : 'Bestilt';
        
        const updated = materials.map(m => m.listId === listId ? { ...m, status: newStatus } : m);
        setMaterials(updated);
        handleSaveList(updated);
        toast.success(isAllOrdered ? 'Bestilling annulleret' : 'Materialerne er markeret som bestilt!');
    };

    const formatPrice = (val) => {
        if (!val) return '';
        const num = String(val).replace(/\\D/g, '');
        return num.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
    };

    const parsePrice = (val) => {
        if (!val) return '';
        return String(val).replace(/\\./g, '');
    };
`;
content = content.replace(/const handleMarkAllOrdered =[\s\S]*?toast\.success\('Materialerne er markeret som bestilt!'\);\n    };/, toggleFunc.trim());

// 2. Remove the budget dashboard
const budgetDashboardRegex = /\{\/\* BUDGET DASHBOARD[\s\S]*?Penge tilbage til indkøb'\}\n                        <\/p>\n                    <\/div>\n                <\/div>\n            \)}/;
content = content.replace(budgetDashboardRegex, '');

// 3. Update the price input to use the format helpers and use type="text"
const inputRegex = /<input \n\s*type="number"\n\s*placeholder="Indtast pris\.\.\."\n\s*value=\{list\.price\}\n\s*onChange=\{\(e\) => handleUpdateListMeta\(list\.id, 'price', e\.target\.value\)\}/g;
content = content.replace(inputRegex, `<input \n                                                    type="text"\n                                                    placeholder="Indtast pris..."\n                                                    value={formatPrice(list.price)}\n                                                    onChange={(e) => handleUpdateListMeta(list.id, 'price', parsePrice(e.target.value))}`);

// 4. Update the "Markér liste som bestilt" button logic
const buttonLogicRegex = /<button \n\s*onClick=\{\(\) => handleMarkAllOrdered\(list\.id\)\}\n\s*style=\{\{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', fontSize: '0\.85rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#059669', transition: 'all 0\.2s' \}\}\n\s*onMouseEnter=\{\(e\) => \{\ e\.currentTarget\.style\.backgroundColor = '#d1fae5'; \}\}\n\s*onMouseLeave=\{\(e\) => \{\ e\.currentTarget\.style\.backgroundColor = '#ecfdf5'; \}\}\n\s*>\n\s*<Check size=\{14\} \/> Markér liste som bestilt\n\s*<\/button>/;

const newButtonLogic = `
                                            <button 
                                                onClick={() => handleToggleListOrdered(list.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '1px solid #fca5a5' : '1px solid #10b981', backgroundColor: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#fef2f2' : '#ecfdf5', color: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#dc2626' : '#059669', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#fee2e2' : '#d1fae5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#fef2f2' : '#ecfdf5'; }}
                                            >
                                                {listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret') ? <><Trash2 size={16} /> Fortryd Bestilling</> : <><Check size={16} /> Markér liste som bestilt</>}
                                            </button>`;

content = content.replace(buttonLogicRegex, newButtonLogic.trim());

// If `<Check size={16} />` was there instead of 14:
const buttonLogicRegexFallback = /<button \n\s*onClick=\{\(\) => handleMarkAllOrdered\(list\.id\)\}[\s\S]*?Markér liste som bestilt\n\s*<\/button>/;
content = content.replace(buttonLogicRegexFallback, newButtonLogic.trim());


fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
