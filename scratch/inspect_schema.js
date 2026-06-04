import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').limit(1);
    if (leadsErr) console.error(leadsErr);
    else if (leads && leads.length > 0) console.log(Object.keys(leads[0]));
    else console.log("No leads found");
}

inspect();
