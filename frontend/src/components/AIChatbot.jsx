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
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Show chatbot after 5 seconds
    const timer = setTimeout(() => {
      if (!isOpen && messages.length === 0) {
        setIsOpen(true);
        addMessage('bot', 'greeting');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const addMessage = (sender, type, content = '') => {
    const botMessages = {
      greeting: {
        text: "👋 Hey there! I'm Fish, your AI assistant. I noticed you're checking out our roofing lead generation platform. Can I help you get started?",
        quick_replies: ['Tell me more', 'Show me results', 'I want to try it']
      },
      offer: {
        text: "🎁 SPECIAL OFFER: Sign up in the next 10 minutes and get:\n\n✅ 25 FREE quality leads (instead of 10)\n✅ Free AI voice agent setup ($299 value)\n✅ Priority onboarding\n✅ 60-day money back guarantee (instead of 30)\n\nWant to claim this exclusive offer?",
        quick_replies: ['Yes! Sign me up', 'Tell me how it works']
      },
      results: {
        text: "📊 Roofers using Fish Mouth AI see:\n\n🔥 15+ inspections every week\n🎯 80% hot lead quality (aged roofs 15+ years)\n📅 Calendars filled automatically\n💵 Average cost per lead $1.13\n\nWhat matters most right now — more inspections, better lead quality, or lower cost?",
        quick_replies: ['More inspections', 'Better lead quality', 'Lower cost']
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

    const newMessage = {
      id: Date.now(),
      sender,
      text: type === 'user' ? content : botMessages[type]?.text || content,
      quick_replies: sender === 'bot' ? botMessages[type]?.quick_replies : []
    };

    setMessages(prev => [...prev, newMessage]);
  };

  const handleQuickReply = (reply) => {
    addMessage('user', 'user', reply);

    setTimeout(() => {
      if (reply === 'Tell me more' || reply === 'I want to try it') {
        addMessage('bot', 'offer');
        setStage('offer');
      } else if (reply === 'Show me results') {
        addMessage('bot', 'results');
        setStage('results');
      } else if (
        reply === 'Yes! Sign me up' ||
        reply.includes('leads') ||
        reply.includes('quality') ||
        reply.includes('cost') ||
        reply.toLowerCase().includes('inspect')
      ) {
        addMessage('bot', 'name');
        setStage('name');
      } else if (reply === 'Tell me how it works') {
        addMessage('bot', 'results');
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
    }, 1000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    addMessage('user', 'user', inputValue);
    const value = inputValue;
    setInputValue('');

    setTimeout(() => {
      if (stage === 'name') {
        setUserData(prev => ({ ...prev, name: value }));
        addMessage('bot', 'email', value);
        setStage('email');
      } else if (stage === 'email') {
        setUserData(prev => ({ ...prev, email: value }));
        addMessage('bot', 'phone');
        setStage('phone');
      } else if (stage === 'phone') {
        setUserData(prev => ({ ...prev, phone: value }));
        addMessage('bot', 'company');
        setStage('company');
      } else if (stage === 'company') {
        setUserData(prev => ({ ...prev, company: value }));
        addMessage('bot', 'final');
        setStage('final');
      } else {
        addMessage('bot', 'offer');
        setStage('offer');
      }
    }, 1000);
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            if (messages.length === 0) {
              addMessage('bot', 'greeting');
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
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border-2 border-blue-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl">🐟</span>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <div className="font-bold">Fish - AI Assistant</div>
                <div className="text-xs text-white/80">Online • Responds instantly</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Special Offer Banner */}
          <div className="bg-yellow-400 text-gray-900 px-4 py-2 text-center text-sm font-bold animate-pulse">
            🎁 LIMITED OFFER: Get 25 FREE leads (normally 10)
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                  </div>
                </div>

                {/* Quick Replies */}
                {message.quick_replies && message.quick_replies.length > 0 && (
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all"
              >
                <Send size={20} />
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


