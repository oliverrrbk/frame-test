import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchLeads() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, created_at, customer_name')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error("Error fetching leads:", error)
    return
  }
  
  console.log(leads.map(l => l.customer_name))
}
fetchLeads()
