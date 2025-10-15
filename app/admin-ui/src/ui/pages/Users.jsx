import React,{useEffect,useState} from 'react'

export default function Users(){
  const [rows, setRows] = useState([])
  useEffect(()=>{
    fetch(import.meta.env.VITE_ADMIN_API + '/users').then(r=>r.json()).then(setRows)
  },[])
  return (
    <div className="card">
      <h3>Users</h3>
      <table><thead><tr><th>Email</th><th>Plan</th><th>Credits</th><th>Created</th></tr></thead>
      <tbody>
        {rows.map(r=>(<tr key={r.user_id}><td>{r.email}</td><td>{r.plan}</td><td>{r.credits}</td><td>{r.created_at}</td></tr>))}
      </tbody></table>
    </div>
  )
}
