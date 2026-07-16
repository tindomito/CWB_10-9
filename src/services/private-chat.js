/**
 * Servicios para manejar mensajes privados
 * Interactúa con la tabla private_messages de Supabase
 */
import { supabase } from './supabase.js';

/**
 * Obtiene los mensajes privados entre dos usuarios
 * @param {string} userId1 - ID del primer usuario
 * @param {string} userId2 - ID del segundo usuario
 * @param {number} limit - Límite de mensajes a obtener
 * @returns {Promise<{messages: Array, error: Object|null}>}
 */
export async function getPrivateMessages(userId1, userId2, limit = 100) {
    try {
        // Últimos `limit` mensajes: descendente + limit (así al superar el
        // límite quedan los más NUEVOS, no los más viejos) y se invierte
        // para mostrar en orden cronológico.
        const { data, error } = await supabase
            .from('private_messages_with_users')
            .select('*')
            .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching private messages:', error);
            return { messages: [], error };
        }

        return { messages: (data || []).reverse(), error: null };
    } catch (error) {
        console.error('Unexpected error fetching private messages:', error);
        return { messages: [], error: { message: 'Error al obtener mensajes' } };
    }
}

/**
 * Envía un mensaje privado
 * @param {string} senderId - ID del usuario que envía
 * @param {string} receiverId - ID del usuario que recibe
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<{message: Object|null, error: Object|null}>}
 */
export async function sendPrivateMessage(senderId, receiverId, content) {
    try {
        // Validación básica
        if (!content || !content.trim()) {
            return { 
                message: null, 
                error: { message: 'El mensaje no puede estar vacío' } 
            };
        }

        if (senderId === receiverId) {
            return { 
                message: null, 
                error: { message: 'No puedes enviarte mensajes a ti mismo' } 
            };
        }

        const { data, error } = await supabase
            .from('private_messages')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                content: content.trim()
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending private message:', error);
            return { message: null, error };
        }

        return { message: data, error: null };
    } catch (error) {
        console.error('Unexpected error sending message:', error);
        return { message: null, error: { message: 'Error al enviar mensaje' } };
    }
}

/**
 * Marca un mensaje como leído
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function markMessageAsRead(messageId) {
    try {
        const { error } = await supabase
            .from('private_messages')
            .update({ read: true })
            .eq('id', messageId);

        if (error) {
            console.error('Error marking message as read:', error);
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error('Unexpected error marking message as read:', error);
        return { success: false, error: { message: 'Error al marcar mensaje como leído' } };
    }
}

/**
 * Marca todos los mensajes de un usuario como leídos
 * @param {string} receiverId - ID del usuario receptor
 * @param {string} senderId - ID del usuario que envió los mensajes
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function markAllMessagesAsRead(receiverId, senderId) {
    try {
        const { error } = await supabase
            .from('private_messages')
            .update({ read: true })
            .eq('receiver_id', receiverId)
            .eq('sender_id', senderId)
            .eq('read', false);

        if (error) {
            console.error('Error marking messages as read:', error);
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error('Unexpected error marking messages as read:', error);
        return { success: false, error: { message: 'Error al marcar mensajes como leídos' } };
    }
}

/**
 * Obtiene el conteo de mensajes no leídos para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{count: number, error: Object|null}>}
 */
export async function getUnreadMessagesCount(userId) {
    try {
        const { count, error } = await supabase
            .from('private_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            return { count: 0, error };
        }

        return { count: count || 0, error: null };
    } catch (error) {
        console.error('Unexpected error getting unread count:', error);
        return { count: 0, error: { message: 'Error al obtener mensajes no leídos' } };
    }
}

/**
 * Obtiene la lista de conversaciones de un usuario (últimos mensajes con cada persona)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{conversations: Array, error: Object|null}>}
 */
export async function getConversations(userId) {
    try {
        // Esta es una query más compleja, obtenemos todos los mensajes del usuario
        const { data, error } = await supabase
            .from('private_messages_with_users')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return { conversations: [], error };
        }

        // Agrupar por conversación (con cada usuario único)
        const conversationsMap = new Map();
        
        data?.forEach(message => {
            // Determinar quién es el "otro usuario"
            const otherUserId = message.sender_id === userId 
                ? message.receiver_id 
                : message.sender_id;
            
            // Si no existe esta conversación, agregarla
            if (!conversationsMap.has(otherUserId)) {
                conversationsMap.set(otherUserId, {
                    otherUserId,
                    otherUserDisplayName: message.sender_id === userId 
                        ? message.receiver_display_name 
                        : message.sender_display_name,
                    otherUserAvatarUrl: message.sender_id === userId 
                        ? message.receiver_avatar_url 
                        : message.sender_avatar_url,
                    otherUserRango: message.sender_id === userId 
                        ? message.receiver_rango 
                        : message.sender_rango,
                    lastMessage: message.content,
                    lastMessageDate: message.created_at,
                    unreadCount: 0,
                    isLastMessageFromMe: message.sender_id === userId
                });
            }
            
            // Contar mensajes no leídos donde soy el receiver
            if (message.receiver_id === userId && !message.read) {
                conversationsMap.get(otherUserId).unreadCount++;
            }
        });

        // Convertir el Map a Array y ordenar por fecha
        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));

        return { conversations, error: null };
    } catch (error) {
        console.error('Unexpected error fetching conversations:', error);
        return { conversations: [], error: { message: 'Error al obtener conversaciones' } };
    }
}

/**
 * Elimina un mensaje
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deletePrivateMessage(messageId) {
    try {
        const { error } = await supabase
            .from('private_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Error deleting message:', error);
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error('Unexpected error deleting message:', error);
        return { success: false, error: { message: 'Error al eliminar mensaje' } };
    }
}

/**
 * Suscribe a nuevos mensajes privados en tiempo real
 * @param {string} userId1 - ID del primer usuario
 * @param {string} userId2 - ID del segundo usuario
 * @param {Function} onNewMessage - Callback cuando llega un mensaje nuevo
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeToPrivateMessages(userId1, userId2, onNewMessage) {
    const channel = supabase.channel(`private-chat-${userId1}-${userId2}`);

    channel
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${userId1},receiver_id=eq.${userId2}`
        }, async (payload) => {
            // Obtener el mensaje completo con datos de usuarios
            const { data } = await supabase
                .from('private_messages_with_users')
                .select('*')
                .eq('id', payload.new.id)
                .single();
            
            if (data && onNewMessage) {
                onNewMessage(data);
            }
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${userId2},receiver_id=eq.${userId1}`
        }, async (payload) => {
            // Obtener el mensaje completo con datos de usuarios
            const { data } = await supabase
                .from('private_messages_with_users')
                .select('*')
                .eq('id', payload.new.id)
                .single();
            
            if (data && onNewMessage) {
                onNewMessage(data);
            }
        })
        .subscribe();

    // Retornar función para cancelar suscripción
    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Suscribe a cambios en todos los mensajes privados del usuario
 * @param {string} userId - ID del usuario
 * @param {Function} onUpdate - Callback cuando hay cambios
 * @returns {Function} Función para cancelar la suscripción
 */
export function subscribeToAllPrivateMessages(userId, onUpdate) {
    const channel = supabase.channel(`user-private-messages-${userId}`);

    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'private_messages',
            filter: `receiver_id=eq.${userId}`
        }, (payload) => {
            if (onUpdate) {
                onUpdate(payload);
            }
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${userId}`
        }, (payload) => {
            if (onUpdate) {
                onUpdate(payload);
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}