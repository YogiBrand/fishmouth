import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Users as UsersIcon, RefreshCcw, Download } from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import DataTable from '../components/DataTable.jsx'
import Button from '../components/Button.jsx'
import { AreaTrendChart, MultiLineChart } from '../components/TrendChart.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const COLOR_SEQUENCE = ['var(--color-chart-a)', 'var(--color-chart-b)', 'var(--color-chart-c)', 'var(--color-chart-d)']

export default function Usage() {
  const { pushToast } = useToast()
  const [days, setDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJSON(`/usage/summary?days=${days}`)
      setSummary(data)
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load usage analytics', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast, days])

  useEffect(() => {
    load()
  }, [load])

  const topServices = useMemo(() => summary?.services.slice(0, 4) || [], [summary])
  const usageHistory = useMemo(() => summary?.history || [], [summary])

  const lines = useMemo(
    () =>
      topServices.map((service, idx) => ({
        dataKey: service.service,
        color: COLOR_SEQUENCE[idx % COLOR_SEQUENCE.length],
      })),
    [topServices]
  )

  if (loading && !summary) {
    return <LoadingState label="Loading usage telemetry…" />
  }

  if (error && !summary) {
    return <ErrorState title="Unable to load usage" description={error.message} retry={load} />
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Usage analytics</h2>
          <p className="page-header__subtitle">
            Observe how services are consumed, which endpoints drive volume, and which cohorts are most active.
          </p>
        </div>
        <div className="page-actions">
          <div className="tabs">
            {[7, 14, 30, 60].map((option) => (
              <button
                key={option}
                type="button"
                className={days === option ? 'active' : ''}
                onClick={() => setDays(option)}
              >
                {option}d
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Events captured"
          value={summary.total_events.toLocaleString()}
          deltaLabel={`${summary.events_24h.toLocaleString()} in last 24h`}
          icon={Activity}
        />
        <StatTile
          label="Active users"
          value={summary.unique_users.toLocaleString()}
          deltaLabel={`Top services: ${topServices.map((s) => s.service).join(', ') || '—'}`}
          icon={UsersIcon}
        />
      </div>

      <div className="grid grid--two">
        <Card title="Total footprint" meta={`Aggregate usage over last ${days} days`}>
          <AreaTrendChart
            data={usageHistory}
            areas={[{ dataKey: 'total_calls', color: 'var(--color-chart-a)' }]}
          />
        </Card>

        <Card title="Top services" meta="Calls per service" actions={<Button variant="ghost" size="sm" icon={Download} onClick={() => pushToast({ title: 'Download coming soon' })}>Export CSV</Button>}>
          {summary.services.length ? (
            <DataTable
              columns={[
                { label: 'Service', key: 'service' },
                { label: 'Calls', key: 'calls', align: 'right', render: (row) => row.calls.toLocaleString() },
                {
                  label: 'Δ',
                  key: 'change_pct',
                  align: 'right',
                  render: (row) =>
                    row.change_pct != null ? `${row.change_pct > 0 ? '+' : ''}${row.change_pct}%` : '–',
                },
              ]}
              rows={summary.services}
            />
          ) : (
            <div className="empty-state">No usage recorded yet.</div>
          )}
        </Card>
      </div>

      <Card title="Service breakdown" meta="Daily activity for leading services">
        {lines.length ? (
          <MultiLineChart data={usageHistory} lines={lines} />
        ) : (
          <div className="empty-state">Not enough service data to chart.</div>
        )}
      </Card>

      <Card title="Top routes" meta="Most frequently accessed API endpoints">
        <DataTable
          columns={[
            { label: 'Service', key: 'service' },
            { label: 'Route', key: 'route', render: (row) => row.route || '—' },
            { label: 'Calls', key: 'calls', align: 'right', render: (row) => row.calls.toLocaleString() },
          ]}
          rows={summary.top_routes}
        />
      </Card>
    </>
  )
}
