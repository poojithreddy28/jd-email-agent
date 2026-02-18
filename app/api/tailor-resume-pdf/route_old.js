import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const jobDescription = formData.get('jobDescription');
    const resumeFile = formData.get('resumeFile');
    const resumeText = formData.get('resumeText');

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Extract resume content
    let resumeContent = '';
    if (resumeFile) {
      const buffer = await resumeFile.arrayBuffer();
      const fileType = resumeFile.name.toLowerCase();
      
      if (fileType.endsWith('.pdf')) {
        resumeContent = await extractTextFromPDF(buffer);
      } else if (fileType.endsWith('.docx') || fileType.endsWith('.doc')) {
        resumeContent = await extractTextFromDocx(buffer);
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
    } else if (resumeText) {
      resumeContent = resumeText;
    } else {
      // Load default resume if none provided
      console.log('📄 No resume provided, loading default resume...');
      const defaultResumePath = path.join(process.cwd(), 'defaultpoojithresume.txt');
      resumeContent = fs.readFileSync(defaultResumePath, 'utf-8');
    }

    console.log('📝 Starting JD-based resume tailoring...');

    // Step 1: Generate tailored content with AI
    const tailoredContent = await generateTailoredContent(jobDescription, resumeContent);
    
    // Step 2: Create PDF with formatting (multi-page allowed)
    console.log('📄 Generating PDF...');
    const { pdfPath, pageCount } = await generateResumePDF(tailoredContent);
    
    console.log(`✅ Resume generated successfully (${pageCount} page${pageCount !== 1 ? 's' : ''})`);
    
    // Read the final PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Clean up temp files
    setTimeout(() => {
      try {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 60000); // Clean up after 1 minute
    
    // Return PDF with metadata
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="PoojithResume_Tailored.pdf"',
        'X-Page-Count': pageCount.toString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in resume tailor:', error);
    return NextResponse.json(
      { error: 'Failed to generate resume: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to extract all bullets from a company section in resume
function extractCompanyBullets(resumeContent, companyName) {
  const lines = resumeContent.split('\n');
  const bullets = [];
  let inCompanySection = false;
  let nextSectionReached = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we've reached the company section
    if (line.includes(companyName)) {
      inCompanySection = true;
      continue;
    }
    
    // Check if we've reached the next section (another company or "Environment:")
    if (inCompanySection && (
      (line.startsWith('Environment:') && i > 0) ||
      (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+.*\d{4}/) && !line.includes(companyName))
    )) {
      nextSectionReached = true;
      break;
    }
    
    // Extract bullets (lines starting with •)
    if (inCompanySection && line.startsWith('•')) {
      bullets.push(line.substring(1).trim());
    }
  }
  
  console.log(`📌 Extracted ${bullets.length} bullets for ${companyName}`);
  return bullets;
}

// Helper function to extract technical skills
function extractTechnicalSkills(resumeContent) {
  const lines = resumeContent.split('\n');
  const skills = {};
  let inSkillsSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Technical Skills:')) {
      inSkillsSection = true;
      continue;
    }
    
    if (inSkillsSection && line.includes('Work Experience') || line.includes('WORK EXPERIENCE')) {
      break;
    }
    
    if (inSkillsSection && line.includes('\t')) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const category = parts[0].trim();
        const items = parts.slice(1).join(' ').trim();
        if (category && items) {
          skills[category] = items;
        }
      }
    }
  }
  
  return skills;
}

