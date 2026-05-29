import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Plus, Trash2, Download, Save, PlusCircle, Check, Loader2, Mail } from 'lucide-react';
import { generateMaterialList } from '../../utils/materialGenerator';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const MaterialList = ({ lead, profile, onUpdate }) => {
    const [materials, setMaterials] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState({
        address: lead.address || '',
        date: '',
        notes: ''
    });

    const [newItem, setNewItem] = useState({
        item: '',
        qty: '',
        unit: 'stk',
        section: 'Hovedmaterialer'
    });
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);

    useEffect(() => {
        if (lead) {
            // Hent eksisterende liste eller generer en ny
            const existingList = lead.raw_data?.material_list;
            if (existingList && existingList.length > 0) {
                setMaterials(existingList);
            } else {
                const generated = generateMaterialList(
                    lead.project_category,
                    {
                        ...(lead.raw_data?.details || {}),
                        projects: lead.raw_data?.projects,
                        isKombi: lead.project_category === 'Kombi-projekt' || lead.raw_data?.calc_data?.isKombi
                    },
                    lead.raw_data?.details?.amount || lead.raw_data?.details?.area || lead.raw_data?.details?.qty || 0
                );
                setMaterials(generated);
            }

            // Hent leveringsinfo
            if (lead.raw_data?.delivery_info) {
                setDeliveryInfo(lead.raw_data.delivery_info);
            }
        }
    }, [lead]);

    const handleCellChange = (index, field, value) => {
        const updated = [...materials];
        updated[index] = {
            ...updated[index],
            [field]: field === 'qty' ? (parseFloat(value) || 0) : value
        };
        setMaterials(updated);
    };

    const handleDeleteItem = (index) => {
        const updated = materials.filter((_, idx) => idx !== index);
        setMaterials(updated);
        toast.success('Materiale fjernet fra listen');
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!newItem.item || !newItem.qty) {
            toast.error('Udfyld venligst varenavn og mængde');
            return;
        }

        const added = {
            item: newItem.item,
            qty: parseFloat(newItem.qty) || 1,
            unit: newItem.unit,
            section: newItem.section,
            status: 'Ikke bestilt'
        };

        setMaterials([...materials, added]);
        setNewItem({
            item: '',
            qty: '',
            unit: 'stk',
            section: 'Hovedmaterialer'
        });
        toast.success('Materiale tilføjet til listen');
    };

    const handleSaveList = async () => {
        setIsSaving(true);
        try {
            const updatedRawData = {
                ...(lead.raw_data || {}),
                material_list: materials,
                delivery_info: deliveryInfo
            };

            // DB Update med in-memory fallback
            const { error } = await supabase
                .from('leads')
                .update({ raw_data: updatedRawData })
                .eq('id', lead.id);

            if (error) throw error;

            toast.success('Materialelisten er gemt på sagen!');
            if (onUpdate) {
                onUpdate({
                    ...lead,
                    raw_data: updatedRawData
                });
            }
        } catch (err) {
            console.error('Kunne ikke gemme materialelisten:', err);
            // Fallback til localStorage
            try {
                const localKey = `lead_material_list_${lead.id}`;
                localStorage.setItem(localKey, JSON.stringify({ materials, deliveryInfo }));
                toast.success('Materialelisten gemt lokalt (Local Storage Fallback)');
            } catch (localErr) {
                toast.error('Kunne ikke gemme materialelisten');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPdf = () => {
        try {
            toast.loading("Genererer materialebestilling...", { id: "pdf_generation" });
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Definer farvepalette
            const brandColor = [26, 26, 26]; // bison grafit #1a1a1a
            const secondaryColor = [107, 114, 128]; // #6b7280
            
            // Header: Firma info
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('MATERIALEBESTILLING', 14, 20);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            pdf.text(`Firma: ${profile?.company_name || 'Bison Frame Partner'}`, 14, 26);
            pdf.text(`CVR: ${profile?.cvr || 'Ikke angivet'}`, 14, 31);
            pdf.text(`Tlf: ${profile?.phone || 'Ikke angivet'} | E-mail: ${profile?.email || 'Ikke angivet'}`, 14, 36);
            
            // Linje under header
            pdf.setDrawColor(232, 230, 225);
            pdf.setLineWidth(0.5);
            pdf.line(14, 40, 196, 40);
            
            // Modtager & Levering
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('Leveringsoplysninger:', 14, 48);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`Projektadresse: ${deliveryInfo.address || 'Se sagen'}`, 14, 54);
            pdf.text(`Ønsket levering: ${deliveryInfo.date ? new Date(deliveryInfo.date).toLocaleDateString('da-DK') : 'Hurtigst muligt'}`, 14, 59);
            pdf.text(`Sags-ref: Lead #${String(lead.id).substring(0, 8)} (${lead.owner_name || 'Kunde'})`, 14, 64);
            
            if (deliveryInfo.notes) {
                pdf.text(`Bemærkninger til fragtmand: ${deliveryInfo.notes}`, 14, 69);
            }
            
            // Linje under levering
            pdf.line(14, 74, 196, 74);
            
            // Tabel Header
            let y = 82;
            pdf.setFillColor(243, 241, 237);
            pdf.rect(14, y, 182, 8, 'F');
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('Varebeskrivelse / Varenavn', 16, y + 5.5);
            pdf.text('Mængde', 130, y + 5.5);
            pdf.text('Enhed', 155, y + 5.5);
            pdf.text('Plukket', 180, y + 5.5);
            
            y += 8;
            
            // Grupper materialer efter sektioner
            const sections = ['Hovedmaterialer', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Underlag & Tilbehør', 'Afslutning', 'Forbrugsstoffer & Værktøj'];
            
            sections.forEach(sec => {
                const secItems = materials.filter(m => m.section === sec);
                if (secItems.length === 0) return;
                
                // Tegn Sektions-overskrift hvis der er plads på siden
                if (y > 260) {
                    pdf.addPage();
                    y = 20;
                }
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9.5);
                pdf.setTextColor(0, 0, 0);
                pdf.text(sec.toUpperCase(), 14, y + 6);
                
                pdf.setDrawColor(200, 200, 200);
                pdf.line(14, y + 8, 196, y + 8);
                
                y += 10;
                
                // Rendre elementerne
                secItems.forEach(item => {
                    if (y > 270) {
                        pdf.addPage();
                        y = 20;
                    }
                    
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(50, 50, 50);
                    
                    // Håndter lange navne
                    const splitTitle = pdf.splitTextToSize(item.item, 110);
                    pdf.text(splitTitle, 16, y + 4);
                    
                    pdf.text(String(item.qty), 130, y + 4);
                    pdf.text(String(item.unit), 155, y + 4);
                    
                    // Plukke-tjekboks
                    pdf.rect(182, y + 1, 4, 4); 
                    
                    const rowHeight = splitTitle.length * 5;
                    y += Math.max(rowHeight, 8);
                    
                    // Tegn tynd skillelinje
                    pdf.setDrawColor(240, 240, 240);
                    pdf.line(14, y, 196, y);
                    y += 2;
                });
                y += 4;
            });
            
            // Signatur
            if (y > 250) {
                pdf.addPage();
                y = 20;
            }
            
            y += 15;
            pdf.setDrawColor(180, 180, 180);
            pdf.line(14, y, 90, y);
            pdf.line(120, y, 196, y);
            
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(8);
            pdf.text('Dato & underskrift (Tømrer)', 14, y + 4);
            pdf.text('Dato & underskrift (Plukker/Trælast)', 120, y + 4);
            
            pdf.save(`Materialebestilling_Sag_${String(lead.id).substring(0,8)}.pdf`);
            toast.success("Bestillings-PDF gemt på computeren!", { id: "pdf_generation" });
        } catch (err) {
            console.error('Fejl under PDF-generering:', err);
            toast.error("Kunne ikke oprette PDF: " + err.message, { id: "pdf_generation" });
        }
    };

    const handleGenerateEmail = () => {
        const unOrdered = materials.filter(m => !m.status || m.status === 'Ikke bestilt');
        if (unOrdered.length === 0) {
            toast.success('Alle materialer er allerede bestilt eller leveret!');
            return;
        }

        let emailBody = `Hej,\n\nJeg vil gerne bestille følgende materialer til levering på ${deliveryInfo.address || 'vores byggeplads'}:\n\n`;
        emailBody += `Ønsket leveringsdato: ${deliveryInfo.date ? new Date(deliveryInfo.date).toLocaleDateString('da-DK') : 'Hurtigst muligt'}\n`;
        if (deliveryInfo.notes) {
            emailBody += `Bemærkninger: ${deliveryInfo.notes}\n`;
        }
        emailBody += `\nMATERIALER:\n`;
        
        unOrdered.forEach(m => {
            emailBody += `- ${m.qty} ${m.unit} : ${m.item}\n`;
        });

        emailBody += `\nMed venlig hilsen,\n${profile?.company_name || profile?.owner_name || 'Bison Frame Partner'}\n`;
        emailBody += `Sags-ref: Lead #${String(lead.id).substring(0, 8)}`;
        
        const mailto = `mailto:?subject=Materialebestilling - Sag #${String(lead.id).substring(0,8)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailto, '_blank');
        toast.success('Email-skabelon åbnet i dit mail-program!');
    };

    // Grupperede materialer til rendering i UI
    const groupedMaterials = {};
    materials.forEach((m, idx) => {
        const sec = m.section || 'Hovedmaterialer';
        if (!groupedMaterials[sec]) groupedMaterials[sec] = [];
        groupedMaterials[sec].push({ ...m, originalIndex: idx });
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* LEVERINGSINFO */}
            <div className="delivery-info-grid" style={{ backgroundColor: '#fafaf9', padding: '20px', borderRadius: '12px', border: '1px solid #e8e6e1' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Leverings- & Fragtoplysninger
                    </h4>
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Leveringsadresse</label>
                    <input 
                        type="text"
                        value={deliveryInfo.address}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                        placeholder="Vejnavn 42, 8000 Aarhus"
                        style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Ønsket leveringsdato</label>
                    <input 
                        type="date"
                        value={deliveryInfo.date}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, date: e.target.value })}
                        style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Bemærkninger til fragtmanden (fx 'Stilles i carporten')</label>
                    <textarea 
                        rows={2}
                        value={deliveryInfo.notes}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                        placeholder="Skriv eventuelle anvisninger til lastbilen..."
                        style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%', resize: 'vertical' }}
                    />
                </div>
            </div>

            {/* MATERIALELISTE GRID */}
            <div style={{ border: '1px solid #e8e6e1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <div className="material-list-header" style={{ padding: '16px 20px', backgroundColor: '#fafaf9', borderBottom: '1px solid #e8e6e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#1a1a1a', fontSize: '1.05rem' }}>Indkøbs- & Materialespecifikation</strong>
                    <div className="material-buttons-grid">
                        <button 
                            onClick={handleGenerateEmail}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                        >
                            <Mail size={16} /> GENERÉR BESTILLINGS-EMAIL
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b' }}
                        >
                            <Download size={16} /> DOWNLOAD PDF
                        </button>
                        <button 
                            onClick={handleSaveList}
                            disabled={isSaving}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none' }}
                        >
                            {isSaving ? 'Gemmer...' : <><Save size={16} /> GEM LISTEN PÅ SAGEN</>}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.keys(groupedMaterials).map(section => (
                        <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                                {section}
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #f1f1ef', borderRadius: '8px', overflow: 'hidden' }}>
                                {groupedMaterials[section].map((item, idx) => (
                                    <div 
                                        key={item.originalIndex}
                                        className="material-row-grid"
                                        style={{ padding: '10px 14px', borderBottom: idx === groupedMaterials[section].length - 1 ? 'none' : '1px solid #f1f1ef', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafaf9', alignItems: 'center' }}
                                    >
                                        <textarea 
                                            className="material-item-name"
                                            value={item.item}
                                            onChange={(e) => {
                                                handleCellChange(item.originalIndex, 'item', e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = 'auto';
                                                    el.style.height = el.scrollHeight + 'px';
                                                }
                                            }}
                                            rows={1}
                                            style={{ border: 'none', background: 'transparent', width: '100%', color: '#1a1a1a', fontWeight: 'bold', outline: 'none', fontSize: '1.05rem', textDecoration: item.status === 'Leveret' ? 'line-through' : 'none', opacity: item.status === 'Leveret' ? 0.6 : 1, resize: 'none', overflow: 'hidden', padding: 0 }}
                                        />
                                        <input 
                                            type="number" 
                                            value={item.qty}
                                            placeholder="Antal"
                                            onChange={(e) => handleCellChange(item.originalIndex, 'qty', e.target.value)}
                                            style={{ border: 'none', background: 'transparent', width: '100%', color: '#1a1a1a', textAlign: 'center', fontWeight: 'bold', outline: 'none', fontSize: '0.9rem', opacity: item.status === 'Leveret' ? 0.6 : 1 }}
                                        />
                                        <input 
                                            type="text" 
                                            value={item.unit}
                                            placeholder="Enhed"
                                            onChange={(e) => handleCellChange(item.originalIndex, 'unit', e.target.value)}
                                            style={{ border: 'none', background: 'transparent', width: '100%', color: '#6b7280', textAlign: 'center', outline: 'none', fontSize: '0.9rem', opacity: item.status === 'Leveret' ? 0.6 : 1 }}
                                        />
                                        <select
                                            value={item.status || 'Ikke bestilt'}
                                            onChange={(e) => handleCellChange(item.originalIndex, 'status', e.target.value)}
                                            style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#fee2e2'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#991b1b'), borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            <option value="Ikke bestilt">Ikke bestilt</option>
                                            <option value="Bestilt">Bestilt/På vej</option>
                                            <option value="Leveret">Leveret plads</option>
                                        </select>
                                        <button 
                                            onClick={() => handleDeleteItem(item.originalIndex)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Fjern række"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* TILFØJ NYT MATERIALE BAR */}
                <div style={{ padding: '16px 20px', backgroundColor: '#fafaf9', borderTop: '1px solid #e8e6e1' }}>
                    {!isAddingMaterial ? (
                        <button 
                            onClick={() => setIsAddingMaterial(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px dashed #94a3b8', color: '#475569', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', justifyContent: 'center' }}
                        >
                            <Plus size={16} /> Tilføj Nyt Materiale
                        </button>
                    ) : (
                        <form onSubmit={(e) => { handleAddItem(e); setIsAddingMaterial(false); }} className="material-add-grid" style={{ alignItems: 'center', border: '1px solid #e8e6e1', borderRadius: '12px', backgroundColor: '#ffffff', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, color: '#1a1a1a', fontSize: '1rem' }}>Tilføj Materiale</h4>
                                <button type="button" onClick={() => setIsAddingMaterial(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>&times;</button>
                            </div>
                            <input 
                                type="text"
                                value={newItem.item}
                                onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                                placeholder="Tilføj nyt materiale... (fx Reglar 45x95 C18)"
                                style={{ border: '1px solid #e8e6e1', padding: '10px 12px', borderRadius: '6px', fontSize: '0.95rem', width: '100%' }}
                            />
                            <input 
                                type="number"
                                step="any"
                                value={newItem.qty}
                                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                                placeholder="Mængde"
                                style={{ border: '1px solid #e8e6e1', padding: '10px 12px', borderRadius: '6px', fontSize: '0.95rem', width: '100%' }}
                            />
                            <input 
                                type="text"
                                value={newItem.unit}
                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                placeholder="Enhed (fx stk)"
                                style={{ border: '1px solid #e8e6e1', padding: '10px 12px', borderRadius: '6px', fontSize: '0.95rem', width: '100%' }}
                            />
                            <select
                                value={newItem.section}
                                onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                                style={{ border: '1px solid #e8e6e1', padding: '10px 12px', borderRadius: '6px', fontSize: '0.95rem', backgroundColor: 'white', width: '100%' }}
                            >
                                <option value="Hovedmaterialer">Hovedmat.</option>
                                <option value="Underkonstruktion">Underkonstr.</option>
                                <option value="Fastgørelse & Beslag">Fastgørelse</option>
                                <option value="Underlag & Tilbehør">Underlag</option>
                                <option value="Afslutning">Afslutning</option>
                                <option value="Forbyggelse & Værktøj">Forbrug/Værktøj</option>
                            </select>
                            <button 
                                type="submit"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '12px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '8px' }}
                            >
                                <Plus size={16} /> Tilføj
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MaterialList;
