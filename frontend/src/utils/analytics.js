export function track(eventName, payload = {}) {
  try {
    // Respect cookie consent for analytics
    let analyticsAllowed = false;
    try {
      const raw = window.localStorage.getItem('fm_cookie_consent');
      if (raw) {
        const parsed = JSON.parse(raw);
        analyticsAllowed = !!parsed.analytics;
      }
    } catch (_) {}

    if (analyticsAllowed && window && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...payload });
    } else {
      // Fallback: useful during development or when analytics is disabled
      // eslint-disable-next-line no-console
      console.debug('[track]', eventName, payload);
    }
  } catch (_) {
    // no-op
  }
}






