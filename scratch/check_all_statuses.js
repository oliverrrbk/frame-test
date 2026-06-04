import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('leads')
        .select('id, customer_name, status');

    if (error) {
        console.error(error);
        return;
    }
    
    console.log(`Found ${data.length} total cases.`);
    data.forEach(c => console.log(`- ${c.customer_name}: ${c.status}`));
}
check();
