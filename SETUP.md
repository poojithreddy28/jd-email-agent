# Setup Instructions

## Quick Setup

1. **Add your Gemini API Key to `.env.local`**:
   ```bash
   # Get your free key from: https://aistudio.google.com/app/apikey
   GEMINI_API_KEY=your-actual-gemini-api-key-here
   ```

2. **Restart the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Open http://localhost:3000
   - Choose between:
     - **Email Generator**: AI-powered job application emails
     - **Resume Tailor**: AI-customized resumes (Full-Time or C-to-C)

## What Changed

### ✅ Fixed Issues
- **Bold formatting**: Now copies as `**text**` (works perfectly in Word)
- **Spacing**: Proper formatting when copy-pasting
- **API Key**: Moved to `.env.local` (secure, server-side)

### ✅ New Features
- **Unified Navigation**: Easy switching between Email Generator and Resume Tailor
- **Gemini AI**: Both tools now use Google Gemini (replaced Ollama)
- **Professional Branding**: Renamed to "Job Application Assistant"
- **Better UX**: Clean navigation, consistent design

## Configuration

### Environment Variables (`.env.local`)
```env
# Gmail (for email sending)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password

# Gemini API (for AI generation)
GEMINI_API_KEY=your-gemini-api-key-here
```

### Getting Your Gemini API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Paste it in `.env.local`
5. Restart your dev server

## Features

### Email Generator
- Paste job description
- AI generates professional email
- Auto-extracts recipient email and company
- Send directly or copy

### Resume Tailor
- **Full-Time Mode**: 2-5 line summary, 5 bullets per company
- **C-to-C Mode**: 30 bullet summary, 30 bullets per client
- Upload PDF/DOCX or paste text
- Copy sections or entire resume
- Bold formatting works in Word

## Copy-Paste to Word
All bold formatting uses `**text**` markdown syntax which Word automatically converts to bold when pasted. No manual formatting needed!

## Troubleshooting

### "Gemini API key not configured"
- Make sure you added `GEMINI_API_KEY` to `.env.local`
- Restart your dev server after adding the key

### Bold not working in Word
- Make sure you're using the Copy buttons (don't manually select)
- Paste into Word (Ctrl+V or Cmd+V)
- Word will automatically format `**text**` as bold

### Email generation fails
- Check your `GEMINI_API_KEY` is valid
- Verify you have internet connection
- Check terminal for error messages

## Success! 🎉
Your Job Application Assistant is now ready to use with:
- Secure API key management
- Both tools powered by Gemini AI
- Professional navigation
- Perfect copy-paste formatting
