import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const targetSlug = 'madsbyg'; // Let's check from the URL slug "madsbyg" in the screenshot
  const { data: carpenter, error: carpenterErr } = await supabase
    .from('carpenters')
    .select('*')
    .eq('slug', targetSlug)
    .single();
  
  if (carpenterErr || !carpenter) {
    console.error("Failed to find carpenter:", carpenterErr);
    return;
  }
  
  console.log("Found carpenter:", carpenter.company_name, "id:", carpenter.id);
  
  const { data: materials, error: materialsErr } = await supabase
    .from('materials')
    .select('*')
    .eq('carpenter_id', carpenter.id);
    
  if (materialsErr) {
    console.error("Failed to query materials:", materialsErr);
    return;
  }
  
  console.log(`Found ${materials.length} material entries.`);
  const doors = materials.filter(m => m.category === 'doors');
  console.log(`Doors category has ${doors.length} entries:`);
  doors.forEach(d => {
    console.log(`- ${d.name}: ${d.price} kr.`);
  });
}

check();
