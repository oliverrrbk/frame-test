import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://zjbjupovlgwlrvojusnr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('drawings').select('id, type, document_data->url, document_data->fileType').limit(5);
    console.log(JSON.stringify(data, null, 2));
    console.log(error);
}

run();
