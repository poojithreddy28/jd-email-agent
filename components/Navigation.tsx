'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { memo, useState, useEffect } from 'react';

const Navigation = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    const closeMobileMenu = () => setMobileMenuOpen(false);
    closeMobileMenu();
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Email Generator' },
    { href: '/resume-tailor', label: 'Resume Tailor' },
    { href: '/whatsapp-monitor', label: 'WhatsApp Monitor' },
  ];
  
  return (
    <>
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 py-3 sm:py-4"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-full px-4 sm:px-6 py-2.5 shadow-lg transition-colors duration-300 w-full max-w-fit">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="text-sm sm:text-base font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap">
              Job Assist
            </Link>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1.5">
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    pathname === link.href 
                      ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <ThemeToggle />
              
              <Link 
                href="/signup"
                className="ml-1 px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5 group"
              >
                Get Started
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-2 ml-auto">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-16 left-3 right-3 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl p-4 md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      pathname === link.href 
                        ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                <Link 
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(Navigation);
