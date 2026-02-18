import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, convertInchesToTwip, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(req) {
  const startTime = Date.now();
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

    console.log('📝 Starting JD-based resume tailoring (MULTI-PASS APPROACH)...');

    // Generate tailored content with multiple API calls
    const tailoredContent = await generateTailoredContent(jobDescription, resumeContent);
    
    // Create DOCX with formatting
    console.log('\n📄 Generating DOCX...');
    const docxPath = await generateResumeDOCX(tailoredContent);
    
    const endTime = Date.now();
    const totalSeconds = ((endTime - startTime) / 1000).toFixed(0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const generationTime = minutes > 0 ? `${minutes} min ${seconds} sec` : `${seconds} sec`;
    console.log(`✅ Resume generated successfully in ${generationTime}`);
    
    // Read the final DOCX
    const docxBuffer = fs.readFileSync(docxPath);
    
    // Generate HTML preview
    const htmlPreview = generateHTMLPreview(tailoredContent);
    
    // Convert DOCX to base64 for frontend
    const docxBase64 = docxBuffer.toString('base64');
    
    // Clean up temp files
    setTimeout(() => {
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 60000);
    
    // Return JSON with preview data
    return NextResponse.json({
      htmlPreview,
      docxBase64,
      generationTime,
      filename: 'PoojithResume_Tailored.docx'
    });
    
  } catch (error) {
    console.error('❌ Error in resume tailor:', error);
    return NextResponse.json(
      { error: 'Failed to generate resume: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper: Extract bullets from a company section
function extractCompanyBullets(resumeContent, companyName) {
  const lines = resumeContent.split('\n');
  const bullets = [];
  let inCompanySection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.toLowerCase().includes(companyName.toLowerCase())) {
      inCompanySection = true;
      continue;
    }
    
    if (inCompanySection && (line.startsWith('Environment:') || 
        (line.match(/^[A-Z][\w\s]+,\s+[\w\s]+,\s+[\w\s]+\s+\w{3}\s+\d{4}/)))) {
      break;
    }
    
    if (inCompanySection && line.startsWith('•')) {
      bullets.push(line.substring(1).trim());
    }
  }
  
  console.log(`📌 Extracted ${bullets.length} original bullets for ${companyName}`);
  return bullets;
}

// Helper: Extract technical skills
function extractTechnicalSkills(resumeContent) {
  const lines = resumeContent.split('\n');
  const skills = {};
  let inSkillsSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Technical Skills:') || line.includes('TECHNICAL SKILLS')) {
      inSkillsSection = true;
      continue;
    }
    
    if (inSkillsSection && (line.includes('Work Experience') || line.includes('WORK EXPERIENCE') || line.includes('Environment:'))) {
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

// MAIN GENERATION FUNCTION - MULTI-PASS APPROACH
async function generateTailoredContent(jobDescription, resumeContent) {
  console.log('\n🚀 Starting MULTI-PASS content generation...\n');
  
  // STEP 1: Extract original bullets for companies that don't need AI tailoring
  console.log('📌 STEP 1: Extracting original bullets from resume...');
  const stateOfTexasBullets = extractCompanyBullets(resumeContent, 'State of Texas');
  const costcoBullets = extractCompanyBullets(resumeContent, 'Costco');
  const wiproBullets = extractCompanyBullets(resumeContent, 'Wipro');
  const technicalSkills = extractTechnicalSkills(resumeContent);
  
  console.log(`   - State of Texas: ${stateOfTexasBullets.length} bullets`);
  console.log(`   - Costco: ${costcoBullets.length} bullets`);
  console.log(`   - Wipro: ${wiproBullets.length} bullets`);
  console.log(`   - Technical Skills: ${Object.keys(technicalSkills).length} categories\n`);
  
  // STEP 2: API call for Summary (30 bullets)
  console.log('📝 STEP 2: Generating Summary (30 bullets) via Ollama...');
  const summaryPrompt = `You are an expert resume writer. Generate a comprehensive professional summary tailored to this job.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeContent}

TASK: Generate EXACTLY 30 bullet points for the PROFESSIONAL SUMMARY section.

REQUIREMENTS:
1. Extract the candidate's real name, title, email, and phone from the resume
2. Each bullet must be 150-200 characters minimum
3. Tailor bullets to highlight skills matching the job description
4. Focus on: years of experience, technical expertise, achievements with metrics
5. Use action verbs: Architected, Engineered, Designed, Developed, Built, Implemented

OUTPUT FORMAT (JSON only, no extra text):
{
  "name": "Real Name From Resume",
  "title": "Senior Java Full Stack Developer",
  "email": "real@email.com",
  "phone": "real-phone",
  "summary": [
    "First comprehensive bullet about experience and skills...",
    "Second comprehensive bullet with metrics and achievements...",
    "...continue until you have EXACTLY 30 bullets..."
  ]
}

🚨 CRITICAL RULES:
1. Return ONLY the JSON object - no explanation, no commentary, no text before or after
2. Generate ALL 30 bullets - Do NOT truncate or use "..." or "continue..."
3. Write every single bullet in full detail
4. Start your response with { and end with }`;

  let summaryParsed;
  let retryCount = 0;
  const maxRetries = 3;
  const minAcceptable = 25; // Accept 25+ bullets
  let summaryResponse;
  
  while (retryCount < maxRetries) {
    summaryResponse = await callOllama(summaryPrompt);
    
    try {
      summaryParsed = extractJSON(summaryResponse);
      
      if (summaryParsed.summary && summaryParsed.summary.length >= minAcceptable) {
        console.log(`✅ Summary: ${summaryParsed.summary.length} bullets generated\n`);
        break;
      } else {
        retryCount++;
        console.log(`⚠️ Summary attempt ${retryCount}: Got ${summaryParsed.summary?.length || 0} bullets (need 25+), retrying...`);
        if (retryCount >= maxRetries) {
          // Accept what we have after max retries
          console.log(`✅ Summary: ${summaryParsed.summary.length} bullets generated (after ${retryCount} attempts)\n`);
          break;
        }
      }
    } catch (error) {
      retryCount++;
      console.error(`❌ Summary parse error (attempt ${retryCount}):`, error.message);
      if (retryCount >= maxRetries) {
        console.error('📄 Raw response preview:', summaryResponse.substring(0, 1000));
        throw new Error(`Summary JSON parsing failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  // Final validation
  if (!summaryParsed || !summaryParsed.summary || summaryParsed.summary.length === 0) {
    throw new Error('Summary generation failed: No valid bullets generated after retries');
  }
  
  // STEP 3: API call for Bank of America (30 bullets)
  console.log('📝 STEP 3: Generating Bank of America (30 bullets) via Ollama...');
  const boaPrompt = `You are an expert resume writer. Generate comprehensive work experience bullets for Bank of America role.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ORIGINAL BANK OF AMERICA EXPERIENCE:
${resumeContent.split('Bank of America')[1]?.split('UnitedHealth Group')[0] || 'Dec 2023 – Current, Senior Java Full Stack Developer'}

TASK: Generate EXACTLY 30 bullet points for Bank of America work experience.

REQUIREMENTS:
1. Each bullet 150-200 characters minimum
2. Tailor to job description requirements
3. Include specific technologies, metrics, achievements
4. Use action verbs: Architected, Engineered, Designed, Developed
5. Make it comprehensive and detailed

OUTPUT FORMAT (JSON only):
{
  "company": "Bank of America",
  "location": "Jersey City, NJ",
  "period": "Dec 2023 – Current",
  "role": "Senior Java Full Stack Developer",
  "bullets": [
    "First comprehensive bullet with technologies and metrics...",
    "Second comprehensive bullet with achievements...",
    "...continue until EXACTLY 30 bullets total..."
  ]
}

🚨 CRITICAL RULES:
1. Return ONLY the JSON object - no explanation, no commentary, no text before or after
2. Generate ALL 30 bullets - Do NOT truncate
3. Write every single bullet in full detail
4. Start your response with { and end with }`;

  let boaParsed;
  retryCount = 0;
  let boaResponse;
  
  while (retryCount < maxRetries) {
    boaResponse = await callOllama(boaPrompt);
    
    try {
      boaParsed = extractJSON(boaResponse);
      
      if (boaParsed.bullets && boaParsed.bullets.length >= minAcceptable) {
        console.log(`✅ Bank of America: ${boaParsed.bullets.length} bullets generated\n`);
        break;
      } else {
        retryCount++;
        console.log(`⚠️ Bank of America attempt ${retryCount}: Got ${boaParsed.bullets?.length || 0} bullets (need 25+), retrying...`);
        if (retryCount >= maxRetries) {
          console.log(`✅ Bank of America: ${boaParsed.bullets.length} bullets generated (after ${retryCount} attempts)\n`);
          break;
        }
      }
    } catch (error) {
      retryCount++;
      console.error(`❌ Bank of America parse error (attempt ${retryCount}):`, error.message);
      if (retryCount >= maxRetries) {
        console.error('📄 Raw response preview:', boaResponse.substring(0, 1000));
        throw new Error(`Bank of America JSON parsing failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  // Final validation
  if (!boaParsed || !boaParsed.bullets || boaParsed.bullets.length === 0) {
    throw new Error('Bank of America generation failed: No valid bullets generated after retries');
  }
  
  // STEP 4: API call for UnitedHealth Group (30 bullets)
  console.log('📝 STEP 4: Generating UnitedHealth Group (30 bullets) via Ollama...');
  const uhgPrompt = `You are an expert resume writer. Generate comprehensive work experience bullets for UnitedHealth Group role.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ORIGINAL UNITEDHEALTH GROUP EXPERIENCE:
${resumeContent.split('UnitedHealth Group')[1]?.split('State of Texas')[0] || 'Aug 2020 – July 2023, Java Full Stack Developer II'}

TASK: Generate EXACTLY 30 bullet points for UnitedHealth Group work experience.

REQUIREMENTS:
1. Each bullet 150-200 characters minimum
2. Tailor to job description requirements
3. Include specific technologies, metrics, achievements
4. Use action verbs: Architected, Engineered, Designed, Developed
5. Make it comprehensive and detailed

OUTPUT FORMAT (JSON only):
{
  "company": "United Health Group",
  "location": "Chicago, IL",
  "period": "Aug 2020 – July 2023",
  "role": "Java Full Stack Developer II",
  "bullets": [
    "First comprehensive bullet with technologies and metrics...",
    "Second comprehensive bullet with achievements...",
    "...continue until EXACTLY 30 bullets total..."
  ]
}

🚨 CRITICAL RULES:
1. Return ONLY the JSON object - no explanation, no commentary, no text before or after
2. Generate ALL 30 bullets - Do NOT truncate
3. Write every single bullet in full detail
4. Start your response with { and end with }`;

  let uhgParsed;
  retryCount = 0;
  let uhgResponse;
  
  while (retryCount < maxRetries) {
    uhgResponse = await callOllama(uhgPrompt);
    
    try {
      uhgParsed = extractJSON(uhgResponse);
      
      if (uhgParsed.bullets && uhgParsed.bullets.length >= minAcceptable) {
        console.log(`✅ UnitedHealth Group: ${uhgParsed.bullets.length} bullets generated\n`);
        break;
      } else {
        retryCount++;
        console.log(`⚠️ UnitedHealth Group attempt ${retryCount}: Got ${uhgParsed.bullets?.length || 0} bullets (need 25+), retrying...`);
        if (retryCount >= maxRetries) {
          console.log(`✅ UnitedHealth Group: ${uhgParsed.bullets.length} bullets generated (after ${retryCount} attempts)\n`);
          break;
        }
      }
    } catch (error) {
      retryCount++;
      console.error(`❌ UnitedHealth Group parse error (attempt ${retryCount}):`, error.message);
      if (retryCount >= maxRetries) {
        console.error('📄 Raw response preview:', uhgResponse.substring(0, 1000));
        throw new Error(`UnitedHealth Group JSON parsing failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  // Final validation
  if (!uhgParsed || !uhgParsed.bullets || uhgParsed.bullets.length === 0) {
    throw new Error('UnitedHealth Group generation failed: No valid bullets generated after retries');
  }
  
  // STEP 5: Assemble final content with hardcoded correct candidate info
  console.log('📦 STEP 5: Assembling final resume structure...\n');
  
  const finalContent = {
    name: 'Poojith Reddy A',
    title: 'Senior Java Full Stack Developer',
    email: 'poojithreddy.se@gmail.com',
    phone: '312-536-9779',
    linkedin: 'https://www.linkedin.com/in/poojith-reddy-com/',
    summary: summaryParsed.summary,
    technicalSkills: technicalSkills,
    experiences: [
      {
        company: 'Bank of America',
        location: boaParsed.location || 'Jersey City, NJ',
        period: boaParsed.period || 'Dec 2023 – Current',
        role: boaParsed.role || 'Senior Java Full Stack Developer',
        bullets: boaParsed.bullets
      },
      {
        company: 'United Health Group',
        location: uhgParsed.location || 'Chicago, IL',
        period: uhgParsed.period || 'Aug 2020 – July 2023',
        role: uhgParsed.role || 'Java Full Stack Developer II',
        bullets: uhgParsed.bullets
      },
      {
        company: 'State of Texas',
        location: 'Austin, TX',
        period: 'Aug 2018 – Nov 2020',
        role: 'Java Full Stack Developer',
        bullets: stateOfTexasBullets
      },
      {
        company: 'Costco',
        location: 'Seattle, WA',
        period: 'Jan 2017 – July 2018',
        role: 'Java/J2EE Developer',
        bullets: costcoBullets
      },
      {
        company: 'Wipro',
        location: 'India',
        period: 'Feb 2014 – Dec 2016',
        role: 'Java Developer',
        bullets: wiproBullets
      }
    ]
  };
  
  // Log final summary
  console.log('📊 FINAL CONTENT SUMMARY:');
  console.log(`   Summary: ${finalContent.summary.length} bullets`);
  console.log(`   Bank of America: ${finalContent.experiences[0].bullets.length} bullets`);
  console.log(`   UnitedHealth Group: ${finalContent.experiences[1].bullets.length} bullets`);
  console.log(`   State of Texas: ${finalContent.experiences[2].bullets.length} bullets`);
  console.log(`   Costco: ${finalContent.experiences[3].bullets.length} bullets`);
  console.log(`   Wipro: ${finalContent.experiences[4].bullets.length} bullets`);
  console.log(`   Total bullets: ${finalContent.summary.length + finalContent.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0)}\n`);
  
  return finalContent;
}

// Helper: Call Ollama API
async function callOllama(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3:latest",
      prompt: prompt,
      stream: false,
      format: "json",  // Request JSON output format
      options: {
        temperature: 0.3,
        num_predict: -1,
        num_ctx: 8192,
        stop: []
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response || '';
}

// Helper: Extract JSON from response
function extractJSON(text) {
  // Try to find JSON in the response
  let start = text.indexOf('{');
  
  if (start === -1) {
    console.error('❌ No JSON object found in response');
    throw new Error('No valid JSON found in response');
  }
  
  // Find the matching closing brace by counting braces
  let braceCount = 0;
  let end = -1;
  
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') {
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        end = i;
        break;
      }
    }
  }
  
  if (end === -1 || end <= start) {
    console.error('❌ Could not find matching closing brace');
    throw new Error('No valid JSON found in response - unmatched braces');
  }
  
  const jsonStr = text.slice(start, end + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError.message);
    console.error('📄 Attempted to parse:', jsonStr.substring(0, 500) + '...');
    
    // Try to clean and parse again
    const cleaned = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .trim();
    
    try {
      return JSON.parse(cleaned);
    } catch (cleanedError) {
      console.error('❌ Even cleaned JSON failed to parse');
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
  }
}

// Helper: Make technical terms bold in text
function makeTechnicalTermsBold(text) {
  // Common technical terms to make bold
  const techTerms = [
    'Java', 'J2EE', 'Spring', 'Spring Boot', 'Spring MVC', 'Spring Cloud', 'Spring Security',
    'Hibernate', 'MyBatis', 'JPA', 'JDBC', 'REST', 'RESTful', 'SOAP', 'GraphQL',
    'Angular', 'React', 'Node.js', 'Express.js', 'Vue.js', 'TypeScript', 'JavaScript',
    'HTML5', 'CSS3', 'AJAX', 'jQuery', 'Bootstrap', 'Tailwind',
    'Docker', 'Kubernetes', 'EKS', 'AWS', 'Azure', 'EC2', 'S3', 'Lambda', 'RDS',
    'Microservices', 'Kafka', 'RabbitMQ', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL', 'Oracle',
    'Jenkins', 'GitLab', 'GitHub', 'CI/CD', 'Terraform', 'Ansible',
    'JUnit', 'Mockito', 'Selenium', 'Git', 'Maven', 'Gradle',
    'Tomcat', 'JBoss', 'WebSphere', 'JSON', 'XML', 'OAuth', 'JWT',
    'Python', 'SQL', 'NoSQL', 'Elasticsearch', 'Kibana', 'Logstash', 'ELK',
    'Prometheus', 'Grafana', 'CloudWatch', 'Snowflake', 'Spark', 'Flink'
  ];
  
  // Create regex pattern
  const pattern = new RegExp(`\\b(${techTerms.join('|')})\\b`, 'gi');
  
  // Split text by technical terms
  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(pattern);
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    // Add matched term (bold)
    parts.push({ text: match[0], bold: true });
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false });
  }
  
  return parts.length > 0 ? parts : [{ text, bold: false }];
}

// Generate DOCX from tailored content
async function generateResumeDOCX(content) {
  const sections = [];
  
  // Header - Name (large, bold, centered)
  sections.push(
    new Paragraph({
      text: content.name,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  );
  
  // Title (centered)
  sections.push(
    new Paragraph({
      text: content.title,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  );
  
  // Contact Info - Blue shaded box (like in image)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Phone: ${content.phone} | Email: ${content.email}`,
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      shading: {
        fill: 'D6EAF8',  // Light blue background
        val: 'clear'
      },
      spacing: { before: 100, after: 200 },
      border: {
        top: { color: '5DADE2', space: 1, style: 'single', size: 6 },
        bottom: { color: '5DADE2', space: 1, style: 'single', size: 6 },
        left: { color: '5DADE2', space: 1, style: 'single', size: 6 },
        right: { color: '5DADE2', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // LinkedIn
  const linkedinUrl = content.linkedin || 'https://www.linkedin.com/in/poojith-reddy-com/';
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'LinkedIn : ', size: 20 }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: linkedinUrl,
              color: '0563C1',
              underline: { type: UnderlineType.SINGLE },
              size: 20
            })
          ],
          link: linkedinUrl
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );
  
  // Professional Summary Section
  sections.push(
    new Paragraph({
      text: 'PROFESSIONAL SUMMARY',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // Summary bullets with bold technical terms
  for (const bullet of content.summary) {
    const parts = makeTechnicalTermsBold(bullet);
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• ', size: 20 }),
          ...parts.map(part => new TextRun({
            text: part.text,
            size: 20,
            bold: part.bold
          }))
        ],
        spacing: { after: 120 }
      })
    );
  }
  
  // Technical Skills Section
  sections.push(
    new Paragraph({
      text: 'TECHNICAL SKILLS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // Skills in table format
  const skillRows = [];
  for (const [category, skills] of Object.entries(content.technicalSkills)) {
    skillRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: category, bold: true, size: 20 })]
            })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: 'center',
            shading: { fill: 'E8F4F8' }
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: skills, size: 20 })]
            })],
            width: { size: 75, type: WidthType.PERCENTAGE },
            verticalAlign: 'center'
          })
        ]
      })
    );
  }
  
  sections.push(
    new Table({
      rows: skillRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
      }
    })
  );
  
  // Work Experience Section
  sections.push(
    new Paragraph({
      text: 'WORK EXPERIENCE',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // Experience entries
  for (const exp of content.experiences) {
    // Company name
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: exp.company, size: 22, bold: true })
        ],
        spacing: { before: 200, after: 50 }
      })
    );
    
    // Role, location, period
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${exp.role} | ${exp.location} | ${exp.period}`, size: 20 })
        ],
        spacing: { after: 100 }
      })
    );
    
    // Bullets with bold technical terms
    for (const bullet of exp.bullets) {
      const parts = makeTechnicalTermsBold(bullet);
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '• ', size: 20 }),
            ...parts.map(part => new TextRun({
              text: part.text,
              size: 20,
              bold: part.bold
            }))
          ],
          spacing: { after: 120 }
        })
      );
    }
  }
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.75)
          }
        }
      },
      children: sections
    }]
  });
  
  // Save DOCX
  const fileName = `PoojithResume_Tailored_${Date.now()}.docx`;
  const docxPath = path.join(TEMP_DIR, fileName);
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  
  return docxPath;
}

// Generate HTML preview for web display
function generateHTMLPreview(content) {
  const boldTechTerms = (text) => {
    const techTerms = [
      'Java', 'J2EE', 'Spring', 'Spring Boot', 'Spring MVC', 'Spring Cloud', 'Spring Security',
      'Hibernate', 'MyBatis', 'JPA', 'JDBC', 'REST', 'RESTful', 'SOAP', 'GraphQL',
      'Angular', 'React', 'Node.js', 'Express.js', 'Vue.js', 'TypeScript', 'JavaScript',
      'HTML5', 'CSS3', 'AJAX', 'jQuery', 'Bootstrap', 'Tailwind',
      'Docker', 'Kubernetes', 'EKS', 'AWS', 'Azure', 'EC2', 'S3', 'Lambda', 'RDS',
      'Microservices', 'Kafka', 'RabbitMQ', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL', 'Oracle',
      'Jenkins', 'GitLab', 'GitHub', 'CI/CD', 'Terraform', 'Ansible',
      'JUnit', 'Mockito', 'Selenium', 'Git', 'Maven', 'Gradle',
      'Tomcat', 'JBoss', 'WebSphere', 'JSON', 'XML', 'OAuth', 'JWT',
      'Python', 'SQL', 'NoSQL', 'Elasticsearch', 'Kibana', 'Logstash', 'ELK',
      'Prometheus', 'Grafana', 'CloudWatch', 'Snowflake', 'Spark', 'Flink'
    ];
    
    const pattern = new RegExp(`\\b(${techTerms.join('|')})\\b`, 'gi');
    return text.replace(pattern, '<strong>$1</strong>');
  };
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Calibri, Arial, sans-serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
      color: #000;
      font-size: 11pt;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24pt;
      margin: 0 0 5px 0;
      font-weight: bold;
    }
    .header h2 {
      font-size: 14pt;
      margin: 0 0 10px 0;
      font-weight: normal;
    }
    .contact-box {
      background-color: #D6EAF8;
      border: 2px solid #5DADE2;
      padding: 10px;
      margin: 10px 0;
      text-align: center;
      font-size: 10pt;
    }
    .linkedin {
      text-align: center;
      margin-bottom: 20px;
    }
    .linkedin a {
      color: #0563C1;
      text-decoration: underline;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      padding-bottom: 3px;
      border-bottom: 2px solid #000;
    }
    .bullet {
      margin: 8px 0;
      padding-left: 20px;
      text-indent: -15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    table td {
      border: 1px solid #999;
      padding: 8px;
      vertical-align: top;
    }
    table td:first-child {
      width: 25%;
      font-weight: bold;
      background-color: #E8F4F8;
    }
    .company-header {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 15px;
    }
    .role-info {
      font-size: 10pt;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${content.name}</h1>
    <h2>${content.title}</h2>
  </div>
  
  <div class="contact-box">
    Phone: ${content.phone} | Email: ${content.email}
  </div>
  
  <div class="linkedin">
    <a href="${content.linkedin || 'https://www.linkedin.com/in/poojith-reddy-com/'}" target="_blank">LinkedIn : ${content.linkedin || 'https://www.linkedin.com/in/poojith-reddy-com/'}</a>
  </div>
  
  <div class="section-title">PROFESSIONAL SUMMARY</div>
  ${content.summary.map(bullet => `<div class="bullet">• ${boldTechTerms(bullet)}</div>`).join('\n  ')}
  
  <div class="section-title">TECHNICAL SKILLS</div>
  <table>
  ${Object.entries(content.technicalSkills).map(([category, skills]) => 
    `<tr><td>${category}</td><td>${skills}</td></tr>`
  ).join('\n  ')}
  </table>
  
  <div class="section-title">WORK EXPERIENCE</div>
  ${content.experiences.map(exp => `
  <div class="company-header">${exp.company}</div>
  <div class="role-info">${exp.role} | ${exp.location} | ${exp.period}</div>
  ${exp.bullets.map(bullet => `<div class="bullet">• ${boldTechTerms(bullet)}</div>`).join('\n  ')}
  `).join('\n  ')}
</body>
</html>
  `;
  
  return html;
}

// Extract text from DOCX
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}
