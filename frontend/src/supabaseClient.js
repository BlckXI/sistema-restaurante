import { createClient } from '@supabase/supabase-js';

// Vite inyecta las variables que empiezan con VITE_ aquí:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);