"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProviderService = exports.updateProviderService = exports.createProviderService = exports.getProviderServices = exports.getBookingRequests = exports.getDashboardStats = void 0;
const supabase_1 = require("../config/supabase");
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
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBookingRequests = getBookingRequests;
const getProviderServices = async (req, res) => {
    try {
        const providerId = req.user?.id;
        const { data: services, error } = await supabase_1.supabaseAdmin
            .from('provider_services')
            .select(`
        *,
        provider_service_types (
          service_type:service_types (*)
        )
      `)
            .eq('provider_id', providerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        const formatted = (services || []).map((service) => ({
            ...service,
            service_types: service.provider_service_types?.map((item) => item.service_type) || [],
        }));
        res.json(formatted);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProviderServices = getProviderServices;
const fetchProviderService = async (serviceId) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('provider_services')
        .select(`
      *,
      provider_service_types (
        service_type:service_types (*)
      )
    `)
        .eq('id', serviceId)
        .single();
    if (error)
        throw error;
    return {
        ...data,
        service_types: data.provider_service_types?.map((item) => item.service_type) || [],
    };
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
                status,
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
            await supabase_1.supabaseAdmin.from('provider_services').delete().eq('id', service.id);
            throw typesError;
        }
        res.status(201).json(await fetchProviderService(service.id));
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProviderService = createProviderService;
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
            status,
        })
            .eq('id', serviceId);
        if (updateError)
            throw updateError;
        const uniqueTypeIds = [...new Set(service_type_ids)];
        const { error: deleteTypesError } = await supabase_1.supabaseAdmin
            .from('provider_service_types')
            .delete()
            .eq('provider_service_id', serviceId);
        if (deleteTypesError)
            throw deleteTypesError;
        const typeRows = uniqueTypeIds.map(serviceTypeId => ({
            provider_service_id: serviceId,
            service_type_id: serviceTypeId,
        }));
        const { error: typesError } = await supabase_1.supabaseAdmin
            .from('provider_service_types')
            .insert(typeRows);
        if (typesError)
            throw typesError;
        res.json(await fetchProviderService(serviceId));
    }
    catch (err) {
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
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProviderService = deleteProviderService;
