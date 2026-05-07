import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { getRequestLogContext, serializeError, writeApiEvent } from '../config/logger';

const normalizeProviderServiceStatus = (status?: string) => {
  if (status === 'draft' || status === 'paused') {
    return status;
  }

  return 'pending_review';
};

const logControllerError = (event: string, req: Request, err: unknown) => {
  writeApiEvent('error', event, {
    ...getRequestLogContext(req),
    error: serializeError(err),
  });
};

const isProviderServiceTypesUnavailable = (err: unknown) => {
  const error = err as { code?: string; message?: string } | null;

  return (
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST200' ||
    Boolean(error?.message?.includes('provider_service_types'))
  );
};

const logServiceTypeLinksUnavailable = (event: string, req: Request | undefined, err: unknown) => {
  writeApiEvent('warn', event, {
    ...(req ? getRequestLogContext(req) : {}),
    error: serializeError(err),
  });
};

const hydrateServiceTypes = async (services: any[], req?: Request) => {
  const serviceIds = services.map(service => service.id).filter(Boolean);
  if (!serviceIds.length) return services;

  const { data: links, error: linksError } = await supabaseAdmin
    .from('provider_service_types')
    .select('provider_service_id, service_type_id')
    .in('provider_service_id', serviceIds);

  if (linksError) {
    if (isProviderServiceTypesUnavailable(linksError)) {
      logServiceTypeLinksUnavailable('provider_service_type_links_unavailable', req, linksError);
      return services.map((service: any) => ({
        ...service,
        service_types: [],
      }));
    }

    throw linksError;
  }

  const serviceTypeIds = Array.from(new Set((links || []).map((link: any) => link.service_type_id).filter(Boolean)));
  const { data: serviceTypes, error: serviceTypesError } = serviceTypeIds.length
    ? await supabaseAdmin
      .from('service_types')
      .select('*')
      .in('id', serviceTypeIds)
    : { data: [], error: null };

  if (serviceTypesError) throw serviceTypesError;

  const serviceTypesById = new Map((serviceTypes || []).map((serviceType: any) => [serviceType.id, serviceType]));
  const serviceTypesByServiceId = new Map<string, any[]>();

  (links || []).forEach((link: any) => {
    const serviceType = serviceTypesById.get(link.service_type_id);
    if (!serviceType) return;

    const current = serviceTypesByServiceId.get(link.provider_service_id) || [];
    current.push(serviceType);
    serviceTypesByServiceId.set(link.provider_service_id, current);
  });

  return services.map((service: any) => ({
    ...service,
    service_types: serviceTypesByServiceId.get(service.id) || [],
  }));
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
    logControllerError('get_dashboard_stats_failed', req, err);
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
    logControllerError('get_booking_requests_failed', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const { data: services, error } = await supabaseAdmin
      .from('provider_services')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(await hydrateServiceTypes(services || [], req));
  } catch (err) {
    logControllerError('get_provider_services_failed', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const fetchProviderService = async (serviceId: string, req?: Request) => {
  const { data, error } = await supabaseAdmin
    .from('provider_services')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (error) throw error;

  const [service] = await hydrateServiceTypes([data], req);
  return service;
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
      if (isProviderServiceTypesUnavailable(typesError)) {
        logServiceTypeLinksUnavailable('provider_service_type_links_create_skipped', req, typesError);
        res.status(201).json({ ...service, service_types: [] });
        return;
      }

      await supabaseAdmin.from('provider_services').delete().eq('id', service.id);
      throw typesError;
    }

    res.status(201).json(await fetchProviderService(service.id, req));
  } catch (err) {
    logControllerError('create_provider_service_failed', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const replaceProviderServiceTypes = async (serviceId: string, serviceTypeIds: string[], req: Request) => {
  const { error: deleteTypesError } = await supabaseAdmin
    .from('provider_service_types')
    .delete()
    .eq('provider_service_id', serviceId);

  if (deleteTypesError) {
    if (isProviderServiceTypesUnavailable(deleteTypesError)) {
      logServiceTypeLinksUnavailable('provider_service_type_links_update_skipped', req, deleteTypesError);
      return;
    }

    throw deleteTypesError;
  }

  const typeRows = serviceTypeIds.map(serviceTypeId => ({
    provider_service_id: serviceId,
    service_type_id: serviceTypeId,
  }));

  const { error: typesError } = await supabaseAdmin
    .from('provider_service_types')
    .insert(typeRows);

  if (typesError) {
    if (isProviderServiceTypesUnavailable(typesError)) {
      logServiceTypeLinksUnavailable('provider_service_type_links_update_skipped', req, typesError);
      return;
    }

    throw typesError;
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
    await replaceProviderServiceTypes(serviceId, uniqueTypeIds, req);

    res.json(await fetchProviderService(serviceId, req));
  } catch (err) {
    logControllerError('update_provider_service_failed', req, err);
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
    logControllerError('delete_provider_service_failed', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
