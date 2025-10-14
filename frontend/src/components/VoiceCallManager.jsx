import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Filter,
  Phone,
  Play,
  RefreshCcw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

import { voiceAPI } from '../services/api';
import VoiceTranscriptModal from './VoiceTranscriptModal';

const statusBadge = {
  completed: {
    light: 'bg-emerald-50 text-emerald-600',
    dark: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
  },
  in_progress: {
    light: 'bg-blue-50 text-blue-600',
    dark: 'bg-blue-500/20 text-blue-200 border border-blue-400/30',
  },
  failed: {
    light: 'bg-rose-50 text-rose-600',
    dark: 'bg-rose-500/20 text-rose-200 border border-rose-400/30',
  },
  no_answer: {
    light: 'bg-amber-50 text-amber-600',
    dark: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
  },
  scheduled: {
    light: 'bg-emerald-50 text-emerald-600',
    dark: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
  },
  follow_up: {
    light: 'bg-indigo-50 text-indigo-600',
    dark: 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30',
  },
  retrying: {
    light: 'bg-amber-50 text-amber-600',
    dark: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
  },
};

const interestBadge = {
  high: {
    light: 'bg-emerald-50 text-emerald-700',
    dark: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
  },
  medium: {
    light: 'bg-blue-50 text-blue-700',
    dark: 'bg-blue-500/20 text-blue-200 border border-blue-400/30',
  },
  low: {
    light: 'bg-amber-50 text-amber-700',
    dark: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
  },
};

const resolveBadgeClass = (palette, key, isDark) => {
  const entry = palette[key];
  if (!entry) {
    return isDark ? 'bg-slate-800 text-slate-200 border border-slate-700/60' : 'bg-gray-100 text-gray-700';
  }
  if (typeof entry === 'string') {
    return entry;
  }
  return isDark ? entry.dark || entry.light : entry.light || entry.dark;
};

