import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Users, Target, Award,
  Calendar, Clock, Phone, Mail, MessageSquare, Eye, Star,
  ArrowUp, ArrowDown, Minus, RefreshCw, Download, Filter,
  Zap, Activity, CheckCircle, AlertTriangle, ThumbsUp,
  PieChart, LineChart, BarChart, Activity as ActivityIcon,
  Building2, MapPin, Globe, Shield, Heart, Flame, Crown,
  Lightbulb, Settings, Share, ExternalLink, Copy, Printer
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

const PerformanceAnalytics = ({ businessProfile, timeRange = '30d' }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('overview');
  const [comparisonMode, setComparisonMode] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Mock analytics data - in real app this would come from API
      const mockData = generateMockAnalytics(timeRange);
      setAnalyticsData(mockData);
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const baseMetrics = {
      totalLeads: Math.floor(Math.random() * 200) + 150,
      convertedLeads: Math.floor(Math.random() * 50) + 25,
      totalRevenue: Math.floor(Math.random() * 50000) + 75000,
      avgDealSize: Math.floor(Math.random() * 5000) + 15000,
      responseRate: Math.random() * 30 + 65,
      conversionRate: Math.random() * 15 + 20,
      customerSatisfaction: Math.random() * 10 + 90,
      avgResponseTime: Math.random() * 30 + 15
    };

    // Generate daily data
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyData.push({
        date: date.toISOString().split('T')[0],
        leads: Math.floor(Math.random() * 15) + 5,
        conversions: Math.floor(Math.random() * 5) + 1,
        revenue: Math.floor(Math.random() * 5000) + 2000,
        responseTime: Math.random() * 60 + 15,
        satisfaction: Math.random() * 10 + 85
      });
    }

    // Generate channel performance
    const channelData = [
      { name: 'Phone Calls', leads: 145, conversions: 42, conversionRate: 29.0, color: '#10b981' },
      { name: 'Text Messages', leads: 89, conversions: 18, conversionRate: 20.2, color: '#3b82f6' },
      { name: 'Email', leads: 67, conversions: 8, conversionRate: 11.9, color: '#8b5cf6' },
      { name: 'Social Media', leads: 23, conversions: 4, conversionRate: 17.4, color: '#f59e0b' }
    ];

    // Generate ROI data
    const roiData = {
      totalInvestment: 12500,
      totalReturn: baseMetrics.totalRevenue,
      netProfit: baseMetrics.totalRevenue - 12500,
      roiPercentage: ((baseMetrics.totalRevenue - 12500) / 12500) * 100,
      costPerLead: 12500 / baseMetrics.totalLeads,
      costPerAcquisition: 12500 / baseMetrics.convertedLeads,
      lifetimeValue: 45000,
      paybackPeriod: '3.2 months'
    };

    return {
      ...baseMetrics,
      dailyData,
      channelData,
      roiData,
      timeRange: range,
      lastUpdated: new Date().toISOString()
    };
  };

  const exportReport = async () => {
    toast.loading('Generating analytics report...');
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.dismiss();
      toast.success('Analytics report downloaded!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading performance analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-16">
        <AlertTriangle size={64} className="mx-auto text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Analytics Data</h3>
        <p className="text-slate-600">Unable to load performance analytics at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Performance Analytics</h2>
          <p className="text-slate-600 mt-1">
            Real-time insights into your outreach performance and ROI
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <TimeRangeSelector 
            value={timeRange} 
            onChange={(range) => window.location.reload()} // Simplified for demo
          />
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <KeyMetricsOverview metrics={analyticsData} />

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Performance Charts */}
        <div className="xl:col-span-2 space-y-6">
          <PerformanceTrendChart data={analyticsData.dailyData} />
          <ChannelPerformanceChart data={analyticsData.channelData} />
        </div>
        
        {/* Side Panel */}
        <div className="space-y-6">
          <ROIAnalysisCard roiData={analyticsData.roiData} />
          <QuickInsightsCard metrics={analyticsData} />
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseTimeAnalysis data={analyticsData.dailyData} />
        <ConversionFunnelAnalysis metrics={analyticsData} />
      </div>

      {/* Actionable Recommendations */}
      <ActionableRecommendations metrics={analyticsData} businessProfile={businessProfile} />
    </div>
  );
};

