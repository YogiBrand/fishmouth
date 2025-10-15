import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Coins, TrendingUp, RefreshCcw, ArrowUpRight } from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import DataTable from '../components/DataTable.jsx'
import Button from '../components/Button.jsx'
import { AreaTrendChart } from '../components/TrendChart.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import Badge from '../components/Badge.jsx'
import { useToast } from '../components/ToastProvider.jsx'

const API = import.meta.env.VITE_ADMIN_API

const fetchJSON = async (path) => {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Request failed with ${res.status}`)
  }
  return res.json()
}

const formatCurrency = (value) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export default function Costs() {
  const { pushToast } = useToast()
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJSON(`/costs/summary?days=${days}`)
      setSummary(data)
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load cost analytics', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast, days])

  useEffect(() => {
    load()
  }, [load])

  const marginTrend = useMemo(() => summary?.timeline || [], [summary])

  if (loading && !summary) {
    return <LoadingState label="Loading cost analytics…" />
  }

  if (error && !summary) {
    return <ErrorState title="Unable to load costs" description={error.message} retry={load} />
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Revenue & cost</h2>
          <p className="page-header__subtitle">
            Blend Stripe billing with API spend to keep gross margin and channel profitability dialed in.
          </p>
        </div>
        <div className="page-actions">
          <div className="tabs">
            {[7, 30, 60, 90].map((option) => (
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
          label="Revenue (window)"
          value={formatCurrency(summary.total_revenue)}
          deltaLabel="Gross cash collected"
          icon={Coins}
        />
        <StatTile
          label="Cost (window)"
          value={formatCurrency(summary.total_cost)}
          deltaLabel="API + infra spend"
          icon={ArrowUpRight}
          positive={false}
        />
        <StatTile
          label="Gross margin"
          value={formatCurrency(summary.total_margin)}
          deltaLabel={`Margin rate ${summary.margin_rate.toFixed(1)}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid--two">
        <Card
          title="Revenue vs cost"
          meta={`Window: last ${days} days`}
          actions={
            <Badge tone={summary.margin_rate >= 40 ? 'success' : 'warning'}>
              Margin {summary.margin_rate.toFixed(1)}%
            </Badge>
          }
        >
          <AreaTrendChart
            data={marginTrend}
            areas={[
              { dataKey: 'revenue_usd', color: 'var(--color-chart-a)' },
              { dataKey: 'cost_usd', color: 'var(--color-chart-c)' },
              { dataKey: 'margin_usd', color: 'var(--color-chart-d)' },
            ]}
          />
        </Card>

        <Card title="Top cost drivers" meta="Aggregated from analytics.cost_events">
          {summary.top_costs.length ? (
            <DataTable
              columns={[
                { label: 'Service', key: 'service' },
                { label: 'Item', key: 'item' },
                {
                  label: 'Cost',
                  key: 'cost_usd',
                  align: 'right',
                  render: (row) => formatCurrency(row.cost_usd),
                },
              ]}
              rows={summary.top_costs}
            />
          ) : (
            <div className="empty-state">No cost data in this window.</div>
          )}
        </Card>
      </div>
    </>
  )
}
