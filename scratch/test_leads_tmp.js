import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjbjupovlgwlrvojusnr.supabase.co';
const supabaseKey = 'sb_publishable_3G15XQ5Z6mZ6bNTIcaJN_w_oRSsgM92';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: leads, error } = await supabase.from('leads').select('id, status, raw_data, carpenter_id').eq('carpenter_id', 'd5f52c0e-24a8-410b-9493-209462f28b0c');
    
    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }
    
    console.log(`Found ${leads.length} leads for company_id d5f52c0e-24a8-410b-9493-209462f28b0c`);
    
    // Check if there are any drafts
    const drafts = leads.filter(l => l.status === 'Kladde' || l.status === 'Intern Kladde' || l.raw_data?.draft_mode);
    console.log(`Found ${drafts.length} drafts`);
    drafts.forEach(d => {
        console.log(`Draft ${d.id}: created_by=${d.raw_data?.created_by}, draft_mode=${d.raw_data?.draft_mode}`);
    });
}

run();
