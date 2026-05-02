import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getServiceTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let query = supabaseAdmin.from('service_types').select('*').order('sort_order').order('name');
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
    const { parent_id, slug, name, description, icon, color, active, sort_order } = req.body;
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .insert([{ parent_id: parent_id || null, slug, name, description, icon, color, active, sort_order }])
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
    const { parent_id, slug, name, description, icon, color, sort_order } = req.body;
    const updates: Record<string, unknown> = {};

    if ('parent_id' in req.body) updates.parent_id = parent_id || null;
    if ('slug' in req.body) updates.slug = slug;
    if ('name' in req.body) updates.name = name;
    if ('description' in req.body) updates.description = description;
    if ('icon' in req.body) updates.icon = icon;
    if ('color' in req.body) updates.color = color;
    if ('sort_order' in req.body) updates.sort_order = sort_order;

    const { data, error } = await supabaseAdmin
      .from('service_types')
      .update(updates)
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
