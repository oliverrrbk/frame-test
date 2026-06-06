import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    // try to insert an empty row and catch error to see columns, or just use rpc if possible
    // Alternatively, I can fetch the postgrest openapi definition
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`);
    const json = await res.json();
    console.log(Object.keys(json.definitions.drawings.properties));
}

test();
