import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

// OBS: Udskiftes med rigtig public VAPID key fra backend
const PUBLIC_VAPID_KEY = 'BCG4X8ATJWFxFoDgrq08RTpZF59-nV3AQveg0Hg3DcNmm5vkPGiv2w-3zYngMhtE8I4ctXyUkmcslD20ASC6Izg';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushSubscriber = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setIsLoading(false);
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking push subscription:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeUser = async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Du afviste notifikationer i browseren.');
                setIsLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });

            // Gem i Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Du er ikke logget ind");

            const { error } = await supabase
                .from('push_subscriptions')
                .insert([{
                    user_id: user.id,
                    subscription_data: JSON.parse(JSON.stringify(subscription))
                }]);

            if (error && error.code !== '23505') { // Ignore unique constraint error
                throw error;
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
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                
                // Fjern fra Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('subscription_data->>endpoint', subscription.endpoint);
                }
            }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: isSubscribed ? '#f0fdf4' : '#fff', border: isSubscribed ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '12px', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isSubscribed ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSubscribed ? '#16a34a' : '#64748b' }}>
                    {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
                </div>
                <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Push Notifikationer</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        {isSubscribed ? 'Du modtager smarte påmindelser.' : 'Slå til for at modtage påmindelser.'}
                    </p>
                </div>
            </div>

            <button 
                onClick={isSubscribed ? unsubscribeUser : subscribeUser}
                disabled={isLoading}
                style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: isSubscribed ? '#ef4444' : '#0f172a', 
                    color: '#fff', 
                    fontWeight: '600', 
                    cursor: isLoading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1
                }}
            >
                {isLoading && <Loader size={16} className="animate-spin" />}
                {isSubscribed ? 'Slå Fra' : 'Slå Til'}
            </button>
        </div>
    );
};

export default PushSubscriber;
