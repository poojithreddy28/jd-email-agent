'use client';
import { useState } from 'react';

export default function Home() {
  const [mode, setMode] = useState('single'); // 'single' or 'multiple'
  const [jd, setJd] = useState('');
  const [multipleJDs, setMultipleJDs] = useState(['']);
  const [name, setName] = useState('Poojith Reddy A');
  const [email, setEmail] = useState('poojithreddy.se@gmail.com');
  const [phone, setPhone] = useState('+1 (312) 536-9779');
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState(null);
  const [sending, setSending] = useState(false);
  const [emailsSent, setEmailsSent] = useState([]);

  const addJDField = () => {
    setMultipleJDs([...multipleJDs, '']);
  };

  const removeJDField = (index) => {
    const newJDs = multipleJDs.filter((_, i) => i !== index);
    setMultipleJDs(newJDs);
  };

  const updateJD = (index, value) => {
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
      setError('Error generating emails: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (emailData, index) => {
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
      setError('Error sending email: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const updateRecipientEmail = (index, email) => {
    const newEmails = [...generatedEmails];
    newEmails[index].recipientEmail = email;
    setGeneratedEmails(newEmails);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            JD Email Agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Generate personalized job application emails using AI
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Choose Mode
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setMode('single')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Single JD
              </button>
              <button
                onClick={() => setMode('multiple')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'multiple'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Multiple JDs
              </button>
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Poojith Reddy A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="poojithreddy.se@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="+1 (312) 536-9779"
              />
            </div>
          </div>

          {/* Resume Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resume (Optional - uses default if not provided)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResume(e.target.files[0])}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {resume && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ {resume.name} uploaded
              </p>
            )}
            {!resume && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Will use default Poojith's resume if none uploaded
              </p>
            )}
          </div>

          {/* Job Description Input */}
          {mode === 'single' ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Description *
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={8}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Paste the full job description here..."
              />
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Descriptions *
                </label>
                <button
                  onClick={addJDField}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  + Add JD
                </button>
              </div>
              {multipleJDs.map((jobDesc, index) => (
                <div key={index} className="mb-4 relative">
                  <textarea
                    value={jobDesc}
                    onChange={(e) => updateJD(index, e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`Job Description ${index + 1}...`}
                  />
                  {multipleJDs.length > 1 && (
                    <button
                      onClick={() => removeJDField(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={generateEmails}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Generating Emails...' : mode === 'single' ? 'Generate Email' : 'Generate All Emails'}
          </button>
        </div>

        {/* Generated Emails */}
        {generatedEmails.length > 0 && (
          <div className="space-y-6">
            {generatedEmails.map((email, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Generated Email {generatedEmails.length > 1 ? `#${index + 1}` : ''}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Send to Email:
                  </label>
                  <input
                    type="email"
                    value={email.recipientEmail || ''}
                    onChange={(e) => updateRecipientEmail(index, e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Auto-detected or enter manually"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject:
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-900 dark:text-white">{email.subject}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Body:
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <pre className="text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                      {email.body}
                    </pre>
                  </div>
                </div>

                {emailsSent[index] && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
                    ✓ Email sent successfully with resume attached!
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => sendEmail(email, index)}
                    disabled={sending || !email.recipientEmail || !email.recipientEmail.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send Email'}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Copy Email
                  </button>
                </div>
              </div>
            ))}
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <button
                onClick={() => setGeneratedEmails([])}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
