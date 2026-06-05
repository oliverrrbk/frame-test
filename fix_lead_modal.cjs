const fs = require('fs');
const path = './src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the price breakdown in the top-left box
const priceRegex = /\{selectedLead\.raw_data\?\.calc_data\?\.finalEstimateIncVat \? \(\(\) => \{[\s\S]*?\}\)\(\) : <span style=\{\{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '1\.1rem' \}\}>\{selectedLead\.price_estimate\}<\/span>\}/;

const newPriceBlock = `{(() => {
    let incVat = 0, exVat = 0, vat = 0;
    let hasData = false;

    if (selectedLead.raw_data?.calc_data?.finalEstimateIncVat) {
        incVat = selectedLead.raw_data.calc_data.finalEstimateIncVat;
        exVat = selectedLead.raw_data.calc_data.finalEstimateExVat;
        vat = incVat - exVat;
        hasData = true;
    } else if (selectedLead.project_category === 'special' && selectedLead.price_estimate) {
        exVat = parseFloat(selectedLead.price_estimate.replace(/[^0-9,-]/g, '').replace(',', '.'));
        if (!isNaN(exVat)) {
            vat = exVat * 0.25;
            incVat = exVat + vat;
            hasData = true;
        }
    }

    if (hasData) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.8 }}>Ekskl. moms:</span>
                    <span>{exVat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.8 }}>Moms (25%):</span>
                    <span>{vat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bfdbfe', paddingTop: '6px', marginTop: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: '#1d4ed8' }}>
                    <span>Inkl. moms:</span>
                    <span>{incVat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
            </>
        );
    }
    
    return <span style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '1.1rem' }}>{selectedLead.price_estimate}</span>;
})()}`;

if (content.match(priceRegex)) {
    content = content.replace(priceRegex, newPriceBlock);
    console.log('Successfully replaced price breakdown.');
} else {
    console.error('Could not find priceRegex');
}

// 2. Make the category name editable for 'special' leads
const categoryRegex = /<p style=\{\{ margin: '4px 0 12px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '1\.1rem' \}\}>\s*\{selectedLead\.project_category === 'special' \? \(selectedLead\.raw_data\?\.details\?\.title \|\| 'Skræddersyet Opgave'\) : \(categoryNames\[selectedLead\.project_category\] \|\| selectedLead\.project_category\)\}\s*<\/p>/;

const newCategoryBlock = `<div style={{ margin: '4px 0 12px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '1.1rem', position: 'relative' }}>
    {selectedLead.project_category === 'special' ? (
        <input 
            type="text" 
            defaultValue={selectedLead.raw_data?.details?.title || 'Skræddersyet Opgave'}
            onBlur={async (e) => {
                const newTitle = e.target.value.trim();
                if (newTitle && newTitle !== (selectedLead.raw_data?.details?.title || 'Skræddersyet Opgave')) {
                    const newRawData = { ...selectedLead.raw_data, details: { ...selectedLead.raw_data?.details, title: newTitle } };
                    const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', selectedLead.id);
                    if (!error) {
                        setSelectedLead({ ...selectedLead, raw_data: newRawData });
                        setLeadsData(prev => prev.map(l => l.id === selectedLead.id ? { ...l, raw_data: newRawData } : l));
                        toast.success('Kategori/Titel opdateret');
                    }
                }
            }}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #d1d5db', borderRadius: '4px', padding: '2px 4px', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', outline: 'none' }}
            onFocus={(e) => e.target.style.border = '1px solid #3b82f6'}
            onMouseLeave={(e) => { if (document.activeElement !== e.target) e.target.style.border = '1px dashed transparent'; }}
            onMouseEnter={(e) => { if (document.activeElement !== e.target) e.target.style.border = '1px dashed #d1d5db'; }}
            title="Klik for at redigere"
        />
    ) : (
        <p style={{ margin: 0 }}>{categoryNames[selectedLead.project_category] || selectedLead.project_category}</p>
    )}
</div>`;

if (content.match(categoryRegex)) {
    content = content.replace(categoryRegex, newCategoryBlock);
    console.log('Successfully replaced category editing.');
} else {
    console.error('Could not find categoryRegex');
}

fs.writeFileSync(path, content);
