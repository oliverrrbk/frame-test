import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share, PlusSquare, MoreVertical, Smartphone, Download, Monitor } from 'lucide-react';
import { canInstallNatively, promptNativeInstall, onInstallAvailabilityChange } from '../../utils/pwaInstall';

// "Få Frame som app" — fælles dialog brugt både fra menupunktet (desktop + mobil)
// og som det venlige tilbud efter onboarding på mobil.
//   • Mobil iOS:  guide (Del → Føj til hjemmeskærm) — Apple tillader ikke ét-tryk.
//   • Mobil/desktop med understøttelse: rigtig "Installer"-knap (beforeinstallprompt).
//   • Desktop:    QR-kode så man kan åbne den på telefonen i stedet.
const InstallAppModal = ({ onClose, onRemindLater }) => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isMobile = isIOS || isAndroid;
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bisonframe.dk';

    const [canInstall, setCanInstall] = useState(canInstallNatively());
    useEffect(() => onInstallAvailabilityChange(() => setCanInstall(canInstallNatively())), []);

    const doNativeInstall = async () => {
        const ok = await promptNativeInstall();
        if (ok) onClose();
    };

    return createPortal(
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1000000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px -15px rgba(0,0,0,0.35)', padding: '28px 24px 22px', position: 'relative', textAlign: 'center' }}
            >
                <button onClick={onClose} aria-label="Luk" style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                    <X size={17} />
                </button>

                <div style={{ width: '58px', height: '58px', borderRadius: '18px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Smartphone size={28} />
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Få Frame som app</h2>
                <p style={{ margin: '0 0 22px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                    {isMobile
                        ? 'Læg Frame på din hjemmeskærm, så du åbner den med ét tryk — som en rigtig app.'
                        : 'Frame virker fint i browseren. Vil du have den som app, kan du installere den her — eller åbne den på din telefon.'}
                </p>

                {/* iOS: kun guide (ingen ét-tryks-mulighed i Safari) */}
                {isIOS ? (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}><Share size={16} /></div>
                            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>1. Tryk på <strong>Del</strong> i bunden af Safari.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', flexShrink: 0 }}><PlusSquare size={16} /></div>
                            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>2. Vælg <strong>Føj til hjemmeskærm</strong>.</span>
                        </div>
                    </div>
                ) : canInstall ? (
                    // Android + desktop Chrome/Edge: rigtig ét-tryks-installation
                    <button
                        onClick={doNativeInstall}
                        style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                        <Download size={18} /> {isMobile ? 'Installer app' : 'Installer på denne computer'}
                    </button>
                ) : isAndroid ? (
                    // Android uden install-event (fx allerede afvist): vis menu-guide
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', flexShrink: 0 }}><MoreVertical size={16} /></div>
                            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>1. Tryk på <strong>Menu</strong> (3 prikker) øverst.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}><Smartphone size={16} /></div>
                            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>2. Vælg <strong>Føj til startskærm</strong>.</span>
                        </div>
                    </div>
                ) : (
                    // Desktop (eller browser uden install-event): QR-kode til at åbne på telefonen
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <QRCodeSVG value={appUrl} size={148} level="M" />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <Monitor size={15} className="text-slate-400" /> Scan med telefonens kamera for at åbne Frame
                        </p>
                    </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {onRemindLater && (
                        <button onClick={onRemindLater} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', padding: '6px' }}>
                            Mind mig senere
                        </button>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default InstallAppModal;
