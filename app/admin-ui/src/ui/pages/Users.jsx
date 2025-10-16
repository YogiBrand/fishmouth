import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Users as UsersIcon,
  Wallet,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from 'lucide-react'
import Card from '../components/Card.jsx'
import DataTable from '../components/DataTable.jsx'
import StatTile from '../components/StatTile.jsx'
import Button from '../components/Button.jsx'
import { MultiLineChart } from '../components/TrendChart.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import Badge from '../components/Badge.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const formatCurrency = (value) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export default function Users() {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const skipSearchFetch = useRef(true)

  const loadUsers = useCallback(
    async (term = '') => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: '200' })
        if (term) {
          params.set('search', term)
        }
        const data = await fetchJSON(`/users?${params.toString()}`)
        setRows(data)
      } catch (err) {
        setError(err)
        pushToast({ title: err.message || 'Failed to load users', tone: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [pushToast]
  )

  useEffect(() => {
    loadUsers('')
  }, [loadUsers])

  useEffect(() => {
    if (skipSearchFetch.current) {
      skipSearchFetch.current = false
      return
    }
    const handle = setTimeout(() => {
      loadUsers(searchTerm.trim())
    }, 380)
    return () => clearTimeout(handle)
  }, [searchTerm, loadUsers])

  const loadDetail = useCallback(
    async (user) => {
      if (!user) {
        setDetail(null)
        return
      }
      setDetailLoading(true)
      try {
        const data = await fetchJSON(`/users/${user.user_id}`)
        setDetail(data)
      } catch (err) {
        pushToast({ title: err.message || 'Failed to load user detail', tone: 'error' })
      } finally {
        setDetailLoading(false)
      }
    },
    [pushToast]
  )

  useEffect(() => {
    if (selected) {
      loadDetail(selected)
    }
  }, [selected, loadDetail])

  const handleAdjustCredits = useCallback(
    async (delta) => {
      if (!selected) return
      setActionPending(true)
      try {
        await fetchJSON(`/users/${selected.user_id}/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta }),
        })
        pushToast({ title: `${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} credits` })
        await loadUsers(searchTerm.trim())
        await loadDetail(selected)
      } catch (err) {
        pushToast({ title: err.message || 'Failed to adjust credits', tone: 'error' })
      } finally {
        setActionPending(false)
      }
    },
    [selected, loadUsers, loadDetail, pushToast, searchTerm]
  )

  const handleRefund = useCallback(
    async (amountUsd) => {
      if (!selected) return
      setActionPending(true)
      try {
        await fetchJSON(`/users/${selected.user_id}/refunds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount_cents: Math.round(amountUsd * 100) }),
        })
        pushToast({ title: `Refund queued for ${formatCurrency(amountUsd)}` })
        await loadDetail(selected)
      } catch (err) {
        pushToast({ title: err.message || 'Failed to create refund', tone: 'error' })
      } finally {
        setActionPending(false)
      }
    },
    [selected, loadDetail, pushToast]
  )

  const totals = useMemo(() => {
    if (!rows.length) return { credits: 0, spend: 0, events: 0 }
    return rows.reduce(
      (acc, row) => ({
        credits: acc.credits + row.credits,
        spend: acc.spend + row.total_spend_usd,
        events: acc.events + row.events_30d,
      }),
      { credits: 0, spend: 0, events: 0 }
    )
  }, [rows])

  const columns = [
    {
      label: 'Email',
      key: 'email',
    },
    {
      label: 'Plan',
      key: 'plan',
      render: (row) => <Badge tone={row.plan === 'enterprise' ? 'success' : 'neutral'}>{row.plan}</Badge>,
    },
    {
      label: 'Credits',
      key: 'credits',
      align: 'right',
      render: (row) => row.credits.toLocaleString(),
    },
    {
      label: 'Spend (lifetime)',
      key: 'total_spend_usd',
      align: 'right',
      render: (row) => formatCurrency(row.total_spend_usd),
    },
    {
      label: 'Events (30d)',
      key: 'events_30d',
      align: 'right',
      render: (row) => row.events_30d.toLocaleString(),
    },
    {
      label: 'Last seen',
      key: 'last_seen_at',
      render: (row) => (row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : '—'),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>User accounts</h2>
          <p className="page-header__subtitle">
            Monitor credit balances, wallet activity, and recent automation throughput per account.
          </p>
        </div>
        <div className="page-actions">
          <div className="input-compact">
            <Search size={16} />
            <input
              placeholder="Search email or plan"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={() => loadUsers(searchTerm.trim())}>
            Reload
          </Button>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Accounts loaded"
          value={rows.length.toLocaleString()}
          deltaLabel="Limited to last 200 by activity"
          icon={UsersIcon}
        />
        <StatTile
          label="Total credits on books"
          value={totals.credits.toLocaleString()}
          deltaLabel="Across accounts in view"
          icon={Wallet}
        />
        <StatTile
          label="Lifetime spend"
          value={formatCurrency(totals.spend)}
          deltaLabel="Charges recorded in analytics"
          icon={CreditCard}
        />
        <StatTile
          label="Usage events (30d)"
          value={totals.events.toLocaleString()}
          deltaLabel="Aggregated across loaded accounts"
          icon={ArrowUpRight}
        />
      </div>

      <Card title="Accounts" meta="Click a row to inspect wallet and telemetry details">
        {loading && !rows.length ? (
          <LoadingState label="Loading accounts…" />
        ) : error && !rows.length ? (
          <ErrorState title="Unable to load users" description={error.message} retry={() => loadUsers(searchTerm)} />
        ) : (
          <DataTable columns={columns} rows={rows} keyField="user_id" onRowClick={setSelected} />
        )}
      </Card>

      {selected && (
        <div className="grid grid--two">
          <Card
            title="Account detail"
            meta={selected.email}
            actions={
              <Badge tone={selected.plan === 'enterprise' ? 'success' : 'neutral'}>
                Plan • {selected.plan}
              </Badge>
            }
          >
            {detailLoading || !detail ? (
              <LoadingState label="Loading account detail…" />
            ) : (
              <>
                <div className="grid grid--two">
                  <StatTile
                    label="Credits"
                    value={detail.user.credits.toLocaleString()}
                    deltaLabel={detail.user.events_30d ? `${detail.user.events_30d.toLocaleString()} events (30d)` : 'No usage recorded'}
                    icon={Wallet}
                  />
                  <StatTile
                    label="Lifetime spend"
                    value={formatCurrency(detail.user.total_spend_usd)}
                    deltaLabel={detail.user.last_charge_at ? `Last charge ${new Date(detail.user.last_charge_at).toLocaleDateString()}` : 'No payments yet'}
                    icon={CreditCard}
                  />
                </div>
                <div className="page-actions" style={{ justifyContent: 'flex-start' }}>
                  <Button
                    size="sm"
                    icon={ArrowUpRight}
                    onClick={() => handleAdjustCredits(100)}
                    disabled={actionPending}
                  >
                    Add 100 credits
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ArrowDownRight}
                    onClick={() => handleAdjustCredits(-100)}
                    disabled={actionPending}
                  >
                    Remove 100 credits
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RefreshCcw}
                    onClick={() => handleRefund(50)}
                    disabled={actionPending}
                  >
                    Refund $50
                  </Button>
                </div>
                <div className="section-divider" />
                <h4>Usage velocity (30 days)</h4>
                {detail.usage.length ? (
                  <MultiLineChart
                    data={detail.usage}
                    lines={[
                      { dataKey: 'events', color: 'var(--color-chart-a)' },
                      { dataKey: 'emails', color: 'var(--color-chart-b)' },
                      { dataKey: 'calls', color: 'var(--color-chart-c)' },
                    ]}
                    height={220}
                  />
                ) : (
                  <div className="empty-state">No recent usage captured for this account.</div>
                )}
              </>
            )}
          </Card>

          <Card title="Billing ledger" meta="Most recent transactions">
            {detailLoading || !detail ? (
              <LoadingState label="Loading ledger…" />
            ) : detail.transactions.length ? (
              <DataTable
                columns={[
                  { label: 'Date', key: 'created_at', render: (row) => new Date(row.created_at).toLocaleString() },
                  { label: 'Type', key: 'kind', render: (row) => row.kind },
                  {
                    label: 'Amount',
                    key: 'amount_cents',
                    align: 'right',
                    render: (row) => formatCurrency(row.amount_cents / 100),
                  },
                ]}
                rows={detail.transactions}
                keyField="txn_id"
              />
            ) : (
              <div className="empty-state">No transactions recorded yet.</div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
