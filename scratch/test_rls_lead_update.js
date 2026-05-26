import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Supabase environment variables not found!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runRLSVerification() {
  console.log("=== SUPABASE RLS UPDATE POLICY VERIFICATION ===");
  console.log("1. Creating temporary draft lead as an anonymous guest...");
  
  const tempToken = crypto.randomUUID();
  const { data: newLeads, error: insertError } = await supabase
    .from('leads')
    .insert([{
      quote_token: tempToken,
      customer_name: 'TEST RLS GUEST',
      customer_email: 'rls-test@example.com',
      customer_phone: '40265002',
      customer_address: 'Testgade 1, 8000 Aarhus C',
      project_category: 'Nye Vinduer',
      price_estimate: '10.000 kr.',
      status: 'Overslag (Afventer)',
      contact_preference: 'Afventer accept',
      raw_data: { category: 'windows', details: {} },
      carpenter_id: 'd5f52c0e-24a8-410b-9493-209462f28b0c'
    }])
    .select();

  if (insertError) {
    console.error("Error creating temporary lead:", insertError);
    return;
  }

  const lead = newLeads[0];
  console.log(`   Lead created successfully. ID: ${lead.id}, Token: ${tempToken}`);

  console.log("\n2. Simulating customer accepting the estimate...");
  console.log("   Attempting to update status to 'Ny forespørgsel' and contact_preference...");
  
  const { data: updatedLeads, error: updateError } = await supabase
    .from('leads')
    .update({
      status: 'Ny forespørgsel',
      contact_preference: 'Hurtigst muligt (Mandag Eftermiddag)'
    })
    .eq('id', lead.id)
    .select();

  if (updateError) {
    console.error("   Update failed with error:", updateError);
  } else if (!updatedLeads || updatedLeads.length === 0) {
    console.log("❌ RLS BLOCKED UPDATE: 0 rows updated! The new RLS policy has not been applied yet in the Supabase console.");
    console.log("   (This is expected BEFORE you execute the SQL script in your Supabase SQL Editor.)");
  } else {
    console.log("✅ RLS PERMITTED UPDATE: Lead successfully promoted to 'Ny forespørgsel'!");
    console.log("   Updated lead:", updatedLeads[0]);
  }

  console.log("\n3. Simulating malicious guest trying to tamper with finalized lead...");
  console.log("   Attempting to update status to 'Historik' or 'Bekræftet opgave'...");
  
  const { data: maliciousLeads, error: maliciousError } = await supabase
    .from('leads')
    .update({
      status: 'Bekræftet opgave'
    })
    .eq('id', lead.id)
    .select();

  if (maliciousError) {
    console.log("✅ SECURE: Supabase blocked the update with error:", maliciousError.message);
  } else if (!maliciousLeads || maliciousLeads.length === 0) {
    console.log("✅ SECURE: RLS blocked the update (0 rows updated). Guests cannot tamper with finalized states!");
  } else {
    console.log("❌ SECURITY VULNERABILITY: RLS allowed anonymous guest to set status to 'Bekræftet opgave'!");
    console.log("   Result:", maliciousLeads[0]);
  }
  
  console.log("\n=============================================");
}

runRLSVerification().catch(console.error);
