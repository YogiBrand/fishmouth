import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function MicrosoftAuthButton({ onSuccess, compact = true }) {
  const { loginWithMicrosoft } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    // We will use Microsoft OAuth 2.0 implicit id token via msal-browser if available
    // For minimal footprint, we lazily import msal-browser only when client ID is present
    const clientId = process.env.REACT_APP_MS_CLIENT_ID;
    if (!clientId) return;
    let msalInstance;
    (async () => {
      try {
        const msal = await import('@azure/msal-browser');
        msalInstance = new msal.PublicClientApplication({
          auth: {
            clientId,
            authority: 'https://login.microsoftonline.com/common',
            redirectUri: window.location.origin,
          },
          cache: { cacheLocation: 'localStorage' },
        });
        if (buttonRef.current) {
          // Render our own button
        }
      } catch (_) {}
    })();

    return () => {
      msalInstance = null;
    };
  }, []);

  const handleLogin = async () => {
    const clientId = process.env.REACT_APP_MS_CLIENT_ID;
    if (!clientId) return;
    try {
      const msal = await import('@azure/msal-browser');
      const msalInstance = new msal.PublicClientApplication({
        auth: { clientId, authority: 'https://login.microsoftonline.com/common', redirectUri: window.location.origin },
        cache: { cacheLocation: 'localStorage' },
      });
      const resp = await msalInstance.loginPopup({ scopes: ['openid', 'email', 'profile'] });
      const idToken = resp.idToken;
      const result = await loginWithMicrosoft(idToken);
      if (result?.success && typeof onSuccess === 'function') onSuccess(result);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('MS login failed', e);
    }
  };

  if (!process.env.REACT_APP_MS_CLIENT_ID) {
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
      ref={buttonRef}
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


