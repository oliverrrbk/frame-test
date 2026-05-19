import OpenAI from 'openai';
import dotenv from 'dotenv';
import { WORK_FORMULAS, MATERIAL_INDEX, CARPENTER_SETTINGS } from './src/prices.js';
import { QUESTIONS } from './src/components/Wizard/questionsConfig.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
// Use Anthropic if preferred, but test_ai_models.mjs used openai wrapper possibly, actually wait, the user's chat-estimator.js uses Vercel AI SDK?
// No, the real API uses Anthropic Claude. Let's see how `api/chat-estimator.js` does it.
