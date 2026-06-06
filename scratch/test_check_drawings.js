import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Oh wait, VITE_SUPABASE_ANON_KEY is usually all we have. If we have service_role_key in .env we can use it to bypass RLS.
// Let's check .env
