'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Check, Briefcase, UserCircle, Edit3, Download } from 'lucide-react';
import { GradientBackground } from '@/components/GradientBackground';

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
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [docxBase64, setDocxBase64] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableHtml, setEditableHtml] = useState<string>('');
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'docx'>('docx');
  const [roleName, setRoleName] = useState<string>('Position');
  const [hasEdits, setHasEdits] = useState(false);
  
  // User credentials (defaults to Poojith's info)
  const [userName, setUserName] = useState('Poojith Reddy A');
  const [userEmail, setUserEmail] = useState('poojithreddy.se@gmail.com');
  const [userPhone, setUserPhone] = useState('312-536-9779');
  const [userLinkedIn, setUserLinkedIn] = useState('https://www.linkedin.com/in/poojith-reddy-com/');

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

    // Resume is optional - will use default if not provided
    // User can provide text or file, or leave empty for default resume

    setLoading(true);
    setError('');
    setOutput(null);
    setHtmlPreview(null);
    setDocxBase64(null);
    setGenerationTime(null);
    setHasEdits(false);

    try {
      const formData = new FormData();
      formData.append('jobDescription', jobDescription);
      formData.append('mode', mode);
      formData.append('userName', userName);
      formData.append('userEmail', userEmail);
      formData.append('userPhone', userPhone);
      formData.append('userLinkedIn', userLinkedIn);
      
      // Send resume file or text if provided
      if (resumeFile) {
        formData.append('resumeFile', resumeFile);
      } else if (resumeText.trim()) {
        formData.append('resumeText', resumeText);
      }
      // If no resume provided, backend will use default resume

      // Always use DOCX API endpoint
      const endpoint = '/api/tailor-resume-pdf';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate resume');
      }

      // Handle DOCX JSON response with preview
      const data = await response.json();
      setHtmlPreview(data.htmlPreview);
      setDocxBase64(data.docxBase64);
      setGenerationTime(data.generationTime);
      
      // Extract job role from JD for filename
      const roleMatch = jobDescription.match(/(?:position|role|title|hiring|for|developer|engineer|looking for|seeking)\s*:?\s*([^\n,.!?]{3,50})/i);
      let role = 'Position';
      if (roleMatch) {
        role = roleMatch[1].trim()
          .replace(/^(a|an|the)\s+/i, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 30);
      }
      setRoleName(role);
    } catch (err) {
      setError('Error generating resume: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Fast test mode for quick formatting validation (completes in under 5 seconds)
  const testFormatting = async () => {
    setLoading(true);
    setError('');
    setOutput(null);
    setHtmlPreview(null);
    setDocxBase64(null);
    setGenerationTime(null);
    setHasEdits(false);

    try {
      const response = await fetch('/api/test-resume-format', { method: 'POST' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test mode failed');
      }

      const data = await response.json();
      setHtmlPreview(data.htmlPreview);
      setDocxBase64(data.docxBase64);
      setGenerationTime(data.generationTime);
      setRoleName('TestFormat');
    } catch (err) {
      setError('Test mode error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadDocx = async () => {
    // Use first name from userName for filename
    const firstName = userName.split(' ')[0] || 'Resume';
    const filename = `${firstName}_${roleName}.docx`;
    
    // If user made edits, convert edited HTML to DOCX
    if (hasEdits && htmlPreview) {
      try {
        // Dynamically import html-docx library (client-side only)
        const htmlDocx = (await import('html-docx-js-typescript')).default;
        
        // Convert HTML to DOCX (async operation)
        const converted = await htmlDocx.asBlob(htmlPreview);
        
        // Ensure we have a Blob (convert Buffer if needed)
        let blob: Blob;
        if (converted instanceof Blob) {
          blob = converted;
        } else {
          // Convert Buffer to Uint8Array then to Blob
          const uint8Array = new Uint8Array(converted.buffer as ArrayBuffer);
          blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error converting edited HTML to DOCX:', error);
        alert('Failed to generate DOCX from edited content. Please try PDF format.');
      }
      return;
    }
    
    // Otherwise, use original base64 DOCX
    if (!docxBase64) return;
    
    // Convert base64 to blob
    const byteCharacters = atob(docxBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = async () => {
    if (!htmlPreview) return;

    // Use first name from userName for filename
    const firstName = userName.split(' ')[0] || 'Resume';
    const filename = `${firstName}_${roleName}.pdf`;
    
    try {
      // Dynamically import html2pdf (client-side only)
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container for the HTML
      const element = document.createElement('div');
      element.innerHTML = htmlPreview;
      element.style.width = '8.5in';
      element.style.padding = '0.5in';
      element.style.backgroundColor = 'white';
      
      const opt = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try downloading as DOCX instead.');
    }
  };

  const handleDownload = async () => {
    if (downloadFormat === 'pdf') {
      await downloadAsPDF();
    } else {
      await downloadDocx();
    }
  };

  const handleEditMode = () => {
    if (!isEditMode) {
      setEditableHtml(htmlPreview || '');
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveEdits = () => {
    setHtmlPreview(editableHtml);
    setHasEdits(true);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditableHtml(htmlPreview || '');
    setIsEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden pt-20 transition-colors duration-300">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>
      
      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Resume Tailor</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">Customize your resume for specific job descriptions</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          whileHover={{ scale: 1.002 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-2xl hover:shadow-3xl transition-shadow"
        >
          {/* Mode Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Employment Type</label>
            <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setMode('fulltime')}
                className={`px-6 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  mode === 'fulltime'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                Full-Time
              </button>
              <button
                onClick={() => setMode('ctoc')}
                className={`px-6 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  mode === 'ctoc'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <UserCircle className="w-3 h-3" />
                C-to-C
              </button>
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-none"
              placeholder="Paste the job description here..."
            />
          </div>

          {/* User Credentials - COMMENTED OUT FOR MAIN USER FLOW */}
          {/* <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Your Information</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                  placeholder="Full Name"
                />
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                  placeholder="Email"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                  placeholder="Phone Number"
                />
                <input
                  type="url"
                  value={userLinkedIn}
                  onChange={(e) => setUserLinkedIn(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all"
                  placeholder="LinkedIn Profile URL"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                💡 Your contact information will be used in the generated resume header
              </p>
          </div> */}

          {/* Resume Input */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Your Resume (Optional)</label>
            
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                💡 Upload a PDF/DOCX file or paste resume text. If no resume is provided, a default resume will be used. Supports PDF extraction with proper formatting.
              </p>
            </div>
            
            {/* File Upload */}
            <div className="mb-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-900 dark:file:bg-white file:text-white dark:file:text-gray-900 hover:file:bg-gray-800 dark:hover:file:bg-gray-100 transition-all"
                />
                {resumeFile && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                    <FileText className="w-3 h-3 mr-2" />
                    {resumeFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Text Input */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or paste text</span>
              </div>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (e.target.value) setResumeFile(null);
              }}
              rows={6}
              disabled={!!resumeFile}
              className="w-full mt-4 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent transition-all resize-none disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
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
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          <div className="space-y-3">
            <motion.button
              onClick={generateResume}
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
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Generate Resume
                </>
              )}
            </motion.button>

            {/* Test Formatting Button - Fast validation mode */}
            <motion.button
              onClick={testFormatting}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center"
            >
              🧪 Test Formatting (Fast - Under 5 sec)
            </motion.button>
          </div>
        </motion.div>

        {/* Output */}
        <AnimatePresence>
          {/* DOCX Preview */}
          {htmlPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Generation Time and Download Header */}
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-400">Resume Generated Successfully!</p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Generated in {generationTime} • {
                        hasEdits 
                          ? '✏️ Edits will be applied to downloads' 
                          : isEditMode 
                            ? 'Edit mode active' 
                            : 'Preview below and download when ready'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isEditMode && (
                    <motion.button
                      onClick={handleEditMode}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-amber-600 dark:bg-amber-700 hover:bg-amber-700 dark:hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Content
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleDownload}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download {downloadFormat.toUpperCase()}
                  </motion.button>
                </div>
              </div>

              {/* Format Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Download Format</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred file format</p>
                  </div>
                  <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                      onClick={() => setDownloadFormat('docx')}
                      className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
                        downloadFormat === 'docx'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        DOCX
                      </div>
                    </button>
                    <button
                      onClick={() => setDownloadFormat('pdf')}
                      className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
                        downloadFormat === 'pdf'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        PDF
                      </div>
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  📄 <strong>Filename:</strong> Poojith_Reddy_{roleName}.{downloadFormat}
                </div>
              </div>

              {/* Preview or Edit Mode */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isEditMode ? '✏️ Edit Mode - Fix typos, spacing, or content' : `📄 Preview - Poojith_Reddy_${roleName}.${downloadFormat}`}
                  </p>
                  {isEditMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdits}
                        className="px-4 py-1.5 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white text-sm font-medium rounded transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-1.5 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-800 text-white text-sm font-medium rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6 max-h-[600px] overflow-y-auto">
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-800 dark:text-gray-300">
                          <strong>💡 Edit Mode:</strong> You can edit the HTML content below to fix typos, spacing, or adjust any text. 
                          <br />
                          <strong>Note:</strong> Edits only update the preview and PDF downloads. To edit the DOCX file, you&apos;ll need to open it in Word after downloading.
                        </p>
                      </div>
                      <textarea
                        value={editableHtml}
                        onChange={(e) => setEditableHtml(e.target.value)}
                        className="w-full h-[500px] p-4 font-mono text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <iframe
                      srcDoc={htmlPreview || undefined}
                      title="Resume Preview"
                      className="w-full min-h-[800px] border-0"
                      style={{ backgroundColor: 'white' }}
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  Download {downloadFormat.toUpperCase()}
                </button>
                <button
                  onClick={() => {
                    setHtmlPreview(null);
                    setDocxBase64(null);
                    setGenerationTime(null);
                  }}
                  className="px-5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
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
