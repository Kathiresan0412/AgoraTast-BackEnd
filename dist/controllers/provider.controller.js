"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProviderService = exports.updateProviderService = exports.createProviderService = exports.getProviderServices = exports.getBookingRequests = exports.getDashboardStats = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../config/logger");
const normalizeProviderServiceStatus = (status) => {
    if (status === 'draft' || status === 'paused') {
        return status;
    }
    return 'pending_review';
};
const logControllerError = (event, req, err) => {
    (0, logger_1.writeApiEvent)('error', event, {
        ...(0, logger_1.getRequestLogContext)(req),
        error: (0, logger_1.serializeError)(err),
    });
};
const isProviderServiceTypesUnavailable = (err) => {
    const error = err;
    return (error?.code === 'PGRST205' ||
        error?.code === 'PGRST200' ||
        Boolean(error?.message?.includes('provider_service_types')));
};
const logServiceTypeLinksUnavailable = (event, req, err) => {
    (0, logger_1.writeApiEvent)('warn', event, {
        ...(req ? (0, logger_1.getRequestLogContext)(req) : {}),
        error: (0, logger_1.serializeError)(err),
    });
};
const hydrateServiceTypes = async (services, req) => {
    const serviceIds = services.map(service => service.id).filter(Boolean);
    if (!serviceIds.length)
        return services;
    const { data: links, error: linksError } = await supabase_1.supabaseAdmin
        .from('provider_service_types')
        .select('provider_service_id, service_type_id')
        .in('provider_service_id', serviceIds);
    if (linksError) {
        if (isProviderServiceTypesUnavailable(linksError)) {
            logServiceTypeLinksUnavailable('provider_service_type_links_unavailable', req, linksError);
            return services.map((service) => ({
                ...service,
                service_types: [],
            }));
        }
        throw linksError;
    }
    const serviceTypeIds = Array.from(new Set((links || []).map((link) => link.service_type_id).filter(Boolean)));
    const { data: serviceTypes, error: serviceTypesError } = serviceTypeIds.length
        ? await supabase_1.supabaseAdmin
            .from('service_types')
            .select('*')
            .in('id', serviceTypeIds)
        : { data: [], error: null };
    if (serviceTypesError)
        throw serviceTypesError;
    const serviceTypesById = new Map((serviceTypes || []).map((serviceType) => [serviceType.id, serviceType]));
    const serviceTypesByServiceId = new Map();
    (links || []).forEach((link) => {
        const serviceType = serviceTypesById.get(link.service_type_id);
        if (!serviceType)
            return;
        const current = serviceTypesByServiceId.get(link.provider_service_id) || [];
        current.push(serviceType);
        serviceTypesByServiceId.set(link.provider_service_id, current);
    });
    return services.map((service) => ({
        ...service,
        service_types: serviceTypesByServiceId.get(service.id) || [],
    }));
};
const getDashboardStats = async (req, res) => {
    try {
        const providerId = req.user?.id;
        // Real implementation would look up provider specifics
        // Mock implementation returning mock stats
        res.json({
            monthlyEarnings: 1500.00,
            activeBookings: 5,
            overallRating: 4.8
        });
    }
    catch (err) {
        logControllerError('get_dashboard_stats_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getBookingRequests = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const { data: bookings, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select('id, service_id, customer_name, scheduled_time, status')
            .eq('provider_id', providerId)
            .eq('status', 'pending');
        if (error)
            throw error;
        const formatted = bookings.map((b) => ({
            id: b.id,
            serviceId: b.service_id,
            customerName: b.customer_name,
            scheduledTime: b.scheduled_time,
            status: b.status
        }));
        res.json(formatted);
    }
    catch (err) {
        logControllerError('get_booking_requests_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBookingRequests = getBookingRequests;
const getProviderServices = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const { data: services, error } = await supabase_1.supabaseAdmin
            .from('provider_services')
            .select('*')
            .eq('provider_id', providerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(await hydrateServiceTypes(services || [], req));
    }
    catch (err) {
        logControllerError('get_provider_services_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProviderServices = getProviderServices;
const fetchProviderService = async (serviceId, req) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('provider_services')
        .select('*')
        .eq('id', serviceId)
        .single();
    if (error)
        throw error;
    const [service] = await hydrateServiceTypes([data], req);
    return service;
};
const createProviderService = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const { title, description, base_price, price_type, duration_mins, service_area, images, status, service_type_ids, } = req.body;
        const uniqueTypeIds = [...new Set(service_type_ids)];
        const { data: service, error: serviceError } = await supabase_1.supabaseAdmin
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
        if (serviceError)
            throw serviceError;
        const typeRows = uniqueTypeIds.map(serviceTypeId => ({
            provider_service_id: service.id,
            service_type_id: serviceTypeId,
        }));
        const { error: typesError } = await supabase_1.supabaseAdmin
            .from('provider_service_types')
            .insert(typeRows);
        if (typesError) {
            if (isProviderServiceTypesUnavailable(typesError)) {
                logServiceTypeLinksUnavailable('provider_service_type_links_create_skipped', req, typesError);
                res.status(201).json({ ...service, service_types: [] });
                return;
            }
            await supabase_1.supabaseAdmin.from('provider_services').delete().eq('id', service.id);
            throw typesError;
        }
        res.status(201).json(await fetchProviderService(service.id, req));
    }
    catch (err) {
        logControllerError('create_provider_service_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProviderService = createProviderService;
const replaceProviderServiceTypes = async (serviceId, serviceTypeIds, req) => {
    const { error: deleteTypesError } = await supabase_1.supabaseAdmin
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
    const { error: typesError } = await supabase_1.supabaseAdmin
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
const updateProviderService = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const serviceId = String(req.params.serviceId);
        const { title, description, base_price, price_type, duration_mins, service_area, images, status, service_type_ids, } = req.body;
        const { data: existing, error: existingError } = await supabase_1.supabaseAdmin
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
        const { error: updateError } = await supabase_1.supabaseAdmin
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
        if (updateError)
            throw updateError;
        const uniqueTypeIds = [...new Set(service_type_ids)];
        await replaceProviderServiceTypes(serviceId, uniqueTypeIds, req);
        res.json(await fetchProviderService(serviceId, req));
    }
    catch (err) {
        logControllerError('update_provider_service_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProviderService = updateProviderService;
const deleteProviderService = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const serviceId = String(req.params.serviceId);
        const { data: existing, error: existingError } = await supabase_1.supabaseAdmin
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
        const { error } = await supabase_1.supabaseAdmin
            .from('provider_services')
            .delete()
            .eq('id', serviceId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (err) {
        logControllerError('delete_provider_service_failed', req, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProviderService = deleteProviderService;
