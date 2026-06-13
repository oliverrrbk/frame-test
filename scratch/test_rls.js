import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Let's try to update a specific user as anonymous. 
    // Wait, we need an ID. Let's just select a user to get an ID.
    const { data: users } = await supabase.from('carpenters').select('id, owner_name, company_id, role').limit(2);
    console.log("Users:", users);

    if (users && users.length > 0) {
        // Try updating role with anon key
        const targetId = users[0].id;
        const { data, error } = await supabase.from('carpenters').update({ role: users[0].role }).eq('id', targetId).select('id');
        console.log("Anon Update result:", { data, error });
    }
}
test();
