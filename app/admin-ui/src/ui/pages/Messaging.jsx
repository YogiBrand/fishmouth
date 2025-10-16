import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Send, Cloud, Globe, ShieldCheck, RefreshCcw, Plus } from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import Button from '../components/Button.jsx'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const providerOptions = ['smtp', 'resend', 'sendgrid', 'mailgun', 'ses']

export default function Messaging() {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [providers, setProviders] = useState([])
  const [summary, setSummary] = useState(null)
  const [providerForm, setProviderForm] = useState({
    name: 'smtp',
    api_key: '',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    from_name: '',
    domain: '',
  })
  const [testForm, setTestForm] = useState({
    provider: '',
    to_email: '',
    subject: 'Test from Admin',
    text: 'This is a live deliverability test.',
  })
  const [domainForm, setDomainForm] = useState({ domain: '', dkim_selector: 'default' })
  const [domainResult, setDomainResult] = useState(null)
  const [cloudflareForm, setCloudflareForm] = useState({ zone_id: '', token: '', name: '', content: '', type: 'TXT' })
  const [actionPending, setActionPending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [providerList, providerSummary] = await Promise.all([
        fetchJSON('/messaging/providers'),
        fetchJSON('/messaging/summary?days=30'),
      ])
      setProviders(providerList)
      setSummary(providerSummary)
      if (!providerList.length) {
        setTestForm((prev) => ({ ...prev, provider: '' }))
      } else {
        setTestForm((prev) => ({ ...prev, provider: prev.provider || providerList[0].name }))
      }
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load messaging data', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    load()
  }, [load])

  const handleProviderChange = (field) => (event) => {
    setProviderForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSaveProvider = async (event) => {
    event.preventDefault()
    setActionPending(true)
    try {
      await fetchJSON('/messaging/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      })
      pushToast({ title: `Provider ${providerForm.name} saved` })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Failed to save provider', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleTestSend = async (event) => {
    event.preventDefault()
    setActionPending(true)
    try {
      await fetchJSON('/messaging/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testForm),
      })
      pushToast({ title: `Test sent via ${testForm.provider}` })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Failed to send test', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleVerifyDomain = async (event) => {
    event.preventDefault()
    setActionPending(true)
    try {
      const result = await fetchJSON('/messaging/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domainForm),
      })
      setDomainResult(result)
      pushToast({ title: `Verified DNS for ${domainForm.domain}` })
    } catch (err) {
      pushToast({ title: err.message || 'Failed to verify DNS', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const handleCloudflareApply = async (event) => {
    event.preventDefault()
    setActionPending(true)
    try {
      await fetchJSON('/cloudflare/dns/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudflareForm),
      })
      pushToast({ title: 'Cloudflare DNS change requested' })
      await load()
    } catch (err) {
      pushToast({ title: err.message || 'Cloudflare update failed', tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  const dnsStatus = useMemo(() => {
    if (!domainResult) return []
    return [
      { type: 'SPF', records: domainResult.spf || [] },
      { type: 'DKIM', records: domainResult.dkim || [] },
      { type: 'DMARC', records: domainResult.dmarc || [] },
    ]
  }, [domainResult])

  if (loading && !summary) {
    return <LoadingState label="Loading messaging system…" />
  }

  if (error && !summary) {
    return <ErrorState title="Unable to load messaging" description={error.message} retry={load} />
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Messaging orchestration</h2>
          <p className="page-header__subtitle">
            Administer providers, verify deliverability, and launch inbox tests across SMTP and API channels.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile
          label="Configured providers"
          value={providers.length.toString()}
          deltaLabel={`${summary?.total_tests || 0} tests in last 30 days`}
          icon={Mail}
        />
        <StatTile
          label="Deliverability tests (30d)"
          value={(summary?.total_tests || 0).toString()}
          deltaLabel={`${summary?.cloudflare_changes || 0} DNS pushes`}
          icon={Send}
        />
        <StatTile
          label="Cloudflare updates"
          value={(summary?.cloudflare_changes || 0).toString()}
          deltaLabel="Applied via admin"
          icon={Cloud}
        />
        <StatTile
          label="DKIM selector"
          value={domainForm.dkim_selector || 'default'}
          deltaLabel={domainForm.domain || 'Set domain to monitor'}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid--two">
        <Card title="Provider configuration" meta="Add or update SMTP/API credentials" actions={<Badge tone="neutral">Secure vault</Badge>}>
          <form className="form-grid form-grid--two" onSubmit={handleSaveProvider}>
            <div className="form-field">
              <label>Provider</label>
              <select value={providerForm.name} onChange={handleProviderChange('name')}>
                {providerOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>API key</label>
              <input
                value={providerForm.api_key}
                onChange={handleProviderChange('api_key')}
                placeholder="Provider API key"
              />
            </div>
            <div className="form-field">
              <label>SMTP host</label>
              <input value={providerForm.smtp_host} onChange={handleProviderChange('smtp_host')} placeholder="smtp.provider.com" />
            </div>
            <div className="form-field">
              <label>SMTP port</label>
              <input value={providerForm.smtp_port} onChange={handleProviderChange('smtp_port')} placeholder="587" />
            </div>
            <div className="form-field">
              <label>SMTP user</label>
              <input value={providerForm.smtp_user} onChange={handleProviderChange('smtp_user')} placeholder="user" />
            </div>
            <div className="form-field">
              <label>SMTP password</label>
              <input
                type="password"
                value={providerForm.smtp_pass}
                onChange={handleProviderChange('smtp_pass')}
                placeholder="••••••"
              />
            </div>
            <div className="form-field">
              <label>From email</label>
              <input value={providerForm.from_email} onChange={handleProviderChange('from_email')} placeholder="operations@example.com" />
            </div>
            <div className="form-field">
              <label>From name</label>
              <input value={providerForm.from_name} onChange={handleProviderChange('from_name')} placeholder="Fishmouth Ops" />
            </div>
            <div className="form-field">
              <label>Sending domain</label>
              <input value={providerForm.domain} onChange={handleProviderChange('domain')} placeholder="example.com" />
            </div>
            <div className="form-actions">
              <Button icon={actionPending ? undefined : Plus} disabled={actionPending} type="submit">
                {actionPending ? <span className="spinner" /> : 'Save provider'}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Deliverability testing" meta="Send a live message through configured provider">
          <form className="form-grid" onSubmit={handleTestSend}>
            <div className="form-field">
              <label>Provider</label>
              <select
                value={testForm.provider}
                onChange={(e) => setTestForm((prev) => ({ ...prev, provider: e.target.value }))}
              >
                <option value="">Select provider</option>
                {providers.map((prov) => (
                  <option key={prov.name} value={prov.name}>
                    {prov.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Recipient email</label>
              <input
                type="email"
                value={testForm.to_email}
                onChange={(e) => setTestForm((prev) => ({ ...prev, to_email: e.target.value }))}
                placeholder="deliverability@yourdomain.com"
                required
              />
            </div>
            <div className="form-field">
              <label>Subject</label>
              <input
                value={testForm.subject}
                onChange={(e) => setTestForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Body</label>
              <textarea
                value={testForm.text}
                onChange={(e) => setTestForm((prev) => ({ ...prev, text: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="form-actions">
              <Button icon={actionPending ? undefined : Send} disabled={actionPending || !testForm.provider} type="submit">
                {actionPending ? <span className="spinner" /> : 'Send test'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid grid--two">
        <Card title="DNS verification" meta="SPF, DKIM, DMARC status" actions={<Badge tone="neutral">Verify before warmup</Badge>}>
          <form className="form-grid form-grid--two" onSubmit={handleVerifyDomain}>
            <div className="form-field">
              <label>Domain</label>
              <input
                value={domainForm.domain}
                onChange={(e) => setDomainForm((prev) => ({ ...prev, domain: e.target.value }))}
                placeholder="example.com"
                required
              />
            </div>
            <div className="form-field">
              <label>DKIM selector</label>
              <input
                value={domainForm.dkim_selector}
                onChange={(e) => setDomainForm((prev) => ({ ...prev, dkim_selector: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button icon={actionPending ? undefined : Globe} disabled={actionPending} type="submit">
                {actionPending ? <span className="spinner" /> : 'Check records'}
              </Button>
            </div>
          </form>

          {dnsStatus.length > 0 && (
            <div className="list">
              {dnsStatus.map((record) => (
                <div className="list-item" key={record.type}>
                  <div>
                    <strong>{record.type}</strong>
                    <div className="card__meta">
                      {record.records.length ? `${record.records.length} record(s)` : 'Record missing'}
                    </div>
                  </div>
                  <div className="list-item__meta">
                    {record.records.length ? (
                      <span>{record.records[0]}</span>
                    ) : (
                      <Badge tone="warning">Missing</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Cloudflare automation" meta="Push TXT/CNAME records via API">
          <form className="form-grid" onSubmit={handleCloudflareApply}>
            <div className="form-field">
              <label>Zone ID</label>
              <input
                value={cloudflareForm.zone_id}
                onChange={(e) => setCloudflareForm((prev) => ({ ...prev, zone_id: e.target.value }))}
                placeholder="Cloudflare zone identifier"
                required
              />
            </div>
            <div className="form-field">
              <label>API token</label>
              <input
                value={cloudflareForm.token}
                onChange={(e) => setCloudflareForm((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="Scoped token"
                required
              />
            </div>
            <div className="form-field">
              <label>Record type</label>
              <select
                value={cloudflareForm.type}
                onChange={(e) => setCloudflareForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="TXT">TXT</option>
                <option value="CNAME">CNAME</option>
              </select>
            </div>
            <div className="form-field">
              <label>Name</label>
              <input
                value={cloudflareForm.name}
                onChange={(e) => setCloudflareForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="_dmarc.example.com"
              />
            </div>
            <div className="form-field">
              <label>Content</label>
              <textarea
                value={cloudflareForm.content}
                onChange={(e) => setCloudflareForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={3}
                placeholder="Record value"
              />
            </div>
            <div className="form-actions">
              <Button icon={actionPending ? undefined : Cloud} disabled={actionPending} type="submit">
                {actionPending ? <span className="spinner" /> : 'Apply DNS record'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Provider telemetry" meta="Test cadence and spend (30d)">
        {summary && summary.providers.length ? (
          <DataTable
            columns={[
              { label: 'Provider', key: 'provider' },
              { label: 'Tests', key: 'tests', align: 'right', render: (row) => row.tests.toLocaleString() },
              {
                label: 'Cost',
                key: 'cost_usd',
                align: 'right',
                render: (row) =>
                  row.cost_usd.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }),
              },
              {
                label: 'Last test',
                key: 'last_test_at',
                render: (row) => (row.last_test_at ? new Date(row.last_test_at).toLocaleString() : '—'),
              },
            ]}
            rows={summary.providers}
            keyField="provider"
          />
        ) : (
          <div className="empty-state">No deliverability tests recorded yet.</div>
        )}
      </Card>
    </>
  )
}
