"use client";
 
import { SunIcon as Sunburst } from "lucide-react";
import { useState } from "react";
import { useTheme } from '../ThemeProvider';

// Animated gradient background component
const GradientBackground = () => {
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
    <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="absolute top-0 left-0 w-full h-full">
      <defs>
        {/* Light mode gradients - brighter colors */}
        <linearGradient id="grad1-light-login" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.4}} />
          <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0.3}} />
        </linearGradient>
        <linearGradient id="grad2-light-login" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor: '#f59e0b', stopOpacity: 0.5}} />
          <stop offset="50%" style={{stopColor: '#ef4444', stopOpacity: 0.4}} />
          <stop offset="100%" style={{stopColor: '#ec4899', stopOpacity: 0.3}} />
        </linearGradient>
        <radialGradient id="grad3-light-login" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.4}} />
          <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 0.2}} />
        </radialGradient>
        
        {/* Dark mode gradients - darker, more muted colors */}
        <linearGradient id="grad1-dark-login" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#1e40af', stopOpacity: 0.25}} />
          <stop offset="100%" style={{stopColor: '#5b21b6', stopOpacity: 0.2}} />
        </linearGradient>
        <linearGradient id="grad2-dark-login" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor: '#b45309', stopOpacity: 0.3}} />
          <stop offset="50%" style={{stopColor: '#991b1b', stopOpacity: 0.25}} />
          <stop offset="100%" style={{stopColor: '#9f1239', stopOpacity: 0.2}} />
        </linearGradient>
        <radialGradient id="grad3-dark-login" cx="50%" cy="50%" r="50%">
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
      <g style={{ animation: 'float1 25s ease-in-out infinite' }}>
        <ellipse cx="150" cy="450" rx="300" ry="250" fill={isDark ? "url(#grad1-dark-login)" : "url(#grad1-light-login)"} filter="url(#blur1)" />
      </g>
      <g style={{ animation: 'float2 30s ease-in-out infinite' }}>
        <circle cx="650" cy="150" r="200" fill={isDark ? "url(#grad2-dark-login)" : "url(#grad2-light-login)"} filter="url(#blur2)" />
      </g>
      <g style={{ animation: 'float3 20s ease-in-out infinite' }}>
        <ellipse cx="700" cy="500" rx="200" ry="180" fill={isDark ? "url(#grad3-dark-login)" : "url(#grad3-light-login)"} filter="url(#blur3)" opacity="0.6"/>
      </g>
    </svg>
  </>
  );
};
 
export const FullScreenLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
 
  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };
 
  const validatePassword = (value: string) => {
    return value.length >= 6;
  };
 
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
 
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }
 
    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }
 
    if (valid) {
      // Login logic goes here
      console.log("Login submitted!");
      console.log("Email:", email);
      alert("Login successful!");
      setEmail("");
      setPassword("");
    }
  };
 
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden p-4 bg-background dark:bg-gray-900 relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>
      
      <div className="w-full relative max-w-5xl overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-3xl z-10 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8 md:p-12 md:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600/10 via-transparent to-gray-500/10"></div>
          <h1 className="text-2xl md:text-3xl font-medium leading-tight z-10 tracking-tight relative">
            Your AI-powered job application assistant
          </h1>
          <p className="mt-4 text-gray-300 text-sm relative z-10">
            Streamline your job search with intelligent email generation, resume tailoring, and WhatsApp monitoring.
          </p>
        </div>
 
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-900 dark:text-white relative">
          <div className="flex flex-col items-left mb-8">
            <div className="text-gray-900 dark:text-white mb-4">
              <Sunburst className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-medium mb-2 tracking-tight dark:text-white">
              Welcome Back
            </h2>
            <p className="text-left opacity-80 dark:text-gray-300">
              Login to continue to Job Assist
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-all hover:shadow-md flex items-center justify-center gap-3 mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.879 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4"/>
              <path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9465L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853"/>
              <path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0.000976562 8.36008 0.000976562 9.96565C0.000976562 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05"/>
              <path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33717L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-2 my-4">
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">OR</span>
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
          </div>
 
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label htmlFor="email" className="block text-sm mb-2 font-medium dark:text-gray-300">
                Your email
              </label>
              <input
                type="email"
                id="email"
                placeholder="your@email.com"
                className={`text-sm w-full py-3 px-4 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-gray-400 focus:ring-gray-900 dark:focus:ring-gray-500 transition-all ${
                  emailError ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby="email-error"
              />
              {emailError && (
                <p id="email-error" className="text-red-500 dark:text-red-400 text-xs mt-1">
                  {emailError}
                </p>
              )}
            </div>
 
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium dark:text-gray-300">
                  Password
                </label>
                <a href="#" className="text-xs text-gray-900 dark:text-blue-400 hover:text-gray-700 dark:hover:text-blue-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                className={`text-sm w-full py-3 px-4 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-gray-400 focus:ring-gray-900 dark:focus:ring-gray-500 transition-all ${
                  passwordError ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                aria-describedby="password-error"
              />
              {passwordError && (
                <p id="password-error" className="text-red-500 dark:text-red-400 text-xs mt-1">
                  {passwordError}
                </p>
              )}
            </div>
 
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium py-3 px-4 rounded-lg transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              Login to your account
            </button>
 
            <div className="text-center text-gray-600 dark:text-gray-300 text-sm mt-2">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-gray-900 dark:text-blue-400 hover:text-gray-700 dark:hover:text-blue-300 font-medium transition-colors">
                Sign up
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
