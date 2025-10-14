const businessProfileService = {
  async load() {
    try {
      const res = await fetch('/api/business/profile');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      localStorage.setItem('businessProfile', JSON.stringify(json));
      return json;
    } catch (e) {
      try {
        const cached = localStorage.getItem('businessProfile');
        return cached ? JSON.parse(cached) : null;
      } catch (_) {
        return null;
      }
    }
  },
  async save(profile) {
    try {
      const res = await fetch('/api/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed');
      localStorage.setItem('businessProfile', JSON.stringify(profile));
      return true;
    } catch (e) {
      localStorage.setItem('businessProfile', JSON.stringify(profile));
      return false;
    }
  },
};

export default businessProfileService;