/**
 * Configuration Supabase
 */

const SUPABASE_URL = 'https://pymgjoagwpgptmennvfh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bWdqb2Fnd3BncHRtZW5udmZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDY4MjEsImV4cCI6MjA5NDU4MjgyMX0.p-At-fZeG9goEzoK6ToV7AShYz4HF_gRdRWLCZLnT3Y';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase initialized');
