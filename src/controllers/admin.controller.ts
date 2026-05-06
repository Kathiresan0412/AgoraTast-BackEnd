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

const mapService = (service: any) => {
  const provider = Array.isArray(service.users) ? service.users[0] : service.users;

  return {
    id: service.id,
    providerId: service.provider_id,
    title: service.title,
    description: service.description,
    basePrice: service.base_price,
    priceType: service.price_type,
    durationMins: service.duration_mins,
    serviceArea: service.service_area || [],
    images: service.images || [],
    status: service.status,
    createdAt: service.created_at,
    updatedAt: service.updated_at,
    provider: {
      name: provider?.name || 'Provider',
      email: provider?.email || '',
      profileImage: provider?.profile_image || '',
    },
    serviceTypes: service.provider_service_types?.map((item: any) => item.service_type).filter(Boolean) || [],
  };
};

const mapAdminReview = (review: any) => {
  const customer = Array.isArray(review.customer) ? review.customer[0] : review.customer;
  const provider = Array.isArray(review.provider) ? review.provider[0] : review.provider;
  const service = Array.isArray(review.provider_services) ? review.provider_services[0] : review.provider_services;

  return {
    id: review.id,
    bookingId: review.booking_id,
    providerServiceId: review.provider_service_id,
    providerId: review.provider_id,
    customerId: review.customer_id,
    customerName: customer?.name || review.guest_name || 'Guest customer',
    customerEmail: customer?.email || review.guest_email || '',
    providerName: provider?.name || 'Provider',
    providerEmail: provider?.email || '',
    serviceTitle: service?.title || '',
    rating: review.rating,
    comment: review.comment || '',
    status: review.status,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
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

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: services, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        *,
        users!provider_services_provider_id_fkey (
          name,
          email,
          profile_image
        ),
        provider_service_types (
          service_type:service_types (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((services || []).map(mapService));
  } catch (err) {
    console.error('Get admin services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    let query = supabaseAdmin
      .from('reviews')
      .select(`
        *,
        customer:users!reviews_customer_id_fkey (
          name,
          email
        ),
        provider:users!reviews_provider_id_fkey (
          name,
          email
        ),
        provider_services (
          title
        )
      `)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: reviews, error } = await query;
    if (error) throw error;

    res.json((reviews || []).map(mapAdminReview));
  } catch (err) {
    console.error('Get admin reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReviewStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'visible', 'hidden', 'deleted'].includes(status)) {
      res.status(400).json({ error: 'Invalid review status' });
      return;
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        customer:users!reviews_customer_id_fkey (
          name,
          email
        ),
        provider:users!reviews_provider_id_fkey (
          name,
          email
        ),
        provider_services (
          title
        )
      `)
      .single();

    if (error) throw error;

    res.json(mapAdminReview(review));
  } catch (err) {
    console.error('Update review status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('provider_services')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Service approved' });
  } catch (err) {
    console.error('Approve service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('provider_services')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Service rejected' });
  } catch (err) {
    console.error('Reject service error:', err);
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
