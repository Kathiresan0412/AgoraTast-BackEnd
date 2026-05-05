import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapService = (service: any) => {
  const provider = Array.isArray(service.users) ? service.users[0] : service.users;
  const serviceTypes = service.provider_service_types?.map((item: any) => item.service_type).filter(Boolean) || [];
  const serviceArea = service.service_area || [];

  return {
    id: service.id,
    title: service.title,
    description: service.description,
    basePrice: service.base_price,
    priceType: service.price_type,
    durationMins: service.duration_mins,
    serviceArea,
    location: serviceArea.find((item: string) => !item.includes(':')) || '',
    images: service.images || [],
    status: service.status,
    createdAt: service.created_at,
    provider: {
      id: service.provider_id,
      name: provider?.name || 'Provider',
      slug: service.provider_id,
      email: provider?.email || '',
      profileImage: provider?.profile_image || '',
    },
    serviceTypes,
    categories: serviceTypes.map((type: any) => type.name),
  };
};

const mapPublicProvider = (providerProfile: any, services: any[]) => {
  const user = Array.isArray(providerProfile.users) ? providerProfile.users[0] : providerProfile.users;
  const providerName = providerProfile.business_name || user?.name || 'Provider';
  const mappedServices = services.map(mapService);

  return {
    id: providerProfile.id,
    userId: providerProfile.user_id,
    slug: providerProfile.user_id,
    name: providerName,
    ownerName: user?.name || providerName,
    email: user?.email || '',
    phone: user?.phone || '',
    description: mappedServices[0]?.description || `${providerName} offers professional services on AgoraTask.`,
    category: providerProfile.category || '',
    location: providerProfile.location || mappedServices[0]?.location || '',
    status: providerProfile.status,
    profileImage: user?.profile_image || '',
    coverImage: mappedServices[0]?.images?.[0] || '',
    services: mappedServices,
    serviceCategories: Array.from(new Set(mappedServices.flatMap((service: any) => service.categories))),
  };
};

const getActiveProviderUserIds = async () => {
  const { data: providers, error } = await supabaseAdmin
    .from('providers')
    .select('user_id')
    .eq('status', 'active');

  if (error) throw error;

  return (providers || []).map((provider: any) => provider.user_id);
};

export const getPublicServiceBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slugParam = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug || '';
    const requestedSlug = slugify(slugParam);
    const activeProviderUserIds = await getActiveProviderUserIds();

    if (!activeProviderUserIds.length) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    const { data: services, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        *,
        users!provider_services_provider_id_fkey (
          name,
          email,
          profile_image
        ),
        provider_service_types (
          service_type:service_types (*)
        )
      `)
      .eq('status', 'active')
      .in('provider_id', activeProviderUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const service = (services || []).find((item: any) => slugify(item.title || '') === requestedSlug || item.id === slugParam);

    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    res.json(mapService(service));
  } catch (err) {
    console.error('Get public service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const provinceId = typeof req.query.provinceId === 'string' ? req.query.provinceId.trim() : '';
    const districtId = typeof req.query.districtId === 'string' ? req.query.districtId.trim() : '';
    const cityId = typeof req.query.cityId === 'string' ? req.query.cityId.trim() : '';
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const activeProviderUserIds = await getActiveProviderUserIds();

    if (!activeProviderUserIds.length) {
      res.json({
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 1,
        },
      });
      return;
    }

    const { data: services, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        *,
        users!provider_services_provider_id_fkey (
          name,
          email,
          profile_image
        ),
        provider_service_types (
          service_type:service_types (*)
        )
      `)
      .eq('status', 'active')
      .in('provider_id', activeProviderUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const filtered = (services || []).filter((service: any) => {
      const serviceArea = service.service_area || [];
      const serviceTypes = service.provider_service_types?.map((item: any) => item.service_type).filter(Boolean) || [];
      const categoryMatches = !category || category === 'all' || serviceTypes.some((type: any) => type.name === category);
      const provinceMatches = !provinceId || serviceArea.includes(`province:${provinceId}`);
      const districtMatches = !districtId || serviceArea.includes(`district:${districtId}`);
      const cityMatches = !cityId || serviceArea.includes(`city:${cityId}`);

      return categoryMatches && provinceMatches && districtMatches && cityMatches;
    });

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * limit;

    res.json({
      data: filtered.slice(start, start + limit).map(mapService),
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Get public services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicProviderBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slugParam = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug || '';
    const requestedSlug = slugify(slugParam);

    const { data: providerProfiles, error: providersError } = await supabaseAdmin
      .from('providers')
      .select(`
        *,
        users!providers_user_id_fkey (
          name,
          email,
          phone,
          profile_image
        )
      `)
      .eq('status', 'active');

    if (providersError) throw providersError;

    let providerProfile = (providerProfiles || []).find((profile: any) => {
      const user = Array.isArray(profile.users) ? profile.users[0] : profile.users;
      return (
        profile.id === slugParam ||
        profile.user_id === slugParam ||
        slugify(profile.business_name || user?.name || '') === requestedSlug ||
        slugify(user?.name || '') === requestedSlug
      );
    });

    if (!providerProfile) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    const { data: services, error: servicesError } = await supabaseAdmin
      .from('provider_services')
      .select(`
        *,
        users!provider_services_provider_id_fkey (
          name,
          email,
          profile_image
        ),
        provider_service_types (
          service_type:service_types (*)
        )
      `)
      .eq('provider_id', providerProfile.user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (servicesError) throw servicesError;

    res.json(mapPublicProvider(providerProfile, services || []));
  } catch (err) {
    console.error('Get public provider error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
