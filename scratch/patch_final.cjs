const fs = require('fs');
let file, content;

// Fix MaterialList.jsx
file = 'src/components/Dashboard/MaterialList.jsx';
content = fs.readFileSync(file, 'utf8');

// The item status button
const itemBtnTarget = `<button
                                                                        onClick={() => cycleItemStatus(originalIndex)}
                                                                        style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#f1f5f9'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#475569'), borderRadius: '20px', padding: '6px 14px', fontSize: '0.75rem', outline: 'none', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '95px' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.filter = 'brightness(0.95)'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.filter = 'none'; }}
                                                                    >
                                                                        {item.status === 'Leveret' && <Truck size={14} />}
                                                                        {item.status === 'Bestilt' && <Check size={14} />}
                                                                        {(!item.status || item.status !== 'Leveret' && item.status !== 'Bestilt') && <div style={{width: 4, height: 4, borderRadius: '50%', backgroundColor: '#94a3b8'}}/>}
                                                                        {item.status || 'Bestil'}
                                                                    </button>)}`;

const itemBtnReplace = `{!isLead && (<button
                                                                        onClick={() => cycleItemStatus(originalIndex)}
                                                                        style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#f1f5f9'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#475569'), borderRadius: '20px', padding: '6px 14px', fontSize: '0.75rem', outline: 'none', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '95px' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.filter = 'brightness(0.95)'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.filter = 'none'; }}
                                                                    >
                                                                        {item.status === 'Leveret' && <Truck size={14} />}
                                                                        {item.status === 'Bestilt' && <Check size={14} />}
                                                                        {(!item.status || item.status !== 'Leveret' && item.status !== 'Bestilt') && <div style={{width: 4, height: 4, borderRadius: '50%', backgroundColor: '#94a3b8'}}/>}
                                                                        {item.status || 'Bestil'}
                                                                    </button>)}`;

if (content.includes(itemBtnTarget)) {
    content = content.replace(itemBtnTarget, itemBtnReplace);
}

// Add the style block in Dashboard.jsx to ensure CSS isn't bypassed by cache
file = 'src/components/Dashboard/Dashboard.jsx';
let dashContent = fs.readFileSync(file, 'utf8');

const targetQuoteGrid = `<div className="quote-triple-grid">`;
const replaceQuoteGrid = `<style>{\`@media(max-width:768px){.quote-triple-grid{grid-template-columns:1fr !important;}}\`}</style>
                                                                    <div className="quote-triple-grid">`;

if (dashContent.includes(targetQuoteGrid) && !dashContent.includes('style>{`@media(max-width:768px)')) {
    dashContent = dashContent.replace(targetQuoteGrid, replaceQuoteGrid);
    // There are two quote-triple-grids, we'll replace the first one which applies the style globally.
}

fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
fs.writeFileSync('src/components/Dashboard/Dashboard.jsx', dashContent);
console.log("Fixes applied successfully");
