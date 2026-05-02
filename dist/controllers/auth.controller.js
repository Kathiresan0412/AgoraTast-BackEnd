"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("../types");
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Only allow customer/provider self-registration
        const allowedRoles = ['customer', 'provider'];
        const userRole = allowedRoles.includes(role) ? role : 'customer';
        // Check if user already exists
        const { data: existingUser } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (existingUser) {
            res.status(409).json({ error: 'An account with this email already exists' });
            return;
        }
        // Hash the password
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const { data: newUser, error } = await supabase_1.supabaseAdmin
            .from('users')
            .insert({
            name,
            email,
            password_hash: passwordHash,
            role: userRole,
            profile_image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        })
            .select('id, name, email, role, profile_image')
            .single();
        if (error) {
            console.error('Register error:', error);
            res.status(400).json({ error: error.message });
            return;
        }
        if (newUser.role === 'provider') {
            const { error: providerError } = await supabase_1.supabaseAdmin
                .from('providers')
                .insert({
                user_id: newUser.id,
                business_name: name,
                category: 'General',
                location: '',
                status: 'pending',
            });
            if (providerError) {
                console.error('Provider profile create error:', providerError);
                res.status(400).json({ error: providerError.message });
                return;
            }
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                profileImage: newUser.profile_image,
            },
        });
    }
    catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
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
                profileImage: user.profile_image,
            },
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
            profileImage: user.profile_image,
        });
    }
    catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
