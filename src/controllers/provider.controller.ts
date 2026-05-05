import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const normalizeProviderServiceStatus = (status?: string) => {
  if (status === 'draft' || status === 'paused') {
    return status;
  }

  return 'pending_review';
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    // Real implementation would look up provider specifics
    // Mock implementation returning mock stats
    res.json({
      monthlyEarnings: 1500.00,
      activeBookings: 5,
      overallRating: 4.8
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, service_id, customer_name, scheduled_time, status')
      .eq('provider_id', providerId)
      .eq('status', 'pending');

    if (error) throw error;

    const formatted = bookings.map((b: any) => ({
      id: b.id,
      serviceId: b.service_id,
      customerName: b.customer_name,
      scheduledTime: b.scheduled_time,
      status: b.status
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const { data: services, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        *,
        provider_service_types (
          service_type:service_types (*)
        )
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (services || []).map((service: any) => ({
      ...service,
      service_types: service.provider_service_types?.map((item: any) => item.service_type) || [],
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const fetchProviderService = async (serviceId: string) => {
  const { data, error } = await supabaseAdmin
    .from('provider_services')
    .select(`
      *,
      provider_service_types (
        service_type:service_types (*)
      )
    `)
    .eq('id', serviceId)
    .single();

  if (error) throw error;

  return {
    ...data,
    service_types: data.provider_service_types?.map((item: any) => item.service_type) || [],
  };
};

export const createProviderService = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const {
      title,
      description,
      base_price,
      price_type,
      duration_mins,
      service_area,
      images,
      status,
      service_type_ids,
    } = req.body;

    const uniqueTypeIds = [...new Set(service_type_ids as string[])];

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('provider_services')
      .insert([{
        provider_id: providerId,
        title,
        description,
        base_price,
        price_type,
        duration_mins,
        service_area,
        images,
        status: normalizeProviderServiceStatus(status),
      }])
      .select()
      .single();

    if (serviceError) throw serviceError;

    const typeRows = uniqueTypeIds.map(serviceTypeId => ({
      provider_service_id: service.id,
      service_type_id: serviceTypeId,
    }));

    const { error: typesError } = await supabaseAdmin
      .from('provider_service_types')
      .insert(typeRows);

    if (typesError) {
      await supabaseAdmin.from('provider_services').delete().eq('id', service.id);
      throw typesError;
    }

    res.status(201).json(await fetchProviderService(service.id));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProviderService = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const serviceId = String(req.params.serviceId);
    const {
      title,
      description,
      base_price,
      price_type,
      duration_mins,
      service_area,
      images,
      status,
      service_type_ids,
    } = req.body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_id')
      .eq('id', serviceId)
      .single();

    if (existingError || !existing) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (existing.provider_id !== providerId) {
      res.status(403).json({ error: 'Forbidden: You can only update your own services' });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('provider_services')
      .update({
        title,
        description,
        base_price,
        price_type,
        duration_mins,
        service_area,
        images,
        status: normalizeProviderServiceStatus(status),
      })
      .eq('id', serviceId);

    if (updateError) throw updateError;

    const uniqueTypeIds = [...new Set(service_type_ids as string[])];

    const { error: deleteTypesError } = await supabaseAdmin
      .from('provider_service_types')
      .delete()
      .eq('provider_service_id', serviceId);

    if (deleteTypesError) throw deleteTypesError;

    const typeRows = uniqueTypeIds.map(serviceTypeId => ({
      provider_service_id: serviceId,
      service_type_id: serviceTypeId,
    }));

    const { error: typesError } = await supabaseAdmin
      .from('provider_service_types')
      .insert(typeRows);

    if (typesError) throw typesError;

    res.json(await fetchProviderService(serviceId));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProviderService = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const serviceId = String(req.params.serviceId);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_id')
      .eq('id', serviceId)
      .single();

    if (existingError || !existing) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (existing.provider_id !== providerId) {
      res.status(403).json({ error: 'Forbidden: You can only delete your own services' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('provider_services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
