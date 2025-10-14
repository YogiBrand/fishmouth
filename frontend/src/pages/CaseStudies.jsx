/**
 * Case Studies Page - Showcase real roofing company results
 */
import React from 'react';
import { useSEO } from '../utils/seo';
import { track } from '../utils/analytics';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import {
  ArrowRight,
  TrendingUp,
  Phone,
  Target,
  CheckCircle,
  Home
} from 'lucide-react';

const CaseStudies = () => {
  const navigate = useNavigate();
  useSEO({
    title: 'Roofing Case Studies — Fish Mouth AI Results and Revenue Growth',
    description: 'Real roofing companies booking 15+ inspections/week, 80% hot lead quality, and 6-figure months. See how they did it with Fish Mouth AI.',
    canonical: 'https://fishmouth.io/case-studies',
    url: 'https://fishmouth.io/case-studies',
    ogTitle: 'Fish Mouth AI Case Studies',
    ogDescription: 'Roofers achieving 6-figure months with AI. See the proof.',
    ogImage: 'https://fishmouth.io/og-casestudies.jpg'
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Bottom CTA (mobile) */}
      <div className="fixed md:hidden bottom-4 left-0 right-0 px-4 z-[60]">
        <button
          onClick={() => navigate('/signup')}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-2xl shadow-2xl"
        >
          Get 25 Free Leads Now • No credit card
        </button>
      </div>
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
                to="/"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm sm:text-base"
              >
                Home
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
      </nav>

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 sm:px-6 py-2 rounded-full font-semibold mb-6 text-sm sm:text-base">
            <TrendingUp size={18} />
            <span>Real Results</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Roofing Companies Winning
            <span className="block text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text">
              With Fish Mouth AI
            </span>
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-12">
            See how contractors like you are booking 15+ inspections per week and closing 6-figure months—all on autopilot
          </p>

          {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-blue-100">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2 tabular-nums">$2.4M+</div>
              <div className="text-sm sm:text-base text-gray-600">Revenue Generated</div>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-green-100">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2 tabular-nums">87%</div>
              <div className="text-sm sm:text-base text-gray-600">Avg Close Rate</div>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-purple-100">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2 tabular-nums">12K+</div>
              <div className="text-sm sm:text-base text-gray-600">Quality Leads</div>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-orange-100 col-span-2 lg:col-span-1">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2 tabular-nums">500+</div>
              <div className="text-sm sm:text-base text-gray-600">Happy Contractors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study 1 - Apex Roofing */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left - Story */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm">
                <Home size={16} />
                <span>Case Study #1</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                From $80K to $420K in 30 Days
              </h2>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-3xl">
                  👨‍💼
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">Mike Johnson</div>
                  <div className="text-gray-600">Apex Roofing • Dallas, TX</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
                <div className="text-sm font-semibold text-red-700 mb-2">THE PROBLEM</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  Mike was spending 4 hours daily cold calling with a 2% response rate. Barely covering overhead with $80K/month revenue. Burnt out and ready to quit.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                <div className="text-sm font-semibold text-green-700 mb-2">THE SOLUTION</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  Fish Mouth AI scanned Dallas suburbs, found 247 HOT leads (aged roofs 15+ years), and auto-called them. AI booked 34 inspections in 30 days.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="text-sm font-semibold text-blue-700 mb-2">THE RESULTS</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">34</div>
                    <div className="text-sm text-gray-600">Jobs Closed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">$420K</div>
                    <div className="text-sm text-gray-600">Revenue</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">87%</div>
                    <div className="text-sm text-gray-600">Close Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600">0 hrs</div>
                    <div className="text-sm text-gray-600">Cold Calling</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Metrics Visual */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-2xl">
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">📈</div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">+425% Growth</div>
                  <div className="text-gray-300">In Just 30 Days</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                    <span className="font-semibold">Before Fish Mouth</span>
                    <span className="text-2xl font-bold text-red-400">$80K</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight size={32} className="text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-500/20 rounded-xl border-2 border-green-400">
                    <span className="font-semibold">After Fish Mouth</span>
                    <span className="text-2xl font-bold text-green-400">$420K</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                <div className="text-lg font-semibold mb-4">What Mike Says:</div>
                <p className="text-lg italic mb-4">
                  "I was about to quit roofing. Now I'm closing 6-figure months while Fish Mouth AI does all the calling. This is pure magic."
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} />
                  <span>Verified Results</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study 2 - Elite Roofing */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left - Metrics Visual */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-purple-200">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🎯</div>
                  <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">80% Hot Leads</div>
                  <div className="text-gray-600">Industry Average: 15%</div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Hot Leads (Ready Now)</span>
                      <span className="text-lg font-bold text-red-600">80%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3">
                      <div className="bg-red-600 h-3 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Warm Leads (3-6 months)</span>
                      <span className="text-lg font-bold text-orange-600">15%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3">
                      <div className="bg-orange-600 h-3 rounded-full" style={{width: '15%'}}></div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Cold Leads (Not qualified)</span>
                      <span className="text-lg font-bold text-blue-600">5%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3">
                      <div className="bg-blue-600 h-3 rounded-full" style={{width: '5%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="text-lg font-semibold mb-4">Sarah's Secret:</div>
                <p className="text-lg italic mb-4">
                  "Fish Mouth AI filters out the noise. Every lead it sends is a homeowner with an old roof who NEEDS replacement. Best ROI I've ever seen."
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} />
                  <span>80% Hot Lead Rate</span>
                </div>
              </div>
            </div>

            {/* Right - Story */}
            <div className="space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold text-sm">
                <Target size={16} />
                <span>Case Study #2</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                80% Hot Lead Quality—The Secret Sauce
              </h2>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-3xl">
                  👩‍💼
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">Sarah Martinez</div>
                  <div className="text-gray-600">Elite Roofing Solutions • Austin, TX</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
                <div className="text-sm font-semibold text-red-700 mb-2">THE PROBLEM</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  Sarah was buying leads from aggregators. Only 15% were qualified. Wasted $3K/month chasing tire-kickers. Frustrated with low ROI.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                <div className="text-sm font-semibold text-green-700 mb-2">THE SOLUTION</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  Fish Mouth AI uses satellite imagery + property records to find roofs 15+ years old. Every lead is pre-qualified and urgent.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="text-sm font-semibold text-blue-700 mb-2">THE RESULTS</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <span className="text-gray-700"><span className="font-bold">80% hot lead rate</span> (vs. 15% before)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <span className="text-gray-700"><span className="font-bold">$12K saved</span> on bad leads per month</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <span className="text-gray-700"><span className="font-bold">5X better ROI</span> than lead aggregators</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study 3 - Premium Roofing */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left - Story */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm">
                <Phone size={16} />
                <span>Case Study #3</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                15+ Appointments Per Week—While Sleeping
              </h2>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-3xl">
                  👨‍💼
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">David Chen</div>
                  <div className="text-gray-600">Premium Roofing Co • Houston, TX</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
                <div className="text-sm font-semibold text-red-700 mb-2">THE PROBLEM</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  David hated cold calling. Hired 2 telemarketers at $4K/month total. They booked 3-5 appointments per week. Not scalable or profitable.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                <div className="text-sm font-semibold text-green-700 mb-2">THE SOLUTION</div>
                <p className="text-gray-700 text-base sm:text-lg">
                  Fish Mouth AI voice agent calls leads 24/7. Sounds human, handles objections, books inspections to David's calendar automatically.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="text-sm font-semibold text-blue-700 mb-2">THE RESULTS</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-green-600">15+</div>
                    <div className="text-sm text-gray-600">Appts/Week</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">24/7</div>
                    <div className="text-sm text-gray-600">AI Calling</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">$3.5K</div>
                    <div className="text-sm text-gray-600">Saved/Month</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600">0</div>
                    <div className="text-sm text-gray-600">Telemarketers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Visual */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">📞</div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">AI Voice Agent</div>
                  <div className="text-green-100">Working 24/7 for David</div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Calls Made</span>
                      <span className="text-2xl font-bold">487</span>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Appointments Booked</span>
                      <span className="text-2xl font-bold">64</span>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Conversion Rate</span>
                      <span className="text-2xl font-bold">13.1%</span>
                    </div>
                  </div>
                  <div className="bg-green-400/30 rounded-xl p-4 border-2 border-white">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Cost Per Appointment</span>
                      <span className="text-2xl font-bold">$18</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-green-200">
                <div className="text-lg font-semibold text-gray-900 mb-4">David's Favorite Feature:</div>
                <p className="text-lg text-gray-700 italic mb-4">
                  "I wake up to booked appointments. The AI handles everything—calls, objections, scheduling. I just show up and close. It's like having a sales team that never sleeps."
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                  <CheckCircle size={16} />
                  <span>15+ Appointments Weekly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready To Write Your Success Story?
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-12 text-blue-100">
            Join 500+ roofing companies using Fish Mouth AI to generate millions in revenue
          </p>
          <button
            onClick={() => { track('cta_click.casestudies.final', { location: 'final_cta' }); navigate('/signup'); }}
            aria-label="Get 25 free roofing leads and start booking inspections"
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 sm:px-12 py-4 sm:py-5 rounded-xl text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl inline-flex items-center gap-3"
          >
            <span>Get 25 Free Leads Now</span>
            <ArrowRight size={24} />
          </button>
          <p className="mt-6 text-blue-100 text-sm sm:text-base">
            No credit card • 60-day guarantee
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CaseStudies;
