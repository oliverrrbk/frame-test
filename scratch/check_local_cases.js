import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('leads').select('*').limit(5);
    if (error) { console.error(error); return; }
    
    console.log(`Found ${data.length} cases.`);
    data.forEach(c => {
        let basePrice = 0;
        if (c.raw_data?.calc_data?.totalPrice) {
            basePrice = parseFloat(c.raw_data.calc_data.totalPrice) || 0;
        } else if (c.raw_data?.actual_quote_price) {
            basePrice = typeof c.raw_data.actual_quote_price === 'number' 
                ? c.raw_data.actual_quote_price 
                : parseInt(String(c.raw_data.actual_quote_price).replace(/[^0-9]/g, '')) || 0;
        } else {
            const priceStr = c.price_estimate || '0';
            const firstPricePart = priceStr.split('-')[0] || priceStr;
            basePrice = parseInt(firstPricePart.replace(/[^0-9]/g, '')) || 0;
        }
        console.log(`- ${c.customer_name}: basePrice=${basePrice}, invoiced=${c.raw_data?.invoiced_amount}, status=${c.status}`);
    });
}
check();
