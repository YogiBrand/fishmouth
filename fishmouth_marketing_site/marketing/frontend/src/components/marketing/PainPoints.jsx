import React, { useEffect, useState } from 'react';
import painData from '../../data/marketing/pain_points.json' assert { type: 'json' };
import { resolveGeo } from '../../lib/marketing/geo';

export default function PainPoints() {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    async function load() {
      const geo = await resolveGeo();
      const { city, state } = geo || {};
      let arr = [];
      if (city && painData.cities[city]) arr = painData.cities[city];
      else if (state && painData.states[state]) arr = painData.states[state];
      else arr = painData.US.general;
      setPoints(arr.slice(0, 4));
    }
    load();
  }, []);

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-4">We solve the real problems in your market</h2>
        <ul className="grid md:grid-cols-2 gap-3">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-3 p-4 border rounded">
              <span className="mt-1 text-lg">✅</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
