import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  const parametersSchema = {
    type: "object",
    properties: {
        reasoning: { type: "string" },
        projectTitle: { type: "string" },
        laborHours: { type: "number" },
        materialCost: { type: "number" },
        breakdown: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    item: { type: "string" },
                    hours: { type: "number" },
                    materials: { type: "number" }
                },
                required: ["item", "hours", "materials"],
                additionalProperties: false
            }
        },
        summaryBullets: {
            type: "array",
            items: { type: "string" }
        },
        obsNotes: { type: "string" }
    },
    required: ["reasoning", "projectTitle", "laborHours", "materialCost", "breakdown", "summaryBullets", "obsNotes"],
    additionalProperties: false
  };

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5.5",
      messages: [{ role: "user", content: "Regn videre med det, jeg vil gerne have tilbuddet på nyt tag." }],
      tools: [{
        type: "function",
        function: {
            name: "submit_estimate",
            parameters: parametersSchema,
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
