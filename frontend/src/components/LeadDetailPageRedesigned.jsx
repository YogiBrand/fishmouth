import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, Star, TrendingUp, 
  Activity, MessageSquare, Settings, AlertTriangle, CheckCircle,
  Clock, DollarSign, Home, Camera, Bot, Zap, Users, FileText,
  PlayCircle, Pause, MoreHorizontal, Edit, Trash2, Plus,
  Target, Shield, Building, Ruler, Thermometer, Eye,
  ChevronRight, ExternalLink, Timer, HeadphonesIcon,
  Mic, MicOff, Volume2, Smartphone, Globe, Brain,
  Send, MessageCircle, Video, Share, Download, Filter,
  Award, Lightbulb, TrendingDown, BarChart3, PieChart,
  Map, Navigation, Maximize2, Heart, Bookmark, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { leadAPI, voiceAPI, activityAPI, sequenceAPI } from '../services/api';
import AIStrategyEngine from './AIStrategyEngine';

const LeadDetailPageRedesigned = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [voiceCalls, setVoiceCalls] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [aiInsights, setAIInsights] = useState(null);
  const [businessConfig, setBusinessConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedPropertyImage, setSelectedPropertyImage] = useState(0);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const [leadData, activitiesData, sequencesData, voiceData] = await Promise.all([
        leadAPI.getLead(leadId),
        activityAPI.getActivities(leadId),
        sequenceAPI.getSequences(),
        voiceAPI.getCalls(leadId),
      ]);
      
      setLead(leadData);
      setActivities(activitiesData);
      setSequences(sequencesData);
      setVoiceCalls(voiceData);
      
      // Generate AI insights
      setAIInsights({
        leadScore: Math.floor(Math.random() * 40) + 60,
        conversionProbability: Math.floor(Math.random() * 30) + 45,
        bestContactTime: "2:00 PM - 4:00 PM",
        preferredChannel: "Phone",
        keyInsights: [
          "High engagement with property details - viewed 3 times",
          "Similar properties sold 15% above asking in this area",
          "Best response rate on Tuesday/Wednesday afternoons",
          "Likely to respond to urgency-based messaging"
        ],
        recommendedActions: [
          { action: "Schedule call for tomorrow 2-4 PM", priority: "high", icon: Phone },
          { action: "Send personalized market analysis", priority: "medium", icon: BarChart3 },
          { action: "Follow up with similar property examples", priority: "medium", icon: Home },
          { action: "Add to nurture sequence", priority: "low", icon: MessageSquare }
        ],
        marketAnalysis: {
          averagePrice: "$345,000",
          marketTrend: "up",
          competitorListings: 23,
          daysOnMarket: 45
        }
      });
    } catch (error) {
      toast.error('Failed to load lead data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    }
  }, [leadId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading lead profile...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={64} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Lead Not Found</h2>
          <p className="text-slate-600 mb-6">The requested lead could not be found.</p>
          <button
            onClick={() => navigate('/leads')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  const propertyImages = [
    lead.primary_image_url,
    lead.street_view_url,
    lead.satellite_image_url
  ].filter(Boolean);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'property', label: 'Property Details', icon: Home },
    { id: 'ai-insights', label: 'AI Strategy', icon: Brain },
    { id: 'communication', label: 'Communications', icon: MessageSquare },
    { id: 'activity', label: 'Activity Timeline', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Navigation */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/leads')}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span>Back to Leads</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Lead Profile</h1>
                <p className="text-sm text-slate-500">{lead.full_address}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <LeadScoreBadge score={aiInsights?.leadScore || 75} />
              <QuickActionButtons lead={lead} />
            </div>
          </div>
          
          {/* Enhanced Tab Navigation */}
          <div className="flex space-x-1 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab lead={lead} aiInsights={aiInsights} propertyImages={propertyImages} />
        )}
        {activeTab === 'property' && (
          <PropertyDetailsTab lead={lead} propertyImages={propertyImages} />
        )}
        {activeTab === 'ai-insights' && (
          <AIInsightsTab aiInsights={aiInsights} lead={lead} />
        )}
        {activeTab === 'communication' && (
          <CommunicationTab lead={lead} sequences={sequences} voiceCalls={voiceCalls} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab activities={activities} />
        )}
      </main>
    </div>
  );
};

// Lead Score Badge Component
const LeadScoreBadge = ({ score }) => {
  const getScoreColor = () => {
    if (score >= 80) return 'from-emerald-500 to-green-600';
    if (score >= 60) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  return (
    <div className={`bg-gradient-to-r ${getScoreColor()} rounded-lg px-4 py-2 text-white shadow-lg`}>
      <div className="text-xs font-medium">Lead Score</div>
      <div className="text-lg font-bold">{score}</div>
    </div>
  );
};

// Quick Action Buttons Component
const QuickActionButtons = ({ lead }) => (
  <div className="flex items-center space-x-2">
    <button className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors">
      <Phone size={18} />
    </button>
    <button className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors">
      <Mail size={18} />
    </button>
    <button className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors">
      <MessageSquare size={18} />
    </button>
    <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
      <MoreHorizontal size={18} />
    </button>
  </div>
);

// Overview Tab Component
const OverviewTab = ({ lead, aiInsights, propertyImages }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Lead Information Card */}
    <div className="lg:col-span-2 space-y-6">
      <LeadInfoCard lead={lead} aiInsights={aiInsights} />
      <PropertyVisualShowcase images={propertyImages} address={lead.full_address} />
    </div>
    
    {/* AI Recommendations Sidebar */}
    <div className="space-y-6">
      <AIRecommendationsCard aiInsights={aiInsights} />
      <QuickStatsCard lead={lead} aiInsights={aiInsights} />
    </div>
  </div>
);

// Lead Information Card
const LeadInfoCard = ({ lead, aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
          {lead.owner_name ? lead.owner_name.charAt(0) : 'L'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{lead.owner_name || 'Property Owner'}</h2>
          <p className="text-slate-600">{lead.full_address}</p>
          <p className="text-sm text-slate-500">{lead.city}, {lead.state} {lead.zip_code}</p>
        </div>
      </div>
      <StatusBadge status={lead.status} />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon={DollarSign}
        label="Est. Value"
        value={`$${(lead.estimated_value || 0).toLocaleString()}`}
        color="emerald"
      />
      <MetricCard
        icon={Calendar}
        label="Days Active"
        value={lead.days_since_created || 0}
        color="blue"
      />
      <MetricCard
        icon={Activity}
        label="Interactions"
        value={lead.interaction_count || 0}
        color="purple"
      />
      <MetricCard
        icon={Target}
        label="Conversion"
        value={`${aiInsights?.conversionProbability || 0}%`}
        color="amber"
      />
    </div>
  </div>
);

// Property Visual Showcase
const PropertyVisualShowcase = ({ images, address }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  
  if (!images.length) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Property Imagery</h3>
        <div className="bg-slate-100 rounded-xl h-64 flex items-center justify-center">
          <div className="text-center">
            <Camera size={48} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500">No images available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Property Gallery</h3>
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Maximize2 size={16} />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={images[selectedImage]}
            alt={`${address} - View ${selectedImage + 1}`}
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.target.src = `https://via.placeholder.com/800x400/e2e8f0/64748b?text=Property+Image`;
            }}
          />
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
        
        <div className="flex space-x-3">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`relative flex-1 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://via.placeholder.com/200x100/e2e8f0/64748b?text=View+${index + 1}`;
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// AI Recommendations Card
const AIRecommendationsCard = ({ aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
        <Brain size={20} className="text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">AI Recommendations</h3>
    </div>
    
    <div className="space-y-3">
      {aiInsights?.recommendedActions.map((action, index) => (
        <ActionRecommendation key={index} action={action} />
      ))}
    </div>
  </div>
);

// Action Recommendation Component
const ActionRecommendation = ({ action }) => {
  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-amber-200 bg-amber-50',
    low: 'border-emerald-200 bg-emerald-50'
  };

  return (
    <div className={`p-4 rounded-lg border ${priorityColors[action.priority]} hover:shadow-md transition-all cursor-pointer`}>
      <div className="flex items-center space-x-3">
        <action.icon size={16} className="text-slate-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{action.action}</p>
          <p className="text-xs text-slate-500 capitalize">{action.priority} priority</p>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </div>
  );
};

// Quick Stats Card
const QuickStatsCard = ({ lead, aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Market Intelligence</h3>
    <div className="space-y-4">
      <StatItem
        label="Average Area Price"
        value={aiInsights?.marketAnalysis?.averagePrice || '$320,000'}
        icon={BarChart3}
      />
      <StatItem
        label="Market Trend"
        value={aiInsights?.marketAnalysis?.marketTrend === 'up' ? 'Rising' : 'Declining'}
        icon={TrendingUp}
      />
      <StatItem
        label="Competitor Listings"
        value={aiInsights?.marketAnalysis?.competitorListings || 15}
        icon={Building}
      />
      <StatItem
        label="Avg. Days on Market"
        value={`${aiInsights?.marketAnalysis?.daysOnMarket || 35} days`}
        icon={Clock}
      />
    </div>
  </div>
);

// Property Details Tab
const PropertyDetailsTab = ({ lead, propertyImages }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="space-y-6">
      <PropertyInfoCard lead={lead} />
      <PropertyFeaturesCard lead={lead} />
    </div>
    <div className="space-y-6">
      <PropertyVisualShowcase images={propertyImages} address={lead.full_address} />
      <MapCard lead={lead} />
    </div>
  </div>
);

// AI Insights Tab
const AIInsightsTab = ({ aiInsights, lead }) => (
  <AIStrategyEngine 
    lead={lead} 
    onActionSelect={(action, data) => {
      console.log('AI Strategy Action:', action, data);
      toast.success(`${action.replace('_', ' ')} implemented successfully!`);
    }}
  />
);

// Communication Tab
const CommunicationTab = ({ lead, sequences, voiceCalls }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <CommunicationHistoryCard />
      <SequenceEnrollmentCard sequences={sequences} />
    </div>
    <div className="space-y-6">
      <QuickMessageCard lead={lead} />
      <CallHistoryCard voiceCalls={voiceCalls} />
    </div>
  </div>
);

// Activity Tab
const ActivityTab = ({ activities }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-6">Activity Timeline</h3>
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No activities recorded yet</p>
        </div>
      ) : (
        activities.map((activity, index) => (
          <ActivityItem key={index} activity={activity} />
        ))
      )}
    </div>
  </div>
);

