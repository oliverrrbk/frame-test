require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
    const { data: profiles, error: err1 } = await supabase
        .from('carpenters')
        .select('id, owner_name, email, role, company_id')
        .order('created_at', { ascending: false });
    
    console.log("All Carpenters:");
    profiles?.forEach(p => console.log(JSON.stringify(p)));
}

checkData();
