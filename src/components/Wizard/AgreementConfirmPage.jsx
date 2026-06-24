import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

// Offentlig side hvor kunden bekræfter en aftaleseddel (ekstraarbejde) uden login.
// Spejler QuoteAcceptPage: henter sagen via hemmeligt quote_token (RPC, SECURITY
// DEFINER) og bekræfter den specifikke aftaleseddel via confirm_agreement_by_token.
// URL: /:slug/aftale/:token/:agreementId
const AgreementConfirmPage = () => {
    const { token, agreementId } = useParams();

    const [agreement, setAgreement] = useState(null);
    const [carpenter, setCarpenter] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const isConfirmedStatus = (agr) => agr?.status === 'bekraeftet' || agr?.status === 'Godkendt';

    useEffect(() => {
        const fetchAgreement = async () => {
            try {
                const res = await supabase.rpc('get_lead_by_token', { token_val: token });
                const lead = res.data ? res.data[0] : null;
                if (res.error || !lead) throw res.error || new Error('Ikke fundet');

                setCustomerName(lead.customer_name || 'kunde');

                const list = lead.raw_data?.extra_agreements || [];
                const found = list.find(a => a.id === agreementId);
                setAgreement(found || null);
                if (found && isConfirmedStatus(found)) setConfirmed(true);

                if (lead.carpenter_id) {
                    let { data: carpenterData } = await supabase
                        .rpc('get_public_carpenter', { carpenter_id: lead.carpenter_id });
                    if (!carpenterData) {
                        const fb = await supabase.from('carpenters').select('*').eq('id', lead.carpenter_id).single();
                        carpenterData = fb.data;
                    }
                    setCarpenter(carpenterData);
                }
            } catch (error) {
                console.error('Fejl ved hentning af aftaleseddel:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (token && agreementId) fetchAgreement();
    }, [token, agreementId]);

    const openPdf = () => {
        if (!agreement?.pdf_data || typeof agreement.pdf_data !== 'string') return;
        try {
            if (!agreement.pdf_data.startsWith('data:')) {
                window.open(agreement.pdf_data, '_blank', 'noopener,noreferrer');
                return;
            }
            const data = agreement.pdf_data.substring(agreement.pdf_data.indexOf(',') + 1);
            const raw = atob(data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (e) {
            console.error('Kunne ikke åbne PDF:', e);
        }
    };

    const handleConfirm = async () => {
        if (!termsAccepted) {
            toast.error('Sæt flueben for at bekræfte aftalen.');
            return;
        }
        setIsConfirming(true);
        try {
            let ipAddress = 'Ukendt';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ipAddress = ipData.ip;
            } catch (_e) { /* ignore */ }

            const confirmation = {
                method: 'email',
                at: new Date().toISOString(),
                ip: ipAddress,
                user_agent: navigator.userAgent
            };

            const { error } = await supabase.rpc('confirm_agreement_by_token', {
                token_val: token,
                agreement_id: agreementId,
                confirm_data: confirmation
            });
            if (error) throw error;

            setConfirmed(true);
            toast.success('Tak! Aftalen er bekræftet.');
        } catch (error) {
            console.error('Fejl ved bekræftelse:', error);
            toast.error('Der opstod en fejl ved bekræftelsen. Prøv igen.');
        } finally {
            setIsConfirming(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Åbner den sikre side...</h2>
            </div>
        );
    }

    if (!agreement) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <h2>Aftalesedlen blev ikke fundet. Kontakt din håndværker.</h2>
            </div>
        );
    }

    const priceText = agreement.priceType === 'fast_pris'
        ? `Fast pris: ${Number(agreement.amount).toLocaleString('da-DK')} kr. (inkl. evt. moms)`
        : `Udføres efter regning${agreement.amount ? `. Estimat: ${agreement.amount}` : ''}`;

    return (
        <div className="accept-page-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>

            {/* Tømrer Branding Header */}
            <div style={{ maxWidth: '700px', width: '100%', marginBottom: '24px', textAlign: 'center' }}>
                {carpenter?.logo_url ? (
                    <img src={carpenter.logo_url} alt="Firma Logo" style={{ maxHeight: '80px', marginBottom: '16px', objectFit: 'contain' }} />
                ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px', fontWeight: 'bold', color: '#64748b' }}>
                        {carpenter?.company_name ? carpenter.company_name.charAt(0) : 'T'}
                    </div>
                )}
                <h1 style={{ color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', fontWeight: '800' }}>Aftaleseddel: Ekstraarbejde</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0' }}>Til {customerName} fra {carpenter?.company_name || 'din håndværker'}</p>
            </div>

            {/* Document Container */}
            <div className="accept-page-card" style={{ maxWidth: '700px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>

                {confirmed && (
                    <div style={{ backgroundColor: '#ecfdf5', borderBottom: '1px solid #10b981', padding: '24px 32px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>✓</div>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', color: '#065f46', fontSize: '1.4rem' }}>Aftalen er bekræftet</h2>
                            <p style={{ margin: 0, color: '#047857', fontSize: '0.95rem' }}>Tak! {carpenter?.company_name || 'Din håndværker'} har fået besked, og arbejdet medtages på den endelige faktura.</p>
                        </div>
                    </div>
                )}

                {/* Detaljer */}
                <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#0f172a' }}>{agreement.title}</h3>
                    <p style={{ margin: '0 0 20px 0', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{agreement.description}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{priceText}</span>
                    </div>

                    {agreement.pdf_data && (
                        <button
                            onClick={openPdf}
                            style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                        >
                            Åbn aftalesedlen som PDF
                        </button>
                    )}
                </div>

                {/* Bekræftelse */}
                {!confirmed && (
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', backgroundColor: '#fff' }}>
                        <div style={{ textAlign: 'left', width: '100%', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    style={{ marginTop: '4px', width: '24px', height: '24px', accentColor: '#10b981', cursor: 'pointer' }}
                                />
                                <span style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    Jeg bekræfter hermed bestilling af ovenstående ekstraarbejde. Bekræftelsen er bindende og registreres med tidspunkt.
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming || !termsAccepted}
                            style={{
                                background: termsAccepted ? '#10b981' : '#cbd5e1',
                                color: 'white', border: 'none', padding: '20px 48px',
                                fontSize: '1.25rem', fontWeight: '700', borderRadius: '12px',
                                cursor: (isConfirming || !termsAccepted) ? 'not-allowed' : 'pointer',
                                boxShadow: termsAccepted ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' : 'none',
                                width: '100%', maxWidth: '400px', opacity: isConfirming ? 0.7 : 1
                            }}
                        >
                            {isConfirming ? 'Behandler...' : '✓ Bekræft aftale'}
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Trust */}
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ fontSize: '0.85rem' }}>Sikker bekræftelse udsendt via <strong>Bison Frame</strong> for {carpenter?.company_name || 'din håndværker'}</span>
            </div>
        </div>
    );
};

export default AgreementConfirmPage;
