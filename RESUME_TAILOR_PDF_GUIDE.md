# Resume Tailor PDF Generator - Complete Guide

## Overview
The Resume Tailor PDF Generator creates JD-specific resumes with precise bullet point counts and professional PDF formatting. The system automatically generates, verifies, and adjusts the resume to ensure it fits exactly on one page.

## Features

### ✨ Key Capabilities
- **JD-Based Customization**: Tailors resume content to match job description keywords and requirements
- **Precise Bullet Counts**:
  - Summary: 30 bullet points
  - First Client/Company: 30 bullet points
  - Second Client/Company: 25 bullet points
- **Optimal Bullet Length**: Each bullet is 1.5-2 lines (120-160 characters)
- **PDF Generation**: Professional formatted PDF output
- **Screenshot Verification**: Automatically verifies page count
- **Iterative Adjustment**: Adjusts content to fit exactly 1 page
- **Two Output Modes**:
  - Text View: For easy copying and editing
  - PDF Download: For professional formatted resume

## How to Use

### Step 1: Navigate to Resume Tailor
1. Open the application
2. Click on "Resume Tailor" in the navigation

### Step 2: Configure Settings

#### Employment Type
- **Full-Time**: Traditional full-time position resume
- **C-to-C**: Corp-to-Corp contract position resume

#### Output Format
- **Text View**: Displays formatted text that you can copy
- **PDF Download**: Generates and downloads a PDF file

### Step 3: Provide Job Description
Paste the complete job description in the "Job Description" text area.

**Tips:**
- Include the full JD with all requirements
- Include keywords, technologies, and skills mentioned
- Include company information if available

### Step 4: Upload Your Resume
You can provide your resume in two ways:

1. **Upload File** (Recommended):
   - Supported formats: PDF, DOCX, DOC
   - Click "Choose File" and select your resume

2. **Paste Text**:
   - Copy your resume content
   - Paste in the text area below "or paste text"

### Step 5: Generate Resume
Click the "Generate Resume" button.

**Processing Steps:**
1. ✅ Extracts and analyzes your resume
2. ✅ Identifies key experiences and skills
3. ✅ Generates JD-aligned content
4. ✅ Creates PDF with proper formatting
5. ✅ Takes screenshot for verification
6. ✅ Adjusts if needed to fit 1 page
7. ✅ Downloads final PDF

## Output Format

### PDF Mode
When you select "PDF Download", the system:

1. **Generates Content**:
   - Header with name, title, contact info
   - 30 summary bullet points
   - First client: 30 bullets
   - Second client: 25 bullets
   - Technical skills section

2. **Creates PDF**:
   - Professional formatting
   - Optimized spacing
   - Clean layout
   - Exactly 1 page

3. **Auto-Downloads**:
   - File name: `tailored-resume.pdf`
   - Can re-download from preview

4. **Shows Preview**:
   - Embedded PDF viewer
   - Verification status
   - Download button

### Text Mode
When you select "Text View", the system:

1. **Displays Sections**:
   - Summary (collapsible)
   - Experience sections (collapsible)
   - Copy buttons for each section

2. **Easy Copying**:
   - Copy individual sections
   - Copy all content at once
   - Format preserved for pasting

## Technical Requirements

### Prerequisites
- Ollama installed and running
- llama3.2 model available
- Node.js environment
- Required packages installed

### API Endpoints

#### `/api/tailor-resume` (Text Mode)
- Returns JSON with structured resume data
- Use for text view and copying

#### `/api/tailor-resume-pdf` (PDF Mode)
- Generates formatted PDF
- Returns PDF file download
- Includes verification

### Libraries Used
- **PDFKit**: PDF generation
- **Puppeteer**: Screenshot and verification
- **Framer Motion**: Smooth animations
- **Tailwind CSS**: Styling

## Content Generation Rules

### Summary Bullets (30)
- Start with context, not action verb
- Include years of experience
- Mix: skills, achievements, technologies
- Keyword-dense and JD-aligned
- 1.5-2 lines each

### Experience Bullets

#### First Client (30 bullets)
**Bullets 1-2**: Business/Leadership Impact
- Revenue impact
- Cost savings
- Team leadership
- Metrics: dollar amounts, percentages

**Bullets 3-30**: Technical Achievements
- Unique action verbs
- Specific technologies
- Quantifiable metrics
- JD-aligned keywords

#### Second Client (25 bullets)
Same structure as first client, but 25 total bullets.

### Action Verbs (Never Repeated)
Architected, Engineered, Designed, Developed, Implemented, Built, Created, Deployed, Established, Launched, Spearheaded, Pioneered, Transformed, Modernized, Streamlined, Optimized, Automated, Accelerated, Scaled, Reduced, Increased, Improved, Enhanced, Delivered, Achieved, Executed, Directed, Led, Managed, Coordinated

## Tips for Best Results

### 1. Provide Complete Information
- Full job description
- Complete resume with all experiences
- Include metrics and achievements

### 2. Review Generated Content
- Check for JD keyword alignment
- Verify metrics are accurate
- Ensure bullet lengths are appropriate

### 3. Use Appropriate Mode
- **PDF Mode**: For final submissions
- **Text Mode**: For editing and customization

### 4. Iterate if Needed
- Generate multiple versions
- Compare outputs
- Use text mode for quick edits

## Troubleshooting

### PDF Not Generating
**Issue**: PDF generation fails
**Solutions**:
- Ensure Ollama is running
- Check llama3.2 model is installed
- Verify temp directory permissions
- Check browser console for errors

### Content Too Long
**Issue**: Resume exceeds 1 page
**Solutions**:
- System auto-adjusts after 3 iterations
- May trim some content
- Use text mode to manually edit

### Missing Keywords
**Issue**: JD keywords not in output
**Solutions**:
- Provide more detailed JD
- Include specific technology requirements
- Regenerate with emphasis on missing terms

### File Upload Issues
**Issue**: Resume file won't upload
**Solutions**:
- Ensure file is PDF, DOC, or DOCX
- Check file size (should be < 10MB)
- Try pasting text instead
- Verify file isn't corrupted

## Example Workflow

### For Job Applications
1. Copy job description from posting
2. Select "PDF Download" mode
3. Select employment type (Full-Time/C-to-C)
4. Upload your master resume
5. Generate PDF
6. Review in preview
7. Download and submit

### For Quick Edits
1. Use "Text View" mode
2. Generate content
3. Copy specific sections
4. Paste into your document
5. Make manual adjustments
6. Use for different JDs

## Future Enhancements
- [ ] Multiple template options
- [ ] Custom bullet count configuration
- [ ] ATS score calculator
- [ ] Keyword density analyzer
- [ ] Multi-page resume support
- [ ] Cloud storage integration

## Support
For issues or questions:
1. Check error messages in browser console
2. Verify Ollama is running: `ollama list`
3. Review temp directory for debug files
4. Check API logs for detailed errors

---

**Version**: 1.0.0  
**Last Updated**: February 18, 2026
