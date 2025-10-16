/**
 * AI Chatbot - Lead capture with irresistible offers
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Gift, Zap, Star, CheckCircle } from 'lucide-react';

const AIChatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [stage, setStage] = useState('greeting');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentMode, setAgentMode] = useState('automation'); // 'automation' or 'human'
  const [agentName, setAgentName] = useState('');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Show chatbot after 5 seconds
    const timer = setTimeout(async () => {
      if (!isOpen && messages.length === 0) {
        setIsOpen(true);
        await addMessage('bot', 'greeting');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keyword detection for agent handoff
  const detectNeedsHumanAgent = (text) => {
    const humanTriggers = [
      'speak to someone', 'human agent', 'customer service', 'representative',
      'help me', 'support', 'problem', 'issue', 'stuck', 'confused',
      'billing', 'payment', 'refund', 'cancel', 'account', 'login',
      'doesn\'t work', 'not working', 'error', 'bug', 'broken'
    ];
    
    return humanTriggers.some(trigger => 
      text.toLowerCase().includes(trigger.toLowerCase())
    );
  };

  // Realistic typing simulation
  const simulateTyping = (duration = 2000) => {
    setIsTyping(true);
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, duration);
      typingTimeoutRef.current = timeout;
    });
  };

  // Streaming message effect
  const addStreamingMessage = async (sender, text, quick_replies = []) => {
    const messageId = Date.now();
    
    // Add empty message first
    setMessages(prev => [...prev, {
      id: messageId,
      sender,
      text: '',
      quick_replies: [],
      isStreaming: true
    }]);

    // Stream the text character by character
    setIsStreaming(true);
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: currentText }
          : msg
      ));
      
      // Realistic typing speed - faster for automation, slower for humans
      const delay = agentMode === 'automation' ? 50 : 80;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Finish streaming and add quick replies
    setIsStreaming(false);
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, quick_replies, isStreaming: false }
        : msg
    ));
  };

  const addMessage = async (sender, type, content = '', skipTyping = false) => {
    const botMessages = {
      greeting: {
        text: "👋 Hey there! I'm your support assistant. I noticed you're checking out our roofing lead generation platform. How can I help you today?",
        quick_replies: ['Tell me more', 'Show me results', 'I want to try it', 'Speak to someone']
      },
      offer: {
        text: "🎁 SPECIAL OFFER: Sign up in the next 10 minutes and get:\n\n✅ 25 FREE quality leads (instead of 10)\n✅ Free AI voice agent setup ($299 value)\n✅ Priority onboarding\n✅ 60-day money back guarantee (instead of 30)\n\nWant to claim this exclusive offer?",
        quick_replies: ['Yes! Sign me up', 'Tell me how it works', 'Need help']
      },
      results: {
        text: "📊 Roofers using Fish Mouth AI see:\n\n🔥 15+ inspections every week\n🎯 80% hot lead quality (aged roofs 15+ years)\n📅 Calendars filled automatically\n💵 Average cost per lead $1.13\n\nWhat matters most right now — more inspections, better lead quality, or lower cost?",
        quick_replies: ['More inspections', 'Better lead quality', 'Lower cost']
      },
      handoff: {
        text: "I understand you'd like to speak with someone directly. Let me connect you with one of our specialists who can provide personalized assistance.",
        quick_replies: []
      },
      agent_intro: {
        text: `Hi there! This is ${content} from Fish Mouth support. I see you were chatting with our assistant. I'm here to help you personally - how can I assist you today?`,
        quick_replies: []
      },
      name: {
        text: "Perfect! Let me get you set up with those 25 FREE leads. What's your name?",
        quick_replies: []
      },
      email: {
        text: `Great to meet you, ${content}! What's your email address so I can send your free leads?`,
        quick_replies: []
      },
      phone: {
        text: "Awesome! And your phone number? I'll text you a link to claim your bonus AI voice agent setup.",
        quick_replies: []
      },
      company: {
        text: "Last question - what's your company name?",
        quick_replies: []
      },
      final: {
        text: `🎉 Perfect! I've created your account with 25 FREE leads waiting for you!\n\nClick the button below to set your password and start generating leads in the next 9 minutes!\n\n⚡ Offer expires in 10 minutes - claim it now!`,
        quick_replies: ['Claim My Account']
      }
    };

    if (sender === 'user') {
      const newMessage = {
        id: Date.now(),
        sender,
        text: content,
        quick_replies: []
      };
      setMessages(prev => [...prev, newMessage]);
      return;
    }

    // Bot messages with realistic delays and typing
    const messageData = botMessages[type];
    if (!messageData) return;

    if (!skipTyping) {
      // Realistic delay based on agent type
      const delay = agentMode === 'automation' ? 800 : 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Show typing indicator
      const typingDuration = agentMode === 'automation' ? 1200 : 2500;
      await simulateTyping(typingDuration);
    }

    // Stream the message
    await addStreamingMessage(sender, messageData.text, messageData.quick_replies);
  };

  const handleAgentHandoff = async () => {
    await addMessage('bot', 'handoff');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Switch to human agent mode
    setAgentMode('human');
    const agents = ['Alex', 'Sarah', 'Mike', 'Jessica', 'Ryan'];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    setAgentName(randomAgent);
    
    await addMessage('bot', 'agent_intro', randomAgent);
  };

  const handleQuickReply = async (reply) => {
    await addMessage('user', 'user', reply);

    // Check if user wants human agent
    if (reply === 'Speak to someone' || reply === 'Need help' || detectNeedsHumanAgent(reply)) {
      await handleAgentHandoff();
      return;
    }

    if (reply === 'Tell me more' || reply === 'I want to try it') {
      await addMessage('bot', 'offer');
      setStage('offer');
    } else if (reply === 'Show me results') {
      await addMessage('bot', 'results');
      setStage('results');
    } else if (
      reply === 'Yes! Sign me up' ||
      reply.includes('leads') ||
      reply.includes('quality') ||
      reply.includes('cost') ||
      reply.toLowerCase().includes('inspect')
    ) {
      await addMessage('bot', 'name');
      setStage('name');
    } else if (reply === 'Tell me how it works') {
      await addMessage('bot', 'results');
      setStage('results');
    } else if (reply === 'Claim My Account') {
      try {
        // Normalize keys and persist to localStorage for reliable prefill on /signup
        const normalized = {
          full_name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          company_name: userData.company || ''
        };
        localStorage.setItem('chatbot_signup_data', JSON.stringify(normalized));
      } catch (e) {
        // Non-blocking: proceed to navigation even if storage fails
      }

      navigate('/signup', { 
        state: { 
          prefill: userData,
          bonus: true,
          leads: 25
        } 
      });
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const value = inputValue;
    setInputValue('');
    await addMessage('user', 'user', value);

    // Check if user needs human agent
    if (detectNeedsHumanAgent(value) && agentMode === 'automation') {
      await handleAgentHandoff();
      return;
    }

    // Different response styles based on agent mode
    if (agentMode === 'human') {
      // Human agent responses - more personalized and casual
      const humanResponses = [
        "I see what you mean. Let me check that for you.",
        "Absolutely, I can help with that! Give me just a moment.",
        "Thanks for clarifying. Let me pull up your information.",
        "Got it! I understand your situation. Let me see what I can do.",
        "No problem at all. I've dealt with similar cases before."
      ];
      
      const randomResponse = humanResponses[Math.floor(Math.random() * humanResponses.length)];
      await addMessage('bot', 'user', randomResponse);
      return;
    }

    // Automation flow
    if (stage === 'name') {
      setUserData(prev => ({ ...prev, name: value }));
      await addMessage('bot', 'email', value);
      setStage('email');
    } else if (stage === 'email') {
      setUserData(prev => ({ ...prev, email: value }));
      await addMessage('bot', 'phone');
      setStage('phone');
    } else if (stage === 'phone') {
      setUserData(prev => ({ ...prev, phone: value }));
      await addMessage('bot', 'company');
      setStage('company');
    } else if (stage === 'company') {
      setUserData(prev => ({ ...prev, company: value }));
      await addMessage('bot', 'final');
      setStage('final');
    } else {
      await addMessage('bot', 'offer');
      setStage('offer');
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={async () => {
            setIsOpen(true);
            if (messages.length === 0) {
              await addMessage('bot', 'greeting');
            }
          }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center animate-bounce"
        >
          <div className="relative">
            <span className="text-3xl">🐟</span>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-300">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{agentMode === 'human' ? '👤' : '🐟'}</span>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {agentMode === 'human' ? `Chatting with ${agentName}` : 'Assistant'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Notifications toggle */}
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Toggle notifications"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    <path d="M2 2l20 20"/>
                  </svg>
                </button>
                
                {/* End chat button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  End chat
                </button>
                
                {/* Close X */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Special Offer Banner */}
          <div className="bg-yellow-400 text-gray-900 px-4 py-2 text-center text-sm font-bold animate-pulse">
            🎁 LIMITED OFFER: Get 25 FREE leads (normally 10)
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0 max-h-[400px]">
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 shadow-md border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                    )}
                  </div>
                </div>

                {/* Quick Replies */}
                {message.quick_replies && message.quick_replies.length > 0 && !message.isStreaming && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-2">
                    {message.quick_replies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        className="px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-full text-sm font-semibold hover:bg-blue-600 hover:text-white transition-all"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-md border border-gray-200 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {agentMode === 'human' ? `${agentName} is typing...` : 'Assistant is typing...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                disabled={isTyping || isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={isTyping || isStreaming || !inputValue.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by Fish Mouth AI • 100% secure
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;


