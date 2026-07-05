import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { registerMutationHandler, flushMutationQueue } from './utils/mutationQueue';
import { mutateCaseMessages } from './utils/caseMessages';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Tunge sider lazy-loades, så koden først hentes når ruten besøges (hurtigere mobil-load).
// lazyWithReload self-healer efter et deploy: fanger "Failed to fetch dynamically imported
// module" (gammelt chunk-hash forsvundet) og laver ét reload i stedet for at crashe.
const Wizard = lazyWithReload(() => import('./components/Wizard/Wizard'));
const Dashboard = lazyWithReload(() => import('./components/Dashboard/Dashboard'));
const LandingPage = lazyWithReload(() => import('./components/Landing/LandingPage'));
const CalculatorPage = lazyWithReload(() => import('./components/Landing/CalculatorPage'));
const FeaturesPage = lazyWithReload(() => import('./components/Landing/FeaturesPage'));
const PricingPage = lazyWithReload(() => import('./components/Landing/PricingPage'));
const GetStartedPage = lazyWithReload(() => import('./components/Landing/GetStartedPage'));
const AboutUsPage = lazyWithReload(() => import('./components/Landing/AboutUsPage'));
const ResetPassword = lazyWithReload(() => import('./components/Auth/ResetPassword'));
const ConfirmedPage = lazyWithReload(() => import('./components/Auth/ConfirmedPage'));
const AdminDashboard = lazyWithReload(() => import('./components/Admin/AdminDashboard'));
const QuoteAcceptPage = lazyWithReload(() => import('./components/Wizard/QuoteAcceptPage'));
const EstimateAcceptPage = lazyWithReload(() => import('./components/Wizard/EstimateAcceptPage'));
const AgreementConfirmPage = lazyWithReload(() => import('./components/Wizard/AgreementConfirmPage'));
const GuestActivate = lazyWithReload(() => import('./components/Guest/GuestActivate'));
import { supabase } from './supabaseClient';
import { isStandalonePWA } from './utils/pwa';
import { logError } from './utils/errorLogger';
import { ensurePushSubscription } from './utils/pushSubscription';
import { getFeatures } from './utils/features';
import OfflineBanner from './components/OfflineBanner';
import { lazyWithReload, isChunkLoadError, reloadForFreshChunks } from './utils/lazyWithReload';
import React, { useState, useEffect, Suspense } from 'react';
// Protected Route Komponent
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    // Chunk-fejl (gammelt deploy) vises ALDRIG som crash — vi reloader i stedet.
    // Marker som "reloading" så render() viser en blank skærm i det splitsekund
    // reloadet tager, ikke den røde crash-skærm.
    if (isChunkLoadError(error)) {
      return { hasError: true, reloading: true, error };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Sidste sikkerhedsnet: hvis en chunk-fejl alligevel skulle nå hertil (fx en
    // dynamisk import inde i et komponent-tree uden for lazyWithReload), så self-heal
    // med ét reload i stedet for at vise crash-skærmen.
    if (isChunkLoadError(error) && reloadForFreshChunks()) {
      return;
    }
    console.error("Dashboard crashed:", error, info);
    this.setState({ info });
    logError({
      message: error?.message || 'Dashboard crash',
      stack: `${error?.stack || ''}\n${info?.componentStack || ''}`,
      source: typeof location !== 'undefined' ? location.pathname : '',
    });
  }

  render() {
    // Chunk-fejl self-healer med reload — vis blank skærm imens, ikke crash-UI.
    if (this.state.reloading) {
      return null;
    }
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <h2>🚨 Dashboard Crashed!</h2>
          <p>Tag venligst et screenshot af denne fejl og send til udvikleren:</p>
          <button 
            onClick={() => window.location.reload(true)}
            style={{ padding: '10px 15px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}
          >
            🔄 Genindlæs Appen Nu
          </button>
          <pre style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ marginTop: '10px', background: '#fef2f2', padding: '10px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', color: '#7f1d1d', flex: 1 }}>
            {this.state.info && this.state.info.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    // Ikke logget ind = smid tilbage til login
    return <Navigate to="/" replace />;
  }
  // Er logget ind = slip igennem
  return children;
};

// Public SaaS Container der fanger "slug" og bygger det rigtige UI vindue
const PublicWizardPage = () => {
  const { slug } = useParams();
  const [carpenterData, setCarpenterData] = useState(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchCarpenter = async () => {
      if (!slug) return;
      try {
        let { data } = await supabase.rpc('get_public_carpenter_by_slug', { slug_val: slug });
        if (!data) {
          // Fallback hvis RPC ikke er oprettet endnu (sikrer at beregneren aldrig går ned)
          const fb = await supabase.from('carpenters').select('*').eq('slug', slug).single();
          data = fb.data;
        }
        if (data) {
          if (data.is_active === false) {
             setIsError('suspended');
          } else {
             setCarpenterData(data);
          }
        } else {
          setIsError('not_found');
        }
      } catch {
        // Dårligt net / timeout: vis en pæn fejl med prøv-igen i stedet for at hænge på "Leder efter…".
        setIsError('network');
      }
    };
    // For at fange hvis dev/brugeren glemmer slug'en på bare / forsiden:
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if(slug) { fetchCarpenter(); } else { setIsError(true); }
  }, [slug]);

  if (isError === 'suspended') return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2 style={{color: '#ef4444'}}>Konto Suspenderet</h2>
          <p className="text-muted" style={{maxWidth: '500px'}}>Denne tømrers overslags-portal er midlertidigt lukket. For adgang bedes virksomheden kontakte Bison Frame.</p>
      </div>
  );

  if (isError === 'network') return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px'}}>
          <div>
            <h2>Kunne ikke indlæse</h2>
            <p className="text-muted" style={{maxWidth: '500px'}}>Der er problemer med forbindelsen lige nu. Tjek dit internet og prøv igen.</p>
          </div>
          <button onClick={() => window.location.reload()} style={{padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, background: '#111827', color: '#fff'}}>Prøv igen</button>
      </div>
  );

  if (isError) return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2>Tømrer ikke fundet</h2>
          <p className="text-muted">Tjek venligst om web-linket er stavet korrekt.</p>
      </div>
  );
  
  if (!carpenterData) return <div style={{textAlign: 'center', padding: '100px', height: '100vh', background: '#f8fafc'}}><h2>Leder efter tømrerens portal...</h2></div>;

  // Kun tømrere har en offentlig online-prisberegner. Andre fag tager imod henvendelser direkte.
  if (!getFeatures(carpenterData.business_type).publicPortal) return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2>Online tilbud er ikke tilgængelig her</h2>
          <p className="text-muted" style={{maxWidth: '500px'}}>{carpenterData.company_name || 'Virksomheden'} tager imod henvendelser direkte. Kontakt dem for et tilbud på din opgave.</p>
      </div>
  );

  return (
    <>
      <nav className="saas-nav">
        <div className="nav-container">
          <div className="logo">{carpenterData.company_name}</div>
          <div className="nav-profile">
            <img 
              src={carpenterData.logo_url || `https://ui-avatars.com/api/?name=${carpenterData.company_name}&background=1e293b&color=fff`} 
              alt={carpenterData.company_name} 
              className="profile-pic" 
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Overslag&background=1e293b&color=fff'; }}
            />
          </div>
        </div>
      </nav>
      <div className="app-main-wrapper">
        <Wizard carpenter={carpenterData} />
      </div>
    </>
  );
};


