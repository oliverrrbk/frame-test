export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html, fromName, replyTo } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            return res.status(500).json({ error: 'RESEND_API_KEY er ikke konfigureret på serveren' });
        }
        
        // Sæt dynamisk afsendernavn
        const senderName = fromName ? `${fromName} <info@bisonframe.dk>` : 'Bison Frame <info@bisonframe.dk>';

        // Bruger native fetch til at kalde Resend API'et for at holde det simpelt i Vercel
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: senderName,
                to: [to],
                subject: subject,
                html: html,
                ...(replyTo && { reply_to: replyTo })
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Fejl fra Resend');
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({ error: error.message });
    }
}
