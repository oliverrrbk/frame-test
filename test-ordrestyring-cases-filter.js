import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: carpenters } = await supabase.from('carpenters').select('ordrestyring_api_key').not('ordrestyring_api_key', 'is', null).limit(1);
  const apiKey = carpenters[0].ordrestyring_api_key;
  const authString = Buffer.from(`${apiKey}:api`).toString('base64');
  
  const res = await fetch("https://v2.api.ordrestyring.dk/cases?case_number=17", {
    headers: { 'Authorization': `Basic ${authString}` }
  });
  const data = await res.json();
  console.log("Filtered cases:", data);
}
run();
