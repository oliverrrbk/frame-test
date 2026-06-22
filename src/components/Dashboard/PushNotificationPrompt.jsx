import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const PUBLIC_VAPID_KEY = 'BKLNPYR40nKRfERxXXWctbVztLnvUJTBMaacXoOr_z16Jf-1T7Ou-oBWZNoJ5W7c_av8L3G3qNlww5KJr15u36U';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushNotificationPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Only run in standalone (PWA) mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (!isStandalone) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        
        // Wait a bit before checking, so it doesn't pop up immediately on first open and startle the user
        const timer = setTimeout(() => {
            checkAndPrompt();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const checkAndPrompt = async () => {
        try {
            // Check if already asked/dismissed in local storage
            if (localStorage.getItem('bison_push_prompt_dismissed')) return;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            // If they are not subscribed and haven't explicitly denied, we show the prompt
            if (!subscription && Notification.permission !== 'denied') {
                setShowPrompt(true);
            }
        } catch (error) {
            console.error('Error checking push subscription:', error);
        }
    };

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Du afviste notifikationer i browseren.');
                handleDismiss();
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Du er ikke logget ind");

            const { error } = await supabase
                .from('push_subscriptions')
                .insert([{
                    user_id: user.id,
                    subscription_data: JSON.parse(JSON.stringify(subscription))
                }]);

            if (error && error.code !== '23505') throw error;

            toast.success('Notifikationer aktiveret!');
            localStorage.setItem('bison_push_prompt_dismissed', 'true');
            setShowPrompt(false);
        } catch (error) {
            console.error('Error subscribing:', error);
            toast.error('Kunne ikke aktivere notifikationer.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('bison_push_prompt_dismissed', 'true');
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden"
                >
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4 relative">
                            <Bell size={32} />
                            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        
                        <h2 className="text-xl font-bold text-slate-900 mb-3">Gå ikke glip af vigtige beskeder!</h2>
                        
                        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
                            For at få det fulde udbytte af Bison Frame, anbefaler vi at slå notifikationer til. Så får du direkte besked om nye projekter, beskeder fra kunder og vigtige påmindelser omkring timer.
                        </p>

                        <div className="space-y-3">
                            <button 
                                onClick={handleSubscribe}
                                disabled={isLoading}
                                className="w-full py-3.5 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Slå notifikationer til'}
                            </button>
                            
                            <button 
                                onClick={handleDismiss}
                                className="w-full py-3 font-medium rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Måske senere
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body
    );
};

export default PushNotificationPrompt;
