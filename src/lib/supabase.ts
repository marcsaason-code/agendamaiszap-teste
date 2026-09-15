import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zbsvasuetwalcjzlrpep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic3Zhc3VldHdhbGNqemxycGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDEwNzksImV4cCI6MjA4ODk3NzA3OX0.zBKYExs6LCnPQrcLsbdsSVWwZXjoa6uD7_b7ipv6DNU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
