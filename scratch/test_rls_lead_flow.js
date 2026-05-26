import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLeadFlow() {
    console.log("1. Simulerer tidlig oprettelse af lead som 'Overslag (Afventer)'...");
    const testUUID = crypto.randomUUID();
    
    const { error: insertError } = await supabase
        .from('leads')
        .insert([{
            quote_token: testUUID,
            customer_name: 'Test Bruger RLS RPC',
            customer_email: 'test@bisoncompany.dk',
            customer_phone: '12345678',
            customer_address: 'Testgade 1, 8000 Aarhus C',
            project_category: 'Nye Vinduer',
            price_estimate: '15.000 kr.',
            contact_preference: 'Afventer accept',
            raw_data: { test: true },
            status: 'Overslag (Afventer)'
        }]);

    if (insertError) {
        console.error("❌ FEJL VED INSERT:", insertError);
        return;
    }
    console.log("✅ INSERT lykkedes! Lead oprettet med token:", testUUID);

    console.log("\n2. Simulerer at kunden klikker på bekræft ved at kalde accept_estimate_by_token RPC'en...");
    const { data: updateSuccess, error: updateError } = await supabase
        .rpc('accept_estimate_by_token', {
            token_val: testUUID,
            preference_val: 'Mandag formiddag'
        });

    if (updateError) {
        console.error("❌ FEJL VED RPC UPDATE:", updateError);
    } else {
        console.log("✅ RPC UPDATE returnerede:", updateSuccess);
    }

    console.log("\n3. Simulerer hentning af leadet via get_lead_by_token RPC for at se den nye status...");
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_lead_by_token', { token_val: testUUID });

    if (rpcError) {
        console.error("❌ FEJL VED RPC SELECT:", rpcError);
    } else {
        console.log("✅ RPC SELECT lykkedes! Den nye status i databasen er:", rpcData?.[0]?.status);
    }
}

testLeadFlow().catch(console.error);
