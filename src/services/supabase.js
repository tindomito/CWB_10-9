/**
 * Cliente único de Supabase para toda la app.
 * Todos los services importan esta instancia; nunca se crea otro cliente.
 *
 * La key es la "publishable" (pública por diseño: el acceso real a los datos
 * lo controla RLS en cada tabla). Igualmente, TODO: mover URL y key a .env
 * como el resto de las credenciales del proyecto.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xlyfdgnpjpnrydqlnjzr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dia_1rJMZWGMKRAlzq068w_UVVeeG8m';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);