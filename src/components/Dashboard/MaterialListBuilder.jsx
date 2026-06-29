import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, FileText, Send, Save, Package, Mail, Pencil, X, Maximize2, Minimize2, Truck } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { friendlyError } from '../../utils/friendlyError';
import { buildMaterialListPdf } from '../../utils/materialListPdf';
import { generateMaterialList } from '../../utils/materialGenerator';
import { getSupplierMaterialRequestTemplate, getCarpenterSenderName } from '../../utils/emailTemplates';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const UNITS = ['stk', 'sæt', 'pk', 'm2', 'm', 'lbm', 'rulle', 'kasse', 'palle', 'pose', 'plade', 'dåse', 'liter', 'kg'];

const STANDARD_SUPPLIER_MSG =
`Vi vil gerne bede om en pris på følgende materialer. I finder den fulde materialeliste i den vedhæftede PDF.`;

const label = { fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' };
const input = { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.92rem', color: '#1e293b', boxSizing: 'border-box', background: '#fff' };

const PREVIEW_CSS = `
  .mlb-input{transition:box-shadow .15s ease,border-color .15s ease;}
  .mlb-input:hover:not(:focus){border-color:#94a3b8 !important;}
  .mlb-input:focus{border-color:#3b82f6 !important;box-shadow:0 0 0 3px rgba(59,130,246,.15);}
  .mlb-ghost:hover{background:#f8fafc !important;border-color:#94a3b8 !important;transform:translateY(-1px);}
  .mlb-send{transition:transform .15s ease,box-shadow .2s ease;}
  .mlb-send:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(16,185,129,.5) !important;}
  .mlb-send:active{transform:translateY(0);}
  .mlb-iconbtn:hover{transform:scale(1.1);background:#fee2e2 !important;}
  .mlb-add:hover{opacity:.65;}
  .mlb-tab:hover{filter:brightness(.97);}
  .mlb-maxbtn:hover{transform:translateY(-1px);}
  .mlb-col::-webkit-scrollbar{width:8px;}
  .mlb-col::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;}
  .mlb-col::-webkit-scrollbar-track{background:transparent;}
  .mlb-close:hover{background:#e2e8f0 !important;transform:rotate(90deg);}
  .mlb-divider{flex:0 0 11px;align-self:stretch;cursor:col-resize;position:relative;background:transparent;z-index:6;}
  .mlb-divider::after{content:'';position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:1px;background:#e2e8f0;transition:width .12s ease,background .12s ease;}
  .mlb-divider:hover::after{width:3px;background:#3b82f6;}
  .mlb-scroll{scrollbar-width:none;}
  .mlb-scroll::-webkit-scrollbar{display:none;}
  @keyframes mlbspin{to{transform:rotate(360deg);}}
  .mlb-spin{animation:mlbspin .8s linear infinite;}
  @keyframes mlbConfirmPop{0%{opacity:0;transform:translateY(16px) scale(.92);}60%{opacity:1;transform:translateY(-4px) scale(1.01);}100%{opacity:1;transform:translateY(0) scale(1);}}
`;

export default function MaterialListBuilder({ carpenter, isMobile = false, onCancel, onComplete, onSaved, onDeleted, initialLead = null, draftCreator = null, listId = 'default', listName = null }) {
    const [busy, setBusy] = useState(false);
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    // Den aktuelle lead (kan blive oprettet ved første "Gem liste" på en ny liste) — styrer
    // om efterfølgende gem/send opdaterer samme sag, og om "Slet" vises.
    const [leadState, setLeadState] = useState(initialLead);
    const isEditing = !!leadState?.id;
    // 'idle' | 'saving' | 'saved' — vises ved bundbjælken så "Gem liste" giver tydelig kvittering.
    const [savedState, setSavedState] = useState('idle');

    // ---- Seed materialeliste ----
    // 1) Findes en gemt liste på sagen → brug den. 2) Ellers, hvis det er en
    // forespørgsel med en kategori → generér den foreslåede liste. 3) Ellers tom række.
    const seedItems = () => {
        // Kun varer for DENNE liste (listId). Andre listers varer på sagen røres ikke.
        const all = initialLead?.raw_data?.material_list;
        const existing = Array.isArray(all) ? all.filter(m => (m.listId || 'default') === listId) : [];
        if (existing.length) {
            return existing.map(m => ({ id: uid(), item: m.item || '', qty: m.qty ?? '', unit: m.unit || 'stk', section: m.section || 'Hovedmaterialer', status: m.status }));
        }
        // En ny liste (fx efterbestilling) starter tom. Kun standard-listen seedes fra beregnerens forslag.
        if (listId === 'default' && initialLead?.project_category && initialLead.project_category !== 'Manuelt tilbud') {
            try {
                const gen = generateMaterialList(
                    initialLead.project_category,
                    { ...(initialLead.raw_data?.details || {}), projects: initialLead.raw_data?.projects, isKombi: initialLead.project_category === 'Kombi-projekt' || initialLead.raw_data?.calc_data?.isKombi },
                    initialLead.raw_data?.details?.amount || initialLead.raw_data?.details?.area || initialLead.raw_data?.details?.qty || 0
                );
                if (Array.isArray(gen) && gen.length) {
                    return gen.map(m => ({ id: uid(), item: m.item || '', qty: m.qty ?? '', unit: m.unit || 'stk', section: m.section || 'Hovedmaterialer' }));
                }
            } catch { /* fald tilbage til tom række */ }
        }
        return [{ id: uid(), item: '', qty: '', unit: 'stk', section: 'Hovedmaterialer' }];
    };

    const [items, setItems] = useState(seedItems);
    const [title, setTitle] = useState(initialLead?.project_category && initialLead.project_category !== 'Manuelt tilbud' ? initialLead.project_category : '');

    const di0 = initialLead?.raw_data?.delivery_info || {};
    const [deliveryAddress, setDeliveryAddress] = useState(di0.address || initialLead?.customer_address || '');
    const [deliveryDate, setDeliveryDate] = useState(di0.date || '');
    const [deliveryNotes, setDeliveryNotes] = useState(di0.notes || '');

    const sup0 = initialLead?.raw_data?.material_supplier || {};
    const [supplierName, setSupplierName] = useState(sup0.name || '');
    const [supplierContact, setSupplierContact] = useState(sup0.contact || '');
    const [supplierEmail, setSupplierEmail] = useState(sup0.email || '');
    const [emailMessage, setEmailMessage] = useState(initialLead?.raw_data?.material_request_message || STANDARD_SUPPLIER_MSG);

    // Preview-fane (mobil) + trækbare kolonner (desktop)
    const [previewTab, setPreviewTab] = useState('edit');
    const [regenerating, setRegenerating] = useState(false);
    const initVw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const [leftW, setLeftW] = useState(Math.round(Math.min(980, Math.max(360, initVw * 0.345))));
    const [rightW, setRightW] = useState(Math.round(Math.min(840, Math.max(300, initVw * 0.295))));
    const [resizing, setResizing] = useState(false);
    const [pdfMax, setPdfMax] = useState(false);
    const scrollRef = useRef(null);
    const viewerSrc = (u) => u ? `${u}#toolbar=0&navpanes=0&statusbar=0&view=FitH` : u;

    const filledItems = useMemo(() => items.filter(r => (r.item || '').trim()), [items]);
    const itemsForPdf = useMemo(() => filledItems.map(r => ({ item: r.item, qty: r.qty === '' ? '' : (parseFloat(r.qty) || r.qty), unit: r.unit, section: r.section || 'Hovedmaterialer' })), [filledItems]);
    const deliveryInfo = useMemo(() => ({ address: deliveryAddress, date: deliveryDate, notes: deliveryNotes }), [deliveryAddress, deliveryDate, deliveryNotes]);
    const dateStr = new Date().toLocaleDateString('da-DK');
    const caseNumber = initialLead?.case_number || (initialLead?.id ? String(initialLead.id).substring(0, 8) : null);

    // ---- Live PDF-preview (dobbelt-buffer som Hurtigt tilbud) ----
    const [slotUrls, setSlotUrls] = useState([null, null]);
    const [front, setFront] = useState(0);
    const frontRef = useRef(0);
    const slotUrlsRef = useRef([null, null]);
    useEffect(() => { frontRef.current = front; }, [front]);
    useEffect(() => { slotUrlsRef.current = slotUrls; }, [slotUrls]);
    const frontUrl = slotUrls[front];
    const onSlotLoaded = (idx) => {
        if (idx !== frontRef.current && slotUrlsRef.current[idx]) { frontRef.current = idx; setFront(idx); }
    };

    const pdfSig = JSON.stringify(itemsForPdf) + '|' + title + '|' + JSON.stringify(deliveryInfo);
    useEffect(() => {
        let cancelled = false;
        setRegenerating(true);
        const t = setTimeout(async () => {
            try {
                const { blob } = await buildMaterialListPdf(itemsForPdf, carpenter, { title, dateStr, caseNumber, deliveryInfo, note: '' });
                if (cancelled) return;
                const back = 1 - frontRef.current;
                const newUrl = URL.createObjectURL(blob);
                setSlotUrls(prev => {
                    const next = [...prev];
                    if (next[back]) URL.revokeObjectURL(next[back]);
                    next[back] = newUrl;
                    return next;
                });
            } catch { /* ignore preview-fejl */ }
            finally { if (!cancelled) setRegenerating(false); }
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfSig]);
    useEffect(() => () => { slotUrlsRef.current.forEach(u => u && URL.revokeObjectURL(u)); }, []);

    const emailHtml = useMemo(() => getSupplierMaterialRequestTemplate(
        supplierName || '', carpenter, itemsForPdf, { customMessage: emailMessage, caseNumber, title, contactName: supplierContact }
    ), [supplierName, supplierContact, carpenter, itemsForPdf, emailMessage, caseNumber, title]);

    // Ryd "Gemt"-kvitteringen så snart noget ændres, så den altid afspejler den seneste tilstand.
    useEffect(() => { setSavedState(s => s === 'saved' ? 'idle' : s); }, [pdfSig, supplierName, supplierContact, supplierEmail, emailMessage]);

    // ---- Items helpers ----
    const updateItem = (id, field, value) => setItems(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const addItem = () => setItems(prev => [...prev, { id: uid(), item: '', qty: '', unit: 'stk', section: 'Hovedmaterialer' }]);
    const removeItem = (id) => setItems(prev => prev.filter(r => r.id !== id));

    // material_list-poster i det format MaterialList/sagen forventer (tagget med DENNE listId).
    const buildMaterialListForSave = () => filledItems.map(r => ({
        item: r.item, qty: r.qty === '' ? 1 : (parseFloat(r.qty) || 1), unit: r.unit,
        section: r.section || 'Hovedmaterialer', status: r.status || 'Ikke bestilt', listId,
    }));

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = reject;
        r.readAsDataURL(blob);
    });

    // ---- Gem (kladde) eller send til leverandør ----
    const save = async (sendToSupplier) => {
        if (filledItems.length === 0) {
            toast.error('Tilføj mindst én vare til listen.');
            if (isMobile) setPreviewTab('edit');
            return;
        }
        if (sendToSupplier && (!supplierEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail))) {
            setFieldErrors({ supplierEmail: true });
            if (isMobile) setPreviewTab('mail');
            return toast.error('Udfyld en gyldig e-mail på leverandøren for at sende.');
        }
        if (!sendToSupplier) setSavedState('saving');
        setBusy(true);
        try {
            const current = leadState; // den aktuelle (evt. netop oprettede) lead
            const editing = !!current?.id;
            // Flet: bevar varer fra ANDRE lister, erstat kun denne lists varer.
            const otherItems = (current?.raw_data?.material_list || []).filter(m => (m.listId || 'default') !== listId);
            const material_list = [...otherItems, ...buildMaterialListForSave()];
            // Meta: sørg for at denne liste har en post (tilføj hvis ny).
            const existingMeta = (current?.raw_data?.material_lists_meta && current.raw_data.material_lists_meta.length)
                ? current.raw_data.material_lists_meta
                : [{ id: 'default', name: title || 'Materialeliste til Opgaven', price: '' }];
            const meta = existingMeta.some(l => l.id === listId)
                ? existingMeta.map(l => l.id === listId && listName ? { ...l, name: listName } : l)
                : [...existingMeta, { id: listId, name: listName || title || 'Materialeliste', price: '' }];

            const ownerId = carpenter?.company_id || carpenter?.id;
            const isEmployeeCreator = !!draftCreator?.id && draftCreator.id !== ownerId;
            const existingAssigned = current?.raw_data?.assigned_workers || [];

            const raw_data = {
                ...(current?.raw_data || {}),
                created_by: current?.raw_data?.created_by || draftCreator?.id || null,
                ...(isEmployeeCreator && !existingAssigned.includes(draftCreator.id) ? { assigned_workers: [...existingAssigned, draftCreator.id] } : {}),
                material_list,
                material_lists_meta: meta,
                delivery_info: deliveryInfo,
                material_supplier: { name: supplierName, contact: supplierContact, email: supplierEmail, ...(sendToSupplier ? { sentAt: new Date().toISOString() } : {}) },
                material_request_message: emailMessage,
                ...(sendToSupplier ? { material_request_sent_at: new Date().toISOString() } : {}),
            };

            // Ny standalone-liste → opret et lead (Tilbudskladde), ellers opdater sagen.
            const fields = {
                customer_name: current?.customer_name || title || 'Materialeliste',
                customer_email: current?.customer_email || '',
                customer_phone: current?.customer_phone || '',
                customer_address: current?.customer_address || deliveryAddress || '',
                project_category: current?.project_category || title || 'Materialeliste',
                carpenter_id: carpenter.id,
                raw_data,
            };
            if (!editing) {
                fields.status = 'Tilbudskladder';
                fields.quote_token = uid();
            }

            let lead, error;
            if (editing) {
                ({ data: lead, error } = await supabase.from('leads').update(fields).eq('id', current.id).select().single());
            } else {
                ({ data: lead, error } = await supabase.from('leads').insert([fields]).select().single());
            }
            if (error) throw error;
            // Husk den gemte lead, så efterfølgende gem/send opdaterer samme sag.
            setLeadState(lead);

            // Send til leverandøren med PDF vedhæftet
            if (sendToSupplier) {
                const { blob, filename } = await buildMaterialListPdf(itemsForPdf, carpenter, { title, dateStr, caseNumber: lead?.case_number || caseNumber, deliveryInfo, note: '' });
                const base64 = await blobToBase64(blob);
                const { sendEmail } = await import('../../utils/sendEmail');
                const res = await sendEmail({
                    to: supplierEmail,
                    subject: `Materialeliste${title ? ` – ${title}` : ''}${(lead?.case_number || caseNumber) ? ` (sag ${lead?.case_number || caseNumber})` : ''}`,
                    html: emailHtml,
                    fromName: getCarpenterSenderName(carpenter),
                    replyTo: carpenter?.email,
                    attachments: [{ filename, content: base64 }],
                });
                if (!res?.success) throw new Error(res?.error || 'Kunne ikke sende mailen');
            }

            if (sendToSupplier) {
                toast.success('Materialelisten er sendt til leverandøren! 🎉');
                onComplete && onComplete(lead); // luk byggeren ved afsendelse
            } else {
                // "Gem liste": bliv i byggeren med tydelig kvittering — luk IKKE.
                setSavedState('saved');
                toast.success('Materialelisten er gemt.');
                onSaved ? onSaved(lead) : (onComplete && onComplete(lead));
            }
        } catch (e) {
            console.error('Kunne ikke gemme/sende materialeliste:', e);
            setSavedState('idle');
            toast.error(friendlyError(e, 'Kunne ikke gemme materialelisten. Prøv igen.'));
        } finally {
            setBusy(false);
        }
    };

    const requestSend = () => {
        if (filledItems.length === 0) { toast.error('Tilføj mindst én vare til listen.'); if (isMobile) setPreviewTab('edit'); return; }
        if (!supplierEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail)) {
            setFieldErrors({ supplierEmail: true });
            if (isMobile) setPreviewTab('mail');
            return toast.error('Udfyld en gyldig e-mail på leverandøren for at sende.');
        }
        setShowSendConfirm(true);
    };

    const del = async () => {
        if (!leadState?.id) { onCancel && onCancel(); return; }
        setBusy(true);
        try {
            const { error } = await supabase.rpc('soft_delete_lead', { p_lead_id: leadState.id });
            if (error) throw error;
            toast.success('Materialelisten er slettet.');
            if (onDeleted) onDeleted(leadState.id); else if (onCancel) onCancel();
        } catch (e) {
            toast.error(friendlyError(e, 'Kunne ikke slette. Prøv igen.'));
        } finally { setBusy(false); }
    };

    // ---- Træk i skillelinjer (desktop) ----
    const startResize = (type, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startLeft = leftW, startRight = rightW;
        const totalW = window.innerWidth;
        const MIN = 260, MID_MIN = 320;
        let raf = 0, lastDx = 0;
        const apply = () => {
            raf = 0;
            if (type === 'left') setLeftW(Math.max(MIN, Math.min(startLeft + lastDx, totalW - rightW - MID_MIN)));
            else setRightW(Math.max(MIN, Math.min(startRight - lastDx, totalW - leftW - MID_MIN)));
        };
        const move = (ev) => { lastDx = ev.clientX - startX; if (!raf) raf = requestAnimationFrame(apply); };
        const end = () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); setResizing(false); };
        setResizing(true);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
    };

    const goTab = (k) => {
        setPreviewTab(k);
        const idx = { edit: 0, pdf: 1, mail: 2 }[k];
        const el = scrollRef.current;
        if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
    };
    const onScrollSync = (e) => {
        const el = e.currentTarget;
        const k = ['edit', 'pdf', 'mail'][Math.round(el.scrollLeft / el.clientWidth)];
        if (k && k !== previewTab) setPreviewTab(k);
    };

    // ---- Render ----
    const colBase = { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 };
    const mobileCol = { flex: '0 0 100%', width: '100%', scrollSnapAlign: 'start' };
    const leftStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: `0 0 ${leftW}px` }), background: '#ffffff', overflowY: 'auto' };
    const midStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: '1 1 auto' }), background: '#f8fafc' };
    const rightStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: `0 0 ${rightW}px` }), background: '#ffffff', overflowY: 'auto' };
    const pdfFocus = !isMobile && pdfMax;
    const renderDivider = (type) => (<div className="mlb-divider" onPointerDown={(e) => startResize(type, e)} />);

    const zoneHead = (icon, text, bg, action) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: '1px solid #eef2f6', position: 'sticky', top: 0, background: bg, zIndex: 2, flexShrink: 0 }}>
            {icon}
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' }}>{text}</span>
            {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
        </div>
    );
    const editSection = { padding: '16px 18px', borderBottom: '1px solid #f1f5f9' };
    const editH = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' };

    const leftCol = (
        <div className="mlb-col" style={leftStyle}>
            {zoneHead(<Pencil size={16} color="#3b82f6" />, 'Byg materialelisten', '#ffffff')}
            <div style={editSection}>
                <label style={label}>Opgavetitel</label>
                <input className="mlb-input" style={input} placeholder="F.eks. 'Nyt tag på Nørrevænget 1'" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div style={editSection}>
                <h3 style={editH}><Package size={18} color="#3b82f6" /> Materialer</h3>
                {/* Header-labels (kun desktop) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', padding: '0 2px' }}>
                        <span style={{ flex: 3, ...label, marginBottom: 0 }}>Vare</span>
                        <span style={{ flex: 1, ...label, marginBottom: 0 }}>Mængde</span>
                        <span style={{ width: '92px', ...label, marginBottom: 0 }}>Enhed</span>
                        <span style={{ width: '36px' }} />
                    </div>
                )}
                {items.map((row) => (
                    <div key={row.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        <input className="mlb-input" style={{ ...input, flex: isMobile ? '1 1 100%' : 3 }} placeholder="F.eks. Reglar 45x95 C18" value={row.item} onChange={(e) => updateItem(row.id, 'item', e.target.value)} />
                        <input className="mlb-input" style={{ ...input, flex: 1, minWidth: '70px' }} inputMode="decimal" placeholder="Antal" value={row.qty} onChange={(e) => updateItem(row.id, 'qty', e.target.value)} />
                        <select className="mlb-input" style={{ ...input, width: isMobile ? 'auto' : '92px', flex: isMobile ? 1 : undefined, cursor: 'pointer' }} value={row.unit || 'stk'} onChange={(e) => updateItem(row.id, 'unit', e.target.value)}>
                            {(!UNITS.includes(row.unit || 'stk')) && <option value={row.unit}>{row.unit}</option>}
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {items.length > 1 && (
                            <button className="mlb-iconbtn" onClick={() => removeItem(row.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: '10px', padding: '0 12px', height: '40px', cursor: 'pointer', color: '#ef4444', transition: 'all .15s' }}><Trash2 size={16} /></button>
                        )}
                    </div>
                ))}
                <button className="mlb-add" onClick={addItem} style={{ marginTop: '4px', background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', transition: 'opacity .15s' }}><Plus size={16} /> Tilføj vare</button>
            </div>

            <div style={editSection}>
                <h3 style={editH}><Truck size={18} color="#d97706" /> Levering</h3>
                <label style={label}>Leveringsadresse</label>
                <input className="mlb-input" style={input} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Vejnavn 42, 8000 Aarhus" />
                <label style={{ ...label, marginTop: '12px' }}>Ønsket leveringsdato</label>
                <input className="mlb-input" style={{ ...input, maxWidth: '200px' }} type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                <label style={{ ...label, marginTop: '12px' }}>Bemærkninger til fragtmanden</label>
                <textarea className="mlb-input" rows={2} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Skriv eventuelle anvisninger til lastbilen…" />
            </div>
        </div>
    );

    const maxBtn = !isMobile && (
        <button onClick={() => setPdfMax(m => !m)} className="mlb-maxbtn" title={pdfMax ? 'Tilbage' : 'Forstør'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (pdfMax ? '#0f172a' : '#cbd5e1'), background: pdfMax ? '#0f172a' : '#fff', color: pdfMax ? '#fff' : '#334155', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', transition: 'all .15s' }}>
            {pdfMax ? <><Minimize2 size={14} /> Vis redigering</> : <><Maximize2 size={14} /> Forstør PDF</>}
        </button>
    );

    const midCol = (
        <div style={pdfFocus ? { ...midStyle, flex: '1 1 auto' } : midStyle}>
            {zoneHead(<FileText size={16} color="#3b82f6" />, 'Sådan ser listen ud', '#f8fafc', maxBtn)}
            <div style={{ flex: 1, minHeight: 0, padding: pdfFocus ? '22px clamp(16px, 4vw, 64px)' : '16px', display: 'flex', flexDirection: 'column', alignItems: pdfFocus ? 'center' : 'stretch', position: 'relative', background: pdfFocus ? '#1e293b' : 'transparent' }}>
                {regenerating && (
                    <div style={{ position: 'absolute', top: '26px', right: '26px', zIndex: 3, background: 'rgba(15,23,42,0.82)', color: '#fff', padding: '6px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span className="mlb-spin" style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                        Opdaterer…
                    </div>
                )}
                <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: pdfFocus ? '920px' : 'clamp(720px, 60vw, 1180px)', position: 'relative', borderRadius: '14px', background: '#fff', boxShadow: pdfFocus ? '0 24px 60px rgba(0,0,0,0.45)' : '0 10px 30px rgba(15,23,42,0.10)' }}>
                    {[0, 1].map(i => slotUrls[i] ? (
                        <iframe key={i} title={`Materialeliste PDF ${i}`} src={viewerSrc(slotUrls[i])} onLoad={() => onSlotLoaded(i)}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff', opacity: front === i ? 1 : 0, transition: 'opacity .18s ease', pointerEvents: (resizing || front !== i) ? 'none' : 'auto' }} />
                    ) : null)}
                    {!frontUrl && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Genererer…</div>}
                </div>
                <a href={frontUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: pdfFocus ? '#93c5fd' : '#3b82f6', fontWeight: 600, fontSize: '0.9rem', alignSelf: pdfFocus ? 'center' : 'flex-start' }}>Åbn i nyt vindue ▸</a>
            </div>
        </div>
    );

    const rightCol = (
        <div className="mlb-col" style={rightStyle}>
            {zoneHead(<Mail size={16} color="#8b5cf6" />, 'Mail til leverandøren', '#ffffff')}
            <div style={{ flex: 1, minHeight: 0, padding: '18px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '14px', alignItems: 'start' }}>
                    <div>
                        <label style={label}>Leverandør (firma)</label>
                        <input className="mlb-input" style={input} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="F.eks. Davidsen" />
                    </div>
                    <div>
                        <label style={label}>Kontaktperson <span style={{ color: '#94a3b8', fontWeight: 500 }}>(valgfrit)</span></label>
                        <input className="mlb-input" style={input} value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="F.eks. Kenneth" />
                    </div>
                    <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                        <label style={label}>Leverandørens e-mail</label>
                        <input className="mlb-input" style={fieldErrors.supplierEmail ? { ...input, borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' } : input} type="email" value={supplierEmail} onChange={(e) => { setSupplierEmail(e.target.value); setFieldErrors({}); }} placeholder="salg@davidsen.dk" />
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Kræves for at sende. Hilsenen i mailen bruger kontaktpersonen, hvis udfyldt.</span>
                    </div>
                </div>
                <label style={label}>Personlig besked i mailen</label>
                <textarea className="mlb-input" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={isMobile ? 6 : 4} style={{ ...input, resize: 'vertical', fontFamily: 'inherit', marginBottom: '14px', minHeight: isMobile ? '140px' : undefined, fontSize: isMobile ? '16px' : input.fontSize }} />
                <div style={{ flex: 1, minHeight: isMobile ? '420px' : '320px', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                    <iframe title="Mail preview" srcDoc={emailHtml} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: resizing ? 'none' : 'auto' }} />
                </div>
            </div>
        </div>
    );

    const tabBtn = (k, text, Icon) => {
        const on = previewTab === k;
        return (
            <button key={k} className="mlb-tab" onClick={() => goTab(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: on ? '#0f172a' : '#f1f5f9', color: on ? '#fff' : '#475569' }}>
                <Icon size={15} /> {text}
            </button>
        );
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100050, background: '#eef2f6', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
            <style>{PREVIEW_CSS}</style>
            {resizing && <div style={{ position: 'fixed', inset: 0, zIndex: 100060, cursor: 'col-resize' }} />}

            {/* Topbjælke */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: isMobile ? '12px 16px' : '14px 22px', paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top))' : undefined, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 800, color: '#0f172a' }}>{listName || 'Materialeliste'}</div>
                    {!isMobile && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Byg listen, se PDF'en — og send den til leverandøren for en pris.</div>}
                </div>
                <button className="mlb-close" onClick={() => onCancel && onCancel()} title="Luk" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    <X size={20} />
                </button>
            </div>

            {/* Faner (mobil) */}
            {isMobile && (
                <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    {tabBtn('edit', 'Rediger', Pencil)}
                    {tabBtn('pdf', 'Liste', FileText)}
                    {tabBtn('mail', 'Mail', Mail)}
                </div>
            )}

            {/* Zoner */}
            {isMobile ? (
                <div ref={scrollRef} onScroll={onScrollSync} className="mlb-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                    {leftCol}{midCol}{rightCol}
                </div>
            ) : pdfMax ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>{midCol}</div>
            ) : (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                    {leftCol}{renderDivider('left')}{midCol}{renderDivider('right')}{rightCol}
                </div>
            )}

            {/* Bundbjælke */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: isMobile ? '12px 16px' : '14px 22px', paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : undefined, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Varer på listen</div>
                    <div style={{ fontSize: isMobile ? '1.4rem' : '1.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{filledItems.length}</div>
                    {savedState !== 'idle' && (
                        <div style={{ marginTop: '3px', fontSize: '0.72rem', fontWeight: 600, color: savedState === 'saved' ? '#10b981' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {savedState === 'saving'
                                ? <><span className="mlb-spin" style={{ width: '10px', height: '10px', border: '2px solid #cbd5e1', borderTopColor: '#64748b', borderRadius: '50%', display: 'inline-block' }} /> Gemmer…</>
                                : <>✓ Gemt</>}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {isEditing && (
                        <button className="mlb-ghost" disabled={busy} onClick={del} title="Slet" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .15s' }}>
                            <Trash2 size={18} /> Slet
                        </button>
                    )}
                    <button className="mlb-ghost" disabled={busy} onClick={() => save(false)} style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .15s' }}>
                        <Save size={18} /> Gem liste
                    </button>
                    <button className="mlb-send" disabled={busy} onClick={requestSend} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                        <Send size={18} /> {busy ? 'Sender…' : 'Send til leverandør'}
                    </button>
                </div>
            </div>

            {/* Bekræft afsendelse */}
            {showSendConfirm && (
                <div onClick={() => !busy && setShowSendConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 100080, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 24, padding: '30px 28px 24px', boxShadow: '0 30px 80px rgba(15,23,42,0.45)', animation: 'mlbConfirmPop .3s cubic-bezier(.34,1.56,.64,1) both' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <Send size={28} color="#10b981" />
                            </div>
                            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Send materialelisten?</h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>Listen sendes til leverandøren med PDF vedhæftet — tjek lige mailen herunder.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: 14, padding: '14px 16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#64748b' }}>Til</span><span style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{supplierName || supplierEmail}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#64748b' }}>E-mail</span><span style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{supplierEmail}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#64748b' }}>Antal varer</span><span style={{ color: '#0f172a', fontWeight: 800 }}>{filledItems.length}</span>
                            </div>
                        </div>
                        <div style={{ height: '260px', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: '20px' }}>
                            <iframe title="Bekræft mail" srcDoc={emailHtml} style={{ width: '100%', height: '100%', border: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button disabled={busy} onClick={() => setShowSendConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Tilbage</button>
                            <button className="mlb-send" disabled={busy} onClick={() => { setShowSendConfirm(false); save(true); }} style={{ flex: 1.4, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(16,185,129,0.32)' }}>
                                <Send size={17} /> {busy ? 'Sender…' : 'Ja, send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
