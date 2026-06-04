const fs = require('fs');
const file = 'src/components/Dashboard/MaterialList.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<input 
                                            type="text"
                                            value={list.name}
                                            onChange={(e) => handleUpdateListMeta(list.id, 'name', e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={() => handleSaveList()}`;
                                            
const replacementStr = `<input 
                                            type="text"
                                            value={isLead ? 'Foreslået materialeliste til opgaven' : list.name}
                                            readOnly={isLead}
                                            onChange={(e) => {
                                                if (!isLead) handleUpdateListMeta(list.id, 'name', e.target.value);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={() => {
                                                if (!isLead) handleSaveList();
                                            }}`;

content = content.replace(targetStr, replacementStr);

const subheadTarget = `{listMaterials.length} materialer &bull; {listMaterials.filter(m => m.status === 'Bestilt' || m.status === 'Leveret').length} bestilt`;
const subheadReplace = `{listMaterials.length} materialer {!isLead && <span>&bull; {listMaterials.filter(m => m.status === 'Bestilt' || m.status === 'Leveret').length} bestilt</span>}`;
content = content.replace(subheadTarget, subheadReplace);

fs.writeFileSync(file, content);
console.log("MaterialList name patch success");
