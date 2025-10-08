'use client';

import { useEffect, useState } from 'react';

export default function AuthDebugger() {
  const [authInfo, setAuthInfo] = useState<{
    cookies: string;
    localStorage: Record<string, string>;
    isDev: boolean;
  }>({
    cookies: '',
    localStorage: {},
    isDev: false
  });

  useEffect(() => {
    const updateAuthInfo = () => {
      const cookies = document.cookie;
      const localStorageData: Record<string, string> = {};

      // Get relevant items from localStorage
      ['accessToken', 'refreshToken'].forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          localStorageData[key] = value;
        }
      });

      const isDev = process.env.NODE_ENV === 'development' &&
                    process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true';

      setAuthInfo({
        cookies,
        localStorage: localStorageData,
        isDev
      });
    };

    updateAuthInfo();

    // Update on storage changes
    window.addEventListener('storage', updateAuthInfo);

    // Update periodically
    const interval = setInterval(updateAuthInfo, 1000);

    return () => {
      window.removeEventListener('storage', updateAuthInfo);
      clearInterval(interval);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1">
        <div><strong>Dev Mode:</strong> {authInfo.isDev ? 'Yes' : 'No'}</div>
        <div><strong>Cookies:</strong> {authInfo.cookies || 'None'}</div>
        <div><strong>LocalStorage:</strong></div>
        <div className="ml-2">
          {Object.keys(authInfo.localStorage).length > 0
            ? Object.entries(authInfo.localStorage).map(([key, value]) => (
                <div key={key}>{key}: {value.substring(0, 20)}...</div>
              ))
            : 'None'
          }
        </div>
      </div>
    </div>
  );
}