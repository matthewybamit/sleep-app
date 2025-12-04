import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rifunhbyabmgxwojrpgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZnVuaGJ5YWJtZ3h3b2pycGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Njc5NDUsImV4cCI6MjA4MDM0Mzk0NX0.MYjk5UjaRtCKxd0SA94jL16A-GCO5m5QZokz-91c_0c';

export const supabase = createClient(supabaseUrl, supabaseKey);
