"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: user, error } = await supabase_1.supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error || !user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash || '');
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, email: user.email }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profile_image
            }
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data: user, error } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, name, email, role, profile_image')
            .eq('id', userId)
            .single();
        if (error || !user) {
            res.status(404).json({ error: 'User not found' });
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
        console.error('Get me error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
