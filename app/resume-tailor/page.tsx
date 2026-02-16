'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Copy, Check, Briefcase, UserCircle } from 'lucide-react';

interface ResumeOutput {
  summary: string | string[];
  experience: Array<{
    company: string;
    products?: string;
    bullets: string[];
  }>;
}

export default function ResumeTailor() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'fulltime' | 'ctoc'>('fulltime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState<ResumeOutput | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(pdf|docx?)$/i)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    setResumeFile(file);
    setResumeText('');
    setError('');
  };

  const generateResume = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    if (!resumeText.trim() && !resumeFile) {
      setError('Please paste your resume or upload a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('jobDescription', jobDescription);
      formData.append('mode', mode);
      
      if (resumeFile) {
        formData.append('resumeFile', resumeFile);
      } else {
        formData.append('resumeText', resumeText);
      }

      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate resume');
      }

      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setError('Error generating resume: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const copySection = (section: 'summary' | 'experience', companyIndex?: number) => {
    if (!output) return;

    let text = '';
    const sectionKey = section + (companyIndex !== undefined ? companyIndex : '');
    
    if (section === 'summary') {
      text = Array.isArray(output.summary) 
        ? output.summary.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        : output.summary;
    } else if (section === 'experience' && companyIndex !== undefined) {
      const exp = output.experience[companyIndex];
      const productsLine = exp.products ? `Products: ${exp.products}\n\n` : '';
      text = `${exp.company}\n${productsLine}\n${exp.bullets.map((b, i) => `• ${b}`).join('\n\n')}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = () => {
    if (!output) return;

    const summaryText = Array.isArray(output.summary) 
      ? output.summary.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
      : output.summary;

    const experienceText = output.experience.map(exp => {
      const productsLine = exp.products ? `Products: ${exp.products}\n\n` : '';
      return `${exp.company}\n${productsLine}\n${exp.bullets.map(b => `• ${b}`).join('\n\n')}`;
    }).join('\n\n---\n\n');

    const fullText = `SUMMARY\n\n${summaryText}\n\n\nEXPERIENCE\n\n${experienceText}`;
    navigator.clipboard.writeText(fullText);
    setCopiedSection('all');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Resume Tailor</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Optimize your resume for any job description</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          whileHover={{ scale: 1.002 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-8 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Mode Toggle */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Employment Type</label>
            <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setMode('fulltime')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'fulltime'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Full-Time
              </button>
              <button
                onClick={() => setMode('ctoc')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'ctoc'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                C-to-C
              </button>
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-none"
              placeholder="Paste the job description here..."
            />
          </div>

          {/* Resume Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Resume</label>
            
            {/* File Upload */}
            <div className="mb-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-900 dark:file:bg-gray-600 file:text-white hover:file:bg-gray-800 dark:hover:file:bg-gray-500 transition-all"
                />
                {resumeFile && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    {resumeFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Text Input */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or paste text</span>
              </div>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (e.target.value) setResumeFile(null);
              }}
              rows={8}
              disabled={!!resumeFile}
              className="w-full mt-4 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-none disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
              placeholder="Paste your resume text here..."
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          <motion.button
            onClick={generateResume}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-4 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
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
                <Upload className="w-5 h-5 mr-2" />
                Generate Resume
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Output */}
        <AnimatePresence>
          {output && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Copy All Button */}
              <div className="flex justify-end">
                <motion.button
                  onClick={copyAll}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-all flex items-center"
                >
                  {copiedSection === 'all' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied All
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All
                    </>
                  )}
                </motion.button>
              </div>

              {/* Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Summary ({Array.isArray(output.summary) ? output.summary.length : 1} points)
                  </h2>
                  <motion.button
                    onClick={() => copySection('summary')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors flex items-center"
                  >
                    {copiedSection === 'summary' ? (
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

                <div className="space-y-4">
                  {Array.isArray(output.summary) ? (
                    output.summary.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                          delay: i * 0.03
                        }}
                        className="flex gap-3"
                      >
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{i + 1}.</span>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{point}</p>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{output.summary}</p>
                  )}
                </div>
              </motion.div>

              {/* Experience */}
              {output.experience.map((exp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{exp.company}</h3>
                      {exp.products && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">Products: {exp.products}</p>
                      )}
                    </div>
                    <motion.button
                      onClick={() => copySection('experience', index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors flex items-center"
                    >
                      {copiedSection === `experience${index}` ? (
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

                  <div className="space-y-4">
                    {exp.bullets.map((bullet, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex gap-3"
                      >
                        <span className="text-gray-400 dark:text-gray-500 mt-1.5">•</span>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{bullet}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Reset Button */}
              <div className="text-center pt-6">
                <button
                  onClick={() => setOutput(null)}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                >
                  Generate New Resume
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
