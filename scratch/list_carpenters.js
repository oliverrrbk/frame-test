// Script to list all entries in 'carpenters' table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCarpenters() {
    console.log("Forbinder til Supabase:", supabaseUrl);
    try {
        const { data, error } = await supabase
            .from('carpenters')
            .select('id, email, owner_name, company_name, role, tier, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Fejl ved hentning af carpenters:", error.message);
        } else if (data) {
            console.log(`\nFound ${data.length} carpenters:`);
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Uventet fejl:", err.message);
    }
}

listCarpenters();