import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import Lenis from 'lenis';

const AnimatedRoutes = ({ session, setSession }) => {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    const isMarketingRoute = ['/', '/features', '/pricing', '/about', '/get-started', '/calculate'].includes(location.pathname);
    if (isMarketingRoute && !lenisRef.current) {
        lenisRef.current = new Lenis({ autoRaf: true });
    } else if (!isMarketingRoute && lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
    }
    
    return () => {
       // Only cleanup when AnimatedRoutes unmounts
       // we don't want to destroy on every pathname change, only if it leaves marketing
    };
  }, [location.pathname]);

  // Clean up entirely on unmount
  useEffect(() => {
      return () => {
          if (lenisRef.current) {
              lenisRef.current.destroy();
          }
      }
  }, []);
  
  return (
    <AnimatePresence mode="wait" onExitComplete={() => {
        if (lenisRef.current) {
            lenisRef.current.scrollTo(0, { immediate: true });
        } else {
            window.scrollTo(0, 0);
        }
    }}>
      <Suspense fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div className="animate-spin" style={{ width: '38px', height: '38px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%' }} />
        </div>
      }>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          session ? (
            session.user?.email === 'team@bisoncompany.dk' 
              ? <Navigate to="/admin" replace /> 
              : <Navigate to="/dashboard" replace />
          ) : (
            // Installeret webapp → send direkte til login (ikke marketing-forsiden).
            // I browseren vises forsiden som hidtil.
            isStandalonePWA()
              ? <Navigate to="/login" replace />
              : <LandingPage setSession={setSession} />
          )
        } />
        <Route path="/calculate" element={<CalculatorPage setSession={setSession} />} />
        <Route path="/features" element={<FeaturesPage setSession={setSession} />} />
        <Route path="/pricing" element={<PricingPage setSession={setSession} />} />
        <Route path="/about" element={<AboutUsPage setSession={setSession} />} />
        <Route path="/get-started" element={<GetStartedPage setSession={setSession} />} />
        <Route path="/login" element={
          session ? (
            session.user?.email === 'team@bisoncompany.dk' 
              ? <Navigate to="/admin" replace /> 
              : <Navigate to="/dashboard" replace />
          ) : (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'border-box' }}>
                <div style={{ margin: '0 auto', width: '100%', maxWidth: '550px' }}>
                    <Login setSession={setSession} />
                </div>
            </div>
          )
        } />
        <Route path="/:slug" element={<PublicWizardPage />} />
        <Route path="/:slug/overslag/:lead_id" element={<EstimateAcceptPage />} />
        <Route path="/:slug/tilbud/:lead_id" element={<QuoteAcceptPage />} />
        <Route path="/:slug/aftale/:token/:agreementId" element={<AgreementConfirmPage />} />
        <Route path="/bekraeftet" element={<ConfirmedPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/guest/aktiver" element={<GuestActivate />} />
        <Route path="/register" element={
          session ? (
            session.user?.email === 'team@bisoncompany.dk' 
              ? <Navigate to="/admin" replace /> 
              : <Navigate to="/dashboard" replace />
          ) : <Register setSession={setSession} />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute session={session}>
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute session={session}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  const [session, setSession] = useState(() => {
    try {
      const keys = Object.keys(localStorage);
      const tokenKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (tokenKey) {
        const item = localStorage.getItem(tokenKey);
        if (item) {
          return JSON.parse(item);
        }
      }
    } catch (e) {}
    return null;
  });

  const [isInitializing, setIsInitializing] = useState(() => {
    try {
      const keys = Object.keys(localStorage);
      const hasToken = keys.some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      return hasToken;
    } catch (e) {
      return true;
    }
  });

  // Google Maps-scriptet loades nu kun i Dashboard's kort-fane (egen useLoadScript),
  // så @react-google-maps ikke hentes på marketing/login.

  useEffect(() => {
    let released = false;
    const release = () => { if (!released) { released = true; setIsInitializing(false); } };

    // Sikkerheds-timer: uanset hvad slipper vi splash'en hurtigt og bruger den session,
    // der allerede er læst fra localStorage ovenfor. getSession/onAuthStateChange retter
    // til bagefter, når/hvis nettet svarer. Så appen HÆNGER ALDRIG på dårligt/manglende net.
    const safety = setTimeout(release, 2500);

    // Tjek nuværende session ved start for at sikre gyldighed.
    supabase.auth.getSession()
      .then(({ data: { session } }) => { setSession(session); release(); })
      .catch(() => { release(); });   // dårligt net: behold gemt session, gå videre i stedet for at hænge

    // Lyt efter login/logout begivenheder
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      release();
    });

    return () => { clearTimeout(safety); subscription.unsubscribe(); };
  }, []);

  // Offline-kø: registrér handlere og tøm køen automatisk, når nettet er tilbage.
  // Handlinger lavet uden signal (fx sags-beskeder) sendes så af sig selv.
  useEffect(() => {
    registerMutationHandler('case_message', ({ leadId, add, removeIds }) =>
      mutateCaseMessages({ leadId, add: add || [], removeIds: removeIds || [] })
    );

    let toastShown = false;
    const flush = async () => {
      const { flushed } = await flushMutationQueue();
      if (flushed > 0 && !toastShown) {
        toastShown = true;
        toast.success(`${flushed} ${flushed === 1 ? 'ændring' : 'ændringer'} synkroniseret.`, { icon: '✅' });
        setTimeout(() => { toastShown = false; }, 3000);
      }
    };

    flush(); // ved opstart: send evt. ting fra sidste session der aldrig nåede ud
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  // Selvhelende push: har brugeren tidligere slået notifikationer til, gen-tilmelder
  // vi lydløst ved hver app-start, hvis abonnementet er udløbet/forsvundet. Så skal
  // svend/lærling/tømrer aldrig selv ind og trykke "til" igen efter en opdatering.
  useEffect(() => {
    if (session?.user?.id) {
      ensurePushSubscription();
    }
  }, [session?.user?.id]);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-body antialiased">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-slate-900/5 dark:bg-white/5 rounded-full animate-ping opacity-25 scale-150"></div>
            <img src="/logo.png" alt="Bison Frame" className="h-16 w-auto relative z-10 opacity-90" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200">
              Bison Frame
            </h3>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase animate-pulse">
              Indlæser arbejdsområde...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="smooth-fade-in" style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
        <OfflineBanner />
        <Toaster position="top-center" />
        <BrowserRouter>
          <AnimatedRoutes session={session} setSession={setSession} />
        </BrowserRouter>
    </div>
  );
}

export default App;
