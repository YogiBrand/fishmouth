import React, { useEffect, useRef, useState } from 'react';

const STEPS = [
  { title: 'Scan your market', desc: 'Pick a ZIP, city, county, or draw a polygon. We keep imagery costs low by default.', img: '/marketing/steps/step1.png' },
  { title: 'Review HOT leads', desc: 'See score, confidence, and proof. Sort by what makes you money.', img: '/marketing/steps/step2.png' },
  { title: 'Generate a report', desc: 'Brand it with your logo. Add overlays homeowners understand.', img: '/marketing/steps/step3.png' },
  { title: 'Send by SMS or email', desc: 'Deliver with one click. We track viewed/clicked and follow up automatically.', img: '/marketing/steps/step4.png' },
  { title: 'Book the appointment', desc: 'From first ping to set appointment—fast.', img: '/marketing/steps/step5.png' },
  { title: 'Win the job', desc: 'Proposals with real photos & language roofers use.', img: '/marketing/steps/step6.png' },
];

export default function ScrollWizard() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = Number(e.target.getAttribute('data-index'));
          setActive(idx);
        }
      });
    }, { threshold: 0.6 });

    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="demo" className="py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded">
            <div className="h-2 bg-black rounded" style={{width: `${((active+1)/STEPS.length)*100}%`}} />
          </div>
          <div className="text-sm opacity-70">{active+1}/{STEPS.length}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-10">
            {STEPS.map((s, i) => (
              <div key={i} data-index={i} ref={el => refs.current[i] = el} className={"p-4 border rounded " + (i === active ? "ring-2 ring-black" : "")}>
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm opacity-80">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="sticky top-24">
            <div className="border rounded overflow-hidden bg-white">
              <img src={STEPS[active].img} alt={STEPS[active].title} className="w-full" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setActive(Math.max(0, active-1))} className="px-3 py-1.5 border rounded">Previous</button>
              <button onClick={() => setActive(Math.min(STEPS.length-1, active+1))} className="px-3 py-1.5 border rounded">Next</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
