import React, { useCallback, useEffect, useState } from 'react'
import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import Button from '../components/Button.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'
import { Plus, Play, RefreshCcw, Map } from 'lucide-react'

export default function Leads() {
  const { pushToast } = useToast()
  const [userId, setUserId] = useState('')
  const [seedForm, setSeedForm] = useState({ lat: 29.7604, lon: -95.3698, radius_m: 5000, sample: 1000 })
  const [lists, setLists] = useState({ hot: [], warm: [], locked: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionPending, setActionPending] = useState(false)
  const [polygon, setPolygon] = useState('')
  const [clusters, setClusters] = useState([])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJSON(`/leads/${userId}`)
      setLists(data)
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load leads', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [userId, pushToast])

  useEffect(() => {
    load()
  }, [load])

  const handleSeed = async (e) => {
    e.preventDefault()
    if (!userId) {
      pushToast({ title: 'Enter a user_id to seed', tone: 'error' })
      return
    }
    setActionPending(true)
    try {
      await fetchJSON('/leads/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...seedForm }),
      })
      pushToast({ title: 'Seed complete' })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Seed failed', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleRedeem = async (lead) => {
    if (!userId) return
    setActionPending(true)
    try {
      await fetchJSON('/leads/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lead_id: lead.id, cost_credits: 10 }),
      })
      pushToast({ title: 'Lead unlocked' })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Redeem failed', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleScan = async (lead) => {
    if (!lead || !lead.id) return
    setActionPending(true)
    try {
      await fetchJSON(`/leads/${lead.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      pushToast({ title: `Scan complete for lead ${lead.id}` })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Scan failed', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleSeedPolygon = async (e) => {
    e.preventDefault()
    if (!userId) {
      pushToast({ title: 'Enter a user_id to seed', tone: 'error' })
      return
    }
    let parsed
    try {
      parsed = JSON.parse(polygon)
      if (!Array.isArray(parsed) || parsed.length < 3) throw new Error('invalid polygon')
    } catch (err) {
      pushToast({ title: 'Polygon must be a JSON array of [lat, lon] pairs', tone: 'error' })
      return
    }
    setActionPending(true)
    try {
      const res = await fetchJSON('/leads/polygon/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, lat: seedForm.lat, lon: seedForm.lon, radius_m: seedForm.radius_m, sample: seedForm.sample, polygon: parsed }),
      })
      setClusters(Array.isArray(res?.clusters) ? res.clusters : [])
      pushToast({ title: `Polygon seeded (${res?.seeded ?? 0})` })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Polygon seed failed', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const columns = [
    { label: 'ID', key: 'id' },
    { label: 'Score', key: 'score' },
    { label: 'Lat', key: 'lat' },
    { label: 'Lon', key: 'lon' },
    { label: 'Expected value', key: 'expected_revenue' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="row-actions">
          <Button size="sm" variant="ghost" icon={Play} onClick={() => handleRedeem(row)} disabled={actionPending}>
            Redeem
          </Button>
          <Button size="sm" variant="ghost" icon={Map} onClick={() => handleScan(row)} disabled={actionPending}>
            Perform Roof Scan
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Leads</h2>
          <p className="page-header__subtitle">Seed hot roofs, unlock targets, and kick off outreach.</p>
        </div>
        <div className="page-actions">
          <div className="input-compact">
            <input placeholder="user_id (uuid)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <Card title="Seed candidates" meta="Generate starter leads by proximity">
        <form className="form-grid form-grid--four" onSubmit={handleSeed}>
          <div className="form-field">
            <label>Lat</label>
            <input type="number" step="any" value={seedForm.lat} onChange={(e) => setSeedForm((p) => ({ ...p, lat: Number(e.target.value) }))} />
          </div>
          <div className="form-field">
            <label>Lon</label>
            <input type="number" step="any" value={seedForm.lon} onChange={(e) => setSeedForm((p) => ({ ...p, lon: Number(e.target.value) }))} />
          </div>
          <div className="form-field">
            <label>Radius (m)</label>
            <input type="number" value={seedForm.radius_m} onChange={(e) => setSeedForm((p) => ({ ...p, radius_m: Number(e.target.value) }))} />
          </div>
          <div className="form-field">
            <label>Sample</label>
            <input type="number" value={seedForm.sample} onChange={(e) => setSeedForm((p) => ({ ...p, sample: Number(e.target.value) }))} />
          </div>
          <div className="form-actions">
            <Button type="submit" icon={actionPending ? undefined : Plus} disabled={actionPending || !userId}>
              {actionPending ? <span className="spinner" /> : 'Seed leads'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Polygon seed" meta="Paste JSON array of [lat, lon] pairs" actions={<Button size="sm" variant="ghost" icon={Map} onClick={handleSeedPolygon} disabled={actionPending || !userId}>Seed polygon</Button>}>
        <div className="form-grid">
          <div className="form-field">
            <label>Polygon (JSON)</label>
            <textarea rows={4} value={polygon} onChange={(e) => setPolygon(e.target.value)} placeholder='[[29.75,-95.40],[29.77,-95.40],[29.77,-95.36],[29.75,-95.36]]' />
          </div>
        </div>
        {clusters?.length ? (
          <div className="list" style={{ marginTop: 8 }}>
            {clusters.map((c, idx) => (
              <div className="list-item" key={idx}>
                <div>
                  <strong>Cluster {idx + 1}</strong>
                  <div className="card__meta">{c.count} points</div>
                </div>
                <div className="list-item__meta">
                  <span>{c.center?.lat?.toFixed(5)}, {c.center?.lon?.toFixed(5)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {loading && !lists.hot.length && !lists.warm.length ? (
        <LoadingState label="Loading leads…" />
      ) : error && !lists.hot.length && !lists.warm.length ? (
        <ErrorState title="Unable to load leads" description={error.message} retry={load} />
      ) : (
        <div className="grid grid--two">
          <Card
            title="Hot"
            meta={`${lists.hot.length} targets`}
            actions={
              <Button
                size="sm"
                icon={Map}
                onClick={() => lists.hot?.length ? handleScan(lists.hot[0]) : null}
                disabled={actionPending || !lists.hot?.length}
              >
                Perform Roof Scan
              </Button>
            }
          >
            <DataTable columns={columns} rows={lists.hot} keyField="id" />
          </Card>
          <Card title="Warm" meta={`${lists.warm.length} targets`}>
            <DataTable columns={columns} rows={lists.warm} keyField="id" />
          </Card>
        </div>
      )}
    </>
  )
}


