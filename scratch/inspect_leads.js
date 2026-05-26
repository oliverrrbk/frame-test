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

async function inspectCarpenters() {
  console.log("Fetching carpenters from Supabase...");
  const { data, error } = await supabase
    .from('carpenters')
    .select('id, company_name, owner_name, email, slug, is_active, role');

  if (error) {
    console.error("Error fetching carpenters:", error);
    return;
  }

  console.log("\n=== CARPENTERS IN DATABASE ===");
  data.forEach((carp, index) => {
    console.log(`[${index + 1}] ID: ${carp.id}`);
    console.log(`    Company Name: ${carp.company_name}`);
    console.log(`    Owner Name: ${carp.owner_name}`);
    console.log(`    Email: ${carp.email}`);
    console.log(`    Slug: ${carp.slug}`);
    console.log(`    Role: ${carp.role}`);
    console.log(`    Active: ${carp.is_active}`);
    console.log("-----------------------------------------");
  });
}

inspectCarpenters().catch(console.error);
