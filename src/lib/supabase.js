import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xabkfvxmzbrscorgefvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmtmdnhtemJyc2NvcmdlZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzg3ODcsImV4cCI6MjA5MTgxNDc4N30.WeBvBlsC_FC1RgSCSPh73jrTWiVu3WgaSq2CaLCznFE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
