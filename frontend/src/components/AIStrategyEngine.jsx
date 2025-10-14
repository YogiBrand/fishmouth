import React, { useState, useEffect } from 'react';
import {
  Brain, Target, TrendingUp, MessageSquare, Phone, Mail,
  Calendar, Clock, DollarSign, Award, Zap, Users, Eye,
  CheckCircle, AlertTriangle, Star, ArrowRight, Lightbulb,
  BarChart3, PieChart, Activity, Shield, Flame, Heart,
  MessageCircle, Video, Send, FileText, Download, Share
} from 'lucide-react';

const AIStrategyEngine = ({ lead, onActionSelect }) => {
  const [strategyData, setStrategyData] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('overview');

  useEffect(() => {
    generateAIStrategy();
  }, [lead]);

  const generateAIStrategy = () => {
    // Simulate AI-powered strategy generation
    const leadScore = Math.floor(Math.random() * 40) + 60;
    const conversionProbability = Math.floor(Math.random() * 30) + 45;
    
    setStrategyData({
      leadScore,
      conversionProbability,
      riskLevel: leadScore > 80 ? 'low' : leadScore > 60 ? 'medium' : 'high',
      
      // Behavioral Analysis
      behaviorProfile: {
        responsePattern: 'Evening responder (6-8 PM)',
        communicationStyle: 'Professional, detailed oriented',
        decisionSpeed: 'Moderate (7-10 days)',
        pricesensitivity: 'Medium',
        trustBuilding: 'Values expertise and market knowledge'
      },

      // Strategic Recommendations
      strategies: [
        {
          id: 'urgency',
          name: 'Urgency-Based Approach',
          description: 'Leverage market conditions and limited inventory',
          probability: 85,
          timeline: '24-48 hours',
          tactics: [
            'Share recent comparable sales above asking price',
            'Highlight competitive market conditions',
            'Mention specific timeline constraints',
            'Create FOMO with similar property examples'
          ],
          scripts: [
            "Hi [Name], I noticed 3 similar properties in your area just sold 12% above asking price this week. The market is moving incredibly fast right now...",
            "Based on our analysis, properties like yours are receiving multiple offers within the first 48 hours of listing..."
          ]
        },
        {
          id: 'consultative',
          name: 'Consultative Partnership',
          description: 'Build trust through expertise and market insights',
          probability: 75,
          timeline: '5-7 days',
          tactics: [
            'Provide detailed market analysis',
            'Share industry insights and trends',
            'Offer free property consultation',
            'Demonstrate local market expertise'
          ],
          scripts: [
            "I've prepared a detailed market analysis for your property that shows some interesting trends you might find valuable...",
            "As someone who's helped 150+ homeowners in your area, I've noticed a pattern that could significantly impact your property value..."
          ]
        },
        {
          id: 'value',
          name: 'Value Maximization Strategy',
          description: 'Focus on maximizing property value and ROI',
          probability: 70,
          timeline: '3-5 days',
          tactics: [
            'Present value-add opportunities',
            'Show potential return on investment',
            'Offer staging and improvement suggestions',
            'Provide pricing optimization analysis'
          ],
          scripts: [
            "I've identified 3 simple improvements that could increase your property value by $25,000-$35,000...",
            "Our data shows that properties with these specific features sell 23% faster and 8% higher than market average..."
          ]
        }
      ],

      // Communication Sequences
      sequences: [
        {
          name: 'High-Intent Warm Lead',
          duration: '7 days',
          touchpoints: 5,
          channels: ['Email', 'Phone', 'Text', 'Video'],
          messages: [
            { day: 1, channel: 'Email', subject: 'Your Property Analysis is Ready', type: 'value_delivery' },
            { day: 2, channel: 'Phone', subject: 'Follow-up call', type: 'consultation' },
            { day: 4, channel: 'Text', subject: 'Market update', type: 'urgency' },
            { day: 5, channel: 'Email', subject: 'Similar property case study', type: 'social_proof' },
            { day: 7, channel: 'Video', subject: 'Personal market update', type: 'relationship' }
          ]
        },
        {
          name: 'Nurture & Education',
          duration: '14 days',
          touchpoints: 8,
          channels: ['Email', 'Text', 'Social'],
          messages: [
            { day: 1, channel: 'Email', subject: 'Welcome to our market insights', type: 'welcome' },
            { day: 3, channel: 'Text', subject: 'Quick market tip', type: 'education' },
            { day: 5, channel: 'Email', subject: 'Local market trends report', type: 'value_delivery' },
            { day: 8, channel: 'Text', subject: 'Price improvement opportunity', type: 'urgency' },
            { day: 10, channel: 'Email', subject: 'Success story from your neighborhood', type: 'social_proof' },
            { day: 12, channel: 'Text', subject: 'Ready to discuss your options?', type: 'consultation' },
            { day: 14, channel: 'Email', subject: 'Final market update', type: 'final_attempt' }
          ]
        }
      ],

      // Closing Strategies
      closingStrategies: [
        {
          type: 'assumptive',
          name: 'Assumptive Close',
          scenario: 'High engagement, multiple touchpoints',
          script: "Based on our conversations, I'll go ahead and prepare the listing materials. When would be the best time this week for our final walkthrough?",
          success_rate: '73%'
        },
        {
          type: 'urgency',
          name: 'Market Urgency Close',
          scenario: 'Price-sensitive, market-aware lead',
          script: "With 3 new listings hitting the market this week, I want to make sure your property gets the attention it deserves. Shall we move forward with listing this Friday?",
          success_rate: '68%'
        },
        {
          type: 'consultative',
          name: 'Partnership Close',
          scenario: 'Relationship-focused, trust-building needed',
          script: "I believe we're a great fit to work together on this. What questions do you have about moving forward as your listing agent?",
          success_rate: '65%'
        }
      ],

      // Objection Handling
      objectionHandling: [
        {
          objection: "We're not ready to sell yet",
          response: "I completely understand - timing is crucial. Many of my clients felt the same way initially. What I typically do is prepare a comprehensive market analysis so you know exactly where you stand when you are ready. This way, you're ahead of the game and can make an informed decision when the time feels right. Would that be helpful?",
          follow_up: "I can also set up automated market alerts so you're aware of any significant changes in your area."
        },
        {
          objection: "We want to try selling ourselves first",
          response: "That's completely understandable - many homeowners explore that option. I actually work with several clients who initially tried FSBO. What I've learned is that having a backup plan and professional market insights can save a lot of time and potentially increase your net proceeds. Could we discuss what support might be helpful even if you decide to start on your own?",
          follow_up: "I offer a FSBO support package that many find valuable."
        },
        {
          objection: "Your commission is too high",
          response: "I appreciate your directness about fees - it shows you're thinking about maximizing your net proceeds, which is exactly what I focus on. My commission structure reflects the comprehensive marketing, negotiation expertise, and time investment that typically results in 8-12% higher sale prices. Would you like me to show you the specific services and results that justify this investment?",
          follow_up: "Let me show you a net proceeds comparison with recent similar sales."
        }
      ],

      // Optimal Timing
      timing: {
        bestCallTimes: ['2:00 PM - 4:00 PM', '6:00 PM - 8:00 PM'],
        bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
        responsePatterns: {
          email: '2-4 hours average response',
          phone: '6-8 PM highest answer rate',
          text: 'Throughout business hours'
        }
      },

      // Market Intelligence
      marketIntel: {
        competitorAnalysis: {
          activeListings: 12,
          averageDaysOnMarket: 35,
          priceReductions: '23% of listings',
          marketTrend: 'stable_to_rising'
        },
        pricingStrategy: {
          suggestedRange: '$342,000 - $358,000',
          competitivePrice: '$349,900',
          quickSalePrice: '$339,900',
          maximumValue: '$365,000'
        }
      }
    });
  };

  const strategyTabs = [
    { id: 'overview', label: 'AI Overview', icon: Brain },
    { id: 'strategies', label: 'Sales Strategies', icon: Target },
    { id: 'sequences', label: 'Communication', icon: MessageSquare },
    { id: 'closing', label: 'Closing Tactics', icon: Award },
    { id: 'objections', label: 'Objection Handling', icon: Shield },
    { id: 'timing', label: 'Optimal Timing', icon: Clock },
  ];

  if (!strategyData) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Generating AI strategy...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy Header */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">AI Sales Strategy</h2>
            <p className="opacity-90">Personalized approach for maximum conversion</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{strategyData.leadScore}</div>
            <div className="text-sm opacity-80">Lead Score</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{strategyData.conversionProbability}%</div>
            <div className="text-xs opacity-80">Conversion Probability</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold capitalize">{strategyData.riskLevel}</div>
            <div className="text-xs opacity-80">Risk Level</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">7-10</div>
            <div className="text-xs opacity-80">Decision Days</div>
          </div>
        </div>
      </div>

      {/* Strategy Navigation */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl">
        <div className="border-b border-slate-200 p-4">
          <div className="flex space-x-1 overflow-x-auto">
            {strategyTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStrategy(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeStrategy === tab.id
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeStrategy === 'overview' && (
            <OverviewSection strategyData={strategyData} />
          )}
          {activeStrategy === 'strategies' && (
            <StrategiesSection strategies={strategyData.strategies} onActionSelect={onActionSelect} />
          )}
          {activeStrategy === 'sequences' && (
            <SequencesSection sequences={strategyData.sequences} />
          )}
          {activeStrategy === 'closing' && (
            <ClosingSection closingStrategies={strategyData.closingStrategies} />
          )}
          {activeStrategy === 'objections' && (
            <ObjectionHandlingSection objections={strategyData.objectionHandling} />
          )}
          {activeStrategy === 'timing' && (
            <TimingSection timing={strategyData.timing} />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ strategyData }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Behavioral Profile</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(strategyData.behaviorProfile).map(([key, value]) => (
          <div key={key} className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</div>
            <div className="font-medium text-slate-900">{value}</div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Market Intelligence</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">Pricing Strategy</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Competitive Price:</span>
              <span className="font-semibold">{strategyData.marketIntel.pricingStrategy.competitivePrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Quick Sale:</span>
              <span className="font-semibold">{strategyData.marketIntel.pricingStrategy.quickSalePrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Maximum Value:</span>
              <span className="font-semibold">{strategyData.marketIntel.pricingStrategy.maximumValue}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900 mb-3">Market Conditions</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-700">Active Listings:</span>
              <span className="font-semibold">{strategyData.marketIntel.competitorAnalysis.activeListings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Avg. Days on Market:</span>
              <span className="font-semibold">{strategyData.marketIntel.competitorAnalysis.averageDaysOnMarket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Price Reductions:</span>
              <span className="font-semibold">{strategyData.marketIntel.competitorAnalysis.priceReductions}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Strategies Section Component
const StrategiesSection = ({ strategies, onActionSelect }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-slate-900">Recommended Sales Strategies</h3>
    {strategies.map((strategy) => (
      <StrategyCard key={strategy.id} strategy={strategy} onActionSelect={onActionSelect} />
    ))}
  </div>
);

const StrategyCard = ({ strategy, onActionSelect }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-slate-900">{strategy.name}</h4>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-slate-500">{strategy.probability}% success rate</div>
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {strategy.timeline}
            </div>
          </div>
        </div>
        <p className="text-slate-600 mb-4">{strategy.description}</p>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <span>{expanded ? 'Hide Details' : 'View Tactics & Scripts'}</span>
          <ArrowRight size={16} className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            <div>
              <h5 className="font-medium text-slate-900 mb-2">Key Tactics</h5>
              <ul className="space-y-1">
                {strategy.tactics.map((tactic, index) => (
                  <li key={index} className="text-sm text-slate-600 flex items-start space-x-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{tactic}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-slate-900 mb-2">Sample Scripts</h5>
              <div className="space-y-3">
                {strategy.scripts.map((script, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 italic">"{script}"</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">Script {index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800">Copy</button>
                        <button 
                          onClick={() => onActionSelect && onActionSelect('use_script', { strategy: strategy.id, script })}
                          className="text-xs text-emerald-600 hover:text-emerald-800"
                        >
                          Use This
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onActionSelect && onActionSelect('implement_strategy', strategy)}
              className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Implement This Strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Sequences Section Component
const SequencesSection = ({ sequences }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-slate-900">Communication Sequences</h3>
    {sequences.map((sequence, index) => (
      <SequenceCard key={index} sequence={sequence} />
    ))}
  </div>
);

const SequenceCard = ({ sequence }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-lg font-semibold text-slate-900">{sequence.name}</h4>
      <div className="flex items-center space-x-4 text-sm text-slate-500">
        <span>{sequence.duration}</span>
        <span>{sequence.touchpoints} touchpoints</span>
      </div>
    </div>

    <div className="space-y-3">
      {sequence.messages.map((message, index) => (
        <div key={index} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
            {message.day}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-slate-900">{message.subject}</span>
              <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs">{message.channel}</span>
            </div>
            <div className="text-xs text-slate-500 capitalize">{message.type.replace('_', ' ')}</div>
          </div>
        </div>
      ))}
    </div>

    <button className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
      Enroll in Sequence
    </button>
  </div>
);

// Closing Section Component
const ClosingSection = ({ closingStrategies }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-slate-900">Closing Strategies</h3>
    {closingStrategies.map((strategy, index) => (
      <div key={index} className="border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-900">{strategy.name}</h4>
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            {strategy.success_rate} success rate
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-3">Best for: {strategy.scenario}</p>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-sm text-slate-700 italic">"{strategy.script}"</p>
        </div>
      </div>
    ))}
  </div>
);

// Objection Handling Section Component
const ObjectionHandlingSection = ({ objections }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-slate-900">Objection Handling</h3>
    {objections.map((objection, index) => (
      <div key={index} className="border border-slate-200 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <span>"{objection.objection}"</span>
        </h4>
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <h5 className="text-sm font-medium text-emerald-800 mb-2">Recommended Response:</h5>
            <p className="text-sm text-emerald-700">{objection.response}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h5 className="text-sm font-medium text-blue-800 mb-2">Follow-up:</h5>
            <p className="text-sm text-blue-700">{objection.follow_up}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Timing Section Component
const TimingSection = ({ timing }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-slate-900">Optimal Contact Timing</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Best Call Times</h4>
        <div className="space-y-2">
          {timing.bestCallTimes.map((time, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Clock size={16} className="text-blue-600" />
              <span className="text-blue-800">{time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
        <h4 className="font-semibold text-emerald-900 mb-3">Optimal Days</h4>
        <div className="space-y-2">
          {timing.bestDays.map((day, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Calendar size={16} className="text-emerald-600" />
              <span className="text-emerald-800">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="bg-slate-50 rounded-lg p-4">
      <h4 className="font-semibold text-slate-900 mb-3">Response Patterns</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(timing.responsePatterns).map(([channel, pattern]) => (
          <div key={channel} className="text-center">
            <div className="text-sm text-slate-500 capitalize mb-1">{channel}</div>
            <div className="font-medium text-slate-900">{pattern}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AIStrategyEngine;