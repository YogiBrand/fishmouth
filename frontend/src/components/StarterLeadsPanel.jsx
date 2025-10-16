import React, { useCallback, useEffect, useState } from 'react'

export default function StarterLeadsPanel({ apiBase = '', userId }){
  const [data, setData] = useState({hot:[],warm:[],locked:[]})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try{
      const r = await fetch(`${apiBase}/onboarding/leads/${userId}`)
      const j = await r.json()
      setData(j)
    }catch(e){ setErr(String(e)) }
    setLoading(false)
  }, [apiBase, userId])
  useEffect(()=>{ load() }, [load])

  async function redeem(leadId, cost=10){
    setRedeeming(true)
    try{
      const r = await fetch(`${apiBase}/onboarding/redeem`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user_id:userId, lead_id: leadId, cost_credits: cost})})
      if(!r.ok){ throw new Error(await r.text()) }
      await load()
    }catch(e){ alert('Redeem failed: '+e) }
    setRedeeming(false)
  }

  if(loading) return <div className="card"><h3>Starter Leads</h3><p>Loading…</p></div>
  if(err) return <div className="card"><h3>Starter Leads</h3><p>Error: {err}</p></div>

  const Section = ({title, items}) => (
    <section className="card">
      <h4>{title} ({items.length})</h4>
      <table><thead><tr><th>ID</th><th>Lat</th><th>Lon</th><th>Score</th><th>Expected Rev</th><th>Action</th></tr></thead>
      <tbody>
        {items.map(l => (
          <tr key={l.id}>
            <td>{l.id}</td>
            <td>{l.lat.toFixed(5)}</td>
            <td>{l.lon.toFixed(5)}</td>
            <td>{l.score.toFixed(1)}</td>
            <td>${l.expected_revenue.toLocaleString()}</td>
            <td>
              {l.locked ? <button disabled={redeeming} onClick={()=>redeem(l.id, 10)}>Redeem (10 cr)</button> : 'Unlocked'}
            </td>
          </tr>
        ))}
      </tbody></table>
    </section>
  )

  return (
    <div className="grid">
      <Section title="🔥 Hot" items={data.hot} />
      <Section title="Warm" items={data.warm} />
      <Section title="Locked (teasers)" items={data.locked} />
    </div>
  )
}
