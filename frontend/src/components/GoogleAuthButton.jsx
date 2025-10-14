import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function GoogleAuthButton({ onSuccess, exposeController, hidden = false, width = 180, size = 'medium' }) {
  const buttonRef = useRef(null);
  const internalButtonRef = useRef(null);
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const ensureScript = () => new Promise((resolve) => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });

    ensureScript().then(() => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const result = await loginWithGoogle(response.credential);
            if (result?.success) {
              if (typeof onSuccess === 'function') onSuccess(result);
            }
          } catch (_) {}
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });

      if (buttonRef.current) {
        try {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size,
            shape: 'pill',
            width,
            text: 'continue_with',
            logo_alignment: 'left',
          });
          internalButtonRef.current = buttonRef.current.querySelector('div[role="button"], button');
        } catch (_) {}
      }

      if (typeof exposeController === 'function') {
        exposeController({
          open: () => {
            try {
              if (internalButtonRef.current) internalButtonRef.current.click();
            } catch (_) {}
          },
        });
      }
    });
  }, [loginWithGoogle, exposeController, width, size]);

  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-gray-100 text-gray-500 font-semibold py-3.5 rounded-xl border-2 border-gray-200 cursor-not-allowed"
        title="Google login unavailable: missing client ID"
      >
        Continue with Google
      </button>
    );
  }

  return (
    <div className="flex justify-center" style={hidden ? { display: 'none' } : undefined}>
      <div ref={buttonRef} />
    </div>
  );
}


