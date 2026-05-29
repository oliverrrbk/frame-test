import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, project_category, created_at, breakdown_arr, calc_data')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (error) console.error(error);
  else {
    data.forEach(d => {
      console.log(`ID: ${d.id}, Cat: ${d.project_category}, Created: ${d.created_at}`);
      console.log(`bArr length: ${d.breakdown_arr ? d.breakdown_arr.length : 'null'}`);
    });
  }
}
test();
