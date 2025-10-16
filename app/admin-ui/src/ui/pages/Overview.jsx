import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Flame,
  Mail,
  Phone,
  Users as UsersIcon,
  RefreshCw,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import { AreaTrendChart, MultiLineChart } from '../components/TrendChart.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const statusTone = (status) => {
  if (status === 'ok') return 'success'
  if (status === 'degraded') return 'warning'
  return 'danger'
}

export default function Overview() {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [kpi, setKpi] = useState([])
  const [usage, setUsage] = useState(null)
  const [costs, setCosts] = useState(null)
  const [health, setHealth] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kpiData, usageData, costData, healthData] = await Promise.all([
        fetchJSON('/kpi/daily'),
        fetchJSON('/usage/summary?days=30'),
        fetchJSON('/costs/summary?days=30'),
        fetchJSON('/health/services'),
      ])
      setKpi(kpiData)
      setUsage(usageData)
      setCosts(costData)
      setHealth(healthData)
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load overview', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    load()
  }, [load])

  const kpiTimeline = useMemo(() => {
    return [...kpi].sort((a, b) => a.day.localeCompare(b.day))
  }, [kpi])

  const kpiTotals = useMemo(() => {
    if (!kpiTimeline.length) {
      return { leads: 0, emails: 0, calls: 0, dau: 0 }
    }
    return kpiTimeline.reduce(
      (acc, row) => ({
        leads: acc.leads + row.leads,
        emails: acc.emails + row.emails,
        calls: acc.calls + row.calls,
        dau: Math.max(acc.dau, row.dau),
      }),
      { leads: 0, emails: 0, calls: 0, dau: 0 }
    )
  }, [kpiTimeline])

  const deltaFor = useCallback(
    (key) => {
      if (kpiTimeline.length < 2) return null
      const last = kpiTimeline[kpiTimeline.length - 1][key]
      const prev = kpiTimeline[kpiTimeline.length - 2][key]
      if (!prev) return null
      const change = ((last - prev) / prev) * 100
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs. prev day`
    },
    [kpiTimeline]
  )

  if (loading && !usage) {
    return (
      <div className="grid">
        <LoadingState label="Loading dashboard…" />
      </div>
    )
  }

  if (error && !usage) {
    return (
      <ErrorState
        title="Unable to load overview"
        description={error.message}
        retry={load}
      />
    )
  }

  const criticalServices = (health || []).filter((item) => item.group === 'core').slice(0, 3)
  const degraded = (health || []).filter((item) => item.status !== 'ok')

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Operational Overview</h2>
          <p className="page-header__subtitle">
            Live telemetry across leads, communications, compute spend, and service health.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Leads generated (30d)"
          value={kpiTotals.leads.toLocaleString()}
          deltaLabel={deltaFor('leads') || 'Tracking previous cadence'}
          icon={Flame}
        />
        <StatTile
          label="Emails sent (30d)"
          value={kpiTotals.emails.toLocaleString()}
          deltaLabel={deltaFor('emails') || 'Healthy volume'}
          icon={Mail}
        />
        <StatTile
          label="Calls launched (30d)"
          value={kpiTotals.calls.toLocaleString()}
          deltaLabel={deltaFor('calls') || 'Stable engagement'}
          icon={Phone}
        />
        <StatTile
          label="Active users peak"
          value={kpiTotals.dau.toLocaleString()}
          deltaLabel="Peak DAU over last 30 days"
          icon={UsersIcon}
        />
      </div>

      <div className="grid grid--two">
        <Card
          title="Lead, Email & Call flow"
          meta="Trend over the past 30 days"
          actions={<Badge tone="neutral"><BarChart3 size={14} />Multi-channel velocity</Badge>}
        >
          {kpiTimeline.length ? (
            <MultiLineChart
              data={kpiTimeline}
              lines={[
                { dataKey: 'leads', color: 'var(--color-chart-a)' },
                { dataKey: 'emails', color: 'var(--color-chart-b)' },
                { dataKey: 'calls', color: 'var(--color-chart-c)' },
              ]}
            />
          ) : (
            <LoadingState label="Awaiting KPI data…" />
          )}
        </Card>

        <Card title="Usage envelope" meta="Unique events captured across all services">
          {usage ? (
            <>
              <div className="stat-tile" style={{ position: 'relative' }}>
                <div className="stat-tile__label">Events (30d)</div>
                <div className="stat-tile__value">{usage.total_events.toLocaleString()}</div>
                <div className="stat-tile__delta delta-up">
                  {usage.events_24h.toLocaleString()} in last 24h
                </div>
              </div>
              <AreaTrendChart
                data={usage.history}
                areas={[
                  { dataKey: 'total_calls', color: 'var(--color-chart-a)' },
                ]}
              />
            </>
          ) : (
            <LoadingState label="Loading usage summary…" />
          )}
        </Card>
      </div>

      <div className="grid grid--two">
        <Card title="Service load mix" meta="Calls aggregated by service, last 30 days">
          {usage ? (
            <DataTable
              columns={[
                { label: 'Service', key: 'service' },
                { label: 'Calls', key: 'calls', render: (row) => row.calls.toLocaleString() },
                {
                  label: 'Δ vs prev window',
                  key: 'change_pct',
                  render: (row) =>
                    row.change_pct != null ? `${row.change_pct > 0 ? '+' : ''}${row.change_pct}%` : '–',
                },
              ]}
              rows={usage.services}
            />
          ) : (
            <LoadingState label="Loading service mix…" />
          )}
        </Card>

        <Card title="Top routes" meta="Most active API paths (30d)">
          {usage ? (
            <DataTable
              columns={[
                { label: 'Service', key: 'service' },
                { label: 'Route', key: 'route', render: (row) => row.route || '—' },
                { label: 'Calls', key: 'calls', render: (row) => row.calls.toLocaleString() },
              ]}
              rows={usage.top_routes}
              renderEmpty={<div className="table__empty">No usage recorded yet.</div>}
            />
          ) : (
            <LoadingState label="Loading route analytics…" />
          )}
        </Card>
      </div>

      <div className="grid grid--two">
        <Card
          title="Revenue vs Cost"
          meta="Reconciled from analytics.margin_daily"
          actions={
            <Badge tone={costs && costs.margin_rate >= 40 ? 'success' : 'warning'}>
              <Activity size={14} />
              Margin {costs ? `${costs.margin_rate.toFixed(1)}%` : '—'}
            </Badge>
          }
        >
          {costs ? (
            <AreaTrendChart
              data={costs.timeline}
              areas={[
                { dataKey: 'revenue_usd', color: 'var(--color-chart-a)' },
                { dataKey: 'cost_usd', color: 'var(--color-chart-c)' },
                { dataKey: 'margin_usd', color: 'var(--color-chart-d)' },
              ]}
            />
          ) : (
            <LoadingState label="Loading margin timeline…" />
          )}
        </Card>

        <Card title="Top cost drivers" meta="Spend grouped by service & provider">
          {costs ? (
            <DataTable
              columns={[
                { label: 'Service', key: 'service' },
                { label: 'Integration', key: 'item' },
                {
                  label: 'Cost (USD)',
                  key: 'cost_usd',
                  render: (row) => row.cost_usd.toLocaleString(undefined, { style: 'currency', currency: 'USD' }),
                },
              ]}
              rows={costs.top_costs}
            />
          ) : (
            <LoadingState label="Loading cost breakdown…" />
          )}
        </Card>
      </div>

      <Card
        title="Service health"
        meta="Latency sampled via admin telemetry across dockerized stack"
        actions={
          degraded.length ? (
            <Badge tone="warning">
              <AlertTriangle size={14} />
              {degraded.length} attention needed
            </Badge>
          ) : (
            <Badge tone="success">All systems nominal</Badge>
          )
        }
      >
        <div className="list">
          {(criticalServices.length ? criticalServices : health).map((service) => (
            <div className="list-item" key={service.name}>
              <div>
                <strong>{service.name}</strong>
                <div className="card__meta">{service.group}</div>
              </div>
              <div className="list-item__meta">
                <Badge tone={statusTone(service.status)}>{service.status}</Badge>
                <span>
                  {service.latency_ms != null ? `${service.latency_ms.toFixed(0)} ms` : '—'}
                </span>
                {service.message && <span>{service.message}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
