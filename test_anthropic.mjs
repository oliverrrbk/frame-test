import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const models = [
  'claude-4-5-sonnet-latest',
  'claude-4-5-sonnet-20260219',
  'claude-3-7-sonnet-latest',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-4-sonnet-latest',
  'claude-4-sonnet-20260401'
];

(async () => {
  for (const model of models) {
    try {
      await anthropic.messages.create({
          model: model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hej' }]
      });
      console.log("SUCCESS:", model);
      break;
    } catch(e) { 
      console.error("FAILED:", model, e.status, e.message); 
    }
  }
})();
