import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
    console.log("Authenticating as a test user...");
    // We need a valid JWT or we can just try to insert without auth if we use service_role?
    // Wait, the error happened in the client, which is authenticated.
    // Let's use the service_role key to bypass RLS and see if there is a schema error first.
    
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const payload = {
        name: "Test Drawing",
        document_data: { test: "data" },
        type: 'tldraw'
    };

    console.log("Attempting insert...");
    const { data, error } = await supabaseAdmin.from('drawings').insert([payload]).select();
    
    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert succeeded:", data);
        // clean up
        await supabaseAdmin.from('drawings').delete().eq('id', data[0].id);
    }
}

testInsert();
