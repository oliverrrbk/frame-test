import { useOnlineStatus } from '../hooks/useOnlineStatus';

// Diskret global stribe i toppen, når enheden er offline. Fortæller tømreren at
// han ser gemte data, og at ændringer sendes automatisk igen når nettet er tilbage.
export default function OfflineBanner() {
    const online = useOnlineStatus();
    if (online) return null;

    return (
        <div
            role="status"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 2147483646, // over stort set alt (modaler ligger typisk lavere)
                background: '#78350f',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}
        >
            <span aria-hidden="true">📡</span>
            Du er offline — viser gemte data. Ændringer sendes automatisk, når du får forbindelse igen.
        </div>
    );
}
