'use client';

import React from 'react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m2.829 2.829L9 21.001M4.929 4.929A2.828 2.828 0 001.636 7.05L12 17.414l10.364-10.364a2.828 2.828 0 00-4-4L12 9.636 5.636 3.272a2.828 2.828 0 00-4 4z" />
            </svg>
          </div>
        </div>

        {/* Offline Message */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            You're Offline
          </h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            Don't worry - Sakinah works offline too! Your spiritual journey continues even without an internet connection.
          </p>

          {/* What works offline */}
          <div className="text-left mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">What you can do offline:</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="text-emerald-500 mr-2">✓</span>
                Track your daily habits
              </li>
              <li className="flex items-center">
                <span className="text-emerald-500 mr-2">✓</span>
                Write journal entries
              </li>
              <li className="flex items-center">
                <span className="text-emerald-500 mr-2">✓</span>
                Complete daily check-ins
              </li>
              <li className="flex items-center">
                <span className="text-emerald-500 mr-2">✓</span>
                View saved content
              </li>
            </ul>
          </div>

          {/* Spiritual reminder */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <p className="text-sm text-emerald-700 italic text-center">
              "And it is He who sends down rain from heaven, and We produce thereby the vegetation of every kind."
            </p>
            <p className="text-xs text-emerald-600 text-center mt-1">— Quran 6:99</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Try Again
            </button>

            <a
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
            >
              Continue Offline
            </a>
          </div>

          {/* Sync notice */}
          <p className="text-xs text-gray-500 mt-4">
            Your data will automatically sync when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
}