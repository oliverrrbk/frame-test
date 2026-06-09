import os
import re

file_path = "/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/src/components/Drawings/DrawingsGallery.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { PlusSquare, PenTool, Trash2, Calendar, FileText, X, FolderOutput, FileDown, Search, Check } from 'lucide-react';",
    "import { PlusSquare, PenTool, Trash2, Calendar, FileText, X, FolderOutput, FileDown, Search, Check, ArrowLeft, Folder, Tag } from 'lucide-react';\nimport GorgeousSingleSelect from '../Dashboard/GorgeousSingleSelect';"
)

# 2. State
state_replacement = """    const [assigningDrawingId, setAssigningDrawingId] = useState(null);
    const [leadSearch, setLeadSearch] = useState('');
    const [selectedFolderLeadId, setSelectedFolderLeadId] = useState(null);

    const handleTagChange = async (drawingId, newTag) => {
        try {
            const drawing = drawings.find(d => d.id === drawingId);
            if (!drawing) return;
            const currentData = drawing.document_data || {};
            const newData = { ...currentData, tag: newTag };
            const { error } = await supabase.from('drawings').update({ document_data: newData }).eq('id', drawingId);
            if (error) throw error;
            setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, document_data: newData } : d));
            toast.success("Etiket opdateret");
        } catch (err) {
            console.error("Fejl:", err);
            toast.error("Kunne ikke gemme etiket.");
        }
    };

    const tagOptions = [
        { value: 'Standardtegning', label: 'Standardtegning' },
        { value: 'Inspiration', label: 'Inspiration' },
        { value: 'Hurtigt overslag', label: 'Hurtigt overslag' },
        { value: 'Privat/Sjov', label: 'Privat/Sjov' }
    ];"""

content = content.replace(
    "    const [assigningDrawingId, setAssigningDrawingId] = useState(null);\n    const [leadSearch, setLeadSearch] = useState('');",
    state_replacement
)

# We need to extract the drawing card rendering block to reuse it.
# The card rendering starts at: "<div \n                            key={drawing.id}\n                            onClick={() => handleOpenDrawing(drawing.id)}"
# And ends at the end of the drawing mapping.

# Let's replace the whole rendering part for the loaded state.
# We will find:
#             ) : (
#                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
#                     {drawings.map(drawing => (

rendering_replacement = """            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* HVIS VI ER INDE I EN SAG ELLER HAR VALGT EN MAPPE */}
                    {(leadId || selectedFolderLeadId) ? (
                        <div>
                            {!leadId && (
                                <button 
                                    onClick={() => setSelectedFolderLeadId(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.05rem', fontWeight: 600, padding: 0 }}
                                >
                                    <ArrowLeft size={20} /> Tilbage til Sagsmapper
                                </button>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                {drawings.filter(d => d.lead_id === (leadId || selectedFolderLeadId)).map(drawing => renderDrawingCard(drawing))}
                            </div>
                        </div>
                    ) : (
                        /* HVIS VI ER I DET GENERELLE BIBLIOTEK (Mit Skitse-bibliotek) */
                        <>
                            {/* SEKTION 1: SAGSMAPPER */}
                            <div>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Folder color="#2563eb" /> Tilknyttede Sager
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {Object.entries(drawings.reduce((acc, d) => {
                                        if (d.lead_id) {
                                            if (!acc[d.lead_id]) acc[d.lead_id] = { leadId: d.lead_id, count: 0, lead: allLeads.find(l => l.id === d.lead_id) || d.leads, latestDate: d.created_at };
                                            acc[d.lead_id].count++;
                                        }
                                        return acc;
                                    }, {})).map(([fId, folder]) => (
                                        <div 
                                            key={fId}
                                            onClick={() => setSelectedFolderLeadId(fId)}
                                            style={{
                                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                                                cursor: 'pointer', padding: '24px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                                display: 'flex', flexDirection: 'column', gap: '12px'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03)';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ padding: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '12px', color: '#2563eb' }}>
                                                    <Folder size={32} />
                                                </div>
                                                <span style={{ padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                    {folder.count} tegning{folder.count !== 1 ? 'er' : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 700 }}>
                                                    Sag: {String(folder.leadId).substring(0,8)}
                                                </h4>
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                                    Sidste tegning: {format(new Date(folder.latestDate), 'd. MMM yyyy', { locale: da })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />

                            {/* SEKTION 2: LØSE KLADDER */}
                            <div>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PenTool color="#d97706" /> Skrivebordet (Løse Kladder)
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {drawings.filter(d => !d.lead_id).map(drawing => renderDrawingCard(drawing))}
                                </div>
                            </div>
                        </>
                    )}
                </div>"""

# We need to extract the existing drawing map logic and wrap it in a function `renderDrawingCard(drawing) { return ( ... ) }`
# We'll put this function right before the return statement of DrawingsGallery.

# Regex to find the whole return block and inject `renderDrawingCard`.
# The current rendering maps `drawings.map(drawing => (` ...
# We need to capture from `<div \n                            key={drawing.id}` up to the closing tags before `drawingToDelete` portal.

start_card = "                    {drawings.map(drawing => ("
end_card = "                    ))}\n                </div>\n            )}\n            \n            {drawingToDelete"

parts = content.split(start_card)
if len(parts) == 2:
    pre = parts[0]
    post = parts[1]
    
    parts2 = post.split(end_card)
    card_html = parts2[0]
    rest_html = "            {drawingToDelete" + parts2[1]
    
    # We need to inject the GorgeousSingleSelect for tags into the card_html
    tag_html = """
                                {/* Etiketter (Tags) */}
                                {!drawing.lead_id && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <Tag size={14} /> Etiket
                                        </div>
                                        <GorgeousSingleSelect 
                                            options={tagOptions}
                                            value={drawing.document_data?.tag || ''}
                                            onChange={(val) => handleTagChange(drawing.id, val)}
                                            placeholder="Vælg etiket..."
                                            icon={<Tag size={16} />}
                                            colorTheme="#f59e0b"
                                        />
                                    </div>
                                )}
    """
    
    # Insert tag_html right above the Actions Bar
    card_html = card_html.replace("{/* Actions Bar - Gorgeous 2026 Style */}", tag_html + "\n                                {/* Actions Bar - Gorgeous 2026 Style */}")
    
    render_func = f"""
    const renderDrawingCard = (drawing) => (
        {card_html.strip()}
    );
    """
    
    # Let's insert render_func right before `if (isBoardOpen) {`
    pre = pre.replace("    if (isBoardOpen) {", render_func + "\n    if (isBoardOpen) {")
    
    # Let's replace the grid rendering with our new logic
    # Find `            ) : (` in pre, and we can replace from there.
    
    pre_parts = pre.split("            ) : drawings.length === 0 ? (")
    final_content = pre_parts[0] + "            ) : drawings.length === 0 ? (" + pre_parts[1].split("            ) : (\n                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>")[0] + rendering_replacement + "\n" + rest_html
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_content)
    print("Success")
else:
    print("Could not find boundaries")
