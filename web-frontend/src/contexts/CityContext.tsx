import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface CityContextType {
    city: string;
    setCity: (city: string) => void;
}

const CityContext = createContext<CityContextType>({
    city: 'תל אביב',
    setCity: () => { },
});

export const useCity = () => useContext(CityContext);

export const CityProvider = ({ children }: { children: ReactNode }) => {
    const [city, setCity] = useState<string>(
        localStorage.getItem('selectedCity') || 'תל אביב'
    );

    const handleSetCity = (newCity: string) => {
        setCity(newCity);
        localStorage.setItem('selectedCity', newCity);
    };

    return (
        <CityContext.Provider value={{ city, setCity: handleSetCity }}>
            {children}
        </CityContext.Provider>
    );
};
