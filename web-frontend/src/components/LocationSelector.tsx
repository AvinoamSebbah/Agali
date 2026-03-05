import { useState } from 'react';
import { FiMapPin, FiChevronDown } from 'react-icons/fi';

const ISRAELI_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'חולון',
  'רמת גן', 'אשקלון', 'רחובות', 'בת ים', 'כפר סבא',
  'הרצליה', 'מודיעין', 'נהריה', 'לוד', 'רמלה'
];

interface LocationSelectorProps {
  className?: string;
}

export default function LocationSelector({ className = '' }: LocationSelectorProps) {
  const [selectedCity, setSelectedCity] = useState('תל אביב');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCities = ISRAELI_CITIES.filter(city =>
    city.includes(searchQuery)
  );

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
      >
        <FiMapPin className="text-primary-600 dark:text-primary-400" />
        <span className="font-medium">{selectedCity}</span>
        <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <input
              type="text"
              placeholder="חפש עיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCities.map((city) => (
              <button
                key={city}
                onClick={() => handleSelect(city)}
                className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                  city === selectedCity ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'
                }`}
              >
                {city}
              </button>
            ))}
            {filteredCities.length === 0 && (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                לא נמצאו ערים
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
