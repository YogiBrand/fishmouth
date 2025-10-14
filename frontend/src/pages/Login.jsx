/**
 * Login Page - Beautifully designed and perfectly responsive
 */
import React, { useState } from 'react';
import { useSEO } from '../utils/seo';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import MicrosoftAuthButton from '../components/MicrosoftAuthButton';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  useSEO({
    title: 'Sign In — Fish Mouth AI for Roofers',
    description: 'Access your AI-powered roofing lead generation dashboard. Book inspections, track hot leads, and grow revenue.',
    canonical: 'https://fishmouth.io/login',
    url: 'https://fishmouth.io/login',
    ogTitle: 'Sign In — Fish Mouth AI',
    ogDescription: 'Return to your AI-powered roofing dashboard.',
    ogImage: 'https://fishmouth.io/og-login.jpg'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login attempt with:', formData.email);

    try {
      const result = await login(formData.email, formData.password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful! User role:', result.user?.role);
        // Redirect based on user role
        if (result.user?.role === 'admin' || result.user?.role === 'superadmin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        console.error('Login failed:', result.error);
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <Link to="/" className="inline-block mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                🐟 Fish Mouth
              </h1>
            </Link>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Sign in to access your dashboard
            </p>
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
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
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
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
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base sm:text-lg"
            >
              {loading ? (
                <>
                  <div className="spinner border-white" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Social Login */}
          <div className="pt-2">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or continue with</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => document.querySelector('#gsi-click-proxy')?.click()}
                className="h-10 w-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50"
                aria-label="Sign in with Google"
                title="Sign in with Google"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.2-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16.1 18.8 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.1 4 9.1 8.5 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.3-5l-6.2-5.1C29.1 35.5 26.7 36 24 36c-5.2 0-9.7-3.5-11.3-8.4l-6.6 5.1C9 39.5 16 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.7-4.7 6.5-8.3 7.4l6.2 5.1C36.9 38.1 40 31.7 40 24c0-1.3-.1-2.2-.4-3.5z"/>
                </svg>
              </button>
              <MicrosoftAuthButton compact onSuccess={() => {}} />
            </div>
            {/* Hidden Google-rendered button as a proxy for compact icon click */}
            <div id="gsi-click-proxy" className="sr-only">
              <GoogleAuthButton onSuccess={() => {}} hidden width={1} size="medium" exposeController={(ctrl) => {
                // Map proxy click to open the Google auth
                const btn = document.querySelector('#gsi-click-proxy');
                if (btn) btn.addEventListener('click', ctrl.open);
              }} />
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                New to Fish Mouth?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center space-y-4">
            <Link
              to="/signup"
              className="block w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 text-base sm:text-lg"
            >
              Create Free Account
            </Link>
            <div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Forgot your password?</Link>
            </div>
            
            {/* Note for Admins */}
            <p className="text-sm text-gray-500 text-center">
              <Shield size={14} className="inline mr-1" />
              Admins: Use your admin email to access the admin dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Highlights (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight">
              AI-Powered Lead Generation
            </h2>
            <p className="text-blue-100 text-lg">
              AI finds homeowners with 15+ year roofs, qualifies them, and books your calendar.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">25 Free Leads</h3>
                <p className="text-blue-100">Get 25 quality leads to start fast</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">AI Analysis</h3>
                <p className="text-blue-100">Roof condition scoring powered by AI</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">14-Day Trial</h3>
                <p className="text-blue-100">Full access to all features</p>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="pt-8 border-t border-white/20">
            <p className="text-blue-100 text-sm">
              Trusted by roofing companies across North America
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
