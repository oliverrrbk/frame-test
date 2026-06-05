import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const payload = {
            customer_name: 'Test',
            customer_address: 'Test',
            customer_zip: '8000',
            customer_city: 'Test',
            customer_email: 'Test',
            customer_phone: 'Test',
            status: 'Ny forespørgsel',
            project_category: 'special',
            details: { title: 'Test' },
            calc_data: {},
            actual_quote_price: 1000,
            carpenter_id: null,
            assigned_to: null
  };
  const { data, error } = await supabase.from('leads').insert([payload]).select();
  console.log("Result:", data, "Error:", error);
}
test();
