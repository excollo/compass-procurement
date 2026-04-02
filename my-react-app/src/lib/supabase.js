import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://bspedeaxxmzfffrsngek.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcGVkZWF4eG16ZmZmcnNuZ2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjAzNTYsImV4cCI6MjA5MDY5NjM1Nn0.UcpnC-iiUipoaROXHmAPZNLjqh5a-4QoW_qNiuJcvfQ";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
