// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Access variables using import.meta.env for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  // This check will confirm if the variables are being read correctly
  console.error("Supabase variables not found! Check .env prefix and server restart.");
  // Throwing an error stops the app before trying to connect with undefined values
  throw new Error('Supabase environment variables not loaded!'); 
}

export const supabase = createClient(supabaseUrl, supabaseKey);