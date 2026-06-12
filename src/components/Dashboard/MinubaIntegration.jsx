import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function MinubaIntegration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Forbinder til Minuba...');

  useEffect(() => {
    const handleMinubaLogin = async () => {
      // 1. Check if user is logged into Bison Frame at all.
      // If not, they must log in to Bison Frame first before linking accounts, 
      // or we handle login via Minuba. But standard Menuintegration requires them 
      // to already have a Bison Frame account, OR we create one for them.
      // Usually, they are logged in. Let's just try to call the edge function 
      // with the code. If they aren't logged in, the edge function will fail 
      // unless we send their session JWT.

      const code = searchParams.get('code');
      
      if (!code) {
        setStatus('Fejl: Ingen adgangskode (code) modtaget fra Minuba.');
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
           setStatus('Du skal være logget ind i Bison Frame for at forbinde din konto til Minuba. Omdirigerer til login...');
           setTimeout(() => {
              // Store the Minuba URL to redirect back after login
              sessionStorage.setItem('pendingMinubaCode', code);
              navigate('/login');
           }, 3000);
           return;
        }

        const jwt = session.access_token;

        // Call our Edge Function
        const { data, error } = await supabase.functions.invoke('minuba-auth', {
          body: { 
             code: code,
             redirectUri: window.location.origin + '/minuba-login'
          },
          headers: {
             Authorization: `Bearer ${jwt}`
          }
        });

        if (error) {
           throw new Error(error.message || 'Der opstod en uventet fejl.');
        }

        if (data && data.success) {
           setStatus('Minuba er nu succesfuldt forbundet!');
           toast.success('Minuba er nu forbundet!');
           setTimeout(() => {
              navigate('/dashboard');
           }, 2000);
        } else {
           throw new Error(data?.error || 'Ukendt fejl under validering');
        }

      } catch (err) {
        console.error('Minuba Auth Error:', err);
        setStatus('Fejl ved forbindelse til Minuba: ' + err.message);
      }
    };

    handleMinubaLogin();
  }, [searchParams, navigate]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px' }}>
         <h2 style={{ color: '#4A2C18', marginBottom: '20px' }}>Minuba & Bison Frame</h2>
         
         {status === 'Forbinder til Minuba...' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #4A2C18', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ margin: 0, color: '#64748b' }}>Forbinder...</p>
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
         ) : (
            <p style={{ color: status.startsWith('Fejl') ? '#ef4444' : '#10b981', margin: 0, fontWeight: '500' }}>
               {status}
            </p>
         )}
         
         {status.startsWith('Fejl') && (
            <button 
               onClick={() => navigate('/dashboard')}
               style={{ marginTop: '20px', padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
               Gå tilbage
            </button>
         )}
      </div>
    </div>
  );
}
