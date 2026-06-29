import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Plus, Trash2, FileText, Upload, Send, Save, Hammer, Package, User, Mail, CheckCircle2, Pencil, X, Maximize2, Minimize2, Mic, Files, Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { friendlyError } from '../../utils/friendlyError';
import { buildQuotePdf } from '../../utils/quotePdf';
import { getCustomerOfferSentTemplate, getCarpenterSenderName } from '../../utils/emailTemplates';
import { listQuoteTemplates, createQuoteTemplate, updateQuoteTemplate, deleteQuoteTemplate } from '../../utils/quoteTemplates';
import Coachmark from './Coachmark';
import SectionTour from './SectionTour';
import SmtpIntegration from './SmtpIntegration';
import { shouldShowCoach, markCoachSeen, skipAllCoach } from './coachmarks';

// Første-gangs walkthrough af Hurtigt tilbud (kun desktop, kun én gang, altid spring-bar).
const QUICKQUOTE_TOUR_STEPS = [
    { sel: '[data-tour="qq-edit"]', placement: 'right', eyebrow: 'Hurtigt tilbud', title: 'Her bygger du tilbuddet', body: 'Skriv kunden, en kort beskrivelse og dine priser — materialer og arbejde. Alt det kunden skal se, taster du ind her.' },
    { sel: '[data-tour="qq-ai"]', placement: 'right', eyebrow: 'Spar tid', title: 'Eller indtal det hele', body: 'Tryk her og fortæl frit om kunden og opgaven — så udfylder Frame felterne for dig. Du retter bare til bagefter.' },
    { sel: '[data-tour="qq-pdf-col"]', placement: 'left', eyebrow: 'Live', title: 'Dit tilbud — i real-time', body: 'Mens du udfylder til venstre, opdaterer PDF-tilbuddet sig med det samme. Det er præcis sådan kunden ser det.' },
    { sel: '[data-tour="qq-mail-col"]', placement: 'left', eyebrow: 'Mailen', title: 'Mailen kunden får', body: 'Og her er selve mailen — med "Bekræft tilbud"-knappen, der fører kunden til en sikker portal.' },
    { sel: '[data-tour="qq-save"]', placement: 'top', eyebrow: 'Gem til senere', title: 'Gem kladde', body: 'Ikke færdig? Gem som kladde og fortsæt senere — fx hvis du starter på farten og gør det færdigt, når du er hjemme. Det virker også på mobilen.' },
    { sel: '[data-tour="qq-send"]', placement: 'top', eyebrow: 'Afsend', title: 'Send tilbud', body: 'Når du er klar, sender du her. Kunden får mailen med "Bekræft tilbud" — og svarer de, lander det direkte hos dig.' },
];

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

