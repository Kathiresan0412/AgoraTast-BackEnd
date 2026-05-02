import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const mapProvider = (provider: any) => {
  const user = Array.isArray(provider.users) ? provider.users[0] : provider.users;

  return {
    id: provider.id,
    userId: provider.user_id,
    businessName: provider.business_name,
    category: provider.category || '',
    location: provider.location || '',
    status: provider.status,
    createdAt: provider.created_at,
    ownerName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profileImage: user?.profile_image || '',
    isActive: user?.is_active ?? true,
  };
};

const ensureProviderProfiles = async () => {
  const { data: providerUsers, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('role', 'provider');

  if (usersError) throw usersError;
  if (!providerUsers?.length) return;

  const { data: existingProviders, error: providersError } = await supabaseAdmin
    .from('providers')
    .select('user_id')
    .in('user_id', providerUsers.map((user: any) => user.id));

  if (providersError) throw providersError;

  const existingUserIds = new Set((existingProviders || []).map((provider: any) => provider.user_id));
  const missingProviders = providerUsers
    .filter((user: any) => !existingUserIds.has(user.id))
    .map((user: any) => ({
      user_id: user.id,
      business_name: user.name,
      category: 'General',
      location: '',
      status: 'pending',
    }));

  if (missingProviders.length) {
    const { error } = await supabaseAdmin.from('providers').insert(missingProviders);
    if (error) throw error;
  }
};

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

export const getProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProviderProfiles();

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';

    let query = supabaseAdmin
      .from('providers')
      .select(`
        id,
        user_id,
        business_name,
        category,
        location,
        status,
        created_at,
        users (
          name,
          email,
          phone,
          profile_image,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (location && location !== 'all') {
      query = query.eq('location', location);
    }

    if (search) {
      const safeSearch = search.replace(/[,%]/g, ' ');
      query = query.or(
        `business_name.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`
      );
    }

    const { data: providers, error } = await query;

    if (error) throw error;

    res.json((providers || []).map(mapProvider));
  } catch (err) {
    console.error('Get providers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureProviderProfiles();

    const { data: providers, error } = await supabaseAdmin
      .from('providers')
      .select('id, user_id, business_name, category, location, status, created_at, users (name, email, phone, profile_image, is_active)')
      .eq('status', 'pending');

    if (error) throw error;

    res.json((providers || []).map(mapProvider));
  } catch (err) {
    console.error('Get pending providers error:', err);
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
