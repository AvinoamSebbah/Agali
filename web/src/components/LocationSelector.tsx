'use client';

import { useState, useRef, useEffect } from 'react';
import { FiMapPin, FiChevronDown, FiSearch } from 'react-icons/fi';
import { useLocation } from '@/contexts/LocationContext';

export function LocationSelector() {
  const { selectedCity, setSelectedCity, cities, isLoading } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter cities based on search query
  const filteredCities = cities.filter(city => 
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
        <FiMapPin className="text-primary-600 dark:text-primary-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">טוען...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary-500 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 transition-all duration-200 min-w-[200px]"
      >
        <FiMapPin className="text-primary-600 dark:text-primary-400" size={20} />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1 text-right">
          {selectedCity || 'בחר עיר'}
        </span>
        <FiChevronDown 
          className={`text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          size={20}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <div className="relative">
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="חפש עיר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 transition-all"
              />
            </div>
          </div>

          {/* Cities List */}
          <div className="overflow-y-auto max-h-80 p-2">
            <button
              onClick={() => {
                setSelectedCity('');
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full text-right px-4 py-3 rounded-lg transition-all duration-200 ${
                !selectedCity
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              כל הערים
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-right px-4 py-3 rounded-lg transition-all duration-200 ${
                    selectedCity === city
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300 font-bold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {city}
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                לא נמצאו ערים
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
