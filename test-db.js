import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
    const { data: carpenters } = await supabase.from('carpenters').select('*').ilike('company_name', '%Mads%');
    console.log("CARPENTERS:", carpenters);
    
    if (carpenters && carpenters.length > 0) {
        const targetId = carpenters[0].id;
        const { data: materials } = await supabase.from('materials').select('*').eq('carpenter_id', targetId);
        console.log("MATERIALS COUNT:", materials ? materials.length : 0);
        
        const { data: leads } = await supabase.from('leads').select('*').eq('carpenter_id', targetId);
        console.log("LEADS COUNT:", leads ? leads.length : 0);
        
        // Find if any leads might crash the dashboard
        if (leads) {
            leads.forEach(l => {
                if (l.raw_data && l.raw_data.actual_quote_price === null) {}
            });
        }
        
        const { data: settings } = await supabase.from('settings').select('*').eq('carpenter_id', targetId).limit(1).single();
        console.log("SETTINGS:", settings);
    }
}
checkData();
