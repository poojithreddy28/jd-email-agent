'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Mail, Send, Copy, Check, Plus, X, RefreshCw } from 'lucide-react';
import { GradientBackground } from '@/components/GradientBackground';

interface EmailData {
  subject: string;
  body: string;
  recipientEmail?: string;
}

export default function EmailGenerator() {
  const [mode, setMode] = useState('single');
  const [jd, setJd] = useState('');
  const [multipleJDs, setMultipleJDs] = useState(['']);
  const [name, setName] = useState('Poojith Reddy A');
  const [email, setEmail] = useState('poojithreddy.se@gmail.com');
  const [phone, setPhone] = useState('+1 (312) 536-9779');
  const [generatedEmails, setGeneratedEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [emailsSent, setEmailsSent] = useState<boolean[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeAccount, setActiveAccount] = useState<'se' | 'dev'>('se');

  const EMAIL_ACCOUNTS = {
    se: { email: 'poojithreddy.se@gmail.com', label: 'SE Mail' },
    dev: { email: 'poojithreddy.dev@gmail.com', label: 'Dev Mail' },
  };

  const switchAccount = (account: 'se' | 'dev') => {
    setActiveAccount(account);
    setEmail(EMAIL_ACCOUNTS[account].email);
  };

  const addJDField = () => setMultipleJDs([...multipleJDs, '']);
  const removeJDField = (index: number) => setMultipleJDs(multipleJDs.filter((_, i) => i !== index));
  const updateJD = (index: number, value: string) => {
    const newJDs = [...multipleJDs];
    newJDs[index] = value;
    setMultipleJDs(newJDs);
  };

  const generateEmails = async () => {
    const jobDescriptions = mode === 'single' ? [jd] : multipleJDs.filter(j => j.trim());
    
    if (jobDescriptions.length === 0 || jobDescriptions.some(j => !j.trim())) {
      setError('Please enter at least one job description');
      return;
    }

    setLoading(true);
    setError('');
    setEmailsSent([]);
    
    try {
      const emailPromises = jobDescriptions.map(async (jobDesc) => {
        const formData = new FormData();
        formData.append('jd', jobDesc);
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        if (resume) {
          formData.append('resume', resume);
        }

        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to generate email');
        return await response.json();
      });

      const results = await Promise.all(emailPromises);
      setGeneratedEmails(results);
    } catch (err) {
      setError('Error generating emails: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (emailData: EmailData, index: number) => {
    if (!emailData.recipientEmail?.trim()) {
      setError('Please enter recipient email address');
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('to', emailData.recipientEmail);
      formData.append('subject', emailData.subject);
      formData.append('body', emailData.body);
      formData.append('fromName', name);
      formData.append('fromEmail', email);
      formData.append('account', activeAccount);
      if (resume) {
        formData.append('resume', resume);
      } else {
        formData.append('useDefaultResume', 'true');
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send email');

      const newEmailsSent = [...emailsSent];
      newEmailsSent[index] = true;
      setEmailsSent(newEmailsSent);
    } catch (err) {
      setError('Error sending email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const updateRecipientEmail = (index: number, email: string) => {
    const newEmails = [...generatedEmails];
    newEmails[index].recipientEmail = email;
    setGeneratedEmails(newEmails);
  };

  const copyEmail = (email: EmailData, index: number) => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden pt-16 sm:pt-20 transition-colors duration-300">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Email Generator</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">Generate personalized emails for job applications</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          whileHover={{ scale: 1.002 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6 shadow-2xl hover:shadow-3xl transition-shadow"
        >
          {/* Mode Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
            <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setMode('single')}
                className={`px-3 sm:px-6 py-2 rounded-md text-xs font-medium transition-all ${
                  mode === 'single'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Single Job
              </button>
              <button
                onClick={() => setMode('multiple')}
                className={`px-3 sm:px-6 py-2 rounded-md text-xs font-medium transition-all ${
                  mode === 'multiple'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Multiple Jobs
              </button>
            </div>
          </div>

          {/* Email Account Switcher */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Send From Account
            </label>
            <div className="flex flex-col sm:inline-flex sm:flex-row bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1 sm:gap-0">
              <button
                onClick={() => switchAccount('se')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
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
                className={`px-3 sm:px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
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

          {/* Personal Info */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Personal Information</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                placeholder="Full name"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                placeholder="Email"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                placeholder="Phone"
              />
            </div>
          </div>

          {/* Resume Upload */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Resume (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-900 dark:file:bg-white file:text-white dark:file:text-gray-900 hover:file:bg-gray-800 dark:hover:file:bg-gray-100 transition-all"
              />
              {resume && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                  <FileText className="w-3 h-3 mr-2" />
                  {resume.name}
                </p>
              )}
            </div>
          </div>

          {/* Job Descriptions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Job Description{mode === 'multiple' ? 's' : ''}
              </label>
              {mode === 'multiple' && (
                <button
                  onClick={addJDField}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </button>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {mode === 'single' ? (
                <motion.textarea
                  key="single"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-y min-h-[120px]"
                  placeholder="Paste job description..."
                />
              ) : (
                <div className="space-y-4">
                  {multipleJDs.map((jobDesc, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <textarea
                        value={jobDesc}
                        onChange={(e) => updateJD(index, e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-y min-h-[100px]"
                        placeholder={`Job ${index + 1}...`}
                      />
                      {multipleJDs.length > 1 && (
                        <button
                          onClick={() => removeJDField(index)}
                          className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
                        >
                          <X className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          <motion.button
            onClick={generateEmails}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-3 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                {mode === 'single' ? 'Generate Email' : 'Generate All Emails'}
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Generated Emails */}
        <AnimatePresence mode="popLayout">
          {generatedEmails.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {generatedEmails.map((email, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 25,
                    delay: index * 0.1 
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {generatedEmails.length > 1 ? `Email ${index + 1}` : 'Generated Email'}
                    </h3>
                    {emailsSent[index] && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        <Check className="w-3 h-3 mr-1" />
                        Sent
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                      <input
                        type="email"
                        value={email.recipientEmail || ''}
                        onChange={(e) => updateRecipientEmail(index, e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="recipient@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                      <input
                        type="text"
                        value={email.subject}
                        onChange={(e) => {
                          const newEmails = [...generatedEmails];
                          newEmails[index].subject = e.target.value;
                          setGeneratedEmails(newEmails);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                      <textarea
                        value={email.body}
                        onChange={(e) => {
                          const newEmails = [...generatedEmails];
                          newEmails[index].body = e.target.value;
                          setGeneratedEmails(newEmails);
                        }}
                        rows={6}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-y min-h-[120px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      onClick={() => sendEmail(email, index)}
                      disabled={sending || !email.recipientEmail?.trim() || emailsSent[index]}
                      whileHover={{ scale: (sending || !email.recipientEmail?.trim() || emailsSent[index]) ? 1 : 1.02 }}
                      whileTap={{ scale: (sending || !email.recipientEmail?.trim() || emailsSent[index]) ? 1 : 0.98 }}
                      className="flex-1 py-2.5 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {sending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Sending...
                        </>
                      ) : emailsSent[index] ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Sent
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => copyEmail(email, index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}

              <div className="text-center">
                <button
                  onClick={() => setGeneratedEmails([])}
                  className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Generate New Emails
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
