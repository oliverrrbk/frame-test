const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard/CaseManagement.jsx', 'utf8');

// 1. Add budget calculations
const calcRegex = /const materialListForOverview = selectedCase\?\.raw_data\?\.material_list \|\| \[\];/;
const calcInsert = `const originalBudget = parseFloat(selectedCase?.raw_data?.calc_data?.materialCost) || 0;
    const materialListsMeta = selectedCase?.raw_data?.material_lists_meta || [];
    const totalSpent = materialListsMeta.reduce((sum, list) => sum + (parseFloat(list.price) || 0), 0);
    const budgetRemaining = originalBudget - totalSpent;
    const isOverBudget = budgetRemaining < 0;

    const materialListForOverview = selectedCase?.raw_data?.material_list || [];`;
content = content.replace(calcRegex, calcInsert);

// 2. Add budget UI to the Materialer card
const cardRegex = /Mangler bestilling: \{notOrderedMaterials\}\n\s*<\/div>\n\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '500' \}\}>\n\s*<div style=\{\{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' \}\} \/>\n\s*Leveret: \{deliveredMaterials\}\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/;

const cardUIInsert = `Mangler bestilling: {notOrderedMaterials}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '500' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                                    Leveret: {deliveredMaterials}
                                </div>
                            </div>

                            {/* Budget Oversigt */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Forbrugt / Budget</div>
                                        <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold' }}>{totalSpent.toLocaleString('da-DK')} <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '0.8rem' }}>/ {originalBudget.toLocaleString('da-DK')} kr.</span></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Restbudget</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isOverBudget ? '#ef4444' : '#10b981' }}>{budgetRemaining > 0 ? '+' : ''}{budgetRemaining.toLocaleString('da-DK')} kr.</div>
                                    </div>
                                </div>
                            )}
                        </div>`;
content = content.replace(cardRegex, cardUIInsert);

fs.writeFileSync('src/components/Dashboard/CaseManagement.jsx', content);
