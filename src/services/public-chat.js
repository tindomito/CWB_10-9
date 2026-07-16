/**
 * Servicios para chats públicos por canal.
 * Tablas: chat_channels, global_chat_messages
 * Vista:  chat_messages_with_users
 */
import { supabase } from './supabase.js';

const ARG_TZ = 'America/Argentina/Buenos_Aires';

/**
 * Devuelve true si en este momento es sábado o domingo en Argentina.
 * Espejo client-side de la lógica del trigger SQL — solo para feedback de UI.
 */
export function isWeekendInArgentina(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ARG_TZ,
        weekday: 'short'
    });
    const day = formatter.format(date);
    return day === 'Sat' || day === 'Sun';
}

/**
 * Calcula si un canal está abierto (mismo cálculo que is_channel_open en SQL).
 */
export function computeChannelOpen(channel) {
    if (!channel) return false;
    if (channel.admin_override === 'open') return true;
    if (channel.admin_override === 'closed') return false;
    if (channel.weekend_only) return isWeekendInArgentina();
    return true;
}

/**
 * Lista todos los canales ordenados por sort_order.
 */
export async function getChannels() {
    try {
        const { data, error } = await supabase
            .from('chat_channels')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching channels:', error);
            return { channels: [], error };
        }

        return { channels: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error fetching channels:', error);
        return { channels: [], error: { message: 'Error al obtener canales' } };
    }
}

/**
 * Obtiene un canal por id.
 */
export async function getChannel(channelId) {
    try {
        const { data, error } = await supabase
            .from('chat_channels')
            .select('*')
            .eq('id', channelId)
            .single();

        if (error) return { channel: null, error };
        return { channel: data, error: null };
    } catch (error) {
        return { channel: null, error: { message: 'Error al obtener canal' } };
    }
}

/**
 * Cambia el override del admin para un canal.
 * @param {string} channelId
 * @param {'auto'|'open'|'closed'} override
 */
export async function setChannelOverride(channelId, override) {
    if (!['auto', 'open', 'closed'].includes(override)) {
        return { channel: null, error: { message: 'Override inválido' } };
    }
    try {
        const { data, error } = await supabase
            .from('chat_channels')
            .update({ admin_override: override })
            .eq('id', channelId)
            .select()
            .single();

        if (error) return { channel: null, error };
        return { channel: data, error: null };
    } catch (error) {
        return { channel: null, error: { message: 'Error al actualizar canal' } };
    }
}

/**
 * Últimos `limit` mensajes de un canal, en orden cronológico.
 * Se piden descendentes + limit (para quedarnos con los más NUEVOS aunque
 * el canal tenga miles) y se invierten antes de devolver. El fetch queda
 * acotado en vez de traer todo el historial de una.
 */
export async function getChannelMessages(channelId, limit = 100) {
    try {
        const { data, error } = await supabase
            .from('chat_messages_with_users')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return { messages: [], error };
        return { messages: (data || []).reverse(), error: null };
    } catch (error) {
        return { messages: [], error: { message: 'Error al obtener mensajes' } };
    }
}

/**
 * Mensaje único con datos de usuario.
 */
export async function getChannelMessageById(messageId) {
    try {
        const { data, error } = await supabase
            .from('chat_messages_with_users')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error) return { message: null, error };
        return { message: data, error: null };
    } catch (error) {
        return { message: null, error: { message: 'Error al obtener el mensaje' } };
    }
}

/**
 * Envía un mensaje a un canal. La validación de canal abierto + rate limit la
 * hace el trigger en Supabase; acá solo capturamos el error para mostrarlo.
 */
export async function sendChannelMessage(userId, channelId, content) {
    if (!content || !content.trim()) {
        return { message: null, error: { message: 'El mensaje no puede estar vacío' } };
    }
    if (!userId) {
        return { message: null, error: { message: 'Usuario no autenticado' } };
    }
    if (!channelId) {
        return { message: null, error: { message: 'Canal no especificado' } };
    }

    try {
        const { data, error } = await supabase
            .from('global_chat_messages')
            .insert({
                user_id: userId,
                channel_id: channelId,
                content: content.trim()
            })
            .select()
            .single();

        if (error) {
            return { message: null, error };
        }
        return { message: data, error: null };
    } catch (error) {
        return { message: null, error: { message: 'Error al enviar mensaje' } };
    }
}

/**
 * Suscripción realtime a inserts de un canal específico.
 * @param {string} channelId
 * @param {(message: object) => void} onNewMessage
 */
export function subscribeToChannel(channelId, onNewMessage) {
    const channel = supabase.channel(`chat_${channelId}`);

    channel
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'global_chat_messages',
                filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
                const { message } = await getChannelMessageById(payload.new.id);
                if (message && onNewMessage) onNewMessage(message);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Suscripción realtime a cambios en chat_channels (para reflejar el toggle del admin).
 * @param {(channel: object) => void} onUpdate
 */
export function subscribeToChannels(onUpdate) {
    const channel = supabase.channel('chat_channels_realtime');

    channel
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_channels'
            },
            (payload) => {
                if (payload.new && onUpdate) onUpdate(payload.new);
            }
        )
        .subscribe();

    return channel;
}

export function unsubscribeChannel(channel) {
    if (channel) channel.unsubscribe();
}
