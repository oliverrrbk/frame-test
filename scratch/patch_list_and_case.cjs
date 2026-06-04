const fs = require('fs');

// --- 1. Fix emojis in CaseManagement.jsx ---
let caseContent = fs.readFileSync('src/components/Dashboard/CaseManagement.jsx', 'utf8');
caseContent = caseContent.replace("⏸️ Sæt i bero", "Sæt i bero");
caseContent = caseContent.replace("❌ Annullér (Udgået)", "Annullér (Udgået)");
fs.writeFileSync('src/components/Dashboard/CaseManagement.jsx', caseContent);

// --- 2. Add handleDeleteList in MaterialList.jsx ---
let materialContent = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

const createListRegex = /const handleCreateNewList = \(\) => \{[\s\S]*?\};\n/;
const createListMatch = materialContent.match(createListRegex);
if (createListMatch) {
    const deleteListFunc = `
    const handleDeleteList = (listId) => {
        if (listId === 'default') return;
        if (confirm('Er du sikker på, at du vil slette denne ekstra materialeliste og alle dens varer?')) {
            setMaterialListsMeta(prev => prev.filter(l => l.id !== listId));
            setMaterials(prev => prev.filter(m => m.listId !== listId));
            
            // Lidt hacky, vi tvinger et save efter state updates:
            setTimeout(() => {
               document.getElementById('hidden-save-btn')?.click();
            }, 100);
        }
    };
`;
    materialContent = materialContent.replace(createListMatch[0], createListMatch[0] + deleteListFunc);
}

// Ensure there is a hidden save button or just use handleSaveList (Wait, handleSaveList uses state which might not be updated yet. We can just pass the new data to a save function if needed, but setTimeout is a quick trick, or we can just rely on the user pressing "Gem").
// Actually, it's better to update state and let the user press "Gem". The list will disappear immediately.

// Let's rewrite the delete function to just do it cleanly without hack:
const cleanDeleteListFunc = `
    const handleDeleteList = (e, listId) => {
        e.stopPropagation();
        if (listId === 'default') return;
        if (confirm('Er du sikker på, at du vil slette denne ekstra materialeliste og alle dens varer?')) {
            setMaterialListsMeta(prev => prev.filter(l => l.id !== listId));
            setMaterials(prev => prev.filter(m => m.listId !== listId));
            // User can manually save via "Gem alle lister" afterwards, or we can trigger handleSaveList if we refactor it.
        }
    };
`;
materialContent = materialContent.replace(createListRegex, createListMatch[0] + cleanDeleteListFunc);

// --- 3. Add Trash icon in accordion header ---
const headerEndRegex = /<\/div>\n\s*\}\)\n\s*<\/div>\n\s*<\/div>\n\s*\{?\/\* ACCORDION CONTENT \*\/\}/;
// Actually we need to insert it right after the price input div. Let's find the specific block.
const rightHeaderRegex = /(<span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold' }}>kr.<\/span>\n\s*<\/div>\n\s*<\/div>\n\s*\)}\n\s*<\/div>)/;

const rightHeaderMatch = materialContent.match(rightHeaderRegex);
if (rightHeaderMatch) {
    const trashBtn = `
                                    {list.id !== 'default' && profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
                                        <button 
                                            onClick={(e) => handleDeleteList(e, list.id)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginLeft: '8px' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                                            title="Slet Ekstra Liste"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>`;
    materialContent = materialContent.replace(rightHeaderRegex, rightHeaderMatch[1].replace('</div>', trashBtn));
}

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', materialContent);
