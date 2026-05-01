import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useLoadScript } from '@react-google-maps/api';
import { Toaster } from 'react-hot-toast';
import Wizard from './components/Wizard/Wizard';
import Dashboard from './components/Dashboard/Dashboard';
import LandingPage from './components/Landing/LandingPage';
import FeaturesPage from './components/Landing/FeaturesPage';
import PricingPage from './components/Landing/PricingPage';
import GetStartedPage from './components/Landing/GetStartedPage';
import AboutUsPage from './components/Landing/AboutUsPage';
import Register from './components/Auth/Register';
import Login from './components/Auth/Login';
import AdminDashboard from './components/Admin/AdminDashboard';
import QuoteAcceptPage from './components/Wizard/QuoteAcceptPage';
import { supabase } from './supabaseClient';
import React, { useState, useEffect } from 'react';
// Protected Route Komponent
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard crashed:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <h2>🚨 Dashboard Crashed!</h2>
          <p>Tag venligst et screenshot af denne fejl og send til udvikleren:</p>
          <pre style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #fca5a5' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ marginTop: '10px', background: '#fef2f2', padding: '10px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', color: '#7f1d1d' }}>
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
      const { data } = await supabase.from('carpenters').select('*').eq('slug', slug).single();
      if (data) {
        if (data.is_active === false) {
           setIsError('suspended');
        } else {
           setCarpenterData(data);
        }
      } else {
        setIsError('not_found');
      }
    };
    // For at fange hvis dev/brugeren glemmer slug'en på bare / forsiden:
    if(slug) { fetchCarpenter(); } else { setIsError(true); }
  }, [slug]);

  if (isError === 'suspended') return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2 style={{color: '#ef4444'}}>Konto Suspenderet</h2>
          <p className="text-muted" style={{maxWidth: '500px'}}>Denne tømrers overslags-portal er midlertidigt lukket. For adgang bedes virksomheden kontakte Bison Frame.</p>
      </div>
  );

  if (isError) return (
      <div style={{textAlign: 'center', padding: '100px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2>Tømrer ikke fundet</h2>
          <p className="text-muted">Tjek venligst om web-linket er stavet korrekt.</p>
      </div>
  );
  
  if (!carpenterData) return <div style={{textAlign: 'center', padding: '100px', height: '100vh', background: '#f8fafc'}}><h2>Leder efter håndværkerens portal...</h2></div>;

  return (
    <>
      <nav className="saas-nav">
        <div className="nav-container">
          <div className="logo">{carpenterData.company_name}</div>
          <div className="nav-profile">
            <span className="nav-badge">Powered by Bison Frame SaaS</span>
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

const MAP_LIBRARIES = ['places'];

function App() {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Global Google Maps script loader
  const { isLoaded, loadError } = useLoadScript({
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      id: 'google-map-script',
      libraries: MAP_LIBRARIES
  });

  useEffect(() => {
    // Tjek nuværende session ved start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    // Lyt efter login/logout begivenheder
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isInitializing) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><h3>Låser systemet op...</h3></div>;
  }

  if (loadError) {
    console.error("Google Maps failed to load API");
  }

  return (
    <div className="smooth-fade-in" style={{ minHeight: '100vh', width: '100vw' }}>
        <Toaster position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              session ? (
                session.user?.email === 'team@bisoncompany.dk' 
                  ? <Navigate to="/admin" replace /> 
                  : <Navigate to="/dashboard" replace />
              ) : <LandingPage setSession={setSession} />
            } />
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
                <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                    <div style={{ margin: '0 auto', width: '100%', maxWidth: '550px' }}>
                        <Login setSession={setSession} />
                    </div>
                </div>
              )
            } />
            <Route path="/:slug" element={<PublicWizardPage />} />
            <Route path="/:slug/tilbud/:lead_id" element={<QuoteAcceptPage />} />
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
        </BrowserRouter>
    </div>
  );
}

export default App;
