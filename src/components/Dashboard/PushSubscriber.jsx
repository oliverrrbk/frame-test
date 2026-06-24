import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { isPushSupported, hasActiveSubscription, subscribeToPush, unsubscribeFromPush } from '../../utils/pushSubscription';

const PushSubscriber = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (isPushSupported()) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setIsLoading(false);
        }
    }, []);

    const checkSubscription = async () => {
        try {
            setIsSubscribed(await hasActiveSubscription());
        } catch (error) {
            console.error('Error checking push subscription:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeUser = async () => {
        setIsLoading(true);
        try {
            const { ok, reason } = await subscribeToPush();
            if (!ok) {
                toast.error(reason === 'denied'
                    ? 'Du afviste notifikationer i browseren.'
                    : 'Din enhed understøtter ikke notifikationer.');
                return;
            }
            setIsSubscribed(true);
            toast.success('Notifikationer aktiveret!');
        } catch (error) {
            console.error('Error subscribing:', error);
            toast.error('Kunne ikke aktivere notifikationer: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribeUser = async () => {
        setIsLoading(true);
        try {
            await unsubscribeFromPush();
            setIsSubscribed(false);
            toast.success('Notifikationer slået fra.');
        } catch (error) {
            console.error('Error unsubscribing:', error);
            toast.error('Kunne ikke slå notifikationer fra.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported) {
        return (
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                Din browser eller enhed understøtter desværre ikke Web Push Notifikationer.
            </div>
        );
    }

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            transition: 'all 0.3s' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: isSubscribed ? '#dcfce7' : '#f1f5f9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: isSubscribed ? '#16a34a' : '#64748b',
                    transition: 'all 0.25s'
                }}>
                    {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
                </div>
                <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>Push Notifikationer</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        {isSubscribed ? 'Du modtager smarte påmindelser.' : 'Slå til for at modtage påmindelser.'}
                    </p>
                </div>
            </div>

            <div 
                onClick={() => { if (!isLoading) { if (isSubscribed) unsubscribeUser(); else subscribeUser(); } }}
                style={{
                    position: 'relative',
                    width: '51px',
                    height: '31px',
                    backgroundColor: isSubscribed ? '#34c759' : '#e9e9eb',
                    borderRadius: '16px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.25s',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: isLoading ? 0.6 : 1,
                    userSelect: 'none'
                }}
            >
                <div 
                    style={{
                        width: '27px',
                        height: '27px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06)',
                        transform: isSubscribed ? 'translateX(22px)' : 'translateX(2px)',
                        transition: 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isLoading && (
                        <svg style={{ width: '14px', height: '14px', color: '#8e8e93' }} viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 12 12"
                                    to="360 12 12"
                                    dur="1s"
                                    repeatCount="indefinite"
                                />
                            </path>
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PushSubscriber;
