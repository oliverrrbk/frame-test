import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('status', ['Tilbud Accepteret', 'Bekræftet', 'I gang', 'Afventer Materialer', 'Udført']);

    if (error) {
        console.error(error);
        return;
    }
    
    console.log(`Found ${data.length} active cases.`);
    
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

        const invoiced = c.raw_data?.invoiced_amount || 0;
        const remaining = basePrice - invoiced;
        
        console.log(`- ${c.customer_name} (${c.project_category})`);
        console.log(`  status: ${c.status}`);
        console.log(`  basePrice: ${basePrice}`);
        console.log(`  remaining: ${remaining}`);
    });
}
check();
