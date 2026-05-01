import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    // Real implementation would look up provider specifics
    // Mock implementation returning mock stats
    res.json({
      monthlyEarnings: 1500.00,
      activeBookings: 5,
      overallRating: 4.8
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = req.user?.id;
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, service_id, customer_name, scheduled_time, status')
      .eq('provider_id', providerId)
      .eq('status', 'pending');

    if (error) throw error;

    const formatted = bookings.map((b: any) => ({
      id: b.id,
      serviceId: b.service_id,
      customerName: b.customer_name,
      scheduledTime: b.scheduled_time,
      status: b.status
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
