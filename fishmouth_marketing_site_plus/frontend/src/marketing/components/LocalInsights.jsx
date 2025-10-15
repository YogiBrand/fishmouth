import React, { useEffect, useState } from 'react';
import pains from '../data/local_pains.json';

export function LocalInsights({ region='US', city }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const base = pains['US'] || {};
    const defaults = (base['default'] || []);
    const regions = base['regions'] || {};
    // naive mapping: if city contains keywords; otherwise choose region param
    let extras = [];
    if (city) {
      const c = city.toLowerCase();
      if (c.includes('miami') || c.includes('tampa') || c.includes('orlando')) extras = regions['Southeast'] || [];
      if (c.includes('dallas') || c.includes('austin') || c.includes('houston')) extras = regions['Texas'] || [];
      if (c.includes('minneapolis') || c.includes('chicago') || c.includes('detroit')) extras = regions['Midwest'] || [];
    }
    setItems([...defaults, ...extras]);
  }, [region, city]);
  if (!items.length) return null;
  return (
    <section className="fm-container">
      <h3>Common roof issues near {city || 'you'}</h3>
      <ul style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px', listStyle:'none', padding:0}}>
        {items.map((x, i) => (
          <li key={i} className="feature-card">
            <strong>{x.title}</strong>
            <div style={{color:'var(--fm-muted)'}}>{x.desc}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}