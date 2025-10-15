import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const APPLE_SCRIPT_SRC = 'https://appleid.apple.com/appleauth/auth.js';

const ensureAppleScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Apple login unavailable in this environment'));
  }

  if (window.AppleID && window.AppleID.auth) {
    return Promise.resolve(window.AppleID);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-apple-auth-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AppleID));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = APPLE_SCRIPT_SRC;
    script.async = true;
    script.dataset.appleAuthScript = 'true';
    script.onload = () => resolve(window.AppleID);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

export default function AppleAuthButton({ onSuccess, onError, compact = true, hidden = false, exposeController }) {
  const { loginWithApple } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const clientId = process.env.REACT_APP_APPLE_CLIENT_ID;
  const defaultRedirect = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = process.env.REACT_APP_APPLE_REDIRECT_URI || defaultRedirect;
  const scope = process.env.REACT_APP_APPLE_SCOPE || 'name email';
  const isAvailable = Boolean(clientId);

  const initializeApple = useCallback(async () => {
    if (!isAvailable) return false;
    try {
      await ensureAppleScript();
      if (!window.AppleID || !window.AppleID.auth) {
        throw new Error('AppleID auth not available');
      }
      window.AppleID.auth.init({
        clientId,
        scope,
        redirectURI: redirectUri,
        usePopup: true,
      });
      return true;
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err?.message || 'Apple login unavailable');
      }
      return false;
    }
  }, [clientId, isAvailable, onError, redirectUri, scope]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await initializeApple();
      if (!cancelled) setIsReady(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [initializeApple]);

  const open = useCallback(async () => {
    if (!isAvailable) {
      if (typeof onError === 'function') onError('Apple login unavailable');
      return;
    }
    try {
      const initialized = window.AppleID && window.AppleID.auth;
      if (!initialized) {
        const ok = await initializeApple();
        if (!ok) return;
      }
      const response = await window.AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;
      if (!idToken) {
        throw new Error('Apple did not return an identity token');
      }
      const result = await loginWithApple(idToken);
      if (result?.success) {
        if (typeof onSuccess === 'function') onSuccess(result);
      } else if (typeof onError === 'function') {
        onError(result?.error || 'Apple login failed');
      }
    } catch (err) {
      if (err?.error === 'user_cancelled') {
        if (typeof onError === 'function') onError('');
        return;
      }
      const errorMessage = err?.message || 'Apple login failed';
      if (typeof onError === 'function') {
        onError(errorMessage);
      }
    }
  }, [initializeApple, isAvailable, loginWithApple, onError, onSuccess]);

  useEffect(() => {
    if (typeof exposeController === 'function') {
      exposeController({ open, isReady: isReady && isAvailable, isAvailable });
    }
  }, [exposeController, open, isReady, isAvailable]);

  useEffect(() => {
    if (!isAvailable && typeof exposeController === 'function') {
      exposeController({ open: () => {}, isReady: false, isAvailable: false });
    }
  }, [isAvailable, exposeController]);

  if (!isAvailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-gray-100 text-gray-500 font-semibold py-3.5 rounded-xl border-2 border-gray-200 cursor-not-allowed"
        title="Apple login unavailable: missing client ID"
        style={hidden ? { display: 'none' } : undefined}
      >
        Continue with Apple
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center justify-center ${compact ? 'h-10 w-10 rounded-full' : 'w-full py-3.5 rounded-xl'} bg-white text-gray-900 font-semibold border-2 border-gray-200 hover:bg-gray-50`}
      style={hidden ? { display: 'none' } : undefined}
      title="Sign in with Apple"
      aria-label="Sign in with Apple"
      disabled={!isReady}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 17" className={`${compact ? 'h-5 w-5' : 'h-5 w-5'}`}>
        <path
          d="M13.499 13.013c-.349.806-.773 1.527-1.273 2.162-.671.87-1.214 1.471-1.632 1.805-.651.535-1.349.811-2.094.828-.536 0-1.182-.153-1.936-.458-.756-.305-1.449-.457-2.078-.457-.657 0-1.37.152-2.14.457-.77.305-1.392.466-1.867.484-.716.03-1.425-.248-2.125-.834C.061 16.78-.401 15.74-.293 14.45c.073-.895.323-1.828.752-2.8.43-.973.953-1.846 1.571-2.62.62-.774 1.116-1.306 1.492-1.597.597-.478 1.234-.721 1.911-.732.515 0 1.205.174 2.07.521.864.348 1.542.522 2.032.522.432 0 1.093-.188 1.985-.566.891-.378 1.642-.554 2.255-.53.188.002.413.041.674.119-.237.692-.537 1.368-.901 2.028l-.019.033c-.369.665-.788 1.27-1.256 1.814-.611.72-1.148 1.214-1.609 1.484-.613.358-1.271.533-1.974.521-.526 0-1.211-.179-2.052-.535-.842-.357-1.523-.535-2.044-.535-.52 0-1.178.178-1.974.535-.797.357-1.454.536-1.971.536-.696.033-1.376-.188-2.04-.666a5.592 5.592 0 00-.698-.437 15.46 15.46 0 011.714-3.273c.469-.795 1.02-1.438 1.652-1.93.634-.49 1.31-.746 2.027-.766.575 0 1.279.185 2.112.556.834.37 1.5.555 1.998.555.434 0 1.068-.181 1.903-.542.835-.361 1.509-.541 2.024-.537.437.002.889.089 1.353.259-.2.571-.525 1.29-.976 2.157z"
          fill="currentColor"
        />
      </svg>
      {!compact && <span className="ml-2">Continue with Apple</span>}
    </button>
  );
}
