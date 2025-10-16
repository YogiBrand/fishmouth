import React, { useCallback, useEffect, useState } from 'react'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import DataTable from '../components/DataTable.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'
import { Play, RefreshCcw } from 'lucide-react'

export default function Permits() {
  const { pushToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ city: '', state: '', urls: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchJSON('/scraper/jobs')
      setJobs(data?.jobs || [])
    } catch (err) {
      pushToast({ title: err.message || 'Failed to load jobs', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => { load() }, [load])

  const submit = async (e) => {
    e.preventDefault()
    const urls = form.urls.split(/\n|,|\s+/).map((u) => u.trim()).filter(Boolean)
    if (!urls.length || !form.city || !form.state) {
      pushToast({ title: 'Enter city/state and at least one URL', tone: 'error' })
      return
    }
    try {
      await fetchJSON('/scraper/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: 'permit', city: form.city, state: form.state, urls }),
      })
      pushToast({ title: 'Scraper job created' })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Failed to create job', tone: 'error' })
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Permits scraper</h2>
          <p className="page-header__subtitle">Dispatch scraping jobs and track status</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={load}>Refresh</Button>
        </div>
      </div>

      <Card title="Create job" meta="City/state and target URLs">
        <form className="form-grid" onSubmit={submit}>
          <div className="form-field">
            <label>City</label>
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>State</label>
            <input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>URLs (comma/newline separated)</label>
            <textarea rows={3} value={form.urls} onChange={(e) => setForm((p) => ({ ...p, urls: e.target.value }))} />
          </div>
          <div className="form-actions">
            <Button icon={Play} type="submit" disabled={loading}>Create job</Button>
          </div>
        </form>
      </Card>

      <Card title="Recent jobs" meta="Latest scraping jobs">
        <DataTable
          columns={[
            { label: 'ID', key: 'id' },
            { label: 'Type', key: 'job_type' },
            { label: 'City', key: 'city' },
            { label: 'State', key: 'state' },
            { label: 'Status', key: 'status' },
            { label: 'Processed', key: 'records_processed' },
            { label: 'Succeeded', key: 'records_succeeded' },
            { label: 'Failed', key: 'records_failed' },
          ]}
          rows={jobs}
          keyField="id"
        />
      </Card>
    </>
  )
}


