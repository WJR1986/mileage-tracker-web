// netlify/functions/public-config.js
exports.handler = async () => ({
  statusCode: 200,
  body: JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  })
});