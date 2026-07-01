import React from 'react';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { isChunkLoadError, reloadForFreshChunks } from '../utils/lazyWithReload';

// Fanger fejl i ÉN fane, så en enkelt del der fejler (typisk offline: en chunk der
// ikke kan hentes, eller data der mangler) IKKE hvidmaler hele dashboardet. Brugeren
// får en pæn Bison Frame-besked + "Prøv igen", og kan stadig skifte fane i menuen.
//
// Boundary'en sidder inde i hver fane-pane. Når man skifter fane, unmountes panen
// (og dermed boundary'en), så tilstanden nulstilles helt af sig selv.
export default class TabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error) {
        // Chunk-fejl (gammelt hash efter deploy) → self-heal med ét reload — men KUN når
        // vi er online. Offline kan et reload alligevel ikke hente chunken, så dér viser
        // vi bare den pæne offline-besked (og prøver automatisk igen når nettet er tilbage).
        if (isChunkLoadError(error) && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
            reloadForFreshChunks();
        }
    }

    componentDidMount() {
        // Kom nettet tilbage? Prøv automatisk igen, så indholdet dukker op af sig selv.
        this._onOnline = () => { if (this.state.hasError) { this.setState({ hasError: false, error: null }); this.props.onRetry && this.props.onRetry(); } };
        window.addEventListener('online', this._onOnline);
    }

    componentWillUnmount() {
        if (this._onOnline) window.removeEventListener('online', this._onOnline);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const { label } = this.props;
        const title = offline
            ? `${label || 'Denne del'} kræver internet`
            : `${label || 'Denne del'} kunne ikke åbnes`;
        const body = offline
            ? 'Du er offline lige nu. Så snart du har forbindelse igen, kan du se det hele — prøv igen når du er online.'
            : 'Der opstod en fejl her. Prøv igen — resten af appen kører videre som normalt.';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', padding: '48px 24px', minHeight: '260px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: offline ? 'linear-gradient(145deg,#fef3c7,#fde68a)' : 'linear-gradient(145deg,#fee2e2,#fecaca)', color: offline ? '#b45309' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(15,23,42,0.10)' }}>
                    {offline ? <WifiOff size={28} /> : <AlertTriangle size={28} />}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
                <div style={{ fontSize: '0.92rem', color: '#64748b', maxWidth: '400px', lineHeight: 1.55 }}>{body}</div>
                <button
                    onClick={() => { this.setState({ hasError: false, error: null }); this.props.onRetry && this.props.onRetry(); }}
                    style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '13px', border: 'none', background: 'linear-gradient(145deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37,99,235,0.28)' }}
                >
                    <RefreshCw size={17} /> Prøv igen
                </button>
            </div>
        );
    }
}
