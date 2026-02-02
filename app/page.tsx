'use client';
import { useState } from 'react';

interface EmailData {
  subject: string;
  body: string;
  recipientEmail?: string;
}

export default function Home() {
  const [mode, setMode] = useState('single'); // 'single' or 'multiple'
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

  const addJDField = () => {
    setMultipleJDs([...multipleJDs, '']);
  };

  const removeJDField = (index: number) => {
    const newJDs = multipleJDs.filter((_, i) => i !== index);
    setMultipleJDs(newJDs);
  };

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

        if (!response.ok) {
          throw new Error('Failed to generate email');
        }

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
    if (!emailData.recipientEmail || !emailData.recipientEmail.trim()) {
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
      
      // Use uploaded resume or default
      if (resume) {
        formData.append('resume', resume);
      } else {
        // Send a flag to use default resume
        formData.append('useDefaultResume', 'true');
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Mark this email as sent
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">
            JD Email Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered job application email generator
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 mb-8">
          {/* Mode Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Mode</h3>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setMode('single')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === 'single'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Single Job
              </button>
              <button
                onClick={() => setMode('multiple')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === 'multiple'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Multiple Jobs
              </button>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  placeholder="(000) 000-0000"
                />
              </div>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resume</h3>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-700 dark:file:text-gray-300"
              />
              {resume ? (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {resume.name}
                </p>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Optional - Default Word document resume will be used if none provided
                </p>
              )}
            </div>
          </div>

          {/* Job Descriptions */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Job Description{mode === 'multiple' ? 's' : ''}
              </h3>
            </div>
            
            {mode === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Paste job description
                </label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all resize-none"
                  placeholder="Paste the job description here..."
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {multipleJDs.length} job{multipleJDs.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={addJDField}
                    className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Add Job
                  </button>
                </div>
                <div className="space-y-4">
                  {multipleJDs.map((jobDesc, index) => (
                    <div key={index} className="relative">
                      <textarea
                        value={jobDesc}
                        onChange={(e) => updateJD(index, e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all resize-none"
                        placeholder={`Job description ${index + 1}...`}
                      />
                      {multipleJDs.length > 1 && (
                        <button
                          onClick={() => removeJDField(index)}
                          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="text-gray-800 dark:text-gray-200 text-sm">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={generateEmails}
            disabled={loading}
            className="w-full py-4 px-6 bg-gray-900 hover:bg-black disabled:bg-gray-300 dark:bg-gray-100 dark:hover:bg-white dark:disabled:bg-gray-700 text-white dark:text-black font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              mode === 'single' ? 'Generate Email' : 'Generate All Emails'
            )}
          </button>
        </div>

        {/* Generated Emails */}
        {generatedEmails.length > 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Emails Generated Successfully</span>
              </div>
            </div>
            {generatedEmails.map((email, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {generatedEmails.length > 1 ? `Email ${index + 1}` : 'Generated Email'}
                  </h3>
                  {emailsSent[index] && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      Sent
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Send to
                    </label>
                    <input
                      type="email"
                      value={email.recipientEmail || ''}
                      onChange={(e) => updateRecipientEmail(index, e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                      placeholder="recipient@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={email.subject}
                      onChange={(e) => {
                        const newEmails = [...generatedEmails];
                        newEmails[index].subject = e.target.value;
                        setGeneratedEmails(newEmails);
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={email.body}
                      onChange={(e) => {
                        const newEmails = [...generatedEmails];
                        newEmails[index].body = e.target.value;
                        setGeneratedEmails(newEmails);
                      }}
                      rows={12}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all resize-none font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => sendEmail(email, index)}
                    disabled={sending || !email.recipientEmail || !email.recipientEmail.trim() || emailsSent[index]}
                    className="flex-1 py-3 px-4 bg-gray-900 hover:bg-black disabled:bg-gray-300 dark:bg-gray-100 dark:hover:bg-white dark:disabled:bg-gray-700 text-white dark:text-black font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : emailsSent[index] ? (
                      'Sent'
                    ) : (
                      'Send Email'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const text = 'Subject: ' + email.subject + '\n\n' + email.body;
                      navigator.clipboard.writeText(text);
                    }}
                    className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
            
            <div className="text-center">
              <button
                onClick={() => setGeneratedEmails([])}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Generate New Emails
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
