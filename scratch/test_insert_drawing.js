import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error } = await supabase.from('drawings').insert([{
        name: 'Test null lead',
        document_data: [],
        thumbnail_svg: '<svg></svg>',
        lead_id: null
    }]).select();
    console.log('Data:', data);
    console.log('Error:', error);
}

test();
