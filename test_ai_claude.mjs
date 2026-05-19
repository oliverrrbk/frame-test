import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
(async () => {
  try {
    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
    });
    console.log(response.content[0].text);
  } catch(e) { console.error(e.message); }
})();
