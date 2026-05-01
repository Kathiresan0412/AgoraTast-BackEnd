import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import bcrypt from 'bcryptjs';

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, profileImage } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (profileImage) updates.profile_image = profileImage;

    const { data: user, error } = await supabaseAdmin
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
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash || '');
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect current password' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
