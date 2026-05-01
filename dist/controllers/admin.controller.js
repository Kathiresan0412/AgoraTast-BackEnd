"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectProvider = exports.approveProvider = exports.getPendingProviders = exports.getDashboardStats = void 0;
const supabase_1 = require("../config/supabase");
const getDashboardStats = async (req, res) => {
    try {
        const { count: totalUsers } = await supabase_1.supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
        const { count: activeProviders } = await supabase_1.supabaseAdmin.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: totalBookings } = await supabase_1.supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true });
        // Simplistic platform revenue calculation for mock purposes
        const { data: bookings } = await supabase_1.supabaseAdmin.from('bookings').select('amount').eq('status', 'completed');
        const platformRevenue = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
        res.json({
            totalUsers: totalUsers || 0,
            activeProviders: activeProviders || 0,
            totalBookings: totalBookings || 0,
            platformRevenue
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getPendingProviders = async (req, res) => {
    try {
        const { data: providers, error } = await supabase_1.supabaseAdmin
            .from('providers')
            .select('id, business_name, category, location, status')
            .eq('status', 'pending');
        if (error)
            throw error;
        const formatted = providers.map((p) => ({
            id: p.id,
            businessName: p.business_name,
            category: p.category,
            location: p.location,
            status: p.status
        }));
        res.json(formatted);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPendingProviders = getPendingProviders;
const approveProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin
            .from('providers')
            .update({ status: 'active' })
            .eq('id', id);
        if (error)
            throw error;
        res.json({ success: true, message: 'Provider approved' });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveProvider = approveProvider;
const rejectProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin
            .from('providers')
            .update({ status: 'rejected' })
            .eq('id', id);
        if (error)
            throw error;
        res.json({ success: true, message: 'Provider rejected' });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectProvider = rejectProvider;
