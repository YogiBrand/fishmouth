/**
 * Signup Page - original Fish Mouth design with expanded provider sign-up
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSEO } from '../utils/seo';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Building, Phone, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import MicrosoftAuthButton from '../components/MicrosoftAuthButton';
import AppleAuthButton from '../components/AppleAuthButton';
import GoogleLogo from '../assets/brand/google.svg';
import AppleLogo from '../assets/brand/apple.svg';
import MicrosoftLogo from '../assets/brand/microsoft.svg';

const DEFAULT_GEO_LOCATION = { lat: 32.7767, lon: -96.797 };
const GEO_CITY_COORDS = {
  'Dallas,TX': DEFAULT_GEO_LOCATION,
};
const ONBOARDING_RADIUS_M = 5000;
const ONBOARDING_SAMPLE_COUNT = 1000;

const Signup = () => {
  // Prefill from chatbot data if available
  const prefillData = useMemo(() => {
    try {
      const stored = localStorage.getItem('chatbot_signup_data');
      if (stored) {
        localStorage.removeItem('chatbot_signup_data'); // Clear after use
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading chatbot data:', e);
    }
    return {};
  }, []);

  const [formData, setFormData] = useState({
    email: prefillData.email || '',
    password: '',
    full_name: prefillData.full_name || '',
    company_name: prefillData.company_name || '',
    phone: prefillData.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [geoLocation, setGeoLocation] = useState(DEFAULT_GEO_LOCATION);
  const [geoSource, setGeoSource] = useState('default');
  const [googleCtrl, setGoogleCtrl] = useState({
    open: null,
    isReady: false,
    isAvailable: Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID),
  });
  const [appleCtrl, setAppleCtrl] = useState({
    open: null,
    isReady: false,
    isAvailable: Boolean(process.env.REACT_APP_APPLE_CLIENT_ID),
  });
  const [microsoftCtrl, setMicrosoftCtrl] = useState({
    open: null,
    isReady: Boolean(process.env.REACT_APP_MS_CLIENT_ID),
    isAvailable: Boolean(process.env.REACT_APP_MS_CLIENT_ID),
  });

  const { signup } = useAuth();
  const navigate = useNavigate();
  useSEO({
    title: 'Start Free — Get 25 Roofing Leads + 14-Day Access | Fish Mouth AI',
    description: 'Get 25 free leads and full platform access for 14 days. AI qualifies homeowners with aged roofs and books your calendar. 60-day guarantee.',
    canonical: 'https://fishmouth.io/signup',
    url: 'https://fishmouth.io/signup',
    ogTitle: 'Start Free — Fish Mouth AI',
    ogDescription: 'Get 25 free leads + 14-day access. AI that fills your calendar.',
    ogImage: 'https://fishmouth.io/og-signup.jpg',
  });

  useEffect(() => {
    let cancelled = false;

    const applyLocation = (lat, lon, source) => {
      if (cancelled) return;
      if (typeof lat !== 'number' || typeof lon !== 'number') return;
      setGeoLocation({ lat, lon });
      setGeoSource(source);
    };

    const fetchGeoIp = async () => {
      try {
        const res = await fetch('/api/v1/geoip');
        if (!res.ok) return;
        const data = await res.json();
        const key = data.city && data.region ? `${data.city},${data.region}` : null;
        if (key && GEO_CITY_COORDS[key]) {
          const coords = GEO_CITY_COORDS[key];
          applyLocation(coords.lat, coords.lon, 'geoip');
        }
      } catch (geoErr) {
        console.debug('GeoIP lookup failed', geoErr);
      }
    };

    const requestBrowserLocation = () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        fetchGeoIp();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => applyLocation(position.coords.latitude, position.coords.longitude, 'geolocation'),
        () => fetchGeoIp(),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    };

    requestBrowserLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProviderSuccess = () => {
    setError('');
    navigate('/dashboard');
  };

  const handleProviderError = (message) => {
    if (message) {
      setError(message);
    }
  };

  const handleGoogleExpose = useCallback((controller = {}) => {
    setGoogleCtrl((prev) => ({
      open: controller.open || prev.open,
      isReady: typeof controller.isReady === 'boolean' ? controller.isReady : prev.isReady,
      isAvailable: typeof controller.isAvailable === 'boolean' ? controller.isAvailable : prev.isAvailable,
    }));
  }, []);

  const handleAppleExpose = useCallback((controller = {}) => {
    setAppleCtrl((prev) => ({
      open: controller.open || prev.open,
      isReady: typeof controller.isReady === 'boolean' ? controller.isReady : prev.isReady,
      isAvailable: typeof controller.isAvailable === 'boolean' ? controller.isAvailable : prev.isAvailable,
    }));
  }, []);

  const handleMicrosoftExpose = useCallback((controller = {}) => {
    setMicrosoftCtrl((prev) => ({
      open: controller.open || prev.open,
      isReady: typeof controller.isReady === 'boolean' ? controller.isReady : prev.isReady,
      isAvailable: typeof controller.isAvailable === 'boolean' ? controller.isAvailable : prev.isAvailable,
    }));
  }, []);

  const handleGoogleClick = () => {
    setError('');
    if (!googleCtrl.isAvailable) {
      setError('Google signup is not configured.');
      return;
    }
    if (!googleCtrl.isReady) {
      setError('Google sign-up is loading. Please try again in a moment.');
      return;
    }
    try {
      googleCtrl.open?.();
    } catch (err) {
      setError(err?.message || 'Unable to start Google signup.');
    }
  };

  const handleAppleClick = () => {
    setError('');
    if (!appleCtrl.isAvailable) {
      setError('Apple signup is not configured.');
      return;
    }
    if (!appleCtrl.isReady) {
      setError('Apple sign-up is loading. Please try again shortly.');
      return;
    }
    try {
      appleCtrl.open?.();
    } catch (err) {
      setError(err?.message || 'Unable to start Apple signup.');
    }
  };

  const handleMicrosoftClick = () => {
    setError('');
    if (!microsoftCtrl.isAvailable) {
      setError('Microsoft signup is not configured.');
      return;
    }
    if (!microsoftCtrl.isReady) {
      setError('Microsoft sign-up is still preparing. Please try again.');
      return;
    }
    try {
      microsoftCtrl.open?.();
    } catch (err) {
      setError(err?.message || 'Unable to start Microsoft signup.');
    }
  };

  const providerStyles = useMemo(
    () => ({
      google: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
      apple: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
      microsoft: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    }),
    []
  );

  const ProviderButton = ({ variant, label, icon, onClick, disabled, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-3 font-semibold py-3.5 rounded-xl transition ${providerStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={label}
      title={title || label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const GoogleIcon = (
    <img src={GoogleLogo} alt="Google" className="h-5 w-5" loading="eager" />
  );

  const AppleIcon = (
    <img src={AppleLogo} alt="Apple" className="h-5 w-5" loading="eager" />
  );

  const MicrosoftIcon = (
    <img src={MicrosoftLogo} alt="Microsoft" className="h-5 w-5" loading="eager" />
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.company_name,
        formData.phone,
        {
          lat: typeof geoLocation?.lat === 'number' ? geoLocation.lat : undefined,
          lon: typeof geoLocation?.lon === 'number' ? geoLocation.lon : undefined,
          radius_m: ONBOARDING_RADIUS_M,
          sample: ONBOARDING_SAMPLE_COUNT,
          source: geoSource,
        }
      );
      if (result.success) {
        // Redirect to user dashboard after successful signup
        navigate('/dashboard');
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <Link to="/" className="inline-block mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                🐟 Fish Mouth
              </h1>
            </Link>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
            <p className="text-gray-600 text-base sm:text-lg">Get 25 free leads + 14 days full access</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-800 font-medium text-sm sm:text-base">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={20} />
                </div>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  required
                  autoComplete="name"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Company Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building className="text-gray-400" size={20} />
                </div>
                <input
                  id="company_name"
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Smith Roofing Co."
                  required
                  autoComplete="organization"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@smithroofing.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="text-gray-400" size={20} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  required
                  autoComplete="tel"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  minLength="8"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">Must be at least 8 characters</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base sm:text-lg mt-6"
            >
              {loading ? (
                <>
                  <div className="spinner border-white" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-center text-sm text-gray-500 mt-4">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          {/* Social Signup */}
          <div className="pt-2">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or</span>
              </div>
            </div>
            <div className="space-y-3">
              <ProviderButton
                variant="google"
                label="Sign up with Google"
                icon={GoogleIcon}
                onClick={handleGoogleClick}
                disabled={!googleCtrl.isAvailable || !googleCtrl.isReady}
                title={googleCtrl.isAvailable ? undefined : 'Google signup not configured'}
              />
              <ProviderButton
                variant="apple"
                label="Sign up with Apple"
                icon={AppleIcon}
                onClick={handleAppleClick}
                disabled={!appleCtrl.isAvailable || !appleCtrl.isReady}
                title={appleCtrl.isAvailable ? undefined : 'Apple signup not configured'}
              />
              <ProviderButton
                variant="microsoft"
                label="Sign up with Microsoft"
                icon={MicrosoftIcon}
                onClick={handleMicrosoftClick}
                disabled={!microsoftCtrl.isAvailable || !microsoftCtrl.isReady}
                title={microsoftCtrl.isAvailable ? undefined : 'Microsoft signup not configured'}
              />
            </div>
            <div className="sr-only" aria-hidden="true">
              <GoogleAuthButton
                hidden
                exposeController={handleGoogleExpose}
                onSuccess={handleProviderSuccess}
                onError={handleProviderError}
                width={1}
                size="medium"
              />
              <AppleAuthButton
                hidden
                compact={false}
                exposeController={handleAppleExpose}
                onSuccess={handleProviderSuccess}
                onError={handleProviderError}
              />
              <MicrosoftAuthButton
                hidden
                exposeController={handleMicrosoftExpose}
                onSuccess={handleProviderSuccess}
                onError={handleProviderError}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="block w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 text-base sm:text-lg"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight">Stop Wasting Time. Start Closing Deals.</h2>
            <p className="text-blue-100 text-lg">
              Join hundreds of roofing contractors who've automated their lead generation
            </p>
          </div>

          {/* Benefits - 3 CONCISE PAIN POINTS */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">No More Cold Calling</h3>
                <p className="text-blue-100">
                  AI calls leads 24/7, handles objections, books appointments directly to your calendar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Only Hot Leads</h3>
                <p className="text-blue-100">80%+ qualified rate. We find homeowners with 15+ year roofs needing replacement NOW</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">15+ Inspections Weekly</h3>
                <p className="text-blue-100">Automated email, SMS, and voice outreach fills your calendar while you sleep</p>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="pt-8 border-t border-white/20">
            <div className="flex items-center gap-3 text-white mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="font-semibold">4.9/5</span>
            </div>
            <p className="text-blue-100 text-sm">500+ roofing companies trust Fish Mouth to generate their leads</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
