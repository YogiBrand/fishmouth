// marketing/src/lib/marketing/geo.js
export async function resolveGeo() {
  // 1) Server-injected global
  if (typeof window !== 'undefined' && window.__FM_GEO__) {
    return window.__FM_GEO__;
  }

  // 2) Query params
  try {
    const url = new URL(window.location.href);
    const qpCity = url.searchParams.get('city');
    const qpState = url.searchParams.get('state');
    if (qpCity || qpState) {
      return { city: qpCity, state: qpState, country: 'US', source: 'qs' };
    }
  } catch {}

  // 3) Backend hint (headers or timezone fallback)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const res = await fetch('/api/v1/geo/guess', {
      headers: { 'X-Client-Timezone': tz }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // 4) Final fallback
  return { city: null, state: 'United States', country: 'US', source: 'fallback' };
}

export function humanizeLocation(geo) {
  if (!geo) return 'your area';
  if (geo.city && geo.state) return `${geo.city}, ${geo.state}`;
  if (geo.state && geo.state !== 'United States') return geo.state;
  return 'your area';
}
