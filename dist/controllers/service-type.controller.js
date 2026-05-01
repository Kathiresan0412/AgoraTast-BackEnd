"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteServiceType = exports.toggleServiceTypeStatus = exports.updateServiceType = exports.createServiceType = exports.getServiceTypes = void 0;
const supabase_1 = require("../config/supabase");
const getServiceTypes = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'super_admin';
        let query = supabase_1.supabaseAdmin.from('service_types').select('*');
        if (!isAdmin) {
            query = query.eq('active', true);
        }
        const { data: serviceTypes, error } = await query;
        if (error)
            throw error;
        res.json(serviceTypes);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getServiceTypes = getServiceTypes;
const createServiceType = async (req, res) => {
    try {
        const { name, description, icon, color, active } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .insert([{ name, description, icon, color, active }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createServiceType = createServiceType;
const updateServiceType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, color } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .update({ name, description, icon, color })
            .eq('id', id)
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
exports.updateServiceType = updateServiceType;
const toggleServiceTypeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .update({ active })
            .eq('id', id)
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
exports.toggleServiceTypeStatus = toggleServiceTypeStatus;
const deleteServiceType = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({ success: true, message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteServiceType = deleteServiceType;
