import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const acceptBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const providerId = req.user?.id;
    
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'accepted' })
      .eq('id', id)
      .eq('provider_id', providerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const declineBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const providerId = req.user?.id;
    
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', id)
      .eq('provider_id', providerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
