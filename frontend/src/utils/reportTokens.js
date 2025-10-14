import { format } from 'date-fns';

const TOKEN_PATTERN = /{{\s*([^}]+?)\s*}}/g;

const flattenObject = (input, prefix = '') => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input).reduce((acc, [key, value]) => {
    const tokenKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, tokenKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          Object.assign(acc, flattenObject(item, `${tokenKey}.${index}`));
        } else {
          acc[`${tokenKey}.${index}`] = item;
        }
      });
    } else if (value !== undefined && value !== null) {
      acc[tokenKey] = value;
    }

    return acc;
  }, {});
};

export const buildTokenMap = ({ lead, businessProfile, config }) => {
  const tokenMap = {};

  if (lead) {
    const leadFlat = flattenObject(lead, 'lead');
    Object.assign(tokenMap, leadFlat);

    if (lead.address) {
      const parts = [
        lead.address,
        lead.city,
        lead.state,
        lead.zip_code || lead.zipCode,
      ]
        .filter(Boolean)
        .join(', ');
      tokenMap['lead.address_full'] = parts;
    }

    if (lead.homeowner_name || lead.name) {
      tokenMap['lead.name'] = lead.homeowner_name || lead.name;
    }
  }

  if (businessProfile) {
    const company = businessProfile.company || {};
    const branding = businessProfile.branding || {};
    const services = businessProfile.services || {};

    Object.assign(tokenMap, flattenObject(company, 'company'));
    Object.assign(tokenMap, flattenObject(branding, 'branding'));
    Object.assign(tokenMap, flattenObject(services, 'services'));

    if (company && company.name) {
      tokenMap.company_name = company.name;
    }
  }

  if (config) {
    Object.assign(tokenMap, flattenObject(config, 'config'));
  }

  tokenMap.today = format(new Date(), 'MMMM d, yyyy');
  tokenMap.now_iso = new Date().toISOString();

  return tokenMap;
};

export const resolveTokensInString = (value, tokenMap = {}) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(TOKEN_PATTERN, (_, keyRaw) => {
    const key = keyRaw.trim();
    if (!key) return '';

    const resolved = tokenMap[key];
    if (resolved === undefined || resolved === null) {
      return '';
    }

    return String(resolved);
  });
};

export const resolveTokensInObject = (data, tokenMap = {}) => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => resolveTokensInObject(item, tokenMap));
  }

  if (typeof data === 'object') {
    return Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = resolveTokensInObject(value, tokenMap);
      return acc;
    }, Array.isArray(data) ? [] : {});
  }

  return resolveTokensInString(data, tokenMap);
};

export const resolveReportTokens = ({ content, config, lead, businessProfile }) => {
  const tokenMap = buildTokenMap({ lead, businessProfile, config });
  return resolveTokensInObject(content, tokenMap);
};
