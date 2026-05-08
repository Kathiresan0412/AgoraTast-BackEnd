"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineBooking = exports.acceptBooking = exports.cancelBooking = exports.listMyBookings = exports.createBooking = void 0;
const supabase_1 = require("../config/supabase");
const mapBooking = (booking) => {
    const providerService = Array.isArray(booking.provider_services) ? booking.provider_services[0] : booking.provider_services;
    const provider = Array.isArray(booking.provider) ? booking.provider[0] : booking.provider;
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    return {
        id: booking.id,
        serviceId: booking.service_id,
        providerServiceId: booking.provider_service_id,
        customerId: booking.customer_id,
        providerId: booking.provider_id,
        customerName: booking.customer_name || customer?.name || 'Customer',
        providerName: provider?.name || 'Provider',
        serviceTitle: providerService?.title || 'Service',
        scheduledTime: booking.scheduled_time,
        status: booking.status,
        amount: booking.amount === null || booking.amount === undefined ? null : Number(booking.amount),
        createdAt: booking.created_at,
    };
};
const bookingSelect = `
  *,
  provider_services (
    title
  ),
  provider:users!bookings_provider_id_fkey (
    name
  ),
  customer:users!bookings_customer_id_fkey (
    name
  )
`;
const createBooking = async (req, res) => {
    try {
        const customerId = req.user?.id;
        const { providerServiceId, provider_service_id, scheduledTime, scheduled_time } = req.body;
        const targetServiceId = providerServiceId || provider_service_id;
        const targetScheduledTime = scheduledTime || scheduled_time;
        const { data: service, error: serviceError } = await supabase_1.supabaseAdmin
            .from('provider_services')
            .select(`
        id,
        provider_id,
        base_price
      `)
            .eq('id', targetServiceId)
            .eq('status', 'active')
            .single();
        if (serviceError || !service) {
            res.status(404).json({ error: 'Service not found or unavailable' });
            return;
        }
        const { data: serviceTypeLinks } = await supabase_1.supabaseAdmin
            .from('provider_service_types')
            .select('service_type_id')
            .eq('provider_service_id', service.id)
            .limit(1);
        if (service.provider_id === customerId) {
            res.status(400).json({ error: 'You cannot book your own service' });
            return;
        }
        const { data: customer } = await supabase_1.supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', customerId)
            .single();
        const serviceType = serviceTypeLinks?.[0]?.service_type_id || null;
        const { data: booking, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .insert([{
                service_id: serviceType,
                provider_service_id: service.id,
                customer_id: customerId,
                provider_id: service.provider_id,
                customer_name: customer?.name || req.body.customerName || req.body.customer_name || 'Customer',
                scheduled_time: targetScheduledTime,
                amount: service.base_price || 0,
                status: 'pending',
            }])
            .select(bookingSelect)
            .single();
        if (error)
            throw error;
        res.status(201).json(mapBooking(booking));
    }
    catch (err) {
        console.error('Create booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createBooking = createBooking;
const listMyBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const ownerColumn = role === 'provider' ? 'provider_id' : 'customer_id';
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(bookingSelect)
            .eq(ownerColumn, userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json((data || []).map(mapBooking));
    }
    catch (err) {
        console.error('List bookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listMyBookings = listMyBookings;
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const customerId = req.user?.id;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('customer_id', customerId)
            .in('status', ['pending', 'accepted'])
            .select(bookingSelect)
            .single();
        if (error)
            throw error;
        res.json(mapBooking(data));
    }
    catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelBooking = cancelBooking;
const acceptBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const providerId = req.user?.id;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({ status: 'accepted' })
            .eq('id', id)
            .eq('provider_id', providerId)
            .select(bookingSelect)
            .single();
        if (error)
            throw error;
        res.json(mapBooking(data));
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.acceptBooking = acceptBooking;
const declineBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const providerId = req.user?.id;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({ status: 'declined' })
            .eq('id', id)
            .eq('provider_id', providerId)
            .select(bookingSelect)
            .single();
        if (error)
            throw error;
        res.json(mapBooking(data));
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.declineBooking = declineBooking;
