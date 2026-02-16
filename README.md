# JD Email Agent & Resume Tailor Pro

A comprehensive job application toolkit featuring:
1. **JD Email Agent**: AI-powered job application email generator
2. **Resume Tailor Pro**: AI-powered resume customization tool

Automatically extracts recipient emails from job descriptions, generates personalized emails, creates tailored resumes, and sends applications with resume attachments.

## 🎯 Features

### JD Email Agent
- **Single/Multiple JD Processing**: Generate emails for one or multiple job descriptions
- **Auto Email Extraction**: Automatically detects recipient emails from job postings
- **Company Detection**: Extracts company names from job descriptions
- **Professional Signature**: Automatically adds professional signature to emails
- **Resume Management**: Auto-attach PDF resume or use default resume
- **AI Email Generation**: Uses Ollama LLM (llama3) for personalized content
- **Direct Email Sending**: Send emails directly via Gmail SMTP
- **Responsive UI**: Clean interface with dark mode support
- **Real-time Processing**: Live feedback and status updates

### Resume Tailor Pro ✨ NEW
- **Two Resume Modes**: Full-Time and C-to-C (Corp-to-Corp) formats
- **AI-Powered Customization**: Uses Google Gemini to tailor resumes to job descriptions
- **Multiple Input Methods**: Paste text or upload PDF/DOCX files
- **Copy-Paste Ready**: Formatted for Microsoft Word with bold tags
- **Section-Wise Copying**: Copy entire resume or individual sections
- **Smart Formatting**: Auto-bold for tech stack, metrics, and key achievements
- **Full-Time Mode**: 5 bullets per company with business + technical focus
- **C-to-C Mode**: 30 bullets per client for detailed contract work
- **[Full Documentation](RESUME_TAILOR_DOCS.md)**: Complete guide and best practices

## 🚀 Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI/LLM**: 
  - Ollama (llama3 model) for email generation
  - Google Gemini 1.5 Flash for resume tailoring
- **Email**: Nodemailer with Gmail SMTP
- **File Handling**: 
  - FormData API
  - pdf-parse for PDF processing
  - mammoth for DOCX processing
- **Styling**: Tailwind CSS with dark mode

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/poojithreddy28/jd-email-agent.git
   cd jd-email-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create `.env.local` file:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-digit-app-password
   ```

4. **Install and run Ollama:**
   ```bash
   # Install Ollama (macOS)
   brew install ollama
   
   # Pull llama3 model
   ollama pull llama3
   
   # Start Ollama server
   ollama serve
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📧 Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" from dropdown
   - Copy the 16-digit password
3. **Update `.env.local`** with your credentials

## 🎮 Usage

### JD Email Agent

#### Single Job Mode
1. Select "Single JD" mode
2. Paste job description
3. Click "Generate Email"
4. Review and send directly

#### Multiple Jobs Mode
1. Select "Multiple JDs" mode
2. Add multiple job descriptions
3. Click "Generate All Emails"
4. Send each email individually

#### Features in Action
- **Auto Email Detection**: Recipient emails are automatically extracted
- **Smart Content**: AI analyzes JD and generates relevant skills
- **Professional Signature**: Consistent professional formatting
- **Resume Handling**: Uses default resume if none uploaded

### Resume Tailor Pro ✨

#### Quick Start
1. Navigate to `/resume-tailor` or click link from main page
2. Enter your Google Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))
3. Select mode: Full-Time or C-to-C
4. Paste job description
5. Input resume (paste text or upload PDF/DOCX)
6. Click "Generate Tailored Resume"
7. Copy output sections to Word

#### Full-Time Mode
- 2-5 line professional summary
- 5 bullets per company
- Business impact + technical depth
- Perfect for traditional corporate roles

#### C-to-C Mode
- 30 bullet summary
- 30 bullets per client (recent 2 clients)
- Heavy technical detail with metrics
- Ideal for contract/consulting work

📖 **[Complete Resume Tailor Documentation](RESUME_TAILOR_DOCS.md)**

## 📁 Project Structure

```
jd-email-agent/
├── app/
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.js          # Email generation with Ollama
│   │   ├── send/
│   │   │   └── route.js          # Email sending logic
│   │   └── tailor-resume/
│   │       └── route.js          # Resume tailoring with Gemini
│   ├── resume-tailor/
│   │   └── page.tsx              # Resume Tailor UI
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # JD Email Agent UI
├── public/
├── PoojithJavaFullStackDeveloper.pdf  # Default resume
├── defaultpoojithresume.txt           # Resume text content
├── RESUME_TAILOR_DOCS.md              # Resume Tailor documentation
├── .env.local                         # Environment variables
└── package.json
```

## 🔄 API Endpoints

### POST `/api/generate`
Generates personalized emails from job descriptions
- **Input**: FormData with JD, personal info, optional resume
- **Output**: JSON with subject, body, recipientEmail
- **AI Model**: Ollama llama3

### POST `/api/send`
Sends emails with resume attachments
- **Input**: FormData with email details and resume
- **Output**: Success confirmation

### POST `/api/tailor-resume` ✨ NEW
Generates tailored resumes from job descriptions
- **Input**: FormData with JD, resume (text/file), mode, Gemini API key
- **Output**: JSON with summary and experience sections
- **AI Model**: Google Gemini 1.5 Flash
- **File Support**: PDF and DOCX parsing

## ⚙️ Configuration

### Environment Variables
- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Gmail App Password (16 digits)

### Ollama Model
- **Model**: llama3
- **Endpoint**: http://localhost:11434/api/generate
- **Mode**: Non-streaming for JSON responses

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Poojith Reddy A**
- Email: poojithreddy.se@gmail.com
- Phone: +1 (312) 536-9779
- GitHub: [@poojithreddy28](https://github.com/poojithreddy28)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the full-stack framework
- [Ollama](https://ollama.ai/) for local LLM hosting
- [Google Gemini](https://ai.google.dev/) for resume AI tailoring
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Nodemailer](https://nodemailer.com/) for email functionality
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) for PDF processing
- [mammoth](https://www.npmjs.com/package/mammoth) for DOCX processing

---

⭐ Star this repository if you find it helpful!
