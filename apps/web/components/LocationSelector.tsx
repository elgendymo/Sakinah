"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { toUserMessage } from '@/lib/ui/errorUtils';

interface Location {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface LocationSelectorProps {
  onLocationSelect: (location: Location) => void;
  currentLocation?: Location;
}

// Popular Islamic cities for quick selection
const popularCities: Location[] = [
  { city: 'Mecca', country: 'Saudi Arabia', latitude: 21.3891, longitude: 39.8579, timezone: 'Asia/Riyadh' },
  { city: 'Medina', country: 'Saudi Arabia', latitude: 24.5247, longitude: 39.5692, timezone: 'Asia/Riyadh' },
  { city: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
  { city: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul' },
  { city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { city: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { city: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin' },
  { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { city: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
];

export function LocationSelector({ onLocationSelect, currentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCities, setFilteredCities] = useState(popularCities);
  const [customLocation, setCustomLocation] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const filtered = popularCities.filter(city =>
        city.city.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query)
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(popularCities);
    }
  }, [searchQuery]);

  const handleCitySelect = (location: Location) => {
    onLocationSelect(location);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomLocation = async () => {
    if (!customLocation) return;

    setLoading(true);
    setError('');

    try {
      // For now, we'll use a simple geocoding API or default to coordinates
      // In production, you'd use Google Geocoding API
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customLocation)}`);

      if (!response.ok) {
        throw new Error(`Failed to find location: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data[0]) {
        const result = data[0];
        const location: Location = {
          city: customLocation.split(',')[0].trim(),
          country: customLocation.includes(',') ? customLocation.split(',')[1].trim() : '',
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        handleCitySelect(location);
        setCustomLocation('');
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (error) {
      const userMessage = toUserMessage(error, 'Unable to find location. Please check your internet connection and try again.');
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600
                   text-white hover:bg-emerald-700 transition-all duration-fast
                   shadow-md border border-emerald-500"
      >
        <MapPin className="h-4 w-4" />
        <span className="text-sm font-medium">
          {currentLocation ? `${currentLocation.city}, ${currentLocation.country}` : 'Set Location'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-2xl z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Select Location</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredCities.map((city) => (
              <button
                key={`${city.city}-${city.country}`}
                onClick={() => handleCitySelect(city)}
                className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors
                         flex items-center justify-between group"
              >
                <div>
                  <div className="font-medium text-gray-900">{city.city}</div>
                  <div className="text-sm text-gray-500">{city.country}</div>
                </div>
                {currentLocation?.city === city.city && (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            {/* Error Display */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
                <button
                  onClick={() => setError('')}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter custom city, country"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleCustomLocation()}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/20
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleCustomLocation}
                disabled={loading || !customLocation.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm
                         hover:bg-emerald-700 transition-colors
                         disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Finding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}