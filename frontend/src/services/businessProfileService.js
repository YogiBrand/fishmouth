const numberFrom = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const categoriseService = (name = '') => {
  const normalised = name.toLowerCase();
  if (normalised.includes('inspection')) return 'inspection';
  if (normalised.includes('tune') || normalised.includes('repair') || normalised.includes('patch')) return 'repair_minor';
  if (normalised.includes('replacement') || normalised.includes('install')) return 'repair_major';
  if (normalised.includes('maintenance') || normalised.includes('plan')) return 'maintenance';
  if (normalised.includes('gutter')) return 'gutter';
  if (normalised.includes('insurance')) return 'insurance';
  return 'other';
};

const normaliseServiceItems = (items = []) => {
  return items
    .filter(Boolean)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `${index}`,
          name: item,
          priceMin: null,
          priceMax: null,
          unit: 'project',
          notes: '',
          category: categoriseService(item),
        };
      }
      const priceMin = numberFrom(item.price_min ?? item.priceMin);
      const priceMax = numberFrom(item.price_max ?? item.priceMax);
      return {
        id: String(item.id ?? index),
        name: item.name || item.title || `Service ${index + 1}`,
        priceMin,
        priceMax,
        unit: item.unit || 'project',
        notes: item.notes || item.description || '',
        suggestedMin: numberFrom(item.suggested_min ?? item.suggestedMin),
        suggestedMax: numberFrom(item.suggested_max ?? item.suggestedMax),
        category: categoriseService(item.name || ''),
      };
    });
};

const buildServiceSummary = (items) => {
  const summary = {
    inspections: {
      basic: {},
      comprehensive: {},
    },
    repairs: {
      minor: { priceRange: null },
      major: { priceRange: null },
    },
    maintenance: [],
    other: [],
  };

  const assignInspection = (target, candidate) => {
    if (!target.price) {
      target.price = candidate.priceMin ?? candidate.priceMax ?? null;
      target.description = candidate.notes || candidate.name;
      target.unit = candidate.unit;
    }
  };

  items.forEach((service) => {
    switch (service.category) {
      case 'inspection':
        if (!summary.inspections.basic.price) assignInspection(summary.inspections.basic, service);
        else assignInspection(summary.inspections.comprehensive, service);
        break;
      case 'repair_minor': {
        const min = service.priceMin ?? service.priceMax ?? null;
        const max = service.priceMax ?? service.priceMin ?? null;
        if (min !== null && max !== null) {
          summary.repairs.minor.priceRange = [min, max];
        }
        break;
      }
      case 'repair_major': {
        const min = service.priceMin ?? service.priceMax ?? null;
        const max = service.priceMax ?? service.priceMin ?? null;
        if (min !== null && max !== null) {
          summary.repairs.major.priceRange = [min, max];
        }
        break;
      }
      case 'maintenance':
        summary.maintenance.push(service);
        break;
      default:
        summary.other.push(service);
    }
  });

  const fingerprint = items
    .map((item) => `${item.name}:${item.priceMin ?? ''}-${item.priceMax ?? ''}:${item.unit}`)
    .join('|');

  return { ...summary, fingerprint };
};

const mergeCaseStudies = (existing, contentLibrary = {}) => {
  const merged = {
    portfolio: existing.portfolio?.length ? existing.portfolio : contentLibrary.portfolio || [],
    testimonials: existing.testimonials?.length ? existing.testimonials : contentLibrary.testimonials || [],
    beforeAfterSets: existing.beforeAfterSets?.length ? existing.beforeAfterSets : contentLibrary.beforeAfter || [],
    usageFlags: existing.usageFlags || contentLibrary.usage_flags || {},
  };
  return merged;
};

const mergeServices = (profileServices = {}, settings = {}) => {
  const items = normaliseServiceItems(settings.services_config?.items || []);
  const summary = buildServiceSummary(items);
  return {
    primaryServices: profileServices.primaryServices?.length ? profileServices.primaryServices : items,
    specialties: profileServices.specialties || [],
    certifications: profileServices.certifications || [],
    serviceAreas: profileServices.serviceAreas?.length ? profileServices.serviceAreas : settings.service_areas?.items || [],
    pricing: {
      ...profileServices.pricing,
      inspectionFee:
        profileServices.pricing?.inspectionFee || summary.inspections.basic.price
          ? `$${summary.inspections.basic.price}`
          : profileServices.pricing?.inspectionFee,
      typicalProjectRange:
        profileServices.pricing?.typicalProjectRange || summary.repairs.major.priceRange
          ? summary.repairs.major.priceRange?.map((value) => `$${value}`).join(' - ')
          : profileServices.pricing?.typicalProjectRange,
    },
    summary,
    fingerprint: summary.fingerprint,
  };
};

const mergeProfileAndSettings = (profileData = {}, settingsData = {}) => {
  const merged = {
    company: profileData.company || {},
    branding: profileData.branding || {},
    services: {},
    caseStudies: {},
    aiAgent: profileData.aiAgent || {},
    integrations: profileData.integrations || {},
  };

  merged.services = mergeServices(profileData.services || {}, settingsData);
  merged.caseStudies = mergeCaseStudies(profileData.caseStudies || {}, settingsData.content_library || {});
  merged.pricingSuggestions = settingsData.pricing_suggestions || {};
  merged.completeness = settingsData.completeness || {};
  merged.autofill = {
    status: settingsData.autofill_status || 'idle',
    lastScrapedAt: settingsData.last_scraped_at || null,
  };
  merged.servicesFingerprint = merged.services.fingerprint;
  return merged;
};

let cachedProfile = null;
let cachedServices = null;

