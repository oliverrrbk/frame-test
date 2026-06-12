export default function handler(req, res) {
  res.status(200).json({ 
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0
  });
}
