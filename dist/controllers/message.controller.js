"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.deleteMessage = exports.updateMessage = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../config/supabase");
const getConversationId = (userA, userB) => {
    const hash = crypto_1.default
        .createHash('sha256')
        .update([userA, userB].sort().join(':'))
        .digest('hex')
        .slice(0, 32);
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
};
const getUsersByIds = async (ids) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length)
        return new Map();
    const { data, error } = await supabase_1.supabaseAdmin
        .from('users')
        .select('id, name, email, role, profile_image')
        .in('id', uniqueIds);
    if (error)
        throw error;
    return new Map((data || []).map((user) => [user.id, user]));
};
const ensureConversationIds = async (messages) => {
    const updates = messages
        .filter(message => !message.conversation_id && message.from_user_id && message.to_user_id)
        .map(message => ({
        id: message.id,
        conversationId: getConversationId(message.from_user_id, message.to_user_id),
    }));
    await Promise.all(updates.map(update => supabase_1.supabaseAdmin
        .from('messages')
        .update({ conversation_id: update.conversationId })
        .eq('id', update.id)));
    updates.forEach(update => {
        const message = messages.find(item => item.id === update.id);
        if (message)
            message.conversation_id = update.conversationId;
    });
};
const mapMessage = (message, usersById) => {
    const fromUser = usersById.get(message.from_user_id);
    const toUser = usersById.get(message.to_user_id);
    return {
        id: message.id,
        conversationId: message.conversation_id,
        fromUserId: message.from_user_id,
        toUserId: message.to_user_id,
        from: fromUser?.email || '',
        fromName: fromUser?.name || 'Unknown',
        to: toUser?.email || '',
        toName: toUser?.name || 'Unknown',
        text: message.text,
        timestamp: message.timestamp,
        read: message.read,
    };
};
const getConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data: messages, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .select('*')
            .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
            .order('timestamp', { ascending: true });
        if (error)
            throw error;
        const rows = messages || [];
        await ensureConversationIds(rows);
        const usersById = await getUsersByIds(rows.flatMap((message) => [message.from_user_id, message.to_user_id]));
        const conversations = new Map();
        rows.forEach((message) => {
            const conversationId = message.conversation_id || getConversationId(message.from_user_id, message.to_user_id);
            const mappedMessage = mapMessage({ ...message, conversation_id: conversationId }, usersById);
            const participantIds = [message.from_user_id, message.to_user_id].sort();
            if (!conversations.has(conversationId)) {
                conversations.set(conversationId, {
                    id: conversationId,
                    participantIds,
                    participants: participantIds.map(id => usersById.get(id)?.email || ''),
                    participantNames: participantIds.map(id => usersById.get(id)?.name || 'Unknown'),
                    messages: [],
                });
            }
            conversations.get(conversationId).messages.push(mappedMessage);
        });
        res.json(Array.from(conversations.values()).sort((a, b) => {
            const aLast = a.messages[a.messages.length - 1]?.timestamp || '';
            const bLast = b.messages[b.messages.length - 1]?.timestamp || '';
            return bLast.localeCompare(aLast);
        }));
    }
    catch (err) {
        console.error('Get conversations error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;
        const { data: messages, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });
        if (error)
            throw error;
        const rows = messages || [];
        if (rows.length && !rows.some((message) => message.from_user_id === userId || message.to_user_id === userId)) {
            res.status(403).json({ error: 'Forbidden: You are not part of this conversation' });
            return;
        }
        const usersById = await getUsersByIds(rows.flatMap((message) => [message.from_user_id, message.to_user_id]));
        res.json(rows.map((message) => mapMessage(message, usersById)));
    }
    catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        const { toUserId, toEmail, text } = req.body;
        const fromUserId = req.user?.id;
        let resolvedToUserId = toUserId;
        if (!resolvedToUserId && toEmail) {
            const { data: recipient, error } = await supabase_1.supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', toEmail)
                .single();
            if (error || !recipient) {
                res.status(404).json({ error: 'Recipient user not found' });
                return;
            }
            resolvedToUserId = recipient.id;
        }
        if (!fromUserId || !resolvedToUserId) {
            res.status(400).json({ error: 'Target user is required' });
            return;
        }
        const conversationId = getConversationId(fromUserId, resolvedToUserId);
        const { data: message, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                from_user_id: fromUserId,
                to_user_id: resolvedToUserId,
                text,
                timestamp: new Date().toISOString(),
                read: false,
            }])
            .select()
            .single();
        if (error)
            throw error;
        const usersById = await getUsersByIds([fromUserId, resolvedToUserId]);
        res.status(201).json(mapMessage(message, usersById));
    }
    catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendMessage = sendMessage;
const updateMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const userId = req.user?.id;
        const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single();
        if (fetchError || !existing) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        if (existing.from_user_id !== userId) {
            res.status(403).json({ error: 'Forbidden: You can only edit your own messages' });
            return;
        }
        const { data: message, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .update({ text })
            .eq('id', messageId)
            .select()
            .single();
        if (error)
            throw error;
        const usersById = await getUsersByIds([message.from_user_id, message.to_user_id]);
        res.json(mapMessage(message, usersById));
    }
    catch (err) {
        console.error('Update message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateMessage = updateMessage;
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id;
        const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
            .from('messages')
            .select('id, from_user_id')
            .eq('id', messageId)
            .single();
        if (fetchError || !existing) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        if (existing.from_user_id !== userId) {
            res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
            return;
        }
        const { error } = await supabase_1.supabaseAdmin
            .from('messages')
            .delete()
            .eq('id', messageId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteMessage = deleteMessage;
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;
        const { error } = await supabase_1.supabaseAdmin
            .from('messages')
            .update({ read: true })
            .eq('conversation_id', conversationId)
            .eq('to_user_id', userId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (err) {
        console.error('Mark messages read error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAsRead = markAsRead;
