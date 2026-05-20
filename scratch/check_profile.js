import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const targetId = '7e1063a5-006a-4192-9463-3744b6b38f62';
  
  const { data: profile, error: profileError } = await supabase.from('carpenters').select('*').eq('id', targetId).single();
  console.log("Profile data:", profile, "error:", profileError);

  const { data: settings, error: settingsError } = await supabase.from('settings').select('*').eq('carpenter_id', targetId);
  console.log("Settings data:", settings, "error:", settingsError);
}

test();
