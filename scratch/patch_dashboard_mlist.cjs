const fs = require('fs');
const file = 'src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `{isMaterialListOpen && (
                                                     <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1' }}>
                                                         <MaterialList isLead={true} 
                                                             lead={selectedLead} 
                                                             profile={carpenterProfile} 
                                                             onUpdate={(updated) => {
                                                                 setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                                                 setSelectedLead(updated);
                                                             }} 
                                                         />
                                                     </div>
                                                 )}`;
                                                 
const replacementStr = `{isMaterialListOpen && (
                                                     <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column' }}>
                                                         <MaterialList isLead={true} 
                                                             lead={selectedLead} 
                                                             profile={carpenterProfile} 
                                                             onUpdate={(updated) => {
                                                                 setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                                                 setSelectedLead(updated);
                                                             }} 
                                                         />
                                                         <button 
                                                             onClick={() => setIsMaterialListOpen(false)}
                                                             style={{ width: '100%', marginTop: '24px', padding: '16px', backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                         >
                                                             ▲ Luk materialeliste
                                                         </button>
                                                     </div>
                                                 )}`;

if (content.includes(targetStr)) {
    fs.writeFileSync(file, content.replace(targetStr, replacementStr));
    console.log("Dashboard mlist patch success");
} else {
    console.log("Dashboard mlist patch fail");
}
