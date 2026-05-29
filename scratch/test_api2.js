import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('id, project_category, raw_data, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        const l = data[0];
        console.log(`ID: ${l.id}, Cat: ${l.project_category}, Created at: ${l.created_at}`);
        console.log(`Has raw_data:`, !!l.raw_data);
        if (l.raw_data) {
            console.log(`Has breakdownArr:`, !!l.raw_data.breakdownArr);
            if (l.raw_data.breakdownArr) {
                console.log(`breakdownArr length:`, l.raw_data.breakdownArr.length);
                console.log(l.raw_data.breakdownArr);
            }
        }
    } else {
        console.log("No leads found.");
    }
}
checkLeads();
