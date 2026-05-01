import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// We need the service role key to generate a magic link or token, but we only have anon key in .env.
// Let's check if we can find it.
console.log("Found keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
