import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Plus, Trash2, FileText, Upload, Send, Save, Hammer, Package, User, Mail, CheckCircle2, Pencil, X, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { buildQuotePdf } from '../../utils/quotePdf';
import { getCustomerOfferSentTemplate, getCarpenterSenderName } from '../../utils/emailTemplates';

// Stabil reference (react-google-maps kræver at libraries-arrayet ikke gendannes pr. render).
// Samme id+libraries som Dashboard, så scriptet dedupliceres.
const GMAPS_LIBRARIES = ['places'];

// Dansk telefon-formatering (+45 XX XX XX XX) — samme mønster som i wizardens kontakttrin.
const formatDkPhone = (raw) => {
    let val = String(raw ?? '').replace(/[^\d+]/g, '');
    const hasPlus45 = val.startsWith('+45');
    const numbersOnly = hasPlus45 ? val.slice(3) : val;
    const blocks = numbersOnly.match(/.{1,2}/g) || [];
    let result = blocks.join(' ');
    if (hasPlus45) result = result ? `+45 ${result}` : '+45';
    return result;
};

const kr = (n) => (Number(n) || 0).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v) => parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0; // dansk input → tal
// Formatér beløbs-input live til dansk visning: "167080" → "167.080" (punktum pr. tusinde, komma som decimal).
const fmtDk = (raw) => {
    const parts = String(raw ?? '').replace(/\./g, '').split(',');
    const intPart = parts[0].replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.length > 1 ? `${intPart},${parts[1].replace(/[^\d]/g, '')}` : intPart;
};

