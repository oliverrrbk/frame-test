import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PenTool, CheckCircle, FileText, Download, X, Save, Plus, Loader2, Edit3, Mic, MicOff, Mail, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { buildAgreementPdf } from '../../utils/agreementPdf';
import { sendEmail } from '../../utils/sendEmail';
import { getAgreementEmailTemplate } from '../../utils/emailTemplates';

// Bekræftet = enten underskrevet på pladsen ELLER bekræftet af kunden via mail-link.
// 'Godkendt' beholdes som bagudkompatibel værdi for gamle aftalesedler.
const isConfirmed = (agr) => agr?.status === 'bekraeftet' || agr?.status === 'Godkendt';

// Standard-estimat der auto-udfyldes når man vælger "Efter Regning".
const DEFAULT_REGNING_ESTIMAT = 'Arbejdstimer + tilhørende materialer';

// Standard mail-besked i preview (redigerbar). En til bekræftelse, en til kopi.
const DEFAULT_MSG_CONFIRM = 'Som aftalt sender jeg hermed aftalesedlen på ekstraarbejdet. Kig den gerne igennem og bekræft den med knappen nedenfor, så går vi videre med opgaven.';
const DEFAULT_MSG_COPY = 'Som aftalt sender jeg hermed en kopi af aftalesedlen på ekstraarbejdet til dine egne filer.';

// Formatér et beløb med tusind-separatorer mens man taster (fx "32000" → "32.000").
const formatAmountInput = (raw) => {
    let val = String(raw).replace(/[^0-9,]/g, '');
    const parts = val.split(',');
    if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
    if (parts[0]) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        val = parts.join(',');
    }
    return val;
};

