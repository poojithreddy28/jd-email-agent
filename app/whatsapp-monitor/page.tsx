'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Check, Power, Clock, Search, Upload, X, Copy, Mail, RefreshCw } from 'lucide-react';
import { GradientBackground } from '@/components/GradientBackground';

interface JobMessage {
  id: string;
  message: string;
  detectedAt: string;
  sender: string;
  recruiterEmail?: string;
  emailSent: boolean;
  generatedEmail?: {
    subject: string;
    body: string;
  };
}

interface EmailFormData {
  name: string;
  email: string;
  phone: string;
  resume: File | null;
}

export default function WhatsAppMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [timeRange, setTimeRange] = useState<5 | 15 | 30 | 60 | 120 | 360>(60); // minutes
  
  // Email generation state
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [sendingFor, setSendingFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailFormData>({
    name: 'Poojith Reddy A',
    email: 'poojithreddy.se@gmail.com',
    phone: '+1 (312) 536-9779',
    resume: null
  });
  const [activeAccount, setActiveAccount] = useState<'se' | 'dev'>('se');

  const EMAIL_ACCOUNTS = {
    se: { email: 'poojithreddy.se@gmail.com', label: 'SE Mail' },
    dev: { email: 'poojithreddy.dev@gmail.com', label: 'Dev Mail' },
  };

  const switchAccount = (account: 'se' | 'dev') => {
    setActiveAccount(account);
    setEmailForm(prev => ({ ...prev, email: EMAIL_ACCOUNTS[account].email }));
  };

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Poll for connection status when QR code is shown
  useEffect(() => {
    if (qrCode && !isConnected) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/whatsapp/status');
          if (response.ok) {
            const data = await response.json();
            if (data.connected) {
              setIsConnected(true);
              setQrCode('');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [qrCode, isConnected]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const connectWhatsApp = async () => {
    setLoading(true);
    setError('');
    
    try {
      let attempts = 0;
      const maxAttempts = 15; // 15 attempts = 30 seconds max
      
      while (attempts < maxAttempts) {
        const response = await fetch('/api/whatsapp/connect', {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to connect');
        
        const data = await response.json();
        
        if (data.connected) {
          // Successfully connected
          setIsConnected(true);
          setQrCode('');
          setLoading(false);
          return;
        } else if (data.needsQR) {
          // QR code needs to be scanned
          setQrCode(data.qrCode);
          setIsConnected(false);
          setLoading(false);
          return;
        } else if (data.message?.includes('Generating QR code') || data.message?.includes('initializing')) {
          // Still initializing, wait and try again
          setError(`Initializing... (${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        } else {
          // Some other state
          setError(data.message || 'Waiting for connection...');
          setLoading(false);
          return;
        }
      }
      
      // Max attempts reached
      setError('Connection timeout. Please try again.');
      setLoading(false);
    } catch (err) {
      setError('Error connecting to WhatsApp: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
    }
  };

  const searchMessages = async () => {
    if (!contactName.trim()) {
      setError('Please enter a contact name to search');
      return;
    }

    setSearching(true);
    setError('');
    setMessages([]);
    
    try {
      const response = await fetch('/api/whatsapp/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactName: contactName.trim(),
          timeRangeMinutes: timeRange 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search messages');
      }
      
      setMessages(data.messages || []);
      
      if (data.messages.length === 0) {
        const timeDisplay = timeRange >= 60 ? `${timeRange / 60} hour(s)` : `${timeRange} minute(s)`;
        setError(`No job requirements found in the last ${timeDisplay} from "${contactName}". Try increasing the time range or checking the contact name.`);
      }
    } catch (err) {
      setError('Error searching messages: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSearching(false);
    }
  };

  const generateEmail = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    setGeneratingFor(messageId);
    setError('');

    try {
      const formData = new FormData();
      formData.append('jd', message.message);
      formData.append('name', emailForm.name);
      formData.append('email', emailForm.email);
      formData.append('phone', emailForm.phone);
      if (emailForm.resume) {
        formData.append('resume', emailForm.resume);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to generate email');
      
      const emailData = await response.json();
      
      // Update message with generated email
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { 
          ...msg, 
          generatedEmail: emailData,
          recruiterEmail: emailData.recipientEmail || msg.recruiterEmail
        } : msg
      ));
    } catch (err) {
      setError('Failed to generate email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateAllEmails = async () => {
    const messagesToGenerate = messages.filter(msg => !msg.generatedEmail && !msg.emailSent);
    if (messagesToGenerate.length === 0) return;

    setGeneratingAll(true);
    setError('');

    for (const message of messagesToGenerate) {
      await generateEmail(message.id);
      // Small delay between generations to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setGeneratingAll(false);
  };

  const sendEmail = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.generatedEmail) return;

    if (!message.recruiterEmail?.trim()) {
      setError('Please enter recipient email address');
      return;
    }

    setSendingFor(messageId);
    setError('');

    try {
      const formData = new FormData();
      formData.append('to', message.recruiterEmail);
      formData.append('subject', message.generatedEmail.subject);
      formData.append('body', message.generatedEmail.body);
      formData.append('fromName', emailForm.name);
      formData.append('fromEmail', emailForm.email);
      formData.append('account', activeAccount);
      if (emailForm.resume) {
        formData.append('resume', emailForm.resume);
      } else {
        formData.append('useDefaultResume', 'true');
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send email');

      // Mark as sent
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, emailSent: true } : msg
      ));
    } catch (err) {
      setError('Failed to send email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSendingFor(null);
    }
  };

  const updateRecipientEmail = (messageId: string, email: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, recruiterEmail: email } : msg
    ));
  };

  const updateGeneratedEmail = (messageId: string, field: 'subject' | 'body', value: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId && msg.generatedEmail
        ? { ...msg, generatedEmail: { ...msg.generatedEmail, [field]: value } }
        : msg
    ));
  };

  const copyEmail = (message: JobMessage) => {
    if (!message.generatedEmail) return;
    const text = `Subject: ${message.generatedEmail.subject}\n\n${message.generatedEmail.body}`;
    navigator.clipboard.writeText(text);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden pt-16 sm:pt-20 transition-colors duration-300">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              WhatsApp AI Agent
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatically detect job opportunities and generate personalized emails with AI
          </p>
        </motion.div>

        {/* Connection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/95 dark:bg-gray-800/95 sm:backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4 sm:mb-5 shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {isConnected ? 'Connected' : 'Not Connected'}
                </h2>
                {isConnected && contactName && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Ready to search: {contactName}
                  </p>
                )}
              </div>
            </div>
            
            {!isConnected && (
              <motion.button
                onClick={connectWhatsApp}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Power className="w-3 h-3 mr-2" />
                    Connect WhatsApp
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Search interface */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 mt-5 pt-5 border-t border-gray-200 dark:border-gray-700"
            >
              {/* Email Account Switcher */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Send From Account
                </label>
                <div className="flex flex-col sm:inline-flex sm:flex-row bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1 sm:gap-0">
                  <button
                    onClick={() => switchAccount('se')}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeAccount === 'se'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate text-[11px] sm:text-xs">poojithreddy.se@gmail.com</span>
                  </button>
                  <button
                    onClick={() => switchAccount('dev')}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeAccount === 'dev'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate text-[11px] sm:text-xs">poojithreddy.dev@gmail.com</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact/Group Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter contact or group name"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Enter the exact name (e.g., &quot;PraneethTechVector&quot;)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Search messages from the last:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { value: 5, label: '5 mins' },
                    { value: 15, label: '15 mins' },
                    { value: 30, label: '30 mins' },
                    { value: 60, label: '1 hour' },
                    { value: 120, label: '2 hours' },
                    { value: 360, label: '6 hours' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimeRange(option.value as 5 | 15 | 30 | 60 | 120 | 360)}
                      className={`px-2 sm:px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center ${
                        timeRange === option.value
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={searchMessages}
                disabled={searching || !contactName.trim()}
                whileHover={{ scale: searching ? 1 : 1.02 }}
                whileTap={{ scale: searching ? 1 : 0.98 }}
                className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {searching ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3 mr-2" />
                    Search Messages
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* QR Code */}
          <AnimatePresence>
            {qrCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-4">
                  Scan QR Code with WhatsApp
                </p>
                <div className="inline-block p-4 bg-white rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                </div>
                <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  Open WhatsApp → Settings → Linked Devices → Link a Device
                </p>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ●
                  </motion.span>
                  Waiting for scan...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Results */}
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 p-4 bg-white/95 dark:bg-gray-800/95 sm:backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Found Job Requirements
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {messages.length} {messages.length === 1 ? 'opportunity' : 'opportunities'} found
                </p>
              </div>
              
              {messages.some(msg => !msg.generatedEmail && !msg.emailSent) && (
                <motion.button
                  onClick={generateAllEmails}
                  disabled={generatingAll || generatingFor !== null}
                  whileHover={{ scale: generatingAll || generatingFor !== null ? 1 : 1.02 }}
                  whileTap={{ scale: generatingAll || generatingFor !== null ? 1 : 0.98 }}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center"
                >
                  {generatingAll ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Generating All...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-2" />
                      Generate All Emails
                    </>
                  )}
                </motion.button>
              )}
            </div>
            
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/95 dark:bg-gray-800/95 sm:backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{msg.sender}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(msg.detectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {msg.emailSent && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Email Sent
                    </span>
                  )}
                </div>

                {/* Job Description */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {msg.message}
                  </p>
                </div>

                {/* Email Generation Form */}
                {!msg.generatedEmail && !msg.emailSent && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                          type="text"
                          value={emailForm.name}
                          onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={emailForm.email}
                          onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={emailForm.phone}
                          onChange={(e) => setEmailForm({ ...emailForm, phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resume (Optional)</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            onChange={(e) => setEmailForm({ ...emailForm, resume: e.target.files?.[0] || null })}
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                          />
                          <div className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                            <Upload className="w-3 h-3 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {emailForm.resume ? emailForm.resume.name : 'Upload Resume'}
                            </span>
                          </div>
                        </label>
                        {emailForm.resume && (
                          <button
                            onClick={() => setEmailForm({ ...emailForm, resume: null })}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <motion.button
                      onClick={() => generateEmail(msg.id)}
                      disabled={generatingFor === msg.id}
                      whileHover={{ scale: generatingFor === msg.id ? 1 : 1.02 }}
                      whileTap={{ scale: generatingFor === msg.id ? 1 : 0.98 }}
                      className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {generatingFor === msg.id ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Generating Email...
                        </>
                      ) : (
                        <>
                          <Mail className="w-3 h-3 mr-2" />
                          Generate Email
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                {/* Generated Email Preview */}
                {msg.generatedEmail && !msg.emailSent && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Generated Email</h3>
                      <button
                        onClick={() => copyEmail(msg)}
                        className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To:</label>
                      <input
                        type="email"
                        value={msg.recruiterEmail || ''}
                        onChange={(e) => updateRecipientEmail(msg.id, e.target.value)}
                        placeholder="Enter recipient email"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subject:</label>
                      <input
                        type="text"
                        value={msg.generatedEmail.subject}
                        onChange={(e) => updateGeneratedEmail(msg.id, 'subject', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Body:</label>
                      <textarea
                        value={msg.generatedEmail.body}
                        onChange={(e) => updateGeneratedEmail(msg.id, 'body', e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent resize-y min-h-[100px]"
                      />
                    </div>

                    <motion.button
                      onClick={() => sendEmail(msg.id)}
                      disabled={sendingFor === msg.id || !msg.recruiterEmail?.trim()}
                      whileHover={{ scale: sendingFor === msg.id ? 1 : 1.02 }}
                      whileTap={{ scale: sendingFor === msg.id ? 1 : 0.98 }}
                      className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:bg-green-700 dark:hover:bg-green-600 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {sendingFor === msg.id ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-2" />
                          Send Email
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
