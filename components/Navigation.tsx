'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { memo } from 'react';

const Navigation = () => {
  const pathname = usePathname();
  
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-6 py-4"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-full px-6 py-2.5 shadow-lg transition-colors duration-300">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Job Assist
          </Link>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          
          <div className="flex items-center gap-1.5">
            <Link 
              href="/"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                pathname === '/' 
                  ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
            >
              Email Generator
            </Link>
            
            <Link 
              href="/resume-tailor"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                pathname === '/resume-tailor' 
                  ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
            >
              Resume Tailor
            </Link>
            
            <Link 
              href="/whatsapp-monitor"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                pathname === '/whatsapp-monitor' 
                  ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
            >
              WhatsApp Monitor
            </Link>
            
            <ThemeToggle />
            
            <Link 
              href="/signup"
              className="ml-1 px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5 group"
            >
              Get Started
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default memo(Navigation);
