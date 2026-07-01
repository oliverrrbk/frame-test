import { useEffect, useState } from 'react';

// Følger om enheden har netforbindelse. Bruges til den globale offline-banner og
// til at give hurtig besked, når man prøver at sende noget uden signal.
//
// navigator.onLine er ikke 100% præcis (den siger "online" så snart et netkort
// er oppe, selv uden reelt internet), men den fanger den vigtigste case: flytilstand,
// ingen dækning i kælderen, wifi droppet. Kombineret med fejl-baseret detektion
// (isOfflineError i friendlyError.js) dækker vi begge veje.
export function useOnlineStatus() {
    const [online, setOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine !== false
    );

    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    return online;
}
