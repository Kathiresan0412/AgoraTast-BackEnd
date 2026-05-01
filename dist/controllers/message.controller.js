"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const supabase_1 = require("../config/supabase");
const getConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Mock or complex query depending on DB schema
        // returning a simplified mock array structure that matches the requirements
        res.json([]);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        const { toUserId, text } = req.body;
        const fromUserId = req.user?.id;
        // A real implementation would ensure a conversation exists
        // and store the message. For now, pushing directly:
        const { data, error } = await supabase_1.supabaseAdmin
            .from('messages')
            .insert([{ from_user_id: fromUserId, to_user_id: toUserId, text, timestamp: new Date().toISOString(), read: false }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendMessage = sendMessage;
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
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAsRead = markAsRead;
