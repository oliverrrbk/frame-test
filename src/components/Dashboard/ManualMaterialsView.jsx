import React, { useState } from 'react';
import { FileText, Upload, Plus, Trash2, ExternalLink, Package, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

// ============================================================================
// ManualMaterialsView — PDF-først materialevisning for MANUELLE tilbud.
// I stedet for en redigerbar række-tabel (som beregner-sagerne) viser vi her
// de dokumenter tømreren selv har lagt ind (fx Davidsen-PDF'en), som kan åbnes
// på telefonen. Man kan tilføje flere PDF'er/bilag eller enkelte materialer.
// ============================================================================

const kr = (n) => (Number(n) || 0).toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function ManualMaterialsView({ lead, profile, onUpdate }) {
    const rd = lead.raw_data || {};
    const [pdfs, setPdfs] = useState(rd.material_pdfs || []);
    const [items, setItems] = useState((rd.material_list || []).filter(m => m && m.item));
    const [uploading, setUploading] = useState(false);
    const [newItem, setNewItem] = useState({ item: '', qty: '', unit: 'stk' });

    const budget = Number(rd.calc_data?.materialCostBase ?? rd.manual_quote?.materialCost ?? 0);

    const persist = async (patch) => {
        try {
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const merged = { ...(latest?.raw_data || rd), ...patch };
            const { error } = await supabase.from('leads').update({ raw_data: merged }).eq('id', lead.id);
            if (error) throw error;
            onUpdate && onUpdate({ ...lead, raw_data: merged });
        } catch (e) {
            toast.error('Kunne ikke gemme: ' + (e.message || e));
        }
    };

    const handleUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'pdf';
            const fn = `manual_${lead.id}_doc_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('uploads').upload(fn, file, { upsert: true, cacheControl: '0' });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fn);
            const next = [...pdfs, { id: uid(), name: file.name, url: publicUrl, date: new Date().toISOString() }];
            setPdfs(next);
            await persist({ material_pdfs: next });
            toast.success('Bilag tilføjet.');
        } catch (e) {
            toast.error('Upload fejlede: ' + (e.message || e));
        } finally {
            setUploading(false);
        }
    };

    const removePdf = async (id) => {
        const next = pdfs.filter(p => p.id !== id);
        setPdfs(next);
        await persist({ material_pdfs: next });
    };

    const addItem = async () => {
        if (!newItem.item.trim()) return;
        const next = [...items, { ...newItem, listId: 'manual' }];
        setItems(next);
        setNewItem({ item: '', qty: '', unit: 'stk' });
        await persist({ material_list: next });
    };

    const removeItem = async (idx) => {
        const next = items.filter((_, i) => i !== idx);
        setItems(next);
        await persist({ material_list: next });
    };

    const card = { background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e6e1' };

    return (
        <div className="case-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Budget */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(135deg,#eff6ff,#fff)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={22} color="#2563eb" /></div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Materialebudget (indkøbspris)</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{kr(budget)} kr</div>
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '260px' }}>Forbrug spores under fanen <strong>Bilag</strong>, hvor du lægger dine kvitteringer ind.</div>
            </div>

            {/* Dokumenter (PDF-først) */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} color="#3b82f6" /> Materialeliste & bilag</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                        {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} Tilføj PDF/bilag
                        <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} disabled={uploading} onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                </div>

                {pdfs.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                        Ingen dokumenter endnu. Læg fx din liste fra Davidsen ind med knappen ovenfor.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pdfs.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={20} color="#dc2626" /></div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Dokument'}</div>
                                    {p.amount ? <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{kr(p.amount)} kr</div> : null}
                                </div>
                                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                                    <ExternalLink size={15} /> Åbn
                                </a>
                                <button onClick={() => removePdf(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Enkelte materialer (valgfrit) */}
            <div style={card}>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} color="#64748b" /> Ekstra materialer (valgfrit)</h4>
                {items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {items.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                                <span style={{ flex: 1, color: '#0f172a', fontWeight: 600 }}>{m.item}</span>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{m.qty} {m.unit}</span>
                                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })} placeholder="Materiale" style={{ flex: 3, minWidth: '160px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <input value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} placeholder="Antal" style={{ flex: 1, minWidth: '70px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="stk" style={{ width: '70px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <button onClick={addItem} style={{ padding: '11px 18px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Tilføj</button>
                </div>
            </div>
        </div>
    );
}
