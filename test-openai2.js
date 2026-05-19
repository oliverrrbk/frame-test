import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5.5",
      messages: [{ role: "user", content: "Hej" }],
      tools: [{
        type: "function",
        function: {
            name: "test",
            parameters: { type: "object", properties: { a: { type: "string" } }, required: ["a"], additionalProperties: false },
            strict: true
        }
      }]
    });
    console.log("Success:", res.choices[0].message);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
