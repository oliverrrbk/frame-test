import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'mads@bison-company.dk', // Use a known email if we can, or just try to insert without auth to see if we get RLS again?
        // Wait, I don't know his password. Let's just use the service role key if available.
    });
}
test();
