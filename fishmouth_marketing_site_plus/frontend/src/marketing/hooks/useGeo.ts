// useGeo.ts - tries backend /api/v1/geo/lookup first; falls back to Intl
import { useEffect, useState } from 'react';

export type Geo = { city?: string; region?: string; country?: string; };
export function useGeo(): Geo {
  const [geo, setGeo] = useState<Geo>({});
  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const r = await fetch('/api/v1/geo/lookup');
        if (r.ok) {
          const j = await r.json();
          if (mounted) setGeo({ city: j.city, region: j.region, country: j.country });
          return;
        }
      } catch {}
      // Fallbacks
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const region = tz.includes('/') ? tz.split('/')[0] : undefined;
        if (mounted) setGeo({ region, country: 'US' });
      } catch {
        if (mounted) setGeo({ country: 'US' });
      }
    }
    run();
    return () => { mounted = false; };
  }, []);
  return geo;
}
