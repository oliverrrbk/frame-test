import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use anon key, it's enough to run an update on something we don't own to see the exact Postgres error we get if we bypass RLS? No, RLS will just block it.
// Wait, we need the exact error. We can just test updating our OWN profile with a very long email!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'mads.bruns.christ@gmail.com',
        password: 'testpassword123' // Is this his password? No, I don't have it.
    });
}
test();
