export const sendEmail = async ({ to, subject, html, fromName, replyTo }) => {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, html, fromName, replyTo })
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
