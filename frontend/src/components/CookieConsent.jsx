import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'fm_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
      } else {
        const parsed = JSON.parse(stored);
        setPrefs({ necessary: true, analytics: !!parsed.analytics, marketing: !!parsed.marketing });
      }
    } catch (_) {
      setVisible(true);
    }

    // expose a global helper so users can reopen preferences from the Cookies page
    try {
      window.fm_open_cookie_prefs = () => {
        setShowPrefs(true);
        setVisible(true);
      };
    } catch (_) {}
  }, []);

  const saveAndClose = (next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    setPrefs(next);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 z-[70]">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md flex-shrink-0">🍪</div>
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">We use cookies to improve your experience</p>
              <p>
                We use necessary cookies to run the site. We would also like to set optional analytics and marketing cookies to help us improve.
                Read our <Link to="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>.
              </p>
              {showPrefs && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-gray-200">
                    <input type="checkbox" checked readOnly className="rounded" />
                    <span className="text-gray-800 font-medium">Necessary</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      checked={prefs.analytics}
                      onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-gray-800 font-medium">Analytics</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      checked={prefs.marketing}
                      onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-gray-800 font-medium">Marketing</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
            <button
              onClick={() => saveAndClose({ necessary: true, analytics: true, marketing: true })}
              className="px-5 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow"
            >
              Accept all
            </button>
            <button
              onClick={() => saveAndClose({ necessary: true, analytics: false, marketing: false })}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
            >
              Reject non-essential
            </button>
            {!showPrefs ? (
              <button
                onClick={() => setShowPrefs(true)}
                className="px-5 py-2.5 rounded-xl font-semibold text-blue-700 hover:text-blue-800"
              >
                Manage preferences
              </button>
            ) : (
              <button
                onClick={() => saveAndClose(prefs)}
                className="px-5 py-2.5 rounded-xl font-semibold text-blue-700 hover:text-blue-800"
              >
                Save preferences
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


