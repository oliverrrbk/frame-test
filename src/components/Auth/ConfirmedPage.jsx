import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConfirmedPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect automatically after 2.5 seconds so they can read the success message
        const timer = setTimeout(() => {
            navigate('/dashboard');
        }, 2500);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#f8fafc', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: '#fff',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: '#ecfdf5', 
                    color: '#10b981', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 24px' 
                }}>
                    <CheckCircle size={40} />
                </div>
                <h1 style={{ fontSize: '24px', margin: '0 0 16px 0', color: '#1e293b' }}>E-mail bekræftet!</h1>
                <p style={{ color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                    Din e-mailadresse er nu bekræftet. Du bliver automatisk viderestillet til dit kontrolpanel om et øjeblik...
                </p>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0' }}>
                    Velkommen til Bison Frame.
                </p>
            </div>
        </div>
    );
};

export default ConfirmedPage;
