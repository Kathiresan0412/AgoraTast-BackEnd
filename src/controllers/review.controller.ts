import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { getRequestLogContext, serializeError, writeApiEvent, writeAuthEvent } from '../config/logger';

const ACTIVE_REVIEW_STATUSES = ['pending', 'visible', 'hidden'];

const getUsersByIds = async (ids: string[]) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, profile_image')
    .in('id', uniqueIds);

  if (error) throw error;

  return new Map((data || []).map((user: any) => [user.id, user]));
};

const mapReview = (review: any, usersById: Map<string, any>) => {
  const customer = usersById.get(review.customer_id);
  const profileImage = customer?.profile_image || '';

  return {
    id: review.id,
    bookingId: review.booking_id,
    providerServiceId: review.provider_service_id,
    providerId: review.provider_id,
    customerId: review.customer_id,
    customerName: customer?.name || review.guest_name || 'Guest customer',
    customerEmail: customer?.email || review.guest_email || '',
    customerProfileImage: profileImage.startsWith('data:image/') ? '' : profileImage,
    isForSystem: Boolean(review.is_for_system),
    rating: review.rating,
    comment: review.comment || '',
    status: review.status,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
};

const mapSystemReview = (review: any, usersById: Map<string, any>) => {
  const customer = usersById.get(review.customer_id);
  const profileImage = customer?.profile_image || '';

  return {
    id: review.id,
    customerId: review.customer_id,
    customerName: customer?.name || 'AgoraTask customer',
    customerEmail: customer?.email || '',
    customerProfileImage: profileImage.startsWith('data:image/') ? '' : profileImage,
    isForSystem: true,
    rating: review.rating,
    comment: review.comment || '',
    status: review.status,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
    isMine: false,
  };
};

const logControllerError = (event: string, req: Request, err: unknown) => {
  writeApiEvent('error', event, {
    ...getRequestLogContext(req),
    error: serializeError(err),
  });
};

const getTargetFromRequest = (req: Request) => {
  const body = req.body || {};

  const providerServiceId =
    req.params.serviceId ||
    body.providerServiceId ||
    body.provider_service_id ||
    req.query.providerServiceId ||
    req.query.provider_service_id ||
    req.query.serviceId;

  const providerId =
    req.params.providerId ||
    body.providerId ||
    body.provider_id ||
    req.query.providerId ||
    req.query.provider_id;

  return {
    providerId: typeof providerId === 'string' ? providerId : '',
    providerServiceId: typeof providerServiceId === 'string' ? providerServiceId : '',
  };
};

const resolveReviewTarget = async (req: Request, res: Response) => {
  const { providerId, providerServiceId } = getTargetFromRequest(req);

  if (providerServiceId) {
    const { data: service, error } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_id, status')
      .eq('id', providerServiceId)
      .single();

    if (error || !service) {
      res.status(404).json({ error: 'Service not found' });
      return null;
    }

    if (providerId && providerId !== service.provider_id) {
      res.status(400).json({ error: 'Provider does not own this service' });
      return null;
    }

    return {
      providerId: service.provider_id,
      providerServiceId: service.id,
    };
  }

  if (!providerId) {
    res.status(400).json({ error: 'Provider ID or service ID is required' });
    return null;
  }

  const { data: provider, error } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', providerId)
    .single();

  if (error || !provider || provider.role !== 'provider') {
    res.status(404).json({ error: 'Provider not found' });
    return null;
  }

  return {
    providerId: provider.id,
    providerServiceId: null,
  };
};

const fetchMappedReviews = async (query: any, userId?: string) => {
  const { data, error } = await query
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const reviews = data || [];
  const usersById = await getUsersByIds(reviews.map((review: any) => review.customer_id));

  return reviews.map((review: any) => ({
    ...mapReview(review, usersById),
    isMine: Boolean(userId && review.customer_id === userId),
  }));
};

export const listReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId, providerServiceId } = getTargetFromRequest(req);

    if (!providerId && !providerServiceId) {
      res.status(400).json({ error: 'Provider ID or service ID is required' });
      return;
    }

    let query = supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('is_for_system', false)
      .eq('status', 'visible');

    if (providerServiceId) {
      query = query.eq('provider_service_id', providerServiceId);
    } else {
      query = query.eq('provider_id', providerId).is('provider_service_id', null);
    }

    res.json(await fetchMappedReviews(query, req.user?.id));
  } catch (err) {
    logControllerError('list_reviews_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSystemReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('is_for_system', true)
      .eq('status', 'visible')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviews = data || [];
    const usersById = await getUsersByIds(reviews.map((review: any) => review.customer_id));

    res.json(reviews.map((review: any) => ({
      ...mapSystemReview(review, usersById),
      isMine: Boolean(req.user?.id && review.customer_id === req.user.id),
    })));
  } catch (err) {
    logControllerError('list_system_reviews_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMySystemReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('customer_id', req.user?.id)
      .eq('is_for_system', true)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const review = reviews?.[0];
    if (!review) {
      res.json(null);
      return;
    }

    const usersById = await getUsersByIds([review.customer_id]);
    res.json({ ...mapSystemReview(review, usersById), isMine: true });
  } catch (err) {
    logControllerError('get_my_system_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const target = await resolveReviewTarget(req, res);
    if (!target) return;

    let query = supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('customer_id', req.user?.id)
      .eq('is_for_system', false)
      .eq('provider_id', target.providerId)
      .neq('status', 'deleted');

    query = target.providerServiceId
      ? query.eq('provider_service_id', target.providerServiceId)
      : query.is('provider_service_id', null);

    const { data: reviews, error } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const review = reviews?.[0];
    if (!review) {
      res.json(null);
      return;
    }

    const usersById = await getUsersByIds([review.customer_id]);
    res.json({ ...mapReview(review, usersById), isMine: true });
  } catch (err) {
    logControllerError('get_my_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'customer') {
      res.status(403).json({ error: 'Only customer accounts can create reviews' });
      return;
    }

    const target = await resolveReviewTarget(req, res);
    if (!target) return;

    const customerId = req.user.id;
    if (customerId === target.providerId) {
      res.status(400).json({ error: 'You cannot review yourself' });
      return;
    }

    let duplicateQuery = supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_for_system', false)
      .eq('provider_id', target.providerId)
      .in('status', ACTIVE_REVIEW_STATUSES);

    duplicateQuery = target.providerServiceId
      ? duplicateQuery.eq('provider_service_id', target.providerServiceId)
      : duplicateQuery.is('provider_service_id', null);

    const { data: existingReviews, error: duplicateError } = await duplicateQuery
      .order('created_at', { ascending: false })
      .limit(1);

    if (duplicateError) throw duplicateError;
    const existing = existingReviews?.[0];
    if (existing) {
      const usersById = await getUsersByIds([existing.customer_id]);
      res.status(409).json({
        error: 'You already reviewed this target. Update or delete your existing review instead.',
        review: { ...mapReview(existing, usersById), isMine: true },
      });
      return;
    }

    const { rating, comment, bookingId, booking_id } = req.body;
    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert([{
        booking_id: bookingId || booking_id || null,
        provider_service_id: target.providerServiceId,
        provider_id: target.providerId,
        customer_id: customerId,
        rating,
        comment: comment?.trim() || null,
        is_for_system: false,
        status: 'visible',
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'You already reviewed this target' });
        return;
      }
      throw error;
    }

    const usersById = await getUsersByIds([review.customer_id]);
    res.status(201).json({ ...mapReview(review, usersById), isMine: true });
  } catch (err) {
    logControllerError('create_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSystemReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'customer') {
      res.status(403).json({ error: 'Only customer accounts can create reviews' });
      return;
    }

    const { rating, comment } = req.body;
    const { data: existingReviews, error: duplicateError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('customer_id', req.user.id)
      .eq('is_for_system', true)
      .in('status', ACTIVE_REVIEW_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1);

    if (duplicateError) throw duplicateError;
    const existing = existingReviews?.[0];
    if (existing) {
      const usersById = await getUsersByIds([existing.customer_id]);
      res.status(409).json({
        error: 'You already reviewed AgoraTask. Update or delete your existing review instead.',
        review: { ...mapSystemReview(existing, usersById), isMine: true },
      });
      return;
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert([{
        booking_id: null,
        provider_service_id: null,
        provider_id: null,
        customer_id: req.user.id,
        rating,
        comment: comment?.trim() || null,
        is_for_system: true,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'You already reviewed AgoraTask' });
        return;
      }
      throw error;
    }

    const usersById = await getUsersByIds([review.customer_id]);
    res.status(201).json({ ...mapSystemReview(review, usersById), isMine: true });
  } catch (err) {
    logControllerError('create_system_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .neq('status', 'deleted')
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (existing.customer_id !== userId) {
      writeAuthEvent('review_forbidden_edit_owner_mismatch', {
        ...getRequestLogContext(req),
        status: 403,
        reviewId,
        userId,
        ownerId: existing.customer_id,
      });
      res.status(403).json({ error: 'Forbidden: You can only update your own review' });
      return;
    }

    const { rating, comment } = req.body;
    const updates: Record<string, any> = {};
    if (rating !== undefined) updates.rating = rating;
    if (comment !== undefined) updates.comment = comment.trim() || null;
    updates.status = existing.is_for_system ? 'pending' : 'visible';

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;

    const usersById = await getUsersByIds([review.customer_id]);
    res.json({ ...mapReview(review, usersById), isMine: true });
  } catch (err) {
    logControllerError('update_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .neq('status', 'deleted')
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (existing.customer_id !== userId) {
      writeAuthEvent('review_forbidden_delete_owner_mismatch', {
        ...getRequestLogContext(req),
        status: 403,
        reviewId,
        userId,
        ownerId: existing.customer_id,
      });
      res.status(403).json({ error: 'Forbidden: You can only delete your own review' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('reviews')
      .update({ status: 'deleted' })
      .eq('id', reviewId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logControllerError('delete_review_error', req, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