const VoiceCallManager = ({ isDark = false }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ status: '', outcome: '', interest: '', search: '' });
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [selectedCallDetails, setSelectedCallDetails] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filters.status) params.status = filters.status;
      if (filters.outcome) params.outcome = filters.outcome;
      if (filters.interest) params.interest_level = filters.interest;

      const data = await voiceAPI.getCalls(params);
      setCalls(data);
    } catch (error) {
      console.error('Failed to load voice calls', error);
      toast.error('Unable to load voice call history');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.outcome, filters.interest]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const metrics = await voiceAPI.getAnalytics(21);
      setAnalytics(metrics);
    } catch (error) {
      console.error('Failed to load voice analytics', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const filteredCalls = useMemo(() => {
    if (!filters.search) {
      return calls;
    }
    const query = filters.search.toLowerCase();
    return calls.filter(call => {
      const name = (call.lead_name || '').toLowerCase();
      const number = (call.to_number || '').toLowerCase();
      const callId = (call.id || '').toLowerCase();
      return name.includes(query) || number.includes(query) || callId.includes(query);
    });
  }, [calls, filters.search]);

  const chartData = useMemo(() => {
    return (analytics?.daily_breakdown || []).map(item => ({
      ...item,
      dayLabel: new Date(item.day).toLocaleDateString(),
    }));
  }, [analytics]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCalls(), loadAnalytics()]);
    setRefreshing(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: '', outcome: '', interest: '', search: '' });
  };

  const openTranscript = async call => {
    setSelectedCall(call);
    setTranscriptLoading(true);
    try {
      const details = await voiceAPI.getCall(call.id);
      setSelectedCallDetails(details);
    } catch (error) {
      console.error('Failed to load transcript', error);
      toast.error('Unable to load transcript for this call');
      setSelectedCall(null);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const closeTranscript = () => {
    setSelectedCall(null);
    setSelectedCallDetails(null);
  };

  const handleTranscriptCall = useCallback(({ leadPhone }) => {
    if (leadPhone) {
      window.open(`tel:${leadPhone}`);
    } else {
      toast.error('No phone number available for this lead');
    }
  }, []);

  const handleTranscriptEmail = useCallback(({ leadEmail, call }) => {
    if (leadEmail) {
      const subject = encodeURIComponent(`Following up on ${call?.id}`);
      const body = encodeURIComponent('Hi there,\n\nGreat speaking with you earlier. Let me know a good time to continue the conversation.\n\nThanks!');
      window.open(`mailto:${leadEmail}?subject=${subject}&body=${body}`);
    } else {
      toast.error('No email available for this lead');
    }
  }, []);

  const handleOpenWorkspace = useCallback(() => {
    toast.success('AI workspace launching soon');
  }, []);

  const visibleCount = filteredCalls.length;
  const totalCount = calls.length;

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Voice Calls</h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Real-time performance insights, transcripts, and analytics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            isDark
              ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60 hover:text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          disabled={refreshing}
        >
          <RefreshCcw size={16} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <AnalyticsPanel analytics={analytics} loading={analyticsLoading} chartData={chartData} isDark={isDark} />

      <div
        className={`backdrop-blur rounded-xl overflow-hidden border ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-gray-200'
        }`}
      >
        <div
          className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <Filter size={16} />
            <span>Filters</span>
            <span className={isDark ? 'text-slate-600' : 'text-gray-400'}>•</span>
            <span>
              Showing {visibleCount.toLocaleString()} of {totalCount.toLocaleString()} calls
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={value => handleFilterChange('status', value)}
              isDark={isDark}
              options={[
                { label: 'All status', value: '' },
                { label: 'In progress', value: 'in_progress' },
                { label: 'Completed', value: 'completed' },
                { label: 'Failed', value: 'failed' },
                { label: 'Retrying', value: 'retrying' },
              ]}
            />
            <FilterSelect
              label="Outcome"
              value={filters.outcome}
              onChange={value => handleFilterChange('outcome', value)}
              isDark={isDark}
              options={[
                { label: 'All outcomes', value: '' },
                { label: 'Scheduled', value: 'scheduled' },
                { label: 'Follow up', value: 'follow_up' },
                { label: 'Opt out', value: 'opt_out' },
                { label: 'Completed', value: 'completed' },
              ]}
            />
            <FilterSelect
              label="Interest"
              value={filters.interest}
              onChange={value => handleFilterChange('interest', value)}
              isDark={isDark}
              options={[
                { label: 'All interest levels', value: '' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
            />
            <div className="relative">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
              />
              <input
                type="text"
                value={filters.search}
                onChange={event => handleFilterChange('search', event.target.value)}
                placeholder="Search lead, number, call id"
                className={`pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70'
                    : 'border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:border-blue-500'
                }`}
              />
            </div>
            <button
              onClick={resetFilters}
              className={`text-sm transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading voice calls…</div>
        ) : filteredCalls.length === 0 ? (
          <div
            className={`p-10 text-center flex flex-col items-center gap-3 ${
              isDark ? 'text-slate-400' : 'text-gray-500'
            }`}
          >
            <Phone size={32} className={isDark ? 'opacity-60 text-slate-500' : 'opacity-40 text-gray-400'} />
            <p>{totalCount === 0 ? 'No AI calls yet. Start enrolling leads into sequences with voice steps.' : 'No calls match the selected filters.'}</p>
          </div>
        ) : (
          <table
            className={`min-w-full divide-y ${
              isDark ? 'divide-slate-800/80 text-slate-100' : 'divide-gray-200 text-gray-900'
            }`}
          >
            <thead className={isDark ? 'bg-slate-900/70' : 'bg-white'}>
              <tr>
                <Th isDark={isDark}>Lead</Th>
                <Th isDark={isDark}>Outcome</Th>
                <Th isDark={isDark}>Summary</Th>
                <Th isDark={isDark}>Engagement</Th>
                <Th isDark={isDark}>Cost</Th>
                <Th isDark={isDark}>Started</Th>
                <Th isDark={isDark}></Th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-slate-800/70 bg-slate-900/50' : 'divide-gray-100 bg-white'
              }`}
            >
              {filteredCalls.map(call => {
                const statusKey = (call.outcome || call.status || 'unknown').toLowerCase();
                const badgeClass = resolveBadgeClass(statusBadge, statusKey, isDark);
                const interestKey = (call.interest_level || '').toLowerCase();
                const interestClass = resolveBadgeClass(interestBadge, interestKey, isDark);

                return (
                  <tr key={call.id} className={isDark ? 'hover:bg-slate-800/60 transition' : 'hover:bg-gray-50 transition'}>
                    <Td isDark={isDark}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Phone size={16} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                            {call.lead_name || call.to_number}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Call ID: {call.id}</p>
                          <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            <Clock size={12} />
                            <span>{formatDuration(call.duration_seconds)}</span>
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Carrier: {(call.carrier || 'telnyx').toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td isDark={isDark}>
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                          {(call.outcome || call.status || '').replace('_', ' ') || '—'}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Status: {(call.status || '—').replace('_', ' ')}
                        </span>
                        {call.retry_attempts > 0 && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isDark ? 'text-amber-300' : 'text-amber-600'
                            }`}
                          >
                            <AlertCircle size={12} />
                            Retry #{call.retry_attempts}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td isDark={isDark} className="max-w-xs">
                      <p className={`text-sm overflow-hidden max-h-24 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {call.ai_summary || 'Summary pending'}
                      </p>
                      {call.next_steps && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                          Next: {call.next_steps}
                        </p>
                      )}
                    </Td>
                    <Td isDark={isDark}>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${interestClass}`}>
                        {(call.interest_level || 'unknown').toUpperCase()}
                      </span>
                    </Td>
                    <Td isDark={isDark}>
                      <div className="flex flex-col text-sm">
                        <span className="font-semibold">{formatCurrency(call.total_cost)}</span>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          AI: {formatCurrency(call.ai_cost)}
                        </span>
                      </div>
                    </Td>
                    <Td isDark={isDark}>
                      {call.created_at ? new Date(call.created_at).toLocaleString() : '—'}
                    </Td>
                    <Td isDark={isDark} className="text-right">
                      <button
                        onClick={() => openTranscript(call)}
                        className={`flex items-center gap-1 text-sm ${
                          isDark
                            ? 'text-blue-300 hover:text-blue-200'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        <FileIcon />
                        View transcript
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedCall && (
        <VoiceTranscriptModal
          call={selectedCall}
          details={selectedCallDetails}
          loading={transcriptLoading}
          onClose={closeTranscript}
          isDark={isDark}
          lead={{
            homeowner_name: selectedCall.lead_name,
            homeowner_phone: selectedCall.to_number,
            homeowner_email: selectedCall.lead_email,
          }}
          onFollowUpCall={handleTranscriptCall}
          onSendEmail={handleTranscriptEmail}
          onOpenChat={handleOpenWorkspace}
        />
      )}
    </div>
  );
};

const AnalyticsPanel = ({ analytics, loading, chartData, isDark }) => {
  if (loading) {
    return (
      <div
        className={`rounded-xl border p-6 text-sm ${
          isDark ? 'bg-slate-900/70 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-500'
        }`}
      >
        Loading voice analytics…
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const sentimentData = (analytics.sentiment_trends || []).map(item => ({
    ...item,
    dayLabel: new Date(item.day).toLocaleDateString(),
  }));
  const outcomeBreakdown = analytics.outcome_breakdown || [];
  const insights = analytics.insights || { strengths: [], risks: [], recommendations: [] };

  const gridStroke = isDark ? '#1f2937' : '#f3f4f6';
  const axisColor = isDark ? '#94a3b8' : '#9ca3af';
  const tooltipStyle = isDark
    ? {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderRadius: 12,
        color: '#e2e8f0',
      }
    : {
        borderRadius: 12,
        borderColor: '#e5e7eb',
      };

  return (
    <div className={`space-y-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Calls"
          value={analytics.total_calls?.toLocaleString() || '0'}
          icon={Phone}
          subtitle="Across the selected period"
          accent={{
            iconBg: 'bg-blue-100',
            iconBgDark: 'bg-blue-500/20',
            iconText: 'text-blue-600',
            iconTextDark: 'text-blue-200',
          }}
          isDark={isDark}
        />
        <SummaryCard
          title="Bookings"
          value={analytics.total_bookings?.toLocaleString() || '0'}
          icon={TrendingUp}
          subtitle="Confirmed appointments"
          accent={{
            iconBg: 'bg-emerald-100',
            iconBgDark: 'bg-emerald-500/20',
            iconText: 'text-emerald-600',
            iconTextDark: 'text-emerald-200',
          }}
          isDark={isDark}
        />
        <SummaryCard
          title="Booking Rate"
          value={`${(analytics.avg_booking_rate || 0).toFixed(1)}%`}
          icon={Activity}
          subtitle="Bookings per completed call"
          accent={{
            iconBg: 'bg-purple-100',
            iconBgDark: 'bg-purple-500/20',
            iconText: 'text-purple-600',
            iconTextDark: 'text-purple-200',
          }}
          isDark={isDark}
        />
        <SummaryCard
          title="Avg Duration"
          value={formatDuration(analytics.avg_duration_seconds)}
          icon={Clock}
          subtitle="Conversation length"
          accent={{
            iconBg: 'bg-orange-100',
            iconBgDark: 'bg-orange-500/20',
            iconText: 'text-orange-600',
            iconTextDark: 'text-orange-200',
          }}
          isDark={isDark}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div
          className={`rounded-xl border p-6 ${
            isDark ? 'bg-slate-900/70 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Daily Call Volume</h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Calls vs connects</span>
          </div>
          {chartData.length === 0 ? (
            <div className={`h-48 flex items-center justify-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              No call volume data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConnects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
                <YAxis tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="calls" name="Calls" stroke="#2563eb" fill="url(#colorCalls)" strokeWidth={2} />
                <Area type="monotone" dataKey="connects" name="Connects" stroke="#10b981" fill="url(#colorConnects)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          className={`rounded-xl border p-6 ${
            isDark ? 'bg-slate-900/70 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Customer Sentiment</h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Average tone per day</span>
          </div>
          {sentimentData.length === 0 ? (
            <div className={`h-48 flex items-center justify-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              No sentiment data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sentimentData}>
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: axisColor }} stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="avg_sentiment" name="Average Sentiment" stroke="#f97316" fill="url(#colorSentiment)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          className={`rounded-xl border p-6 space-y-4 ${
            isDark ? 'bg-slate-900/70 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Outcome Breakdown
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Top AI call endings and their sentiment</p>
          </div>
          <div className="space-y-3">
            {outcomeBreakdown.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                No outcomes recorded for the selected period.
              </p>
            ) : (
              outcomeBreakdown.map(item => (
                <div
                  key={item.outcome}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                    isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold capitalize">{item.outcome.replace('_', ' ')}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Sentiment {item.sentiment != null ? `${item.sentiment.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-6 ${
          isDark ? 'bg-slate-900/70 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InsightColumn title="Strengths" tone="positive" items={insights.strengths} isDark={isDark} />
          <InsightColumn title="Risks" tone="warning" items={insights.risks} isDark={isDark} />
          <InsightColumn title="Recommendations" tone="info" items={insights.recommendations} isDark={isDark} />
        </div>
        <div className={`mt-6 flex flex-wrap gap-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <span>Total spend: {formatCurrency((analytics.total_call_cost_usd || 0) + (analytics.total_ai_cost_usd || 0))}</span>
          <span>Latency: {(analytics.avg_latency_ms || 0).toLocaleString()} ms to first response</span>
          <span>
            Follow-ups due:{' '}
            {outcomeBreakdown.find(o => ['follow_up', 'callback_requested', 'voicemail'].includes(o.outcome))?.count || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, subtitle, icon: Icon = Phone, accent = {}, isDark }) => {
  const iconBg = isDark
    ? accent.iconBgDark || accent.iconBg || 'bg-blue-500/20'
    : accent.iconBg || 'bg-blue-100';
  const iconText = isDark
    ? accent.iconTextDark || accent.iconText || 'text-blue-200'
    : accent.iconText || 'text-blue-600';
  const frameClass = isDark
    ? 'bg-slate-900/70 border border-slate-800 text-slate-100'
    : 'bg-white border border-gray-200 text-gray-900';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const metaClass = isDark ? 'text-slate-300' : 'text-gray-600';
  return (
    <div className={`${frameClass} rounded-xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={iconText} size={18} />
        </div>
        <BarChart3 size={16} className={isDark ? 'text-slate-700' : 'text-gray-200'} />
      </div>
      <div className={`text-xs ${subtitleClass}`}>{subtitle}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className={`mt-2 text-sm ${metaClass}`}>{title}</div>
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange, isDark }) => (
  <select
    value={value}
    onChange={event => onChange(event.target.value)}
    className={`text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      isDark
        ? 'border border-slate-700 bg-slate-900 text-slate-100'
        : 'border border-gray-200 bg-white text-gray-900'
    }`}
    aria-label={label}
  >
    {options.map(option => (
      <option key={option.value || 'all'} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const FileIcon = () => <Play size={14} />;

const Th = ({ children, isDark }) => (
  <th
    scope="col"
    className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
      isDark ? 'text-slate-400' : 'text-gray-500'
    }`}
  >
    {children}
  </th>
);

const Td = ({ children, isDark, className = '' }) => (
  <td
    className={`px-6 py-4 align-top ${isDark ? 'text-slate-100' : 'text-gray-900'} ${className}`}
  >
    {children}
  </td>
);

const InsightColumn = ({ title, tone, items, isDark }) => {
  const paletteLookup = {
    positive: {
      light: { badge: 'bg-emerald-50 text-emerald-600', bullet: 'text-emerald-500' },
      dark: { badge: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30', bullet: 'text-emerald-300' },
    },
    warning: {
      light: { badge: 'bg-amber-50 text-amber-600', bullet: 'text-amber-500' },
      dark: { badge: 'bg-amber-500/15 text-amber-200 border border-amber-400/30', bullet: 'text-amber-300' },
    },
    info: {
      light: { badge: 'bg-blue-50 text-blue-600', bullet: 'text-blue-500' },
      dark: { badge: 'bg-blue-500/20 text-blue-200 border border-blue-400/30', bullet: 'text-blue-200' },
    },
  };

  const palette =
    (isDark ? paletteLookup[tone]?.dark : paletteLookup[tone]?.light) ||
    (isDark
      ? { badge: 'bg-slate-800 text-slate-200 border border-slate-700/60', bullet: 'text-slate-400' }
      : { badge: 'bg-gray-100 text-gray-600', bullet: 'text-gray-400' });

  return (
    <div>
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${palette.badge}`}>
        {title}
      </span>
      <ul className={`mt-3 space-y-2 text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
        {(items && items.length > 0 ? items : ['No observations yet.']).map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 rounded-full ${palette.bullet} inline-flex`}></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatDuration = seconds => {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.round(seconds % 60));
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const formatCurrency = value => {
  if (value === undefined || value === null) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value));
};

export default VoiceCallManager;