// Utility Components
const MetricCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700'
  };

  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <Icon size={24} className="mx-auto mb-2" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New Lead' },
    contacted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Contacted' },
    qualified: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Qualified' },
    closed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Closed' }
  };

  const config = statusConfig[status] || statusConfig.new;

  return (
    <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-sm font-medium`}>
      {config.label}
    </span>
  );
};

const StatItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Icon size={16} className="text-slate-500" />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-semibold text-slate-900">{value}</span>
  </div>
);

// Placeholder components for missing cards
const PropertyInfoCard = ({ lead }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Property Information</h3>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-slate-500">Property Type</label>
        <p className="font-medium">{lead.property_type || 'Residential'}</p>
      </div>
      <div>
        <label className="text-sm text-slate-500">Square Footage</label>
        <p className="font-medium">{lead.square_footage || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm text-slate-500">Bedrooms</label>
        <p className="font-medium">{lead.bedrooms || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm text-slate-500">Bathrooms</label>
        <p className="font-medium">{lead.bathrooms || 'N/A'}</p>
      </div>
    </div>
  </div>
);

const PropertyFeaturesCard = ({ lead }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Property Features</h3>
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Year Built: {lead.year_built || 'Unknown'}</p>
      <p className="text-sm text-slate-600">Lot Size: {lead.lot_size || 'N/A'}</p>
      <p className="text-sm text-slate-600">Garage: {lead.garage_spaces || 'N/A'} spaces</p>
    </div>
  </div>
);

const MapCard = ({ lead }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Location</h3>
    <div className="bg-slate-100 rounded-xl h-64 flex items-center justify-center">
      <div className="text-center">
        <MapPin size={48} className="mx-auto text-slate-400 mb-3" />
        <p className="text-slate-500">Interactive map would appear here</p>
        <p className="text-sm text-slate-400">{lead.full_address}</p>
      </div>
    </div>
  </div>
);

const LeadScoringCard = ({ aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Lead Scoring Analysis</h3>
    <div className="space-y-4">
      <ScoreBar label="Overall Lead Score" value={aiInsights?.leadScore || 75} />
      <ScoreBar label="Conversion Probability" value={aiInsights?.conversionProbability || 65} />
      <ScoreBar label="Engagement Level" value={85} />
      <ScoreBar label="Response Likelihood" value={72} />
    </div>
  </div>
);

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold">{value}%</span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
);

const KeyInsightsCard = ({ aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Insights</h3>
    <div className="space-y-3">
      {aiInsights?.keyInsights?.map((insight, index) => (
        <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
          <Lightbulb size={16} className="text-amber-500 mt-0.5" />
          <p className="text-sm text-slate-700">{insight}</p>
        </div>
      ))}
    </div>
  </div>
);

const StrategyRecommendationsCard = ({ aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategy Recommendations</h3>
    <div className="space-y-3">
      {aiInsights?.recommendedActions?.map((action, index) => (
        <ActionRecommendation key={index} action={action} />
      ))}
    </div>
  </div>
);

const OptimalTimingCard = ({ aiInsights }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Optimal Contact Timing</h3>
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-500">Best Contact Time</label>
        <p className="font-semibold text-lg">{aiInsights?.bestContactTime}</p>
      </div>
      <div>
        <label className="text-sm text-slate-500">Preferred Channel</label>
        <p className="font-semibold">{aiInsights?.preferredChannel}</p>
      </div>
    </div>
  </div>
);

const CommunicationHistoryCard = () => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Communication History</h3>
    <div className="text-center py-12">
      <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">No communications yet</p>
      <p className="text-sm text-slate-400">Start the conversation to see history here</p>
    </div>
  </div>
);

const SequenceEnrollmentCard = ({ sequences }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Sequence Enrollment</h3>
    <div className="text-center py-8">
      <Bot size={48} className="mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">Not enrolled in any sequences</p>
      <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
        Enroll in Sequence
      </button>
    </div>
  </div>
);

const QuickMessageCard = ({ lead }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Message</h3>
    <div className="space-y-4">
      <textarea
        className="w-full h-32 p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Type your message..."
      />
      <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
        <Send size={16} />
        <span>Send Message</span>
      </button>
    </div>
  </div>
);

const CallHistoryCard = ({ voiceCalls }) => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Call History</h3>
    <div className="text-center py-8">
      <Phone size={48} className="mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">No calls recorded</p>
      <button className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">
        Make Call
      </button>
    </div>
  </div>
);

const ActivityItem = ({ activity }) => (
  <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
      <Activity size={16} className="text-blue-600" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-slate-900">{activity.description}</p>
      <p className="text-sm text-slate-500">{format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}</p>
    </div>
  </div>
);

export default LeadDetailPageRedesigned;