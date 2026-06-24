import React from 'react';
import { Calculator, Mic, Hammer, FileText, ChevronRight } from 'lucide-react';

const CreateLeadSelector = ({ onSelectClassic, onSelectCustom, onSelectQuick, isMobile = false }) => {
    return (
        <div className="create-lead-selector" style={{ padding: isMobile ? '64px 16px 24px' : '20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: isMobile ? '1.7rem' : '2rem', color: '#0f172a' }}>Opret ny sag</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: isMobile ? '24px' : '40px', fontSize: isMobile ? '1rem' : '1.1rem' }}>Vælg hvordan du vil oprette</p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '16px' : '24px', maxWidth: '1080px', margin: '0 auto' }}>
                {/* Klassisk Beregner */}
                <div 
                    onClick={onSelectClassic}
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '20px',
                        padding: isMobile ? '24px' : '32px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '16px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calculator size={40} color="#3b82f6" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Brug Beregner</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Standard-skabeloner med faste priser.' : 'Opret et tilbud via de standardiserede skabeloner for gulve, tage, vinduer osv. med foruddefinerede priser.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold' }}>
                        Start beregner <ChevronRight size={18} />
                    </div>
                </div>

                {/* Skræddersyet / Fra Bunden */}
                <div 
                    onClick={onSelectCustom}
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '20px',
                        padding: isMobile ? '24px' : '32px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '16px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mic size={40} color="#10b981" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Opret tilbud fra bunden</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Indtal noter med stemmen — AI bygger tilbuddet.' : 'Opret en specialopgave fra bunden. Indtal dine mål og noter med stemmen, og sammensæt selv materialelisten.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold' }}>
                        Opret fra bunden <ChevronRight size={18} />
                    </div>
                </div>

                {/* Hurtigt tilbud (manuelt) */}
                <div
                    onClick={onSelectQuick}
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '20px',
                        padding: isMobile ? '24px' : '32px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '16px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#f59e0b';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={40} color="#f59e0b" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px' }}>Hurtigt tilbud</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.5' }}>{isMobile ? 'Materialepris + avance + send. Du styrer tallene.' : 'Smid din materialepris ind, sæt din avance og send et tilbud med det samme. Vedhæft din liste fra Davidsen — du har hands-on kontrol.'}</p>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold' }}>
                        Lav tilbud <ChevronRight size={18} />
                    </div>
                </div>
            </div>
            
            <style>{`
                @media (max-width: 768px) {
                    .create-lead-selector > div {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CreateLeadSelector;