// Time Range Selector Component
const TimeRangeSelector = ({ value, onChange }) => {
  const ranges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  return (
    <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            value === range.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

// Key Metrics Overview Component
const KeyMetricsOverview = ({ metrics }) => {
  const keyMetrics = [
    {
      icon: Users,
      label: 'Total Leads',
      value: metrics.totalLeads,
      change: '+12.5%',
      trend: 'up',
      color: 'blue'
    },
    {
      icon: Target,
      label: 'Conversion Rate',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      change: '+3.2%',
      trend: 'up',
      color: 'emerald'
    },
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      change: '+18.7%',
      trend: 'up',
      color: 'purple'
    },
    {
      icon: Clock,
      label: 'Avg Response Time',
      value: `${metrics.avgResponseTime.toFixed(1)}min`,
      change: '-22.3%',
      trend: 'down',
      color: 'amber'
    },
    {
      icon: Star,
      label: 'Satisfaction',
      value: `${metrics.customerSatisfaction.toFixed(1)}%`,
      change: '+1.8%',
      trend: 'up',
      color: 'rose'
    },
    {
      icon: Award,
      label: 'Avg Deal Size',
      value: `$${metrics.avgDealSize.toLocaleString()}`,
      change: '+5.4%',
      trend: 'up',
      color: 'cyan'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {keyMetrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, change, trend, color }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' }
  };

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600';

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-2xl border ${colors[color].border} p-6 shadow-xl hover:shadow-2xl transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colors[color].bg} rounded-xl flex items-center justify-center`}>
          <Icon size={24} className={colors[color].text} />
        </div>
        <div className={`flex items-center space-x-1 text-sm font-medium ${trendColor}`}>
          <TrendIcon size={14} />
          <span>{change}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
};

// Performance Trend Chart Component
const PerformanceTrendChart = ({ data }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Performance Trends</h3>
        <p className="text-slate-600">Daily leads, conversions, and revenue</p>
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-slate-600">Leads</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-slate-600">Conversions</span>
        </div>
      </div>
    </div>

    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="date" 
          stroke="#64748b"
          tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
          }}
        />
        <Area
          type="monotone"
          dataKey="leads"
          stroke="#3b82f6"
          fill="url(#leadsGradient)"
          strokeWidth={3}
        />
        <Area
          type="monotone"
          dataKey="conversions"
          stroke="#10b981"
          fill="url(#conversionsGradient)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// Channel Performance Chart Component
const ChannelPerformanceChart = ({ data }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Channel Performance</h3>
        <p className="text-slate-600">Leads and conversions by communication channel</p>
      </div>
    </div>

    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
          }}
        />
        <Bar dataKey="leads" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
        <Bar dataKey="conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>

    <div className="mt-6 space-y-3">
      {data.map((channel, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: channel.color }}
            ></div>
            <span className="font-medium text-slate-900">{channel.name}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">
              {channel.conversionRate}%
            </div>
            <div className="text-xs text-slate-500">
              {channel.conversions}/{channel.leads}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ROI Analysis Card Component
const ROIAnalysisCard = ({ roiData }) => (
  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold">ROI Analysis</h3>
        <p className="text-emerald-100">Return on investment metrics</p>
      </div>
      <DollarSign size={32} className="text-emerald-200" />
    </div>

    <div className="space-y-4">
      <div className="bg-white/20 rounded-lg p-4">
        <div className="text-3xl font-bold mb-1">
          {roiData.roiPercentage.toFixed(0)}%
        </div>
        <div className="text-emerald-100 text-sm">Overall ROI</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-lg font-bold">
            ${roiData.netProfit.toLocaleString()}
          </div>
          <div className="text-emerald-100 text-xs">Net Profit</div>
        </div>
        <div>
          <div className="text-lg font-bold">
            {roiData.paybackPeriod}
          </div>
          <div className="text-emerald-100 text-xs">Payback Period</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-emerald-100">Cost per Lead:</span>
          <span className="font-medium">${roiData.costPerLead.toFixed(0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-100">Cost per Acquisition:</span>
          <span className="font-medium">${roiData.costPerAcquisition.toFixed(0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-100">Lifetime Value:</span>
          <span className="font-medium">${roiData.lifetimeValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

// Quick Insights Card Component
const QuickInsightsCard = ({ metrics }) => {
  const insights = [
    {
      icon: TrendingUp,
      title: 'Peak Performance Time',
      description: 'Tuesday 2-4 PM shows highest conversion rates',
      impact: 'high'
    },
    {
      icon: Phone,
      title: 'Best Channel',
      description: 'Phone calls convert 40% better than other channels',
      impact: 'high'
    },
    {
      icon: Clock,
      title: 'Response Time Impact',
      description: 'Sub-5 minute responses increase conversion by 300%',
      impact: 'medium'
    },
    {
      icon: Star,
      title: 'Customer Satisfaction',
      description: 'Current rating is 15% above industry average',
      impact: 'low'
    }
  ];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lightbulb size={24} className="text-amber-500" />
        <h3 className="text-xl font-bold text-slate-900">Quick Insights</h3>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                insight.impact === 'high' ? 'bg-emerald-100 text-emerald-600' :
                insight.impact === 'medium' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <insight.icon size={16} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 text-sm">{insight.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Response Time Analysis Component
const ResponseTimeAnalysis = ({ data }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Response Time Analysis</h3>
        <p className="text-slate-600">Average response times over time</p>
      </div>
    </div>

    <ResponsiveContainer width="100%" height={200}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="date" 
          stroke="#64748b"
          tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#64748b" />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="responseTime" 
          stroke="#f59e0b" 
          strokeWidth={3}
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>

    <div className="mt-4 p-4 bg-amber-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Clock size={16} className="text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          Target response time: &lt;5 minutes for optimal conversion
        </span>
      </div>
    </div>
  </div>
);

// Conversion Funnel Analysis Component
const ConversionFunnelAnalysis = ({ metrics }) => {
  const funnelData = [
    { stage: 'Leads Generated', count: metrics.totalLeads, percentage: 100 },
    { stage: 'Initial Contact', count: Math.floor(metrics.totalLeads * 0.85), percentage: 85 },
    { stage: 'Qualified Interest', count: Math.floor(metrics.totalLeads * 0.45), percentage: 45 },
    { stage: 'Proposal Sent', count: Math.floor(metrics.totalLeads * 0.32), percentage: 32 },
    { stage: 'Converted', count: metrics.convertedLeads, percentage: (metrics.convertedLeads / metrics.totalLeads * 100).toFixed(0) }
  ];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Conversion Funnel</h3>
          <p className="text-slate-600">Lead progression through sales stages</p>
        </div>
      </div>

      <div className="space-y-3">
        {funnelData.map((stage, index) => (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-900">{stage.stage}</span>
              <span className="text-sm text-slate-600">{stage.count} ({stage.percentage}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stage.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Target size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Overall conversion rate: {((metrics.convertedLeads / metrics.totalLeads) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Actionable Recommendations Component
const ActionableRecommendations = ({ metrics, businessProfile }) => {
  const recommendations = [
    {
      title: 'Optimize Response Time',
      description: 'Reduce average response time to under 5 minutes to increase conversions by up to 300%',
      impact: 'High',
      effort: 'Medium',
      action: 'Set up automated SMS responses',
      icon: Clock,
      color: 'emerald'
    },
    {
      title: 'Focus on Phone Channel',
      description: 'Phone calls show the highest conversion rate. Increase call volume during peak hours',
      impact: 'High',
      effort: 'Low',
      action: 'Schedule more calls 2-4 PM',
      icon: Phone,
      color: 'blue'
    },
    {
      title: 'Improve Email Performance',
      description: 'Email conversion is below average. A/B test subject lines and timing',
      impact: 'Medium',
      effort: 'Low',
      action: 'Test new email templates',
      icon: Mail,
      color: 'purple'
    },
    {
      title: 'Follow Up Consistency',
      description: 'Increase follow-up frequency for dormant leads to improve re-engagement',
      impact: 'Medium',
      effort: 'Medium',
      action: 'Create automated sequences',
      icon: RefreshCw,
      color: 'amber'
    }
  ];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Lightbulb size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Actionable Recommendations</h3>
            <p className="text-slate-600">AI-powered insights to improve performance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => (
          <div key={index} className={`p-4 rounded-lg border-l-4 border-${rec.color}-500 bg-${rec.color}-50/50 hover:bg-${rec.color}-50 transition-colors`}>
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 bg-${rec.color}-100 rounded-lg flex items-center justify-center`}>
                <rec.icon size={16} className={`text-${rec.color}-600`} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">{rec.title}</h4>
                <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`px-2 py-1 bg-${rec.color}-100 text-${rec.color}-700 rounded-full font-medium`}>
                      {rec.impact} Impact
                    </span>
                    <span className="text-slate-500">{rec.effort} Effort</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {rec.action} →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceAnalytics;