/**
 * Home (Landing Page) - ABSOLUTELY PERFECT
 */
import React, { useState, useEffect } from 'react';
import { useSEO } from '../utils/seo';
import { track } from '../utils/analytics';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Shield,
  Sparkles,
  Bot,
  Calendar,
  DollarSign,
  ChevronRight,
  Star,
  X,
  Home as HomeIcon,
  MapPin,
  Clock,
  FileText,
  Layers,
  Play,
  ChevronDown,
  ChevronUp,
  User,
  Bell,
  Settings
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  useSEO({
    title: 'Fish Mouth AI — Book 15+ Roofing Inspections/Week With 25 Free Leads',
    description: 'Stop cold calling. Our AI finds homeowners with 15+ year roofs, qualifies them, and books your calendar. Get 25 free leads + 60-day guarantee.',
    canonical: 'https://fishmouth.io/',
    url: 'https://fishmouth.io/',
    ogTitle: 'Fish Mouth AI for Roofers',
    ogDescription: 'AI that finds aged roofs and fills your calendar. Get 25 free leads.',
    ogImage: 'https://fishmouth.io/og-home.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Fish Mouth AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://fishmouth.io/',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '25 free leads + 14-day access'
      }
    }
  });
  
  // State management
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showSequences, setShowSequences] = useState(false);
  const [showCallStrategies, setShowCallStrategies] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedNotes, setExpandedNotes] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState(false);
  const [expandedRoofAnalysis, setExpandedRoofAnalysis] = useState(false);
  const [expandedContact, setExpandedContact] = useState(false);
  const [floatingIndex, setFloatingIndex] = useState(0);
  const [videoCardIndex, setVideoCardIndex] = useState(0);
  const [mobileOverlayIndex, setMobileOverlayIndex] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('dashboard'); // dashboard, leads, analytics, settings, ai-activity, calendar
  
  // Settings tab state
  const [notificationSettings, setNotificationSettings] = useState({
    newLeads: true,
    hotLeads: true,
    callAlerts: true,
    weeklyReports: false
  });
  const [aiSettings, setAISettings] = useState({
    voiceTone: 'professional',
    leadThreshold: 80,
    callAttempts: '3'
  });
  
  // To-do list state
  const [todoItems, setTodoItems] = useState([
    { id: 1, text: 'Call Lisa Anderson', details: 'Hot lead • Roof: 22 yrs • Score: 95', time: 'Today 2:00 PM', priority: 'high', completed: false },
    { id: 2, text: 'Follow up: 3 warm leads', details: 'Ready for quote discussions', note: '📞 AI assisted calls', priority: 'medium', completed: false },
    { id: 3, text: 'Review AI call summaries', details: '12 calls completed today', priority: 'low', completed: false },
    { id: 4, text: 'Send quotes: 2 inspections done', details: 'Ready to convert', priority: 'ready', completed: false }
  ]);
  
  const [showAllTasks, setShowAllTasks] = useState(false);
  
  // AI Activity tab state
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  // Calendar filters
  const [calendarFilters, setCalendarFilters] = useState({
    aiAgent: true,
    inspections: true,
    personal: true,
    followUps: true
  });
  
  // Cycle floating notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setFloatingIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Cycle video overlay card
  useEffect(() => {
    const interval = setInterval(() => {
      setVideoCardIndex((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Cycle mobile aerial overlays
  useEffect(() => {
    const interval = setInterval(() => {
      setMobileOverlayIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Demo Leads Data
  const demoLeads = [
    {
      id: 1,
      address: '123 Oak Street',
      city: 'Dallas, TX',
      score: 94,
      priority: 'hot',
      roofAge: 18,
      condition: 'Poor',
      value: '$485K',
      status: 'contacted',
      roofArea: '2,850 sq ft',
      roofType: 'Asphalt Shingles',
      lastReplaced: '2006',
      homeOwner: 'John & Sarah Mitchell',
      phone: '(214) 555-0123',
      email: 'mitchell.family@email.com',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop',
      // Extended property details matching actual API
      propertyType: 'Single Family Residential',
      yearBuilt: 1998,
      lotSize: '8,500 sq ft',
      bedrooms: 4,
      bathrooms: 3,
      stories: 2,
      garage: '2-car attached',
      hvacAge: 8,
      foundationType: 'Slab',
      exteriorMaterial: 'Brick & Vinyl Siding',
      roofPitch: '6:12',
      roofLayers: 1,
      gutterCondition: 'Fair',
      chimneyPresent: true,
      skylightCount: 2,
      ventilationType: 'Ridge Vent',
      estimatedReplacementCost: '$18,500 - $22,000',
      insuranceClaim: 'None in last 5 years',
      damageDetected: ['Missing shingles (NE corner)', 'Granule loss (South face)', 'Possible leak point (valley)'],
      aiCallNotes: [
        { time: '2:34 PM', note: 'AI: Introduced Fish Mouth roofing services, mentioned 18-year-old roof requires attention' },
        { time: '2:35 PM', note: 'Lead: Expressed concern about cost, asked about warranty coverage options' },
        { time: '2:36 PM', note: 'AI: Explained comprehensive 25-year warranty, addressed budget concerns with financing' },
        { time: '2:37 PM', note: 'Lead: Very interested, requested detailed quote and timeline for replacement' },
        { time: '2:38 PM', note: 'AI: Successfully scheduled inspection appointment for Thursday 2:00 PM' }
      ],
      callSummary: {
        duration: '4 min 15 sec',
        sentiment: 'Positive',
        intent: 'High Purchase Intent',
        objections: ['Cost concerns', 'Warranty questions'],
        outcome: 'Inspection Scheduled',
        nextSteps: ['Send quote via email', 'Confirm appointment 24hrs before', 'Prepare inspection checklist']
      }
    },
    {
      id: 2,
      address: '456 Maple Avenue',
      city: 'Dallas, TX',
      score: 87,
      priority: 'warm',
      roofAge: 15,
      condition: 'Fair',
      value: '$420K',
      status: 'new',
      roofArea: '2,400 sq ft',
      roofType: 'Architectural Shingles',
      lastReplaced: '2009',
      homeOwner: 'David Chen',
      phone: '(214) 555-0456',
      email: 'd.chen@email.com',
      image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200&auto=format&fit=crop',
      propertyType: 'Single Family Residential',
      yearBuilt: 2001,
      lotSize: '7,200 sq ft',
      bedrooms: 3,
      bathrooms: 2.5,
      stories: 2,
      garage: '2-car attached',
      hvacAge: 6,
      foundationType: 'Crawl Space',
      exteriorMaterial: 'Fiber Cement',
      roofPitch: '5:12',
      roofLayers: 1,
      gutterCondition: 'Good',
      chimneyPresent: false,
      skylightCount: 0,
      ventilationType: 'Box Vents',
      estimatedReplacementCost: '$16,000 - $19,500',
      insuranceClaim: 'None',
      damageDetected: ['Minor wear patterns', 'Algae growth (North face)'],
      aiCallNotes: [
        { time: '10:15 AM', note: 'AI: Initial contact, offered free roof assessment and condition report' },
        { time: '10:16 AM', note: 'Lead: Currently comparing multiple roofing contractors for quotes' },
        { time: '10:17 AM', note: 'AI: Offered free inspection with no obligation, highlighted 15+ year experience' }
      ],
      callSummary: {
        duration: '2 min 30 sec',
        sentiment: 'Neutral',
        intent: 'Medium Purchase Intent',
        objections: ['Shopping around', 'No urgency'],
        outcome: 'Follow-up Scheduled',
        nextSteps: ['Send comparison guide', 'Follow up in 3 days', 'Offer limited-time discount']
      }
    },
    {
      id: 3,
      address: '789 Pine Road',
      city: 'Dallas, TX',
      score: 91,
      priority: 'hot',
      roofAge: 17,
      condition: 'Poor',
      value: '$525K',
      status: 'booked',
      roofArea: '3,200 sq ft',
      roofType: 'Composition Shingles',
      lastReplaced: '2007',
      homeOwner: 'Maria Rodriguez',
      phone: '(214) 555-0789',
      email: 'maria.r@email.com',
      image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&auto=format&fit=crop',
      propertyType: 'Single Family Residential',
      yearBuilt: 1995,
      lotSize: '10,000 sq ft',
      bedrooms: 5,
      bathrooms: 3.5,
      stories: 2,
      garage: '3-car attached',
      hvacAge: 12,
      foundationType: 'Slab',
      exteriorMaterial: 'Stucco',
      roofPitch: '7:12',
      roofLayers: 2,
      gutterCondition: 'Poor',
      chimneyPresent: true,
      skylightCount: 3,
      ventilationType: 'Turbine Vents',
      estimatedReplacementCost: '$22,000 - $26,500',
      insuranceClaim: 'Hail damage claim 2019',
      damageDetected: ['Severe granule loss', 'Curling shingles', 'Active leak confirmed', 'Damaged flashing'],
      aiCallNotes: [
        { time: '3:20 PM', note: 'AI: Contacted regarding urgent roof replacement need due to age and condition' },
        { time: '3:22 PM', note: 'Lead: Very interested! Mentioned recent storm damage and visible leaks inside' },
        { time: '3:24 PM', note: 'AI: Prioritized as emergency, scheduled inspection for tomorrow 9:00 AM' },
        { time: '3:25 PM', note: 'Lead: Grateful for quick response time, ready to proceed immediately' }
      ],
      callSummary: {
        duration: '5 min 45 sec',
        sentiment: 'Very Positive',
        intent: 'Immediate Purchase Intent',
        objections: ['None - Urgent need'],
        outcome: 'Emergency Inspection Booked',
        nextSteps: ['Confirm emergency appointment', 'Prepare damage assessment', 'Draft quote for same-day approval']
      }
    }
  ];

  // Sequence Templates with BULLET POINTS
  const sequences = [
    {
      id: 1,
      name: '4-Step Email Nurture',
      steps: 4,
      duration: '7 days',
      description: 'AI-personalized email sequence with roof urgency messaging',
      icon: <Mail size={24} />,
      color: 'blue',
      bullets: [
        'Day 1: Introduction email with roof condition report',
        'Day 3: Educational content about roof lifespan',
        'Day 5: Customer testimonials and case studies',
        'Day 7: Limited-time offer with free inspection CTA'
      ]
    },
    {
      id: 2,
      name: 'Voice + SMS Combo',
      steps: 5,
      duration: '5 days',
      description: 'AI calls + follow-up SMS + email for maximum reach',
      icon: <Phone size={24} />,
      color: 'purple',
      bullets: [
        'Day 1: AI voice call with personalized pitch',
        'Day 2: Follow-up SMS with inspection link',
        'Day 3: Email with detailed service information',
        'Day 4: Second AI call for objection handling',
        'Day 5: Final SMS with urgency-based offer'
      ]
    },
    {
      id: 3,
      name: 'Info Pamphlet Mailer',
      steps: 3,
      duration: '10 days',
      description: 'Physical mail with personalized roof report + follow-up calls',
      icon: <FileText size={24} />,
      color: 'green',
      bullets: [
        'Day 1: Send personalized roof analysis pamphlet',
        'Day 5: AI call to confirm receipt and discuss',
        'Day 10: Follow-up call with special pricing offer'
      ]
    },
    {
      id: 4,
      name: 'Aggressive Hot Lead',
      steps: 6,
      duration: '3 days',
      description: 'Immediate AI call + hourly SMS + daily emails until booked',
      icon: <Zap size={24} />,
      color: 'red',
      bullets: [
        'Hour 1: Immediate AI call attempt',
        'Hour 2-4: Hourly SMS reminders',
        'Day 1: Email with urgent roof replacement info',
        'Day 2: Second AI call with pricing options',
        'Day 2: Evening SMS with limited slots warning',
        'Day 3: Final call + email with best offer'
      ]
    }
  ];

  // AI Call Strategies with BULLET POINTS
  const callStrategies = [
    {
      id: 1,
      name: 'Soft Approach',
      description: 'Gentle introduction, educational focus, no pressure',
      icon: <MessageSquare size={24} />,
      color: 'blue',
      bullets: [
        'Start with friendly greeting and roof age inquiry',
        'Offer free educational roof condition report',
        'Schedule optional no-obligation inspection',
        'Follow up only if homeowner shows interest'
      ]
    },
    {
      id: 2,
      name: 'Urgency Builder',
      description: 'Highlight roof age, condition risks, act-now messaging',
      icon: <Zap size={24} />,
      color: 'orange',
      bullets: [
        'Emphasize 18-year roof exceeds typical lifespan',
        'Explain risks: leaks, structural damage, costly repairs',
        'Limited-time seasonal discount (expires soon)',
        'Book inspection within 48 hours for best pricing'
      ]
    },
    {
      id: 3,
      name: 'Value-Focused',
      description: 'ROI emphasis, financing options, long-term savings',
      icon: <DollarSign size={24} />,
      color: 'green',
      bullets: [
        'Discuss energy savings with modern roofing',
        'Present flexible financing options (0% APR)',
        'Highlight increased home value after replacement',
        'Offer bundled services discount (gutters + siding)'
      ]
    },
    {
      id: 4,
      name: 'Consultative Expert',
      description: 'Position as trusted advisor, answer all questions',
      icon: <Shield size={24} />,
      color: 'purple',
      bullets: [
        'Ask detailed questions about current roof issues',
        'Provide expert analysis and recommendations',
        'Compare material options (asphalt vs. metal vs. tile)',
        'Educate on warranty, maintenance, and lifespan'
      ]
    }
  ];

  const filteredLeads = activeFilter === 'all' 
    ? demoLeads 
    : demoLeads.filter(lead => lead.priority === activeFilter);

  // Floating notifications
  const floatingNotifications = [
    {
      icon: <Phone className="text-white" size={20} />,
      gradient: 'from-purple-600 to-pink-600',
      title: 'AI Calling...',
      subtitle: 'Sarah Martinez',
      detail: 'Handling objection #3',
      badge: '📞 Live'
    },
    {
      icon: <Mail className="text-white" size={20} />,
      gradient: 'from-blue-600 to-cyan-600',
      title: 'Email Opened',
      subtitle: 'John Smith',
      detail: '3 clicks • Hot lead!',
      badge: '📧 Engaged'
    },
    {
      icon: <Calendar className="text-white" size={20} />,
      gradient: 'from-green-600 to-emerald-600',
      title: 'Appointment Booked',
      subtitle: 'Lisa Anderson',
      detail: 'Tomorrow 2:00 PM',
      badge: '✓ Booked'
    }
  ];

  // Video overlay cards - AI thinking process
  const videoCards = [
    { text: '🔍 Scanning properties...', color: 'from-blue-600 to-cyan-600' },
    { text: '🎯 Analyzing roof age...', color: 'from-purple-600 to-pink-600' },
    { text: '📊 Scoring lead quality...', color: 'from-orange-600 to-red-600' },
    { text: '📞 AI calling lead...', color: 'from-green-600 to-emerald-600' }
  ];

  const currentNotification = floatingNotifications[floatingIndex];
  const currentVideoCard = videoCards[videoCardIndex];

  const handleAssignSequence = (sequenceName) => {
    setShowSequences(false);
    setShowCallStrategies(false);
    setSuccessMessage(`✓ Successfully assigned lead to "${sequenceName}" sequence!`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleAssignCallStrategy = (strategyName) => {
    setShowCallStrategies(false);
    setShowSequences(false);
    setSuccessMessage(`✓ Successfully assigned AI call strategy: "${strategyName}"!`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                🐟 Fish Mouth
              </span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/case-studies"
                className="hidden sm:inline-block text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Case Studies
              </Link>
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm sm:text-base"
              >
                Sign In
              </Link>
              <button
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                Get 25 Free Leads Now
              </button>
            </div>
          </div>
        </div>
        {/* Announcement Bar */}
        <div className="bg-yellow-50 border-t border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-center">
            <span className="text-yellow-800 text-sm sm:text-base">Limited offer: 25 free leads + $299 setup included</span>
            <button
              onClick={() => navigate('/signup')}
              className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-white bg-gradient-to-r from-blue-600 to-cyan-600 text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-cyan-700"
              aria-label="Claim 25 free leads now"
            >
              Claim Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - CONVERSION OPTIMIZED */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 antialiased">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-5 sm:space-y-6 mb-6 sm:mb-8">
            {/* Problem-Focused Badge */}
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-5 sm:px-7 py-2.5 rounded-full font-bold text-sm sm:text-base border-2 border-red-200 shadow-md">
              <Zap size={20} className="hidden sm:block" />
              <span>Tired of Chasing Dead-End Leads?</span>
            </div>
            
            {/* Benefit-Driven Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[60px] font-extrabold text-gray-900 leading-tight tracking-tight">
              Book 15+ Roofing Inspections Every Week — On Autopilot
              <span className="block text-2xl sm:text-3xl lg:text-4xl xl:text-[36px] mt-3 sm:mt-4 text-gray-700 font-semibold">
                AI finds aged roofs, qualifies homeowners, and fills your calendar
              </span>
            </h1>
            
            {/* Value Proposition */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto font-medium">
              Stop cold calling and buying bad lists. Close more jobs with qualified homeowners who need a new roof now.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center pt-4">
              <button
                onClick={() => { track('cta_click.home.hero', { location: 'hero' }); navigate('/signup'); }}
                aria-label="Get 25 free roofing leads and start booking inspections"
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 sm:px-10 py-4 sm:py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl text-base sm:text-lg flex items-center justify-center gap-3"
              >
                <Sparkles size={24} />
                <span>Get 25 Free Leads Now</span>
                <ArrowRight size={24} />
              </button>
            </div>

            {/* Social Proof / Assurances */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 pt-5 sm:pt-6 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={18} />
                </div>
                <span className="text-gray-800 font-bold">25 Free Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-blue-600" size={18} />
                </div>
                <span className="text-gray-800 font-bold">Setup in 5 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="text-purple-600" size={18} />
                </div>
                <span className="text-gray-800 font-bold">No Credit Card • 60-Day Guarantee</span>
              </div>
            </div>
          </div>
          
          {/* VIDEO - HIDDEN FOR NOW */}
          {false && (
          <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-2 border-gray-700">
              <div className="relative aspect-video bg-gradient-to-br from-blue-900 via-purple-900 to-cyan-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-6 p-8 z-10">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto cursor-pointer hover:scale-110 hover:bg-white/30 transition-all shadow-2xl">
                      <Play className="text-white ml-1" size={48} />
                    </div>
                    <div className="text-white space-y-3">
                      <div className="text-3xl sm:text-4xl font-bold">Watch Fish Mouth in Action</div>
                      <div className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto">
                        See how our AI finds aged roofs, scores leads, makes calls, and books appointments automatically
                      </div>
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                        <Clock size={16} />
                        <span>30 seconds</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-6 right-6">
                  <div 
                    key={videoCardIndex}
                    className={`bg-gradient-to-r ${currentVideoCard.color} text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-white/20 animate-pulse transition-all duration-500`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <div className="font-bold text-base">{currentVideoCard.text}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-bold text-lg">30-Second Platform Demo</div>
                    <div className="text-gray-400 text-sm">See the complete AI lead generation process</div>
                  </div>
                  <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2 whitespace-nowrap">
                    <Play size={18} />
                    <span className="hidden sm:inline">Watch Demo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* SOCIAL PROOF - EARLY RESULTS */}
      <section className="py-10 sm:py-12 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Join 500+ Roofing Companies Already Winning
            </h2>
            <p className="text-lg sm:text-xl text-blue-100">
              Real results from real roofers using Fish Mouth
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 items-stretch">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/20 h-full flex flex-col items-center justify-center">
              <div className="tabular-nums whitespace-nowrap tracking-tight text-3xl md:text-4xl lg:text-5xl leading-none font-extrabold text-white mb-1">$2.4M+</div>
              <div className="text-xs sm:text-sm md:text-base text-blue-100 font-semibold mt-1">Revenue Generated</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/20 h-full flex flex-col items-center justify-center">
              <div className="tabular-nums whitespace-nowrap tracking-tight text-3xl md:text-4xl lg:text-5xl leading-none font-extrabold text-white mb-1">12,000+</div>
              <div className="text-xs sm:text-sm md:text-base text-blue-100 font-semibold mt-1">Qualified Leads</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/20 h-full flex flex-col items-center justify-center">
              <div className="tabular-nums whitespace-nowrap tracking-tight text-3xl md:text-4xl lg:text-5xl leading-none font-extrabold text-white mb-1">34%</div>
              <div className="text-xs sm:text-sm md:text-base text-blue-100 font-semibold mt-1">Avg Close Rate</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/20 h-full flex flex-col items-center justify-center">
              <div className="tabular-nums whitespace-nowrap tracking-tight text-3xl md:text-4xl lg:text-5xl leading-none font-extrabold text-white mb-1">2.4 hrs</div>
              <div className="text-xs sm:text-sm md:text-base text-blue-100 font-semibold mt-1">Avg Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM-AGITATE SECTION */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              The Problem Every Roofer Faces
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              You're great at roofing. But finding quality leads? That's a full-time job.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12 items-stretch">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 sm:p-8 h-full flex flex-col">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wasted Time</h3>
              <p className="text-gray-700 leading-relaxed flex-1">Hours burned cold calling and door knocking that don’t become jobs.</p>
              <p className="mt-3 text-gray-800 font-semibold">Fish Mouth books inspections for you, automatically.</p>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 sm:p-8 h-full flex flex-col">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Low-Quality Leads</h3>
              <p className="text-gray-700 leading-relaxed flex-1">Tire-kickers, no budget, and ghosting kill your close rate.</p>
              <p className="mt-3 text-gray-800 font-semibold">We target aged roofs (15+ years) — 80%+ hot lead quality.</p>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 sm:p-8 h-full flex flex-col">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Unpredictable Revenue</h3>
              <p className="text-gray-700 leading-relaxed flex-1">Feast-or-famine cycles make it hard to plan and scale.</p>
              <p className="mt-3 text-gray-800 font-semibold">Your calendar fills weekly — 15+ inspections, consistently.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={40} />
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What If AI Did All of This For You?
            </h3>
            <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto mb-8">
              Fish Mouth finds homeowners with <span className="font-bold text-green-600">aged roofs</span> in your area, 
              scores them for quality, calls them automatically, and books inspections—
              <span className="block mt-3 font-extrabold text-2xl sm:text-3xl text-blue-600">
                While You Focus on Closing Deals
              </span>
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-10 py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl text-lg flex items-center gap-3 mx-auto"
            >
              <Sparkles size={22} />
              <span>See How It Works - FREE</span>
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DASHBOARD DEMO SECTION - REAL DASHBOARD VIEW */}
      <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Preview Header */}
          <div className="max-w-6xl mx-auto mb-12 sm:mb-16">
            <div className="text-center space-y-6 sm:space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                See Your New Lead Generation
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">
                  Command Center
                </span>
              </h2>
              <p className="text-xl sm:text-2xl text-gray-700 max-w-4xl mx-auto font-semibold leading-relaxed">
                This is what you'll see every day: <span className="text-blue-600 font-bold">Hot leads</span> automatically found, 
                scored, and contacted—
                <span className="block mt-2 text-green-600 font-extrabold">Ready for you to close</span>
              </p>
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 px-6 py-3 rounded-full">
                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-bold text-sm sm:text-base">👇 Click around to explore</span>
              </div>
            </div>
          </div>

          {/* Dashboard UI */}
          <div className="max-w-6xl mx-auto px-2 sm:px-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-300 hover:shadow-3xl transition-all duration-500">
              {/* Dashboard Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-8 py-6 sm:py-8">
                <div className="flex items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Professional Headshot for John */}
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-xl border-3 border-white/30">
                      JD
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 truncate">Welcome back, John</h2>
                      <p className="text-blue-100 text-xs sm:text-sm lg:text-base">Here's your lead generation overview</p>
                    </div>
                  </div>
                  <div className="hidden md:block text-white text-right flex-shrink-0">
                    <div className="text-xs sm:text-sm opacity-90 mb-1">Today</div>
                    <div className="font-bold text-base sm:text-lg whitespace-nowrap">Oct 10, 2025</div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation - MOBILE FIXED */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex overflow-x-auto scrollbar-hide gap-2 px-3 sm:px-8">
                  <button
                    onClick={() => setDashboardTab('dashboard')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'dashboard'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">📊</span>Dashboard
                  </button>
                  <button
                    onClick={() => setDashboardTab('leads')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'leads'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">👥</span>Leads
                  </button>
                  <button
                    onClick={() => setDashboardTab('analytics')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'analytics'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">📈</span>Analytics
                  </button>
                  <button
                    onClick={() => setDashboardTab('settings')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'settings'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">⚙️</span>Settings
                  </button>
                  <button
                    onClick={() => setDashboardTab('ai-activity')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'ai-activity'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">🤖</span>AI Activity
                  </button>
                  <button
                    onClick={() => setDashboardTab('calendar')}
                    className={`flex-shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 font-bold transition-all text-sm sm:text-base whitespace-nowrap rounded-t-lg ${
                      dashboardTab === 'calendar'
                        ? 'text-blue-600 border-b-4 border-blue-600 bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">📅</span>Calendar
                  </button>
                </div>
              </div>

              {/* DASHBOARD CONTENT - BUSINESS OPERATIONS CENTER */}
              {dashboardTab === 'dashboard' && (
                <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 max-h-[700px] overflow-y-auto">
                  {/* Top Row: Key Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold">New Leads</span>
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Target className="text-blue-600" size={18} />
                    </div>
                    </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">23</div>
                      <div className="text-xs text-green-600 font-semibold mt-1">+12% today</div>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border-2 border-red-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold">Hot Leads</span>
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <Zap className="text-red-600" size={18} />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">8</div>
                      <div className="text-xs text-red-600 font-semibold mt-1">Need attention</div>
                  </div>

                    <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold">Appointments</span>
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Calendar className="text-green-600" size={18} />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">5</div>
                      <div className="text-xs text-green-600 font-semibold mt-1">This week</div>
                        </div>
                    
                    <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold">Revenue</span>
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="text-purple-600" size={18} />
                      </div>
                        </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">$47K</div>
                      <div className="text-xs text-green-600 font-semibold mt-1">+28% MTD</div>
                      </div>
                    </div>

                  {/* Main Content: 2 Column Layout */}
                  <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Left Column: To-Do & Quick Actions */}
                    <div className="lg:col-span-1 space-y-4">
                      {/* Priority To-Do List - INTERACTIVE */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                            <CheckCircle className="text-blue-600" size={20} />
                            Your To-Do List
                          </h3>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                            {todoItems.filter(t => !t.completed).length} tasks
                          </span>
                  </div>

                        <div className="space-y-2">
                          {todoItems.slice(0, showAllTasks ? undefined : 4).map((task) => {
                            const priorityColors = {
                              high: { bg: 'bg-red-50', border: 'border-red-200', checkbox: 'border-red-600', text: 'text-red-600', hover: 'hover:bg-red-100' },
                              medium: { bg: 'bg-orange-50', border: 'border-orange-200', checkbox: 'border-orange-600', text: 'text-orange-600', hover: 'hover:bg-orange-100' },
                              low: { bg: 'bg-blue-50', border: 'border-blue-200', checkbox: 'border-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
                              ready: { bg: 'bg-green-50', border: 'border-green-200', checkbox: 'border-green-600', text: 'text-green-600', hover: 'hover:bg-green-100' }
                            };
                            const colors = priorityColors[task.priority];
                            
                            return (
                              <div 
                                key={task.id}
                                onClick={() => {
                                  setTodoItems(prev => prev.map(t => 
                                    t.id === task.id ? {...t, completed: !t.completed} : t
                                  ));
                                }}
                                className={`flex items-start gap-3 p-3 ${colors.bg} border ${colors.border} rounded-lg ${colors.hover} transition-all cursor-pointer ${task.completed ? 'opacity-50' : ''}`}
                              >
                                <div className={`w-5 h-5 border-2 ${colors.checkbox} rounded mt-0.5 flex-shrink-0 flex items-center justify-center`}>
                                  {task.completed && <CheckCircle className={colors.text} size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {task.text}
                                  </div>
                                  <div className="text-xs text-gray-600">{task.details}</div>
                                  {task.time && <div className={`text-xs ${colors.text} font-semibold mt-1`}>⏰ {task.time}</div>}
                                  {task.note && <div className={`text-xs ${colors.text} font-semibold mt-1`}>{task.note}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                      <button 
                          onClick={() => setShowAllTasks(!showAllTasks)}
                          className="w-full mt-3 text-center text-sm text-blue-600 hover:text-blue-700 font-semibold transition-all"
                      >
                          {showAllTasks ? 'Show less ↑' : 'View all tasks →'}
                      </button>
                    </div>

                      {/* Quick Actions */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-200 shadow-sm">
                        <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2">
                          <Zap className="text-blue-600" size={20} />
                          Quick Actions
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md">
                            <Phone size={20} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">Call Hot Lead</div>
                          </button>
                          
                          <button className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md">
                            <Calendar size={20} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">Book Inspection</div>
                          </button>
                          
                          <button className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-md">
                            <Mail size={20} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">Send Quote</div>
                          </button>
                          
                        <button
                            onClick={() => setDashboardTab('leads')}
                            className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-md"
                          >
                            <Target size={20} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">View All Leads</div>
                          </button>
                                </div>
                              </div>
                            </div>

                    {/* Right Column: Performance Charts */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Lead Generation Chart - ENHANCED */}
                      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                            <BarChart3 className="text-blue-600" size={20} />
                            Lead Generation (Last 7 Days)
                          </h3>
                          <div className="text-right">
                            <div className="text-xs text-gray-600">Total</div>
                            <div className="text-xl font-bold text-blue-600">182</div>
                          </div>
                        </div>
                        
                        <div className="flex items-end justify-between gap-2 h-48">
                          {[
                            { day: 'Mon', value: 18, hot: 3 },
                            { day: 'Tue', value: 25, hot: 5 },
                            { day: 'Wed', value: 22, hot: 4 },
                            { day: 'Thu', value: 31, hot: 7 },
                            { day: 'Fri', value: 28, hot: 5 },
                            { day: 'Sat', value: 35, hot: 8 },
                            { day: 'Sun', value: 23, hot: 4 }
                          ].map((item, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full relative group cursor-pointer">
                                {/* Hot leads section (red top) */}
                                <div 
                                  className="w-full bg-gradient-to-t from-red-500 to-orange-500 rounded-t-lg transition-all"
                                  style={{ height: `${(item.hot / 35) * 100 * 0.7}px` }}
                                ></div>
                                {/* Total leads section (blue) */}
                                <div 
                                  className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all"
                                  style={{ height: `${((item.value - item.hot) / 35) * 100 * 0.7}px` }}
                                ></div>
                                
                                {/* Tooltip */}
                                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                                  <div className="font-bold">{item.value} total leads</div>
                                  <div className="text-red-300">{item.hot} hot leads</div>
                                </div>
                                
                                {/* Value label on bar */}
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 text-xs font-bold text-gray-700">
                                  {item.value}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 font-semibold">{item.day}</div>
                            </div>
                      ))}
                    </div>
                        
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-cyan-500 rounded"></div>
                            <span className="text-xs text-gray-600">All Leads</span>
                  </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-red-500 to-orange-500 rounded"></div>
                            <span className="text-xs text-gray-600">Hot Leads (90+)</span>
                          </div>
                        </div>
                      </div>

                      {/* AI Performance & Engagement */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* AI Call Performance - ENHANCED */}
                        <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-200 shadow-sm">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-4 flex items-center gap-2">
                            <Phone className="text-green-600" size={18} />
                            AI Call Performance
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">Calls Made Today</span>
                                <span className="text-base font-bold text-gray-900">147 <span className="text-xs text-green-600">+23 vs yesterday</span></span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                  85% of daily goal
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">Connection Rate</span>
                                <span className="text-base font-bold text-blue-600">68% <span className="text-xs text-gray-600">(100/147)</span></span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full" style={{ width: '68%' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                  Industry avg: 45%
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">Appointments Booked</span>
                                <span className="text-base font-bold text-purple-600">18 <span className="text-xs text-gray-600">(42% success)</span></span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full animate-pulse" style={{ width: '42%' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                  ⭐ Excellent rate!
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">Avg Call Duration</span>
                                <span className="text-base font-bold text-orange-600">3:24 <span className="text-xs text-gray-600">min</span></span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full" style={{ width: '75%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lead Quality Distribution - ENHANCED */}
                        <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-200 shadow-sm">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-4 flex items-center gap-2">
                            <Target className="text-blue-600" size={18} />
                            Lead Quality Distribution
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-700">🔥 Hot</span>
                                  <span className="text-[10px] text-gray-500">(90-100)</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-bold text-red-600">8</span>
                                  <span className="text-xs text-gray-600 ml-1">(35%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-red-600 to-orange-600 h-3 rounded-full animate-pulse" style={{ width: '35%' }}></div>
                                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-gray-600">
                                  Call today!
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-700">🟠 Warm</span>
                                  <span className="text-[10px] text-gray-500">(70-89)</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-bold text-orange-600">12</span>
                                  <span className="text-xs text-gray-600 ml-1">(52%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full" style={{ width: '52%' }}></div>
                                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-gray-600">
                                  Follow up
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-700">🔵 Cold</span>
                                  <span className="text-[10px] text-gray-500">(50-69)</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-bold text-blue-600">3</span>
                                  <span className="text-xs text-gray-600 ml-1">(13%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full" style={{ width: '13%' }}></div>
                                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-gray-600">
                                  Nurture
                                </div>
                              </div>
                            </div>
                            
                            {/* Total */}
                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">Total Leads</span>
                                <span className="text-lg font-bold text-blue-600">23</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fish Mouth AI Summary */}
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 sm:p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="text-white" size={22} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Fish Mouth AI Summary</h3>
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">
                              <span className="font-semibold text-blue-600">Great day!</span> Your AI generated 23 new leads, 
                              made 147 calls with 42% success rate, and booked 5 appointments. 
                              <span className="font-semibold text-green-600"> 8 hot leads</span> need your attention today.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => setDashboardTab('leads')}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                              >
                                View Hot Leads →
                              </button>
                              <button className="bg-white hover:bg-gray-100 text-blue-600 text-xs font-bold px-3 py-2 rounded-lg transition-all border border-blue-300">
                                See AI Call Notes
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dashboardTab === 'leads' && (
                <>
                  {/* Filter Buttons for Leads - ENHANCED DESIGN */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-gray-900">Filter Leads</h3>
                      <div className="text-sm text-gray-600">
                        Showing <span className="font-bold text-blue-600">{filteredLeads.length}</span> of {demoLeads.length}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap justify-center">
                      <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all text-sm shadow-md ${
                          activeFilter === 'all'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl transform scale-105'
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>All Leads</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'all' ? 'bg-white/20' : 'bg-gray-200'}`}>
                            {demoLeads.length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveFilter('hot')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all text-sm shadow-md ${
                          activeFilter === 'hot'
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl transform scale-105'
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>🔥 Hot</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'hot' ? 'bg-white/20' : 'bg-gray-200'}`}>
                            {demoLeads.filter(l => l.priority === 'hot').length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveFilter('warm')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all text-sm shadow-md ${
                          activeFilter === 'warm'
                            ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-xl transform scale-105'
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>⚡ Warm</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'warm' ? 'bg-white/20' : 'bg-gray-200'}`}>
                            {demoLeads.filter(l => l.priority === 'warm').length}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Clickable Lead Cards */}
                  <div className="p-4 sm:p-6 space-y-3 relative">
                    <div className="text-xs sm:text-sm text-gray-500 font-semibold uppercase mb-4">
                      Click any lead to see full AI analysis ↓
                    </div>
                    
                    {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      setShowSequences(false);
                      setShowCallStrategies(false);
                    }}
                    className={`w-full text-left p-4 sm:p-5 rounded-xl border-l-4 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${
                      lead.priority === 'hot'
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-500 hover:from-red-100 hover:to-orange-100'
                        : lead.priority === 'warm'
                        ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400 hover:from-orange-100 hover:to-yellow-100'
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 hover:from-green-100 hover:to-emerald-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin size={16} className="text-gray-600" />
                          <div className="font-bold text-gray-900 text-base sm:text-lg">{lead.address}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {lead.city} • Roof Age: {lead.roofAge} years
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="text-xs font-bold bg-white/80 px-3 py-1 rounded-full">
                            Score: {lead.score}/100
                          </div>
                          {lead.status === 'booked' && (
                            <div className="text-xs font-bold bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1">
                              <Calendar size={12} />
                              Appointment Booked
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-3xl sm:text-4xl">
                          {lead.priority === 'hot' ? '🔥' : lead.priority === 'warm' ? '⚡' : '✓'}
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                      </div>
                    </div>
                      </button>
                    ))}
                  
                    {/* SINGLE Animated Floating Notification - PERFECTLY POSITIONED */}
                    <div className="hidden xl:block absolute -right-80 top-32 z-10">
                  <div 
                    key={floatingIndex}
                    className={`bg-gradient-to-r ${currentNotification.gradient} rounded-2xl shadow-2xl p-6 w-80 border-2 border-white/20 animate-float transition-all duration-500`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                        {currentNotification.icon}
                      </div>
                      <div className="flex-1 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-lg">{currentNotification.title}</div>
                          <div className="text-xs bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full font-semibold">{currentNotification.badge}</div>
                        </div>
                        <div className="text-sm opacity-90 mb-3">{currentNotification.subtitle}</div>
                        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-white rounded-full animate-pulse" style={{width: '75%'}}></div>
                        </div>
                        <div className="text-xs opacity-80 font-medium">{currentNotification.detail}</div>
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {dashboardTab === 'analytics' && (
                <div className="p-4 sm:p-6 space-y-6 max-h-[600px] overflow-y-auto">
                  <h3 className="font-bold text-2xl text-gray-900">Performance Analytics</h3>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 font-semibold uppercase">Conversion Rate</div>
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Target className="text-white" size={20} />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-blue-600 mb-1">34.2%</div>
                      <div className="text-xs text-green-600 font-semibold">↑ 12.5% from last month</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 font-semibold uppercase">Avg Response</div>
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                          <Clock className="text-white" size={20} />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-green-600 mb-1">2.4h</div>
                      <div className="text-xs text-green-600 font-semibold">↓ 40% faster</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 font-semibold uppercase">Hot Leads</div>
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-2xl">
                          🔥
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-orange-600 mb-1">89</div>
                      <div className="text-xs text-green-600 font-semibold">↑ 23 new this week</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 font-semibold uppercase">Revenue MTD</div>
                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                          <DollarSign className="text-white" size={20} />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-purple-600 mb-1">$142K</div>
                      <div className="text-xs text-green-600 font-semibold">↑ 28.3% growth</div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-xl text-gray-900">Lead Generation (Last 30 Days)</h4>
                      <div className="text-sm text-gray-600">Total: <span className="font-bold text-blue-600">247 leads</span></div>
                    </div>
                    <div className="h-64 flex items-end gap-2 border-b-2 border-gray-300 pb-2">
                      {[45, 52, 48, 61, 58, 72, 68, 75, 82, 78, 85, 92, 88, 95].map((height, idx) => (
                        <div key={idx} className="flex-1 group relative">
                          <div 
                            className="bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg hover:from-blue-700 hover:to-cyan-600 transition-all cursor-pointer"
                            style={{height: `${height}%`}}
                          >
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {Math.round(247 * (height/100) / 14)} leads
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 text-center mt-2">D{idx+1}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lead Quality & Channel Performance */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                      <h4 className="font-bold text-xl text-gray-900 mb-6">Lead Quality</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-gray-700">Hot (90-100)</span>
                            </div>
                            <span className="text-base font-bold text-red-600">89 leads (36%)</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse" style={{width: '36%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-gray-700">Warm (70-89)</span>
                            </div>
                            <span className="text-base font-bold text-orange-600">104 leads (42%)</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full" style={{width: '42%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                              <span className="text-sm font-semibold text-gray-700">Cold (50-69)</span>
                            </div>
                            <span className="text-base font-bold text-blue-600">54 leads (22%)</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{width: '22%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                      <h4 className="font-bold text-xl text-gray-900 mb-6">Channel Performance</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-3">
                            <Phone className="text-purple-600" size={24} />
                            <div>
                              <div className="font-semibold text-gray-900">AI Voice Calls</div>
                              <div className="text-xs text-gray-600">1,247 calls made</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-purple-600">42%</div>
                            <div className="text-xs text-green-600">↑ 8%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <Mail className="text-blue-600" size={24} />
                            <div>
                              <div className="font-semibold text-gray-900">Email Campaigns</div>
                              <div className="text-xs text-gray-600">3,421 emails sent</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-600">28%</div>
                            <div className="text-xs text-green-600">↑ 5%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <MessageSquare className="text-green-600" size={24} />
                            <div>
                              <div className="font-semibold text-gray-900">SMS Messages</div>
                              <div className="text-xs text-gray-600">892 messages sent</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">18%</div>
                            <div className="text-xs text-green-600">↑ 12%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ROI Summary */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                    <h4 className="font-bold text-2xl mb-4">ROI Summary (This Month)</h4>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-sm opacity-90 mb-1">Total Investment</div>
                        <div className="text-3xl font-bold">$2,850</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-sm opacity-90 mb-1">Revenue Generated</div>
                        <div className="text-3xl font-bold">$142,000</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-sm opacity-90 mb-1">ROI</div>
                        <div className="text-3xl font-bold">4,882%</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-sm opacity-90 mb-1">Cost Per Lead</div>
                        <div className="text-3xl font-bold">$11.54</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dashboardTab === 'settings' && (
                <div className="p-4 sm:p-6 space-y-6">
                  <h3 className="font-bold text-2xl text-gray-900">Account Settings</h3>
                  
                  {/* Profile Settings */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <User className="text-white" size={24} />
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">Profile Information</h4>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name</label>
                        <input 
                          type="text" 
                          value="John Doe" 
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Company</label>
                        <input 
                          type="text" 
                          value="Acme Roofing Co." 
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                        <input 
                          type="email" 
                          value="john@acmeroofing.com" 
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Phone</label>
                        <input 
                          type="tel" 
                          value="(555) 123-4567" 
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900"
                        />
                      </div>
                    </div>
                    <button className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all">
                      Edit Profile
                    </button>
                  </div>

                  {/* Notification Preferences - INTERACTIVE */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Bell className="text-white" size={24} />
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">Notification Preferences</h4>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl hover:bg-purple-50 transition-all">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.newLeads}
                          onChange={(e) => setNotificationSettings({...notificationSettings, newLeads: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded cursor-pointer" 
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Email notifications for new leads</div>
                          <div className="text-xs text-gray-600">Get notified when new high-quality leads are found</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl hover:bg-purple-50 transition-all">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.hotLeads}
                          onChange={(e) => setNotificationSettings({...notificationSettings, hotLeads: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded cursor-pointer" 
                        />
                        <div>
                          <div className="font-semibold text-gray-900">SMS alerts for hot leads</div>
                          <div className="text-xs text-gray-600">Instant text alerts for leads scoring 90+</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl hover:bg-purple-50 transition-all">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.callAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, callAlerts: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded cursor-pointer" 
                        />
                        <div>
                          <div className="font-semibold text-gray-900">AI call completion alerts</div>
                          <div className="text-xs text-gray-600">Get notified when AI completes calls</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl hover:bg-purple-50 transition-all">
                        <input 
                          type="checkbox"
                          checked={notificationSettings.weeklyReports}
                          onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReports: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded cursor-pointer" 
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Weekly performance reports</div>
                          <div className="text-xs text-gray-600">Receive weekly analytics summaries via email</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* AI Agent Configuration - INTERACTIVE */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                        <Bot className="text-white" size={24} />
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">AI Agent Configuration</h4>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Voice Tone</label>
                        <select 
                          value={aiSettings.voiceTone}
                          onChange={(e) => setAISettings({...aiSettings, voiceTone: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900 cursor-pointer hover:border-orange-400 transition-all"
                        >
                          <option value="professional">Professional & Authoritative</option>
                          <option value="friendly">Friendly & Conversational</option>
                          <option value="casual">Casual & Relaxed</option>
                          <option value="urgent">Urgent & Direct</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Score Threshold</label>
                        <div className="bg-white p-4 rounded-xl border-2 border-gray-300">
                          <input 
                            type="range" 
                            min="50" 
                            max="100" 
                            value={aiSettings.leadThreshold}
                            onChange={(e) => setAISettings({...aiSettings, leadThreshold: parseInt(e.target.value)})}
                            className="w-full cursor-pointer accent-orange-600"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-600">50 (Low)</span>
                            <span className="text-base font-bold text-orange-600">{aiSettings.leadThreshold}/100</span>
                            <span className="text-xs text-gray-600">100 (High)</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Call Attempt Limit</label>
                        <select 
                          value={aiSettings.callAttempts}
                          onChange={(e) => setAISettings({...aiSettings, callAttempts: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900 cursor-pointer hover:border-orange-400 transition-all"
                        >
                          <option value="1">1 attempt</option>
                          <option value="2">2 attempts</option>
                          <option value="3">3 attempts (Recommended)</option>
                          <option value="5">5 attempts</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setShowSuccess(true);
                        setSuccessMessage('✓ AI settings saved successfully!');
                        setTimeout(() => setShowSuccess(false), 3000);
                      }}
                      className="mt-4 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-700 transition-all"
                    >
                      Save AI Settings
                    </button>
                  </div>

                  {/* Integrations */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                        <Settings className="text-white" size={24} />
                      </div>
                      <h4 className="font-bold text-xl text-gray-900">Integrations</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            HB
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">HubSpot CRM</div>
                            <div className="text-xs text-green-600 font-semibold">✓ Connected</div>
                          </div>
                        </div>
                        <button className="text-red-600 hover:text-red-700 font-semibold text-sm">Disconnect</button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-dashed border-gray-300 opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            SF
                          </div>
                          <div>
                            <div className="font-semibold text-gray-700">Salesforce</div>
                            <div className="text-xs text-gray-500">Not connected</div>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Connect</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI ACTIVITY TAB - LIVE COMMUNICATIONS */}
              {dashboardTab === 'ai-activity' && (
                <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 max-h-[700px] overflow-y-auto">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                      <Bot className="text-white" size={24} />
                    </div>
                    AI Agent Activity
                    <span className="ml-auto bg-green-500 text-white text-sm px-4 py-1.5 rounded-full font-semibold flex items-center gap-2 animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                      Live
                    </span>
                  </h2>

                  {/* PRIORITY ACTION ITEMS - SIMPLIFIED */}
                  <div className="mb-6 bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap className="text-yellow-500" size={24} />
                      What You Should Do Now
                    </h3>
                    
                    <div className="space-y-3">
                      {/* High Priority */}
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">HIGH</div>
                              <p className="font-bold text-gray-900">Call Sarah Johnson - Ready to book!</p>
                            </div>
                            <p className="text-sm text-gray-600">Water damage mentioned • Asked about Thursday</p>
                          </div>
                          <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all text-sm whitespace-nowrap">
                            Call Now
                          </button>
                        </div>
                      </div>

                      {/* Medium Priority */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">MEDIUM</div>
                              <p className="font-bold text-gray-900">3 Quotes opened - Follow up now</p>
                            </div>
                            <p className="text-sm text-gray-600">Martinez, Wong, Thompson • All 85+ scores</p>
                          </div>
                          <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-all text-sm whitespace-nowrap">
                            Call All 3
                          </button>
                        </div>
                      </div>

                      {/* Low Priority - Condensed */}
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">LOW</div>
                            <p className="text-sm text-gray-700">43 SMS auto-responded • 18 positive</p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">View →</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {/* Active Call - Expandable */}
                    <div className="bg-white rounded-2xl border-2 border-green-200 shadow-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedActivity(expandedActivity === 1 ? null : 1)}
                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                            <Phone className="text-white" size={24} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-lg text-gray-900">🔴 Active Call: Sarah Johnson</h3>
                            <p className="text-sm text-gray-600">342 Oak Street • Score: 92/100 • Duration: 2:34</p>
                            <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-semibold">
                              ✓ Interested in quote
                            </span>
                          </div>
                        </div>
                        <ChevronDown className={`transform transition-transform ${expandedActivity === 1 ? 'rotate-180' : ''}`} size={24} />
                      </button>
                      {expandedActivity === 1 && (
                        <div className="p-5 pt-0 border-t border-gray-200 bg-gray-50">
                          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 max-h-96 overflow-y-auto">
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                              Live Conversation
                            </h4>
                            <div className="space-y-3">
                              <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
                                <p className="text-sm font-semibold text-blue-900 mb-1">AI Agent:</p>
                                <p className="text-sm text-gray-800">"Hi Sarah, this is Alex from Peak Roofing. I noticed your roof is about 18 years old. Have you experienced any leaks or missing shingles recently?"</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-600 p-3 rounded">
                                <p className="text-sm font-semibold text-green-900 mb-1">Sarah Johnson:</p>
                                <p className="text-sm text-gray-800">"Actually yes! We had some water damage in the attic last month during that storm."</p>
                              </div>
                              <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
                                <p className="text-sm font-semibold text-blue-900 mb-1">AI Agent:</p>
                                <p className="text-sm text-gray-800">"I'm sorry to hear that. Water damage can worsen quickly. We offer free roof inspections where we use drone technology to assess the full extent. Would you be interested in scheduling one this week?"</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-600 p-3 rounded">
                                <p className="text-sm font-semibold text-green-900 mb-1">Sarah Johnson:</p>
                                <p className="text-sm text-gray-800">"Yes, that would be great. Do you have any availability on Thursday?"</p>
                              </div>
                              <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded animate-fadeIn">
                                <p className="text-sm font-semibold text-blue-900 mb-1">AI Agent <span className="text-xs text-gray-600">(typing...)</span>:</p>
                                <p className="text-sm text-gray-800">"Absolutely! I can schedule you for Thursday at 10 AM or 2 PM. Which works better for you?"</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-3">
                            <button 
                              onClick={() => {
                                setShowSuccess(true);
                                setSuccessMessage('✓ Appointment booked for Thursday at 2 PM!');
                                setTimeout(() => setShowSuccess(false), 3000);
                              }}
                              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all"
                            >
                              Book Appointment
                            </button>
                            <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all">
                              View Full Profile
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Completed Call */}
                    <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedActivity(expandedActivity === 2 ? null : 2)}
                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center">
                            <Phone className="text-white" size={24} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-lg text-gray-900">Michael Chen - Call Completed</h3>
                            <p className="text-sm text-gray-600">789 Maple Ave • Score: 85/100 • 5 min ago</p>
                            <span className="inline-block mt-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
                              Follow-up scheduled
                            </span>
                          </div>
                        </div>
                        <ChevronDown className={`transform transition-transform ${expandedActivity === 2 ? 'rotate-180' : ''}`} size={24} />
                      </button>
                      {expandedActivity === 2 && (
                        <div className="p-5 pt-0 border-t border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                              <h4 className="font-bold text-gray-900 mb-2">Call Summary</h4>
                              <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                                  <span>Confirmed roof age: 15 years</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                                  <span>Interested in replacement, budget ~$12K</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                                  <span>Prefers to discuss with spouse first</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                                  <span>Follow-up scheduled for next Tuesday</span>
                                </li>
                              </ul>
                            </div>
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                              <h4 className="font-bold text-gray-900 mb-2">AI Recommendation</h4>
                              <p className="text-sm text-gray-700 mb-3">Send email with financing options and customer testimonials before follow-up call.</p>
                              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm">
                                Send Recommended Email
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SMS Sequence */}
                    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedActivity(expandedActivity === 3 ? null : 3)}
                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="text-white" size={24} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-lg text-gray-900">SMS Campaign: 43 Messages Sent</h3>
                            <p className="text-sm text-gray-600">Warm leads follow-up • 18 responses • 15 min ago</p>
                            <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold">
                              42% response rate
                            </span>
                          </div>
                        </div>
                        <ChevronDown className={`transform transition-transform ${expandedActivity === 3 ? 'rotate-180' : ''}`} size={24} />
                      </button>
                      {expandedActivity === 3 && (
                        <div className="p-5 pt-0 border-t border-gray-200 bg-gray-50">
                          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                            <h4 className="font-bold text-gray-900 mb-3">Sample Message</h4>
                            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded text-sm text-gray-800">
                              "Hi {'{'}name{'}'}, this is Alex from Peak Roofing. We spoke last week about your roof inspection. I wanted to follow up and see if you had any questions about the estimate we provided. We're offering 15% off installations booked this month. Reply YES to schedule or CALL ME for questions."
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">18</p>
                                <p className="text-xs text-gray-600">Positive</p>
                              </div>
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-yellow-600">25</p>
                                <p className="text-xs text-gray-600">No Response</p>
                              </div>
                              <div className="bg-red-50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-red-600">0</p>
                                <p className="text-xs text-gray-600">Opt-out</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                  
                  {/* AI Activity Summary */}
                  <div className="mt-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Today's AI Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">147</div>
                        <div className="text-xs text-gray-600">Calls Made</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">43</div>
                        <div className="text-xs text-gray-600">SMS Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">127</div>
                        <div className="text-xs text-gray-600">Emails</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">18</div>
                        <div className="text-xs text-gray-600">Booked</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CALENDAR TAB - INTERACTIVE SCHEDULE */}
              {dashboardTab === 'calendar' && (
                <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 max-h-[700px] overflow-y-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <Calendar className="text-white" size={24} />
                      </div>
                      AI Agent Schedule
                    </h2>
                    <button
                      onClick={() => setShowAddEvent(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm flex items-center gap-2"
                    >
                      <span>+</span> Add Task
                    </button>
                  </div>

                  {/* Calendar Filters */}
                  <div className="mb-6 bg-white rounded-xl border-2 border-gray-200 p-4 shadow-lg">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Settings className="text-gray-600" size={18} />
                      Calendar Filters
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={calendarFilters.aiAgent}
                          onChange={(e) => setCalendarFilters({...calendarFilters, aiAgent: e.target.checked})}
                          className="w-4 h-4 text-green-600 rounded cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm font-semibold text-gray-700">AI Calls</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={calendarFilters.inspections}
                          onChange={(e) => setCalendarFilters({...calendarFilters, inspections: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span className="text-sm font-semibold text-gray-700">Inspections</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={calendarFilters.personal}
                          onChange={(e) => setCalendarFilters({...calendarFilters, personal: e.target.checked})}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-purple-500 rounded"></div>
                          <span className="text-sm font-semibold text-gray-700">SMS/Email</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={calendarFilters.followUps}
                          onChange={(e) => setCalendarFilters({...calendarFilters, followUps: e.target.checked})}
                          className="w-4 h-4 text-red-600 rounded cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span className="text-sm font-semibold text-gray-700">Hot Leads</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* AI-Generated Tasks Overlay */}
                  <div className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-4 shadow-lg">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Bot className="text-green-600" size={20} />
                      AI Auto-Scheduled Tasks (This Week)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-700">AUTO-CREATED</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">📞 Call 15 new hot leads</p>
                        <p className="text-xs text-gray-600">Today, 2:00 PM - 4:00 PM</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-700">AUTO-CREATED</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">💬 SMS follow-up batch</p>
                        <p className="text-xs text-gray-600">Tomorrow, 10:00 AM</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-700">AUTO-CREATED</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">📧 Email nurture: 43 leads</p>
                        <p className="text-xs text-gray-600">Friday, 9:00 AM</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3 italic">
                      💡 AI automatically schedules outreach based on lead quality, best contact times, and your availability
                    </p>
                  </div>

                  {/* Calendar Grid - ONE WEEK VIEW WITH MORE AI ACTIVITY */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                    {/* Calendar Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <button className="hover:bg-white/20 p-2 rounded-lg transition-all">
                          <ChevronDown className="rotate-90" size={20} />
                        </button>
                        <h3 className="text-xl font-bold">This Week - Oct 10-16, 2025</h3>
                        <button className="hover:bg-white/20 p-2 rounded-lg transition-all">
                          <ChevronDown className="-rotate-90" size={20} />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                      </div>
                    </div>

                    {/* Calendar Days - ONE WEEK WITH DETAILED AI ACTIVITIES */}
                    <div className="grid grid-cols-7 gap-0 border-t border-gray-200">
                      {[
                        { day: 10, label: 'Sun', tasks: [
                          { type: 'email', text: '📧 Newsletter (200)', color: 'bg-orange-500', lead: 'Maintenance tips', time: '9:00 AM' },
                          { type: 'call', text: '📞 Weekend Callbacks (8)', color: 'bg-green-500', lead: 'Missed calls', time: '11:00 AM' },
                        ]},
                        { day: 11, label: 'Mon', tasks: [
                          { type: 'call', text: '📞 Morning Calls (15)', color: 'bg-green-500', lead: 'Hot leads', time: '8:00 AM' },
                          { type: 'hot', text: '🎯 Priority: J. Martinez', color: 'bg-red-500', lead: 'Quote opened', time: '10:30 AM' },
                          { type: 'sms', text: '💬 Follow-up SMS (25)', color: 'bg-purple-500', lead: 'Last week contacts', time: '12:00 PM' },
                          { type: 'call', text: '📞 Afternoon Calls (12)', color: 'bg-green-500', lead: 'Warm leads', time: '2:00 PM' },
                          { type: 'email', text: '📧 Quote emails (18)', color: 'bg-orange-500', lead: 'Inspection completed', time: '4:00 PM' },
                        ]},
                        { day: 12, label: 'Tue', tasks: [
                          { type: 'call', text: '📞 AM Outreach (20)', color: 'bg-green-500', lead: 'New scan results', time: '8:30 AM' },
                          { type: 'inspection', text: '🏠 S. Johnson Inspection', color: 'bg-blue-500', lead: '342 Oak St', time: '10:00 AM' },
                          { type: 'hot', text: '🎯 L. Wong - Ready!', color: 'bg-red-500', lead: 'Wants quote today', time: '11:30 AM' },
                          { type: 'sms', text: '💬 SMS Batch (43)', color: 'bg-purple-500', lead: 'Follow-up campaign', time: '1:00 PM' },
                          { type: 'call', text: '📞 Quote Follow-ups (10)', color: 'bg-green-500', lead: 'Sent yesterday', time: '3:00 PM' },
                          { type: 'email', text: '📧 Financing info (12)', color: 'bg-orange-500', lead: 'Budget concerns', time: '5:00 PM' },
                        ]},
                        { day: 13, label: 'Wed', tasks: [
                          { type: 'email', text: '📧 Nurture Email (127)', color: 'bg-orange-500', lead: 'Educational content', time: '9:00 AM' },
                          { type: 'call', text: '📞 Morning Calls (18)', color: 'bg-green-500', lead: 'High-score leads', time: '10:00 AM' },
                          { type: 'inspection', text: '🏠 D. Thompson Inspection', color: 'bg-blue-500', lead: '789 Maple Ave', time: '11:30 AM' },
                          { type: 'hot', text: '🎯 M. Chen Urgent', color: 'bg-red-500', lead: 'Leak reported', time: '1:00 PM' },
                          { type: 'sms', text: '💬 Appointment Reminders', color: 'bg-purple-500', lead: 'Tomorrow bookings', time: '3:00 PM' },
                          { type: 'call', text: '📞 Quote Discussions (8)', color: 'bg-green-500', lead: 'Price negotiations', time: '4:00 PM' },
                        ]},
                        { day: 14, label: 'Thu', tasks: [
                          { type: 'call', text: '📞 Early Birds (12)', color: 'bg-green-500', lead: 'Best time callers', time: '7:30 AM' },
                          { type: 'hot', text: '🎯 3 Hot Leads Call', color: 'bg-red-500', lead: 'Decision makers', time: '9:00 AM' },
                          { type: 'inspection', text: '🏠 R. Garcia Inspection', color: 'bg-blue-500', lead: '456 Pine St', time: '10:30 AM' },
                          { type: 'email', text: '📧 Case Studies (45)', color: 'bg-orange-500', lead: 'Social proof', time: '12:00 PM' },
                          { type: 'call', text: '📞 Afternoon Outreach (15)', color: 'bg-green-500', lead: 'New aged roofs', time: '2:00 PM' },
                          { type: 'sms', text: '💬 Special Offer (60)', color: 'bg-purple-500', lead: '15% discount', time: '4:00 PM' },
                          { type: 'hot', text: '🎯 Closing Calls (5)', color: 'bg-red-500', lead: 'Ready to sign', time: '5:00 PM' },
                        ]},
                        { day: 15, label: 'Fri', tasks: [
                          { type: 'call', text: '📞 Weekly Wrap (22)', color: 'bg-green-500', lead: 'Pending responses', time: '9:00 AM' },
                          { type: 'hot', text: '🎯 Final Push (8)', color: 'bg-red-500', lead: 'End-of-week closes', time: '10:30 AM' },
                          { type: 'sms', text: '💬 Weekend SMS (50)', color: 'bg-purple-500', lead: 'Call scheduling', time: '11:00 AM' },
                          { type: 'inspection', text: '🏠 K. Lee Inspection', color: 'bg-blue-500', lead: '123 Elm St', time: '1:00 PM' },
                          { type: 'email', text: '📧 Week Summary (85)', color: 'bg-orange-500', lead: 'Activity report', time: '3:00 PM' },
                          { type: 'call', text: '📞 Weekend Prep (10)', color: 'bg-green-500', lead: 'Monday bookings', time: '4:30 PM' },
                        ]},
                        { day: 16, label: 'Sat', tasks: [
                          { type: 'email', text: '📧 Weekend Newsletter', color: 'bg-orange-500', lead: '180 subscribers', time: '10:00 AM' },
                          { type: 'sms', text: '💬 Check-in Messages', color: 'bg-purple-500', lead: '35 warm leads', time: '12:00 PM' },
                          { type: 'call', text: '📞 Weekend Calls (6)', color: 'bg-green-500', lead: 'Best time prospects', time: '2:00 PM' },
                        ]},
                      ].map((dayData, idx) => (
                        <div key={`w1-${idx}`} className={`min-h-48 p-2 border-r border-b border-gray-200 bg-white hover:bg-blue-50 cursor-pointer transition-all`}>
                          <div className="font-bold text-lg mb-2 text-gray-900">{dayData.day}</div>
                          <div className="space-y-0.5">
                            {dayData.tasks.map((task, taskIdx) => (
                              <div 
                                key={taskIdx}
                                onClick={() => setSelectedCalendarEvent({ type: task.type, lead: task.lead, time: task.time })}
                                className={`${task.color} text-white text-[9px] p-1 rounded hover:opacity-80 transition-all font-semibold leading-tight`}
                              >
                                {task.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-6 bg-white rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3">Task Types</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-700">AI Calls</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm text-gray-700">Inspections</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm text-gray-700">SMS Batch</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-sm text-gray-700">Email Seq</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-700">Hot Leads</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-500 rounded"></div>
                        <span className="text-sm text-gray-700">Other</span>
                      </div>
                    </div>
                  </div>

                  {/* Event Detail Modal */}
                  {selectedCalendarEvent && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Task Details</h3>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-700">Type:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              selectedCalendarEvent.type === 'call' ? 'bg-green-100 text-green-700' :
                              selectedCalendarEvent.type === 'inspection' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {selectedCalendarEvent.type === 'call' ? '📞 AI Call' : selectedCalendarEvent.type === 'inspection' ? '🏠 Inspection' : '💬 SMS Campaign'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-700">Lead:</span>
                            <span className="text-gray-900">{selectedCalendarEvent.lead}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-700">Time:</span>
                            <span className="text-gray-900">{selectedCalendarEvent.time}</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedCalendarEvent(null);
                              setShowSuccess(true);
                              setSuccessMessage('✓ Task completed successfully!');
                              setTimeout(() => setShowSuccess(false), 3000);
                            }}
                            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => setSelectedCalendarEvent(null)}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Event Modal */}
                  {showAddEvent && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Add New Task</h3>
                        <div className="space-y-4 mb-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Task Type</label>
                            <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white font-medium text-gray-900">
                              <option>📞 AI Call</option>
                              <option>🏠 Inspection</option>
                              <option>💬 SMS Campaign</option>
                              <option>📧 Email Sequence</option>
                              <option>🎯 Follow-up</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lead/Target</label>
                            <input type="text" placeholder="Enter lead name or campaign" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date & Time</label>
                            <input type="datetime-local" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowAddEvent(false);
                              setShowSuccess(true);
                              setSuccessMessage('✓ Task scheduled successfully!');
                              setTimeout(() => setShowSuccess(false), 3000);
                            }}
                            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
                          >
                            Schedule Task
                          </button>
                          <button
                            onClick={() => setShowAddEvent(false)}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CTA in Demo */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 to-cyan-600">
                <div className="text-center">
                  <p className="text-white text-sm sm:text-base mb-3">
                    This is just a demo. Get the real platform →
                  </p>
                  <button
                    onClick={() => navigate('/signup')}
                  aria-label="Get 25 free roofing leads and start booking inspections"
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all shadow-lg text-base sm:text-lg inline-flex items-center gap-2"
                  >
                    <span>Get 25 Free Leads Now</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Detail Modal - COMPREHENSIVE with SUCCESS MESSAGE */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn my-8">
            {/* SUCCESS MESSAGE OVERLAY - PERFECT RESPONSIVE SPACING */}
            {showSuccess && (
              <div className="fixed top-20 sm:top-24 left-1/2 transform -translate-x-1/2 z-[60] animate-fadeIn px-4 w-full max-w-2xl">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-2 sm:gap-3">
                  <CheckCircle size={20} className="sm:w-6 sm:h-6 flex-shrink-0" />
                  <div className="font-bold text-sm sm:text-base lg:text-lg">{successMessage}</div>
                </div>
              </div>
            )}

            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-5 flex items-center justify-between z-10">
              <div className="text-white">
                <div className="text-sm font-semibold opacity-90">Comprehensive Lead Analysis</div>
                <div className="text-2xl font-bold">{selectedLead.address}</div>
                <div className="text-sm opacity-90">{selectedLead.city} • Owner: {selectedLead.homeOwner}</div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            {/* Aerial Image with AI Overlays */}
            <div className="relative">
              <img
                src={selectedLead.image}
                alt={selectedLead.address}
                className="w-full h-64 sm:h-96 object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
              
              {/* DESKTOP: All 5 overlays */}
              <div className="hidden sm:block">
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-xl border border-white/20 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} />
                    <div>
                      <div className="text-xs font-semibold opacity-80">AI Detected</div>
                      <div className="text-base font-bold">{selectedLead.roofType}</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl border-2 border-white/30">
                  <div className="text-xs font-semibold">Condition</div>
                  <div className="text-2xl font-bold">{selectedLead.condition}</div>
                  <div className="text-xs opacity-90">Urgent</div>
                </div>

                <div className="absolute bottom-4 left-4 bg-orange-600 text-white px-4 py-3 rounded-xl shadow-xl">
                  <div className="text-xs font-semibold">Last Replaced</div>
                  <div className="text-xl font-bold">{selectedLead.lastReplaced}</div>
                  <div className="text-xs opacity-90">{selectedLead.roofAge} years ago</div>
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-xl shadow-xl">
                  <div className="text-xs font-semibold text-center">Roof Area</div>
                  <div className="text-2xl font-bold text-center">{selectedLead.roofArea}</div>
                </div>

                <div className="absolute bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl">
                  <div className="text-xs font-semibold">Value</div>
                  <div className="text-2xl font-bold">{selectedLead.value}</div>
                </div>
              </div>

              {/* MOBILE: 1-2 cycling AI insight cards */}
              <div className="sm:hidden">
                {/* Primary cycling card - center */}
                <div 
                  key={`mobile-${mobileOverlayIndex}`}
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                    mobileOverlayIndex === 0 ? 'bg-gradient-to-r from-red-600 to-orange-600' :
                    mobileOverlayIndex === 1 ? 'bg-gradient-to-r from-blue-600 to-purple-600' :
                    'bg-gradient-to-r from-green-600 to-emerald-600'
                  } text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-white/30 max-w-[280px] w-full`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles size={16} className="animate-pulse" />
                      <div className="text-xs font-semibold opacity-90">
                        {mobileOverlayIndex === 0 ? 'AI Analysis' : mobileOverlayIndex === 1 ? 'Property Data' : 'Lead Score'}
                      </div>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {mobileOverlayIndex === 0 ? `${selectedLead.condition} Roof` : mobileOverlayIndex === 1 ? selectedLead.roofArea : `${selectedLead.score}/100`}
                    </div>
                    <div className="text-xs opacity-90">
                      {mobileOverlayIndex === 0 ? `${selectedLead.roofAge} years old • Urgent` : mobileOverlayIndex === 1 ? `${selectedLead.roofType}` : 'HOT Priority Lead'}
                    </div>
                  </div>
                </div>

                {/* Small indicator dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === mobileOverlayIndex ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Score Circle */}
              <div className="text-center pb-4 sm:pb-6 border-b border-gray-200">
                <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-red-500 to-orange-500 mb-3 sm:mb-4 shadow-xl">
                  <div className="text-4xl sm:text-5xl font-bold text-white">{selectedLead.score}</div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {selectedLead.priority === 'hot' ? 'HOT LEAD 🔥' : selectedLead.priority === 'warm' ? 'WARM LEAD ⚡' : 'QUALIFIED ✓'}
                </div>
                <div className="text-sm sm:text-base text-gray-600">Priority: Immediate Contact Recommended</div>
              </div>
              
              {/* EXPANDABLE SECTIONS - ALL COLLAPSED BY DEFAULT */}

              {/* 1. EXPANDABLE AI CALL NOTES */}
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                <button 
                  onClick={() => setExpandedNotes(!expandedNotes)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">AI Call Notes</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Click to view conversation details</p>
                    </div>
                  </div>
                  <div className="text-blue-600 flex-shrink-0">
                    {expandedNotes ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>
                
                {expandedNotes && (
                  <div className="space-y-3 mt-4">
                    {selectedLead.aiCallNotes.map((note, idx) => (
                      <div key={idx} className="flex gap-2 sm:gap-3">
                        <div className="text-xs font-semibold text-blue-600 min-w-[50px] sm:min-w-[60px]">{note.time}</div>
                        <div className="flex-1 text-xs sm:text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-blue-200">
                          {note.note}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expandedNotes && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-blue-200 space-y-4">
                    <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-3">Call Summary & Analysis</h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Duration</div>
                        <div className="text-lg font-bold text-gray-900">{selectedLead.callSummary.duration}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Sentiment</div>
                        <div className="text-lg font-bold text-green-600">{selectedLead.callSummary.sentiment}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Purchase Intent</div>
                        <div className="text-lg font-bold text-orange-600">{selectedLead.callSummary.intent}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Outcome</div>
                        <div className="text-lg font-bold text-blue-600">{selectedLead.callSummary.outcome}</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-xs text-gray-600 font-semibold mb-2">Objections Handled</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.callSummary.objections.map((obj, idx) => (
                          <div key={idx} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                            {obj}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-xs text-gray-600 font-semibold mb-2">Next Steps</div>
                      <ul className="space-y-2">
                        {selectedLead.callSummary.nextSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. EXPANDABLE CONTACT INFO */}
              <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                <button 
                  onClick={() => setExpandedContact(!expandedContact)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">Contact Information</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Click to view homeowner details</p>
                    </div>
                  </div>
                  <div className="text-purple-600 flex-shrink-0">
                    {expandedContact ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>
                
                {expandedContact && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-xs text-gray-600 font-semibold mb-1">Homeowner</div>
                      <div className="text-base sm:text-lg font-bold text-gray-900">{selectedLead.homeOwner}</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone size={16} className="text-purple-600" />
                          <div className="text-xs text-gray-600 font-semibold">Phone</div>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-gray-900">{selectedLead.phone}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail size={16} className="text-purple-600" />
                          <div className="text-xs text-gray-600 font-semibold">Email</div>
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900 break-all">{selectedLead.email}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. EXPANDABLE ROOF ANALYSIS */}
              <div className="bg-red-50 rounded-xl p-4 sm:p-6 border-2 border-red-200">
                <button 
                  onClick={() => setExpandedRoofAnalysis(!expandedRoofAnalysis)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HomeIcon className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">AI Roof Analysis</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Click to view detailed roof inspection data</p>
                    </div>
                  </div>
                  <div className="text-red-600 flex-shrink-0">
                    {expandedRoofAnalysis ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>
                
                {expandedRoofAnalysis && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Roof Age</div>
                        <div className="text-lg sm:text-xl font-bold text-red-600">{selectedLead.roofAge} years</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Condition</div>
                        <div className="text-lg sm:text-xl font-bold text-orange-600">{selectedLead.condition}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Roof Type</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.roofType}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Roof Area</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.roofArea}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Last Replaced</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.lastReplaced}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Roof Pitch</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.roofPitch}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Layers</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.roofLayers}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Skylights</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.skylightCount}</div>
                      </div>
                    </div>
                    
                    {/* Damage Detected */}
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="text-xs text-gray-600 font-semibold mb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-red-600" />
                        AI Detected Issues
                      </div>
                      <ul className="space-y-1">
                        {selectedLead.damageDetected.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="text-red-600 font-bold">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Replacement Cost */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="text-xs text-gray-600 font-semibold mb-1">Estimated Replacement Cost</div>
                      <div className="text-xl font-bold text-green-600">{selectedLead.estimatedReplacementCost}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. EXPANDABLE PROPERTY DETAILS */}
              <div className="bg-cyan-50 rounded-xl p-4 sm:p-6 border-2 border-cyan-200">
                <button 
                  onClick={() => setExpandedProperty(!expandedProperty)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HomeIcon className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">Property Details</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Click to view comprehensive property data</p>
                    </div>
                  </div>
                  <div className="text-cyan-600 flex-shrink-0">
                    {expandedProperty ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>
                
                {expandedProperty && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Property Type</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">{selectedLead.propertyType}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Year Built</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.yearBuilt}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Property Value</div>
                        <div className="text-sm font-bold text-green-600">{selectedLead.value}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Lot Size</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">{selectedLead.lotSize}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Bedrooms</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.bedrooms}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Bathrooms</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.bathrooms}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Stories</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.stories}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Garage</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">{selectedLead.garage}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Foundation</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">{selectedLead.foundationType}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Exterior</div>
                        <div className="text-xs font-bold text-gray-900">{selectedLead.exteriorMaterial}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">HVAC Age</div>
                        <div className="text-sm font-bold text-gray-900">{selectedLead.hvacAge} years</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-cyan-200">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Gutters</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">{selectedLead.gutterCondition}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-cyan-200">
                      <div className="text-xs text-gray-600 font-semibold mb-2">Insurance History</div>
                      <div className="text-sm text-gray-900">{selectedLead.insuranceClaim}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - SEQUENCES or CALL STRATEGIES */}
              {!showSequences && !showCallStrategies ? (
                <div className="grid sm:grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowSequences(true);
                      setShowCallStrategies(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                    <Layers size={20} />
                    <span>Assign to Sequence</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowCallStrategies(true);
                      setShowSequences(false);
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                    <Phone size={20} />
                    <span>AI Call Strategy</span>
                  </button>
                </div>
              ) : showSequences ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">Choose AI Sequence</h3>
                    <button 
                      onClick={() => setShowSequences(false)}
                      className="text-gray-600 hover:text-gray-900">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sequences.map((seq) => (
                      <button
                        key={seq.id}
                        onClick={() => handleAssignSequence(seq.name)}
                        className={`text-left p-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-xl bg-gradient-to-br ${
                          seq.color === 'blue' ? 'from-blue-50 to-cyan-50 border-blue-300 hover:border-blue-500' :
                          seq.color === 'purple' ? 'from-purple-50 to-pink-50 border-purple-300 hover:border-purple-500' :
                          seq.color === 'green' ? 'from-green-50 to-emerald-50 border-green-300 hover:border-green-500' :
                          'from-red-50 to-orange-50 border-red-300 hover:border-red-500'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r ${
                          seq.color === 'blue' ? 'from-blue-600 to-cyan-600' :
                          seq.color === 'purple' ? 'from-purple-600 to-pink-600' :
                          seq.color === 'green' ? 'from-green-600 to-emerald-600' :
                          'from-red-600 to-orange-600'
                        }`}>
                          <div className="text-white">{seq.icon}</div>
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 mb-2">{seq.name}</h4>
                        <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                          <span className="font-semibold">{seq.steps} Steps</span>
                          <span>•</span>
                          <span>{seq.duration}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{seq.description}</p>
                        <ul className="space-y-1">
                          {seq.bullets.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={12} />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">Choose AI Call Strategy</h3>
                    <button 
                      onClick={() => setShowCallStrategies(false)}
                      className="text-gray-600 hover:text-gray-900">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {callStrategies.map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => handleAssignCallStrategy(strategy.name)}
                        className={`text-left p-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-xl bg-gradient-to-br ${
                          strategy.color === 'blue' ? 'from-blue-50 to-cyan-50 border-blue-300 hover:border-blue-500' :
                          strategy.color === 'orange' ? 'from-orange-50 to-yellow-50 border-orange-300 hover:border-orange-500' :
                          strategy.color === 'green' ? 'from-green-50 to-emerald-50 border-green-300 hover:border-green-500' :
                          'from-purple-50 to-pink-50 border-purple-300 hover:border-purple-500'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r ${
                          strategy.color === 'blue' ? 'from-blue-600 to-cyan-600' :
                          strategy.color === 'orange' ? 'from-orange-600 to-red-600' :
                          strategy.color === 'green' ? 'from-green-600 to-emerald-600' :
                          'from-purple-600 to-pink-600'
                        }`}>
                          <div className="text-white">{strategy.icon}</div>
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 mb-2">{strategy.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                        <ul className="space-y-1">
                          {strategy.bullets.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={12} />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Try It CTA */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600 mb-3 text-lg">Ready to get leads like this with full AI automation?</p>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-8 py-4 rounded-xl transition-all inline-flex items-center gap-2 text-lg shadow-xl"
                >
                  <span>Get 25 Free Leads Now</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Features Section - 6 CARD GRID */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Everything You Need to Dominate
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              All-in-one platform to find, contact, and close roofing leads on autopilot
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Target, title: 'AI Lead Finder', desc: 'Automatically scans properties, identifies aged roofs (15+ years), and scores each lead by urgency. Only HOT leads reach you.', color: 'from-blue-600 to-cyan-600', border: 'border-blue-200 hover:border-blue-400' },
              { icon: Phone, title: 'AI Voice Agent', desc: 'Human-sounding AI calls leads 24/7, handles objections, answers questions, and books appointments directly to your calendar.', color: 'from-purple-600 to-pink-600', border: 'border-purple-200 hover:border-purple-400' },
              { icon: MessageSquare, title: 'Multi-Channel Outreach', desc: 'Automated email, SMS, and voice sequences personalized for each lead. 5X more responses than single-channel outreach.', color: 'from-green-600 to-emerald-600', border: 'border-green-200 hover:border-green-400' },
              { icon: BarChart3, title: 'Complete Funnel Tracking', desc: 'See every lead from discovery → contacted → booked → closed. Track ROI in real-time. Never lose track of an opportunity.', color: 'from-orange-600 to-red-600', border: 'border-orange-200 hover:border-orange-400' },
              { icon: Calendar, title: 'Calendar Sync', desc: 'Appointments flow directly to your calendar with SMS reminders. Just show up, inspect, close. Zero manual scheduling.', color: 'from-cyan-600 to-blue-600', border: 'border-cyan-200 hover:border-cyan-400' },
              { icon: Bot, title: 'Smart Sequences', desc: 'Build custom email → SMS → call sequences. AI personalizes every message. Timing auto-adjusted for maximum response.', color: 'from-yellow-600 to-orange-600', border: 'border-yellow-200 hover:border-yellow-400' },
            ].map((feature, idx) => (
              <div key={idx} className={`group bg-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 ${feature.border} transition-all duration-300 hover:shadow-2xl hover:scale-105`}>
                <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="text-white" size={28} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-20 lg:mb-24">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Real Results From Real Roofers
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Join hundreds of roofing companies crushing it with Fish Mouth
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Mike Johnson', company: 'Apex Roofing, Dallas', result: '+$420K', quote: '"247 leads in month one. Closed 34 jobs worth $420K. This AI prints money."', initial: 'MJ', color: 'bg-blue-600' },
              { name: 'Sarah Martinez', company: 'Elite Roofing, Austin', result: '80% Hot Rate', quote: '"80% of leads were HOT. Best ROI I\'ve ever seen. No more garbage leads."', initial: 'SM', color: 'bg-purple-600' },
              { name: 'David Chen', company: 'Premium Roofing, Houston', result: '+15/week', quote: '"AI books 15+ inspections weekly while I sleep. No more cold calling!"', initial: 'DC', color: 'bg-green-600' },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="text-yellow-400 fill-yellow-400" size={20} />)}
                </div>
                <p className="text-base sm:text-lg text-gray-700 mb-6 italic">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                    {testimonial.initial}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.company}</div>
                    <div className="text-sm font-bold text-green-600">{testimonial.result}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-20 lg:mb-24">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Simple Pricing
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Start free. Only pay for results.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-yellow-400 text-gray-900 font-bold px-6 py-2 rounded-full text-sm">
                  MOST POPULAR
                </div>
              </div>
              <div className="text-center mb-6 text-white pt-4">
                <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                <div className="text-5xl font-bold mb-2">$299</div>
                <div className="text-blue-100">per month + $1.13/lead</div>
              </div>
              <ul className="space-y-4 mb-8 text-white">
                {['Unlimited lead scanning', 'AI voice calling 24/7', 'Auto email & SMS campaigns', 'Complete funnel tracking', '30-day money-back guarantee'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle size={20} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 rounded-xl transition-all shadow-lg"
              >
                Get 25 Free Leads Now
              </button>
              <p className="text-center mt-4 text-blue-100 text-sm">
                No credit card • 60-day guarantee
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 bg-green-100 text-green-800 px-6 py-4 rounded-2xl font-semibold">
              <Shield size={24} />
              <span>30-Day Money-Back Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Stop Chasing Leads. Start Closing Deals.
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-12 text-blue-100">
            Join 500+ roofing companies using AI to generate $2.4M+ in revenue
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-12 py-5 rounded-xl text-xl transition-all transform hover:scale-105 shadow-2xl inline-flex items-center gap-3"
          >
            <span>Get 25 Free Leads Now</span>
            <ArrowRight size={24} />
          </button>
          <p className="mt-6 text-blue-100">
            No credit card • 60-day guarantee
          </p>
        </div>
      </section>

      {/* Sticky Bottom CTA (mobile) */}
      <div className="fixed md:hidden bottom-4 left-0 right-0 px-4 z-[60]">
        <button
          onClick={() => navigate('/signup')}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-2xl shadow-2xl"
        >
          Get 25 Free Leads Now • No credit card
        </button>
      </div>

      {/* Provide bottom padding on small screens so sticky CTA doesn't overlap content */}
      <div className="h-20 md:hidden"></div>

      <Footer />
    </div>
  );
};

export default Home;
