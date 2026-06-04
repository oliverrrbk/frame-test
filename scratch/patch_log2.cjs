const fs = require('fs');
const file = 'src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `{bArr.length === 0 ? (
                                                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>`;

const endStr = `                                                                                </div>
                                                                            </details>
                                                                        );
                                                                    })()
                                                                )}`;

const startIndex = content.indexOf(targetStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `{bArr.length === 0 ? (
                                                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>
                                                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                                                            Denne beregning er foretaget automatisk baseret på vores indbyggede branchespecifikke formler. Beregningen tager højde for estimeret arbejdstid, gennemsnitlige materialepriser, forventet spild og nødvendigt tilbehør (såsom beslag og fugematerialer).
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <details style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', marginTop: '24px', overflow: 'hidden' }}>
                                                                        <summary style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            Detaljeret Begrundelse (Log)
                                                                        </summary>
                                                                        {calc && (
                                                                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Arbejdsløn (Timer)</div>
                                                                                    <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>~{(calc.totalLaborCost || 0).toLocaleString('da-DK')} kr.</div>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>({calc.totalLaborHours} timer á {settingsData.hourly_rate} kr.)</div>
                                                                                </div>
                                                                                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Materialer (Indkøb inkl. avance)</div>
                                                                                    <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>~{(calc.materialCost || 0).toLocaleString('da-DK')} kr.</div>
                                                                                </div>
                                                                                {((calc.drivingCost || 0) + (calc.externalLeaseCost || 0) > 0) && (
                                                                                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Kørsel & Maskinleje</div>
                                                                                    <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>~{((calc.drivingCost || 0) + (calc.externalLeaseCost || 0)).toLocaleString('da-DK')} kr.</div>
                                                                                </div>
                                                                                )}
                                                                                {(calc.hiddenBuffer > 0) && (
                                                                                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Logistik & Risiko-buffer</div>
                                                                                    <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>~{(calc.hiddenBuffer || 0).toLocaleString('da-DK')} kr.</div>
                                                                                </div>
                                                                                )}
                                                                                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '8px', marginTop: '4px' }}>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>System-afrunding (Tilbud)</div>
                                                                                    <div style={{ fontSize: '1.2rem', color: '#15803d', fontWeight: 'bold' }}>{Math.ceil(calc.strictPrice / 1000) * 1000} kr.</div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </details>
                                                                )}`;
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Log patch success");
} else {
    console.log("Log patch fail", startIndex, endIndex);
}
