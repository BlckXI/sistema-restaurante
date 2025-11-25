import { createClient } from '@supabase/supabase-js';

// Reemplaza esto con tus llaves REALES de Supabase (las mismas que usaste en el backend)
// O mejor aún, usa variables de entorno (VITE_SUPABASE_URL)
const supabaseUrl = 'https://chmjtgghfuomncaclqew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobWp0Z2doZnVvbW5jYWNscWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDY0NjMsImV4cCI6MjA3OTUyMjQ2M30.YGQ9TPtko3wn1GuyyP_QvGaYXISaJJrmIA7KIaQp1b0';

export const supabase = createClient(supabaseUrl, supabaseKey);