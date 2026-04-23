import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysylipcnqmaeflglllrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeWxpcGNucW1hZWZsZ2xsbHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTYxNzQsImV4cCI6MjA5MjQ3MjE3NH0.UDFWrMpTUd12YNQscbSP8LxpVM5kHD2WWGB-Zz-DkV8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
