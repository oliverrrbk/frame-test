import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.auth.admin.getUserById(
    // We don't have the ID, let's search by email
    // Or list users and filter by email
    undefined
  );
  
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(listError);
    return;
  }
  
  const user = users.users.find(u => u.email === 'mads.bruns.christ@gmail.com');
  if (user) {
    console.log('User found:');
    console.log('Email confirmed at:', user.email_confirmed_at);
    console.log('Last sign in:', user.last_sign_in_at);
    console.log('Created at:', user.created_at);
  } else {
    console.log('User not found.');
  }
}

check();
