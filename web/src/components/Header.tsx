'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Logo } from '@/components/Logo';
import { LocationSelector } from '@/components/LocationSelector';
import { FiLogOut, FiMoon, FiSun, FiUser } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeaderProps {
  showLocation?: boolean;
}

export function Header({ showLocation = false }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Sign Out Button */}
          <div className="flex-1 flex justify-start">
            {session && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              >
                <FiLogOut size={20} />
                <span className="hidden sm:inline">התנתק</span>
              </button>
            )}
          </div>

          {/* Center - Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Logo size={50} />
            </motion.div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">עגלי</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">חסכו בקניות שלכם</p>
            </div>
          </Link>

          {/* Right Side - User Info or Location & Theme Toggle */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <FiMoon size={20} className="text-gray-700 dark:text-gray-300" />
                ) : (
                  <FiSun size={20} className="text-yellow-500" />
                )}
              </button>
            )}

            {showLocation && <LocationSelector />}
            
            {session && !showLocation && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-700 transition-all duration-200"
              >
                <FiUser size={18} />
                <span className="hidden sm:inline">שלום, {session.user.name}</span>
                <span className="sm:hidden">חשבון</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
