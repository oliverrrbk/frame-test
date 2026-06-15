import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://zjbjupovlgwlrvojusnr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'leads' });
    if (error) {
        // Fallback to querying pg_policies if RPC doesn't exist
        console.log("RPC failed, trying raw query via another method...");
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}
run();
