import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: carpenters } = await supabase.from('carpenters').select('ordrestyring_api_key').not('ordrestyring_api_key', 'is', null).limit(1);
  if (!carpenters || carpenters.length === 0) return console.log("No API key");
  
  const apiKey = carpenters[0].ordrestyring_api_key;
  const authString = Buffer.from(`${apiKey}:api`).toString('base64');
  
  console.log("Fetching cases...");
  const res = await fetch("https://v2.api.ordrestyring.dk/cases", {
    headers: { 'Authorization': `Basic ${authString}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
}
run();
