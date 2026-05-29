import React, { useState } from 'react';
import { Share2, MessageSquare, Link as LinkIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

const MobileQuickShare = ({ carpenterProfile }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Use dynamic link based on carpenter slug/ID if available, else generic.
    const companyName = carpenterProfile?.company_name || 'Bison Frame';
    const companySlug = carpenterProfile?.slug || carpenterProfile?.id || '';
    const calculatorLink = companySlug 
        ? `https://bisonframe.dk/c/${companySlug}` 
        : `https://bisonframe.dk/calculator`;

    const smsBody = `Hej! Tak for snakken. Her er linket til vores prisberegner, så du nemt kan se, hvad dit projekt koster: ${calculatorLink} - Mvh ${companyName}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(calculatorLink);
        toast.success('Link kopieret!');
        setIsOpen(false);
    };

    const handleSendSms = () => {
        // Native sms protocol. Using ?body= for iOS, &body= for some Androids, but ?body= is standard now.
        window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
        setIsOpen(false);
    };

    return (
        <div className="md:hidden">
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                    zIndex: 40,
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                <Share2 size={24} />
            </button>

            {/* Bottom Sheet Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                zIndex: 50
                            }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'var(--bg-card)',
                                borderTopLeftRadius: '24px',
                                borderTopRightRadius: '24px',
                                padding: '24px',
                                zIndex: 51,
                                paddingBottom: 'calc(24px + env(safe-area-inset-bottom))'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Del Prisberegner</h3>
                                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '8px' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button 
                                    onClick={handleSendSms}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '16px',
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1.1rem',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <MessageSquare size={20} />
                                    Send via SMS (Gratis)
                                </button>

                                <button 
                                    onClick={handleCopyLink}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '16px',
                                        backgroundColor: '#3b82f6',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1.1rem',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <LinkIcon size={20} />
                                    Kopiér Link
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileQuickShare;
