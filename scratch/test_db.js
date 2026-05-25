import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: materials, error } = await supabase.from('materials').select('*');
  if (error) {
      console.error(error);
      return;
  }
  
  console.log("=== DB MATERIALS AUDIT ===");
  const targetCarpenter = '7e1063a5-006a-4192-9463-3744b6b38f62';
  const carpMats = materials.filter(m => m.carpenter_id === targetCarpenter);
  
  // Gruppér efter kategori
  const grouped = {};
  carpMats.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push({ name: m.name, price: m.price });
  });
  
  console.log(JSON.stringify(grouped, null, 2));
}

test();
