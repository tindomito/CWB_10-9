/**
 * Cliente único de Supabase para toda la app.
 * Todos los services importan esta instancia; nunca se crea otro cliente.
 *
 * La URL y la key salen de variables de entorno (archivo `.env`, ver README).
 * La key es la "publishable": es pública por diseño — viaja al navegador en
 * cualquier caso — y el acceso real a los datos lo controla RLS en cada tabla.
 * Aun así vive en `.env` como el resto de las credenciales, para no tener
 * configuración del entorno incrustada en el código.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Sin esto el error aparece recién al primer query, y es incomprensible.
    throw new Error(
        'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_KEY. ' +
        'Creá un archivo .env en la raíz del proyecto (ver README) y reiniciá el servidor de desarrollo.'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
