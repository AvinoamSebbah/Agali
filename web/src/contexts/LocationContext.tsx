'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface LocationContextType {
  selectedCity: string | null;
  setSelectedCity: (city: string) => void;
  cities: string[];
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [selectedCity, setSelectedCityState] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cities on mount
  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch('/api/cities');
        const data = await res.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    }
    fetchCities();
  }, []);

  // Load user's preferred city
  useEffect(() => {
    async function loadPreferredCity() {
      // Wait for session to be loaded
      if (status === 'loading') {
        return;
      }
      
      if (session?.user) {
        try {
          const res = await fetch('/api/user/preferences');
          const data = await res.json();
          if (data.preferences?.preferredCity) {
            setSelectedCityState(data.preferences.preferredCity);
          }
        } catch (error) {
          console.error('Failed to load preferences:', error);
        }
      } else {
        // Load from localStorage if not logged in
        const savedCity = localStorage.getItem('selectedCity');
        if (savedCity) {
          setSelectedCityState(savedCity);
        }
      }
      setIsLoading(false);
    }
    loadPreferredCity();
  }, [session, status]);

  const setSelectedCity = async (city: string) => {
    setSelectedCityState(city);
    
    // Save to localStorage for non-logged in users
    localStorage.setItem('selectedCity', city);
    
    // Save to preferences if user is logged in
    if (session?.user) {
      try {
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredCity: city }),
        });
      } catch (error) {
        console.error('Failed to save city preference:', error);
      }
    }
  };

  return (
    <LocationContext.Provider value={{ selectedCity, setSelectedCity, cities, isLoading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
