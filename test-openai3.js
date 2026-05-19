import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5.5",
      messages: [{ role: "user", content: "Kald submit_estimate funktionen med lidt tekst." }],
      tools: [{
        type: "function",
        function: {
            name: "submit_estimate",
            parameters: { type: "object", properties: { reasoning: { type: "string" } }, required: ["reasoning"], additionalProperties: false },
            strict: true
        }
      }]
    });
    console.log("Success:", JSON.stringify(res.choices[0].message, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
