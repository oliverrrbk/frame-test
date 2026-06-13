import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// If the user didn't put SUPABASE_SERVICE_ROLE_KEY in .env, we can't query db metadata.
// Let's just try anyway. Wait, we can only query tables via REST API, not triggers.
