import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Globe, 
  Camera, 
  Target, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Play,
  MessageSquare,
  Star
} from 'lucide-react';

const SmartOnboardingAssistant = ({ onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [profileData, setProfileData] = useState({
    businessName: '',
    website: '',
    industry: '',
    services: [],
    location: '',
    logo: null,
    description: '',
    targetMarket: '',
    uniqueValue: ''
  });
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const onboardingSteps = useMemo(() => ([
    {
      id: 'welcome',
      title: 'Welcome to Fish Mouth',
      description: 'Let\'s set up your business profile in just a few minutes',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'business-basics',
      title: 'Business Information',
      description: 'Tell us about your business',
      icon: Building2,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'website-scraping',
      title: 'Auto-Complete Profile',
      description: 'We\'ll analyze your website to fill in details',
      icon: Globe,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'branding',
      title: 'Brand Identity',
      description: 'Upload your logo and set brand colors',
      icon: Camera,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'services',
      title: 'Services & Pricing',
      description: 'Configure your service offerings',
      icon: Target,
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'marketing',
      title: 'Marketing Strategy',
      description: 'Set up your lead generation preferences',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'complete',
      title: 'All Set!',
      description: 'Your profile is ready for lead generation',
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500'
    }
  ]), []);

  const industryOptions = [
    'Real Estate',
    'Home Improvement',
    'Construction',
    'HVAC',
    'Plumbing',
    'Electrical',
    'Landscaping',
    'Roofing',
    'Cleaning Services',
    'Insurance',
    'Financial Services',
    'Healthcare',
    'Legal Services',
    'Other'
  ];

  const serviceTemplates = {
    'Real Estate': [
      'Residential Sales',
      'Commercial Sales',
      'Property Management',
      'Real Estate Investment',
      'First-Time Buyer Assistance',
      'Luxury Properties'
    ],
    'Home Improvement': [
      'Kitchen Remodeling',
      'Bathroom Renovation',
      'Basement Finishing',
      'Exterior Renovations',
      'Flooring Installation',
      'Windows & Doors'
    ],
    'HVAC': [
      'Installation',
      'Repair Services',
      'Maintenance',
      'Emergency Services',
      'Energy Audits',
      'System Upgrades'
    ]
  };

  useEffect(() => {
    const stepSuggestions = {
      'business-basics': [
        'Consider highlighting your years of experience',
        'Mention any certifications or licenses',
        'Include your service area coverage'
      ],
      'services': [
        'Price competitively based on local market rates',
        'Offer package deals for multiple services',
        'Consider seasonal promotions'
      ],
      'marketing': [
        'Focus on local SEO keywords',
        'Highlight customer testimonials',
        'Showcase before/after photos'
      ]
    };

    setSuggestions(stepSuggestions[onboardingSteps[currentStep]?.id] || []);
  }, [currentStep, onboardingSteps]);

  const scrapeWebsiteData = async (websiteUrl) => {
    setIsScrapingWebsite(true);
    
    // Simulate AI website scraping
    setTimeout(() => {
      const scrapedData = {
        businessName: 'Premium Home Solutions',
        description: 'Professional home improvement services with 15+ years of experience',
        services: ['Kitchen Remodeling', 'Bathroom Renovation', 'Flooring'],
        location: 'Austin, TX',
        targetMarket: 'Homeowners looking for quality renovations',
        uniqueValue: 'Licensed, insured, and satisfaction guaranteed'
      };

      setProfileData(prev => ({ ...prev, ...scrapedData }));
      setIsScrapingWebsite(false);
      markStepComplete('website-scraping');
    }, 3000);
  };

  const markStepComplete = (stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      markStepComplete(onboardingSteps[currentStep].id);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = () => {
    markStepComplete('complete');
    if (onComplete) {
      onComplete(profileData);
    }
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    const step = onboardingSteps[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Fish Mouth!</h2>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Let's get your business profile set up so you can start generating quality leads immediately.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Takes 5 minutes:</strong> We'll auto-fill most details using AI
              </p>
            </div>
          </div>
        );

      case 'business-basics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
              <p className="text-gray-600">Basic information to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={profileData.businessName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={profileData.website}
                  onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  value={profileData.industry}
                  onChange={(e) => setProfileData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select your industry</option>
                  {industryOptions.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={profileData.description}
                onChange={(e) => setProfileData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Briefly describe what your business does..."
              />
            </div>

            {suggestions.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Suggestions
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'website-scraping':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Auto-Complete Your Profile</h2>
              <p className="text-gray-600">We'll analyze your website to fill in missing details</p>
            </div>

            {profileData.website ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <Globe className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Website URL detected: {profileData.website}</p>
                </div>

                {!isScrapingWebsite ? (
                  <button
                    onClick={() => scrapeWebsiteData(profileData.website)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Analyze Website & Auto-Fill Profile
                  </button>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Analyzing your website...</p>
                    <p className="text-sm text-gray-500 mt-1">This usually takes 30-60 seconds</p>
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={nextStep}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Skip auto-fill and continue manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-800">No website URL provided</p>
                  <p className="text-sm text-yellow-600 mt-1">Go back to add your website or continue manually</p>
                </div>
                <button
                  onClick={prevStep}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Go Back to Add Website
                </button>
              </div>
            )}
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Your Services</h2>
              <p className="text-gray-600">What services do you offer to customers?</p>
            </div>

            {profileData.industry && serviceTemplates[profileData.industry] && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3">Suggested services for {profileData.industry}:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {serviceTemplates[profileData.industry].map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        if (!profileData.services.includes(service)) {
                          setProfileData(prev => ({
                            ...prev,
                            services: [...prev.services, service]
                          }));
                        }
                      }}
                      className="text-left p-2 bg-white border border-blue-200 rounded text-sm hover:bg-blue-50 transition-colors"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Services
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {profileData.services.map(service => (
                  <span
                    key={service}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {service}
                    <button
                      onClick={() => setProfileData(prev => ({
                        ...prev,
                        services: prev.services.filter(s => s !== service)
                      }))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a custom service and press Enter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    if (!profileData.services.includes(e.target.value.trim())) {
                      setProfileData(prev => ({
                        ...prev,
                        services: [...prev.services, e.target.value.trim()]
                      }));
                    }
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">You're All Set!</h2>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Your business profile is complete and ready for lead generation.
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold text-green-800 mb-3">What's Next:</h3>
              <ul className="text-sm text-green-700 space-y-2 text-left">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Start receiving qualified leads
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Use AI-powered communication strategies
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Track performance and ROI
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Generate branded reports
                </li>
              </ul>
            </div>

            <button
              onClick={completeOnboarding}
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-8 rounded-lg font-medium hover:from-emerald-600 hover:to-green-600 transition-all text-lg"
            >
              Go to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Business Setup</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
          
          <div className="relative">
            <div className="overflow-hidden h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center text-xs ${
                    isCurrent ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isCurrent ? 'bg-blue-100' : 
                    isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block max-w-16 text-center leading-tight">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          {renderStepContent()}

          {/* Navigation */}
          {onboardingSteps[currentStep].id !== 'welcome' && onboardingSteps[currentStep].id !== 'complete' && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={nextStep}
                disabled={
                  (onboardingSteps[currentStep].id === 'business-basics' && !profileData.businessName) ||
                  (onboardingSteps[currentStep].id === 'website-scraping' && isScrapingWebsite)
                }
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          {/* Welcome screen navigation */}
          {onboardingSteps[currentStep].id === 'welcome' && (
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
              >
                Let's Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartOnboardingAssistant;