const businessProfileService = {
  async load(forceRefresh = false) {
    if (!forceRefresh && cachedProfile) {
      return cachedProfile;
    }

    try {
      const [profileResp, settingsResp] = await Promise.allSettled([
        fetch('/api/business/profile'),
        fetch('/api/business/settings'),
      ]);

      const profileData = profileResp.status === 'fulfilled' && profileResp.value.ok
        ? await profileResp.value.json()
        : {};
      const settingsData = settingsResp.status === 'fulfilled' && settingsResp.value.ok
        ? await settingsResp.value.json()
        : {};

      const merged = mergeProfileAndSettings(profileData, settingsData);
      cachedProfile = merged;
      cachedServices = {
        items: merged.services.primaryServices,
        summary: merged.services.summary,
        serviceAreas: merged.services.serviceAreas,
        packages: settingsData.offers_packages || {},
        fingerprint: merged.services.fingerprint,
      };
      try {
        localStorage.setItem('businessProfile', JSON.stringify(merged));
      } catch (error) {
        console.warn('Unable to cache business profile locally', error);
      }
      return merged;
    } catch (error) {
      console.error('Failed to load business profile', error);
      try {
        const cached = localStorage.getItem('businessProfile');
        if (cached) {
          const parsed = JSON.parse(cached);
          cachedProfile = parsed;
          return parsed;
        }
      } catch (_) {
        // ignore
      }
      return null;
    }
  },

  async save(profile) {
    try {
      const res = await fetch('/api/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      cachedProfile = null;
      try {
        localStorage.setItem('businessProfile', JSON.stringify(profile));
      } catch (_) {
        // ignore
      }
      return true;
    } catch (error) {
      console.error('Failed to persist business profile', error);
      try {
        localStorage.setItem('businessProfile', JSON.stringify(profile));
      } catch (_) {
        // ignore
      }
      return false;
    }
  },

  async loadSettings() {
    const res = await fetch('/api/business/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return await res.json();
  },

  async saveSettings(payload) {
    const res = await fetch('/api/business/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    cachedServices = null;
    cachedProfile = null;
    return await res.json();
  },

  async startAutofill(websiteUrl) {
    const res = await fetch('/api/business/settings/autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website_url: websiteUrl }),
    });
    if (!res.ok) throw new Error('Failed to start autofill');
    return await res.json();
  },

  async getAutofillStatus() {
    const res = await fetch('/api/business/settings/autofill/status');
    if (!res.ok) throw new Error('Failed to get autofill status');
    return await res.json();
  },

  async applySuggestions({ state, services, accept }) {
    const res = await fetch('/api/business/settings/apply-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, services, accept }),
    });
    if (!res.ok) throw new Error('Failed to apply suggestions');
    cachedServices = null;
    return await res.json();
  },

  async getServices(forceRefresh = false) {
    if (!forceRefresh && cachedServices) {
      return cachedServices;
    }
    try {
      const settings = await this.loadSettings();
      const items = normaliseServiceItems(settings.services_config?.items || []);
      const summary = buildServiceSummary(items);
      cachedServices = {
        items,
        summary,
        serviceAreas: settings.service_areas?.items || [],
        packages: settings.offers_packages || {},
        fingerprint: summary.fingerprint,
      };
      return cachedServices;
    } catch (error) {
      console.warn('Falling back to profile services cache', error);
      if (cachedProfile?.services) {
        return {
          items: cachedProfile.services.primaryServices || [],
          summary: cachedProfile.services.summary || buildServiceSummary([]),
          serviceAreas: cachedProfile.services.serviceAreas || [],
          packages: {},
          fingerprint: cachedProfile.servicesFingerprint,
        };
      }
      return {
        items: [],
        summary: buildServiceSummary([]),
        serviceAreas: [],
        packages: {},
        fingerprint: '',
      };
    }
  },

  validateImageQuality(image = {}) {
    const width = image.width || image.meta?.width || image.metadata?.width;
    const height = image.height || image.meta?.height || image.metadata?.height;
    const sharpness = numberFrom(image.sharpness ?? image.metrics?.sharpness);
    const clarity = numberFrom(image.clarity ?? image.metrics?.clarity);
    const score = numberFrom(image.quality_score ?? image.score);
    const issues = [];

    if (width && width < 800) issues.push('Width below 800px');
    if (height && height < 600) issues.push('Height below 600px');
    if (sharpness !== null && sharpness < 0.4) issues.push('Soft focus detected');
    if (clarity !== null && clarity < 0.5) issues.push('Low clarity / noise present');

    const components = [
      width ? Math.min(width / 1600, 1) : 0.5,
      height ? Math.min(height / 1200, 1) : 0.5,
      sharpness !== null ? Math.min(sharpness, 1) : 0.6,
      clarity !== null ? Math.min(clarity, 1) : 0.6,
      score !== null ? Math.min(score / 100, 1) : 0.6,
    ];
    const aggregate = components.reduce((acc, value) => acc + value, 0) / components.length;
    const passed = aggregate >= 0.6 && issues.length <= 2;

    return {
      passed,
      score: aggregate,
      issues,
    };
  },

  async getPricingContext(reportType = 'damage-assessment') {
    const services = await this.getServices();
    const { summary, serviceAreas, fingerprint } = services;

    const inspectionPrice = summary.inspections.basic.price || summary.inspections.comprehensive.price || null;
    const repairMinor = summary.repairs.minor.priceRange || null;
    const repairMajor = summary.repairs.major.priceRange || null;

    const averageTicket = [repairMinor, repairMajor]
      .filter(Boolean)
      .flat()
      .reduce((acc, value, index, arr) => acc + value / arr.length, 0) || null;

    return {
      reportType,
      inspectionPrice,
      repairMinor,
      repairMajor,
      averageTicket,
      serviceAreas,
      serviceCount: services.items.length,
      fingerprint,
    };
  },
};

export default businessProfileService;
