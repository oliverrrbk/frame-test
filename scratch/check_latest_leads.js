import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLeads() {
    console.log("Henter de 10 seneste leads fra databasen...");
    const { data, error } = await supabase
        .from('leads')
        .select('id, quote_token, customer_name, customer_email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Fejl:", error);
        return;
    }

    console.log("\n=== SENESTE 10 LEADS ===");
    data.forEach((lead, i) => {
        console.log(`[${i+1}] ID: ${lead.id}`);
        console.log(`    Token: ${lead.quote_token}`);
        console.log(`    Navn: ${lead.customer_name}`);
        console.log(`    Email: ${lead.customer_email}`);
        console.log(`    Status: ${lead.status}`);
        console.log(`    Oprettet: ${lead.created_at}`);
        console.log("----------------------------------------");
    });
}

checkLeads().catch(console.error);
