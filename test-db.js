import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: carpenters } = await supabase.from('carpenters').select('id').limit(1);
  if (!carpenters || carpenters.length === 0) return;
  const carpenterId = carpenters[0].id;

  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert([{ carpenter_id: carpenterId }])
    .select('id, case_number')
    .single();

  if (insertError) {
    console.log("Fejl ved oprettelse:", insertError.message);
  } else {
    console.log("SUCCESS! case_number:", newLead.case_number);
    await supabase.from('leads').delete().eq('id', newLead.id);
  }
}
run();
