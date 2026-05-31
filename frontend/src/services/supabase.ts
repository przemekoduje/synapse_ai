import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { appStorage } from './storage';

const supabaseUrl = 'https://tbvdxevawuwnsirfiyrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmR4ZXZhd3V3bnNpcmZpeXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTQ1MzksImV4cCI6MjA5NTQzMDUzOX0.X_mpcyWqTdxjkAgeJtwEYdfwzPPSXB6xy2UUMzt5NEw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: appStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
