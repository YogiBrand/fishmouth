import React, { useEffect, useState } from 'react'

export default function Messaging(){
  const API = import.meta.env.VITE_ADMIN_API
  const [providers, setProviders] = useState([])
  const [domain, setDomain] = useState('')
  const [dkimSelector, setSel] = useState('default')
  const [verify, setVerify] = useState(null)

  const load = ()=> fetch(API + '/messaging/providers').then(r=>r.json()).then(setProviders)
  useEffect(load,[])

  async function saveProvider(e){
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = Object.fromEntries(fd.entries())
    await fetch(API + '/messaging/providers', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)})
    load()
  }

  async function checkDomain(e){
    e.preventDefault()
    const r = await fetch(API + '/messaging/domain/verify', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({domain, dkim_selector: dkimSelector})})
    setVerify(await r.json())
  }

  return (
    <div className="card">
      <h3>Messaging</h3>
      <div className="grid">
        <section className="card">
          <h4>Providers</h4>
          <form onSubmit={saveProvider}>
            <label>Name<select name="name"><option>smtp</option><option>resend</option><option>sendgrid</option><option>mailgun</option><option>ses</option></select></label>
            <label>API Key<input name="api_key" placeholder="provider api key" /></label>
            <label>SMTP Host<input name="smtp_host" /></label>
            <label>SMTP Port<input name="smtp_port" type="number" /></label>
            <label>SMTP User<input name="smtp_user" /></label>
            <label>SMTP Pass<input name="smtp_pass" type="password" /></label>
            <label>From Email<input name="from_email" /></label>
            <label>From Name<input name="from_name" /></label>
            <label>Domain<input name="domain" /></label>
            <button>Save</button>
          </form>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(providers,null,2)}</pre>
        </section>
        <section className="card">
          <h4>Domain & Deliverability</h4>
          <form onSubmit={checkDomain}>
            <label>Domain<input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com"/></label>
            <label>DKIM Selector<input value={dkimSelector} onChange={e=>setSel(e.target.value)}/></label>
            <button>Verify DNS</button>
          </form>
          {verify && <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(verify,null,2)}</pre>}
        </section>
      </div>
    </div>
  )
}
