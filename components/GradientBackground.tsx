// Lightweight animated gradient background using CSS only (no SVG blur filters)
// Much smoother on mobile devices
'use client';
import { useTheme } from './ThemeProvider';
import { memo } from 'react';

const GradientBackgroundComponent = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
      <div
        className="absolute rounded-full"
        style={{
          width: '60vmax',
          height: '60vmax',
          left: '-10%',
          top: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(30,64,175,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
          animation: 'gradFloat1 25s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '50vmax',
          height: '50vmax',
          right: '-5%',
          top: '-10%',
          background: isDark
            ? 'radial-gradient(circle, rgba(180,83,9,0.18) 0%, rgba(159,18,57,0.12) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(236,72,153,0.18) 50%, transparent 70%)',
          animation: 'gradFloat2 30s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '45vmax',
          height: '45vmax',
          right: '5%',
          bottom: '-5%',
          opacity: 0.6,
          background: isDark
            ? 'radial-gradient(circle, rgba(6,95,70,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
          animation: 'gradFloat3 20s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes gradFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, 15px); }
        }
        @keyframes gradFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -15px); }
        }
        @keyframes gradFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 10px); }
        }
      `}</style>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const GradientBackground = memo(GradientBackgroundComponent);
