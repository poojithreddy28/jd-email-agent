'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Job Assist
          </Link>
          
          <div className="flex items-center gap-8">
            <Link 
              href="/"
              className="relative text-sm font-medium transition-colors hover:text-gray-900 dark:hover:text-gray-100"
            >
              <span className={pathname === '/' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}>
                Email Generator
              </span>
              {pathname === '/' && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
            
            <Link 
              href="/resume-tailor"
              className="relative text-sm font-medium transition-colors hover:text-gray-900 dark:hover:text-gray-100"
            >
              <span className={pathname === '/resume-tailor' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}>
                Resume Tailor
              </span>
              {pathname === '/resume-tailor' && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
            
            <Link 
              href="/whatsapp-monitor"
              className="relative text-sm font-medium transition-colors hover:text-gray-900 dark:hover:text-gray-100"
            >
              <span className={pathname === '/whatsapp-monitor' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}>
                WhatsApp Monitor
              </span>
              {pathname === '/whatsapp-monitor' && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
