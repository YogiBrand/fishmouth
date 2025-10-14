import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../utils/seo';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('pending');

  useSEO({
    title: 'Verify your email — Fish Mouth',
    description: 'Completing your email verification.',
    canonical: 'https://fishmouth.io/verify-email',
  });

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error('Failed');
        if (!canceled) setStatus('success');
      } catch (_) {
        if (!canceled) setStatus('error');
      }
    })();
    return () => { canceled = true; };
  }, [token]);

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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Email Verification</h1>
          <p className="mt-3 text-gray-600 text-lg">Were confirming your account.</p>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"></div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
          {status === 'pending' && (
            <p className="text-gray-600">Verifying your email…</p>
          )}
          {status === 'success' && (
            <div className="prose">
              <h2 className="!mt-0">Email verified</h2>
              <p>Your account is now active. You can sign in.</p>
              <p><Link to="/login" className="text-blue-600">Go to sign in</Link></p>
            </div>
          )}
          {status === 'error' && (
            <div className="prose">
              <h2 className="!mt-0">Verification failed</h2>
              <p>Your link is invalid or expired. Request a new one from your account or contact support.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}





