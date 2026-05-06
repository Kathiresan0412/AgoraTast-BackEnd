import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import bcrypt from 'bcryptjs';
import '../types';

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

const allowedSelfRegistrationRoles = ['customer', 'provider'];

const getSelfRegistrationRole = (role: unknown) =>
  typeof role === 'string' && allowedSelfRegistrationRoles.includes(role) ? role : 'customer';

const createJwt = (user: { id: string; role: string; email: string }) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as any
  );

const createProviderProfile = async (userId: string, name: string) =>
  supabaseAdmin
    .from('providers')
    .insert({
      user_id: userId,
      business_name: name,
      category: 'General',
      location: '',
      status: 'pending',
    });

const recordLoginHistory = async (
  req: Request,
  email: string,
  userId: string
) => {
  const { error } = await supabaseAdmin.from('login_histories').insert({
    user_id: userId,
    email,
    success: true,
    failure_reason: null,
    ip_address: req.ip,
    user_agent: req.get('user-agent') || '',
  });

  if (error) {
    console.error('Login history insert error:', error);
  }
};

const sendAuthResponse = (res: Response, status: number, token: string, user: any): void => {
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

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Only allow customer/provider self-registration
    const userRole = getSelfRegistrationRole(role);

    // Block duplicate accounts only within the same role.
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role', userRole)
      .maybeSingle();

    if (existingUser) {
      res.status(409).json({ error: `An ${userRole} account with this email already exists` });
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data: newUser, error } = await supabaseAdmin
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
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    const userQuery = supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email);

    if (role) {
      userQuery.eq('role', role);
    }

    const { data: users, error } = await userQuery;

    if (error || !users?.length) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const matchedUsers = [];

    for (const candidate of users) {
      if (await bcrypt.compare(password, candidate.password_hash || '')) {
        matchedUsers.push(candidate);
      }
    }

    if (matchedUsers.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (matchedUsers.length > 1) {
      res.status(409).json({ error: 'Multiple accounts match this email. Please choose a role to continue.' });
      return;
    }

    const user = matchedUsers[0];
    const token = createJwt(user);
    await recordLoginHistory(req, user.email, user.id);

    sendAuthResponse(res, 200, token, user);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, role } = req.body;

    if (!env.GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: 'Google login is not configured' });
      return;
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!tokenInfoResponse.ok) {
      res.status(401).json({ error: 'Invalid Google credential' });
      return;
    }

    const tokenInfo = await tokenInfoResponse.json() as GoogleTokenInfo;
    const isVerifiedEmail = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';

    if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID || !tokenInfo.email || !isVerifiedEmail) {
      res.status(401).json({ error: 'Invalid Google account' });
      return;
    }

    const email = tokenInfo.email.toLowerCase();
    const name = tokenInfo.name || email.split('@')[0];
    const userRole = getSelfRegistrationRole(role);

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, profile_image')
      .eq('email', email)
      .eq('role', userRole)
      .maybeSingle();

    if (existingUserError) {
      console.error('Google login lookup error:', existingUserError);
      res.status(400).json({ error: existingUserError.message });
      return;
    }

    if (existingUser) {
      const token = createJwt(existingUser);
      await recordLoginHistory(req, existingUser.email, existingUser.id);
      sendAuthResponse(res, 200, token, existingUser);
      return;
    }

    const passwordHash = await bcrypt.hash(`google:${tokenInfo.sub || email}:${Date.now()}`, 12);

    const { data: newUser, error: createUserError } = await supabaseAdmin
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
    await recordLoginHistory(req, newUser.email, newUser.id);
    sendAuthResponse(res, 201, token, newUser);
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { data: user, error } = await supabaseAdmin
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
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
