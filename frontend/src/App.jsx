import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import CaseStudies from './pages/CaseStudies';
import ScanResults from './pages/ScanResults';
import ScanPage from './pages/ScanPage';
import EnhancedLeadDetailPage from './components/EnhancedLeadDetailPage';
import ComprehensiveBusinessSettings from './components/ComprehensiveBusinessSettings';
import SmartOnboardingAssistant from './components/SmartOnboardingAssistant';
import EnhancedReportsPage from './pages/EnhancedReportsPage';
import ReportPage from './pages/ReportPage';
import SharedReportPage from './pages/SharedReportPage';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import NotFound from './pages/NotFound';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import GDPR from './pages/GDPR';
import BillingTerms from './pages/BillingTerms';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  return user ? children : <Navigate to="/login" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  return user && (user.role === 'admin' || user.role === 'superadmin') 
    ? children 
    : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/case-studies" element={<CaseStudies />} />
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

          {/* User Dashboard (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />

          {/* Lead Detail Page (Protected) */}
          <Route
            path="/leads/:leadId"
            element={
              <ProtectedRoute>
                <EnhancedLeadDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Business Configuration (Protected) */}
          <Route
            path="/settings/business"
            element={
              <ProtectedRoute>
                <ComprehensiveBusinessSettings />
              </ProtectedRoute>
            }
          />

          {/* Enhanced Reports Page (Protected) */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <EnhancedReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Enhanced Reports Page with Lead (Protected) */}
          <Route
            path="/reports/:leadId"
            element={
              <ProtectedRoute>
                <EnhancedReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Report View Page (Protected) */}
          <Route
            path="/reports/view/:reportId"
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Report View (Public) */}
          <Route path="/reports/shared/:token" element={<SharedReportPage />} />

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
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
