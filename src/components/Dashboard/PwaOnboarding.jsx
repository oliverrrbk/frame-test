import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, PlusSquare, MoreVertical, Smartphone } from 'lucide-react';

const PwaOnboarding = () => {
    const [show, setShow] = useState(false);
    const [deviceType, setDeviceType] = useState(null); // 'ios' or 'android'

    useEffect(() => {
        const checkDeviceAndDisplayMode = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            const hasSeen = localStorage.getItem('bison_pwa_onboarding_seen');
            
            if (isStandalone || hasSeen) return;

            const ua = window.navigator.userAgent.toLowerCase();
            const isIOS = /iphone|ipad|ipod/.test(ua);
            const isAndroid = /android/.test(ua);

            if (isIOS) {
                setDeviceType('ios');
                setShow(true);
            } else if (isAndroid) {
                setDeviceType('android');
                setShow(true);
            }
        };

        // Lille delay så det ikke er det første der popper op og blokerer
        const timer = setTimeout(() => {
            checkDeviceAndDisplayMode();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('bison_pwa_onboarding_seen', 'true');
        setShow(false);
    };

    if (!show) return null;

    return createPortal(
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'calc(100% - 48px)',
                        maxWidth: '400px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        zIndex: 999999
                    }}
                >
                    <button 
                        onClick={handleDismiss}
                        style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Installer Appen</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>Få den ægte app-oplevelse og modtag vigtige notifikationer.</p>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sådan gør du:</h4>
                        
                        {deviceType === 'ios' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                                        <Share size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>1. Tryk på <strong>Del</strong> i bunden.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', flexShrink: 0 }}>
                                        <PlusSquare size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>2. Vælg <strong>Føj til hjemmeskærm</strong>.</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', flexShrink: 0 }}>
                                        <MoreVertical size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>1. Tryk på <strong>Menu</strong> (3 prikker) øverst.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                                        <Smartphone size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>2. Vælg <strong>Føj til startskærm</strong>.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default PwaOnboarding;
