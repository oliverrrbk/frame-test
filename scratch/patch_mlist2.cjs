const fs = require('fs');
const file = 'src/components/Dashboard/MaterialList.jsx';
let content = fs.readFileSync(file, 'utf8');

const topActionsTarget = `<button 
                                                onClick={() => handleToggleListOrdered(list.id)}`;
const topActionsReplace = `{!isLead && (<button 
                                                onClick={() => handleToggleListOrdered(list.id)}`;
content = content.replace(topActionsTarget, topActionsReplace);

const topActionsEndTarget = `</button>
                                            <button 
                                                onClick={() => handleMarkListDelivered(list.id)}`;
const topActionsEndReplace = `</button>)}
                                            {!isLead && (<button 
                                                onClick={() => handleMarkListDelivered(list.id)}`;
content = content.replace(topActionsEndTarget, topActionsEndReplace);

const topActionsDelivEndTarget = `</button>
                                            <div style={{ flex: 1 }} />`;
const topActionsDelivEndReplace = `</button>)}
                                            <div style={{ flex: 1 }} />`;
content = content.replace(topActionsDelivEndTarget, topActionsDelivEndReplace);

// Now individual buttons
const itemBtnTarget = `<button 
                                                                        onClick={() => handleToggleItemStatus(list.id, item.id)}
                                                                        style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#f1f5f9'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#475569'), borderRadius: '20px', padding: '6px 14px', fontSize: '0.75rem', outline: 'none', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '95px' }}
                                                                    >`;
const itemBtnReplace = `{!isLead && (<button 
                                                                        onClick={() => handleToggleItemStatus(list.id, item.id)}
                                                                        style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#f1f5f9'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#475569'), borderRadius: '20px', padding: '6px 14px', fontSize: '0.75rem', outline: 'none', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '95px' }}
                                                                    >`;
content = content.replace(itemBtnTarget, itemBtnReplace);

const itemBtnEndTarget = `{item.status || 'Bestil'}
                                                                    </button>`;
const itemBtnEndReplace = `{item.status || 'Bestil'}
                                                                    </button>)}`;
content = content.replace(itemBtnEndTarget, itemBtnEndReplace);

// Also change the title:
// const MaterialList = ({ lead, profile, onUpdate }) => {
const funcDefTarget = `const MaterialList = ({ lead, profile, onUpdate }) => {`;
const funcDefReplace = `const MaterialList = ({ lead, profile, onUpdate, isLead = false }) => {`;
content = content.replace(funcDefTarget, funcDefReplace);

// Title target 
// {list.name}
const listNameTarget = `<h4 style={{ margin: '0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {list.name}
                                        </h4>`;
// Let's replace the whole list.name render. Wait, actually the header is just a generic string in some places, but for each list it is `list.name`. For the very first list, maybe it says "Materialeliste (Internt indkøb)"?
// Wait, the lists are objects, typically `list.name` is "Materialeliste (Internt indkøb)".
// Let's just do `isLead && idx === 0 ? 'Foreslået materialeliste til opgaven' : list.name`

fs.writeFileSync(file, content);
console.log("MaterialList button patch success");
