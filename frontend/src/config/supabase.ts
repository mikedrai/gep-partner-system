import { createClient } from '@supabase/supabase-js';

// Use proper frontend configuration with anonymous key
const supabaseUrl = 'https://jlbtczaqlbikswexcqnv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg2NDgsImV4cCI6MjA2ODc5NDY0OH0.9f0HvhjNaJu1oftxSt7UiDeF6L9y1Dyi4_K95U649hU';

// Helper function to decode JWT payload
function decodeJWTPayload(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

const payload = decodeJWTPayload(supabaseAnonKey);
console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 JWT Payload:', payload);
console.log('🔑 Role from JWT:', payload?.role);
console.log('🔑 Using anonymous key (proper for frontend):', payload?.role === 'anon');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  console.error('URL:', supabaseUrl);
  console.error('Anon Key exists:', !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

console.log('✅ Supabase client created with anonymous key (proper for frontend)');

export default supabase;