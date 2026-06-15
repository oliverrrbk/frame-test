import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjbjupovlgwlrvojusnr.supabase.co';
const supabaseKey = 'sb_publishable_3G15XQ5Z6mZ6bNTIcaJN_w_oRSsgM92';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const carpenter = {
        id: 'd5f52c0e-24a8-410b-9493-209462f28b0c',
        company_id: null
    };

    const payload = {
        customer_name: '',
        customer_address: 'Ukendt adresse',
        customer_email: 'Ukendt',
        customer_phone: 'Ukendt',
        carpenter_id: carpenter?.company_id || carpenter?.id || null,
        status: 'Ny forespørgsel',
        project_category: 'special',
        price_estimate: '0 kr.',
        raw_data: {
            material_list: [],
            material_lists_meta: [{ id: 'default', name: 'Materialeliste til Opgaven', price: '' }],
            details: { 
                title: 'Skræddersyet Opgave',
                notes: '',
                ai_summary: '',
                phases: []
            },
            calc_data: { 
                breakdown: [], 
                totals: { min: 0, max: 0 },
                laborHours: 0,
                hourlyRate: 550,
                materialCostBase: 0,
                materialMarkup: 1.2,
                materialCost: 0,
                customLines: [],
                drivingCost: 0,
                extraMaterialsCost: 0
            },
            actual_quote_price: 0,
            project_title: 'Skræddersyet Opgave'
        }
    };

    const { data, error } = await supabase.from('leads').insert([payload]).select();
    if (error) {
        console.error('Error inserting lead:', error);
    } else {
        console.log('Successfully inserted lead:', data[0].id);
    }
}

run();
