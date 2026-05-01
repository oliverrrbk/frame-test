import React from 'react';
import { CheckCircle, CalendarDays, Phone, Mail } from 'lucide-react';

const Step5Success = ({ resetWizard, carpenter }) => {
    return (
        <section className="wizard-step active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '24px', position: 'relative' }}>
                <CheckCircle size={80} color="#10b981" />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#10b981', filter: 'blur(30px)', opacity: 0.2, zIndex: -1, borderRadius: '50%' }}></div>
            </div>
            
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 16px', color: '#0f172a' }}>
                {carpenter?.success_message ? "Tak for din forespørgsel!" : `Tusind tak, fordi du valgte ${carpenter?.company_name || 'os'}!`}
            </h2>
            
            <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: '600px', lineHeight: '1.6', marginBottom: '40px', whiteSpace: 'pre-wrap' }}>
                {carpenter?.success_message || "Jeg har nu modtaget din forespørgsel og dit genererede auto-overslag direkte i mit system. Jeg går personligt detaljerne igennem nu, så tingene sidder lige i skabet!"}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', maxWidth: '700px', marginBottom: '50px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CalendarDays size={32} color="#3b82f6" style={{ marginBottom: '16px' }} />
                    <h4 style={{ margin: '0 0 8px', color: '#0f172a' }}>1. Jeg kigger på opgaven</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Jeg tjekker at dine valg og billeder stemmer overens med prisrammen.</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Phone size={32} color="#3b82f6" style={{ marginBottom: '16px' }} />
                    <h4 style={{ margin: '0 0 8px', color: '#0f172a' }}>2. Kontakten skabes</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Jeg ringer eller sender dig en mail inden for de valgte dage.</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Mail size={32} color="#3b82f6" style={{ marginBottom: '16px' }} />
                    <h4 style={{ margin: '0 0 8px', color: '#0f172a' }}>3. Bindende Tilbud</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Når vi er enige, sender jeg det officielle, bindende og skarpe tilbud retur til dig.</p>
                </div>
            </div>

            <div style={{ padding: '24px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px dashed #bfdbfe', maxWidth: '600px' }}>
                <strong style={{ display: 'block', color: '#1e40af', marginBottom: '8px', fontSize: '1.1rem' }}>Hvad sker der nu?</strong>
                <p style={{ color: '#1e3a8a', margin: 0 }}>
                    Du behøver ikke foretage dig yderligere. Jeg glæder mig meget til at tage en uforpligtende snak om projektet og finde den helt rigtige løsning for din bolig. Vi høres ved!
                </p>
            </div>

            <button 
                onClick={resetWizard} 
                style={{ marginTop: '50px', background: 'transparent', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}>
                Start et nyt overslag
            </button>
        </section>
    );
};

export default Step5Success;
