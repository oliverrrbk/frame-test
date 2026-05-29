import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://zjbjupovlgwlrvojusnr.supabase.co', 'sb_publishable_3G15XQ5Z6mZ6bNTIcaJN_w_oRSsgM92');

async function testInsert() {
    const newLeadToken = crypto.randomUUID();
    const { data, error } = await supabase
        .from('leads')
        .insert([{
            quote_token: newLeadToken,
            customer_name: 'Test Testesen',
            customer_email: 'test@test.com',
            project_category: 'Træterrasse',
            status: 'Ny forespørgsel',
            raw_data: {
                test: "test",
                breakdownArr: ["Linje 1", "Linje 2"]
            }
        }])
        .select();

    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Insert success:", data);
    }
}
testInsert();
