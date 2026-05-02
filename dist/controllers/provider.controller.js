"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderService = exports.getProviderServices = exports.getBookingRequests = exports.getDashboardStats = void 0;
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
        const { data: created, error: fetchError } = await supabase_1.supabaseAdmin
            .from('provider_services')
            .select(`
        *,
        provider_service_types (
          service_type:service_types (*)
        )
      `)
            .eq('id', service.id)
            .single();
        if (fetchError)
            throw fetchError;
        res.status(201).json({
            ...created,
            service_types: created.provider_service_types?.map((item) => item.service_type) || [],
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProviderService = createProviderService;
