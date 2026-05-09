import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { getRequestLogContext, serializeError, writeApiEvent } from '../config/logger';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeSearchValue = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0b80-\u0bff\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getSearchAliases = (query: string) => {
  const normalized = normalizeSearchValue(query);
  const aliases = new Set([normalized]);
  const aliasGroups = [
    ['plumb', 'plumber', 'plumbing', 'pipe', 'tap', 'toilet', 'drain', 'leak', 'water', 'குழாய்', 'தண்ணீர்', 'கசிவு', 'வடிகால்', 'கழிப்பறை'],
    ['clean', 'cleaning', 'housekeeping', 'maid', 'கிளீனிங்', 'சுத்தம்'],
    ['electric', 'electrician', 'wiring', 'power', 'மின்சாரம்'],
    ['paint', 'painting', 'painter', 'பெயிண்ட்'],
    ['garden', 'gardening', 'lawn', 'yard', 'தோட்டம்'],
    ['repair', 'fix', 'maintenance', 'service', 'சரி', 'பழுது'],
  ];

  aliasGroups.forEach(group => {
    if (group.some(term => normalized.includes(term))) {
      group.forEach(term => aliases.add(term));
    }
  });

  normalized.split(' ').filter(term => term.length > 1).forEach(term => aliases.add(term));
  return Array.from(aliases).filter(Boolean);
};

const inferServiceTypeLinks = (services: any[], serviceTypes: any[]) =>
  services.map((service: any) => {
    const searchable = normalizeSearchValue([
      service.title,
      service.description,
      ...(service.service_area || []),
    ].filter(Boolean).join(' '));
    const inferredTypes = serviceTypes
      .filter((type: any) => {
        const typeTerms = getSearchAliases([type.name, type.slug, type.description].filter(Boolean).join(' '));
        return typeTerms.some(term => searchable.includes(term));
      })
      .slice(0, 6)
      .map((service_type: any) => ({ service_type }));

    return {
      ...service,
      provider_service_types: inferredTypes,
    };
  });

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

const isProviderServiceTypesUnavailable = (err: unknown) => {
  const error = err as { code?: string; message?: string } | null;

  return (
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST200' ||
    Boolean(error?.message?.includes('provider_service_types'))
  );
};

const logServiceTypeLinksUnavailable = (req: Request, err: unknown) => {
  writeApiEvent('warn', 'public_service_type_links_unavailable', {
    ...getRequestLogContext(req),
    error: serializeError(err),
  });
};

const getActiveProviderUserIds = async () => {
  const { data: providers, error } = await supabaseAdmin
    .from('providers')
    .select('user_id')
    .eq('status', 'active');

  if (error) throw error;

  return (providers || []).map((provider: any) => provider.user_id);
};

const hydratePublicServices = async (services: any[], req: Request) => {
  const serviceRows = services || [];
  const providerIds = Array.from(new Set(serviceRows.map((service: any) => service.provider_id).filter(Boolean)));
  const serviceIds = serviceRows.map((service: any) => service.id).filter(Boolean);

  const { data: providerUsers, error: usersError } = providerIds.length
    ? await supabaseAdmin
      .from('users')
      .select('id, name, email, profile_image')
      .in('id', providerIds)
    : { data: [], error: null };

  if (usersError) throw usersError;

  const { data: serviceTypeLinks, error: linksError } = serviceIds.length
    ? await supabaseAdmin
      .from('provider_service_types')
      .select('provider_service_id, service_type:service_types (*)')
      .in('provider_service_id', serviceIds)
    : { data: [], error: null };

  if (linksError && !isProviderServiceTypesUnavailable(linksError)) {
    throw linksError;
  }

  if (linksError) {
    logServiceTypeLinksUnavailable(req, linksError);
  }

  const providersById = new Map((providerUsers || []).map((provider: any) => [provider.id, provider]));
  const serviceTypesByServiceId = new Map<string, any[]>();

  (serviceTypeLinks || []).forEach((link: any) => {
    const currentLinks = serviceTypesByServiceId.get(link.provider_service_id) || [];
    currentLinks.push({ service_type: link.service_type });
    serviceTypesByServiceId.set(link.provider_service_id, currentLinks);
  });

  const hydratedRows = serviceRows.map((service: any) => ({
    ...service,
    users: providersById.get(service.provider_id) || null,
    provider_service_types: serviceTypesByServiceId.get(service.id) || [],
  }));

  if (!linksError) return hydratedRows;

  const { data: serviceTypes, error: serviceTypesError } = await supabaseAdmin
    .from('service_types')
    .select('*')
    .eq('active', true);

  if (serviceTypesError) throw serviceTypesError;

  return inferServiceTypeLinks(hydratedRows, serviceTypes || []);
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
      .select('*')
      .eq('status', 'active')
      .in('provider_id', activeProviderUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const hydratedServices = await hydratePublicServices(services || [], req);
    const service = hydratedServices.find((item: any) => slugify(item.title || '') === requestedSlug || item.id === slugParam);

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
    const country = typeof req.query.country === 'string' ? req.query.country.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const provinceId = typeof req.query.provinceId === 'string' ? req.query.provinceId.trim() : '';
    const districtId = typeof req.query.districtId === 'string' ? req.query.districtId.trim() : '';
    const cityId = typeof req.query.cityId === 'string' ? req.query.cityId.trim() : '';
    const search = typeof req.query.search === 'string'
      ? req.query.search.trim()
      : typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';
    const categoryTerms = getSearchAliases(category);
    const searchTerms = getSearchAliases(search);
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
      .select('*')
      .eq('status', 'active')
      .in('provider_id', activeProviderUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const hydratedServices = await hydratePublicServices(services || [], req);
    const filtered = hydratedServices.filter((service: any) => {
      const serviceArea = service.service_area || [];
      const serviceTypes = service.provider_service_types?.map((item: any) => item.service_type).filter(Boolean) || [];
      const hasCountryTag = serviceArea.some((item: string) => item.startsWith('country:'));
      const countryMatches = !country || serviceArea.includes(`country:${country}`) || !hasCountryTag;
      const serviceTypeSearchable = normalizeSearchValue(serviceTypes.flatMap((type: any) => [type.name, type.slug, type.description]).filter(Boolean).join(' '));
      const categoryMatches = !category || category === 'all' || serviceTypes.some((type: any) => type.name === category) || categoryTerms.some(term => serviceTypeSearchable.includes(term));
      const provinceMatches = !provinceId || serviceArea.includes(`province:${provinceId}`);
      const districtMatches = !districtId || serviceArea.includes(`district:${districtId}`);
      const cityMatches = !cityId || serviceArea.includes(`city:${cityId}`);
      const provider = Array.isArray(service.users) ? service.users[0] : service.users;
      const searchable = normalizeSearchValue([
        service.title,
        service.description,
        provider?.name,
        provider?.email,
        ...serviceArea,
        ...serviceTypes.flatMap((type: any) => [type.name, type.slug, type.description]),
      ].filter(Boolean).join(' '));
      const searchMatches = !searchTerms.length || searchTerms.some(term => searchable.includes(term));

      return countryMatches && categoryMatches && provinceMatches && districtMatches && cityMatches && searchMatches;
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
      .select('*')
      .eq('provider_id', providerProfile.user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (servicesError) throw servicesError;

    const hydratedServices = await hydratePublicServices(services || [], req);
    res.json(mapPublicProvider(providerProfile, hydratedServices));
  } catch (err) {
    console.error('Get public provider error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
