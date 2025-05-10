// js/auth.js

export let supabase = null;

export async function initSupabase() {
  const res = await fetch('/.netlify/functions/public-config');
  const config = await res.json();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Missing Supabase config from server.');
  }

  supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getAuthHeader() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  return error;
}
