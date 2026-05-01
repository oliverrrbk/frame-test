import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default async function handler(req, res) {
    // Kun tillad POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, tools } = req.body;

        if (!messages) {
            return res.status(400).json({ error: 'Missing required field: messages' });
        }

        // Vercel gemmer miljøvariablerne sikkert på serveren
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
        });

        // Videresend request til OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Auto-opdaterende alias for den nyeste mini-model
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 1500,
        });

        // Returner OpenAI's svar (inklusiv eventuelle tool calls)
        return res.status(200).json({ 
            success: true, 
            message: completion.choices[0].message 
        });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({ error: error.message || 'Der opstod en fejl ved kontakt til AI.' });
    }
}
