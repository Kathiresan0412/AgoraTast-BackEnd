import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    // Mock or complex query depending on DB schema
    // returning a simplified mock array structure that matches the requirements
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { toUserId, text } = req.body;
    const fromUserId = req.user?.id;

    // A real implementation would ensure a conversation exists
    // and store the message. For now, pushing directly:
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ from_user_id: fromUserId, to_user_id: toUserId, text, timestamp: new Date().toISOString(), read: false }])
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;
    
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('to_user_id', userId);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
