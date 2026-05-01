import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
    const { data, error } = await supabase
        .from('materials')
        .update({ name: 'Sikkerhed (Buffer-pris)' })
        .eq('name', 'Default');

    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration successful: Renamed 'Default' to 'Sikkerhed (Buffer-pris)'!");
    }
}

migrate();
