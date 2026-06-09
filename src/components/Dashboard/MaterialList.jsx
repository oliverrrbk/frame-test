import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import { Plus, Trash2, Download, Save, PlusCircle, Check, Loader2, Mail, ChevronDown, ChevronUp, FolderPlus, Truck, Upload, FileText, ExternalLink, Calculator, Send, AlertTriangle, CheckCircle, Package, ArrowRight, Printer, Info, CreditCard, Minus, MapPin } from 'lucide-react';
import { generateMaterialList } from '../../utils/materialGenerator';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const MaterialList = ({ lead, profile, onUpdate, isLead = false }) => {
    const [materials, setMaterials] = useState([]);
    const [materialListsMeta, setMaterialListsMeta] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [openLists, setOpenLists] = useState({});

    const [deliveryInfo, setDeliveryInfo] = useState({
        address: lead.customer_address || '',
        date: '',
        notes: ''
    });
    const [isDeliveryOpen, setIsDeliveryOpen] = useState(!lead.customer_address && (!lead.raw_data?.delivery_info?.address));

    const [addingToList, setAddingToList] = useState(null);
    const [newItem, setNewItem] = useState({
        item: '',
        qty: '',
        unit: 'stk',
        section: 'Hovedmaterialer'
    });
    const [listToDelete, setListToDelete] = useState(null);

    useEffect(() => {
        if (lead) {
            // Hent eksisterende liste eller generer en ny
            const existingList = lead.raw_data?.material_list;
            if (existingList && existingList.length > 0) {
                setMaterials(existingList.map(m => ({ ...m, listId: m.listId || 'default' })));
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
                setMaterials(generated.map(m => ({ ...m, listId: 'default' })));
            }

            const existingMeta = lead.raw_data?.material_lists_meta;
            if (existingMeta && existingMeta.length > 0) {
                setMaterialListsMeta(existingMeta);
            } else {
                setMaterialListsMeta([{ id: 'default', name: 'Materialeliste til Opgaven', price: '' }]);
            }

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

    const handleSaveList = async (materialsToSave = materials, metaToSave = materialListsMeta) => {
        setIsSaving(true);
        try {
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const currentRawData = latestData?.raw_data || lead.raw_data || {};

            const updatedRawData = {
                ...currentRawData,
                material_list: materialsToSave,
                material_lists_meta: metaToSave,
                delivery_info: deliveryInfo
            };

            const { error } = await supabase
                .from('leads')
                .update({ raw_data: updatedRawData })
                .eq('id', lead.id);

            if (error) throw error;

            if (onUpdate) {
                onUpdate({
                    ...lead,
                    raw_data: updatedRawData
                });
            }
        } catch (err) {
            console.error('Kunne ikke gemme materialelisten:', err);
            try {
                const localKey = `lead_material_list_${lead.id}`;
                localStorage.setItem(localKey, JSON.stringify({ materials: materialsToSave, materialListsMeta: metaToSave, deliveryInfo }));
            } catch (localErr) {
                toast.error('Kunne ikke gemme materialelisten');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = (index) => {
        const updated = materials.filter((_, idx) => idx !== index);
        setMaterials(updated);
        handleSaveList(updated);
        toast.success('Materiale fjernet');
    };

    const handleToggleListOrdered = (listId) => {
        const listMaterials = materials.filter(m => m.listId === listId);
        if (listMaterials.length === 0) return;
        const isAllOrdered = listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret');
        const updated = materials.map(m => {
            if (m.listId === listId) {
                return { ...m, status: isAllOrdered ? 'Ikke bestilt' : 'Bestilt' };
            }
            return m;
        });
        setMaterials(updated);
        handleSaveList(updated);
        toast.success(isAllOrdered ? 'Bestilling annulleret' : 'Materialerne er markeret som bestilt!');
    };

    const handleMarkListDelivered = (listId) => {
        const listMaterials = materials.filter(m => m.listId === listId);
        if (listMaterials.length === 0) return;
        const isAllDelivered = listMaterials.every(m => m.status === 'Leveret');
        const updated = materials.map(m => {
            if (m.listId === listId) {
                return { ...m, status: isAllDelivered ? 'Bestilt' : 'Leveret' };
            }
            return m;
        });
        setMaterials(updated);
        handleSaveList(updated);
        toast.success(isAllDelivered ? 'Levering annulleret' : 'Alle materialer er markeret som leveret!');
    };

    const cycleItemStatus = (originalIndex) => {
        const item = materials[originalIndex];
        let newStatus = 'Bestilt';
        if (item.status === 'Bestilt') newStatus = 'Leveret';
        else if (item.status === 'Leveret') newStatus = 'Ikke bestilt';
        
        const updated = [...materials];
        updated[originalIndex] = { ...item, status: newStatus };
        setMaterials(updated);
        handleSaveList(updated);
    };

    const formatPrice = (val) => {
        if (!val) return '';
        const num = String(val).replace(/\D/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parsePrice = (val) => {
        if (!val) return '';
        return String(val).replace(/\./g, '');
    };

    const handleAddItem = (e, listId) => {
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
            status: 'Ikke bestilt',
            listId: listId
        };

        const updated = [...materials, added];
        setMaterials(updated);
        handleSaveList(updated);
        setAddingToList(null);
        setNewItem({ item: '', qty: '', unit: 'stk', section: 'Hovedmaterialer' });
        toast.success('Materiale tilføjet til listen');
    };

    const handleCreateNewList = () => {
        const newId = `list_${Date.now()}`;
        const newName = `Ekstra Bestilling ${materialListsMeta.length}`;
        const newMeta = [...materialListsMeta, { id: newId, name: newName, price: '' }];
        setMaterialListsMeta(newMeta);
        setOpenLists(prev => ({ ...prev, [newId]: true }));
        handleSaveList(materials, newMeta);
        toast.success('Ny materialeliste oprettet');
    };

    const handleDeleteListClick = (e, listId) => {
        e.stopPropagation();
        if (listId === 'default') return;
        setListToDelete(listId);
    };

    const confirmDeleteList = () => {
        if (!listToDelete) return;
        const newMeta = materialListsMeta.filter(l => l.id !== listToDelete);
        const newMaterials = materials.filter(m => m.listId !== listToDelete);
        setMaterialListsMeta(newMeta);
        setMaterials(newMaterials);
        handleSaveList(newMaterials, newMeta);
        setListToDelete(null);
        toast.success('Materialelisten blev slettet');
    };

    const handleUpdateListMeta = (listId, field, value) => {
        const newMeta = materialListsMeta.map(l => l.id === listId ? { ...l, [field]: value } : l);
        setMaterialListsMeta(newMeta);
    };

    const toggleList = (listId) => {
        setOpenLists(prev => ({ ...prev, [listId]: !prev[listId] }));
    };

    const handleDownloadPdf = (listId, listName) => {
        try {
            toast.loading("Genererer materialebestilling...", { id: "pdf_generation" });
            const listMaterials = materials.filter(m => m.listId === listId);
            if (listMaterials.length === 0) {
                toast.error("Listen er tom!");
                return;
            }

            const pdf = new jsPDF('p', 'mm', 'a4');
            const brandColor = [26, 26, 26]; 
            const secondaryColor = [107, 114, 128]; 
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('MATERIALEBESTILLING', 14, 20);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            pdf.text(`Firma: ${profile?.company_name || 'Bison Frame Partner'}`, 14, 26);
            pdf.text(`Bestilling: ${listName}`, 14, 31);
            pdf.text(`Sagsnummer: ${lead.case_number || String(lead.id).substring(0, 8)}`, 14, 36);
            
            pdf.setDrawColor(232, 230, 225);
            pdf.setLineWidth(0.5);
            pdf.line(14, 40, 196, 40);
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('Leveringsoplysninger:', 14, 48);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`Projektadresse: ${deliveryInfo.address || 'Se sagen'}`, 14, 54);
            pdf.text(`Ønsket levering: ${deliveryInfo.date ? new Date(deliveryInfo.date).toLocaleDateString('da-DK') : 'Hurtigst muligt'}`, 14, 59);
            
            if (deliveryInfo.notes) {
                pdf.text(`Bemærkninger til fragtmand: ${deliveryInfo.notes}`, 14, 64);
            }
            
            pdf.line(14, 70, 196, 70);
            
            let y = 78;
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
            
            const sections = ['Hovedmaterialer', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Underlag & Tilbehør', 'Afslutning', 'Forbrugsstoffer & Værktøj'];
            
            sections.forEach(sec => {
                const secItems = listMaterials.filter(m => m.section === sec);
                if (secItems.length === 0) return;
                
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
                
                secItems.forEach(item => {
                    if (y > 270) {
                        pdf.addPage();
                        y = 20;
                    }
                    
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(50, 50, 50);
                    
                    const splitTitle = pdf.splitTextToSize(item.item, 110);
                    pdf.text(splitTitle, 16, y + 4);
                    
                    pdf.text(String(item.qty), 130, y + 4);
                    pdf.text(String(item.unit), 155, y + 4);
                    
                    pdf.rect(182, y + 1, 4, 4); 
                    
                    const rowHeight = splitTitle.length * 5;
                    y += Math.max(rowHeight, 8);
                    
                    pdf.setDrawColor(240, 240, 240);
                    pdf.line(14, y, 196, y);
                    y += 2;
                });
                y += 4;
            });
            
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
            
            pdf.save(`Bestilling_${listName.replace(/ /g, '_')}_Sag_${lead.case_number || String(lead.id).substring(0, 8)}.pdf`);
            toast.success("Bestillings-PDF gemt!", { id: "pdf_generation" });
        } catch (err) {
            console.error('Fejl under PDF-generering:', err);
            toast.error("Kunne ikke oprette PDF: " + err.message, { id: "pdf_generation" });
        }
    };

    const handleGenerateEmail = (listId, listName) => {
        if (!deliveryInfo?.address || String(deliveryInfo.address).trim() === '') {
            toast.error("Du skal angive en leveringsadresse for at kunne bestille!");
            setIsDeliveryOpen(true);
            return;
        }
        const listMaterials = materials.filter(m => m.listId === listId);
        const unOrdered = listMaterials.filter(m => !m.status || m.status === 'Ikke bestilt');
        if (unOrdered.length === 0) {
            toast.success('Alle materialer på denne liste er allerede bestilt!');
            return;
        }

        let emailBody = `Hej,\n\nVi vil gerne bestille følgende materialer (${listName}) til levering på ${deliveryInfo.address || 'vores byggeplads'}:\n\n`;
        emailBody += `Ønsket leveringsdato: ${deliveryInfo.date ? new Date(deliveryInfo.date).toLocaleDateString('da-DK') : 'Hurtigst muligt'}\n`;
        if (deliveryInfo.notes) {
            emailBody += `Bemærkninger: ${deliveryInfo.notes}\n`;
        }
        emailBody += `\nMATERIALER:\n`;
        
        unOrdered.forEach(m => {
            emailBody += `- ${m.qty} ${m.unit} : ${m.item}\n`;
        });

        emailBody += `\nMed venlig hilsen,\n${profile?.company_name || profile?.owner_name || 'Bison Frame Partner'}\n`;
        emailBody += `Sagsnummer: ${lead.case_number || String(lead.id).substring(0, 8)}`;
        
        const mailto = `mailto:?subject=Materialebestilling (${listName}) - Sag ${lead.case_number || String(lead.id).substring(0,8)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailto, '_blank');
        toast.success('Email-skabelon åbnet!');
    };

    // Budget Calculations
    const defaultMarkup = profile?.settings?.material_markup || 1.15;
    const originalBudget = lead.raw_data?.calc_data?.materialCostBase !== undefined 
        ? parseFloat(lead.raw_data.calc_data.materialCostBase)
        : Math.round((parseFloat(lead.raw_data?.calc_data?.materialCost) || 0) / defaultMarkup);
    const supplierInvoices = lead.raw_data?.supplier_invoices || [];
    const totalSpent = supplierInvoices
        .filter(inv => inv.category === 'Materialer' || !inv.category)
        .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
    const budgetRemaining = originalBudget - totalSpent;
    const isOverBudget = budgetRemaining < 0;

    const sectionsList = ['Hovedmaterialer', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Underlag & Tilbehør', 'Afslutning', 'Forbrugsstoffer & Værktøj'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in' }}>

            {/* MATERIALELISTER (ACCORDIONS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {materialListsMeta.map((list) => {
                    const isOpen = openLists[list.id];
                    const listMaterials = materials.filter(m => m.listId === list.id);
                    
                    return (
                        <div key={list.id} style={{ 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '16px', 
                            overflow: 'hidden', 
                            backgroundColor: '#ffffff',
                            boxShadow: isOpen ? '0 12px 24px -10px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            {/* ACCORDION HEADER */}
                            <div 
                                onClick={() => toggleList(list.id)}
                                className="material-list-header"
                                style={{ 
                                    padding: '20px 24px', 
                                    backgroundColor: isOpen ? '#f8fafc' : '#ffffff', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
                                    transition: 'background-color 0.2s',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                    <div style={{ 
                                        width: '40px', height: '40px', 
                                        borderRadius: '12px', 
                                        backgroundColor: isOpen ? '#e0f2fe' : '#f1f5f9', 
                                        color: isOpen ? '#0284c7' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.3s',
                                        flexShrink: 0
                                    }}>
                                        <Package size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        {isLead ? (
                                            <div style={{ 
                                                fontSize: '1.15rem', 
                                                fontWeight: '700', 
                                                color: '#0f172a', 
                                                wordBreak: 'break-word',
                                                lineHeight: '1.3'
                                            }}>
                                                Foreslået materialeliste til opgaven
                                            </div>
                                        ) : (
                                            <input 
                                                type="text"
                                                value={list.name}
                                                readOnly={isLead}
                                                onChange={(e) => {
                                                    if (!isLead) handleUpdateListMeta(list.id, 'name', e.target.value);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={() => {
                                                    if (!isLead) handleSaveList();
                                                }}
                                                style={{ 
                                                    fontSize: '1.2rem', 
                                                    fontWeight: '700', 
                                                    color: '#0f172a', 
                                                    border: '1px solid transparent',
                                                    background: 'transparent',
                                                    padding: '4px 8px',
                                                    marginLeft: '-8px',
                                                    borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s, background-color 0.2s',
                                                    width: '100%'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                            />
                                        )}
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                            {listMaterials.length} materialer {!isLead && <span>&bull; {listMaterials.filter(m => m.status === 'Bestilt' || m.status === 'Leveret').length} bestilt</span>}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    {/* Fold ud / Skjul indikator */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
                                        <span>{isOpen ? 'Skjul' : 'Fold ud'}</span>
                                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>

                                </div>
                            </div>

                            {/* ACCORDION CONTENT */}
                            {isOpen && (
                                <div style={{ padding: '24px', backgroundColor: '#ffffff', animation: 'fadeInDown 0.3s ease-out' }}>
                                    

                                    {/* LIST METADATA (Moved from header) */}
                                    {(!isLead && profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                {/* Status Badge */}
                                                {listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret') ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                                        <Check size={16} strokeWidth={3} /> BESTILT
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }}></div> AFVENTER
                                                    </div>
                                                )}

                                                {/* Fakturapris input */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Fakturapris:</span>
                                                    <input 
                                                        type="text"
                                                        placeholder="Indtast pris..."
                                                        value={formatPrice(list.price)}
                                                        onChange={(e) => handleUpdateListMeta(list.id, 'price', parsePrice(e.target.value))}
                                                        onBlur={(e) => {
                                                            const newVal = parsePrice(e.target.value);
                                                            const newMeta = materialListsMeta.map(l => l.id === list.id ? { ...l, price: newVal } : l);
                                                            handleSaveList(materials, newMeta);
                                                        }}
                                                        style={{ width: '120px', border: '1px solid transparent', background: '#f8fafc', fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', outline: 'none', textAlign: 'right', padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s' }}
                                                        onFocus={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                    />
                                                    <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 'bold' }}>kr.</span>
                                                </div>
                                            </div>
                                            
                                            {list.id !== 'default' && (
                                                <button 
                                                    onClick={() => handleDeleteListClick({ stopPropagation: () => {} }, list.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', fontSize: '0.9rem' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                    title="Slet Ekstra Liste"
                                                >
                                                    <Trash2 size={18} /> Slet liste
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {/* ACTIONS FOR THIS LIST */}
                                    {profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: '8px', 
                                            marginBottom: '24px', 
                                            flexWrap: 'wrap',
                                            backgroundColor: '#f8fafc',
                                            padding: '8px',
                                            borderRadius: '16px',
                                            border: '1px solid #f1f5f9'
                                        }}>
                                            {!isLead && (<button 
                                                onClick={() => handleToggleListOrdered(list.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#fee2e2' : '#eff6ff', color: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret')) ? '#dc2626' : '#2563eb', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                {listMaterials.length > 0 && listMaterials.every(m => m.status === 'Bestilt' || m.status === 'Leveret') ? <><Trash2 size={16} /> Fortryd Bestilling</> : <><Check size={16} /> Markér bestilt</>}
                                            </button>)}
                                            {!isLead && (<button 
                                                onClick={() => handleMarkListDelivered(list.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Leveret')) ? '#f0fdf4' : '#10b981', color: (listMaterials.length > 0 && listMaterials.every(m => m.status === 'Leveret')) ? '#166534' : '#ffffff', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                {listMaterials.length > 0 && listMaterials.every(m => m.status === 'Leveret') ? <><Trash2 size={16} /> Fortryd Levering</> : <><Truck size={16} /> Markér alle leveret</>}
                                            </button>)}
                                            <div style={{ flex: 1 }} />
                                            <button 
                                                onClick={() => handleDownloadPdf(list.id, list.name)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#0f172a'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.color = '#475569'; }}
                                            >
                                                <Download size={16} /> Download PDF
                                            </button>
                                        </div>
                                    )}

                                    {/* GROUPED MATERIALS */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {sectionsList.map(section => {
                                            const secItems = listMaterials.filter(m => m.section === section);
                                            if (secItems.length === 0) return null;

                                            return (
                                                <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ height: '1px', flex: 1, backgroundColor: '#e2e8f0' }}></div>
                                                        {section}
                                                        <div style={{ height: '1px', flex: 1, backgroundColor: '#e2e8f0' }}></div>
                                                    </h5>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {secItems.map((item, localIdx) => {
                                                            const originalIndex = materials.findIndex(m => m === item);
                                                            return (
                                                                <div 
                                                                    key={originalIndex}
                                                                    className="material-row-grid"
                                                                    style={{ 
                                                                        padding: '12px 16px', 
                                                                        backgroundColor: '#ffffff', 
                                                                        borderRadius: '12px',
                                                                        border: '1px solid #f1f5f9',
                                                                        alignItems: 'center', 
                                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                                                    }}
                                                                    onMouseEnter={(e) => { 
                                                                        e.currentTarget.style.transform = 'translateY(-2px)'; 
                                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                                    }}
                                                                    onMouseLeave={(e) => { 
                                                                        e.currentTarget.style.transform = 'translateY(0)'; 
                                                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                                                                        e.currentTarget.style.borderColor = '#f1f5f9';
                                                                    }}
                                                                >
                                                                    <textarea 
                                                                        className="material-item-name"
                                                                        value={item.item}
                                                                        onChange={(e) => {
                                                                            handleCellChange(originalIndex, 'item', e.target.value);
                                                                            e.target.style.height = 'auto';
                                                                            e.target.style.height = e.target.scrollHeight + 'px';
                                                                        }}
                                                                        ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                                        rows={1}
                                                                        style={{ border: '1px solid transparent', background: 'transparent', width: '100%', color: '#0f172a', fontWeight: '500', outline: 'none', fontSize: '0.95rem', textDecoration: item.status === 'Leveret' ? 'line-through' : 'none', opacity: item.status === 'Leveret' ? 0.5 : 1, resize: 'none', overflow: 'hidden', padding: '4px', borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'border-color 0.2s' }}
                                                                        onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                                        onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; handleSaveList(); }}
                                                                    />
                                                                    <input 
                                                                        type="number" 
                                                                        value={item.qty}
                                                                        placeholder="Antal"
                                                                        onChange={(e) => handleCellChange(originalIndex, 'qty', e.target.value)}
                                                                        onBlur={() => handleSaveList()}
                                                                        style={{ border: '1px solid transparent', background: 'transparent', width: '100%', color: '#0f172a', textAlign: 'center', fontWeight: 'bold', outline: 'none', fontSize: '0.95rem', opacity: item.status === 'Leveret' ? 0.5 : 1, padding: '4px', borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'border-color 0.2s' }}
                                                                        onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                                    />
                                                                    <input 
                                                                        type="text" 
                                                                        value={item.unit}
                                                                        placeholder="Enhed"
                                                                        onChange={(e) => handleCellChange(originalIndex, 'unit', e.target.value)}
                                                                        onBlur={() => handleSaveList()}
                                                                        style={{ border: '1px solid transparent', background: 'transparent', width: '100%', color: '#64748b', textAlign: 'center', outline: 'none', fontSize: '0.9rem', opacity: item.status === 'Leveret' ? 0.5 : 1, padding: '4px', borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'border-color 0.2s' }}
                                                                        onFocus={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                                    />
                                                                    {!isLead && (<button
                                                                        onClick={() => cycleItemStatus(originalIndex)}
                                                                        style={{ border: 'none', background: (item.status === 'Leveret') ? '#dcfce7' : (item.status === 'Bestilt' ? '#dbeafe' : '#f1f5f9'), color: (item.status === 'Leveret') ? '#166534' : (item.status === 'Bestilt' ? '#1e40af' : '#475569'), borderRadius: '20px', padding: '6px 14px', fontSize: '0.75rem', outline: 'none', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '95px' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.filter = 'brightness(0.95)'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.filter = 'none'; }}
                                                                    >
                                                                        {item.status === 'Leveret' && <Truck size={14} />}
                                                                        {item.status === 'Bestilt' && <Check size={14} />}
                                                                        {(!item.status || item.status !== 'Leveret' && item.status !== 'Bestilt') && <div style={{width: 4, height: 4, borderRadius: '50%', backgroundColor: '#94a3b8'}}/>}
                                                                        {item.status || 'Bestil'}
                                                                    </button>)}
                                                                    <button 
                                                                        onClick={() => handleDeleteItem(originalIndex)}
                                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                                        title="Fjern række"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* TILFØJ MATERIALE TIL DENNE LISTE */}
                                    <div style={{ marginTop: '24px' }}>
                                        {addingToList !== list.id ? (
                                            <button 
                                                onClick={() => setAddingToList(list.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', width: '100%', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                            >
                                                <Plus size={16} /> Tilføj vare til listen
                                            </button>
                                        ) : (
                                            <form onSubmit={(e) => handleAddItem(e, list.id)} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc', padding: '24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 'bold' }}>Tilføj ny vare til "{list.name}"</h4>
                                                    <button type="button" onClick={() => setAddingToList(null)} style={{ background: '#e2e8f0', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.2rem', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>&times;</button>
                                                </div>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Varebeskrivelse</label>
                                                        <input 
                                                            type="text"
                                                            value={newItem.item}
                                                            onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                                                            placeholder="fx Reglar 45x95 C18..."
                                                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mængde</label>
                                                            <input 
                                                                type="number"
                                                                step="any"
                                                                value={newItem.qty}
                                                                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                                                                placeholder="Antal"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enhed</label>
                                                            <input 
                                                                type="text"
                                                                value={newItem.unit}
                                                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                                                placeholder="stk / m / rulle"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</label>
                                                        <select
                                                            value={newItem.section}
                                                            onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                                                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                                        >
                                                            <option value="Hovedmaterialer">Hovedmaterialer</option>
                                                            <option value="Underkonstruktion">Underkonstruktion</option>
                                                            <option value="Fastgørelse & Beslag">Fastgørelse & Beslag</option>
                                                            <option value="Underlag & Tilbehør">Underlag & Tilbehør</option>
                                                            <option value="Afslutning">Afslutning</option>
                                                            <option value="Forbrugsstoffer & Værktøj">Forbrugsstoffer & Værktøj</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button 
                                                    type="submit"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', fontSize: '1rem' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)'; }}
                                                >
                                                    <Plus size={20} strokeWidth={2.5} /> Tilføj Vare til Listen
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* OPRET NY LISTE KNAP */}
                <button 
                    onClick={handleCreateNewList}
                    style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                        background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', 
                        border: '2px dashed #cbd5e1', color: '#475569', 
                        padding: '20px', borderRadius: '16px', cursor: 'pointer', 
                        fontWeight: 'bold', width: '100%', fontSize: '1.05rem',
                        transition: 'all 0.2s',
                        marginTop: '8px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#334155'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                >
                    <FolderPlus size={20} /> Opret Ny Materialeliste
                </button>

            </div>

            {/* LEVERINGSINFO (ACCORDION) */}
            {profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
            <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                backgroundColor: '#ffffff',
                marginBottom: '16px',
                boxShadow: isDeliveryOpen ? '0 12px 24px -10px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* ACCORDION HEADER */}
                <div 
                    onClick={() => setIsDeliveryOpen(!isDeliveryOpen)}
                    style={{ 
                        padding: '20px 24px', 
                        backgroundColor: isDeliveryOpen ? '#f8fafc' : '#ffffff', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isDeliveryOpen ? '1px solid #e2e8f0' : 'none',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            width: '40px', height: '40px', 
                            borderRadius: '12px', 
                            backgroundColor: isDeliveryOpen ? '#fef3c7' : '#f8fafc', 
                            color: isDeliveryOpen ? '#d97706' : '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Truck size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold' }}>
                                Leverings- & Fragtoplysninger
                            </h3>
                            {!isDeliveryOpen && (
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: (!deliveryInfo?.address || String(deliveryInfo.address).trim() === '') ? '#ef4444' : '#64748b', fontWeight: (!deliveryInfo?.address || String(deliveryInfo.address).trim() === '') ? 'bold' : 'normal', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                    {(!deliveryInfo?.address || String(deliveryInfo.address).trim() === '') ? 'Mangler leveringsadresse!' : deliveryInfo.address}
                                </p>
                            )}
                        </div>
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                        {isDeliveryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {/* ACCORDION BODY */}
                {isDeliveryOpen && (
                <div style={{ padding: '24px', backgroundColor: '#ffffff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Leveringsadresse</label>
                        <input 
                            type="text" 
                            value={deliveryInfo.address}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                            placeholder="Vejnavn 42, 8000 Aarhus"
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>
                    
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Ønsket leveringsdato</label>
                        <input 
                            type="date"
                            value={deliveryInfo.date}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, date: e.target.value })}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>

                    <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Bemærkninger til fragtmanden</label>
                        <textarea 
                            rows={2}
                            value={deliveryInfo.notes}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                            placeholder="Skriv eventuelle anvisninger til lastbilen..."
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none', resize: 'vertical' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; handleSaveList(); }}
                        />
                    </div>
                </div>
                )}
            </div>
            )}

            {/* BUDGET DASHBOARD */}
            {(profile?.role !== 'worker' && profile?.role !== 'apprentice' && !isLead) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                            Materialebudget <span style={{ textTransform: 'none', fontWeight: 'normal', opacity: 0.8, fontSize: '0.75rem' }}>(ekskl. moms)</span>
                        </h4>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                            {originalBudget.toLocaleString('da-DK')} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'bold' }}>kr.</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Accepteret iflg. tilbud</p>
                    </div>

                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Faktisk Forbrug</h4>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                            {totalSpent.toLocaleString('da-DK')} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'bold' }}>kr.</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Sum af faktura-priser</p>
                    </div>

                    <div style={{ padding: '24px', backgroundColor: isOverBudget ? '#fef2f2' : '#f0fdf4', borderRadius: '16px', border: `1px solid ${isOverBudget ? '#fca5a5' : '#86efac'}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: isOverBudget ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Restbudget</h4>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: isOverBudget ? '#dc2626' : '#10b981', letterSpacing: '-0.02em' }}>
                            {budgetRemaining > 0 ? '+' : ''}{budgetRemaining.toLocaleString('da-DK')} <span style={{ fontSize: '1rem', color: isOverBudget ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>kr.</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: isOverBudget ? '#b91c1c' : '#15803d', fontWeight: '500' }}>
                            {isOverBudget ? 'Overskredet budget!' : 'Penge tilbage til indkøb'}
                        </p>
                    </div>
                </div>
            )}

            {/* GLOBAL GEM KNAP */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingBottom: '24px', zIndex: 10 }}>
                <button 
                    onClick={() => handleSaveList()}
                    disabled={isSaving}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
                >
                    {isSaving ? <><Loader2 size={18} className="animate-spin" /> Gemmer...</> : <><Save size={18} /> GEM ALLE LISTER PÅ SAGEN</>}
                </button>
            </div>

            {/* SLET LISTE MODAL */}
            {listToDelete && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%' }}>
                                <Trash2 size={28} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Slet materialeliste?</h2>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', marginBottom: '32px' }}>
                            Er du sikker på, at du vil slette denne ekstra materialeliste og <strong>alle dens varer</strong>? Handlingen kan ikke fortrydes.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setListToDelete(null)}
                                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                            >
                                Annullér
                            </button>
                            <button 
                                onClick={confirmDeleteList}
                                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: '#ef4444', color: 'white', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                Ja, Slet Liste
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default MaterialList;
