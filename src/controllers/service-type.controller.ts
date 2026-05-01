import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getServiceTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let query = supabaseAdmin.from('service_types').select('*');
    if (!isAdmin) {
      query = query.eq('active', true);
    }
    
    const { data: serviceTypes, error } = await query;
    if (error) throw error;
    res.json(serviceTypes);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createServiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon, color, active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .insert([{ name, description, icon, color, active }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateServiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, icon, color } = req.body;
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .update({ name, description, icon, color })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleServiceTypeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteServiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('service_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
