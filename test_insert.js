import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { error } = await supabase.from('carpenters').insert([{
        id: '12345678-1234-1234-1234-123456789012',
        email: 'test@test.com',
        owner_name: 'Test',
        phone: '12345678',
        role: 'worker',
        company_id: '12345678-1234-1234-1234-123456789012',
        company_name: 'Medarbejder',
        requires_password_change: true
    }]);
    console.log("Error:", error);
}
test();
