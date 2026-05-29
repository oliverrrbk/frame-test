const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
   console.log("No url found");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('id, project_category, raw_data, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

    if (error) {
        console.error("Error:", error);
    } else {
        data.forEach(l => {
            console.log(`ID: ${l.id}, Cat: ${l.project_category}, Created at: ${l.created_at}`);
            if (l.raw_data) {
                console.log(`  raw_data keys:`, Object.keys(l.raw_data).join(', '));
                if (l.raw_data.breakdownArr) {
                    console.log(`  breakdownArr length:`, l.raw_data.breakdownArr.length);
                } else {
                    console.log(`  breakdownArr is missing!`);
                }
            } else {
                console.log(`  No raw_data`);
            }
        });
    }
}
checkLeads();
