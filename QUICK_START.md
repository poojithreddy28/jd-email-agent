# Resume Tailor Pro - Quick Start Guide

## 🚀 Getting Started in 3 Minutes

### Step 1: Access Resume Tailor
1. Start your dev server: `npm run dev`
2. Open http://localhost:3000
3. Click "Need a tailored resume? Try Resume Tailor Pro →"
4. Or go directly to http://localhost:3000/resume-tailor

### Step 2: Get Your Gemini API Key (Free)
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Paste it in the "Gemini API Key" field

**Note**: Your key is used client-side only and never stored!

### Step 3: Choose Your Mode

#### Full-Time Mode 📋
**Best for**: Traditional corporate full-time positions

**Output**:
- Summary: 2-5 professional lines
- Experience: 5 bullets per company
  - 2 business-focused bullets
  - 3 technical bullets with metrics

**Example Use Case**: 
> Applying for a "Senior Software Engineer" role at a tech company

---

#### C-to-C Mode 💼
**Best for**: Contract, consulting, or Corp-to-Corp positions

**Output**:
- Summary: 30 detailed bullet points
- Experience: 30 bullets per client (recent 2 clients)
  - 3 business/strategic bullets
  - 27 technical bullets with deep detail

**Example Use Case**:
> Applying for a "6-month contract React Developer" role

### Step 4: Input Job Description
Copy and paste the **entire** job description:
- Job title and company name
- Required skills and qualifications
- Responsibilities
- Nice-to-haves

**💡 Tip**: More detail = better tailoring!

### Step 5: Input Your Resume

**Option A**: Upload File
- Click "Choose File"
- Select your PDF or DOCX resume
- Wait for "✓ filename.pdf"

**Option B**: Paste Text
- Copy your resume text
- Paste in the text area
- System automatically uses this if no file

**⚠️ Note**: File upload overrides text input!

### Step 6: Generate & Copy
1. Click "Generate Tailored Resume"
2. Wait 10-30 seconds (AI processing)
3. Review the output
4. Use copy buttons:
   - **Copy All**: Entire resume
   - **Copy** (per section): Individual parts

### Step 7: Use in Word
1. Open Microsoft Word
2. Paste the copied content
3. Bold formatting (`**text**`) renders automatically
4. Edit/customize as needed
5. Save and attach to applications!

---

## 📊 Mode Comparison

| Feature | Full-Time | C-to-C |
|---------|-----------|---------|
| Summary Length | 2-5 lines | 30 bullets |
| Bullets per Company | 5 | 30 |
| Companies Shown | All recent | 2 most recent |
| Business Focus | 40% | 10% |
| Technical Depth | 60% | 90% |
| Best For | FTE roles | Contracts |

---

## 💡 Pro Tips

### For Job Descriptions
✅ **Do**:
- Include the complete JD
- Keep company name visible
- Include all tech requirements
- Include location and role level

❌ **Don't**:
- Paste only partial JD
- Remove company/role info
- Skip technical requirements

### For Resume Input
✅ **Do**:
- Use your most comprehensive resume
- Include all relevant experience
- Include metrics and numbers
- Keep technical details

❌ **Don't**:
- Use a stripped-down version
- Remove metrics
- Skip older relevant experience
- Leave out technologies

### For Best Output
✅ **Do**:
- Review AI output for accuracy
- Verify technical details
- Adjust metrics if needed
- Personalize the summary
- Keep bold formatting

❌ **Don't**:
- Use output blindly
- Remove bold formatting
- Make up metrics
- Copy without reviewing

---

## 🎯 Example Workflow

### Scenario: Applying for "Senior Java Developer - Full Time"

1. **Copy JD** from job posting
2. **Select**: Full-Time mode
3. **Upload**: Your master resume (PDF)
4. **Generate**: Click button
5. **Review**: Check Java mentions are accurate
6. **Copy**: Use "Copy All"
7. **Paste**: Into Word document
8. **Edit**: Adjust 1-2 bullets for personal touch
9. **Save**: As "Resume_CompanyName.docx"
10. **Apply**: Attach to application!

**Time**: ~5 minutes from start to tailored resume ⚡

---

## 🔧 Troubleshooting

### "Please enter your Gemini API key"
- Get free key at https://aistudio.google.com/app/apikey
- Paste in the password field at top

### "Failed to parse PDF file"
- Try uploading DOCX instead
- Or paste text directly
- Check if PDF is password-protected

### "Gemini API error"
- Verify key is correct (no extra spaces)
- Check you have quota remaining
- Try again in a few seconds

### Output looks wrong
- Verify JD was complete
- Check resume had enough detail
- Try regenerating
- Switch modes if needed

### Can't copy to Word
- Use the copy buttons provided
- Don't select and copy manually
- Formatting tags will render in Word

---

## 📝 Output Format Examples

### Full-Time Summary Example:
```
Seasoned Full Stack Developer with **8+ years** of experience in **Java**, **Spring Boot**, **React**, and **AWS**. Proven track record of delivering **scalable microservices** serving **10M+ users** with **99.99% uptime**. Expert in **CI/CD**, **Docker**, **Kubernetes**, and **cloud-native architectures**.
```

### C-to-C Summary Example (first 3 bullets):
```
• Architected **microservices** using **Spring Boot** and **Netflix OSS** serving **50K+ requests/second** with **sub-100ms latency**
• Implemented **event-driven architecture** with **Kafka** processing **5M events/day** achieving **99.99% reliability**
• Built **React** dashboards with **Redux** and **TypeScript** supporting **1000+ concurrent users** with **real-time updates**
...27 more bullets
```

---

## 🎓 Learning Resources

- **Gemini API**: https://ai.google.dev/docs
- **Resume Best Practices**: See RESUME_TAILOR_DOCS.md
- **ATS Optimization**: Use keywords from JD
- **Metrics**: Quantify achievements

---

## 🆘 Need Help?

1. Check error message in UI (red box)
2. Review browser console (F12)
3. Verify API key is valid
4. Try alternative input method
5. Check internet connection
6. See full docs: RESUME_TAILOR_DOCS.md

---

## ⭐ Success Checklist

Before you submit your application:

- [ ] JD was complete and detailed
- [ ] Mode matches job type (FT vs C2C)
- [ ] Resume input was comprehensive
- [ ] AI output reviewed for accuracy
- [ ] Technical details verified
- [ ] Metrics are accurate
- [ ] Bold formatting preserved
- [ ] Personalized 1-2 bullets
- [ ] Saved as final version
- [ ] Ready to attach and send!

---

**Time from JD to tailored resume: ~5 minutes** ⚡

**Cost: Free** (Gemini API has generous free tier) 💰

**Quality: Professional & ATS-optimized** ✨

Happy job hunting! 🎯