// Rens/normalisér indsat HTML (fx fra Word eller Google Docs) ned til et trygt,
// lille format: p / h2 / h3 / ul / ol / li / b / i / u / br + style="text-align:…".
// Vigtigt: Google Docs/Word lægger formatering i spans med inline-styles
// (font-weight, font-style, text-decoration) — dem læser vi og konverterer til
// rigtige tags, så fed/kursiv/understregning og overskrifter bevares 1:1.
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'TR']);
const HEADING_OUT = (tag) => (tag === 'H1' || tag === 'H2') ? 'h2' : 'h3';
const styleFlags = (el) => {
    const s = (el.getAttribute && el.getAttribute('style')) || '';
    const fw = (s.match(/font-weight:\s*([^;]+)/) || [])[1] || '';
    const bold = /bold|[6-9]00/.test(fw);
    const italic = /font-style:\s*italic/.test(s);
    const underline = /text-decoration[^;]*underline/.test(s);
    return { bold, italic, underline };
};
const alignAttr = (el) => {
    const s = (el.getAttribute && el.getAttribute('style')) || '';
    const m = s.match(/text-align:\s*(center|right|justify)/);
    return m ? ` style="text-align:${m[1] === 'justify' ? 'justify' : m[1]}"` : '';
};
const sanitizeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const wrap = (txt, ctx) => {
        if (!txt) return '';
        let t = txt;
        if (ctx.bold) t = `<b>${t}</b>`;
        if (ctx.italic) t = `<i>${t}</i>`;
        if (ctx.underline) t = `<u>${t}</u>`;
        return t;
    };
    // Serialisér inline-indhold (tekst + b/i/u/span…) til rene b/i/u-tags.
    const inlineEl = (el, ctx) => {
        const f = styleFlags(el);
        return inlineHtml(el, {
            bold: ctx.bold || f.bold || el.tagName === 'B' || el.tagName === 'STRONG',
            italic: ctx.italic || f.italic || el.tagName === 'I' || el.tagName === 'EM',
            underline: ctx.underline || f.underline || el.tagName === 'U',
        });
    };
    function inlineHtml(node, ctx) {
        let out = '';
        node.childNodes.forEach((ch) => {
            if (ch.nodeType === 3) out += wrap(escapeHtml(ch.textContent), ctx);
            else if (ch.nodeType === 1) {
                if (ch.tagName === 'BR') { out += '<br>'; return; }
                out += inlineEl(ch, ctx);
            }
        });
        return out;
    }
    // Gå blokke igennem; saml løs inline-tekst i afsnit, og bevar lister/overskrifter.
    const out = [];
    const walk = (node) => {
        let buf = '';
        const flush = () => { if (buf.trim() || /<br>/.test(buf)) out.push(`<p>${buf}</p>`); buf = ''; };
        node.childNodes.forEach((ch) => {
            if (ch.nodeType === 3) { buf += wrap(escapeHtml(ch.textContent), {}); return; }
            if (ch.nodeType !== 1) return;
            const tag = ch.tagName;
            if (tag === 'BR') { buf += '<br>'; return; }
            const isBlock = BLOCK_TAGS.has(tag) || tag === 'UL' || tag === 'OL' || tag === 'LI';
            if (!isBlock) {
                // Google Docs pakker hele dokumentet i en ydre <b style="font-weight:normal">.
                // Hvis et "inline"-element selv rummer blokke, skal vi gå ned i det som blokke
                // (ellers fladgøres afsnit og lister til én klump tekst).
                const hasBlockChild = Array.from(ch.children || []).some((c) => BLOCK_TAGS.has(c.tagName) || c.tagName === 'UL' || c.tagName === 'OL' || c.tagName === 'LI');
                if (hasBlockChild) { flush(); walk(ch); }
                else buf += inlineEl(ch, {});
                return;
            }
            flush();
            if (tag === 'UL' || tag === 'OL') {
                const lt = tag === 'OL' ? 'ol' : 'ul';
                const items = [];
                ch.childNodes.forEach((li) => {
                    if (li.nodeType === 1 && li.tagName === 'LI') {
                        const inner = inlineHtml(li, {});
                        if (inner.trim()) items.push(`<li>${inner}</li>`);
                    }
                });
                if (items.length) out.push(`<${lt}>${items.join('')}</${lt}>`);
                return;
            }
            if (/^H[1-6]$/.test(tag)) {
                const inner = inlineHtml(ch, {});
                if (inner.trim()) out.push(`<${HEADING_OUT(tag)}${alignAttr(ch)}>${inner}</${HEADING_OUT(tag)}>`);
                return;
            }
            // P / DIV / andre block-containere: hvis de selv rummer blokke, gå dybere.
            const hasBlockChild = Array.from(ch.children || []).some((c) => BLOCK_TAGS.has(c.tagName) || c.tagName === 'UL' || c.tagName === 'OL');
            if (hasBlockChild) { walk(ch); return; }
            const inner = inlineHtml(ch, {});
            if (inner.trim() || ch.querySelector('br')) out.push(`<p${alignAttr(ch)}>${inner}</p>`);
        });
        flush();
    };
    walk(doc.body);
    return out.join('');
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
  .qqb-send-pulse{animation:qqbSendPulse 1.4s ease-out infinite;}
  @keyframes qqbSendPulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.55);transform:translateY(0);}50%{transform:translateY(-2px);}70%{box-shadow:0 0 0 12px rgba(16,185,129,0);}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);transform:translateY(0);}}
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
  .qqb-editor ol{margin:6px 0;padding-left:24px;}
  .qqb-editor li{margin:2px 0;}
  .qqb-editor h2{font-size:1.18rem;font-weight:800;color:#0f172a;margin:12px 0 6px;line-height:1.3;}
  .qqb-editor h3{font-size:1.02rem;font-weight:700;color:#0f172a;margin:10px 0 5px;line-height:1.3;}
  .qqb-editor>*:first-child{margin-top:0;}
  .qqb-editor u{text-decoration:underline;}
  .qqb-tbtn{transition:background .12s ease,border-color .12s ease,transform .1s ease;}
  .qqb-tbtn:hover{background:#f1f5f9 !important;border-color:#94a3b8 !important;}
  .qqb-tbtn:active{transform:translateY(1px);}
  .qqb-newtpl{transition:transform .12s ease,box-shadow .15s ease,filter .12s ease;}
  .qqb-newtpl:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(59,130,246,.28);filter:brightness(1.02);}
  /* Skabelon-galleri (fuldskærm) */
  .qqb-tplgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;align-items:start;}
  .qqb-tplnew{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:300px;border-radius:16px;border:2px dashed #bfdbfe;background:linear-gradient(160deg,#f8fafc,#eff6ff);color:#1d4ed8;font-weight:800;font-size:0.92rem;cursor:pointer;transition:transform .12s ease,box-shadow .15s ease,border-color .12s ease;}
  .qqb-tplnew:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(59,130,246,.18);border-color:#3b82f6;}
  .qqb-tplnew-circle{width:56px;height:56px;border-radius:50%;background:#fff;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;color:#3b82f6;box-shadow:0 6px 16px rgba(59,130,246,.18);}
  .qqb-tplpaper{display:flex;flex-direction:column;border-radius:16px;background:#fff;border:1px solid #e2e8f0;overflow:hidden;transition:transform .12s ease,box-shadow .15s ease,border-color .12s ease;}
  .qqb-tplpaper:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(15,23,42,.14);border-color:#cbd5e1;}
  .qqb-paperthumb{position:relative;height:212px;background:#fff;cursor:pointer;overflow:hidden;border-bottom:1px solid #f1f5f9;}
  .qqb-paperthumb::after{content:'';position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(transparent,#fff);}
  .qqb-paperdoc{padding:18px 20px;font-size:0.74rem;line-height:1.5;color:#475569;}
  .qqb-paperdoc>*:first-child{margin-top:0 !important;}
  .qqb-paperdoc h2{font-size:0.95rem;font-weight:800;color:#0f172a;margin:8px 0 4px;}
  .qqb-paperdoc h3{font-size:0.84rem;font-weight:800;color:#0f172a;margin:7px 0 3px;}
  .qqb-paperdoc p{margin:0 0 5px;}
  .qqb-paperdoc b,.qqb-paperdoc strong{font-weight:800;color:#334155;}
  .qqb-paperdoc ul,.qqb-paperdoc ol{margin:4px 0;padding-left:18px;}
  .qqb-paperdoc li{margin:1px 0;}
  .qqb-paperfoot{padding:13px 14px 15px;}
  .qqb-papername{font-weight:800;font-size:0.9rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .qqb-paperedit:hover{border-color:#94a3b8 !important;background:#f8fafc !important;}
  /* Word-agtigt dokument i editoren */
  .qqb-docpage{padding:clamp(28px,5vw,56px) clamp(24px,6vw,64px);}
  .qqb-docpage h2{font-size:1.5rem;font-weight:800;margin:18px 0 8px;}
  .qqb-docpage h3{font-size:1.2rem;font-weight:700;margin:14px 0 6px;}
  .qqb-docpage p{margin:0 0 10px;}
  .qqb-docpage ul,.qqb-docpage ol{margin:8px 0;}
  @keyframes qqbspin{to{transform:rotate(360deg);}}
  .qqb-spin{animation:qqbspin .8s linear infinite;}
  @keyframes qqbrec{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.8);}}
  .qqb-rec{animation:qqbrec 1s ease-in-out infinite;}
`;

export default function QuickQuoteBuilder({ carpenter, isMobile = false, onCancel, onComplete, onDeleted, initialLead = null, draftCreator = null, onOpenMaterialList = null }) {
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    // Felt-fejl ved afsendelse (markeres rødt) + bekræftelses-popup før mailen sendes.
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSendConfirm, setShowSendConfirm] = useState(false);

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

    // Kom-i-gang: 2 små hints første gang (kun desktop). Ankre sættes på pris/avance + send-knap.
    const coachMaterialRef = useRef(null);
    const coachSendRef = useRef(null);
    // Afslutning af walkthrough: kæde med ét fokus ad gangen —
    // 'ownmail' (Send fra egen mail) → 'example' (Prøv et eksempel) → null.
    const [finishStep, setFinishStep] = useState(null);
    const [showSmtpSetup, setShowSmtpSetup] = useState(false);
    // Husk om SMTP-opsætningen blev åbnet fra afslutnings-kæden, så vi kan
    // føre brugeren videre til "Prøv et eksempel", når den lukkes.
    const smtpFromFinish = useRef(false);
    // Efter eksemplet er udfyldt: pulsér "Send tilbud" + pil, så man intuitivt
    // sender det til sig selv og oplever kunderejsen.
    const [pulseSendExample, setPulseSendExample] = useState(false);
    const [coachHintStep, setCoachHintStep] = useState(() => (!isMobile && shouldShowCoach('quick_hints')) ? 0 : -1);
    useEffect(() => { if (coachHintStep >= 0) markCoachSeen('quick_hints'); }, [coachHintStep]);

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
    // Indtal arbejdsbeskrivelsen — samme danske transskribering + fagterm-rettelse som
    // aftalesedlen (mode 'transcribe' kører WHISPER_PROMPT + FAGTERM_CORRECTION_PROMPT).
    // Den dikterede tekst TILFØJES, så man kan tale flere noter ind løbende (fx ude på pladsen).
    const appendDictation = (text) => {
        const t = (text || '').trim();
        if (!t) return;
        const el = workEditorRef.current;
        const snippet = escapeHtml(t);
        if (el) {
            const cur = el.innerHTML || '';
            el.innerHTML = cur && cur.trim() ? `${cur}<br>${snippet}` : snippet;
            setWorkDescHtml(el.innerHTML);
        } else {
            setWorkDescHtml(prev => (prev && prev.trim() ? `${prev}<br>${snippet}` : snippet));
        }
    };
    const workDictation = useVoiceDictation(appendDictation, {
        mode: 'transcribe',
        processingMessage: 'Skriver arbejdsbeskrivelsen ned…',
        successMessage: 'Tilføjet til arbejdsbeskrivelsen',
    });

    // ---- Skabeloner til arbejdsbeskrivelsen ----
    // Genbrugelige rich-text-skabeloner (deles pr. firma). Indsættes i editoren
    // som HTML, så fed/punkter/afsnit bevares 1:1 (ikke "komprimeret").
    const [templates, setTemplates] = useState([]);
    const [tplLibraryOpen, setTplLibraryOpen] = useState(false);
    const [tplModalOpen, setTplModalOpen] = useState(false);
    const [tplEditing, setTplEditing] = useState(null);   // { id, name, body_html } under redigering/oprettelse
    const [tplName, setTplName] = useState('');
    const [tplSaving, setTplSaving] = useState(false);
    const [tplConfirmDelete, setTplConfirmDelete] = useState(false);
    const [tplReplaceConfirm, setTplReplaceConfirm] = useState(null);   // skabelon der venter på bekræftet erstatning
    const tplEditorRef = useRef(null);
    // Hvad blev sidst indsat (renset HTML) — så vi ved om beskrivelsen er "ren" skabelon
    // eller om brugeren har skrevet egne ting (og dermed skal advares før overskrivning).
    const lastTemplateHtmlRef = useRef('');

    // Hent firmaets skabeloner én gang ved mount.
    useEffect(() => {
        let alive = true;
        listQuoteTemplates(carpenter).then((rows) => { if (alive) setTemplates(rows); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Læg en skabelon ind i arbejdsbeskrivelsen — ERSTATTER altid indholdet, så man
    // aldrig stabler to skabeloner oven på hinanden. Bagefter kan den frit rettes.
    const applyTemplate = (tpl) => {
        const clean = sanitizeHtml(tpl.body_html || '');
        if (!clean.trim()) { toast.error('Skabelonen er tom'); return; }
        if (workEditorRef.current) workEditorRef.current.innerHTML = clean;
        setWorkDescHtml(clean);
        lastTemplateHtmlRef.current = clean;
        toast.success(`Skabelon "${tpl.name}" indsat`);
        setTplReplaceConfirm(null);
        setTplLibraryOpen(false);
        setTplModalOpen(false);
    };
    // Vælg en skabelon: erstat direkte hvis feltet er tomt eller stadig er en uændret
    // skabelon; ellers spørg først (så man ikke kommer til at slette egen tekst).
    const chooseTemplate = (tpl) => {
        const cur = (workEditorRef.current?.innerHTML ?? workDescHtml ?? '').trim();
        const isCleanSlate = !cur || cur === lastTemplateHtmlRef.current || sanitizeHtml(cur) === lastTemplateHtmlRef.current;
        if (isCleanSlate) applyTemplate(tpl);
        else setTplReplaceConfirm(tpl);
    };

    // Åbn popup'en — enten tom (ny) eller forudfyldt (rediger eksisterende).
    const openNewTemplate = () => { setTplEditing({ id: null, name: '', body_html: '' }); setTplName(''); setTplConfirmDelete(false); setTplModalOpen(true); };
    const openEditTemplate = (tpl) => { setTplEditing(tpl); setTplName(tpl.name || ''); setTplConfirmDelete(false); setTplModalOpen(true); };
    const closeTemplateModal = () => { if (tplSaving) return; setTplModalOpen(false); setTplEditing(null); setTplConfirmDelete(false); };

    // Sæt indholdet i popup-editoren imperativt når den åbnes (contentEditable er ukontrolleret).
    useEffect(() => {
        if (!tplModalOpen) return;
        requestAnimationFrame(() => { if (tplEditorRef.current) tplEditorRef.current.innerHTML = tplEditing?.body_html || ''; });
    }, [tplModalOpen, tplEditing]);

    const saveTemplate = async () => {
        const name = tplName.trim();
        const bodyHtml = sanitizeHtml(tplEditorRef.current?.innerHTML || '');
        if (!name) { toast.error('Giv skabelonen et navn'); return; }
        if (!htmlToPlainLines(bodyHtml).length) { toast.error('Skriv lidt indhold i skabelonen'); return; }
        setTplSaving(true);
        try {
            if (tplEditing?.id) {
                const updated = await updateQuoteTemplate(tplEditing.id, { name, bodyHtml });
                setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                toast.success('Skabelon opdateret');
            } else {
                const created = await createQuoteTemplate(carpenter, { name, bodyHtml });
                setTemplates((prev) => [created, ...prev]);
                toast.success('Skabelon gemt');
            }
            setTplModalOpen(false);
            setTplEditing(null);
        } catch (e) {
            toast.error(friendlyError(e) || 'Kunne ikke gemme skabelonen');
        } finally {
            setTplSaving(false);
        }
    };

    const removeTemplate = async () => {
        const tpl = tplEditing;
        if (!tpl?.id) return;
        setTplSaving(true);
        try {
            await deleteQuoteTemplate(tpl.id);
            setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
            toast.success('Skabelon slettet');
            setTplModalOpen(false);
            setTplEditing(null);
        } catch (e) {
            toast.error(friendlyError(e) || 'Kunne ikke slette skabelonen');
        } finally {
            setTplSaving(false);
        }
    };

    // Indsæt den skabelon man har åben i editoren direkte i tilbuddet (erstatter beskrivelsen).
    const insertFromEditor = () => {
        const html = sanitizeHtml(tplEditorRef.current?.innerHTML || '');
        if (!html.trim()) { toast.error('Skabelonen er tom' ); return; }
        chooseTemplate({ name: tplName.trim() || 'Skabelon', body_html: html });
    };

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
    // Privat/erhverv — styrer moms-default på fakturaen senere. Default privat.
    const [customerType, setCustomerType] = useState(cd0.customerType === 'erhverv' ? 'erhverv' : 'privat');
    const [cvr, setCvr] = useState(cd0.cvr || '');

    // AI-udfyld: tal frit om kunden + opgaven, så fyldes felterne ud (ren hjælpende hånd).
    const [aiRecording, setAiRecording] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const aiRecorderRef = useRef(null);
    const aiChunksRef = useRef([]);
    // Udfyld KUN de felter, AI'en fandt — rør ikke resten.
    const applyAiFill = (r) => {
        setCustomer(c => ({
            ...c,
            name: r.customerName || c.name,
            phone: r.phone ? formatDkPhone(r.phone) : c.phone,
            email: r.email || c.email,
            address: r.address || c.address,
            zip: r.zip || c.zip,
            city: r.city || c.city,
        }));
        if (r.customerType === 'erhverv' || r.cvr) setCustomerType('erhverv');
        else if (r.customerType === 'privat') setCustomerType('privat');
        if (r.cvr) setCvr(String(r.cvr).replace(/[^\d]/g, '').slice(0, 8));
        if (r.title) setTitle(t => t || r.title);
        if (r.workDescription) appendDictation(r.workDescription);
        if (r.fixedPrice) { setLaborMode('fixed'); setLaborFixed(String(r.fixedPrice).replace(/[^\d]/g, '')); }
        const vd = parseInt(r.validityDays, 10);
        if (vd && vd > 0) setValidityDays(vd);
    };
    const toggleAiFill = async () => {
        if (aiRecording) {
            aiRecorderRef.current?.stop();
            setAiRecording(false);
            setAiProcessing(true);
            toast('Lytter og udfylder…', { icon: '⚙️' });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            aiRecorderRef.current = mr;
            aiChunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) aiChunksRef.current.push(e.data); };
            mr.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(aiChunksRef.current, { type: 'audio/webm' });
                const fd = new FormData();
                fd.append('audio', blob, 'voice.webm');
                fd.append('mode', 'quickfill');
                try {
                    const res = await fetch('/api/process-voice', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error('Netværksfejl');
                    const r = await res.json();
                    if (r.error) throw new Error(r.error);
                    applyAiFill(r);
                    toast.success('Felterne er udfyldt — ret til efter behov.');
                } catch (err) {
                    toast.error('Kunne ikke udfylde via tale. Prøv igen.');
                } finally {
                    setAiProcessing(false);
                }
            };
            mr.start();
            setAiRecording(true);
            toast('Optager… fortæl om kunden og opgaven', { icon: '🎙️' });
        } catch (e) {
            toast.error('Kunne ikke få adgang til mikrofonen. Tjek tilladelser.');
            setAiProcessing(false);
        }
    };

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
    // Personlig besked i selve mailen (kunden får detaljerne her + i arbejdsbeskrivelsen).
    const [emailMessage, setEmailMessage] = useState(initialLead?.raw_data?.custom_message || STANDARD_EMAIL_MSG);
    // Hvor mange dage tilbuddet er gyldigt (vises i PDF + mail, og styrer udløb på kunde-siden).
    const [validityDays, setValidityDays] = useState(initialLead?.raw_data?.quote_settings?.validityDays || mq0.validityDays || 14);
    // Ved redigering er beskeden allerede skrevet — undlad at overskrive med standard-hilsen.
    const emailMsgTouched = useRef(isEditing);
    // Preview-fane (kun på mobil) + live-regenerering af PDF
    const [previewTab, setPreviewTab] = useState('edit'); // 'edit' | 'pdf' | 'mail'
    const [regenerating, setRegenerating] = useState(false);
    // Trækbare kolonne-bredder (desktop) + scroll-container (mobil swipe).
    // Standard-fordeling: ~34% Rediger · ~37% PDF i midten · ~29% Mail — den mest
    // behagelige startvisning. Beregnes ud fra skærmbredden ved åbning, så forholdet
    // holder på både store skærme og almindelig desktop. Kan stadig trækkes manuelt.
    const initVw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const [leftW, setLeftW] = useState(Math.round(Math.min(980, Math.max(360, initVw * 0.345))));
    const [rightW, setRightW] = useState(Math.round(Math.min(840, Math.max(300, initVw * 0.295))));
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

    // Ved redigering af en gemt kladde: indsæt det gemte rich-text-indhold i editoren
    // (contentEditable er ukontrolleret, så det skal sættes imperativt efter mount).
    useEffect(() => {
        if (!isEditing) return;
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
                const snap = { title, materialCost, markup, laborMode, laborFixed, laborRate, laborHours, extras, workDescHtml, customer, emailMessage, validityDays, savedAt: Date.now() };
                if (draftHasContent(snap)) window.localStorage.setItem(draftKey, JSON.stringify(snap));
            } catch { /* localStorage kan være fuld/blokeret — ignorér */ }
        }, 600);
        return () => clearTimeout(t);
    }, [title, materialCost, markup, laborMode, laborFixed, laborRate, laborHours, extras, workDescHtml, customer, emailMessage, validityDays, draftKey]);

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
            if (d.customer) setCustomer({ name: '', email: '', phone: '', address: '', zip: '', city: '', ...d.customer });
            setEmailMessage(d.emailMessage || STANDARD_EMAIL_MSG);
            setValidityDays(d.validityDays || 14);
            // contentEditable-editoren er ukontrolleret → sæt indholdet imperativt.
            // Markér som "rørt" så standard-hilsenen ikke overskriver det genindlæste.
            emailMsgTouched.current = true;
            requestAnimationFrame(() => {
                if (workEditorRef.current) workEditorRef.current.innerHTML = d.workDescHtml || '';
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

    const buildQuoteObj = () => {
    // Normalisér editorens rå HTML til vores faste format (p/h2/h3/ul/ol/li/b/i/u +
    // text-align) — så både PDF'en og det gemte tilbud altid får ens, ren formatering.
    const workHtmlClean = sanitizeHtml(workDescHtml);
    return {
        materialCost: calc.mCost,
        materialMarkupPct: calc.mPct,
        materialSell: calc.materialSell,
        laborMode,
        laborFixed: num(laborFixed),
        laborRate: num(laborRate),
        laborHours: num(laborHours),
        laborTotal: calc.laborTotal,
        extras: extras.filter(e => num(e.amount) > 0 || (e.desc || '').trim()).map(e => ({ desc: e.desc || 'Tillæg', amount: num(e.amount) })),
        workHtml: workHtmlClean,
        workLines: htmlToPlainLines(workHtmlClean),
        totalExVat: calc.totalExVat,
        vat: calc.vat,
        totalIncVat: calc.totalIncVat,
        validityDays: num(validityDays) || 14,
    };
    };

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

    // ---- Auto-gem af en allerede gemt kladde ----
    // Når man redigerer et tilbud der ALLEREDE er gemt som kladde (initialLead.id), gemmes
    // alle ændringer løbende i databasen — så intet går tabt, selv hvis man lukker uden at
    // trykke "Gem kladde". Let DB-opdatering (uden PDF-upload); PDF'en regenereres ved
    // eksplicit gem/send. Kører ikke på allerede sendte tilbud (de kræver bevidst gensend).
    const [autosaveState, setAutosaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
    const autosaveDraft = async () => {
        if (!initialLead?.id || wasSent || busy) return;
        setAutosaveState('saving');
        try {
            const quoteObj = buildQuoteObj();
            const fullAddress = [customer.address, [customer.zip, customer.city].filter(Boolean).join(' ')]
                .filter(Boolean).join(', ').trim();
            const raw_data = {
                ...(initialLead?.raw_data || {}),
                is_manual_quote: true,
                manual_quote: quoteObj,
                quote_settings: { ...(initialLead?.raw_data?.quote_settings || {}), validityDays: num(validityDays) || 14 },
                custom_message: emailMessage,
                calc_data: { materialCost: calc.materialSell, materialCostBase: calc.mCost, laborHours: num(laborHours), hourlyRate: num(laborRate) },
                actual_quote_price: calc.totalExVat,
                customerDetails: { ...(initialLead?.raw_data?.customerDetails || {}), street: customer.address, zip: customer.zip, city: customer.city, customerType, cvr: customerType === 'erhverv' ? cvr : '' },
            };
            const { error } = await supabase.from('leads').update({
                customer_name: customer.name,
                customer_email: customer.email || '',
                customer_phone: customer.phone || '',
                customer_address: fullAddress || '',
                project_category: title || 'Manuelt tilbud',
                price_estimate: `${kr(calc.totalIncVat)} DKK`,
                raw_data,
            }).eq('id', initialLead.id);
            if (error) throw error;
            setAutosaveState('saved');
        } catch {
            // Auto-gem må aldrig forstyrre — fald stille tilbage (eksplicit "Gem kladde" findes stadig).
            setAutosaveState('idle');
        }
    };
    // Hold en frisk reference, så flush ved luk altid gemmer den NYESTE tilstand.
    const autosaveRef = useRef(autosaveDraft);
    autosaveRef.current = autosaveDraft;

    // Debounced auto-gem når indholdet ændrer sig (kun for en allerede gemt kladde).
    const autosaveMounted = useRef(false);
    useEffect(() => {
        if (!isEditing || wasSent) return;
        if (!autosaveMounted.current) { autosaveMounted.current = true; return; } // spring den uændrede mount-tilstand over
        setAutosaveState('saving');
        const t = setTimeout(() => { autosaveRef.current(); }, 1200);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quoteSig, emailMessage]);

    // Flush ved luk/unmount, så de sidste ændringer (inden debouncen nåede at fyre) også gemmes.
    useEffect(() => () => { autosaveRef.current(); }, []);

    // ---- Validering før afsendelse ----
    // Et tilbud må kun sendes når det vigtigste er på plads — så man altid fremstår professionel.
    const validateForSend = () => {
        const errs = {};
        if (!customer.name.trim()) errs.name = true;
        if (!customer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errs.email = true;
        if (!customer.address.trim()) errs.address = true;
        if (!String(customer.zip).trim()) errs.zip = true;
        if (!customer.city.trim()) errs.city = true;
        return errs;
    };
    // Ryd en felt-fejl så snart brugeren retter feltet.
    const clearFieldError = (key) => setFieldErrors(prev => {
        if (!prev[key]) return prev;
        const next = { ...prev }; delete next[key]; return next;
    });

    // Tryk på "Send tilbud" → valider, markér manglende felter, og vis bekræftelse (sender ikke endnu).
    const requestSend = () => {
        setPulseSendExample(false); // pulsen har gjort sit job, så snart man trykker
        const errs = validateForSend();
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) {
            toast.error('Udfyld de markerede felter, før du sender tilbuddet.');
            if (isMobile) setPreviewTab('edit'); // skift til Rediger-fanen, så fejlene er synlige
            return;
        }
        setShowSendConfirm(true);
    };

    // Forudfyld et lille eksempel-tilbud + din egen mail, så man kan sende det til sig
    // selv og mærke kunde-oplevelsen (mail → "Bekræft tilbud" → portal).
    const fillExampleQuote = () => {
        const myEmail = draftCreator?.email || carpenter?.email || '';
        setCustomer({ name: 'Eksempelkunde (dig selv)', email: myEmail, phone: '', address: 'Byggevej 12', zip: '8000', city: 'Aarhus' });
        setTitle('Eksempel: Nyt trægulv i stue');
        setMaterialCost('8000');
        setMarkup('35');
        setLaborMode('fixed');
        setLaborFixed('12000');
        setWorkDescHtml('<p>Levering og montering af nyt trægulv inkl. afslibning og oliebehandling. Bortskaffelse af det gamle gulv er inkluderet.</p>');
    };

    // ---- Gem (kladde eller send) ----
    const save = async (sendToCustomer) => {
        if (!customer.name.trim()) {
            // Markér feltet rødt (som ved afsendelse) i stedet for kun en toast.
            setFieldErrors(prev => ({ ...prev, name: true }));
            if (isMobile) setPreviewTab('edit'); // skift til Rediger-fanen så fejlen er synlig
            toast.error('Udfyld kundens navn for at gemme.');
            return;
        }
        if (sendToCustomer && (!customer.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) {
            setFieldErrors(prev => ({ ...prev, email: true }));
            if (isMobile) setPreviewTab('edit');
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

            // Hvem lavede tilbuddet (avatar-attribution). En MEDARBEJDER tilføjes til
            // assigned_workers, så han kan se sin EGEN kladde (eksisterende RLS tillader det).
            // Mester ser den altid via carpenter_id, så ejeren tilføjes ikke (overflødigt).
            const ownerId = carpenter?.company_id || carpenter?.id;
            const isEmployeeCreator = !!draftCreator?.id && draftCreator.id !== ownerId;
            const existingAssigned = initialLead?.raw_data?.assigned_workers || [];

            const raw_data = {
                ...(initialLead?.raw_data || {}),
                created_by: initialLead?.raw_data?.created_by || draftCreator?.id || null,
                ...(isEmployeeCreator && !existingAssigned.includes(draftCreator.id)
                    ? { assigned_workers: [...existingAssigned, draftCreator.id] }
                    : {}),
                is_manual_quote: true,
                manual_quote: quoteObj,
                quote_settings: nextQuoteSettings,
                ...(isSendingNow ? { quote_sent_at: new Date().toISOString() } : {}),
                custom_message: emailMessage,
                calc_data: { materialCost: calc.materialSell, materialCostBase: calc.mCost, laborHours: num(laborHours), hourlyRate: num(laborRate) },
                actual_quote_price: calc.totalExVat,
                // Strukturerede kundefelter bevares så de kan genindlæses korrekt ved redigering.
                customerDetails: { ...(initialLead?.raw_data?.customerDetails || {}), street: customer.address, zip: customer.zip, city: customer.city, customerType, cvr: customerType === 'erhverv' ? cvr : '' },
                quote_pdf_url: quotePdfUrl ? `${quotePdfUrl}?t=${Date.now()}` : (initialLead?.raw_data?.quote_pdf_url),
                material_pdfs: materialFile ? [...existingPdfs, ...materialPdfs] : existingPdfs,
                checklist: initialLead?.raw_data?.checklist || seedChecklist(quoteObj.workLines),
            };

            const fields = {
                customer_name: customer.name,
                // En kladde må gerne mangle email/adresse (kræves først ved afsendelse). Brug
                // tom streng frem for null, så NOT NULL-constraints på leads ikke blokerer gemning.
                customer_email: customer.email || '',
                customer_phone: customer.phone || '',
                customer_address: fullAddress || '',
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
            console.error('Kunne ikke gemme/sende tilbud:', e);
            toast.error(friendlyError(e, 'Kunne ikke gemme tilbuddet. Prøv igen.'));
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
            console.error('Kunne ikke slette tilbuddet:', e);
            toast.error(friendlyError(e, 'Kunne ikke slette tilbuddet. Prøv igen.'));
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
            <div ref={coachMaterialRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

    // Genbrugelig Word-lignende rich-text-editor (bruges af "Arbejdsbeskrivelse" og
    // skabelon-popup'en). execCommand styrer fed/kursiv/punkter; Cmd/Ctrl+B virker natively.
    // onMouseDown-preventDefault på knapperne bevarer markeringen i editoren.
    const tbtn = (title, onClick, content) => (
        <button type="button" title={title} className="qqb-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
            style={{ minWidth: '34px', height: '32px', padding: '0 9px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {content}
        </button>
    );
    const renderRichEditor = (ref, onChange, placeholder, minHeight = '96px', dictation = null, docMode = false) => {
        const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
        const exec = (cmd) => { ref.current?.focus(); document.execCommand(cmd, false, null); sync(); };
        // Skift blok-type (overskrift/brødtekst). Klik på en aktiv overskrift slår den fra igen.
        const fmtBlock = (tagLower) => {
            ref.current?.focus();
            const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
            document.execCommand('formatBlock', false, `<${cur === tagLower ? 'p' : tagLower}>`);
            sync();
        };
        const onPaste = (e) => {
            e.preventDefault();
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');
            const clean = html ? sanitizeHtml(html) : escapeHtml(text).replace(/\n/g, '<br>');
            document.execCommand('insertHTML', false, clean);
            sync();
        };
        const tdiv = <span style={{ width: '1px', height: '22px', background: '#e2e8f0', margin: '0 3px', flexShrink: 0 }} />;
        const toolbarStyle = docMode
            ? { display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 2, background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '10px 14px', borderTopLeftRadius: 12, borderTopRightRadius: 12 }
            : { display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' };
        return (
            <>
                <div style={toolbarStyle}>
                    {tbtn('Overskrift', () => fmtBlock('h2'), <Heading2 size={16} />)}
                    {tbtn('Underoverskrift', () => fmtBlock('h3'), <Heading3 size={16} />)}
                    {tdiv}
                    {tbtn('Fed (Cmd/Ctrl+B)', () => exec('bold'), <Bold size={15} />)}
                    {tbtn('Kursiv (Cmd/Ctrl+I)', () => exec('italic'), <Italic size={15} />)}
                    {tbtn('Understreget (Cmd/Ctrl+U)', () => exec('underline'), <Underline size={15} />)}
                    {tdiv}
                    {tbtn('Punktliste', () => exec('insertUnorderedList'), <List size={16} />)}
                    {tbtn('Nummereret liste', () => exec('insertOrderedList'), <ListOrdered size={16} />)}
                    {tdiv}
                    {tbtn('Venstrejustér', () => exec('justifyLeft'), <AlignLeft size={15} />)}
                    {tbtn('Centrér', () => exec('justifyCenter'), <AlignCenter size={15} />)}
                    {tbtn('Højrejustér', () => exec('justifyRight'), <AlignRight size={15} />)}
                    {dictation && (
                        <button
                            type="button"
                            title={dictation.isRecording ? 'Stop og skriv ned' : 'Indtal arbejdsbeskrivelsen'}
                            onClick={dictation.toggle}
                            disabled={dictation.isProcessing}
                            style={{
                                marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '9px', fontWeight: 700, fontSize: '0.78rem',
                                cursor: dictation.isProcessing ? 'wait' : 'pointer',
                                border: '1px solid ' + (dictation.isRecording ? '#fecaca' : dictation.isProcessing ? '#e2e8f0' : '#cbd5e1'),
                                background: dictation.isRecording ? '#fef2f2' : dictation.isProcessing ? '#f1f5f9' : '#fff',
                                color: dictation.isRecording ? '#dc2626' : dictation.isProcessing ? '#64748b' : '#334155',
                                transition: 'background .15s ease, border-color .15s ease',
                            }}
                        >
                            {dictation.isProcessing ? (
                                <><span className="qqb-spin" style={{ width: '12px', height: '12px', border: '2px solid #cbd5e1', borderTopColor: '#64748b', borderRadius: '50%', display: 'inline-block' }} /> Skriver ned…</>
                            ) : dictation.isRecording ? (
                                <><span className="qqb-rec" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> Optager — stop</>
                            ) : (
                                <><Mic size={14} /> Indtal</>
                            )}
                        </button>
                    )}
                </div>
                <div
                    ref={ref}
                    className={docMode ? 'qqb-editor qqb-docpage' : 'qqb-input qqb-editor'}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                    onInput={sync}
                    onBlur={sync}
                    onPaste={onPaste}
                    style={docMode
                        ? { minHeight, lineHeight: 1.7, fontSize: '1rem', color: '#1e293b', outline: 'none', maxHeight: 'none' }
                        : { ...input, minHeight, lineHeight: 1.5 }}
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

    const renderCustomerInputs = () => {
        // Rød kant når et påkrævet felt mangler ved afsendelse.
        const fieldStyle = (key) => fieldErrors[key]
            ? { ...input, borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' }
            : input;
        const errText = (key, text) => fieldErrors[key]
            ? <span style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#ef4444' }}>{text}</span>
            : null;
        return (
        <>
        {/* Privat/Erhverv — sætter moms-default på fakturaen. Erhverv folder CVR ud. */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '14px', maxWidth: isMobile ? '100%' : '280px' }}>
            {[{ k: 'privat', l: 'Privat' }, { k: 'erhverv', l: 'Erhverv' }].map(o => {
                const on = customerType === o.k;
                return (
                    <button key={o.k} type="button" onClick={() => setCustomerType(o.k)}
                        style={{ flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', background: on ? '#fff' : 'transparent', color: on ? '#0f172a' : '#64748b', boxShadow: on ? '0 2px 6px rgba(15,23,42,0.1)' : 'none', transition: 'all .15s' }}>
                        {o.l}
                    </button>
                );
            })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div><label style={label}>Navn *</label><input className="qqb-input" style={fieldStyle('name')} value={customer.name} onChange={(e) => { setCustomer({ ...customer, name: e.target.value }); clearFieldError('name'); }} />{errText('name', 'Udfyld kundens navn.')}</div>
            {customerType === 'erhverv' && (
                <div><label style={label}>CVR <span style={{ color: '#94a3b8', fontWeight: 500 }}>(valgfrit)</span></label><input className="qqb-input" style={input} inputMode="numeric" maxLength={8} value={cvr} onChange={(e) => setCvr(e.target.value.replace(/[^\d]/g, '').slice(0, 8))} placeholder="12345678" /></div>
            )}
            <div><label style={label}>Telefon</label><input className="qqb-input" style={input} type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: formatDkPhone(e.target.value) })} placeholder="+45 12 34 56 78" /></div>
            <div><label style={label}>Email{' '}<span style={{ color: '#94a3b8', fontWeight: 500 }}>(kræves for at sende)</span></label><input className="qqb-input" style={fieldStyle('email')} type="email" value={customer.email} onChange={(e) => { setCustomer({ ...customer, email: e.target.value }); clearFieldError('email'); }} />{errText('email', 'Udfyld en gyldig email.')}</div>
            <div>
                <label style={label}>Adresse</label>
                {gmapsLoaded ? (
                    <Autocomplete
                        onLoad={setAddressAutocomplete}
                        onPlaceChanged={onAddressPlaceChanged}
                        options={{ componentRestrictions: { country: 'dk' }, fields: ['address_components', 'name'] }}
                    >
                        <input className="qqb-input" style={fieldStyle('address')} value={customer.address} onChange={(e) => { setCustomer({ ...customer, address: e.target.value }); clearFieldError('address'); }} placeholder="Begynd at skrive adressen…" />
                    </Autocomplete>
                ) : (
                    <input className="qqb-input" style={fieldStyle('address')} value={customer.address} onChange={(e) => { setCustomer({ ...customer, address: e.target.value }); clearFieldError('address'); }} />
                )}
                {errText('address', 'Udfyld adressen.')}
            </div>
            <div><label style={label}>Postnummer</label><input className="qqb-input" style={fieldStyle('zip')} inputMode="numeric" maxLength={4} value={customer.zip} onChange={(e) => { setCustomer({ ...customer, zip: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }); clearFieldError('zip'); }} />{errText('zip', 'Udfyld postnr.')}</div>
            <div><label style={label}>By</label><input className="qqb-input" style={fieldStyle('city')} value={customer.city} onChange={(e) => { setCustomer({ ...customer, city: e.target.value }); clearFieldError('city'); }} />{errText('city', 'Udfyld by.')}</div>
        </div>
        </>
        );
    };

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

        const zoneHead = (icon, text, bg, action, tourId) => (
            <div data-tour={tourId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: '1px solid #eef2f6', position: 'sticky', top: 0, background: bg, zIndex: 2, flexShrink: 0 }}>
                {icon}
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' }}>{text}</span>
                {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
            </div>
        );

        const editSection = { padding: '16px 18px', borderBottom: '1px solid #f1f5f9' };
        const editH = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' };

        const leftCol = (
            <div className="qqb-col" style={leftStyle} data-tour="qq-edit">
                {zoneHead(<Pencil size={16} color="#3b82f6" />, 'Rediger tilbuddet', '#ffffff')}
                {/* AI-udfyld: tal frit, så fyldes felterne ud (ren hjælpende hånd). */}
                <div data-tour="qq-ai" style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                    <button type="button" onClick={toggleAiFill} disabled={aiProcessing}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px 16px', borderRadius: '14px', border: '1px solid ' + (aiRecording ? '#fecaca' : '#bfdbfe'), background: aiRecording ? '#fef2f2' : 'linear-gradient(145deg,#eff6ff,#f5f3ff)', color: aiRecording ? '#dc2626' : '#1d4ed8', fontWeight: 800, fontSize: '0.92rem', cursor: aiProcessing ? 'wait' : 'pointer', transition: 'all .18s', boxShadow: aiRecording ? '0 0 0 4px rgba(239,68,68,0.12)' : '0 4px 12px rgba(37,99,235,0.10)' }}>
                        {aiProcessing
                            ? <><span className="qqb-spin" style={{ width: 15, height: 15, border: '2px solid #cbd5e1', borderTopColor: '#1d4ed8', borderRadius: '50%', display: 'inline-block' }} /> Udfylder…</>
                            : aiRecording
                                ? <><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'qqbrec 1s ease-in-out infinite' }} /> Optager — tryk for at udfylde</>
                                : <><Mic size={17} /> Udfyld med stemme (AI)</>}
                    </button>
                    <p style={{ margin: '8px 2px 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, textAlign: 'center' }}>
                        Fortæl frit om kunden og opgaven — Frame udfylder felterne, og du retter til bagefter.
                    </p>
                </div>
                <div style={editSection} data-tour="qq-customer">
                    <h3 style={editH}><User size={18} color="#0f172a" /> Kunde</h3>
                    {renderCustomerInputs()}
                </div>
                <div style={editSection} data-tour="qq-title">
                    <label style={label}>Opgavetitel</label>
                    {renderTitleInput()}
                </div>
                <div style={editSection} data-tour="qq-validity">
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
                <div style={editSection} data-tour="qq-materials">
                    <h3 style={editH}><Package size={18} color="#3b82f6" /> Materialer</h3>
                    {renderMaterialInputs()}
                    {renderUploadField()}
                    {onOpenMaterialList && (
                        <button type="button" onClick={() => onOpenMaterialList()}
                            style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bfdbfe', background: 'linear-gradient(145deg,#eff6ff,#f5f3ff)', color: '#1d4ed8', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                            <Package size={16} /> Generér materialeliste til leverandør
                        </button>
                    )}
                </div>
                <div style={editSection} data-tour="qq-labor">
                    <h3 style={editH}><Hammer size={18} color="#f59e0b" /> Arbejde</h3>
                    {renderLaborInputs()}
                </div>
                <div style={editSection} data-tour="qq-workdesc">
                    <h3 style={editH}><CheckCircle2 size={18} color="#10b981" /> Arbejdsbeskrivelse</h3>
                    {/* Skabeloner: ét vindue med alle dine faste tekster — indsæt eller byg en ny. */}
                    <div style={{ marginBottom: '12px' }}>
                        <button type="button" className="qqb-newtpl" onClick={() => setTplLibraryOpen(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', borderRadius: '12px', border: '1px solid #bfdbfe', background: 'linear-gradient(145deg,#eff6ff,#f5f3ff)', color: '#1d4ed8', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                            <Files size={16} /> Skabeloner{templates.length ? ` (${templates.length})` : ''}
                        </button>
                        <p style={{ margin: '8px 2px 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                            Indsæt en færdig tekst med ét klik — eller byg en ny. Den sættes ind, så du frit kan rette i den.
                        </p>
                    </div>
                    {renderRichEditor(workEditorRef, setWorkDescHtml, 'Skriv arbejdsbeskrivelsen frit — markér tekst og gør den fed, lav punkter, eller indsæt direkte fra Word.', '96px', workDictation)}
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
            <div data-tour="qq-pdf-col" style={pdfFocus ? { ...midStyle, flex: '1 1 auto' } : midStyle}>
                {zoneHead(<FileText size={16} color="#3b82f6" />, "Sådan ser PDF'en ud", '#f8fafc', maxBtn, 'qq-pdf')}
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
            <div className="qqb-col" style={rightStyle} data-tour="qq-mail-col">
                {zoneHead(<Mail size={16} color="#8b5cf6" />, 'Mailen til kunden', '#ffffff', null, 'qq-mail')}
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
                        {isEditing && !wasSent && (
                            <div style={{ marginTop: '3px', fontSize: '0.72rem', fontWeight: 600, color: autosaveState === 'saved' ? '#10b981' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                {autosaveState === 'saving'
                                    ? <><span className="qqb-spin" style={{ width: '10px', height: '10px', border: '2px solid #cbd5e1', borderTopColor: '#64748b', borderRadius: '50%', display: 'inline-block' }} /> Gemmer automatisk…</>
                                    : autosaveState === 'saved'
                                        ? <><CheckCircle2 size={13} /> Gemt automatisk</>
                                        : <>Ændringer gemmes automatisk</>}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {isEditing && (
                        <button className="qqb-ghost" disabled={busy} onClick={del} title="Slet tilbuddet helt" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={18} /> Slet
                        </button>
                        )}
                        {!wasSent && (
                        <button data-tour="qq-save" className="qqb-ghost" disabled={busy} onClick={() => save(false)} style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> Gem kladde
                        </button>
                        )}
                        <button ref={coachSendRef} data-tour="qq-send" className={`qqb-send${pulseSendExample ? ' qqb-send-pulse' : ''}`} disabled={busy} onClick={requestSend} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                            <Send size={18} /> {busy ? 'Sender…' : (wasSent ? 'Send opdateret tilbud' : 'Send tilbud')}
                        </button>
                    </div>

                    {/* Kom-i-gang: 2 hints (kun desktop, første gang) */}
                    {/* Første-gangs walkthrough: kunde → titel → gyldighed → materialer → arbejde → beskrivelse → PDF → mail.
                        Venter til "Fortsæt hvor du slap?" er væk, så de to ikke ligger oven på hinanden. */}
                    {!isMobile && !restorePrompt && shouldShowCoach('quickquote_tour') && (
                        <SectionTour tourKey="quickquote_tour" steps={QUICKQUOTE_TOUR_STEPS} zBase={100100} onDone={(skipped) => { if (!skipped) setFinishStep('ownmail'); }} />
                    )}

                    {/* Afslutning: ét fokus ad gangen. Boks A (egen mail) → Boks B (eksempel). */}
                    {finishStep === 'ownmail' && createPortal(
                        <div onClick={() => setFinishStep(null)} style={{ position: 'fixed', inset: 0, zIndex: 100100, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 470, background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>Valgfrit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Send fra din egen mail</div>
                                <p style={{ margin: '0 0 12px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                                    Sætter du din egen mail op, sendes tilbuddet fra din adresse — så det også ligger i din egen "Sendt".
                                </p>
                                {/* Lille mailboks-illustration (ren SVG) — viser at tilbuddet havner i "Sendt". */}
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 14px' }}>
                                    <svg viewBox="0 0 300 170" width="100%" style={{ maxWidth: 280, display: 'block', filter: 'drop-shadow(0 8px 18px rgba(15,23,42,0.10))' }} role="img" aria-label="Mailboks med Sendt-mappe">
                                        <defs><clipPath id="qq-mailbox-clip"><rect x="8" y="10" width="284" height="150" rx="14" /></clipPath></defs>
                                        <g clipPath="url(#qq-mailbox-clip)">
                                            <rect x="8" y="10" width="284" height="150" fill="#ffffff" />
                                            {/* titellinje */}
                                            <rect x="8" y="10" width="284" height="28" fill="#f8fafc" />
                                            <circle cx="26" cy="24" r="3.5" fill="#f87171" />
                                            <circle cx="38" cy="24" r="3.5" fill="#fbbf24" />
                                            <circle cx="50" cy="24" r="3.5" fill="#34d399" />
                                            {/* sidebar med mapper */}
                                            <rect x="8" y="38" width="88" height="122" fill="#f8fafc" />
                                            <text x="20" y="62" fontSize="10" fontWeight="600" fill="#94a3b8" fontFamily="Inter, sans-serif">Indbakke</text>
                                            <rect x="12" y="74" width="78" height="22" rx="7" fill="#ecfdf5" />
                                            <text x="20" y="89" fontSize="10" fontWeight="800" fill="#059669" fontFamily="Inter, sans-serif">Sendt</text>
                                            <circle cx="80" cy="85" r="7" fill="#10b981" />
                                            <path d="M77 85 l2 2 l4 -4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            <text x="20" y="116" fontSize="10" fontWeight="600" fill="#94a3b8" fontFamily="Inter, sans-serif">Kladder</text>
                                            {/* mail-liste — øverst er det sendte tilbud */}
                                            <rect x="104" y="48" width="180" height="30" rx="8" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                                            <circle cx="118" cy="63" r="7" fill="#10b981" />
                                            <rect x="132" y="56" width="96" height="5" rx="2.5" fill="#0f172a" opacity="0.72" />
                                            <rect x="132" y="66" width="64" height="4" rx="2" fill="#64748b" opacity="0.55" />
                                            <circle cx="270" cy="63" r="7" fill="#10b981" />
                                            <path d="M267 63 l2 2 l4 -4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="118" cy="95" r="7" fill="#e2e8f0" />
                                            <rect x="132" y="89" width="120" height="5" rx="2.5" fill="#cbd5e1" />
                                            <rect x="132" y="99" width="80" height="4" rx="2" fill="#e2e8f0" />
                                            <circle cx="118" cy="125" r="7" fill="#e2e8f0" />
                                            <rect x="132" y="119" width="110" height="5" rx="2.5" fill="#cbd5e1" />
                                            <rect x="132" y="129" width="70" height="4" rx="2" fill="#e2e8f0" />
                                        </g>
                                        <rect x="8" y="10" width="284" height="150" rx="14" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 14px', marginBottom: 18 }}>
                                    <div style={{ color: '#1e3a8a', fontSize: '0.88rem', lineHeight: 1.5 }}>
                                        Kundens svar lander <strong>altid</strong> direkte hos dig — også helt uden opsætning. Det her er kun valgfrit ekstra; ring <strong>40 26 50 02</strong>, hvis du vil have hjælp.
                                    </div>
                                </div>

                                <button onClick={() => { smtpFromFinish.current = true; setFinishStep(null); setShowSmtpSetup(true); }}
                                    style={{ width: '100%', padding: '14px', cursor: 'pointer', border: 'none', background: 'linear-gradient(145deg,#2563eb,#1d4ed8)', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: '0.98rem', boxShadow: '0 8px 20px rgba(37,99,235,0.3)', marginBottom: 8 }}>
                                    Sæt min mail op
                                </button>
                                <button onClick={() => setFinishStep('example')}
                                    style={{ width: '100%', padding: 12, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                                    Jeg er uinteresseret
                                </button>
                            </div>
                        </div>,
                        document.body
                    )}

                    {finishStep === 'example' && createPortal(
                        <div onClick={() => setFinishStep(null)} style={{ position: 'fixed', inset: 0, zIndex: 100100, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 470, background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Prøv et eksempel-tilbud</div>
                                <p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                                    Vi udfylder et færdigt eksempel og sender det til dig selv — så mærker du præcis, hvordan dit tilbud ser ud for kunden.
                                </p>

                                <button onClick={() => { fillExampleQuote(); setFinishStep(null); setPulseSendExample(true); }}
                                    style={{ width: '100%', padding: '14px', cursor: 'pointer', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: '0.98rem', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', marginBottom: 8 }}>
                                    Udfyld eksempel
                                </button>
                                <button onClick={() => setFinishStep(null)}
                                    style={{ width: '100%', padding: 12, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                                    Nej tak, jeg er klar
                                </button>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Efter eksemplet: peg ned på "Send tilbud" (uden spotlight, så knappen kan trykkes). */}
                    {pulseSendExample && (
                        <Coachmark
                            anchorRef={coachSendRef}
                            placement="top"
                            zBase={100090}
                            eyebrow="Sidste skridt"
                            title="Send det til dig selv"
                            body='Tryk på "Send tilbud", så lander eksemplet i din egen indbakke — præcis som kunden ville modtage det.'
                            primaryLabel="Forstået"
                            onPrimary={() => setPulseSendExample(false)}
                            onClose={() => setPulseSendExample(false)}
                        />
                    )}

                    {/* Inline SMTP-opsætning (genbruger Integrationer-komponenten) — uden at forlade tilbuddet.
                        Lukkes den fra afslutnings-kæden, fører vi videre til "Prøv et eksempel". */}
                    {showSmtpSetup && createPortal(
                        (() => {
                            const closeSmtp = () => { setShowSmtpSetup(false); if (smtpFromFinish.current) { smtpFromFinish.current = false; setFinishStep('example'); } };
                            return (
                                <div onClick={closeSmtp} style={{ position: 'fixed', inset: 0, zIndex: 100110, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
                                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, background: '#fff', borderRadius: 24, padding: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>Send fra din egen mail</h3>
                                            <button onClick={closeSmtp} style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>✕</button>
                                        </div>
                                        <SmtpIntegration carpenterProfile={carpenter} expandedIntegration="smtp" setExpandedIntegration={(v) => { if (v !== 'smtp') closeSmtp(); }} />
                                    </div>
                                </div>
                            );
                        })(),
                        document.body
                    )}
                </div>

                {/* Bekræftelse før afsendelse — viser overblik + en lille forhåndsvisning af mailen */}
                {showSendConfirm && (
                    <div
                        className="qqb-confirm-backdrop"
                        onClick={() => !busy && setShowSendConfirm(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100080, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
                    >
                        <div
                            className="qqb-confirm-card"
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 'min(520px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 24, padding: '30px 28px 24px', boxShadow: '0 30px 80px rgba(15,23,42,0.45)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                    <Send size={28} color="#10b981" />
                                </div>
                                <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                                    {wasSent ? 'Send opdateret tilbud?' : 'Er du sikker på, at du vil sende?'}
                                </h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                    Tjek lige mailen herunder, før den ryger afsted til kunden.
                                </p>
                            </div>

                            {/* Overblik */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: 14, padding: '14px 16px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                    <span style={{ color: '#64748b' }}>Til</span>
                                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{customer.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                    <span style={{ color: '#64748b' }}>Email</span>
                                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{customer.email}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                                    <span style={{ color: '#64748b' }}>Beløb inkl. moms</span>
                                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{kr(calc.totalIncVat)} kr</span>
                                </div>
                            </div>

                            {/* Lille forhåndsvisning af mailen */}
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', marginBottom: '8px' }}>Sådan ser mailen ud</div>
                            <div style={{ height: '260px', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: '20px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}>
                                <iframe title="Bekræft mail preview" srcDoc={emailHtml} style={{ width: '100%', height: '100%', border: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    disabled={busy}
                                    onClick={() => setShowSendConfirm(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                                >
                                    Tilbage
                                </button>
                                <button
                                    className="qqb-send"
                                    disabled={busy}
                                    onClick={() => { setShowSendConfirm(false); save(true); }}
                                    style={{ flex: 1.4, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(16,185,129,0.32)' }}
                                >
                                    <Send size={17} /> {busy ? 'Sender…' : 'Ja, send tilbud'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

                {/* Skabelon-bibliotek: fuldskærm med Word-agtige previews — kig, vælg eller rediger. */}
                {tplLibraryOpen && (
                    <div
                        className="qqb-confirm-backdrop"
                        onClick={() => setTplLibraryOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100085, background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 2vw, 28px)', paddingTop: 'calc(clamp(8px,2vw,28px) + env(safe-area-inset-top))', paddingBottom: 'calc(clamp(8px,2vw,28px) + env(safe-area-inset-bottom))' }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 'min(1200px, 100%)', height: '94vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9', borderRadius: 22, boxShadow: '0 30px 80px rgba(15,23,42,0.45)', overflow: 'hidden' }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg,#eff6ff,#f5f3ff)', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Files size={20} color="#3b82f6" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Skabeloner</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Klik en skabelon for at åbne og redigere — eller tryk Indsæt for at bruge den i tilbuddet.</p>
                                </div>
                                <button type="button" onClick={() => setTplLibraryOpen(false)} className="qqb-close" title="Luk"
                                    style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <X size={19} />
                                </button>
                            </div>

                            {/* Galleri (papir-previews) */}
                            <div className="qqb-col" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 2.4vw, 30px)' }}>
                                <div className="qqb-tplgrid">
                                    {/* Ny skabelon */}
                                    <button type="button" className="qqb-tplnew" onClick={openNewTemplate}>
                                        <div className="qqb-tplnew-circle"><Plus size={26} /></div>
                                        <span>Ny skabelon</span>
                                    </button>

                                    {templates.map((t) => (
                                        <div key={t.id} className="qqb-tplpaper">
                                            <div className="qqb-paperthumb" onClick={() => openEditTemplate(t)} title="Åbn og rediger">
                                                <div className="qqb-paperdoc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.body_html || '') || '<p style="color:#cbd5e1">Tom skabelon</p>' }} />
                                            </div>
                                            <div className="qqb-paperfoot">
                                                <div className="qqb-papername" title={t.name}>{t.name}</div>
                                                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                                    <button type="button" onClick={() => chooseTemplate(t)}
                                                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'linear-gradient(145deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 6px 14px rgba(37,99,235,0.28)' }}>
                                                        <Plus size={14} /> Indsæt
                                                    </button>
                                                    <button type="button" onClick={() => openEditTemplate(t)} title="Rediger" className="qqb-paperedit"
                                                        style={{ width: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Pencil size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {templates.length === 0 && (
                                    <p style={{ textAlign: 'center', margin: '8px 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                                        Ingen skabeloner endnu — byg din første, så ligger den klar til alle dine tilbud.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Skabelon-editor: stort, Word-agtigt dokument-vindue til at opbygge/rette en skabelon. */}
                {tplModalOpen && (
                    <div
                        className="qqb-confirm-backdrop"
                        onClick={closeTemplateModal}
                        style={{ position: 'fixed', inset: 0, zIndex: 100092, background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 2vw, 28px)', paddingTop: 'calc(clamp(8px,2vw,28px) + env(safe-area-inset-top))', paddingBottom: 'calc(clamp(8px,2vw,28px) + env(safe-area-inset-bottom))' }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 'min(1040px, 100%)', height: '94vh', display: 'flex', flexDirection: 'column', background: '#eef2f6', borderRadius: 22, boxShadow: '0 30px 80px rgba(15,23,42,0.45)', overflow: 'hidden' }}
                        >
                            {/* Top-bjælke: tilbage + navn + handlinger */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <button type="button" onClick={closeTemplateModal} className="qqb-close" title="Tilbage til skabeloner"
                                    style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <X size={19} />
                                </button>
                                <input
                                    value={tplName}
                                    onChange={(e) => setTplName(e.target.value)}
                                    placeholder="Navngiv skabelonen…"
                                    maxLength={80}
                                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', background: 'transparent' }}
                                />
                                {tplEditing?.id && (
                                    tplConfirmDelete ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>Slet?</span>
                                            <button type="button" disabled={tplSaving} onClick={removeTemplate}
                                                style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: 'linear-gradient(145deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                {tplSaving ? 'Sletter…' : 'Ja, slet'}
                                            </button>
                                            <button type="button" disabled={tplSaving} onClick={() => setTplConfirmDelete(false)}
                                                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                Nej
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" disabled={tplSaving} onClick={() => setTplConfirmDelete(true)} title="Slet skabelon" className="qqb-paperedit"
                                            style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )
                                )}
                                <button type="button" disabled={tplSaving} onClick={insertFromEditor}
                                    style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid #bfdbfe', background: 'linear-gradient(145deg,#eff6ff,#f5f3ff)', color: '#1d4ed8', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                                    <Plus size={15} /> Indsæt i tilbud
                                </button>
                                <button type="button" disabled={tplSaving} onClick={saveTemplate}
                                    style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(145deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: tplSaving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 8px 20px rgba(37,99,235,0.32)', flexShrink: 0 }}>
                                    <Save size={16} /> {tplSaving ? 'Gemmer…' : 'Gem'}
                                </button>
                            </div>

                            {/* Dokument-lærred: hvidt A4-agtigt "papir" med editoren */}
                            <div className="qqb-col" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(14px, 3vw, 40px) clamp(10px, 3vw, 40px)' }}>
                                <div style={{ maxWidth: 820, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(15,23,42,0.12)' }}>
                                    {renderRichEditor(tplEditorRef, () => {}, 'Skriv din skabelon her — overskrifter, fed, punkter, justering. Du kan også indsætte direkte fra Word eller Google Docs, så bevares formateringen.', 'min(58vh, 760px)', null, true)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bekræft erstatning: skabelon vælges oven på egen tekst i beskrivelsen. */}
                {tplReplaceConfirm && (
                    <div
                        className="qqb-confirm-backdrop"
                        onClick={() => setTplReplaceConfirm(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100096, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    >
                        <div onClick={(e) => e.stopPropagation()}
                            style={{ width: 'min(440px, 100%)', background: '#fff', borderRadius: 24, padding: '30px 28px 24px', textAlign: 'center', boxShadow: '0 30px 80px rgba(15,23,42,0.45)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                                <Files size={28} color="#3b82f6" />
                            </div>
                            <h2 style={{ margin: '0 0 10px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Erstat beskrivelsen?</h2>
                            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.55 }}>
                                Du har allerede tekst i arbejdsbeskrivelsen. Skabelonen <strong style={{ color: '#0f172a' }}>"{tplReplaceConfirm.name}"</strong> erstatter det hele. Vil du fortsætte?
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setTplReplaceConfirm(null)}
                                    style={{ flex: 1, padding: '13px', borderRadius: 13, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>
                                    Behold min tekst
                                </button>
                                <button type="button" onClick={() => applyTemplate(tplReplaceConfirm)}
                                    style={{ flex: 1, padding: '13px', borderRadius: 13, border: 'none', background: 'linear-gradient(145deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37,99,235,0.32)' }}>
                                    Ja, erstat
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
