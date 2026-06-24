import { supabase } from '../supabaseClient';

// attachments: valgfri liste af { filename, content } hvor content er ren base64.
// quoteToken: valgfri string bruges af kunder for at identificere afsenderen, når de bekræfter et tilbud
export const sendEmail = async ({ to, subject, html, fromName, replyTo, attachments, quoteToken }) => {
    try {
        // Hent den aktuelle JWT for at bevise hvem vi er, så serveren kan hente vores SMTP-indstillinger
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers = {
            'Content-Type': 'application/json'
        };

        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers,
            body: JSON.stringify({ to, subject, html, fromName, replyTo, attachments, quoteToken })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Kunne ikke sende email');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};
