"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.updateProfile = void 0;
const supabase_1 = require("../config/supabase");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, profileImage } = req.body;
        const updates = {};
        if (name)
            updates.name = name;
        if (profileImage)
            updates.profile_image = profileImage;
        const { data: user, error } = await supabase_1.supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('id, name, email, role, profile_image')
            .single();
        if (error) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profile_image
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
const updatePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        const { data: user, error: fetchError } = await supabase_1.supabaseAdmin
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();
        if (fetchError || !user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password_hash || '');
        if (!isMatch) {
            res.status(401).json({ error: 'Incorrect current password' });
            return;
        }
        const newHash = await bcryptjs_1.default.hash(newPassword, 10);
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', userId);
        if (updateError) {
            res.status(400).json({ error: updateError.message });
            return;
        }
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updatePassword = updatePassword;
