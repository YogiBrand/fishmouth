import React, { useEffect, useState } from 'react'

export default function JobsQueues(){
  const API = import.meta.env.VITE_ADMIN_API
  const [rows, setRows] = useState([])
  useEffect(()=>{
    fetch(API + '/queues/jobs').then(r=>r.json()).then(d=>setRows(d.jobs || d || []))
  },[])
  return (
    <div className="card">
      <h3>Jobs & Queues</h3>
      <table><thead><tr><th>ID</th><th>Status</th><th>Progress</th><th>Updated</th></tr></thead>
      <tbody>{(rows||[]).map((r,i)=>(
        <tr key={r.id || i}><td>{r.id || i}</td><td>{r.status}</td><td>{r.percent || r.progress || '-'}</td><td>{r.updated_at || '-'}</td></tr>
      ))}</tbody></table>
    </div>
  )
}
