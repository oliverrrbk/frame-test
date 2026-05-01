import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
        customer_name: "Test Name",
        customer_email: "team@bisoncompany.dk",
        customer_phone: "12345678",
        project_category: "Test",
        price_estimate: "100",
        contact_preference: "Test",
        carpenter_id: null
    }]);
  console.log("Insert result:", { data, error });
}
check();
