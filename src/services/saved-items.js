/**
 * Guardados / favoritos (publicaciones y rankings). Tabla: saved_items.
 * Items privados del usuario.
 */
import { supabase } from './supabase.js';

const VALID_TYPES = ['publication', 'ranking'];

function checkType(t) {
    if (!VALID_TYPES.includes(t)) throw new Error(`item_type inválido: ${t}`);
}

/** ¿El usuario actual guardó este item? */
export async function isSaved(itemType, itemId, userId) {
    if (!userId) return { saved: false, error: null };
    checkType(itemType);
    const { data, error } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .maybeSingle();
    if (error) return { saved: false, error };
    return { saved: !!data, error: null };
}

/** Toggle guardar/quitar. Devuelve el nuevo estado. */
export async function toggleSave(itemType, itemId, userId, currentlySaved) {
    if (!userId) return { saved: currentlySaved, error: { message: 'No autenticado' } };
    checkType(itemType);
    if (currentlySaved) {
        const { error } = await supabase
            .from('saved_items')
            .delete()
            .eq('user_id', userId)
            .eq('item_type', itemType)
            .eq('item_id', itemId);
        if (error) return { saved: true, error };
        return { saved: false, error: null };
    } else {
        const { error } = await supabase
            .from('saved_items')
            .insert({ user_id: userId, item_type: itemType, item_id: itemId });
        // 23505 = ya existía → tratamos como guardado
        if (error && error.code !== '23505') return { saved: false, error };
        return { saved: true, error: null };
    }
}

/** Set de IDs guardados de un tipo (para listas). */
export async function getMySavedSet(itemType, ids, userId) {
    if (!userId || !ids?.length) return { savedSet: new Set(), error: null };
    checkType(itemType);
    const { data, error } = await supabase
        .from('saved_items')
        .select('item_id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .in('item_id', ids);
    if (error) return { savedSet: new Set(), error };
    return { savedSet: new Set((data || []).map(r => r.item_id)), error: null };
}

/**
 * Lista los guardados del usuario con su data joineada, ordenados por fecha.
 * Devuelve { items: [{ type, saved_at, data }] } — data es la publicación o ranking.
 */
export async function getMySavedItems() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { items: [], error: null };

        const { data: saved, error } = await supabase
            .from('saved_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) return { items: [], error };
        if (!saved || saved.length === 0) return { items: [], error: null };

        const pubIds = saved.filter(s => s.item_type === 'publication').map(s => s.item_id);
        const rankIds = saved.filter(s => s.item_type === 'ranking').map(s => s.item_id);

        const [pubRes, rankRes] = await Promise.all([
            pubIds.length
                ? supabase.from('publications_with_users').select('*').in('id', pubIds)
                : Promise.resolve({ data: [] }),
            rankIds.length
                ? supabase.from('fighter_rankings_with_users').select('*').in('id', rankIds)
                : Promise.resolve({ data: [] })
        ]);

        const pubMap = new Map((pubRes.data || []).map(p => [p.id, p]));
        const rankMap = new Map((rankRes.data || []).map(r => [r.id, r]));

        // Mantener orden de guardado, descartando items borrados (orphans)
        const items = [];
        for (const s of saved) {
            const data = s.item_type === 'publication' ? pubMap.get(s.item_id) : rankMap.get(s.item_id);
            if (data) items.push({ type: s.item_type, saved_at: s.created_at, data });
        }
        return { items, error: null };
    } catch (e) {
        return { items: [], error: { message: e.message || 'Error al cargar guardados' } };
    }
}