export default function AftalesedlerTab({ selectedCase, profile, carpenterProfile, onUpdateCase, isMobile = false }) {
    // Branding (firmanavn, cvr, logo, slug) ligger på carpenterProfile; profile kan
    // være en medarbejder uden disse felter. Fald tilbage til profile.
    const brand = carpenterProfile || profile;
    const [agreements, setAgreements] = useState(selectedCase?.raw_data?.extra_agreements || []);
    const [showModal, setShowModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [finalInputs, setFinalInputs] = useState({}); // inline "endelig pris" pr. seddel-id
    const [deletingAgreement, setDeletingAgreement] = useState(null); // seddel der afventer slette-bekræftelse
    const [isDeleting, setIsDeleting] = useState(false);

    // Preview før afsendelse: viser PDF + mail og lader tømreren rette modtager.
    const [preview, setPreview] = useState(null); // { agreement, pdfUrl, base64, confirmUrl, confirmed }
    const [previewEmail, setPreviewEmail] = useState('');
    const [previewMessage, setPreviewMessage] = useState(''); // redigerbar mail-besked
    const [previewTab, setPreviewTab] = useState('pdf'); // mobil-faner: 'pdf' | 'mail'
    const [isSending, setIsSending] = useState(false);
    
    // Modal state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priceType, setPriceType] = useState('fast_pris'); // 'fast_pris' or 'efter_regning'
    const [amount, setAmount] = useState('');
    
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const descriptionDictation = useVoiceDictation((text) => {
        setDescription(prev => `${prev ? `${prev.trim()} ` : ''}${text}`.trim());
    });

    // Indtal hele aftalen: AI udfylder titel, beskrivelse, pristype og beløb/estimat.
    // Tømreren retter blot bagefter.
    const fullDictation = useVoiceDictation((res) => {
        if (res?.title) setTitle(res.title);
        if (res?.description) setDescription(res.description);
        if (res?.priceType) setPriceType(res.priceType);
        if (res?.amount != null && res.amount !== '') {
            if (res.priceType === 'fast_pris') {
                const digits = String(res.amount).replace(/[^0-9]/g, '');
                setAmount(digits ? Number(digits).toLocaleString('da-DK') : '');
            } else {
                setAmount(String(res.amount));
            }
        }
    }, {
        mode: 'aftaleseddel',
        processingMessage: 'Udfylder aftalen...',
        successMessage: 'Aftale udfyldt – tjek og ret hvis nødvendigt'
    });
    
    useEffect(() => {
        setAgreements(selectedCase?.raw_data?.extra_agreements || []);
    }, [selectedCase]);

    // Kunde-oplysninger til PDF'en (genbruges af både gem, download og mail)
    const caseCustomer = {
        name: selectedCase?.customer_name || 'Ukendt',
        address: selectedCase?.customer_address || '',
        caseNumber: selectedCase?.case_number || String(selectedCase?.id || '').substring(0, 8),
        email: selectedCase?.customer_email || ''
    };

    // Live mail-preview — opdateres når man retter beskeden i preview-vinduet.
    const previewEmailHtml = preview
        ? getAgreementEmailTemplate(caseCustomer.name, preview.agreement.title, brand, preview.confirmUrl, previewMessage)
        : '';

    // Persistér en (ny eller opdateret) liste af aftalesedler til databasen.
    const persistAgreements = async (updatedAgreements) => {
        setAgreements(updatedAgreements);
        const updatedCase = {
            ...selectedCase,
            raw_data: {
                ...(selectedCase?.raw_data || {}),
                extra_agreements: updatedAgreements
            }
        };
        const { error } = await supabase
            .from('leads')
            .update({ raw_data: updatedCase.raw_data })
            .eq('id', selectedCase.id);
        if (error) throw error;
        if (onUpdateCase) onUpdateCase(updatedCase);
        return updatedCase;
    };

    const handleSaveAgreement = async (pdfDataUri, signatureData) => {
        // Underskrift på pladsen = bekræftet med det samme. Uden underskrift gemmes
        // sedlen som "afventer", indtil kunden bekræfter via mail.
        const signedOnSite = !!signatureData;
        const newAgreement = {
            id: `aftale_${Date.now()}`,
            title,
            description,
            priceType,
            amount: priceType === 'fast_pris' ? parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0 : amount,
            final_amount: null, // sættes bagefter for "efter regning" når prisen kendes
            date: new Date().toISOString(),
            pdf_data: pdfDataUri,
            signature_data: signatureData || null, // gemmes så PDF'en altid kan regenereres
            status: signedOnSite ? 'bekraeftet' : 'afventer',
            confirmation: signedOnSite
                ? { method: 'signatur', at: new Date().toISOString() }
                : null,
            created_by: profile?.owner_name || profile?.email || 'Ukendt'
        };

        try {
            await persistAgreements([...agreements, newAgreement]);
        } catch (err) {
            console.error("Fejl under gem til database:", err);
            toast.error("Kunne ikke gemme til databasen.");
            return;
        }

        toast.success(signedOnSite
            ? "Aftaleseddel underskrevet og gemt!"
            : "Aftaleseddel gemt — send den til kunden for at få den bekræftet.");
        closeModal();
    };

    const closeModal = () => {
        setShowModal(false);
        setTitle('');
        setDescription('');
        setAmount('');
        setPriceType('fast_pris');
    };

    const sanitizePdfFilename = (value) => {
        const cleaned = String(value || 'Aftaleseddel')
            .trim()
            .replace(/[^\p{L}\p{N}\s_-]/gu, '')
            .replace(/\s+/g, '_')
            .slice(0, 80);
        return cleaned || 'Aftaleseddel';
    };

    const dataUriToBlob = (dataUri) => {
        const [meta, data] = String(dataUri || '').split(',');
        if (!meta || !data) throw new Error('PDF-data mangler eller er ugyldig');

        const mime = meta.match(/^data:([^;]+)/)?.[1] || 'application/pdf';
        const isBase64 = meta.includes(';base64');
        const raw = isBase64 ? atob(data) : decodeURIComponent(data);
        const bytes = new Uint8Array(raw.length);

        for (let i = 0; i < raw.length; i += 1) {
            bytes[i] = raw.charCodeAt(i);
        }

        return new Blob([bytes], { type: mime });
    };

    const handleDownloadAgreementPdf = async (agreement) => {
        try {
            const filename = `${sanitizePdfFilename(agreement?.title)}.pdf`;

            // Eksternt link (gammelt format): åbn direkte.
            if (typeof agreement?.pdf_data === 'string' && !agreement.pdf_data.startsWith('data:')) {
                window.open(agreement.pdf_data, '_blank', 'noopener,noreferrer');
                return;
            }

            // Robust: regenerér hvis den gemte PDF mangler, ELLER hvis sedlen er bekræftet
            // på mail (den gemte PDF blev lavet før bekræftelsen og mangler tid/IP-stemplet).
            let pdfDataUri = agreement?.pdf_data;
            if (!pdfDataUri || agreement?.confirmation?.method === 'email') {
                const { dataUri } = await buildAgreementPdf(agreement, brand, caseCustomer);
                pdfDataUri = dataUri;
            }

            const blob = dataUriToBlob(pdfDataUri);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
            toast.success('PDF hentet.');
        } catch (error) {
            console.error('Aftaleseddel PDF download fejl:', error);
            toast.error('Kunne ikke hente PDF. Prøv at åbne aftalesedlen igen.');
        }
    };

    // Sørg for at sagen har et quote_token (bruges til den offentlige bekræftelses-side).
    // Genereres og gemmes hvis det mangler. Returnerer token-strengen.
    const ensureQuoteToken = async () => {
        if (selectedCase?.quote_token) return selectedCase.quote_token;
        const token = (crypto?.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const { error } = await supabase
            .from('leads')
            .update({ quote_token: token })
            .eq('id', selectedCase.id);
        if (error) throw error;
        if (onUpdateCase) onUpdateCase({ ...selectedCase, quote_token: token });
        return token;
    };

    // Åbn preview før afsendelse: klargør PDF (til visning + vedhæftning), bekræftelses-
    // link (kun hvis ikke bekræftet) og mail-HTML, og vis det hele i preview-vinduet.
    const openSendPreview = async (agreement) => {
        setSendingId(agreement.id);
        try {
            // PDF: skaf både en data-URI (til visning) og ren base64 (til vedhæftning).
            // Regenerér hvis gemt PDF mangler ELLER er mail-bekræftet (så tid/IP-stemplet er med).
            let pdfDataUri = (typeof agreement?.pdf_data === 'string' && agreement.pdf_data.startsWith('data:'))
                ? agreement.pdf_data
                : null;
            if (!pdfDataUri || agreement?.confirmation?.method === 'email') {
                const built = await buildAgreementPdf(agreement, brand, caseCustomer);
                pdfDataUri = built.dataUri;
            }
            const base64 = pdfDataUri.substring(pdfDataUri.indexOf(',') + 1);
            const pdfUrl = URL.createObjectURL(dataUriToBlob(pdfDataUri));

            // Bekræftelses-link kun hvis sedlen ikke allerede er bekræftet.
            const confirmed = isConfirmed(agreement);
            let confirmUrl = null;
            if (!confirmed) {
                const token = await ensureQuoteToken();
                const slug = brand?.slug || 't';
                confirmUrl = `${window.location.origin}/${slug}/aftale/${token}/${agreement.id}`;
            }

            setPreviewEmail(caseCustomer.email && caseCustomer.email !== 'Ukendt' ? caseCustomer.email : '');
            setPreviewMessage(confirmed ? DEFAULT_MSG_COPY : DEFAULT_MSG_CONFIRM);
            setPreviewTab('pdf');
            setPreview({ agreement, pdfUrl, base64, confirmUrl, confirmed });
        } catch (error) {
            console.error('Kunne ikke åbne forhåndsvisning:', error);
            toast.error('Kunne ikke klargøre forhåndsvisningen.');
        } finally {
            setSendingId(null);
        }
    };

    const closeSendPreview = () => {
        if (preview?.pdfUrl) {
            try { URL.revokeObjectURL(preview.pdfUrl); } catch (_e) { /* ignore */ }
        }
        setPreview(null);
        setPreviewEmail('');
        setPreviewMessage('');
        setIsSending(false);
    };

    // Send mailen med den (evt. rettede) modtager-adresse. PDF'en vedhæftes altid.
    const confirmSendAgreement = async () => {
        const to = (previewEmail || '').trim();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            toast.error('Angiv en gyldig modtager-e-mail.');
            return;
        }
        const { agreement, base64, confirmUrl } = preview;

        setIsSending(true);
        const loadingId = toast.loading('Sender aftaleseddel til kunden...');
        try {
            const filename = `${sanitizePdfFilename(agreement.title)}.pdf`;
            const result = await sendEmail({
                to,
                subject: confirmUrl
                    ? `Bekræft aftaleseddel: ${agreement.title}`
                    : `Aftaleseddel: ${agreement.title}`,
                html: getAgreementEmailTemplate(caseCustomer.name, agreement.title, brand, confirmUrl, previewMessage),
                fromName: brand?.company_name || brand?.owner_name,
                replyTo: brand?.email,
                attachments: [{ filename, content: base64 }]
            });

            toast.dismiss(loadingId);
            if (result.success) {
                toast.success(confirmUrl
                    ? `Sendt til ${to} — kunden kan nu bekræfte via mailen`
                    : `Kopi sendt til ${to}`);
                closeSendPreview();
            } else {
                toast.error(result.error || 'Kunne ikke sende mailen.');
                setIsSending(false);
            }
        } catch (error) {
            toast.dismiss(loadingId);
            console.error('Send aftaleseddel fejl:', error);
            toast.error('Kunne ikke sende aftaleseddel.');
            setIsSending(false);
        }
    };

    // Registrér den endelige pris på en "efter regning"-seddel når arbejdet er udført.
    const handleSetFinalAmount = async (agreement, rawValue) => {
        const num = parseFloat(String(rawValue).replace(/\./g, '').replace(',', '.'));
        if (isNaN(num) || num < 0) {
            toast.error('Angiv et gyldigt beløb.');
            return;
        }
        const updated = agreements.map(a => a.id === agreement.id ? { ...a, final_amount: num } : a);
        try {
            await persistAgreements(updated);
            toast.success('Endelig pris gemt — kommer med på fakturaen.');
        } catch (err) {
            console.error('Kunne ikke gemme endelig pris:', err);
            toast.error('Kunne ikke gemme den endelige pris.');
        }
    };

    // Slet en aftaleseddel helt (efter bekræftelse i popup).
    const confirmDeleteAgreement = async () => {
        if (!deletingAgreement) return;
        setIsDeleting(true);
        try {
            await persistAgreements(agreements.filter(a => a.id !== deletingAgreement.id));
            toast.success('Aftaleseddel slettet.');
            setDeletingAgreement(null);
        } catch (err) {
            console.error('Kunne ikke slette aftaleseddel:', err);
            toast.error('Kunne ikke slette aftalesedlen.');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- CANVAS DRAWING LOGIC ---
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Handle both mouse and touch
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        ctx.beginPath();
        ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on mobile while signing
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    // Set up canvas initial style when opened
    useEffect(() => {
        if (showModal && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0f172a';
        }
    }, [showModal]);


    // --- PDF GENERATION ---
    const generateAndSavePDF = async () => {
        // Titel + beskrivelse er altid påkrævet. Fast pris kræver et beløb; ved
        // "efter regning" er beløbet et valgfrit estimat (kendes ofte først bagefter).
        if (!title || !description) {
            toast.error("Udfyld venligst titel og beskrivelse.");
            return;
        }
        if (priceType === 'fast_pris' && !amount) {
            toast.error("Angiv en fast pris (eller skift til 'Efter Regning').");
            return;
        }

        const canvas = canvasRef.current;

        // Underskrift er valgfri: hvis kunden er til stede og skriver under, bekræftes
        // sedlen med det samme. Ellers gemmes den og sendes til kunden bagefter.
        const ctx = canvas.getContext('2d');
        const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const hasSignature = pixelBuffer.some(color => color !== 0);

        setIsGenerating(true);
        toast.loading("Genererer aftaleseddel...", { id: 'pdf_gen' });

        try {
            const signatureImage = hasSignature ? canvas.toDataURL("image/png") : null;

            const { dataUri } = await buildAgreementPdf(
                { title, description, priceType, amount, date: new Date().toISOString(), signature_data: signatureImage },
                brand,
                caseCustomer
            );

            toast.dismiss('pdf_gen');
            await handleSaveAgreement(dataUri, signatureImage);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.dismiss('pdf_gen');
            toast.error("Kunne ikke generere PDF.");
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
            
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '16px' : '0' }}>
                <div>
                    <h2 style={{ fontSize: isMobile ? '1.6rem' : '1.8rem', margin: '0 0 8px 0', color: '#0f172a' }}>Aftalesedler (Ekstraarbejde)</h2>
                    <p style={{ margin: 0, color: '#64748b' }}>Få underskrift på pladsen — eller send sedlen til kunden, så de bekræfter på mail.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="hover-lift"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '18px 24px' : '12px 24px', width: isMobile ? '100%' : 'auto', backgroundColor: '#8b5cf6', color: 'white', borderRadius: isMobile ? '16px' : '12px', fontWeight: 'bold', fontSize: isMobile ? '1.05rem' : '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)' }}
                >
                    <Plus size={20} /> Opret Ny Aftale
                </button>
            </div>

            {/* OVERSIGT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {agreements.length === 0 ? (
                    <div style={{ padding: '64px 32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                            <PenTool size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', color: '#334155', margin: '0 0 8px 0' }}>Ingen aftalesedler endnu</h3>
                        <p style={{ color: '#64748b', margin: 0, maxWidth: '400px', margin: '0 auto' }}>Når kunden beder om noget ekstra, kan du oprette en aftaleseddel her og få deres underskrift med det samme.</p>
                    </div>
                ) : (
                    agreements.map((agr) => {
                        const confirmed = isConfirmed(agr);
                        const confirmMethod = agr.confirmation?.method;
                        const statusLabel = confirmed
                            ? (confirmMethod === 'email' ? 'Bekræftet på mail' : 'Bekræftet')
                            : 'Afventer bekræftelse';
                        const isEfterRegning = agr.priceType === 'efter_regning';
                        const hasFinal = agr.final_amount != null && agr.final_amount !== '';

                        return (
                        <div key={agr.id} className="log-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', ...(isMobile ? { padding: '18px', background: '#fff', border: '1px solid #eef2f7', borderRadius: '18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' } : {}) }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '20px', minWidth: 0 }}>
                                    <div style={{ width: isMobile ? '52px' : '48px', height: isMobile ? '52px' : '48px', flexShrink: 0, borderRadius: '14px', backgroundColor: confirmed ? '#f0fdf4' : '#fffbeb', color: confirmed ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {confirmed ? <CheckCircle size={isMobile ? 28 : 24} /> : <Clock size={isMobile ? 28 : 24} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '1.2rem' : '1.1rem', color: '#0f172a' }}>{agr.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: confirmed ? '#16a34a' : '#d97706', backgroundColor: confirmed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${confirmed ? '#bbf7d0' : '#fde68a'}`, padding: '2px 9px', borderRadius: '999px' }}>
                                                {statusLabel}
                                            </span>
                                            <span>{new Date(agr.date).toLocaleDateString('da-DK')}</span>
                                            <span>•</span>
                                            <span style={{ fontWeight: 'bold', color: '#334155' }}>
                                                {agr.priceType === 'fast_pris'
                                                    ? `${Number(agr.amount).toLocaleString('da-DK')} kr.`
                                                    : (hasFinal ? `Endelig: ${Number(agr.final_amount).toLocaleString('da-DK')} kr.` : `Estimat: ${agr.amount || '—'}`)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        onClick={() => openSendPreview(agr)}
                                        disabled={sendingId === agr.id}
                                        className="hover-lift"
                                        title={confirmed ? 'Send en kopi til kunden på mail' : 'Send til kunden så de kan bekræfte aftalen på mail'}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '14px 20px' : '10px 16px', flex: isMobile ? 1 : 'initial', backgroundColor: '#f5f3ff', color: '#8b5cf6', borderRadius: isMobile ? '14px' : '10px', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '0.9rem', border: 'none', cursor: sendingId === agr.id ? 'wait' : 'pointer' }}
                                    >
                                        {sendingId === agr.id
                                            ? <Loader2 size={isMobile ? 18 : 16} className="animate-spin" />
                                            : <Mail size={isMobile ? 18 : 16} />}
                                        {confirmed ? 'Send kopi' : 'Send til kunde'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadAgreementPdf(agr)}
                                        className="hover-lift"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '14px 20px' : '10px 16px', flex: isMobile ? 1 : 'initial', backgroundColor: '#f1f5f9', color: '#3b82f6', borderRadius: isMobile ? '14px' : '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '0.9rem', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Download size={isMobile ? 18 : 16} /> Hent PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeletingAgreement(agr)}
                                        className="hover-lift"
                                        title="Slet aftaleseddel"
                                        aria-label="Slet aftaleseddel"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '14px' : '10px 12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: isMobile ? '14px' : '10px', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={isMobile ? 18 : 16} />
                                    </button>
                                </div>
                            </div>

                            {/* Bekræftelses-bevis (dokumentation): hvordan, hvornår og IP */}
                            {confirmed && agr.confirmation && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '10px 14px', fontSize: '0.82rem', color: '#15803d' }}>
                                    <CheckCircle size={15} />
                                    <span style={{ fontWeight: 700 }}>
                                        {agr.confirmation.method === 'email' ? 'Bekræftet af kunden på mail' : 'Underskrevet på pladsen'}
                                    </span>
                                    {agr.confirmation.at && (
                                        <span style={{ color: '#16a34a' }}>
                                            · {new Date(agr.confirmation.at).toLocaleString('da-DK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {agr.confirmation.ip && (
                                        <span style={{ color: '#16a34a' }}>· IP {agr.confirmation.ip}</span>
                                    )}
                                </div>
                            )}

                            {/* Endelig pris for "efter regning" — sættes når arbejdet er udført */}
                            {isEfterRegning && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        {hasFinal ? 'Endelig pris (kommer på fakturaen):' : 'Registrér endelig pris når arbejdet er udført:'}
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={hasFinal ? Number(agr.final_amount).toLocaleString('da-DK') : '0,00'}
                                        value={finalInputs[agr.id] ?? ''}
                                        onChange={(e) => setFinalInputs(prev => ({ ...prev, [agr.id]: formatAmountInput(e.target.value) }))}
                                        style={{ flex: '0 1 140px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', textAlign: 'right', outline: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSetFinalAmount(agr, finalInputs[agr.id])}
                                        disabled={!finalInputs[agr.id]}
                                        className="hover-lift"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: 'none', backgroundColor: finalInputs[agr.id] ? '#10b981' : '#cbd5e1', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: finalInputs[agr.id] ? 'pointer' : 'not-allowed' }}
                                    >
                                        <Save size={14} /> {hasFinal ? 'Opdatér' : 'Gem pris'}
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })
                )}
            </div>

            {/* MODAL (Oprettelse) */}
            {showModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 99999, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
                    
                    <div style={{ backgroundColor: 'white', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 auto', maxWidth: '800px', boxShadow: '0 0 40px rgba(0,0,0,0.05)' }}>
                        
                        {/* Header */}
                        <div style={{ padding: 'calc(max(env(safe-area-inset-top), 20px)) 24px 20px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '10px', backgroundColor: '#f5f3ff', color: '#8b5cf6', borderRadius: '12px' }}>
                                    <Edit3 size={24} />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Opret Aftaleseddel</h2>
                            </div>
                            <button 
                                onClick={closeModal}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '32px 24px', overflowY: 'auto', flex: 1, minHeight: 0, paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 32px)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>

                                {/* Indtal hele aftalen — AI udfylder felterne, så tømreren blot retter efter */}
                                <button
                                    type="button"
                                    onClick={fullDictation.isProcessing ? undefined : fullDictation.toggle}
                                    disabled={fullDictation.isProcessing}
                                    className="hover-lift"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        width: '100%',
                                        padding: '16px 18px',
                                        borderRadius: '16px',
                                        border: fullDictation.isRecording ? '1px solid #fecaca' : '1px solid transparent',
                                        background: fullDictation.isRecording
                                            ? '#fef2f2'
                                            : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                        color: fullDictation.isRecording ? '#dc2626' : 'white',
                                        cursor: fullDictation.isProcessing ? 'wait' : 'pointer',
                                        boxShadow: fullDictation.isRecording ? 'none' : '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: fullDictation.isRecording ? '#fee2e2' : 'rgba(255,255,255,0.18)' }}>
                                        {fullDictation.isProcessing
                                            ? <Loader2 size={22} className="animate-spin" />
                                            : (fullDictation.isRecording ? <MicOff size={22} /> : <Mic size={22} />)}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.02rem' }}>
                                            {fullDictation.isProcessing
                                                ? 'Udfylder aftalen...'
                                                : (fullDictation.isRecording ? 'Stop og udfyld' : 'Indtal hele aftalen')}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', opacity: fullDictation.isRecording ? 0.8 : 0.9, fontWeight: 500 }}>
                                            {fullDictation.isRecording
                                                ? 'Tryk når du er færdig med at tale'
                                                : 'Tal frit — AI udfylder titel, beskrivelse og pris. Du retter bare bagefter.'}
                                        </div>
                                    </div>
                                </button>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Hvad drejer det sig om? (Titel)</label>
                                    <input 
                                        type="text" 
                                        placeholder="F.eks. Montering af 2 ekstra spots"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Beskrivelse af aftalen</label>
                                        <button
                                            type="button"
                                            onClick={descriptionDictation.isProcessing ? undefined : descriptionDictation.toggle}
                                            disabled={descriptionDictation.isProcessing}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                minHeight: '38px',
                                                padding: '9px 13px',
                                                borderRadius: '999px',
                                                border: descriptionDictation.isRecording ? '1px solid #fecaca' : '1px solid #c7d2fe',
                                                background: descriptionDictation.isRecording ? '#fef2f2' : (descriptionDictation.isProcessing ? '#f8fafc' : '#eef2ff'),
                                                color: descriptionDictation.isRecording ? '#dc2626' : (descriptionDictation.isProcessing ? '#64748b' : '#4f46e5'),
                                                fontWeight: 800,
                                                fontSize: '0.82rem',
                                                cursor: descriptionDictation.isProcessing ? 'wait' : 'pointer',
                                                boxShadow: descriptionDictation.isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {descriptionDictation.isProcessing
                                                ? <Loader2 size={16} className="animate-spin" />
                                                : (descriptionDictation.isRecording ? <MicOff size={16} /> : <Mic size={16} />)}
                                            {descriptionDictation.isProcessing
                                                ? 'Skriver...'
                                                : (descriptionDictation.isRecording ? 'Stop optagelse' : 'Indtal')}
                                        </button>
                                    </div>
                                    <textarea 
                                        placeholder="Beskriv kort hvad der er aftalt... eller tryk Indtal."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Aftalt prissætning</label>
                                        <div style={{ display: 'flex', gap: '8px', padding: '6px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
                                            <button
                                                onClick={() => {
                                                    setPriceType('fast_pris');
                                                    // Ryd standard-estimatet hvis det stadig står der (passer ikke til et beløb).
                                                    if (amount === DEFAULT_REGNING_ESTIMAT) setAmount('');
                                                }}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: priceType === 'fast_pris' ? 'white' : 'transparent', color: priceType === 'fast_pris' ? '#0f172a' : '#64748b', boxShadow: priceType === 'fast_pris' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                                            >Fast Pris</button>
                                            <button
                                                onClick={() => {
                                                    setPriceType('efter_regning');
                                                    // Auto-udfyld standard-estimat (kun hvis feltet er tomt — overskriv aldrig).
                                                    if (!amount || !amount.trim()) setAmount(DEFAULT_REGNING_ESTIMAT);
                                                }}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: priceType === 'efter_regning' ? 'white' : 'transparent', color: priceType === 'efter_regning' ? '#0f172a' : '#64748b', boxShadow: priceType === 'efter_regning' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                                            >Efter Regning</button>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
                                            {priceType === 'fast_pris' ? 'Beløb (Inkl. evt. moms)' : 'Estimat (F.eks. timer)'}
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder={priceType === 'fast_pris' ? "0,00" : "F.eks. Ca. 2 timer + materialer"}
                                            value={amount}
                                            onChange={(e) => {
                                                if (priceType === 'fast_pris') {
                                                    let val = e.target.value.replace(/[^0-9,]/g, '');
                                                    const parts = val.split(',');
                                                    if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
                                                    if (parts[0]) {
                                                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                        val = parts.join(',');
                                                    }
                                                    setAmount(val);
                                                } else {
                                                    setAmount(e.target.value);
                                                }
                                            }}
                                            style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box', outline: 'none', textAlign: priceType === 'fast_pris' ? 'right' : 'left' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SIGNATURE AREA */}
                            <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0f172a' }}>Kundens Underskrift <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>(valgfri)</span></h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Er kunden til stede, kan de skrive under med fingeren — så er aftalen bekræftet med det samme. Ellers gem og send den til kunden, så bekræfter de selv via mail.</p>
                                </div>
                                
                                <div style={{ position: 'relative', width: '100%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '12px', border: '2px dashed #cbd5e1', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <canvas 
                                        ref={canvasRef}
                                        width={500}
                                        height={200}
                                        style={{ width: '100%', height: '200px', cursor: 'crosshair', touchAction: 'none' }}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                                <button 
                                    onClick={clearCanvas}
                                    style={{ marginTop: '12px', background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Ryd feltet
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '20px 24px max(env(safe-area-inset-bottom, 20px), 20px) 24px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, zIndex: 10 }}>
                            <button 
                                onClick={closeModal}
                                style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', transition: 'all 0.2s' }}
                            >
                                Annullér
                            </button>
                            <button 
                                onClick={generateAndSavePDF}
                                disabled={isGenerating}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: '#10b981', color: 'white', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Gem aftaleseddel
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}

            {/* PREVIEW (Send til kunde) */}
            {preview && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 99999, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ padding: 'calc(max(env(safe-area-inset-top), 18px)) 24px 16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{ padding: '10px', backgroundColor: '#f5f3ff', color: '#8b5cf6', borderRadius: '12px', flexShrink: 0 }}>
                                    <Mail size={22} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Send aftaleseddel</h2>
                                    <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', color: preview.confirmUrl ? '#6d28d9' : '#475569', backgroundColor: preview.confirmUrl ? '#f5f3ff' : '#f1f5f9', border: `1px solid ${preview.confirmUrl ? '#ddd6fe' : '#e2e8f0'}` }}>
                                        {preview.confirmUrl ? 'Sendes til bekræftelse' : 'Sendes som kopi (allerede bekræftet)'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={closeSendPreview}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modtager */}
                        <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Til:</label>
                            <input
                                type="email"
                                value={previewEmail}
                                onChange={(e) => setPreviewEmail(e.target.value)}
                                placeholder="kundens@email.dk"
                                style={{ flex: '1 1 240px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                            />
                        </div>

                        {/* Mobil-faner */}
                        {isMobile && (
                            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0 16px', flexShrink: 0 }}>
                                {[{ k: 'pdf', label: 'Aftaleseddel' }, { k: 'mail', label: 'Mail til kunden' }].map(t => (
                                    <button
                                        key={t.k}
                                        onClick={() => setPreviewTab(t.k)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', backgroundColor: previewTab === t.k ? '#8b5cf6' : '#f1f5f9', color: previewTab === t.k ? 'white' : '#64748b' }}
                                    >{t.label}</button>
                                ))}
                            </div>
                        )}

                        {/* Indhold: PDF + Mail */}
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: isMobile ? 0 : '16px', padding: '16px', backgroundColor: '#f1f5f9' }}>
                            {(!isMobile || previewTab === 'pdf') && (
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    {!isMobile && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Aftaleseddel (PDF)</div>}
                                    <iframe
                                        title="Aftaleseddel PDF"
                                        src={`${preview.pdfUrl}#view=FitH&navpanes=0`}
                                        style={{ flex: 1, width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}
                                    />
                                </div>
                            )}
                            {(!isMobile || previewTab === 'mail') && (
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    {!isMobile && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Sådan ser mailen ud</div>}
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Besked til kunden (kan rettes)</label>
                                        <textarea
                                            value={previewMessage}
                                            onChange={(e) => setPreviewMessage(e.target.value)}
                                            rows={3}
                                            placeholder="Skriv en personlig besked til kunden..."
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                                            onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                        />
                                    </div>
                                    <iframe
                                        title="Mail preview"
                                        srcDoc={previewEmailHtml}
                                        style={{ flex: 1, width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px max(env(safe-area-inset-bottom, 16px), 16px) 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
                            <button
                                onClick={closeSendPreview}
                                disabled={isSending}
                                style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569' }}
                            >
                                Annullér
                            </button>
                            <button
                                onClick={confirmSendAgreement}
                                disabled={isSending}
                                className="hover-lift"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: isSending ? 'wait' : 'pointer', border: 'none', backgroundColor: '#10b981', color: 'white', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                            >
                                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                                {preview.confirmUrl ? 'Send til kunde' : 'Send kopi til kunde'}
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}

            {/* SLET-BEKRÆFTELSE (Frame-stil) */}
            {deletingAgreement && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.08)' }}>
                            <Trash2 size={30} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                            Slet aftaleseddel?
                        </h3>
                        <p style={{ margin: '0 0 28px 0', color: '#64748b', fontSize: '0.97rem', lineHeight: '1.5' }}>
                            Du er ved at slette <strong style={{ color: '#0f172a' }}>{deletingAgreement.title}</strong>. Den fjernes helt fra sagen og kommer ikke med på fakturaen. Dette kan ikke fortrydes.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button
                                onClick={() => setDeletingAgreement(null)}
                                disabled={isDeleting}
                                style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Annullér
                            </button>
                            <button
                                onClick={confirmDeleteAgreement}
                                disabled={isDeleting}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, cursor: isDeleting ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.background = '#dc2626'; }}
                                onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.background = '#ef4444'; }}
                            >
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                Ja, slet
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