async function generateTailoredContent(jobDescription, resumeContent) {
  console.log('\n🚀 Starting MULTI-PASS content generation...\n');
  
  // Extract original company bullets
  const stateOfTexasBullets = extractCompanyBullets(resumeContent, 'State of Texas');
  const costcoBullets = extractCompanyBullets(resumeContent, 'Costco');
  const wiproBullets = extractCompanyBullets(resumeContent, 'Wipro');
  const technicalSkills = extractTechnicalSkills(resumeContent);
  
  // PASS 1: Generate Summary (30 bullets)
  console.log('📝 PASS 1: Generating 30-bullet summary...');
  const summaryPrompt = `You are an expert resume writer. Generate a comprehensive professional summary for this candidate.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeContent}

TASK: Generate EXACTLY 30 bullet points for the PROFESSIONAL SUMMARY section.

REQUIREMENTS:
1. Extract the candidate's real name, title, email, and phone from the resume
2. Each bullet must be 150-200 characters long
3. Tailor bullets to highlight skills matching the job description
4. Focus on: years of experience, technical expertise, achievements, certifications
5. Make every bullet achievement-oriented with metrics where possible

OUTPUT FORMAT (JSON only, no other text):
{
  "name": "Candidate Real Name",
  "title": "Senior Java Full Stack Developer",
  "email": "real@email.com",
  "phone": "real-phone",
  "summary": [
    "First bullet point here...",
    "Second bullet point here...",
    "...exactly 30 bullets total..."
  ]
}

🚨 CRITICAL: You must generate EXACTLY 30 bullets. Count them before responding.`;

  const summaryResponse = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3:latest",
      prompt: summaryPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: -1,
        num_ctx: 8192
      }
    })
  });
  
  const summaryData = await summaryResponse.json();
  const summaryText = summaryData.response || '';
  const summaryStart = summaryText.indexOf('{');
  const summaryEnd = summaryText.lastIndexOf('}');
  const summaryParsed = JSON.parse(summaryText.slice(summaryStart, summaryEnd + 1));
  
  console.log(`✅ Summary generated: ${summaryParsed.summary?.length || 0} bullets\n`);
  
  // PASS 2: Generate Bank of America bullets (30 bullets)
  console.log('📝 PASS 2: Generating 30 bullets for Bank of America...');
  const boaPrompt = `You are an expert resume writer. Generate comprehensive work experience bullets for Bank of America.
   - Extract ACTUAL phone, email, LinkedIn from resume
   - NEVER use placeholder names like "John Doe"

2. PROFESSIONAL SUMMARY - YOU MUST WRITE EXACTLY 30 BULLETS:
   ⚠️ NOT 8 bullets. NOT 15 bullets. EXACTLY 30 BULLETS.
   
   Requirements for EACH of the 30 bullets:
   - 150-200 characters MINIMUM (approximately 1.5-2 lines)
   - Start with action verbs: Architected, Engineered, Designed, Developed, Implemented, Built, Created
   - Include specific technologies from the job description
   - Add quantifiable metrics (percentages, numbers, scale, time savings)
   - Match keywords from the job description
   
   Example format (use this style for ALL 30):
   "Architected and deployed a microservices-based payment processing system using Java Spring Boot, Apache Kafka, and Docker, handling 50,000+ transactions per day with 99.9% uptime while reducing system latency by 40%."
   
   🚨 CRITICAL: Write all 30 bullets in full. Do NOT use "...", do NOT truncate, do NOT say "and more".

3. TECHNICAL SKILLS:
   Extract ALL skill categories from the resume:
   - Languages (Java, Python, SQL, JavaScript, etc.)
   - Java/J2EE Technologies
   - Frameworks (Spring, Hibernate, Angular, React, etc.)
   - Web Technologies
   - Databases
   - DevOps & Cloud Tooling
   - Tools

4. WORK EXPERIENCE - EXACTLY 5 COMPANIES:

   A. Bank of America - WRITE EXACTLY 30 NEW TAILORED BULLETS:
      🚨 NOT 3 bullets. NOT 10 bullets. EXACTLY 30 DETAILED BULLETS.
      
      Each bullet requirements:
      - 150-200 characters (1.5-2 lines)
      - Include specific technologies from JD
      - Add metrics and achievements
      - Align with JD requirements
      
      Example: "Implemented Executor Framework and Java concurrency utilities to parallelize vehicle data ingestion, reducing processing latency by 30% and improving throughput for high-volume transaction processing."
      
      🚨 Write ALL 30 bullets completely. NO shortcuts, NO "...", NO truncation.
   
   B. UnitedHealth Group - WRITE EXACTLY 30 NEW TAILORED BULLETS:
      🚨 Same as Bank of America: EXACTLY 30 detailed bullets (150-200 chars each)
      - Align with healthcare/insurance domain if relevant
      - Include JD keywords and technologies
      - Add metrics and impact statements
      
      🚨 Write ALL 30 bullets completely. NO shortcuts, NO "...", NO truncation.
   
   C. State of Texas:
      Copy EVERY SINGLE bullet from the resume for this company
      - Do NOT modify the text
      - Do NOT shorten or summarize
      - Copy word-for-word from the original resume
   
   D. Costco:
      Copy EVERY SINGLE bullet from the resume for this company
      - Do NOT modify the text
      - Do NOT shorten or summarize
   
   E. Wipro:
      Copy EVERY SINGLE bullet from the resume for this company
      - Do NOT modify the text
      - Do NOT shorten or summarize

5. JSON FORMAT REQUIREMENTS:
   - Return ONLY valid JSON
   - NO markdown code fences
   - NO "..." or truncation anywhere
   - NO comments in JSON
   - Write out EVERY bullet in full

OUTPUT JSON STRUCTURE:

IMPORTANT: The response must be ONLY valid JSON. No comments, no parentheses, no instructions inside the JSON.

{
  "header": {
    "name": "Poojith Reddy A",
    "title": "Senior Java Full Stack Developer",
    "phone": "+1 (312) 536-9779",
    "email": "poojithreddy.se@gmail.com",
    "linkedin": "https://www.linkedin.com/in/poojith-reddy-a/"
  },
  "summary": [
    "Architected scalable microservices using Java Spring Boot and Docker with 99.9% uptime handling 50K+ daily transactions",
    "Engineered data pipelines with Apache Kafka and Spark processing 2TB daily improving performance by 60%",
    "Designed secure REST APIs using Spring Security and OAuth2 supporting 100K+ authenticated requests per day",
    "Implemented CI/CD pipelines with Jenkins and GitLab reducing deployment time by 40% across 20+ microservices",
    "Developed responsive UIs using React.js and Angular with Redux state management serving 500K+ monthly users"
  ],
  "skills": {
    "Languages": "Java (8/11/17), Python, SQL, TypeScript, JavaScript",
    "Java/J2EE Technologies": "Servlets, Spring, JPA, JTA, JDBC",
    "Frameworks": "Spring 5.0, Spring MVC, Spring Boot, Hibernate",
    "Web Technologies": "HTML5, CSS3, Angular, React.js, Node.js",
    "Databases": "SQL Server, MySQL, Oracle, MongoDB, PostgreSQL",
    "DevOps & Cloud Tooling": "GitLab CI/CD, Jenkins, Docker, Kubernetes, AWS",
    "Tools": "Eclipse, IntelliJ, Maven, Gradle, Git"
  },
  "experiences": [
    {
      "company": "Bank of America",
      "location": "Jersey City, NJ, USA",
      "title": "Senior Java Full Stack Developer",
      "duration": "Dec 2023 – Current",
      "bullets": [
        "Architected and deployed a microservices-based payment processing system using Java Spring Boot, Apache Kafka, and Docker, handling 50,000+ transactions per day with 99.9% uptime while reducing system latency by 40%.",
        "Engineered efficient data processing pipelines leveraging Apache Kafka, Spark, and Hadoop for real-time insights, processing 2TB of data daily and improving data analytics performance by 60%.",
        "Designed and developed a scalable and secure API gateway using Java Spring Boot, NGINX, and Docker, handling 100,000+ requests per hour with 99.9% uptime and reducing latency by 30%.",
        "Implemented comprehensive CI/CD workflows using GitLab pipelines and Docker enabling rapid deployment of 20+ microservices to AWS ECS with automated rollback capabilities.",
        "Developed responsive Single Page Applications using Angular 11, TypeScript, and Bootstrap4 with custom directives for reusable components serving 500,000+ monthly active users.",
        "Built RESTful APIs with Spring MVC and Hibernate ensuring efficient data persistence with Redis caching reducing database load by 45% during peak traffic hours."
      ]
    },
    {
      "company": "United Health Group",
      "location": "Chicago, IL, USA",
      "title": "Java Full Stack Developer II",
      "duration": "Aug 2020 – July 2023",
      "bullets": [
        "Developed a real-time analytics dashboard using D3.js, React.js, and MySQL for healthcare insights, resulting in a 20% increase in targeted marketing campaigns and serving 15 million member records.",
        "Built a cloud-based data warehousing solution using Amazon Redshift, AWS Glue, and Apache Hive, processing 10TB of patient data daily with 99.9% uptime and improving query performance by 50%.",
        "Implemented secure REST APIs with Spring Boot and Spring Security for HIPAA-compliant healthcare data exchange across 50+ integrated systems handling 2 million daily transactions.",
        "Engineered real-time data synchronization pipelines using Apache Kafka connecting 30+ healthcare providers enabling instant claim processing and reducing manual reconciliation by 70%.",
        "Designed and deployed microservices architecture using Spring Cloud and Docker Kubernetes orchestration supporting 100+ healthcare applications with auto-scaling capabilities.",
        "Developed comprehensive unit and integration tests using JUnit, Mockito, and Selenium achieving 90%+ code coverage and reducing production defects by 55%."
      ]
    },
    {
      "company": "State of Texas",
      "location": "Austin, TX, USA",
      "title": "Java Developer",
      "duration": "Feb 2014 – Dec 2016",
      "bullets": [
        "Designed and developed interactive user interfaces using HTML, DHTML, JavaScript, and CSS",
        "Implemented robust server-side solutions leveraging the Spring Framework version 3 with Java EE"
      ]
    },
    {
      "company": "Costco",
      "location": "Seattle, WA",
      "title": "Java Developer",
      "duration": "Feb 2014 – Dec 2016",
      "bullets": [
        "Developed and analyzed the front-end and back-end using JSP, Servlets, and Spring",
        "Configured Spring framework files to meet application requirements and developed web services for non-Java clients"
      ]
    },
    {
      "company": "Wipro",
      "location": "Hyderabad, India",
      "title": "Java Developer",
      "duration": "Feb 2014 – Dec 2016",
      "bullets": [
        "Developed customized reports and Unit Testing using JUnit and Mockito",
        "Used Struts framework to maintain MVC and created action forms, action mappings, DAOs, application properties for Internationalization"
      ]
    }
  ]
}

NOTE: The above shows only 5-6 bullets per section as an example. YOU MUST GENERATE ALL 30 BULLETS for summary, Bank of America, and UnitedHealth Group. For State of Texas, Costco, and Wipro, copy ALL bullets from the original resume exactly as they appear.

⚠️ DETAILED BULLET EXAMPLES:

✅ CORRECT FORMAT (this is what you should generate):
"Architected and deployed a microservices-based payment processing system using Java Spring Boot, Apache Kafka, and Docker, handling 50,000+ transactions per day with 99.9% uptime while reducing system latency by 40%."

"Engineered efficient data processing pipelines leveraging Apache Kafka, Spark, and Hadoop for real-time insights, processing 2TB of healthcare data daily and improving data analytics performance by 60% for 15 million member records."

"Implemented secure authentication and authorization mechanisms using OAuth 2.0 and JWT for API access control, protecting sensitive financial data and supporting 100,000+ daily authenticated requests."

❌ WRONG - DO NOT DO THIS:
"Bullet 1: 150-200 characters with JD tech and metrics..."
"...WRITE ALL 30 BULLETS IN FULL..."
"(continue writing remaining bullets)"

🚨 ABSOLUTE RULE: Every bullet MUST be a complete sentence with real content. NO placeholders, NO instructions, NO shortcuts.

⚠️ CRITICAL REMINDERS BEFORE YOU START:
- DO NOT use "John Doe" or placeholder names
- EXTRACT actual candidate name, phone, email from resume  
- Summary: Write ALL 30 bullets in full (150-200 chars each)
- Bank of America: Write ALL 30 NEW bullets in full (150-200 chars each)
- UnitedHealth Group: Write ALL 30 NEW bullets in full (150-200 chars each)
- State of Texas/Costco/Wipro: Copy ALL original bullets EXACTLY word-for-word
- NEVER use "...", "etc.", "and more", or any truncation
- NEVER say "remaining bullets follow same pattern"
- WRITE EVERY SINGLE BULLET COMPLETELY

🚨 YOUR RESPONSE MUST INCLUDE:
- Exactly 30 summary bullets (all written out)
- Exactly 30 Bank of America bullets (all new, all written out)
- Exactly 30 UnitedHealth Group bullets (all new, all written out)
- All State of Texas bullets (copied exactly from resume)
- All Costco bullets (copied exactly from resume)
- All Wipro bullets (copied exactly from resume)

This is a REAL resume that will be submitted to employers. Take your time and write COMPLETE content.

🎯 INSTRUCTIONS FOR GENERATING BULLETS:

For Bank of America (30 NEW bullets):
1. Read the job description carefully
2. Identify key technologies, skills, and requirements
3. For EACH of the 30 bullets, write a complete sentence that includes:
   - Action verb (Architected, Engineered, Designed, Developed, etc.)
   - Specific technology from JD
   - Quantifiable metric or impact
   - Business context
4. Make each bullet 150-200 characters long
5. DO NOT write placeholder text like "Bullet 1:" or "..." or "(continue)"
6. WRITE OUT every single one of the 30 bullets as complete sentences

For UnitedHealth Group (30 NEW bullets):
- Follow the exact same process as Bank of America
- Align with healthcare/insurance domain
- Write ALL 30 bullets as complete sentences

For State of Texas, Costco, Wipro:
- Find these companies in the candidate's resume
- Copy EVERY bullet point from those companies EXACTLY as written
- Do NOT modify, summarize, or shorten them

🚨 FINAL CHECK BEFORE YOU SUBMIT YOUR RESPONSE:
- Count your summary bullets - is it EXACTLY 30? If not, add more until it is 30.
- Count Bank of America bullets - is it EXACTLY 30? If not, add more until it is 30.
- Count UnitedHealth Group bullets - is it EXACTLY 30? If not, add more until it is 30.
- Your JSON response should be VERY LONG (probably 15,000+ words)
- If your response feels short, you haven't written enough bullets

This resume will be printed and reviewed by hiring managers. It must be complete and professional.

START GENERATING NOW - Return valid JSON with ALL bullets written out:`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Even lower temperature for consistency
          num_predict: -1, // No limit - generate complete content
          num_ctx: 8192, // Larger context window for long responses
          top_p: 0.9,
          repeat_penalty: 1.1,
          stop: [] // Don't stop early
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to connect to Ollama');
    }

    const data = await response.json();
    let jsonText = data.response.trim();
    
    // Remove markdown code fences
    jsonText = jsonText.replace(/^```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
    
    // Check for truncation indicators - if found, the AI didn't complete the task
    if (jsonText.includes('...') || jsonText.includes('etc.') || jsonText.includes('[more bullets]')) {
      console.error('❌ AI response contains truncation indicators ("...", "etc."). Response incomplete.');
      console.log('First 500 chars of response:', jsonText.substring(0, 500));
    }
    
    // Extract JSON
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure and check for placeholder text
    console.log(`📊 Summary bullets: ${parsed.summary?.length || 0}`);
    console.log(`📊 Work experiences: ${parsed.experiences?.length || 0}`);
    
    // Log first 2 bullets from summary to see quality
    if (parsed.summary && parsed.summary.length > 0) {
      console.log(`📝 Sample summary bullet 1: "${parsed.summary[0].substring(0, 100)}..."`);
      if (parsed.summary.length > 1) {
        console.log(`📝 Sample summary bullet 2: "${parsed.summary[1].substring(0, 100)}..."`);
      }
    }
    
    // Check for placeholder text in bullets
    const checkForPlaceholders = (bullets, companyName) => {
      const placeholderPatterns = [
        /bullet \d+/i,
        /\.\.\./,
        /continue/i,
        /write all/i,
        /no shortcuts/i,
        /150-200 characters/i,
        /\(more bullets\)/i
      ];
      
      let placeholderCount = 0;
      bullets.forEach((bullet, idx) => {
        placeholderPatterns.forEach(pattern => {
          if (pattern.test(bullet)) {
            console.error(`❌ ${companyName} bullet ${idx + 1} contains placeholder text: "${bullet.substring(0, 100)}..."`);
            placeholderCount++;
          }
        });
      });
      
      return placeholderCount;
    };
    
    if (parsed.experiences && parsed.experiences.length >= 2) {
      console.log(`📊 ${parsed.experiences[0].company} bullets: ${parsed.experiences[0].bullets.length}`);
      console.log(`📊 ${parsed.experiences[1].company} bullets: ${parsed.experiences[1].bullets.length}`);
      
      // Log sample bullets from work experience
      if (parsed.experiences[0].bullets.length > 0) {
        console.log(`📝 Sample ${parsed.experiences[0].company} bullet 1: "${parsed.experiences[0].bullets[0].substring(0, 100)}..."`);
      }
      
      // Check for placeholders in work experience
      const bank1Placeholders = checkForPlaceholders(parsed.experiences[0].bullets, parsed.experiences[0].company);
      const bank2Placeholders = checkForPlaceholders(parsed.experiences[1].bullets, parsed.experiences[1].company);
      
      if (parsed.summary?.length < 30) {
        console.warn(`⚠️ Summary has only ${parsed.summary.length} bullets (expected 30)`);
      }
      if (parsed.experiences[0].bullets.length < 30) {
        console.warn(`⚠️ ${parsed.experiences[0].company} has only ${parsed.experiences[0].bullets.length} bullets (expected 30)`);
      }
      if (parsed.experiences[1].bullets.length < 30) {
        console.warn(`⚠️ ${parsed.experiences[1].company} has only ${parsed.experiences[1].bullets.length} bullets (expected 30)`);
      }
    }
    
    // Filter out ONLY obvious placeholder bullets from summary (very conservative)
    if (parsed.summary) {
      const originalSummaryCount = parsed.summary.length;
      parsed.summary = parsed.summary.filter(bullet => {
        const isPlaceholder = (
          /^bullet \d+:/i.test(bullet) || // Starts with "Bullet 1:"
          /^\.\.\./i.test(bullet) || // Starts with "..."
          /^write all/i.test(bullet) || // Starts with "write all"
          (bullet.startsWith('(') && bullet.endsWith(')')) || // Fully parenthesized instruction
          bullet.length < 40 // Very short (likely incomplete)
        );
        return !isPlaceholder;
      });
      
      const filteredSummaryCount = originalSummaryCount - parsed.summary.length;
      if (filteredSummaryCount > 0) {
        console.log(`🧹 Filtered out ${filteredSummaryCount} placeholder bullets from Summary`);
      }
    }
    
    // Filter out ONLY obvious placeholder bullets from work experience (very conservative)
    if (parsed.experiences) {
      parsed.experiences.forEach(exp => {
        const originalCount = exp.bullets.length;
        exp.bullets = exp.bullets.filter(bullet => {
          // Remove ONLY obvious placeholders or instructions
          const isPlaceholder = (
            /^bullet \d+:/i.test(bullet) || // Starts with "Bullet 1:"
            /^\.\.\./i.test(bullet) || // Starts with "..."
            /^write all/i.test(bullet) || // Starts with instruction
            /^continue writing/i.test(bullet) || // Starts with instruction
            /^no shortcuts/i.test(bullet) || // Starts with instruction
            /^\(copy all/i.test(bullet) || // Starts with instruction  
            /^\(continue/i.test(bullet) || // Starts with instruction
            (bullet.startsWith('(') && bullet.endsWith(')') && bullet.length < 100) || // Short instruction in parentheses
            bullet.length < 40 // Very short (likely incomplete)
          );
          return !isPlaceholder;
        });
        
        const filteredCount = originalCount - exp.bullets.length;
        if (filteredCount > 0) {
          console.log(`🧹 Filtered out ${filteredCount} placeholder bullets from ${exp.company}`);
        }
        
        console.log(`✅ Final bullet count for ${exp.company}: ${exp.bullets.length}`);
      });
    }
    
    // Log final counts after filtering
    console.log(`\n📊 FINAL CONTENT SUMMARY:`);
    console.log(`   Summary: ${parsed.summary?.length || 0} bullets`);
    if (parsed.experiences) {
      parsed.experiences.forEach(exp => {
        console.log(`   ${exp.company}: ${exp.bullets.length} bullets`);
      });
    }
    console.log(`   Expected: Summary 30, Bank 30, UnitedHealth 30, Others: All from resume\n`);
    
    return parsed;
    
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate tailored content: ' + error.message);
  }
}

async function generateResumePDF(content) {
  const timestamp = Date.now();
  const pdfPath = path.join(TEMP_DIR, `resume-${timestamp}.pdf`);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });
  
  const pageWidth = 612; // Letter width in points
  const pageHeight = 792; // Letter height in points
  const margin = 40;
  const maxWidth = pageWidth - (margin * 2);
  let y = margin;
  
  // Helper to add text with word wrapping
  const addText = (text, x, yPos, options = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    const maxW = options.maxWidth || maxWidth;
    const lineHeightMultiplier = options.lineHeight || 1.2; // Better default line height
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    const lines = doc.splitTextToSize(text, maxW);
    const lineHeight = fontSize * lineHeightMultiplier;
    
    if (align === 'center') {
      lines.forEach((line, idx) => {
        doc.text(line, pageWidth / 2, yPos + (idx * lineHeight), { align: 'center' });
      });
    } else {
      lines.forEach((line, idx) => {
        doc.text(line, x, yPos + (idx * lineHeight));
      });
    }
    
    return lines.length * lineHeight;
  };
  
  // Header - Name
  y += addText(content.header.name, margin, y, { 
    fontSize: 18, 
    fontStyle: 'bold', 
    align: 'center' 
  });
  y += 6;
  
  // Header - Title
  y += addText(content.header.title, margin, y, { 
    fontSize: 11, 
    fontStyle: 'normal', 
    align: 'center' 
  });
  y += 8;
  
  // Contact info with light blue background
  const contact = `Phone: ${content.header.phone} | Email: ${content.header.email}`;
  const contactHeight = 18;
  
  // Draw light blue background for contact info
  doc.setFillColor(220, 235, 245); // Light blue
  doc.rect(margin, y - 3, maxWidth, contactHeight, 'F');
  
  doc.setTextColor(0, 0, 0);
  y += addText(contact, margin, y + 4, { 
    fontSize: 9, 
    align: 'center' 
  });
  
  if (content.header.linkedin) {
    y += addText(content.header.linkedin, margin, y + 2, { 
      fontSize: 9, 
      align: 'center' 
    });
  }
  
  y += 14;
  
  // Professional Summary Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFESSIONAL SUMMARY', margin, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2); // Full width underline
  y += 14;
  
  // Summary bullets with proper spacing for 2-line bullets
  content.summary.forEach((bullet, index) => {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    
    const bulletText = `• ${bullet}`;
    const bulletHeight = addText(bulletText, margin + 5, y, { 
      fontSize: 8.5,
      maxWidth: maxWidth - 5,
      lineHeight: 1.4 // Better spacing for 2-line bullets
    });
    y += bulletHeight + 3; // Spacing between bullets
  });
  
  y += 10;
  
  // Technical Skills Section
  if (content.skills) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICAL SKILLS', margin, y);
    doc.line(margin, y + 2, pageWidth - margin, y + 2); // Full width underline
    y += 12;
    
    Object.entries(content.skills).forEach(([category, skills]) => {
      const skillText = `${category}: ${skills}`;
      const skillHeight = addText(skillText, margin, y, { 
        fontSize: 8,
        lineHeight: 1.2
      });
      y += skillHeight + 3;
    });
    
    y += 8;
  }
  
  // Work Experience Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('WORK EXPERIENCE', margin, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2); // Full width underline
  y += 14;
  
  content.experiences.forEach((exp, expIndex) => {
    // Check if we need a new page for company header
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }
    
    // Company name and duration on same line
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const companyText = exp.company;
    const durationText = exp.duration;
    
    doc.text(companyText, margin, y);
    doc.text(durationText, pageWidth - margin - doc.getTextWidth(durationText), y);
    y += 14;
    
    // Title
    const titleHeight = addText(exp.title, margin, y, { 
      fontSize: 10, 
      fontStyle: 'normal',
      lineHeight: 1.2
    });
    y += titleHeight + 6;
    
    // "Responsibilities:" label
    const respHeight = addText('Responsibilities:', margin, y, { 
      fontSize: 9,
      fontStyle: 'bold',
      lineHeight: 1.2
    });
    y += respHeight + 4;
    
    // Experience bullets with better spacing for 2-line bullets
    exp.bullets.forEach((bullet, bulletIndex) => {
      // Check if we need a new page
      if (y > pageHeight - 50) {
        doc.addPage();
        y = margin + 20;
      }
      
      const bulletText = `\u2022 ${bullet}`;
      const bulletHeight = addText(bulletText, margin + 5, y, { 
        fontSize: 8.5,
        maxWidth: maxWidth - 5,
        lineHeight: 1.4 // Better spacing for 2-line bullets
      });
      y += bulletHeight + 3; // More spacing between 2-line bullets
    });
    
    if (expIndex < content.experiences.length - 1) {
      y += 12;
    }
  });
  
  // Save PDF
  const pdfBuffer = doc.output('arraybuffer');
  fs.writeFileSync(pdfPath, Buffer.from(pdfBuffer));
  
  // Get page count directly from jsPDF
  const pageCount = doc.internal.pages.length - 1; // -1 because first element is metadata
  console.log(`📄 PDF has ${pageCount} page(s)`);
  
  return { pdfPath, pageCount };
}

async function extractTextFromPDF(buffer) {
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parse error:', error);
    // Fallback: suggest using text input
    throw new Error('PDF file upload not supported in this mode. Please use "Text View" mode for PDF uploads, or paste your resume text directly.');
  }
}

async function extractTextFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file. Please try pasting the resume text directly instead.');
  }
}
