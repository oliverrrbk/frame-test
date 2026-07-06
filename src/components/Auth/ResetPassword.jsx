import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Wrench, Lock } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    // 'checking' = vi afgør om linket er gyldigt · 'ready' = session aktiv, vis formular
    // · 'expired' = ugyldigt/udløbet/opbrugt link → vis "bed om nyt"-besked
    const [linkState, setLinkState] = useState('checking');

    useEffect(() => {
        let cancelled = false;

        const markReady = () => { if (!cancelled) setLinkState('ready'); };
        const markExpired = () => { if (!cancelled) setLinkState('expired'); };

        const resolveLink = async () => {
            const hash = window.location.hash || '';
            const search = window.location.search || '';
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const searchParams = new URLSearchParams(search);

            // 1) Supabase lægger fejl direkte i URL'en når linket er opbrugt/udløbet
            //    (fx #error=access_denied&error_code=otp_expired) — typisk fordi en
            //    mail-scanner (Gmail) har åbnet engangs-linket før brugeren.
            if (hashParams.get('error') || searchParams.get('error')) {
                markExpired();
                return;
            }

            // 2) token_hash-flow (anbefalet): linket peger på VORES domæne med en
            //    token_hash, der først indløses her i browseren via verifyOtp. En
            //    mail-scanner der blot henter siden udløser ikke JS'et → opbruger
            //    IKKE tokenet. Dette er fixet mod Gmails link-forscanning.
            const tokenHash = searchParams.get('token_hash');
            if (tokenHash) {
                const { error } = await supabase.auth.verifyOtp({
                    type: searchParams.get('type') || 'recovery',
                    token_hash: tokenHash,
                });
                if (cancelled) return;
                error ? markExpired() : markReady();
                return;
            }

            // 3) PKCE-flow: linket har ?code=... som skal byttes til en session.
            const code = searchParams.get('code');
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (cancelled) return;
                error ? markExpired() : markReady();
                return;
            }

            // 4) Implicit-flow: Supabase parser selv #access_token og sætter sessionen.
            if (hash.includes('access_token')) {
                markReady();
                return;
            }

            // 5) Intet token i URL'en — er brugeren allerede logget ind (recovery-session)?
            const { data: { session } } = await supabase.auth.getSession();
            if (cancelled) return;
            session ? markReady() : markExpired();
        };

        // Fanger PASSWORD_RECOVERY / SIGNED_IN når Supabase har sat sessionen asynkront.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) markReady();
        });

        resolveLink();

        return () => { cancelled = true; subscription?.unsubscribe(); };
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            setErrorMsg("Adgangskoden skal være mindst 6 tegn.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Adgangskoderne stemmer ikke overens.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            setSuccessMsg("Din adgangskode er nu opdateret! Du sendes videre...");
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            console.error(err);
            // En manglende session her betyder næsten altid et opbrugt/udløbet link.
            const msg = /session|jwt|token|auth/i.test(err.message || '')
                ? "Linket er udløbet eller allerede brugt. Bed om et nyt nulstillings-link."
                : (err.message || "Der opstod en fejl ved opdatering af adgangskoden.");
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-brand">
                        <Wrench size={32} color="#6b7280" style={{ opacity: 0.7 }} />
                    </div>
                    <h2>Bison Frame</h2>
                    <p className="text-muted">Vælg din nye adgangskode</p>
                </div>

                {linkState === 'expired' ? (
                    <div className="login-form">
                        <div className="login-error" style={{ marginBottom: '16px' }}>
                            Linket er udløbet eller allerede brugt. Det sker ofte, fordi din e-mail-udbyder
                            automatisk åbner linket i baggrunden — engangs-linket bliver da brugt op, før du selv
                            når at klikke.
                        </div>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
                            Bed om et nyt link, og klik på det med det samme, når mailen lander.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            style={{
                                background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe',
                                padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
                                cursor: 'pointer', width: '100%',
                            }}
                        >
                            Bed om nyt nulstillings-link
                        </button>
                    </div>
                ) : (
                <form onSubmit={handleUpdatePassword} className="login-form">
                    {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
                    {successMsg && <div style={{ marginBottom: '16px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>{successMsg}</div>}

                    <div className="input-group">
                        <label>Ny Adgangskode (Min. 6 tegn) *</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: '#c5cdd6', zIndex: 1 }} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                style={{ paddingLeft: '44px', width: '100%' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group" style={{ marginTop: '16px' }}>
                        <label>Gentag Ny Adgangskode *</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: '#c5cdd6', zIndex: 1 }} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                style={{ paddingLeft: '44px', width: '100%' }}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!successMsg}
                        style={{
                            background: '#dbeafe',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: loading || !!successMsg ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '24px'
                        }}
                        onMouseOver={(e) => { if(!loading && !successMsg) e.currentTarget.style.background = '#bfdbfe'; }}
                        onMouseOut={(e) => { if(!loading && !successMsg) e.currentTarget.style.background = '#dbeafe'; }}
                    >
                        {loading ? 'Opdaterer...' : 'Gem ny adgangskode'}
                    </button>
                </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
