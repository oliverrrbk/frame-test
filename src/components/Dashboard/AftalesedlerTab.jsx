import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PenTool, CheckCircle, FileText, Download, X, Save, Plus, Loader2, Edit3, Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

export default function AftalesedlerTab({ selectedCase, profile, onUpdateCase, isMobile = false }) {
    const [agreements, setAgreements] = useState(selectedCase?.raw_data?.extra_agreements || []);
    const [showModal, setShowModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
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
    
    useEffect(() => {
        setAgreements(selectedCase?.raw_data?.extra_agreements || []);
    }, [selectedCase]);

    const handleSaveAgreement = async (pdfDataUri) => {
        const newAgreement = {
            id: `aftale_${Date.now()}`,
            title,
            description,
            priceType,
            amount: priceType === 'fast_pris' ? parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0 : amount,
            date: new Date().toISOString(),
            pdf_data: pdfDataUri,
            status: 'Godkendt',
            created_by: profile?.owner_name || profile?.email || 'Ukendt'
        };

        const updatedAgreements = [...agreements, newAgreement];
        setAgreements(updatedAgreements);
        
        const updatedCase = {
            ...selectedCase,
            raw_data: {
                ...(selectedCase?.raw_data || {}),
                extra_agreements: updatedAgreements
            }
        };
        
        try {
            const { error } = await supabase
                .from('leads')
                .update({ raw_data: updatedCase.raw_data })
                .eq('id', selectedCase.id);

            if (error) throw error;
            
            if (onUpdateCase) {
                onUpdateCase(updatedCase);
            }
        } catch (err) {
            console.error("Fejl under gem til database:", err);
            toast.error("Kunne ikke gemme til databasen.");
        }
        
        toast.success("Aftaleseddel er underskrevet og gemt!");
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

    const handleDownloadAgreementPdf = (agreement) => {
        if (!agreement?.pdf_data) {
            toast.error('PDF mangler på denne aftaleseddel.');
            return;
        }

        try {
            const filename = `${sanitizePdfFilename(agreement.title)}.pdf`;

            if (typeof agreement.pdf_data === 'string' && !agreement.pdf_data.startsWith('data:')) {
                window.open(agreement.pdf_data, '_blank', 'noopener,noreferrer');
                return;
            }

            const blob = dataUriToBlob(agreement.pdf_data);
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
        if (!title || !description || !amount) {
            toast.error("Udfyld venligst alle felter inden godkendelse.");
            return;
        }
        
        const canvas = canvasRef.current;
        
        // Check if canvas is empty (simplified check)
        const ctx = canvas.getContext('2d');
        const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const hasContent = pixelBuffer.some(color => color !== 0);
        
        if (!hasContent) {
            toast.error("Kunden skal skrive under først.");
            return;
        }

        setIsGenerating(true);
        toast.loading("Genererer aftaleseddel...", { id: 'pdf_gen' });

        try {
            const signatureImage = canvas.toDataURL("image/png");

            const { jsPDF } = await import('jspdf'); // udskudt: hentes først ved PDF-generering
            const pdf = new jsPDF('p', 'mm', 'a4');
            const brandColor = [15, 23, 42]; 
            
            // Header
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(22);
            pdf.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            pdf.text('AFTALESEDDEL', 20, 30);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Dato: ${new Date().toLocaleDateString('da-DK')}`, 150, 30);
            
            // Company Info (Tenant Branding)
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(15, 23, 42);
            pdf.text(profile?.company_name || 'Håndværkerfirmaet', 20, 50);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(71, 85, 105);
            pdf.text(`CVR: ${profile?.cvr || 'Ikke oplyst'}`, 20, 55);
            
            // Customer Info
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(15, 23, 42);
            pdf.text('Kunde:', 120, 50);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(71, 85, 105);
            pdf.text(`${selectedCase?.customer_name || 'Ukendt'}`, 120, 55);
            pdf.text(`${selectedCase?.customer_address || ''}`, 120, 60);
            pdf.text(`Sag: ${selectedCase?.case_number || ''}`, 120, 65);
            
            // Divider
            pdf.setDrawColor(226, 232, 240);
            pdf.line(20, 75, 190, 75);
            
            // Agreement Details
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(15, 23, 42);
            pdf.text('Ekstraarbejde', 20, 90);
            
            pdf.setFontSize(12);
            pdf.text(title, 20, 100);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const splitDescription = pdf.splitTextToSize(description, 170);
            pdf.text(splitDescription, 20, 110);
            
            const descHeight = splitDescription.length * 5;
            
            // Price Details
            const priceY = 110 + descHeight + 15;
            pdf.setFont('helvetica', 'bold');
            pdf.text('Prisaftale:', 20, priceY);
            
            pdf.setFont('helvetica', 'normal');
            if (priceType === 'fast_pris') {
                pdf.text(`Fast pris: ${amount} kr. (Inkl. evt. moms)`, 20, priceY + 7);
            } else {
                pdf.text(`Udføres efter regning. Estimat: ${amount}`, 20, priceY + 7);
            }
            
            // Signature Section
            const sigY = priceY + 40;
            pdf.setDrawColor(226, 232, 240);
            pdf.line(20, sigY - 10, 190, sigY - 10);
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('Underskrift', 20, sigY);
            
            pdf.setFont('helvetica', 'normal');
            pdf.text('Kunden bekræfter hermed bestilling af ovenstående ekstraarbejde.', 20, sigY + 7);
            
            // Add signature image
            pdf.addImage(signatureImage, 'PNG', 20, sigY + 15, 80, 40);
            
            pdf.setDrawColor(15, 23, 42);
            pdf.line(20, sigY + 60, 100, sigY + 60);
            pdf.text(selectedCase?.customer_name || 'Kundens underskrift', 20, sigY + 65);
            
            const pdfDataUri = pdf.output('datauristring');
            
            toast.dismiss('pdf_gen');
            handleSaveAgreement(pdfDataUri);
            
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
                    <p style={{ margin: 0, color: '#64748b' }}>Få kundens underskrift på ekstraarbejde direkte på pladsen.</p>
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
                    agreements.map((agr) => (
                        <div key={agr.id} className="log-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', ...(isMobile ? { padding: '18px', background: '#fff', border: '1px solid #eef2f7', borderRadius: '18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' } : {}) }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '20px', minWidth: 0 }}>
                                <div style={{ width: isMobile ? '52px' : '48px', height: isMobile ? '52px' : '48px', flexShrink: 0, borderRadius: '14px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={isMobile ? 28 : 24} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '1.2rem' : '1.1rem', color: '#0f172a' }}>{agr.title}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                                        <span>{new Date(agr.date).toLocaleDateString('da-DK')}</span>
                                        <span>•</span>
                                        <span>Af: {agr.created_by}</span>
                                        <span>•</span>
                                        <span style={{ fontWeight: 'bold', color: '#334155' }}>
                                            {agr.priceType === 'fast_pris' ? `${agr.amount.toLocaleString('da-DK')} kr.` : `Estimat: ${agr.amount}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDownloadAgreementPdf(agr)}
                                className="hover-lift"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '14px 20px' : '10px 16px', width: isMobile ? '100%' : 'auto', backgroundColor: '#f1f5f9', color: '#3b82f6', borderRadius: isMobile ? '14px' : '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '0.9rem', border: 'none', cursor: 'pointer' }}
                            >
                                <Download size={isMobile ? 18 : 16} /> Hent PDF
                            </button>
                        </div>
                    ))
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
                                                onClick={() => setPriceType('fast_pris')}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: priceType === 'fast_pris' ? 'white' : 'transparent', color: priceType === 'fast_pris' ? '#0f172a' : '#64748b', boxShadow: priceType === 'fast_pris' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                                            >Fast Pris</button>
                                            <button 
                                                onClick={() => setPriceType('efter_regning')}
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
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0f172a' }}>Kundens Underskrift</h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Bed kunden skrive under i feltet herunder med fingeren.</p>
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
                                Godkend Aftale
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
