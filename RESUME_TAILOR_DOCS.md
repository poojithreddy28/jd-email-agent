# Resume Tailor Pro - Documentation

## Overview
Resume Tailor Pro is an AI-powered resume customization tool integrated into the JD Email Agent project. It uses Google Gemini AI to create perfectly tailored resumes optimized for specific job descriptions.

## Features

### Two Modes

#### 1. Full-Time Mode
- **Summary**: 2-5 professional lines with bold key skills
- **Experience**: 5 bullet points per company
  - Points 1-2: Business impact and strategic value
  - Points 3-5: Technical depth with bold tech stack and metrics
- Perfect for traditional full-time job applications

#### 2. C-to-C (Corp-to-Corp) Mode
- **Summary**: 30 bullet points (1.5-2.5 lines each)
- **Experience**: 30 bullet points per client (recent 2 clients)
  - Points 1-3: Business goals and strategic impact
  - Points 4-30: Deep technical work with bold technologies and metrics
- Ideal for contract/consulting positions

### Input Options
1. **Paste Resume Text**: Direct text input
2. **Upload Resume File**: Support for PDF and DOCX files
   - PDF parsing via `pdf-parse`
   - DOCX parsing via `mammoth`

### Output Features
- **Copy-Paste Ready**: All formatting uses `**bold**` syntax compatible with Microsoft Word
- **One-Click Copy**: Copy entire resume or individual sections
- **Bold Formatting**: Automatic bold formatting for:
  - Technical skills and technologies
  - Metrics and numbers
  - Key achievements

## Setup

### Prerequisites
- Node.js installed
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation
Dependencies are already installed in the project:
```bash
npm install pdf-parse mammoth
```

### Usage

1. **Navigate to Resume Tailor**
   - Visit `http://localhost:3000/resume-tailor`
   - Or click the link from the main Email Agent page

2. **Enter Gemini API Key**
   - Paste your Google Gemini API key
   - Key is used client-side only (not stored)

3. **Select Mode**
   - Choose between Full-Time or C-to-C mode

4. **Input Job Description**
   - Paste the complete job description

5. **Input Your Resume**
   - Option 1: Paste resume text directly
   - Option 2: Upload PDF or DOCX file

6. **Generate**
   - Click "Generate Tailored Resume"
   - Wait for AI processing (typically 10-30 seconds)

7. **Copy Output**
   - Use "Copy All" for the complete resume
   - Or copy individual sections (Summary, Experience by company)

## Technical Details

### API Endpoint
- **Route**: `/api/tailor-resume`
- **Method**: POST
- **Content-Type**: multipart/form-data

### Request Parameters
```javascript
{
  jobDescription: string,
  mode: 'fulltime' | 'ctoc',
  geminiKey: string,
  resumeText?: string,      // Optional if file provided
  resumeFile?: File         // Optional if text provided
}
```

### Response Format
```javascript
{
  summary: string,
  experience: [
    {
      company: string,
      bullets: string[]
    }
  ]
}
```

### AI Model
- **Model**: Google Gemini 1.5 Flash
- **Temperature**: 0.7
- **Max Tokens**: 8000

## Best Practices

### For Best Results

1. **Job Description**
   - Include complete JD with all requirements
   - Include company name and role details
   - More context = better tailoring

2. **Resume Input**
   - Use your most current, comprehensive resume
   - Include all relevant experience
   - More details = better customization

3. **Mode Selection**
   - Full-Time: Traditional corporate roles, shorter format
   - C-to-C: Contract/consulting, detailed technical showcase

### Output Usage

1. **Word Compatibility**
   - Output uses `**text**` for bold
   - Copy-paste directly into Word
   - Word will render bold formatting correctly

2. **Editing**
   - Review AI-generated content
   - Verify accuracy of technical details
   - Adjust metrics if needed
   - Personalize as desired

## File Structure

```
app/
├── resume-tailor/
│   └── page.tsx           # Main UI component
├── api/
│   └── tailor-resume/
│       └── route.js       # API handler with Gemini integration
└── page.tsx               # Email agent (with navigation link)
```

## Navigation

- **Email Agent → Resume Tailor**: Link in header
- **Resume Tailor → Email Agent**: "Back to Email Generator" link

## Error Handling

The application handles:
- Missing API key
- Invalid file formats
- PDF/DOCX parsing errors
- Gemini API errors
- JSON parsing failures

All errors display user-friendly messages in the UI.

## Security Notes

- API keys are sent securely via HTTPS
- Keys are not stored server-side
- Keys are not logged or persisted
- Users provide their own Gemini API keys

## Limitations

1. **File Size**: Large PDF/DOCX files may take longer to process
2. **API Costs**: Each generation uses Gemini API credits
3. **Rate Limits**: Subject to Google Gemini API rate limits
4. **Output Quality**: Depends on input quality and JD specificity

## Troubleshooting

### "Failed to parse PDF file"
- Ensure PDF is not password-protected
- Try pasting text directly instead
- Some PDFs with complex formatting may not parse well

### "Gemini API error"
- Verify API key is correct
- Check API key has not expired
- Ensure you have available quota

### "Failed to parse AI response"
- API may have returned unexpected format
- Try generating again
- Check your internet connection

## Future Enhancements

Potential improvements:
- Support for more file formats (TXT, RTF)
- Resume templates selection
- Multiple resume versions at once
- Save/export functionality
- Resume comparison tool

## Support

For issues or questions:
1. Check error messages in the UI
2. Review browser console for detailed errors
3. Verify API key and inputs
4. Try alternative input method (text vs file)