// ---- Rich-text helpers til arbejdsbeskrivelsen ----
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Rens indsat HTML (fx fra Word) ned til et trygt whitelist: fed/kursiv/lister/afsnit/linjeskift.
const TAG_MAP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', UL: 'ul', OL: 'ul', LI: 'li', P: 'p', DIV: 'div', BR: 'br', H1: 'p', H2: 'p', H3: 'p', H4: 'p' };
const sanitizeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const clean = (node) => {
        let out = '';
        node.childNodes.forEach((ch) => {
            if (ch.nodeType === 3) {
                out += escapeHtml(ch.textContent);
            } else if (ch.nodeType === 1) {
                const tag = TAG_MAP[ch.tagName];
                const inner = clean(ch);
                if (ch.tagName === 'BR') out += '<br>';
                else if ((ch.tagName === 'H1' || ch.tagName === 'H2' || ch.tagName === 'H3' || ch.tagName === 'H4') && inner.trim()) out += `<p><b>${inner}</b></p>`;
                else if (tag && tag !== 'br') out += `<${tag}>${inner}</${tag}>`;
                else out += inner; // ukendte tags (span, font m.m.) pakkes ud, teksten bevares
            }
        });
        return out;
    };
    return clean(doc.body);
};
// Plain-tekst-linjer (til bygge-to-do/checklist) ud fra editorens HTML.
const htmlToPlainLines = (html) => {
    if (!html) return [];
    const withBreaks = String(html).replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
    const tmp = document.createElement('div');
    tmp.innerHTML = withBreaks;
    return (tmp.textContent || '').split('\n').map((s) => s.trim()).filter(Boolean);
};
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Auto-kladde til "fortsæt hvor du slap": kun for HELT nye tilbud (ikke redigering
// af en allerede gemt lead). Nøgle pr. tømrer, så kladder ikke deles på tværs af logins.
const DRAFT_KEY = (carpenterId) => `qqb_working_draft_${carpenterId || 'anon'}`;
// Har en gemt arbejds-kladde reelt indhold (ud over tomme standard-felter)?
const draftHasContent = (d) => !!(d && (
    (d.customer && (d.customer.name || d.customer.email || d.customer.phone || d.customer.address)) ||
    d.materialCost || d.laborFixed || d.laborHours || d.title ||
    htmlToPlainLines(d.workDescHtml || '').join('').trim() ||
    (Array.isArray(d.extras) && d.extras.some(e => (e.desc || '').trim() || num(e.amount) > 0))
));

// Besked på tilbuddet (PDF) — rich-text/HTML. Leder naturligt over i beskrivelsen nedenfor.
const STANDARD_PDF_NOTE_HTML = (kundeNavn) =>
`Hej ${escapeHtml(kundeNavn || 'der')},<br><br>Hermed fremsendes tilbud på følgende arbejde:`;

// Mail-skabelonen tilføjer selv "Hej {navn}," + "Med venlig hilsen {firma}" + knappen,
// så den personlige besked er KUN selve brødteksten (ingen dobbelt hilsen/signatur).
const STANDARD_EMAIL_MSG =
`Tak for en god snak. Her er det tilbud, vi aftalte — du kan se det fulde tilbud og bekræfte det direkte via knappen herunder.

Sig endelig til, hvis du har spørgsmål.`;

// Generisk start-to-do + dine arbejdslinjer som punkter under "Udførelse".
const seedChecklist = (workLines) => {
    const mk = (text, subs = []) => ({
        id: `step-${uid()}`, text, isExpanded: true,
        subTasks: subs.filter(s => (s || '').trim()).map(s => ({ id: `sub-${uid()}`, text: s, done: false }))
    });
    return [
        mk('Opstart & forberedelse', ['Gennemgå tilbud og materialer', 'Aftal opstartsdato med kunde']),
        mk('Udførelse', workLines),
        mk('Afslutning & oprydning'),
        mk('Aflevering & KS', ['Gennemgang med kunde', 'Aflevering']),
    ];
};

const label = { fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' };
const input = { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.92rem', color: '#1e293b', boxSizing: 'border-box', background: '#fff' };
// Diskret resultat-chip (fx "Materialer i tilbud … kr") — holder venstre-zonen rolig og ensartet.
const resultChip = { marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 13px', background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: '10px' };
const chipLbl = { fontSize: '0.8rem', color: '#64748b', fontWeight: 600 };
const chipVal = { fontSize: '0.98rem', fontWeight: 800 };

// CSS til preview-laget: hover, fokus-ringe, custom scrollbar, spinner.
const PREVIEW_CSS = `
  .qqb-input{transition:box-shadow .15s ease,border-color .15s ease;}
  .qqb-input:hover:not(:focus){border-color:#94a3b8 !important;}
  .qqb-input:focus{border-color:#3b82f6 !important;box-shadow:0 0 0 3px rgba(59,130,246,.15);}
  .qqb-ghost:hover{background:#f8fafc !important;border-color:#94a3b8 !important;transform:translateY(-1px);}
  .qqb-send{transition:transform .15s ease,box-shadow .2s ease;}
  .qqb-send:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(16,185,129,.5) !important;}
  .qqb-send:active{transform:translateY(0);}
  .qqb-link{transition:color .15s ease;}
  .qqb-link:hover{text-decoration:underline;color:#1d4ed8 !important;}
  .qqb-iconbtn{transition:transform .15s ease,background .15s ease;}
  .qqb-iconbtn:hover{transform:scale(1.1);background:#fee2e2 !important;}
  .qqb-add{transition:opacity .15s ease;}
  .qqb-add:hover{opacity:.65;}
  .qqb-tab{transition:filter .15s ease,background .15s ease,color .15s ease;}
  .qqb-tab:hover{filter:brightness(.97);}
  .qqb-maxbtn{transition:background .15s ease,color .15s ease,border-color .15s ease,transform .15s ease;}
  .qqb-maxbtn:hover{transform:translateY(-1px);}
  .qqb-maxbtn-hint{box-shadow:0 0 0 0 rgba(59,130,246,.5);animation:qqbPulse 2.4s ease-out infinite;}
  @keyframes qqbPulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,.45);}70%{box-shadow:0 0 0 7px rgba(59,130,246,0);}100%{box-shadow:0 0 0 0 rgba(59,130,246,0);}}
  @keyframes qqbFade{from{opacity:0;}to{opacity:1;}}
  @keyframes qqbConfirmPop{0%{opacity:0;transform:translateY(16px) scale(.92);}60%{opacity:1;transform:translateY(-4px) scale(1.01);}100%{opacity:1;transform:translateY(0) scale(1);}}
  @keyframes qqbIconPop{0%{transform:scale(.4);}70%{transform:scale(1.12);}100%{transform:scale(1);}}
  .qqb-confirm-backdrop{animation:qqbFade .16s ease both;}
  .qqb-confirm-card{animation:qqbConfirmPop .3s cubic-bezier(.34,1.56,.64,1) both;}
  .qqb-confirm-icon{animation:qqbIconPop .42s cubic-bezier(.34,1.56,.64,1) .06s both;}
  .qqb-confirm-cancel{transition:background .15s ease,border-color .15s ease;}
  .qqb-confirm-cancel:hover{background:#f1f5f9 !important;}
  .qqb-confirm-delete{transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease,background .15s ease;}
  .qqb-confirm-delete:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 12px 26px rgba(239,68,68,.4);}
  .qqb-toggle{transition:border-color .15s ease,background .15s ease,color .15s ease;}
  .qqb-toggle:hover:not(.qqb-toggle-on){border-color:#0f172a !important;}
  .qqb-col::-webkit-scrollbar{width:8px;}
  .qqb-col::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;}
  .qqb-col::-webkit-scrollbar-track{background:transparent;}
  .qqb-close{transition:background .15s ease,transform .2s ease;}
  .qqb-close:hover{background:#e2e8f0 !important;transform:rotate(90deg);}
  .qqb-divider{flex:0 0 11px;align-self:stretch;cursor:col-resize;position:relative;background:transparent;z-index:6;}
  .qqb-divider::after{content:'';position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:1px;background:#e2e8f0;transition:width .12s ease,background .12s ease;}
  .qqb-divider:hover::after,.qqb-divider:active::after{width:3px;background:#3b82f6;}
  .qqb-grip{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:38px;border-radius:99px;background:#cbd5e1;opacity:0;transition:opacity .12s ease;}
  .qqb-divider:hover .qqb-grip,.qqb-divider:active .qqb-grip{opacity:1;}
  .qqb-scroll{scrollbar-width:none;}
  .qqb-scroll::-webkit-scrollbar{display:none;}
  .qqb-editor{height:auto;overflow-y:auto;max-height:240px;cursor:text;white-space:pre-wrap;}
  .qqb-editor:empty:before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none;}
  .qqb-editor:focus{border-color:#3b82f6 !important;box-shadow:0 0 0 3px rgba(59,130,246,.15);}
  .qqb-editor p{margin:0 0 6px;}
  .qqb-editor ul{margin:6px 0;padding-left:22px;}
  .qqb-editor li{margin:2px 0;}
  .qqb-tbtn{transition:background .12s ease,border-color .12s ease,transform .1s ease;}
  .qqb-tbtn:hover{background:#f1f5f9 !important;border-color:#94a3b8 !important;}
  .qqb-tbtn:active{transform:translateY(1px);}
  @keyframes qqbspin{to{transform:rotate(360deg);}}
  .qqb-spin{animation:qqbspin .8s linear infinite;}
`;

export default function QuickQuoteBuilder({ carpenter, isMobile = false, onCancel, onComplete, onDeleted, initialLead = null }) {
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Redigerer vi en eksisterende tilbudskladde? Forudfyld så alt fra den gemte lead.
    const isEditing = !!initialLead?.id;
    // Redigerer vi et tilbud der ALLEREDE er sendt? Så kan man kun sende en opdateret mail.
    const wasSent = initialLead?.status === 'Sendt tilbud';
    const mq0 = initialLead?.raw_data?.manual_quote || {};

    // ---- Auto-kladde ("fortsæt hvor du slap") ----
    // Læs en evt. gemt arbejds-kladde ÉN gang ved mount. Findes der en med indhold,
    // og er vi ikke i gang med at redigere en eksisterende lead, så spørger vi brugeren.
    const draftKey = DRAFT_KEY(carpenter?.id);
    const savedDraftRef = useRef(null);
    const [restorePrompt, setRestorePrompt] = useState(() => {
        if (isEditing || typeof window === 'undefined') return false;
        try {
            const raw = window.localStorage.getItem(draftKey);
            if (!raw) return false;
            const d = JSON.parse(raw);
            if (!draftHasContent(d)) return false;
            savedDraftRef.current = d;
            return true;
        } catch { return false; }
    });
    // Autosave er pauset mens vi venter på brugerens valg (fortsæt/forfra) — ellers
    // ville den tomme nye formular nå at overskrive den gemte kladde. Redigering af en
    // eksisterende lead auto-gemmes aldrig (den har sin egen "Gem kladde").
    const canAutosave = useRef(!isEditing && !restorePrompt);
    const clearWorkingDraft = () => { try { window.localStorage.removeItem(draftKey); } catch { /* ignore */ } };

    const [title, setTitle] = useState(initialLead?.project_category && initialLead.project_category !== 'Manuelt tilbud' ? initialLead.project_category : '');
    // Materialer
    const [materialCost, setMaterialCost] = useState(mq0.materialCost ? String(mq0.materialCost) : '');   // indkøbspris ekskl. moms
    const [markup, setMarkup] = useState(mq0.materialMarkupPct != null ? String(mq0.materialMarkupPct) : '35');             // avance %
    // Arbejde
    const [laborMode, setLaborMode] = useState(mq0.laborMode || 'fixed');    // 'fixed' | 'hourly'
    const [laborFixed, setLaborFixed] = useState(mq0.laborFixed ? String(mq0.laborFixed) : '');
    const [laborRate, setLaborRate] = useState(String(mq0.laborRate || carpenter?.hourly_rate || carpenter?.raw_data?.hourly_rate || '550'));
    const [laborHours, setLaborHours] = useState(mq0.laborHours ? String(mq0.laborHours) : '');
    // Tillæg + arbejdsbeskrivelse (rich-text)
    const [extras, setExtras] = useState((mq0.extras && mq0.extras.length) ? mq0.extras.map(e => ({ id: uid(), desc: e.desc || '', amount: e.amount != null ? String(e.amount) : '' })) : [{ id: uid(), desc: '', amount: '' }]);
    const [workDescHtml, setWorkDescHtml] = useState(mq0.workHtml || '');
    const workEditorRef = useRef(null);
    // Kunde — strukturerede felter (gade/postnr/by) hentes fra customerDetails hvis de findes.
    const cd0 = initialLead?.raw_data?.customerDetails || {};
    const [customer, setCustomer] = useState({
        name: initialLead?.customer_name || '',
        email: initialLead?.customer_email || '',
        phone: initialLead?.customer_phone || '',
        address: cd0.street || initialLead?.customer_address || '',
        zip: cd0.zip || '',
        city: cd0.city || '',
    });

    // Auto-udfyld by ud fra postnummer (DAWA) — samme kilde som wizardens kontakttrin.
    useEffect(() => {
        const zip = customer.zip;
        if (zip && zip.length === 4 && /^\d+$/.test(zip)) {
            fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`)
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => { if (data && data.navn) setCustomer(c => (c.zip === zip ? { ...c, city: data.navn } : c)); })
                .catch(() => { /* ukendt postnr — ignorér */ });
        }
    }, [customer.zip]);

    // Google Maps adresse-autofuldførelse (samme script/bibliotek som Dashboard-kortet).
    const { isLoaded: gmapsLoaded } = useLoadScript({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: GMAPS_LIBRARIES,
    });
    const [addressAutocomplete, setAddressAutocomplete] = useState(null);
    const onAddressPlaceChanged = () => {
        if (!addressAutocomplete) return;
        const place = addressAutocomplete.getPlace();
        if (place && place.address_components) {
            let route = '', streetNumber = '', postalCode = '', locality = '';
            place.address_components.forEach(comp => {
                const t = comp.types;
                if (t.includes('route')) route = comp.long_name;
                if (t.includes('street_number')) streetNumber = comp.long_name;
                if (t.includes('postal_code')) postalCode = comp.long_name;
                if (t.includes('locality')) locality = comp.long_name;
                if (t.includes('postal_town') && !locality) locality = comp.long_name;
            });
            setCustomer(c => ({
                ...c,
                address: route ? `${route} ${streetNumber}`.trim() : (place.name || c.address),
                zip: postalCode || c.zip,
                city: locality || c.city,
            }));
        } else if (place && place.name) {
            setCustomer(c => ({ ...c, address: place.name }));
        }
    };

    // Kunde-objekt til PDF'en: saml gade + postnr + by til én adresselinje.
    const customerForPdf = () => ({
        ...customer,
        address: [customer.address, [customer.zip, customer.city].filter(Boolean).join(' ')].filter(Boolean).join(', ').trim(),
    });
    // Davidsen-PDF
    const [materialFile, setMaterialFile] = useState(null);
    // Personlige beskeder — adskilt: én på tilbuddet (PDF), én i mailen.
    const [pdfNote, setPdfNote] = useState(mq0.noteHtml || '');
    const [emailMessage, setEmailMessage] = useState(initialLead?.raw_data?.custom_message || STANDARD_EMAIL_MSG);
    // Hvor mange dage tilbuddet er gyldigt (vises i PDF + mail, og styrer udløb på kunde-siden).
    const [validityDays, setValidityDays] = useState(initialLead?.raw_data?.quote_settings?.validityDays || mq0.validityDays || 14);
    // Ved redigering er beskeden allerede skrevet — undlad at overskrive med standard-hilsen.
    const pdfNoteTouched = useRef(isEditing);
    const emailMsgTouched = useRef(isEditing);
    const pdfNoteRef = useRef(null);
    // Preview-fane (kun på mobil) + live-regenerering af PDF
    const [previewTab, setPreviewTab] = useState('edit'); // 'edit' | 'pdf' | 'mail'
    const [regenerating, setRegenerating] = useState(false);
    // Trækbare kolonne-bredder (desktop) + scroll-container (mobil swipe).
    // Standard-størrelsesforhold: fokus på tilbuddet — bredt Rediger-panel + størst PDF i midten,
    // mailen er smallere (den kigger man på til sidst). Kan stadig trækkes manuelt bagefter.
    const [leftW, setLeftW] = useState(420);
    const [rightW, setRightW] = useState(320);
    const [resizing, setResizing] = useState(false);
    const scrollRef = useRef(null);
    // PDF-fokus: på bærbare skærme er midter-kolonnen for smal til at læse tilbuddet.
    // pdfMax skjuler Rediger- og Mail-kolonnerne, så PDF'en fylder hele skærmen.
    const [pdfMax, setPdfMax] = useState(false);
    const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
    useEffect(() => {
        const onR = () => setVw(window.innerWidth);
        window.addEventListener('resize', onR);
        return () => window.removeEventListener('resize', onR);
    }, []);
    // "Bærbar": rigtig desktop-layout, men ikke nok bredde til at PDF'en kan læses i 3-kolonne-visning.
    const isLaptop = !isMobile && vw < 1440;
    // PDF-viewer uden mørk værktøjslinje + tilpas til bredden, så siden fylder rammen og kan læses.
    const viewerSrc = (u) => u ? `${u}#toolbar=0&navpanes=0&statusbar=0&view=FitH` : u;

    // Forudfyld PDF-beskeden (med hilsen) når kundenavn ændres, indtil brugeren selv retter.
    // contentEditable er ukontrolleret, så vi sætter både state og editorens indhold imperativt.
    // Mail-beskeden er kun brødtekst og styres ikke af navnet (skabelonen tilføjer "Hej {navn},").
    useEffect(() => {
        if (pdfNoteTouched.current) return;
        const html = STANDARD_PDF_NOTE_HTML(customer.name);
        setPdfNote(html);
        if (pdfNoteRef.current) pdfNoteRef.current.innerHTML = html;
    }, [customer.name]);

    // Ved redigering af en gemt kladde: indsæt det gemte rich-text-indhold i editorerne
    // (contentEditable er ukontrolleret, så det skal sættes imperativt efter mount).
    useEffect(() => {
        if (!isEditing) return;
        if (pdfNoteRef.current) pdfNoteRef.current.innerHTML = mq0.noteHtml || '';
        if (workEditorRef.current) workEditorRef.current.innerHTML = mq0.workHtml || '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Autosave af arbejds-kladden (debounced) ----
    // Gemmer løbende et øjebliksbillede i localStorage, så et nyt tilbud kan genoptages
    // hvis vinduet lukkes uden at gemme. Springer over indtil brugeren har valgt fortsæt/forfra.
    useEffect(() => {
        if (!canAutosave.current) return;
        const t = setTimeout(() => {
            try {
                const snap = { title, materialCost, markup, laborMode, laborFixed, laborRate, laborHours, extras, workDescHtml, pdfNote, customer, emailMessage, validityDays, savedAt: Date.now() };
                if (draftHasContent(snap)) window.localStorage.setItem(draftKey, JSON.stringify(snap));
            } catch { /* localStorage kan være fuld/blokeret — ignorér */ }
        }, 600);
        return () => clearTimeout(t);
    }, [title, materialCost, markup, laborMode, laborFixed, laborRate, laborHours, extras, workDescHtml, pdfNote, customer, emailMessage, validityDays, draftKey]);

    // Fortsæt i den gemte kladde: indlæs øjebliksbilledet i alle felter.
    const continueDraft = () => {
        const d = savedDraftRef.current;
        if (d) {
            setTitle(d.title || '');
            setMaterialCost(d.materialCost || '');
            setMarkup(d.markup != null ? String(d.markup) : '35');
            setLaborMode(d.laborMode || 'fixed');
            setLaborFixed(d.laborFixed || '');
            setLaborRate(d.laborRate || String(carpenter?.hourly_rate || carpenter?.raw_data?.hourly_rate || '550'));
            setLaborHours(d.laborHours || '');
            setExtras((Array.isArray(d.extras) && d.extras.length) ? d.extras.map(e => ({ id: uid(), desc: e.desc || '', amount: e.amount != null ? String(e.amount) : '' })) : [{ id: uid(), desc: '', amount: '' }]);
            setWorkDescHtml(d.workDescHtml || '');
            setPdfNote(d.pdfNote || '');
            if (d.customer) setCustomer({ name: '', email: '', phone: '', address: '', zip: '', city: '', ...d.customer });
            setEmailMessage(d.emailMessage || STANDARD_EMAIL_MSG);
            setValidityDays(d.validityDays || 14);
            // contentEditable-editorerne er ukontrollerede → sæt indholdet imperativt.
            // Markér som "rørt" så standard-hilsenerne ikke overskriver det genindlæste.
            pdfNoteTouched.current = true;
            emailMsgTouched.current = true;
            requestAnimationFrame(() => {
                if (workEditorRef.current) workEditorRef.current.innerHTML = d.workDescHtml || '';
                if (pdfNoteRef.current) pdfNoteRef.current.innerHTML = d.pdfNote || '';
            });
        }
        canAutosave.current = true;
        setRestorePrompt(false);
    };

    // Start forfra: kassér den gemte kladde og fortsæt med tom formular.
    const startFreshDraft = () => {
        clearWorkingDraft();
        savedDraftRef.current = null;
        canAutosave.current = true;
        setRestorePrompt(false);
    };

    // ---- Live-beregning ----
    const calc = useMemo(() => {
        const mCost = num(materialCost);
        const mPct = num(markup);
        const materialSell = mCost * (1 + mPct / 100);
        const laborTotal = laborMode === 'hourly' ? num(laborRate) * num(laborHours) : num(laborFixed);
        const extrasSum = extras.reduce((s, e) => s + num(e.amount), 0);
        const totalExVat = materialSell + laborTotal + extrasSum;
        const vat = totalExVat * 0.25;
        const totalIncVat = totalExVat + vat;
        return { mCost, mPct, materialSell, laborTotal, extrasSum, totalExVat, vat, totalIncVat };
    }, [materialCost, markup, laborMode, laborFixed, laborRate, laborHours, extras]);

    const buildQuoteObj = () => ({
        materialCost: calc.mCost,
        materialMarkupPct: calc.mPct,
        materialSell: calc.materialSell,
        laborMode,
        laborFixed: num(laborFixed),
        laborRate: num(laborRate),
        laborHours: num(laborHours),
        laborTotal: calc.laborTotal,
        extras: extras.filter(e => num(e.amount) > 0 || (e.desc || '').trim()).map(e => ({ desc: e.desc || 'Tillæg', amount: num(e.amount) })),
        workHtml: workDescHtml,
        workLines: htmlToPlainLines(workDescHtml),
        totalExVat: calc.totalExVat,
        vat: calc.vat,
        totalIncVat: calc.totalIncVat,
        noteHtml: pdfNote,
        note: htmlToPlainLines(pdfNote).join('\n'),
        validityDays: num(validityDays) || 14,
    });

    // ---- Preview af PDF + mail ----
    // Dobbelt-buffer: to PDF-lag oven på hinanden. Den nye version loades usynligt i baggrunden
    // og vises først når den er færdig — så brugeren aldrig ser den sorte "genindlæsnings"-flash.
    const [slotUrls, setSlotUrls] = useState([null, null]);
    const [front, setFront] = useState(0);
    const frontRef = useRef(0);
    const slotUrlsRef = useRef([null, null]);
    useEffect(() => { frontRef.current = front; }, [front]);
    useEffect(() => { slotUrlsRef.current = slotUrls; }, [slotUrls]);
    const frontUrl = slotUrls[front];
    // Når baggrunds-laget er færdig-loadet, skiftes der over til det.
    const onSlotLoaded = (idx) => {
        if (idx !== frontRef.current && slotUrlsRef.current[idx]) {
            frontRef.current = idx;
            setFront(idx);
        }
    };
    const dateStr = new Date().toLocaleDateString('da-DK');

    const emailHtml = useMemo(() => {
        return getCustomerOfferSentTemplate(
            customer.name || 'kunde', '#', title || 'dit projekt', carpenter,
            'PDF', false, null, emailMessage, num(validityDays) || 14
        );
    }, [customer.name, title, carpenter, emailMessage, validityDays]);

    // Live-regenerér PDF-preview (debounced) når noget i tilbuddet ændres.
    const quoteSig = JSON.stringify(buildQuoteObj()) + '|' + title + '|' + JSON.stringify(customer);
    useEffect(() => {
        let cancelled = false;
        setRegenerating(true);
        const t = setTimeout(async () => {
            try {
                const { blob } = await buildQuotePdf(buildQuoteObj(), carpenter, customerForPdf(), { title, dateStr });
                if (cancelled) return;
                const back = 1 - frontRef.current;
                const newUrl = URL.createObjectURL(blob);
                setSlotUrls(prev => {
                    const next = [...prev];
                    if (next[back]) URL.revokeObjectURL(next[back]); // det skjulte (2 generationer gamle) lag
                    next[back] = newUrl;
                    return next;
                });
            } catch { /* ignore preview-fejl */ }
            finally { if (!cancelled) setRegenerating(false); }
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quoteSig]);

    useEffect(() => () => { slotUrlsRef.current.forEach(u => u && URL.revokeObjectURL(u)); }, []);

    // ---- Gem (kladde eller send) ----
    const save = async (sendToCustomer) => {
        if (!customer.name.trim()) return toast.error('Udfyld kundens navn.');
        if (sendToCustomer && (!customer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) {
            return toast.error('Udfyld en gyldig email for at sende tilbuddet.');
        }
        setBusy(true);
        // Genbrug det eksisterende quote_token ved redigering, så kundens link forbliver gyldigt.
        const quoteToken = initialLead?.quote_token || uid();
        try {
            const quoteObj = buildQuoteObj();

            // 1) Upload Davidsen-PDF (hvis vedhæftet)
            const materialPdfs = [];
            if (materialFile) {
                const ext = materialFile.name.split('.').pop() || 'pdf';
                const fn = `manual_${quoteToken}_materialer.${ext}`;
                const { error: upErr } = await supabase.storage.from('uploads').upload(fn, materialFile, { upsert: true, cacheControl: '0' });
                if (upErr) throw new Error('Upload af materiale-PDF fejlede: ' + upErr.message);
                const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fn);
                materialPdfs.push({ id: uid(), name: materialFile.name, url: publicUrl, amount: calc.mCost, date: new Date().toISOString() });
            }

            // 2) Generér tilbuds-PDF og upload
            let quotePdfUrl = null;
            try {
                const { blob } = await buildQuotePdf(quoteObj, carpenter, customerForPdf(), { title, dateStr });
                const qfn = `manual_${quoteToken}_tilbud.pdf`;
                const { error: qErr } = await supabase.storage.from('uploads').upload(qfn, blob, { upsert: true, cacheControl: '0', contentType: 'application/pdf' });
                if (!qErr) {
                    quotePdfUrl = supabase.storage.from('uploads').getPublicUrl(qfn).data.publicUrl;
                }
            } catch (e) { /* PDF er ikke kritisk for at gemme */ }

            // 3) Gem lead — opdater eksisterende kladde eller indsæt ny
            // Et allerede sendt tilbud forbliver "Sendt tilbud" — det hopper ikke tilbage til kladde.
            const status = (sendToCustomer || wasSent) ? 'Sendt tilbud' : 'Tilbudskladder';
            const existingPdfs = initialLead?.raw_data?.material_pdfs || [];
            // Fuld adresse til visning/Google Maps-links i lead-/sagslisten.
            const fullAddress = [customer.address, [customer.zip, customer.city].filter(Boolean).join(' ')]
                .filter(Boolean).join(', ').trim();

            // Når tilbuddet (gen)sendes: stempl afsendelsestidspunkt (gyldigheden løber herfra)
            // og ryd evt. tidligere forlængelse (validUntil), så gyldigheden er ren igen.
            const isSendingNow = (sendToCustomer || wasSent);
            const nextQuoteSettings = { ...(initialLead?.raw_data?.quote_settings || {}), validityDays: num(validityDays) || 14 };
            if (isSendingNow) delete nextQuoteSettings.validUntil;

            const raw_data = {
                ...(initialLead?.raw_data || {}),
                is_manual_quote: true,
                manual_quote: quoteObj,
                quote_settings: nextQuoteSettings,
                ...(isSendingNow ? { quote_sent_at: new Date().toISOString() } : {}),
                custom_message: emailMessage,
                calc_data: { materialCost: calc.materialSell, materialCostBase: calc.mCost, laborHours: num(laborHours), hourlyRate: num(laborRate) },
                actual_quote_price: calc.totalExVat,
                // Strukturerede kundefelter bevares så de kan genindlæses korrekt ved redigering.
                customerDetails: { ...(initialLead?.raw_data?.customerDetails || {}), street: customer.address, zip: customer.zip, city: customer.city },
                quote_pdf_url: quotePdfUrl ? `${quotePdfUrl}?t=${Date.now()}` : (initialLead?.raw_data?.quote_pdf_url),
                material_pdfs: materialFile ? [...existingPdfs, ...materialPdfs] : existingPdfs,
                checklist: initialLead?.raw_data?.checklist || seedChecklist(quoteObj.workLines),
            };

            const fields = {
                customer_name: customer.name,
                customer_email: customer.email || null,
                customer_phone: customer.phone || null,
                customer_address: fullAddress || null,
                project_category: title || 'Manuelt tilbud',
                price_estimate: `${kr(calc.totalIncVat)} DKK`,
                quote_token: quoteToken,
                carpenter_id: carpenter.id,
                status,
                raw_data,
            };

            let lead, error;
            if (isEditing) {
                ({ data: lead, error } = await supabase.from('leads').update(fields).eq('id', initialLead.id).select().single());
            } else {
                ({ data: lead, error } = await supabase.from('leads').insert([fields]).select().single());
            }
            if (error) throw error;

            // 4) Send mail til kunden
            if (sendToCustomer && customer.email) {
                const slug = carpenter?.slug || 't';
                const quoteUrl = `${window.location.origin}/${slug}/tilbud/${quoteToken}`;
                const { sendEmail } = await import('../../utils/sendEmail');
                const carpenterName = carpenter?.company_name || carpenter?.owner_name || 'Din Tømrer';
                await sendEmail({
                    to: customer.email,
                    subject: wasSent ? `Dit opdaterede tilbud fra ${carpenterName} er klar` : `Dit tilbud fra ${carpenterName} er klar`,
                    html: getCustomerOfferSentTemplate(customer.name, quoteUrl, title || 'dit projekt', carpenter, quotePdfUrl, wasSent, lead?.case_number || null, emailMessage, num(validityDays) || 14),
                    fromName: getCarpenterSenderName(carpenter),
                    replyTo: carpenter?.email,
                });
            }

            // Tilbuddet er nu gemt rigtigt i databasen → ryd den midlertidige auto-kladde.
            clearWorkingDraft();
            toast.success(sendToCustomer ? (wasSent ? 'Opdateret tilbud sendt til kunden! 🎉' : 'Tilbuddet er sendt til kunden! 🎉') : 'Kladden er gemt.');
            onComplete && onComplete(lead);
        } catch (e) {
            toast.error('Noget gik galt: ' + (e.message || e));
        } finally {
            setBusy(false);
        }
    };

    // ---- Slet tilbuddet helt (soft-delete via RPC — kun ved redigering af eksisterende) ----
    const del = () => { if (initialLead?.id) setConfirmDelete(true); };

    const doDelete = async () => {
        if (!initialLead?.id) return;
        setBusy(true);
        try {
            const { error } = await supabase.rpc('soft_delete_lead', { p_lead_id: initialLead.id });
            if (error) throw error;
            toast.success('Tilbuddet er slettet.');
            setConfirmDelete(false);
            if (onDeleted) onDeleted(initialLead.id);
            else if (onCancel) onCancel();
        } catch (e) {
            toast.error('Kunne ikke slette tilbuddet: ' + (e.message || e));
        } finally {
            setBusy(false);
        }
    };

    // ========================================================================
    // Genbrugelige felt-grupper — bruges af BÅDE formularen og preview-editoren,
    // så de to altid er i sync. (Kaldes som funktioner, ikke <Komponenter/>, for
    // ikke at remounte og miste fokus ved hvert tastetryk.)
    // ========================================================================
    const renderTitleInput = () => (
        <input className="qqb-input" style={input} placeholder="F.eks. 'Nyt tag på Nørrevænget 1'" value={title} onChange={(e) => setTitle(e.target.value)} />
    );

    const renderMaterialInputs = () => (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={label}>Indkøbspris</label>
                    <input className="qqb-input" style={input} inputMode="decimal" placeholder="167.080" value={materialCost} onChange={(e) => setMaterialCost(fmtDk(e.target.value))} />
                </div>
                <div>
                    <label style={label}>Avance %</label>
                    <input className="qqb-input" style={input} inputMode="decimal" placeholder="35" value={markup} onChange={(e) => setMarkup(e.target.value)} />
                </div>
            </div>
            <div style={resultChip}>
                <span style={chipLbl}>Materialer i tilbud</span>
                <span style={{ ...chipVal, color: '#2563eb' }}>{kr(calc.materialSell)} kr</span>
            </div>
        </>
    );

    const renderUploadField = () => (
        <>
            <label style={{ ...label, marginTop: '14px' }}>Materialeliste (PDF)</label>
            {materialFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                    <FileText size={18} color="#16a34a" />
                    <span style={{ flex: 1, fontSize: '0.9rem', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{materialFile.name}</span>
                    <button onClick={() => setMaterialFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><Trash2 size={16} /></button>
                </div>
            ) : (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                    <Upload size={18} /> Vedhæft PDF
                    <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} />
                </label>
            )}
        </>
    );

    const renderLaborInputs = () => (
        <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {[{ k: 'fixed', t: 'Fast pris' }, { k: 'hourly', t: 'Timepris' }].map(o => (
                    <button key={o.k} className={`qqb-toggle ${laborMode === o.k ? 'qqb-toggle-on' : ''}`} onClick={() => setLaborMode(o.k)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${laborMode === o.k ? '#0f172a' : '#cbd5e1'}`, background: laborMode === o.k ? '#0f172a' : '#fff', color: laborMode === o.k ? '#fff' : '#475569', fontWeight: 700, cursor: 'pointer' }}>{o.t}</button>
                ))}
            </div>
            {laborMode === 'fixed' ? (
                <div>
                    <label style={label}>Fast pris</label>
                    <input className="qqb-input" style={input} inputMode="decimal" placeholder="75.000" value={laborFixed} onChange={(e) => setLaborFixed(fmtDk(e.target.value))} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={label}>Timepris</label>
                        <input className="qqb-input" style={input} inputMode="decimal" value={laborRate} onChange={(e) => setLaborRate(fmtDk(e.target.value))} />
                    </div>
                    <div>
                        <label style={label}>Antal timer</label>
                        <input className="qqb-input" style={input} inputMode="decimal" placeholder="120" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
                    </div>
                </div>
            )}
            <div style={resultChip}>
                <span style={chipLbl}>Arbejde i alt</span>
                <span style={{ ...chipVal, color: '#d97706' }}>{kr(calc.laborTotal)} kr</span>
            </div>
        </>
    );

    // Genbrugelig Word-lignende rich-text-editor (bruges af både "Besked på tilbuddet" og
    // "Arbejdsbeskrivelse"). execCommand styrer fed/kursiv/punkter; Cmd/Ctrl+B virker natively.
    // onMouseDown-preventDefault på knapperne bevarer markeringen i editoren.
    const tbtn = (title, onClick, content) => (
        <button type="button" title={title} className="qqb-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
            style={{ minWidth: '34px', height: '32px', padding: '0 9px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {content}
        </button>
    );
    const renderRichEditor = (ref, onChange, placeholder, minHeight = '96px') => {
        const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
        const exec = (cmd) => { ref.current?.focus(); document.execCommand(cmd, false, null); sync(); };
        const onPaste = (e) => {
            e.preventDefault();
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');
            const clean = html ? sanitizeHtml(html) : escapeHtml(text).replace(/\n/g, '<br>');
            document.execCommand('insertHTML', false, clean);
            sync();
        };
        return (
            <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {tbtn('Fed (Cmd/Ctrl+B)', () => exec('bold'), <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>F</span>)}
                    {tbtn('Kursiv', () => exec('italic'), <span style={{ fontStyle: 'italic', fontFamily: 'serif' }}>K</span>)}
                    {tbtn('Punktliste', () => exec('insertUnorderedList'), <><span style={{ fontSize: '1.1rem', lineHeight: 1 }}>•</span><span style={{ fontSize: '0.78rem' }}>Liste</span></>)}
                </div>
                <div
                    ref={ref}
                    className="qqb-input qqb-editor"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                    onInput={sync}
                    onBlur={sync}
                    onPaste={onPaste}
                    style={{ ...input, minHeight, lineHeight: 1.5 }}
                />
            </>
        );
    };

    const renderExtras = () => (
        <>
            {extras.map((ex) => (
                <div key={ex.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input className="qqb-input" style={{ ...input, flex: 2 }} placeholder="F.eks. Leje af stillads" value={ex.desc} onChange={(e) => setExtras(prev => prev.map(x => x.id === ex.id ? { ...x, desc: e.target.value } : x))} />
                    <input className="qqb-input" style={{ ...input, flex: 1 }} inputMode="decimal" placeholder="kr" value={ex.amount} onChange={(e) => setExtras(prev => prev.map(x => x.id === ex.id ? { ...x, amount: fmtDk(e.target.value) } : x))} />
                    {extras.length > 1 && (
                        <button className="qqb-iconbtn" onClick={() => setExtras(prev => prev.filter(x => x.id !== ex.id))} style={{ background: '#fef2f2', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                    )}
                </div>
            ))}
            <button className="qqb-add" onClick={() => setExtras(prev => [...prev, { id: uid(), desc: '', amount: '' }])} style={{ marginTop: '4px', background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}><Plus size={16} /> Tilføj tillæg</button>
        </>
    );

    const renderCustomerInputs = () => (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div><label style={label}>Navn *</label><input className="qqb-input" style={input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
            <div><label style={label}>Telefon</label><input className="qqb-input" style={input} type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: formatDkPhone(e.target.value) })} placeholder="+45 12 34 56 78" /></div>
            <div><label style={label}>Email</label><input className="qqb-input" style={input} type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
            <div>
                <label style={label}>Adresse</label>
                {gmapsLoaded ? (
                    <Autocomplete
                        onLoad={setAddressAutocomplete}
                        onPlaceChanged={onAddressPlaceChanged}
                        options={{ componentRestrictions: { country: 'dk' }, fields: ['address_components', 'name'] }}
                    >
                        <input className="qqb-input" style={input} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Begynd at skrive adressen…" />
                    </Autocomplete>
                ) : (
                    <input className="qqb-input" style={input} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
                )}
            </div>
            <div><label style={label}>Postnummer</label><input className="qqb-input" style={input} inputMode="numeric" maxLength={4} value={customer.zip} onChange={(e) => setCustomer({ ...customer, zip: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} /></div>
            <div><label style={label}>By</label><input className="qqb-input" style={input} value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></div>
        </div>
    );

    // Træk i en skillelinje for at gøre kolonnerne større/mindre (desktop).
    // requestAnimationFrame-throttling + et fuldskærms-overlay (se render) holder det smooth —
    // overlayet sikrer at musen ikke "fanges" af PDF/mail-iframes midt i et træk.
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
        const move = (ev) => {
            lastDx = ev.clientX - startX;
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const end = () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
    };

    // Mobil: swipe/scroll mellem de tre paneler + faner der hopper hen til rette panel.
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

    // ---- Render: fuldskærm, 3 zoner ----
    {
        // Kolonne-styling: trækbare kolonner på desktop, swipe-paneler på mobil.
        const colBase = { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 };
        const mobileCol = { flex: '0 0 100%', width: '100%', scrollSnapAlign: 'start' };
        const leftStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: `0 0 ${leftW}px` }), background: '#ffffff', overflowY: 'auto' };
        const midStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: '1 1 auto' }), background: '#f8fafc' };
        const pdfFocus = !isMobile && pdfMax; // hele skærmen til PDF'en (kun desktop/bærbar)
        const rightStyle = { ...colBase, ...(isMobile ? mobileCol : { flex: `0 0 ${rightW}px` }), background: '#ffffff', overflowY: 'auto' };
        const renderDivider = (type) => (
            <div className="qqb-divider" onPointerDown={(e) => startResize(type, e)}><div className="qqb-grip" /></div>
        );

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
            <div className="qqb-col" style={leftStyle}>
                {zoneHead(<Pencil size={16} color="#3b82f6" />, 'Rediger tilbuddet', '#ffffff')}
                <div style={editSection}>
                    <h3 style={editH}><User size={18} color="#0f172a" /> Kunde</h3>
                    {renderCustomerInputs()}
                </div>
                <div style={editSection}>
                    <label style={label}>Opgavetitel</label>
                    {renderTitleInput()}
                </div>
                <div style={editSection}>
                    <label style={label}>Tilbuddet er gyldigt i (dage)</label>
                    <input
                        className="qqb-input"
                        style={{ ...input, maxWidth: '160px' }}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={validityDays}
                        onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Vises på tilbuddet og i mailen. Efter {validityDays} dage markeres tilbuddet som udløbet for kunden.</p>
                </div>
                <div style={editSection}>
                    <label style={label}>Besked på tilbuddet</label>
                    {renderRichEditor(pdfNoteRef, (h) => { pdfNoteTouched.current = true; setPdfNote(h); }, 'Skriv en kort intro til kunden — fx "Hermed fremsendes tilbud på følgende arbejde:"', '80px')}
                </div>
                <div style={editSection}>
                    <h3 style={editH}><Package size={18} color="#3b82f6" /> Materialer</h3>
                    {renderMaterialInputs()}
                    {renderUploadField()}
                </div>
                <div style={editSection}>
                    <h3 style={editH}><Hammer size={18} color="#f59e0b" /> Arbejde</h3>
                    {renderLaborInputs()}
                </div>
                <div style={editSection}>
                    <h3 style={editH}><CheckCircle2 size={18} color="#10b981" /> Arbejdsbeskrivelse</h3>
                    {renderRichEditor(workEditorRef, setWorkDescHtml, 'Skriv arbejdsbeskrivelsen frit — markér tekst og gør den fed, lav punkter, eller indsæt direkte fra Word.')}
                </div>
                <div style={editSection}>
                    <h3 style={editH}><Plus size={18} color="#64748b" /> Tillæg</h3>
                    {renderExtras()}
                </div>
            </div>
        );

        const maxBtn = !isMobile && (
            <button
                onClick={() => setPdfMax(m => !m)}
                className={`qqb-maxbtn${(isLaptop && !pdfMax) ? ' qqb-maxbtn-hint' : ''}`}
                title={pdfMax ? 'Tilbage til redigering' : 'Vis PDF i fuld størrelse'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (pdfMax ? '#0f172a' : '#cbd5e1'), background: pdfMax ? '#0f172a' : '#fff', color: pdfMax ? '#fff' : '#334155', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
            >
                {pdfMax ? <><Minimize2 size={14} /> Vis redigering</> : <><Maximize2 size={14} /> Forstør PDF</>}
            </button>
        );

        const midCol = (
            <div style={pdfFocus ? { ...midStyle, flex: '1 1 auto' } : midStyle}>
                {zoneHead(<FileText size={16} color="#3b82f6" />, "Sådan ser PDF'en ud", '#f8fafc', maxBtn)}
                <div style={{ flex: 1, minHeight: 0, padding: pdfFocus ? '22px clamp(16px, 4vw, 64px)' : '16px', display: 'flex', flexDirection: 'column', alignItems: pdfFocus ? 'center' : 'stretch', position: 'relative', background: pdfFocus ? '#1e293b' : 'transparent' }}>
                    {regenerating && (
                        <div style={{ position: 'absolute', top: '26px', right: '26px', zIndex: 3, background: 'rgba(15,23,42,0.82)', color: '#fff', padding: '6px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px', backdropFilter: 'blur(4px)' }}>
                            <span className="qqb-spin" style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                            Opdaterer…
                        </div>
                    )}
                    <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: pdfFocus ? '920px' : 'clamp(720px, 60vw, 1180px)', position: 'relative', borderRadius: '14px', background: '#fff', boxShadow: pdfFocus ? '0 24px 60px rgba(0,0,0,0.45)' : '0 10px 30px rgba(15,23,42,0.10)' }}>
                        {[0, 1].map(i => slotUrls[i] ? (
                            <iframe key={i} title={`Tilbud PDF ${i}`} src={viewerSrc(slotUrls[i])} onLoad={() => onSlotLoaded(i)}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff', opacity: front === i ? 1 : 0, transition: 'opacity .18s ease', pointerEvents: (resizing || front !== i) ? 'none' : 'auto' }} />
                        ) : null)}
                        {!frontUrl && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Genererer…</div>
                        )}
                    </div>
                    <a className="qqb-link" href={frontUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: pdfFocus ? '#93c5fd' : '#3b82f6', fontWeight: 600, fontSize: '0.9rem', alignSelf: pdfFocus ? 'center' : 'flex-start' }}>Åbn i nyt vindue ▸</a>
                </div>
            </div>
        );

        const rightCol = (
            <div className="qqb-col" style={rightStyle}>
                {zoneHead(<Mail size={16} color="#8b5cf6" />, 'Mailen til kunden', '#ffffff')}
                <div style={{ flex: 1, minHeight: 0, padding: '18px', display: 'flex', flexDirection: 'column' }}>
                    <label style={label}>Personlig besked i mailen</label>
                    {/* På mobil er skrivefeltet større, så man kan se hele beskeden mens man retter den. */}
                    <textarea className="qqb-input" value={emailMessage} onChange={(e) => { emailMsgTouched.current = true; setEmailMessage(e.target.value); }} rows={isMobile ? 8 : 5} style={{ ...input, resize: 'vertical', fontFamily: 'inherit', marginBottom: '14px', minHeight: isMobile ? '180px' : undefined, fontSize: isMobile ? '16px' : input.fontSize }} />
                    <div style={{ flex: 1, minHeight: isMobile ? '420px' : '320px', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                        <iframe title="Email preview" srcDoc={emailHtml} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: resizing ? 'none' : 'auto' }} />
                    </div>
                </div>
            </div>
        );

        const tabBtn = (k, text, Icon) => {
            const on = previewTab === k;
            return (
                <button key={k} className="qqb-tab" onClick={() => goTab(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: on ? '#0f172a' : '#f1f5f9', color: on ? '#fff' : '#475569' }}>
                    <Icon size={15} /> {text}
                </button>
            );
        };

        return createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 100050, background: '#eef2f6', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
                <style>{PREVIEW_CSS}</style>
                {/* Fanger musen under træk, så iframes ikke "stjæler" events og laver lag */}
                {resizing && <div style={{ position: 'fixed', inset: 0, zIndex: 100060, cursor: 'col-resize' }} />}

                {/* "Fortsæt hvor du slap?" — vises hvis et tidligere, ugemt tilbud blev fundet i localStorage. */}
                {restorePrompt && (() => {
                    const d = savedDraftRef.current || {};
                    const navn = (d.customer && d.customer.name && d.customer.name.trim()) || (d.title && d.title.trim()) || '';
                    return (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100070, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '20px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', padding: '30px 28px 24px', textAlign: 'center', animation: 'qqbConfirmPop .28s cubic-bezier(.34,1.56,.64,1) both' }}>
                                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                                    <FileText size={28} color="#3b82f6" />
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Fortsæt hvor du slap?</div>
                                <div style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
                                    Du var i gang med et tilbud{navn ? <> til <strong style={{ color: '#334155' }}>{navn}</strong></> : null}, som ikke nåede at blive gemt. Vil du fortsætte med det — eller starte forfra?
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button onClick={continueDraft} className="qqb-send" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 10px 26px rgba(16,185,129,.4)' }}>
                                        <FileText size={17} /> Fortsæt mit tilbud
                                    </button>
                                    <button onClick={startFreshDraft} className="qqb-ghost" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                                        <Plus size={17} /> Start et nyt tilbud
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Topbjælke — safe-area-padding så titel/luk ikke gemmer sig under statusbjælken på mobil */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: isMobile ? '12px 16px' : '14px 22px', paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top))' : undefined, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 800, color: '#0f172a' }}>Hurtigt tilbud</div>
                        {!isMobile && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ret tilbuddet og mailen — kunden ser det live til højre.</div>}
                    </div>
                    <button className="qqb-close" onClick={() => onCancel && onCancel()} title="Luk" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Faner (mobil) */}
                {isMobile && (
                    <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                        {tabBtn('edit', 'Rediger', Pencil)}
                        {tabBtn('pdf', 'Tilbud', FileText)}
                        {tabBtn('mail', 'Mail', Mail)}
                    </div>
                )}

                {/* Zoner — trækbare kolonner på desktop, swipe-paneler på mobil */}
                {isMobile ? (
                    <div ref={scrollRef} onScroll={onScrollSync} className="qqb-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                        {leftCol}
                        {midCol}
                        {rightCol}
                    </div>
                ) : pdfMax ? (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                        {midCol}
                    </div>
                ) : (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                        {leftCol}
                        {renderDivider('left')}
                        {midCol}
                        {renderDivider('right')}
                        {rightCol}
                    </div>
                )}

                {/* Bundbjælke — safe-area-padding så knapperne ikke gemmer sig bag home-indikatoren */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: isMobile ? '12px 16px' : '14px 22px', paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : undefined, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>I alt inkl. moms</div>
                        <div style={{ fontSize: isMobile ? '1.4rem' : '1.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{kr(calc.totalIncVat)} kr</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {isEditing && (
                        <button className="qqb-ghost" disabled={busy} onClick={del} title="Slet tilbuddet helt" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={18} /> Slet
                        </button>
                        )}
                        {!wasSent && (
                        <button className="qqb-ghost" disabled={busy} onClick={() => save(false)} style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> Gem kladde
                        </button>
                        )}
                        <button className="qqb-send" disabled={busy} onClick={() => save(true)} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                            <Send size={18} /> {busy ? 'Sender…' : (wasSent ? 'Send opdateret tilbud' : 'Send tilbud')}
                        </button>
                    </div>
                </div>

                {/* Lækker fuld-skærms bekræftelse ved sletning */}
                {confirmDelete && (
                    <div
                        className="qqb-confirm-backdrop"
                        onClick={() => !busy && setConfirmDelete(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100080, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
                    >
                        <div
                            className="qqb-confirm-card"
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 'min(440px, 100%)', background: '#fff', borderRadius: 24, padding: '34px 30px 26px', textAlign: 'center', boxShadow: '0 30px 80px rgba(15,23,42,0.45)' }}
                        >
                            <div className="qqb-confirm-icon" style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
                                <Trash2 size={32} color="#ef4444" />
                            </div>
                            <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                                {wasSent ? 'Slet det sendte tilbud?' : 'Slet tilbuddet?'}
                            </h2>
                            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '1rem', lineHeight: 1.55 }}>
                                Er du sikker på, at du vil slette tilbuddet til <strong style={{ color: '#0f172a' }}>{customer.name || 'kunden'}</strong> permanent? Dette kan ikke fortrydes.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="qqb-confirm-cancel"
                                    disabled={busy}
                                    onClick={() => setConfirmDelete(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                                >
                                    Fortryd
                                </button>
                                <button
                                    className="qqb-confirm-delete"
                                    disabled={busy}
                                    onClick={doDelete}
                                    style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(145deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(239,68,68,0.32)' }}
                                >
                                    <Trash2 size={17} /> {busy ? 'Sletter…' : 'Ja, slet tilbud'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>,
            document.body
        );
    }
}
