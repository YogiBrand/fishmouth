import { useEffect } from 'react';

export function useSEO({ title, description, url, canonical, ogTitle, ogDescription, ogImage, twitterCard = 'summary_large_image', jsonLd, robots = 'index,follow', lang = 'en' }) {
  useEffect(() => {
    try {
      if (document?.documentElement && !document.documentElement.getAttribute('lang')) {
        document.documentElement.setAttribute('lang', lang);
      }
    } catch (_) {}
    if (title) {
      document.title = title;
    }
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Open Graph tags
    const ensureMeta = (attr, key, value) => {
      if (!value) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    ensureMeta('property', 'og:title', ogTitle || title || '');
    ensureMeta('property', 'og:description', ogDescription || description || '');
    ensureMeta('property', 'og:type', 'website');
    if (url) ensureMeta('property', 'og:url', url);
    if (ogImage) ensureMeta('property', 'og:image', ogImage);

    // Twitter cards
    ensureMeta('name', 'twitter:card', twitterCard);
    ensureMeta('name', 'twitter:title', ogTitle || title || '');
    ensureMeta('name', 'twitter:description', ogDescription || description || '');
    if (ogImage) ensureMeta('name', 'twitter:image', ogImage);

    // JSON-LD structured data
    if (jsonLd) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      try {
        script.textContent = JSON.stringify(jsonLd);
      } catch (_) {}
    }

    // robots
    try {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', robots);
    } catch (_) {}
  }, [title, description, url, canonical, ogTitle, ogDescription, ogImage, twitterCard, jsonLd, robots, lang]);
}


