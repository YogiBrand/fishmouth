import React, { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function MicrosoftAuthButton({
  onSuccess,
  onError,
  compact = true,
  hidden = false,
  exposeController,
}) {
  const { loginWithMicrosoft } = useAuth();
  const isAvailable = Boolean(process.env.REACT_APP_MS_CLIENT_ID);

  const handleLogin = useCallback(async () => {
    const clientId = process.env.REACT_APP_MS_CLIENT_ID;
    if (!clientId) {
      if (typeof onError === 'function') onError('Microsoft login unavailable');
      return;
    }
    try {
      const msal = await import('@azure/msal-browser');
      const msalInstance = new msal.PublicClientApplication({
        auth: { clientId, authority: 'https://login.microsoftonline.com/common', redirectUri: window.location.origin },
        cache: { cacheLocation: 'localStorage' },
      });
      const resp = await msalInstance.loginPopup({ scopes: ['openid', 'email', 'profile'] });
      const idToken = resp.idToken;
      const result = await loginWithMicrosoft(idToken);
      if (result?.success) {
        if (typeof onSuccess === 'function') onSuccess(result);
      } else if (typeof onError === 'function') {
        onError(result?.error || 'Microsoft login failed');
      }
    } catch (e) {
      if (e?.errorCode === 'user_cancelled' || e?.errorMessage === 'user_cancelled') {
        if (typeof onError === 'function') onError('');
        return;
      }
      if (typeof onError === 'function') onError(e?.message || 'Microsoft login failed');
    }
  }, [loginWithMicrosoft, onSuccess, onError]);

  useEffect(() => {
    if (typeof exposeController === 'function') {
      exposeController({ open: handleLogin, isReady: isAvailable, isAvailable });
    }
  }, [exposeController, handleLogin, isAvailable]);

  if (hidden) {
    return null;
  }

  if (!isAvailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-gray-100 text-gray-500 font-semibold py-3.5 rounded-xl border-2 border-gray-200 cursor-not-allowed"
        title="Microsoft login unavailable: missing client ID"
      >
        Continue with Microsoft
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className={`inline-flex items-center justify-center ${compact ? 'h-10 w-10 rounded-full' : 'w-full py-3.5 rounded-xl'} bg-white text-gray-800 font-semibold border-2 border-gray-200 hover:bg-gray-50`}
      title="Sign in with Microsoft"
      aria-label="Sign in with Microsoft"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" className={`${compact ? 'h-5 w-5' : 'h-5 w-5'}`}>
        <path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#80ba01" d="M12 1h10v10H12z"/><path fill="#02a4ef" d="M1 12h10v10H1z"/><path fill="#ffb902" d="M12 12h10v10H12z"/>
      </svg>
      {!compact && <span className="ml-2">Continue with Microsoft</span>}
    </button>
  );
}
