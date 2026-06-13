import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // 1. Login as the Mester to get a JWT
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'mads.bruns.christ@gmail.com', // Actually, I don't know Mads' password. Let's see if we can just test the rule.
        password: '??'
    });
}
test();
