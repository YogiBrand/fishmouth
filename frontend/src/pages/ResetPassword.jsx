import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSEO } from '../utils/seo';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useSEO({
    title: 'Set a new password — Fish Mouth',
    description: 'Securely update your password.',
    canonical: 'https://fishmouth.io/reset-password',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) throw new Error('Failed');
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (_) {
      setError('Invalid or expired reset link. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">🐟 Fish Mouth</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium">Sign In</Link>
          </div>
        </div>
      </nav>

      <header className="bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Set a New Password</h1>
          <p className="mt-3 text-gray-600 text-lg">Enter and confirm your new password below.</p>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"></div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {done ? (
            <div className="prose">
              <h2 className="!mt-0">Password updated</h2>
              <p>Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>
              )}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl shadow-lg transition"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}





