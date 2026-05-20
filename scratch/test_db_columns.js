// Script to verify Supabase DB columns are successfully added and working.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseColumns() {
    console.log("=========================================");
    console.log("🔍 DUBLE-TJEKKER DE NYE SUPABASE KOLONNER");
    console.log("=========================================\n");

    console.log("Forbinder til Supabase:", supabaseUrl);
    
    try {
        // Hent seneste lead, og vælg de nye kolonner specifikt for at se om de eksisterer i schema
        const { data, error } = await supabase
            .from('leads')
            .select('id, ai_curation_status, ai_curation_rating, ai_curation_notes, ai_curation_overrides')
            .limit(1);

        if (error) {
            console.error("❌ SQL Forespørgselsfejl! Kolonnerne blev ikke fundet eller der skete en fejl:", error.message);
            process.exit(1);
        }

        console.log("✅ OK: SQL-foresporgsel lykkedes uden fejl!");
        console.log("De nye AI curation-kolonner er fuldt aktive og tilgængelige i databasen.");
        if (data && data.length > 0) {
            console.log("\nEksempel på hentet data:");
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log("\n(Ingen rækker fundet i leads-tabellen endnu, men schemaet er verificeret korrekt!)");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("💥 Uventet fejl under verifikation:", err.message);
        process.exit(1);
    }
}

testDatabaseColumns();
