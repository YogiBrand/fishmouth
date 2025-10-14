import React, { useState, useEffect } from 'react';
import { 
  Save, Building, DollarSign, MessageSquare, Star, Award,
  Globe, Phone, Mail, MapPin, FileText, Zap, Settings,
  Plus, Trash2, Edit, CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const BusinessConfiguration = () => {
  const [config, setConfig] = useState({
    // Company Information
    company_name: '',
    business_address: '',
    phone: '',
    email: '',
    website: '',
    business_logo_url: '',
    
    // Pricing Configuration
    base_roof_price: 15000,
    price_per_sqft: 8,
    labor_rate_per_hour: 85,
    material_markup_percentage: 30,
    financing_available: true,
    financing_terms: '0% APR for 12 months',
    
    // Service Offerings
    services: [
      { name: 'Complete Roof Replacement', price: 15000, description: 'Full tear-off and replacement with premium materials' },
      { name: 'Roof Repair', price: 1500, description: 'Professional repairs for damaged areas' },
      { name: 'Emergency Roof Service', price: 500, description: '24/7 emergency leak repairs' },
      { name: 'Roof Inspection', price: 200, description: 'Comprehensive roof assessment' },
      { name: 'Gutter Installation', price: 2500, description: 'Premium gutter system installation' }
    ],
    
    // Competitive Advantages
    competitive_advantages: [
      'Local family-owned business',
      'A+ BBB Rating',
      'Lifetime warranty on workmanship',
      'Free storm damage assessments',
      'Financing available with approved credit',
      '24/7 emergency service',
      'Licensed and insured',
      'Over 20 years of experience'
    ],
    
    // Value Propositions
    value_propositions: [
      'Save up to 30% on energy bills',
      'Increase home value by $15,000+',
      'Protect your largest investment',
      'Peace of mind with comprehensive warranty',
      'Expert craftsmanship guaranteed'
    ],
    
    // AI Voice Agent Configuration
    voice_agent_config: {
      company_tone: 'professional',
      personality_traits: ['helpful', 'knowledgeable', 'trustworthy'],
      opening_script: "Hi, this is [Agent Name] calling from [Company Name]. I noticed your roof might benefit from an inspection. Do you have a quick minute to chat about your roof?",
      qualification_questions: [
        "How long have you owned your home?",
        "When was your roof last inspected or worked on?",
        "Have you noticed any leaks or damage recently?",
        "Are you planning any home improvements in the next year?"
      ],
      objection_responses: {
        "too_expensive": "I understand cost is a concern. That's exactly why we offer free inspections and flexible financing options. Many homeowners are surprised to learn about available rebates and energy savings.",
        "need_to_think": "Absolutely, this is a big decision. While you're considering, would you like me to schedule a free inspection so you have all the facts? There's no obligation.",
        "get_other_quotes": "Smart approach! We're confident in our pricing and quality. A free inspection will give you accurate numbers to compare with other contractors.",
        "not_interested": "I completely understand. Could I just ask - are you currently experiencing any issues with leaks or visible damage? Even if you're not ready now, it's good to know the condition."
      },
      closing_techniques: [
        "Based on what you've told me, it sounds like an inspection would be valuable. I have an opening this Thursday - would morning or afternoon work better?",
        "Many homeowners in your area have saved thousands by addressing issues early. Can we schedule a quick 15-minute assessment?",
        "Since storm season is approaching, would you like to get ahead of any potential issues with a free inspection?"
      ]
    },
    
    // Messaging Templates
    messaging_templates: {
      email: {
        cold_outreach: {
          subject: "Free Roof Assessment for [Address]",
          body: `Hi [Name],

I hope this email finds you well. I'm [Your Name] from [Company Name], a local roofing specialist serving the [City] area.

I recently conducted an analysis of roofs in your neighborhood and noticed that your property at [Address] could benefit from a professional assessment. With your roof being approximately [Age] years old, it's important to stay ahead of potential issues.

Here's what we can offer:
• Free comprehensive roof inspection
• Detailed condition report with photos
• No-obligation estimate if work is needed
• [Financing Options/Special Offers]

As a [Local Company Benefit], we've helped hundreds of homeowners in [City] protect their investment and save money on energy costs.

Would you be interested in scheduling a free 15-minute inspection this week? I have availability on [Days/Times].

Best regards,
[Your Name]
[Company Name]
[Phone] | [Website]`
        },
        follow_up: {
          subject: "Following up on your roof assessment",
          body: `Hi [Name],

I wanted to follow up on my previous message about the free roof inspection for your property at [Address].

I understand you're busy, but I wanted to make sure you saw this opportunity. Many homeowners in [City] have been surprised to learn about potential issues that could be addressed before they become costly problems.

Our free inspection includes:
✓ Comprehensive roof condition assessment
✓ Photo documentation of any issues
✓ Written report with recommendations
✓ No pressure, no obligation

Would a quick 15-minute call work better to discuss your roof's condition? I'm available [Days/Times].

[Your Name]
[Company Name]`
        }
      },
      sms: {
        initial_contact: "Hi [Name], this is [Your Name] from [Company Name]. I noticed your roof at [Address] could benefit from a free inspection. Quick question: have you had any issues with leaks or damage recently? Reply STOP to opt out.",
        follow_up: "Hi [Name], following up on the free roof inspection for [Address]. Many neighbors have been surprised by what we found. Still interested in that free assessment? [Your Name] - [Company Name]",
        appointment_reminder: "Hi [Name], this is a reminder about your roof inspection tomorrow at [Time] for [Address]. See you then! - [Your Name], [Company Name]"
      }
    },
    
    // Service Area Configuration
    service_areas: [
      { city: 'Primary City', radius_miles: 25, travel_fee: 0 },
      { city: 'Secondary City', radius_miles: 15, travel_fee: 50 },
      { city: 'Extended Area', radius_miles: 10, travel_fee: 100 }
    ],
    
    // Business Hours
    business_hours: {
      monday: { open: '08:00', close: '18:00', available: true },
      tuesday: { open: '08:00', close: '18:00', available: true },
      wednesday: { open: '08:00', close: '18:00', available: true },
      thursday: { open: '08:00', close: '18:00', available: true },
      friday: { open: '08:00', close: '18:00', available: true },
      saturday: { open: '09:00', close: '15:00', available: true },
      sunday: { open: '10:00', close: '14:00', available: false }
    },
    
    // Lead Qualification Criteria
    qualification_criteria: {
      min_property_value: 200000,
      max_roof_age: 30,
      min_roof_condition_score: 30,
      preferred_locations: [],
      exclude_rentals: true,
      min_income_estimate: 75000
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/business/config');
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...config, ...data });
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/business/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success('Configuration saved successfully');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path, value) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const addService = () => {
    setConfig({
      ...config,
      services: [...config.services, { name: '', price: 0, description: '' }]
    });
  };

  const removeService = (index) => {
    setConfig({
      ...config,
      services: config.services.filter((_, i) => i !== index)
    });
  };

  const addAdvantage = () => {
    setConfig({
      ...config,
      competitive_advantages: [...config.competitive_advantages, '']
    });
  };

  const removeAdvantage = (index) => {
    setConfig({
      ...config,
      competitive_advantages: config.competitive_advantages.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Building },
    { id: 'pricing', name: 'Pricing', icon: DollarSign },
    { id: 'services', name: 'Services', icon: Star },
    { id: 'messaging', name: 'AI Messaging', icon: MessageSquare },
    { id: 'voice-agent', name: 'Voice Agent', icon: Phone },
    { id: 'operations', name: 'Operations', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Configuration</h1>
        <p className="text-gray-600">Configure your business details, pricing, and AI messaging for optimal lead conversion</p>
      </div>

      {/* Save Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={saveConfiguration}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={config.company_name}
                  onChange={(e) => updateConfig('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={config.phone}
                  onChange={(e) => updateConfig('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => updateConfig('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={config.website}
                  onChange={(e) => updateConfig('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                <input
                  type="text"
                  value={config.business_address}
                  onChange={(e) => updateConfig('business_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo URL</label>
                <input
                  type="url"
                  value={config.business_logo_url}
                  onChange={(e) => updateConfig('business_logo_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Pricing Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Roof Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={config.base_roof_price}
                    onChange={(e) => updateConfig('base_roof_price', parseInt(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price per Square Foot</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={config.price_per_sqft}
                    onChange={(e) => updateConfig('price_per_sqft', parseFloat(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Labor Rate per Hour</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={config.labor_rate_per_hour}
                    onChange={(e) => updateConfig('labor_rate_per_hour', parseInt(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Markup %</label>
                <input
                  type="number"
                  value={config.material_markup_percentage}
                  onChange={(e) => updateConfig('material_markup_percentage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="financing"
                    checked={config.financing_available}
                    onChange={(e) => updateConfig('financing_available', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="financing" className="text-sm font-medium text-gray-700">
                    Financing Available
                  </label>
                </div>
                {config.financing_available && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="e.g., 0% APR for 12 months"
                      value={config.financing_terms}
                      onChange={(e) => updateConfig('financing_terms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Service Offerings</h3>
              <button
                onClick={addService}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {config.services.map((service, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => {
                          const newServices = [...config.services];
                          newServices[index].name = e.target.value;
                          setConfig({ ...config, services: newServices });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => {
                            const newServices = [...config.services];
                            newServices[index].price = parseInt(e.target.value);
                            setConfig({ ...config, services: newServices });
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => removeService(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={service.description}
                      onChange={(e) => {
                        const newServices = [...config.services];
                        newServices[index].description = e.target.value;
                        setConfig({ ...config, services: newServices });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Competitive Advantages</h3>
              <button
                onClick={addAdvantage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Advantage</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {config.competitive_advantages.map((advantage, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={advantage}
                    onChange={(e) => {
                      const newAdvantages = [...config.competitive_advantages];
                      newAdvantages[index] = e.target.value;
                      setConfig({ ...config, competitive_advantages: newAdvantages });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => removeAdvantage(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'voice-agent' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Voice Agent Configuration</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Tone</label>
                <select
                  value={config.voice_agent_config.company_tone}
                  onChange={(e) => updateConfig('voice_agent_config.company_tone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="authoritative">Authoritative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Opening Script</label>
                <textarea
                  rows={3}
                  value={config.voice_agent_config.opening_script}
                  onChange={(e) => updateConfig('voice_agent_config.opening_script', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the opening script for voice calls..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualification Questions</label>
                <div className="space-y-2">
                  {config.voice_agent_config.qualification_questions.map((question, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => {
                          const newQuestions = [...config.voice_agent_config.qualification_questions];
                          newQuestions[index] = e.target.value;
                          updateConfig('voice_agent_config.qualification_questions', newQuestions);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newQuestions = config.voice_agent_config.qualification_questions.filter((_, i) => i !== index);
                          updateConfig('voice_agent_config.qualification_questions', newQuestions);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newQuestions = [...config.voice_agent_config.qualification_questions, ''];
                      updateConfig('voice_agent_config.qualification_questions', newQuestions);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Objection Responses</label>
                <div className="space-y-4">
                  {Object.entries(config.voice_agent_config.objection_responses).map(([objection, response]) => (
                    <div key={objection} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 capitalize">{objection.replace('_', ' ')}</h4>
                      <textarea
                        rows={2}
                        value={response}
                        onChange={(e) => updateConfig(`voice_agent_config.objection_responses.${objection}`, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messaging' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Cold Outreach Email</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={config.messaging_templates.email.cold_outreach.subject}
                      onChange={(e) => updateConfig('messaging_templates.email.cold_outreach.subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                    <textarea
                      rows={10}
                      value={config.messaging_templates.email.cold_outreach.body}
                      onChange={(e) => updateConfig('messaging_templates.email.cold_outreach.body', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Follow-up Email</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={config.messaging_templates.email.follow_up.subject}
                      onChange={(e) => updateConfig('messaging_templates.email.follow_up.subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                    <textarea
                      rows={8}
                      value={config.messaging_templates.email.follow_up.body}
                      onChange={(e) => updateConfig('messaging_templates.email.follow_up.body', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">SMS Templates</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Contact SMS</label>
                <textarea
                  rows={3}
                  value={config.messaging_templates.sms.initial_contact}
                  onChange={(e) => updateConfig('messaging_templates.sms.initial_contact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up SMS</label>
                <textarea
                  rows={2}
                  value={config.messaging_templates.sms.follow_up}
                  onChange={(e) => updateConfig('messaging_templates.sms.follow_up', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Reminder SMS</label>
                <textarea
                  rows={2}
                  value={config.messaging_templates.sms.appointment_reminder}
                  onChange={(e) => updateConfig('messaging_templates.sms.appointment_reminder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessConfiguration;