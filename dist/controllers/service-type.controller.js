"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteServiceType = exports.toggleServiceTypeStatus = exports.updateServiceType = exports.createServiceType = exports.getServiceTypes = void 0;
const supabase_1 = require("../config/supabase");
const getServiceTypes = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        let query = supabase_1.supabaseAdmin.from('service_types').select('*').order('sort_order').order('name');
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
        const { parent_id, slug, name, description, icon, image_url, color, active, sort_order } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .insert([{ parent_id: parent_id || null, slug, name, description, icon, image_url: image_url || null, color, active, sort_order }])
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
        const { parent_id, slug, name, description, icon, image_url, color, sort_order } = req.body;
        const updates = {};
        if ('parent_id' in req.body)
            updates.parent_id = parent_id || null;
        if ('slug' in req.body)
            updates.slug = slug;
        if ('name' in req.body)
            updates.name = name;
        if ('description' in req.body)
            updates.description = description;
        if ('icon' in req.body)
            updates.icon = icon;
        if ('image_url' in req.body)
            updates.image_url = image_url || null;
        if ('color' in req.body)
            updates.color = color;
        if ('sort_order' in req.body)
            updates.sort_order = sort_order;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('service_types')
            .update(updates)
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
