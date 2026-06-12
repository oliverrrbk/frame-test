import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.auth.signUp({
        email: 'test_employee999@bisoncompany.dk',
        password: 'password123',
        options: {
            data: {
                owner_name: 'Test Employee',
                email: 'test_employee999@bisoncompany.dk',
                phone: '12345678',
                role: 'worker',
                company_id: 'test-company-id'
            }
        }
    });
    console.log("SignUp Data:", data.user?.user_metadata);
}
test();
