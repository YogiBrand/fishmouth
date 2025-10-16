import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MarketingHome from './pages/marketing/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import ScanResults from './pages/ScanResults';
import ComprehensiveBusinessSettings from './components/ComprehensiveBusinessSettings';
import SmartOnboardingAssistant from './components/SmartOnboardingAssistant';
import EnhancedReportsPage from './pages/EnhancedReportsPage';
import ReportPage from './pages/ReportPage';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import { HelpAssistantProvider } from './components/HelpAssistant/HelpAssistantContext';
import HelpAssistant from './components/HelpAssistant/HelpAssistant';
import NotFound from './pages/NotFound';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import GDPR from './pages/GDPR';
import BillingTerms from './pages/BillingTerms';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import MarketingFeatures from './pages/marketing/Features';
import MarketingPricing from './pages/marketing/Pricing';
import MarketingTestimonials from './pages/marketing/Testimonials';
import MarketingCaseStudies from './pages/marketing/CaseStudies';
import MarketingFAQ from './pages/marketing/FAQ';
import MarketingContact from './pages/marketing/Contact';
import MarketingIntegrations from './pages/marketing/Integrations';
import MarketingDemo from './pages/marketing/Demo';
import HeatClusterDetail from './pages/HeatClusterDetail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.is_admin
    ? children 
    : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
        <HelpAssistantProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MarketingHome />} />
          <Route path="/features" element={<MarketingFeatures />} />
          <Route path="/pricing" element={<MarketingPricing />} />
          <Route path="/testimonials" element={<MarketingTestimonials />} />
          <Route path="/case-studies" element={<MarketingCaseStudies />} />
          <Route path="/faq" element={<MarketingFAQ />} />
          <Route path="/contact" element={<MarketingContact />} />
          <Route path="/integrations" element={<MarketingIntegrations />} />
          <Route path="/demo" element={<MarketingDemo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Auth Utilities */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Legal */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/gdpr" element={<GDPR />} />
          <Route path="/billing-terms" element={<BillingTerms />} />

          <Route
            path="/scan/:scanId/results"
            element={
              <ProtectedRoute>
                <ScanResults />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clusters/:clusterId"
            element={
              <ProtectedRoute>
                <HeatClusterDetail />
              </ProtectedRoute>
            }
          />

          {/* User Dashboard (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Reports (Protected) */}
          <Route
            path="/reports/:reportId"
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <EnhancedReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Business Settings (Protected) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ComprehensiveBusinessSettings />
              </ProtectedRoute>
            }
          />

          {/* Smart Onboarding (Protected) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <SmartOnboardingAssistant />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsent />
        <HelpAssistant />
        </HelpAssistantProvider>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
