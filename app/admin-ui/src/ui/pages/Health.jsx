import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { HeartPulse, AlertTriangle, RefreshCcw, ServerCog } from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const statusTone = (status) => {
  if (status === 'ok') return 'success'
  if (status === 'degraded') return 'warning'
  return 'danger'
}

export default function Health() {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [services, setServices] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJSON('/health/services')
      setServices(data)
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load health data', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    load()
  }, [load])

  const aggregates = useMemo(() => {
    const total = services.length
    const ok = services.filter((s) => s.status === 'ok').length
    const degraded = services.filter((s) => s.status === 'degraded').length
    const down = services.filter((s) => s.status === 'down').length
    return { total, ok, degraded, down }
  }, [services])

  const grouped = useMemo(() => {
    const map = new Map()
    services.forEach((service) => {
      if (!map.has(service.group)) map.set(service.group, [])
      map.get(service.group).push(service)
    })
    return Array.from(map.entries())
  }, [services])

  if (loading && !services.length) {
    return <LoadingState label="Polling service health…" />
  }

  if (error && !services.length) {
    return <ErrorState title="Unable to load health" description={error.message} retry={load} />
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Platform health</h2>
          <p className="page-header__subtitle">
            Combined view across Postgres, Redis, telemetry gateways, orchestrator, and data services.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={load}>
            Refresh checks
          </Button>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Services healthy"
          value={`${aggregates.ok}/${aggregates.total}`}
          deltaLabel={`${aggregates.degraded} degraded`}
          icon={HeartPulse}
        />
        <StatTile
          label="Down services"
          value={aggregates.down.toString()}
          deltaLabel="Immediate attention required"
          icon={AlertTriangle}
          positive={false}
        />
        <StatTile
          label="Service groups"
          value={grouped.length.toString()}
          deltaLabel="Core, pipelines, data, observability"
          icon={ServerCog}
        />
      </div>

      {grouped.map(([group, entries]) => (
        <Card key={group} title={group} meta={`${entries.length} services`}>
          <div className="list">
            {entries.map((service) => (
              <div className="list-item" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  {service.message && <div className="card__meta">{service.message}</div>}
                </div>
                <div className="list-item__meta">
                  <Badge tone={statusTone(service.status)}>{service.status}</Badge>
                  <span>{service.latency_ms != null ? `${service.latency_ms.toFixed(0)} ms` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  )
}
