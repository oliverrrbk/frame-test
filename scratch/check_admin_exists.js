// Script to check if the admin user exists in the 'carpenters' table.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminExists() {
    console.log("Forbinder til Supabase:", supabaseUrl);
    try {
        const { data, error } = await supabase
            .from('carpenters')
            .select('*')
            .eq('email', 'team@bisoncompany.dk')
            .maybeSingle();

        if (error) {
            console.error("❌ Fejl ved forespørgsel:", error.message);
        } else if (data) {
            console.log("✅ OK: Admin-brugeren eksisterer i 'carpenters'-tabellen!");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("❌ Admin-brugeren 'team@bisoncompany.dk' eksisterer IKKE i 'carpenters'-tabellen.");
        }
    } catch (err) {
        console.error("Uventet fejl:", err.message);
    }
}

checkAdminExists();
