import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Server, Layers, RefreshCcw, Clock, Activity } from 'lucide-react'
import Card from '../components/Card.jsx'
import StatTile from '../components/StatTile.jsx'
import Badge from '../components/Badge.jsx'
import DataTable from '../components/DataTable.jsx'
import Button from '../components/Button.jsx'
import { LoadingState, ErrorState } from '../components/LoadingState.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { fetchJSON } from '../lib/api.js'

const statusTone = (status) => {
  if (!status) return 'neutral'
  const normalized = status.toLowerCase()
  if (normalized.includes('fail') || normalized.includes('error')) return 'danger'
  if (normalized.includes('pending') || normalized.includes('waiting')) return 'warning'
  return 'success'
}

export default function JobsQueues() {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overview, setOverview] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewResp, jobsResp] = await Promise.all([fetchJSON('/queues/overview'), fetchJSON('/queues/jobs')])
      setOverview(overviewResp)
      const items = jobsResp.jobs || (Array.isArray(jobsResp) ? jobsResp : [])
      setJobs(items)
      if (items.length && !selectedJob) {
        setSelectedJob(items[0])
      }
    } catch (err) {
      setError(err)
      pushToast({ title: err.message || 'Failed to load queue telemetry', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pushToast, selectedJob])

  useEffect(() => {
    load()
  }, [load])

  const loadJobDetail = useCallback(
    async (job) => {
      if (!job || !job.id) {
        setJobDetail(null)
        return
      }
      setDetailLoading(true)
      try {
        const detail = await fetchJSON(`/queues/jobs/${job.id}`)
        setJobDetail(detail)
      } catch (err) {
        pushToast({ title: err.message || 'Failed to load job detail', tone: 'error' })
      } finally {
        setDetailLoading(false)
      }
    },
    [pushToast]
  )

  useEffect(() => {
    if (selectedJob && selectedJob.id) {
      loadJobDetail(selectedJob)
    }
  }, [selectedJob, loadJobDetail])

  const filteredJobs = useMemo(() => {
    if (filter === 'all') return jobs
    return jobs.filter((job) => (job.status || '').toLowerCase() === filter)
  }, [jobs, filter])

  const statusOptions = useMemo(() => {
    const unique = new Set(jobs.map((job) => (job.status || '').toLowerCase()))
    return ['all', ...Array.from(unique).filter(Boolean)]
  }, [jobs])

  if (loading && !overview) {
    return <LoadingState label="Loading queues…" />
  }

  if (error && !overview) {
    return <ErrorState title="Unable to load queues" description={error.message} retry={load} />
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header__title">
          <h2>Jobs & queues</h2>
          <p className="page-header__subtitle">
            Track orchestrator pipelines, Celery workloads, and async job throughput across the platform.
          </p>
        </div>
        <div className="page-actions">
          <div className="tabs">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? 'active' : ''}
                onClick={() => setFilter(option)}
              >
                {option}
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
          label="Jobs in flight"
          value={(overview?.total_jobs || 0).toLocaleString()}
          deltaLabel={`Latest queue: ${overview?.latest?.queue || '—'}`}
          icon={Server}
        />
        <StatTile
          label="Queues tracked"
          value={(overview?.queues?.length || 0).toString()}
          deltaLabel={
            overview?.statuses?.length
              ? `${overview.statuses
                  .map((status) => `${status.status}: ${status.count}`)
                  .slice(0, 2)
                  .join(' · ')}`
              : 'No status data'
          }
          icon={Layers}
        />
        <StatTile
          label="Freshest job"
          value={overview?.latest?.status || '—'}
          deltaLabel={overview?.latest?.updated_at ? new Date(overview.latest.updated_at).toLocaleString() : 'No updates'}
          icon={Activity}
        />
        <StatTile
          label="Oldest job"
          value={overview?.oldest?.status || '—'}
          deltaLabel={overview?.oldest?.created_at ? new Date(overview.oldest.created_at).toLocaleString() : 'No backlog'}
          icon={Clock}
          positive={false}
        />
      </div>

      <Card
        title="Job list"
        meta={filter === 'all' ? 'All jobs from orchestrator' : `Filtered by ${filter}`}
        actions={<Badge tone="neutral">{jobs.length} total jobs</Badge>}
      >
        {loading && !jobs.length ? (
          <LoadingState label="Loading jobs…" />
        ) : filteredJobs.length ? (
          <DataTable
            columns={[
              { label: 'ID', key: 'id' },
              { label: 'Queue', key: 'queue' },
              {
                label: 'Status',
                key: 'status',
                render: (row) => <Badge tone={statusTone(row.status)}>{row.status || 'unknown'}</Badge>,
              },
              {
                label: 'Progress',
                key: 'percent',
                align: 'right',
                render: (row) =>
                  row.percent != null
                    ? `${row.percent}%`
                    : row.progress != null
                    ? `${row.progress}%`
                    : row.state || '—',
              },
              {
                label: 'Updated',
                key: 'updated_at',
                render: (row) => (row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'),
              },
            ]}
            rows={filteredJobs}
            keyField="id"
            onRowClick={setSelectedJob}
          />
        ) : (
          <div className="empty-state">No jobs match this filter.</div>
        )}
      </Card>

      {selectedJob && (
        <div className="grid grid--two">
          <Card
            title="Job detail"
            meta={selectedJob.id}
            actions={<Badge tone={statusTone(selectedJob.status)}>{selectedJob.status}</Badge>}
          >
            {detailLoading || !jobDetail ? (
              <LoadingState label="Loading job detail…" />
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(jobDetail, null, 2)}</pre>
            )}
          </Card>

          <Card title="Queue health" meta="Average progress per queue">
            {overview?.queues?.length ? (
              <DataTable
                columns={[
                  { label: 'Queue', key: 'queue' },
                  { label: 'Jobs', key: 'jobs', align: 'right', render: (row) => row.jobs.toLocaleString() },
                  {
                    label: 'Average progress',
                    key: 'avg_progress',
                    align: 'right',
                    render: (row) => (row.avg_progress != null ? `${row.avg_progress.toFixed(1)}%` : '–'),
                  },
                ]}
                rows={overview.queues}
                keyField="queue"
              />
            ) : (
              <div className="empty-state">No queue telemetry captured.</div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
