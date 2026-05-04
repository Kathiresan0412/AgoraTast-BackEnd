"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.googleLogin = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("../types");
const allowedSelfRegistrationRoles = ['customer', 'provider'];
const getSelfRegistrationRole = (role) => typeof role === 'string' && allowedSelfRegistrationRoles.includes(role) ? role : 'customer';
const createJwt = (user) => jsonwebtoken_1.default.sign({ id: user.id, role: user.role, email: user.email }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
const createProviderProfile = async (userId, name) => supabase_1.supabaseAdmin
    .from('providers')
    .insert({
    user_id: userId,
    business_name: name,
    category: 'General',
    location: '',
    status: 'pending',
});
const sendAuthResponse = (res, status, token, user) => {
    res.status(status).json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profile_image,
        },
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Only allow customer/provider self-registration
        const userRole = getSelfRegistrationRole(role);
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
            const { error: providerError } = await createProviderProfile(newUser.id, name);
            if (providerError) {
                console.error('Provider profile create error:', providerError);
                res.status(400).json({ error: providerError.message });
                return;
            }
        }
        // Generate JWT
        const token = createJwt(newUser);
        sendAuthResponse(res, 201, token, newUser);
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
        const token = createJwt(user);
        sendAuthResponse(res, 200, token, user);
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const googleLogin = async (req, res) => {
    try {
        const { credential, role } = req.body;
        if (!env_1.env.GOOGLE_CLIENT_ID) {
            res.status(500).json({ error: 'Google login is not configured' });
            return;
        }
        const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!tokenInfoResponse.ok) {
            res.status(401).json({ error: 'Invalid Google credential' });
            return;
        }
        const tokenInfo = await tokenInfoResponse.json();
        const isVerifiedEmail = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';
        if (tokenInfo.aud !== env_1.env.GOOGLE_CLIENT_ID || !tokenInfo.email || !isVerifiedEmail) {
            res.status(401).json({ error: 'Invalid Google account' });
            return;
        }
        const email = tokenInfo.email.toLowerCase();
        const name = tokenInfo.name || email.split('@')[0];
        const userRole = getSelfRegistrationRole(role);
        const { data: existingUser, error: existingUserError } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, name, email, role, profile_image')
            .eq('email', email)
            .maybeSingle();
        if (existingUserError) {
            console.error('Google login lookup error:', existingUserError);
            res.status(400).json({ error: existingUserError.message });
            return;
        }
        if (existingUser) {
            const token = createJwt(existingUser);
            sendAuthResponse(res, 200, token, existingUser);
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(`google:${tokenInfo.sub || email}:${Date.now()}`, 12);
        const { data: newUser, error: createUserError } = await supabase_1.supabaseAdmin
            .from('users')
            .insert({
            name,
            email,
            password_hash: passwordHash,
            role: userRole,
            profile_image: tokenInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        })
            .select('id, name, email, role, profile_image')
            .single();
        if (createUserError) {
            console.error('Google user create error:', createUserError);
            res.status(400).json({ error: createUserError.message });
            return;
        }
        if (newUser.role === 'provider') {
            const { error: providerError } = await createProviderProfile(newUser.id, name);
            if (providerError) {
                console.error('Google provider profile create error:', providerError);
                res.status(400).json({ error: providerError.message });
                return;
            }
        }
        const token = createJwt(newUser);
        sendAuthResponse(res, 201, token, newUser);
    }
    catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.googleLogin = googleLogin;
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
