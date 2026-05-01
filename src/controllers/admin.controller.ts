import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: activeProviders } = await supabaseAdmin.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: totalBookings } = await supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true });
    
    // Simplistic platform revenue calculation for mock purposes
    const { data: bookings } = await supabaseAdmin.from('bookings').select('amount').eq('status', 'completed');
    const platformRevenue = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

    res.json({
      totalUsers: totalUsers || 0,
      activeProviders: activeProviders || 0,
      totalBookings: totalBookings || 0,
      platformRevenue
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: providers, error } = await supabaseAdmin
      .from('providers')
      .select('id, business_name, category, location, status')
      .eq('status', 'pending');

    if (error) throw error;

    const formatted = providers.map((p: any) => ({
      id: p.id,
      businessName: p.business_name,
      category: p.category,
      location: p.location,
      status: p.status
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('providers')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Provider approved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('providers')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Provider rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
