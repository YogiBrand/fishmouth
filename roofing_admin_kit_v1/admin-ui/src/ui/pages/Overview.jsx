import React, {useEffect, useState} from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Overview(){
  const [kpi, setKpi] = useState([])
  useEffect(()=>{
    fetch(import.meta.env.VITE_ADMIN_API + '/kpi/daily').then(r=>r.json()).then(setKpi)
  },[])
  return (
    <div className="grid">
      <section className="card">
        <h3>Leads / Emails / Calls (last 30d)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={kpi}>
            <XAxis dataKey="day"/><YAxis/>
            <Tooltip/>
            <Line type="monotone" dataKey="leads"/>
            <Line type="monotone" dataKey="emails"/>
            <Line type="monotone" dataKey="calls"/>
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="card"><h3>DAU</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={kpi}>
            <XAxis dataKey="day"/><YAxis/>
            <Tooltip/>
            <Line type="monotone" dataKey="dau"/>
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
