import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hej" }]
    });
    console.log("SUCCESS: gpt-4o-mini");
    console.log("Response:", res.choices[0].message.content);
  } catch (e) {
    console.error("FAILED: gpt-4o-mini", e.status, e.message);
  }
}
test();
