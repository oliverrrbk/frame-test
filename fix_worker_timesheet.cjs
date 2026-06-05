const fs = require('fs');
const path = './src/components/Dashboard/WorkerTimesheet.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Initial Form Data
content = content.replace(
    /const \[formData, setFormData\] = useState\(\{[^}]+\}\);/m,
`const [formData, setFormData] = useState({ 
        date: new Date().toISOString().substring(0, 10), 
        regType: 'project',
        leadId: '', 
        absenceType: 'Sygdom',
        desc: '', 
        hours: '', 
        km: '', 
        startTime: '07:00', 
        endTime: '15:00',
        pauseMinutes: '30'
    });`
);

// 2. Auto-beregning
content = content.replace(
    /\/\/ Auto-beregn timer ud fra start og slut[\s\S]*?\}, \[formData\.startTime, formData\.endTime\]\);/,
`// Auto-beregn timer ud fra start og slut og pause
    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const [sH, sM] = formData.startTime.split(':').map(Number);
            const [eH, eM] = formData.endTime.split(':').map(Number);
            let diffHours = (eH + eM/60) - (sH + sM/60);
            if (diffHours < 0) diffHours += 24; // If crossing midnight
            
            const pauseHours = (parseInt(formData.pauseMinutes) || 0) / 60;
            let finalHours = diffHours - pauseHours;
            if (finalHours < 0) finalHours = 0;
            
            setFormData(prev => ({ ...prev, hours: (Math.round(finalHours * 4) / 4).toString() }));
        }
    }, [formData.startTime, formData.endTime, formData.pauseMinutes]);`
);

// 3. activeWorkerCases
content = content.replace(
    /const activeWorkerCases = useMemo\(\(\) => \{[\s\S]*?\}, \[leadsData, myProfile, simulatedRole\]\);/,
`const activeWorkerCases = useMemo(() => {
        return leadsData.filter(lead => {
            const workers = lead.raw_data?.assigned_workers || [];
            return workers.includes(myProfile?.id) && ['Bekræftet opgave', 'Historik'].includes(lead.status || '');
        });
    }, [leadsData, myProfile]);`
);

// 4. handleSaveEntry
content = content.replace(
    /if \(!formData\.leadId\) return toast\.error\('Vælg en sag eller internt fravær'\);/,
`if (formData.regType === 'project' && !formData.leadId) return toast.error('Vælg venligst en sag');`
);

content = content.replace(
    /const finalEntry = \{[\s\S]*?km: formData\.km \? parseFloat\(formData\.km\) : 0\n        \};/,
`const finalEntry = {
            id: isAdding ? \`time-\${Date.now()}\` : editingEntry.id,
            startTime: formData.startTime || '',
            endTime: formData.endTime || '',
            pauseMinutes: parseInt(formData.pauseMinutes) || 0,
            hours: parseFloat(formData.hours) || 0,
            date: formData.date,
            desc: formData.desc || '',
            employeeId: myProfile.id,
            employeeName: myProfile.owner_name || myProfile.company_name || 'Ukendt',
            km: formData.km ? parseFloat(formData.km) : 0
        };`
);

content = content.replace(
    /if \(formData\.leadId === 'internal'\) \{/g,
    `if (formData.regType === 'internal') {`
);

content = content.replace(
    /finalEntry\.absenceType = formData\.desc \|\| 'Internt';/,
    `finalEntry.absenceType = formData.absenceType || 'Internt';`
);

// 5. openEdit
content = content.replace(
    /const openEdit = \(entry\) => \{[\s\S]*?setEditingEntry\(entry\);\n        setIsAdding\(false\);\n    \};/,
`const openEdit = (entry) => {
        const isInternal = entry.leadId === 'internal';
        setFormData({
            date: entry.date || '',
            regType: isInternal ? 'internal' : 'project',
            leadId: isInternal ? '' : (entry.leadId || ''),
            absenceType: isInternal ? (entry.absenceType || entry.desc || 'Sygdom') : 'Sygdom',
            desc: entry.desc || '',
            hours: entry.hours || '',
            km: entry.km || '',
            startTime: entry.startTime || '',
            endTime: entry.endTime || '',
            pauseMinutes: entry.pauseMinutes !== undefined ? String(entry.pauseMinutes) : '0'
        });
        setEditingEntry(entry);
        setIsAdding(false);
    };`
);

// 6. openAdd
content = content.replace(
    /const openAdd = \(\) => \{[\s\S]*?setIsAdding\(true\);\n        setEditingEntry\(null\);\n    \};/,
`const openAdd = () => {
        setFormData({ 
            date: new Date().toISOString().substring(0, 10), 
            regType: 'project',
            leadId: '', 
            absenceType: 'Sygdom',
            desc: '', 
            hours: '', 
            km: '', 
            startTime: '07:00', 
            endTime: '15:00',
            pauseMinutes: '30'
        });
        setIsAdding(true);
        setEditingEntry(null);
    };`
);

// 7. Form UI
content = content.replace(
    /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '6px' \}\}>\n\s*<label style=\{\{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' \}\}>Sag \/ Projekt \/ Internt Fravær<\/label>[\s\S]*?<\/div>[\s]*<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' \}\}>/,
`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Kategori</label>
                                    <CustomSelect 
                                        value={formData.regType}
                                        onChange={(val) => {
                                            setFormData({...formData, regType: val, leadId: ''});
                                        }}
                                        options={[
                                            { value: 'project', label: 'Sag / Projekt' },
                                            { value: 'internal', label: 'Internt Fravær' }
                                        ]}
                                    />
                                </div>
                                
                                {formData.regType === 'project' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Vælg Sag</label>
                                        <CustomSelect 
                                            value={formData.leadId}
                                            onChange={(val) => setFormData({...formData, leadId: val})}
                                            placeholder="-- Vælg Sag --"
                                            options={activeWorkerCases.length > 0 ? activeWorkerCases.map(l => ({ value: l.id, label: \`Sag \${l.case_number || String(l.id).substring(0,6)} - \${l.customer_name}\` })) : [{ value: '', label: 'Ingen aktive sager' }]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Type Fravær</label>
                                        <CustomSelect 
                                            value={formData.absenceType}
                                            onChange={(val) => setFormData({...formData, absenceType: val})}
                                            options={[
                                                { value: 'Sygdom', label: 'Sygdom' },
                                                { value: 'Ferie', label: 'Ferie' },
                                                { value: 'Skole', label: 'Skole / Uddannelse' },
                                                { value: 'Møde', label: 'Møde / Kontor' },
                                                { value: 'Værksted', label: 'Værksted / Oprydning' }
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '16px' }}>`
);

content = content.replace(
    /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '6px' \}\}>\n\s*<label style=\{\{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' \}\}>Totale Timer \*<\/label>/,
`<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Pause (min.)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="F.eks. 30"
                                        value={formData.pauseMinutes}
                                        onChange={(e) => setFormData({...formData, pauseMinutes: e.target.value})}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Totale Timer *</label>`
);

content = content.replace(
    /placeholder=\{formData\.leadId === 'internal' \? "F\.eks\. 'Sygdom', 'Ferie', 'Værksted'" : "F\.eks\. 'Opsat gipslofter og spartlet'"\}/,
    `placeholder={formData.regType === 'internal' ? "Valgfri note til fraværet..." : "F.eks. 'Opsat gipslofter og spartlet'"}`
);

fs.writeFileSync(path, content);
console.log('WorkerTimesheet updated.');
