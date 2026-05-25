import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const models = [
  'claude-3-5-sonnet-20240620',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229'
];

(async () => {
  for (const model of models) {
    try {
      const response = await anthropic.messages.create({
          model: model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hej' }]
      });
      console.log("SUCCESS:", model);
      console.log("Response:", response.content[0].text);
      break;
    } catch(e) { 
      console.error("FAILED:", model, e.status, e.message); 
    }
  }
})();
