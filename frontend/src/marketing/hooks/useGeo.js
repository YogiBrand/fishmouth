// useGeo.js - fetches geo data from backend and falls back to Intl timezone hints
import { useEffect, useState } from 'react';

export function useGeo() {
  const [geo, setGeo] = useState({});

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const response = await fetch('/api/v1/geo/lookup');
        if (response.ok) {
          const payload = await response.json();
          if (mounted) {
            setGeo({ city: payload.city, region: payload.region, country: payload.country });
          }
          return;
        }
      } catch (error) {
        // ignore network failures and fall back below
      }

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const regionHint = tz.includes('/') ? tz.split('/')[0] : undefined;
        if (mounted) {
          setGeo({ region: regionHint, country: 'US' });
        }
      } catch (error) {
        if (mounted) {
          setGeo({ country: 'US' });
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return geo;
}
