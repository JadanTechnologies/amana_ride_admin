import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient<Database> | null = null;

// Defensive client initialization
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// Export with null check for better error handling
export { supabase };

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = (): boolean => {
  return supabase !== null && !!supabaseUrl && !!supabaseAnonKey;
};