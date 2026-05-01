"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineBooking = exports.acceptBooking = void 0;
const supabase_1 = require("../config/supabase");
const acceptBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const providerId = req.user?.id;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({ status: 'accepted' })
            .eq('id', id)
            .eq('provider_id', providerId)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
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
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.declineBooking = declineBooking;
