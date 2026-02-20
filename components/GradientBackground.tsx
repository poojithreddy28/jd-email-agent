// Animated gradient background component used across all pages
// Adapts colors based on theme - brighter in light mode, darker/muted in dark mode
'use client';
import { useTheme } from './ThemeProvider';
import { memo } from 'react';

const GradientBackgroundComponent = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <>
      <style>
        {` 
          @keyframes float1 { 
            0% { transform: translate(0, 0) scale(1); } 
            50% { transform: translate(-20px, 20px) scale(1.1); } 
            100% { transform: translate(0, 0) scale(1); } 
          } 
          @keyframes float2 { 
            0% { transform: translate(0, 0) scale(1); } 
            50% { transform: translate(20px, -20px) scale(1.05); } 
            100% { transform: translate(0, 0) scale(1); } 
          }
          @keyframes float3 { 
            0% { transform: translate(0, 0) rotate(0deg); } 
            50% { transform: translate(-15px, 15px) rotate(5deg); } 
            100% { transform: translate(0, 0) rotate(0deg); } 
          }
        `}
      </style>
      <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="absolute top-0 left-0 w-full h-full will-change-transform" style={{ transform: 'translateZ(0)' }}>
        <defs>
          {/* Light mode gradients - brighter colors */}
          <linearGradient id="grad1-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.4}} />
            <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0.3}} />
          </linearGradient>
          <linearGradient id="grad2-light" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor: '#f59e0b', stopOpacity: 0.5}} />
            <stop offset="50%" style={{stopColor: '#ef4444', stopOpacity: 0.4}} />
            <stop offset="100%" style={{stopColor: '#ec4899', stopOpacity: 0.3}} />
          </linearGradient>
          <radialGradient id="grad3-light" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.4}} />
            <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 0.2}} />
          </radialGradient>
          
          {/* Dark mode gradients - darker, more muted colors */}
          <linearGradient id="grad1-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#1e40af', stopOpacity: 0.25}} />
            <stop offset="100%" style={{stopColor: '#5b21b6', stopOpacity: 0.2}} />
          </linearGradient>
          <linearGradient id="grad2-dark" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor: '#b45309', stopOpacity: 0.3}} />
            <stop offset="50%" style={{stopColor: '#991b1b', stopOpacity: 0.25}} />
            <stop offset="100%" style={{stopColor: '#9f1239', stopOpacity: 0.2}} />
          </linearGradient>
          <radialGradient id="grad3-dark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{stopColor: '#065f46', stopOpacity: 0.25}} />
            <stop offset="100%" style={{stopColor: '#0e7490', stopOpacity: 0.15}} />
          </radialGradient>
          
          <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="60"/>
          </filter>
          <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="40"/>
          </filter>
          <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="50"/>
          </filter>
        </defs>
        <g style={{ animation: 'float1 25s ease-in-out infinite', willChange: 'transform' }}>
          <ellipse cx="150" cy="450" rx="300" ry="250" fill={isDark ? "url(#grad1-dark)" : "url(#grad1-light)"} filter="url(#blur1)" />
        </g>
        <g style={{ animation: 'float2 30s ease-in-out infinite', willChange: 'transform' }}>
          <circle cx="650" cy="150" r="200" fill={isDark ? "url(#grad2-dark)" : "url(#grad2-light)"} filter="url(#blur2)" />
        </g>
        <g style={{ animation: 'float3 20s ease-in-out infinite', willChange: 'transform' }}>
          <ellipse cx="700" cy="500" rx="200" ry="180" fill={isDark ? "url(#grad3-dark)" : "url(#grad3-light)"} filter="url(#blur3)" opacity="0.6"/>
        </g>
      </svg>
    </>
  );
};

// Memoize to prevent unnecessary re-renders
export const GradientBackground = memo(GradientBackgroundComponent);
