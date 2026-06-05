const fs = require('fs');
const path = './src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
const statePattern = /const \[isCreateLeadModalOpen, setIsCreateLeadModalOpen\] = useState\(false\);/;
if (content.match(statePattern)) {
    content = content.replace(statePattern, "const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);\n    const [showCreateLeadCancelConfirm, setShowCreateLeadCancelConfirm] = useState(false);");
} else {
    console.error('Could not find state declaration for isCreateLeadModalOpen');
}

// 2. Replace backdrop onClick
const backdropRegex = /onClick=\{\(\) => \{\s*if \(createLeadMode === 'custom' \|\| createLeadMode === 'classic'\) \{\s*if \(!window\.confirm\("Er du sikker på, at du vil lukke vinduet\? Alt indtastet data vil gå tabt\."\)\) \{\s*return;\s*\}\s*\}\s*setIsCreateLeadModalOpen\(false\);\s*setCreateLeadMode\(null\);\s*\}\}/g;

content = content.replace(backdropRegex, `onClick={() => {
                    if (createLeadMode === 'custom' || createLeadMode === 'classic') {
                        setShowCreateLeadCancelConfirm(true);
                        return;
                    }
                    setIsCreateLeadModalOpen(false); 
                    setCreateLeadMode(null); 
                }}`);

// 3. Render the beautiful modal
// We will insert it just before `{isCreateLeadModalOpen && createPortal(`
const portalRegex = /\{\/\* Create Lead Modal \*\/\}\s*\{isCreateLeadModalOpen && createPortal\(/;

const beautifulModal = `
            {/* Create Lead Cancel Confirm Modal */}
            {showCreateLeadCancelConfirm && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100001, padding: '20px', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowCreateLeadCancelConfirm(false)}>
                    <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', transform: 'scale(1)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '72px', height: '72px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '8px solid #fff', boxShadow: '0 0 0 1px #fee2e2' }}>
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>⚠️</span>
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', color: '#0f172a', fontWeight: 'bold' }}>Er du helt sikker?</h3>
                        <p style={{ margin: '0 0 32px 0', color: '#64748b', lineHeight: '1.6', fontSize: '1.05rem' }}>Hvis du lukker nu, mister du alt det arbejde, du lige har lavet i opgaven.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowCreateLeadCancelConfirm(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>Vent, bliv her</button>
                            <button onClick={() => { setShowCreateLeadCancelConfirm(false); setIsCreateLeadModalOpen(false); setCreateLeadMode(null); }} style={{ flex: 1, padding: '14px', background: '#ef4444', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; }}>Ja, slet det</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Lead Modal */}
            {isCreateLeadModalOpen && createPortal(`;

content = content.replace(portalRegex, beautifulModal);

fs.writeFileSync(path, content);
console.log('Successfully replaced confirm logic.');
