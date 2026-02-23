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
    const resumeFormat = formData.get('resumeFormat') || '2-page'; // Default to 2-page format
    
    // Extract user credentials (with defaults)
    const userName = formData.get('userName') || 'Poojith Reddy A';
    const userEmail = formData.get('userEmail') || 'poojithreddy.se@gmail.com';
    const userPhone = formData.get('userPhone') || '312-536-9779';
    const userLinkedIn = formData.get('userLinkedIn') || 'https://www.linkedin.com/in/poojith-reddy-com/';
    
    const userCredentials = {
      name: userName,
      email: userEmail,
      phone: userPhone,
      linkedin: userLinkedIn
    };

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Extract resume content
    let resumeContent = '';
    if (resumeFile) {
      const buffer = await resumeFile.arrayBuffer();
      const fileType = resumeFile.name.toLowerCase();
      
      console.log(`📂 Processing file: ${resumeFile.name} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
      
      if (fileType.endsWith('.pdf')) {
        resumeContent = await extractTextFromPDF(buffer);
        console.log(`📄 Extracted ${resumeContent.length} characters from PDF`);
      } else if (fileType.endsWith('.docx') || fileType.endsWith('.doc')) {
        resumeContent = await extractTextFromDocx(buffer);
        console.log(`📄 Extracted ${resumeContent.length} characters from DOCX`);
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
      
      // Debug: Show first 500 characters of extracted content
      console.log('\n📋 EXTRACTED CONTENT (first 500 chars):');
      console.log('─'.repeat(80));
      console.log(resumeContent.substring(0, 500));
      console.log('─'.repeat(80));
      
      // Debug: Check if WORK EXPERIENCE section exists
      const hasWorkExp = resumeContent.match(/WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE/i);
      console.log(`\n🔍 WORK EXPERIENCE section found: ${hasWorkExp ? 'YES ✅' : 'NO ❌'}`);
      
      if (!hasWorkExp) {
        console.log('⚠️  WARNING: No WORK EXPERIENCE section found in extracted text!');
        console.log('📋 Full extracted content length:', resumeContent.length);
        console.log('📋 First 1000 characters:');
        console.log(resumeContent.substring(0, 1000));
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
    console.log(`📋 Resume Format: ${resumeFormat}`);

    // Generate tailored content with multiple API calls
    const tailoredContent = await generateTailoredContent(jobDescription, resumeContent, userCredentials, resumeFormat);
    
    // Create DOCX with formatting
    console.log('\n📄 Generating DOCX...');
    const docxPath = await generateResumeDOCX(tailoredContent, resumeFormat);
    
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

// Helper: Extract bullets from a company section (configurable limit based on format)
// Helper: Detect all companies from resume EXPERIENCE section only
function detectCompanies(resumeContent) {
  const lines = resumeContent.split('\n');
  const companies = [];
  let inExperienceSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start scanning when we hit EXPERIENCE or PROFESSIONAL EXPERIENCE section
    if (line.match(/^(WORK\s+)?EXPERIENCE$/i) || line.match(/^PROFESSIONAL\s+EXPERIENCE$/i)) {
      inExperienceSection = true;
      console.log(`📍 Found experience section at line ${i}: "${line}"`);
      continue;
    }
    
    // Stop when we hit other major sections
    if (inExperienceSection && line.match(/^(TECHNICAL\s+)?SKILLS$/i) || line.match(/^EDUCATION$/i) || line.match(/^CERTIFICATIONS?$/i)) {
      console.log(`📍 Stopped at section: "${line}"`);
      break;
    }
    
    if (!inExperienceSection) continue;
    
    // Simpler approach: Check if line has comma, pipe, and contains date pattern
    if (line.includes(',') && line.includes('|')) {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const beforePipe = parts[0].trim();
        const afterPipe = parts[1].trim();
        
        // Check if afterPipe contains a date pattern (month + year)
        const datePattern = /([A-Za-z]{3})\s+[''']?(\d{2,4})/i;
        if (datePattern.test(afterPipe)) {
          // Split beforePipe by comma to get role and company
          const commaIndex = beforePipe.indexOf(',');
          if (commaIndex > 0) {
            const role = beforePipe.substring(0, commaIndex).trim();
            const companyName = beforePipe.substring(commaIndex + 1).trim();
            
            // Extract location and period from afterPipe
            // Format: "Chicago, IL May '24 - Present" or "Chicago, IL      May '24 - Present"
            const dateMatch = afterPipe.match(/([A-Za-z]{3}\s+[''']?\d{2,4}\s*[-–]\s*(?:[A-Za-z]+\s+[''']?\d{2,4}|Present|Current))/i);
            if (dateMatch) {
              const period = dateMatch[1].trim();
              const location = afterPipe.substring(0, afterPipe.indexOf(dateMatch[0])).trim();
              
              console.log(`   ✅ MATCHED company: "${companyName}", Role: "${role}", Location: "${location}", Period: "${period}"`);
              companies.push({ name: companyName, location, period, role });
              continue;
            }
          }
        }
      }
    }
  }
  
  console.log(`📌 Detected ${companies.length} companies from EXPERIENCE section:`);
  companies.forEach(c => console.log(`   - ${c.name}: ${c.role} (${c.period})`));
  
  // Validate: Filter out educational institutions that might have been incorrectly detected
  const educationKeywords = ['institute', 'university', 'college', 'school', 'academy'];
  const validCompanies = companies.filter(c => {
    const isEducation = educationKeywords.some(keyword => 
      c.name.toLowerCase().includes(keyword)
    );
    if (isEducation) {
      console.log(`   ⚠️ Filtered out educational institution: ${c.name}`);
    }
    return !isEducation;
  });
  
  if (validCompanies.length !== companies.length) {
    console.log(`📌 After filtering: ${validCompanies.length} valid companies`);
  }
  
  return validCompanies;
}

function extractCompanyBullets(resumeContent, companyName, limit = 6) {
  const lines = resumeContent.split('\n');
  const bullets = [];
  let inCompanySection = false;
  let inExperienceSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track if we're in EXPERIENCE section
    if (line.match(/^(WORK\s+)?EXPERIENCE$/i) || line.match(/^PROFESSIONAL\s+EXPERIENCE$/i)) {
      inExperienceSection = true;
      continue;
    }
    
    // Exit EXPERIENCE section at next major section
    if (inExperienceSection && line.match(/^(TECHNICAL\s+)?SKILLS$/i) || line.match(/^EDUCATION$/i)) {
      break;
    }
    
    // Look for company name in the line (handles "Title, Company | Location" or "Title | Company")
    if (inExperienceSection && line.toLowerCase().includes(companyName.toLowerCase())) {
      inCompanySection = true;
      console.log(`   🔍 Found company section for ${companyName} at line ${i}`);
      continue;
    }
    
    // Stop at next company header (contains | and date pattern)
    if (inCompanySection && line.match(/^.+?\s*\|\s*.+?\s{2,}[A-Za-z]+\s+['']?\d{2,4}/)) {
      console.log(`   🛑 Next company found, stopping extraction`);
      break;
    }
    
    // Collect bullet points
    if (inCompanySection && line.startsWith('•')) {
      bullets.push(line.substring(1).trim());
      if (bullets.length >= limit) {
        break;
      }
    }
  }
  
  console.log(`📌 Extracted ${bullets.length} original bullets for ${companyName} (limited to ${limit})`);
  return bullets.slice(0, limit);
}

// Helper: Extract technical skills
function extractTechnicalSkills(resumeContent) {
  const lines = resumeContent.split('\n');
  const skills = {};
  let inSkillsSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start when we hit SKILLS section
    if (line.match(/^(SKILLS|TECHNICAL SKILLS):?$/i)) {
      inSkillsSection = true;
      continue;
    }
    
    // Stop at next major section
    if (inSkillsSection && line.match(/^(EXPERIENCE|EDUCATION|CERTIFICATIONS?|PROJECTS?)$/i)) {
      break;
    }
    
    if (inSkillsSection && line) {
      // Format: "Category: skill1, skill2, skill3"
      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        const category = colonMatch[1].trim();
        const items = colonMatch[2].trim();
        if (category && items) {
          skills[category] = items;
        }
        continue;
      }
      
      // Try tab delimiter
      if (line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const category = parts[0].trim();
          const items = parts.slice(1).join(' ').trim();
          if (category && items) {
            skills[category] = items;
          }
        }
        continue;
      }
      
      // Try multiple spaces as delimiter
      const spacesMatch = line.match(/^([A-Za-z\s/&]+?)\s{2,}(.+)$/);
      if (spacesMatch) {
        const category = spacesMatch[1].trim();
        const items = spacesMatch[2].trim();
        if (category && items) {
          skills[category] = items;
        }
      }
    }
  }
  
  console.log(`📋 Extracted ${Object.keys(skills).length} technical skill categories`);
  if (Object.keys(skills).length > 0) {
    Object.keys(skills).forEach(category => {
      console.log(`   - ${category}: ${skills[category].substring(0, 60)}${skills[category].length > 60 ? '...' : ''}`);
    });
  }
  
  // If no skills found, return a default set
  if (Object.keys(skills).length === 0) {
    console.log('⚠️ No technical skills found, using defaults');
    return {
      'Languages': 'Java, JavaScript, TypeScript, Python, SQL',
      'Frameworks': 'Spring Boot, Spring MVC, Hibernate, React, Angular, Node.js',
      'Cloud & DevOps': 'AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Jenkins, CI/CD',
      'Databases': 'PostgreSQL, MySQL, MongoDB, Oracle, Redis'
    };
  }
  
  return skills;
}

// Helper: Extract Education section
function extractEducation(resumeContent) {
  const lines = resumeContent.split('\n');
  const educationLines = [];
  let inEducationSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^education$/i) || line.match(/^academic\s+education$/i)) {
      inEducationSection = true;
      continue;
    }
    
    // Stop at next major section or end of file
    if (inEducationSection && line.match(/^(certifications?|projects?|references?|environment:)/i)) {
      break;
    }
    
    if (inEducationSection && line) {
      educationLines.push(line);
    }
  }
  
  console.log(`📚 Extracted Education section: ${educationLines.length} lines`);
  return educationLines.length > 0 ? educationLines : null;
}

// Helper: Extract Academic Projects section
function extractAcademicProjects(resumeContent) {
  const lines = resumeContent.split('\n');
  const projectLines = [];
  let inProjectsSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^academic\s+projects?$/i) || line.match(/^projects?$/i)) {
      inProjectsSection = true;
      continue;
    }
    
    // Stop at next major section
    if (inProjectsSection && line.match(/^(education|certifications?|references?|environment:)/i)) {
      break;
    }
    
    if (inProjectsSection && line) {
      projectLines.push(line);
    }
  }
  
  console.log(`📁 Extracted Academic Projects section: ${projectLines.length} lines`);
  return projectLines.length > 0 ? projectLines : null;
}

// RETRY HELPER FUNCTION
async function generateWithRetry(sectionName, generatorFn, maxRetries, minAcceptable, bulletField) {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const parsed = await generatorFn();
      
      const bullets = bulletField === 'summary' ? parsed.summary : parsed.bullets;
      
      if (bullets && bullets.length >= minAcceptable) {
        console.log(`   ✅ ${sectionName}: ${bullets.length} bullets generated\n`);
        return parsed;
      } else {
        retryCount++;
        console.log(`   ⚠️ ${sectionName} attempt ${retryCount}: Got ${bullets?.length || 0} bullets (need ${minAcceptable}+), retrying...`);
        if (retryCount >= maxRetries) {
          console.log(`   ✅ ${sectionName}: ${bullets.length} bullets generated (after ${retryCount} attempts)\n`);
          return parsed;
        }
      }
    } catch (error) {
      retryCount++;
      console.error(`   ❌ ${sectionName} parse error (attempt ${retryCount}):`, error.message);
      if (retryCount >= maxRetries) {
        throw new Error(`${sectionName} JSON parsing failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error(`${sectionName} generation failed after retries`);
}

// MAIN GENERATION FUNCTION - MULTI-PASS APPROACH
async function generateTailoredContent(jobDescription, resumeContent, userCredentials, resumeFormat = '2-page') {
  console.log('\n🚀 Starting MULTI-PASS content generation...\n');
  
  // FORMAT CONFIGURATION - Defines bullet counts and focus for each format
  const formatConfig = {
    '1-page': {
      summaryLines: 3,
      bulletsPerCompany: 4,
      summaryLength: '120-150',
      bulletLength: '120-150',
      focus: 'Concise and impactful. Prioritize key achievements and technical skills. One page maximum.',
      description: '1-page concise format',
      mode: 'fulltime'
    },
    '2-page': {
      summaryLines: 5,
      bulletsPerCompany: 6,
      summaryLength: '150-200',
      bulletLength: '150-200',
      focus: 'Comprehensive and detailed. Showcase full breadth of experience with metrics and achievements.',
      description: '2-page detailed format',
      mode: 'c2c'
    },
    'maang': {
      summaryLines: 4,
      bulletsPerCompany: 5,
      summaryLength: '140-180',
      bulletLength: '140-180',
      focus: 'MAANG-optimized ONE-PAGE format: Emphasize SCALE (millions of users/transactions), QUANTIFIABLE IMPACT (X% improvement, $Y cost reduction, Z users affected), SYSTEM DESIGN & ARCHITECTURE (distributed systems, microservices, scalability patterns, high availability), TECHNICAL DEPTH (algorithms, data structures, performance optimization), INNOVATION (patents, new tech adoption, cutting-edge solutions), LEADERSHIP PRINCIPLES (ownership, bias for action, dive deep, think big, deliver results). Use powerful action verbs: architected, engineered, scaled, optimized, designed. Keep it ONE PAGE with maximum impact.',
      description: 'MAANG companies (Meta, Amazon, Apple, Netflix, Google) - One Page',
      mode: 'fulltime'
    },
    'midsize': {
      summaryLines: 4,
      bulletsPerCompany: 6,
      summaryLength: '150-200',
      bulletLength: '150-200',
      focus: 'Mid-size organization: Highlight VERSATILITY (wearing multiple hats), CROSS-FUNCTIONAL COLLABORATION (working with different teams), ADAPTABILITY (handling various responsibilities), TEAM IMPACT (building team culture), BUSINESS ALIGNMENT (connecting tech to business goals), GROWTH MINDSET (learning new technologies, process improvements). Show well-rounded skills and cultural fit.',
      description: 'Mid-size organizations',
      mode: 'fulltime'
    }
  };
  
  const config = formatConfig[resumeFormat] || formatConfig['2-page'];
  console.log(`📋 Using format: ${config.description} (${config.mode.toUpperCase()} mode)`);
  console.log(`   - Summary: ${config.summaryLines} sentences`);
  console.log(`   - Bullets per company: ${config.bulletsPerCompany}`);
  console.log(`   - Focus: ${config.focus}\n`);
  
  // STEP 1: Detect companies based on mode
  console.log('📌 STEP 1: Detecting companies and extracting sections from resume...');
  
  let companiesToGenerate = [];
  let companiesOriginal = {};
  
  if (config.mode === 'c2c') {
    // C2C Mode: Use hardcoded Bank of America and UnitedHealth Group
    console.log('   📝 C2C MODE: Using hardcoded companies (Bank of America, UnitedHealth Group)');
    companiesToGenerate = [
      { name: 'Bank of America', location: 'Jersey City, NJ', period: 'Dec 2023 – Current', role: 'Senior Java Full Stack Developer' },
      { name: 'UnitedHealth Group', location: 'Chicago, IL', period: 'Aug 2020 – July 2023', role: 'Java Full Stack Developer II' }
    ];
    
    // Still extract original bullets from other companies
    companiesOriginal['State of Texas'] = extractCompanyBullets(resumeContent, 'State of Texas', config.bulletsPerCompany);
    companiesOriginal['Costco'] = extractCompanyBullets(resumeContent, 'Costco', config.bulletsPerCompany);
    companiesOriginal['Wipro'] = extractCompanyBullets(resumeContent, 'Wipro', config.bulletsPerCompany);
  } else {
    // Full-time Mode: Dynamically detect companies from resume
    console.log('   📝 FULL-TIME MODE: Detecting companies from resume');
    const detectedCompanies = detectCompanies(resumeContent);
    
    // Generate for top companies, extract bullets for others
    const numToGenerate = Math.min(2, detectedCompanies.length);
    companiesToGenerate = detectedCompanies.slice(0, numToGenerate);
    
    // Extract original bullets for remaining companies
    for (let i = numToGenerate; i < detectedCompanies.length; i++) {
      const company = detectedCompanies[i];
      companiesOriginal[company.name] = extractCompanyBullets(resumeContent, company.name, config.bulletsPerCompany);
    }
  }
  
  const technicalSkills = extractTechnicalSkills(resumeContent);
  const education = extractEducation(resumeContent);
  const academicProjects = extractAcademicProjects(resumeContent);
  
  console.log(`   - Companies to AI-generate: ${companiesToGenerate.map(c => c.name).join(', ')}`);
  console.log(`   - Companies using original bullets: ${Object.keys(companiesOriginal).join(', ')}`);
  console.log(`   - Technical Skills: ${Object.keys(technicalSkills).length} categories`);
  console.log(`   - Education: ${education ? 'Found' : 'Not found'}`);
  console.log(`   - Academic Projects: ${academicProjects ? 'Found' : 'Not found'}\n`);
  
  // STEP 2-4: Generate summary and company experiences in parallel  
  const companyNames = companiesToGenerate.map(c => c.name).join(', ');
  console.log(`🚀 STEPS 2-4: Generating Summary and ${companyNames} IN PARALLEL...\\n`);
  
  const maxRetries = 2;  // Reduced from 3 to 2 for speed
  
  // Helper function to extract company experience section
  const extractCompanySection = (companyName) => {
    const lines = resumeContent.split('\n');
    const section = [];
    let inCompanySection = false;
    let inExperienceSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Track EXPERIENCE section
      if (line.match(/^(WORK\s+)?EXPERIENCE$/i) || line.match(/^PROFESSIONAL\s+EXPERIENCE$/i)) {
        inExperienceSection = true;
        continue;
      }
      
      // Stop at next major section
      if (inExperienceSection && (line.match(/^(TECHNICAL\s+)?SKILLS$/i) || line.match(/^EDUCATION$/i))) {
        break;
      }
      
      // Find company header (handles various formats)
      if (inExperienceSection && line.toLowerCase().includes(companyName.toLowerCase())) {
        inCompanySection = true;
        section.push(line);
        continue;
      }
      
      // Stop at next company (detect job header with | and date)
      if (inCompanySection && line.match(/^.+?\s*\|\s*.+?\s{2,}[A-Za-z]+\s+['']?\d{2,4}/)) {
        break;
      }
      
      if (inCompanySection) {
        section.push(line);
        if (section.length > 25) break; // Limit to reasonable size
      }
    }
    
    const extracted = section.join('\n');
    console.log(`   📄 Extracted ${section.length} lines for ${companyName}`);
    return extracted || `Role: ${companyName}`;
  };
  
  // Helper function to generate company prompt
  const generateCompanyPrompt = (company) => {
    const companyExperience = extractCompanySection(company.name);
    
    return `You are an expert resume writer. Generate work experience bullets for ${company.name} role, optimized for ${config.description}.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ORIGINAL ${company.name.toUpperCase()} EXPERIENCE:
Role: ${company.role}
Period: ${company.period}
Location: ${company.location}

${companyExperience}

TASK: Generate EXACTLY ${config.bulletsPerCompany} bullet points for ${company.name} work experience.

FORMAT FOCUS: ${config.focus}

REQUIREMENTS:
1. Each bullet must be ${config.bulletLength} characters (approximately 2 lines when formatted)
2. Tailor each bullet to match job description requirements
3. Include specific technologies, tools, metrics, and quantifiable achievements
4. Use strong action verbs: Architected, Engineered, Designed, Developed, Built, Implemented, Optimized
5. Focus on impact and results with numbers/percentages where possible
6. Make each bullet comprehensive and detailed
7. IMPORTANT: ${config.focus}

OUTPUT FORMAT (JSON only):
{
  \"company\": \"${company.name}\",
  \"location\": \"${company.location || 'N/A'}\",
  \"period\": \"${company.period}\",
  \"role\": \"${company.role || 'Developer'}\",
  \"bullets\": [
    \"Bullet 1 here (${config.bulletLength} characters)...\",
    \"Bullet 2 here...\",
    ... (EXACTLY ${config.bulletsPerCompany} bullets total)
  ]
}

🚨 CRITICAL RULES:
1. Return ONLY the JSON object - no explanation, no commentary
2. Generate EXACTLY ${config.bulletsPerCompany} bullets - no more, no less
3. Each bullet must be ${config.bulletLength} characters
4. Follow the format focus: ${config.focus}
5. Start your response with { and end with }`;
  };
  
  // Build parallel generation array: Summary + all companies
  const generationPromises = [
    // Summary generation - DYNAMIC FORMAT (based on resumeFormat)
    generateWithRetry('Summary', async () => {
      const summaryPrompt = `You are an expert resume writer. Generate a professional summary paragraph tailored to this job for ${config.description}.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeContent}

TASK: Generate a professional summary as a SINGLE PARAGRAPH of ${config.summaryLines} sentences.

FORMAT FOCUS: ${config.focus}

REQUIREMENTS:
1. Extract the candidate's real name, title, email, and phone from the resume
2. Write ${config.summaryLines} sentences that flow naturally as a paragraph (NOT bullet points)
3. Each sentence should be ${config.summaryLength} characters
4. In the FIRST sentence, include a tech stack list with key technologies (e.g., "...using Java, Spring Boot, React, AWS, and Kubernetes...")
5. Tailor content to highlight skills matching the job description
6. Focus on: years of experience, core technical expertise, key achievements with metrics, specializations relevant to the JD
7. Use strong action verbs and power words
8. Make it compelling and achievement-focused
9. IMPORTANT: ${config.focus}

OUTPUT FORMAT (JSON only, no extra text):
{
  \"name\": \"Real Name From Resume\",
  \"title\": \"Senior Java Full Stack Developer\",
  \"email\": \"real@email.com\",
  \"phone\": \"real-phone\",
  \"summary\": \"Senior Java Full Stack Developer with 11+ years of experience...\"
}

🚨 CRITICAL RULES:
1. Return ONLY the JSON object - no explanation, no commentary
2. The summary field must contain ONE continuous paragraph (${config.summaryLines} sentences)
3. Do NOT use bullet points or arrays - just a single string paragraph
4. Make it specific to the job description requirements
5. Follow the format focus: ${config.focus}
6. Start your response with { and end with }`;
      
      const response = await callOllama(summaryPrompt);
      return extractJSON(response);
    }, maxRetries, 1, 'summary')
  ];
  
  // Add company generation promises dynamically
  companiesToGenerate.forEach(company => {
    generationPromises.push(
      generateWithRetry(company.name, async () => {
        const response = await callOllama(generateCompanyPrompt(company));
        return extractJSON(response);
      }, maxRetries, config.bulletsPerCompany, 'bullets')
    );
  });
  
  // Run all generations in parallel
  const results = await Promise.all(generationPromises);
  const summaryParsed = results[0];
  const companyResults = results.slice(1);
console.log(`✅ All sections generated in parallel!\n`);
  
  // STEP 4.5: Tailor Academic Projects if they exist
  let tailoredAcademicProjects = academicProjects;
  if (academicProjects && academicProjects.length > 0) {
    console.log('📁 STEP 4.5: Tailoring Academic Projects to JD...');
    try {
      const projectsPrompt = `You are an expert resume writer. Tailor the academic projects to match the job description.

JOB DESCRIPTION:
${jobDescription}

CURRENT ACADEMIC PROJECTS:
${academicProjects.join('\n')}

TASK: Rewrite the academic projects to highlight skills and technologies relevant to the job description.

REQUIREMENTS:
1. Keep the same project structure and format
2. Emphasize technologies mentioned in the JD
3. Add relevant technical details that match the job requirements
4. Keep it concise but impactful
5. Return as an array of strings, one per line of the projects section

OUTPUT FORMAT (JSON only):
{
  "projects": [
    "First line of tailored projects...",
    "Second line...",
    "Continue with all project lines..."
  ]
}

🚨 CRITICAL: Return ONLY valid JSON - no explanation, no extra text`;

      const response = await callOllama(projectsPrompt);
      const parsed = extractJSON(response);
      if (parsed.projects && Array.isArray(parsed.projects)) {
        tailoredAcademicProjects = parsed.projects;
        console.log(`   ✅ Academic Projects tailored successfully\n`);
      }
    } catch (error) {
      console.log(`   ⚠️ Failed to tailor projects, using original: ${error.message}\n`);
    }
  }
  
  // STEP 5: Assemble final content with user credentials
  console.log('📦 STEP 5: Assembling final resume structure...\n');
  
  // Build experiences array dynamically
  const experiences = [];
  
  // Add AI-generated companies first
  companyResults.forEach((result, index) => {
    const company = companiesToGenerate[index];
    experiences.push({
      company: company.name,
      location: result.location || company.location || 'N/A',
      period: result.period || company.period,
      role: result.role || company.role || 'Developer',
      bullets: result.bullets
    });
  });
  
  // Add companies with original bullets
  Object.entries(companiesOriginal).forEach(([companyName, bullets]) => {
    if (bullets && bullets.length > 0) {
      // Find company details from resume or use defaults
      const companyNameNormalized = companyName.toLowerCase();
      let location = 'N/A', period = '', role = 'Developer';
      
      if (companyNameNormalized.includes('state of texas')) {
        location = 'Austin, TX';
        period = 'Aug 2018 – Nov 2020';
        role = 'Java Full Stack Developer';
      } else if (companyNameNormalized.includes('costco')) {
        location = 'Seattle, WA';
        period = 'Jan 2017 – July 2018';
        role = 'Java/J2EE Developer';
      } else if (companyNameNormalized.includes('wipro')) {
        location = 'India';
        period = 'Feb 2014 – Dec 2016';
        role = 'Java Developer';
      }
      
      experiences.push({
        company: companyName,
        location,
        period,
        role,
        bullets
      });
    }
  });
  
  const finalContent = {
    name: userCredentials.name,
    title: 'Senior Java Full Stack Developer',
    email: userCredentials.email,
    phone: userCredentials.phone,
    linkedin: userCredentials.linkedin,
    summary: summaryParsed.summary,
    technicalSkills: technicalSkills,
    experiences: experiences,
    education: education,
    academicProjects: tailoredAcademicProjects
  };
  
  // Log final summary
  console.log('📊 FINAL CONTENT SUMMARY:');
  console.log(`   Summary: ${typeof finalContent.summary === 'string' ? 'Paragraph format' : finalContent.summary.length + ' bullets'}`);
  experiences.forEach((exp) => {
    console.log(`   ${exp.company}: ${exp.bullets.length} bullets`);
  });
  console.log(`   Education: ${education ? 'Preserved' : 'Not found'}`);
  console.log(`   Academic Projects: ${tailoredAcademicProjects ? 'Tailored' : 'Not found'}`);
  console.log(`   Total experience bullets: ${finalContent.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0)}\n`);
  
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
        num_ctx: 4096,  // Reduced from 8192 for faster generation
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
    } catch {
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
async function generateResumeDOCX(content, format = 'maang') {
  const sections = [];
  
  // Determine if this is C2C mode (uses table for skills) or full-time mode (uses plain text)
  const isC2CMode = format === '2-page';
  console.log(`📋 DOCX Generation mode: ${isC2CMode ? 'C2C (table skills)' : 'Full-time (plain text skills)'}`);
  
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
  const linkedinUrl = content.linkedin;
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
  
  // Summary as a single paragraph (not bullets)
  const summaryText = typeof content.summary === 'string' ? content.summary : content.summary.join(' ');
  const summaryParts = makeTechnicalTermsBold(summaryText);
  sections.push(
    new Paragraph({
      children: summaryParts.map(part => new TextRun({
        text: part.text,
        size: 20,
        bold: part.bold
      })),
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED
    })
  );
  
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
  
  // Skills format: Table for C2C, Plain text for Full-time
  if (isC2CMode) {
    // C2C Mode: Skills in table format
    const skillRows = [];
    if (content.technicalSkills && Object.keys(content.technicalSkills).length > 0) {
      for (const [category, skills] of Object.entries(content.technicalSkills)) {
        skillRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: category, bold: true, size: 20 })],
                  spacing: { before: 60, after: 60 }
                })],
                width: { size: 22, type: WidthType.PERCENTAGE },
                verticalAlign: 'center',
                shading: { fill: 'FFFFFF' },
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 100,
                  right: 100
                }
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: skills, size: 20 })],
                  spacing: { before: 60, after: 60 }
                })],
                width: { size: 78, type: WidthType.PERCENTAGE },
                verticalAlign: 'center',
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 100,
                  right: 100
                }
              })
            ],
            height: { value: 300, rule: 'atLeast' }
          })
        );
      }
    } else {
      // Fallback: Add a placeholder message if no skills found
      skillRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: 'Technical Skills', bold: true, size: 20 })],
                spacing: { before: 60, after: 60 }
              })],
              width: { size: 22, type: WidthType.PERCENTAGE },
              verticalAlign: 'center',
              shading: { fill: 'FFFFFF' },
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: 'Java, Spring Boot, React, Angular, AWS, Docker, Kubernetes, PostgreSQL, MongoDB', size: 20 })],
                spacing: { before: 60, after: 60 }
              })],
              width: { size: 78, type: WidthType.PERCENTAGE },
              verticalAlign: 'center',
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            })
          ],
          height: { value: 300, rule: 'atLeast' }
        })
      );
    }
    
    sections.push(
      new Table({
        rows: skillRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: {
          top: 60,
          bottom: 60
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
        }
      })
    );
  } else {
    // Full-time Mode: Skills in plain text format (category: skills)
    if (content.technicalSkills && Object.keys(content.technicalSkills).length > 0) {
      for (const [category, skills] of Object.entries(content.technicalSkills)) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${category}: `, bold: true, size: 20 }),
              new TextRun({ text: skills, size: 20 })
            ],
            spacing: { before: 100, after: 100 }
          })
        );
      }
    } else {
      // Fallback for full-time with no skills
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Technical Skills: ', bold: true, size: 20 }),
            new TextRun({ text: 'Java, Spring Boot, React, Angular, AWS, Docker, Kubernetes, PostgreSQL, MongoDB', size: 20 })
          ],
          spacing: { before: 100, after: 100 }
        })
      );
    }
  }
  
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
    // Company and location on first line (bold)
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `${exp.company}, ${exp.location}`,
            size: 22,
            bold: true
          })
        ],
        spacing: { before: 250, after: 50 },
        alignment: AlignmentType.LEFT
      })
    );
    
    // Role | Period on second line (normal weight)
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `${exp.role} | ${exp.period}`,
            size: 20,
            bold: false
          })
        ],
        spacing: { after: 150 }
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
  
  // Education Section (if exists in resume)
  if (content.education && content.education.length > 0) {
    sections.push(
      new Paragraph({
        text: 'EDUCATION',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
        border: {
          bottom: { color: '000000', space: 1, style: 'single', size: 6 }
        }
      })
    );
    
    for (const eduLine of content.education) {
      sections.push(
        new Paragraph({
          text: eduLine,
          size: 20,
          spacing: { after: 100 }
        })
      );
    }
  }
  
  // Academic Projects Section (if exists in resume)
  if (content.academicProjects && content.academicProjects.length > 0) {
    sections.push(
      new Paragraph({
        text: 'ACADEMIC PROJECTS',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
        border: {
          bottom: { color: '000000', space: 1, style: 'single', size: 6 }
        }
      })
    );
    
    for (const projectLine of content.academicProjects) {
      const parts = makeTechnicalTermsBold(projectLine);
      sections.push(
        new Paragraph({
          children: parts.map(part => new TextRun({
            text: part.text,
            size: 20,
            bold: part.bold
          })),
          spacing: { after: 100 }
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
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      border: 1px solid #000;
    }
    table tr {
      border-bottom: 1px solid #000;
    }
    table td {
      border-right: 1px solid #000;
      padding: 8px 10px;
      vertical-align: top;
      background-color: #fff;
      line-height: 1.3;
    }
    table td:first-child {
      width: 22%;
      font-weight: bold;
      background-color: #fff;
      border-right: 1px solid #000;
    }
    table td:last-child {
      border-right: none;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .company-header {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 4px;
      color: #000;
    }
    .role-info {
      font-size: 11pt;
      font-weight: normal;
      margin-bottom: 10px;
      color: #000;
    }
    .role-info .date {
      float: right;
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
    <a href="${content.linkedin}" target="_blank">LinkedIn : ${content.linkedin}</a>
  </div>
  
  <div class="section-title">PROFESSIONAL SUMMARY</div>
  <div style="text-align: justify; line-height: 1.6; margin-bottom: 20px;">
    ${boldTechTerms(typeof content.summary === 'string' ? content.summary : content.summary.join(' '))}
  </div>
  
  <div class="section-title">TECHNICAL SKILLS</div>
  <table>
  ${content.technicalSkills && Object.keys(content.technicalSkills).length > 0 
    ? Object.entries(content.technicalSkills).map(([category, skills]) => 
        `<tr><td>${category}</td><td>${skills}</td></tr>`
      ).join('\n  ')
    : '<tr><td>Technical Skills</td><td>Java, Spring Boot, React, Angular, AWS, Docker, Kubernetes, PostgreSQL, MongoDB</td></tr>'
  }
  </table>
  
  <div class="section-title">WORK EXPERIENCE</div>
  ${content.experiences.map(exp => `
  <div class="company-header">${exp.company}, ${exp.location}</div>
  <div class="role-info">${exp.role} | ${exp.period}</div>
  ${exp.bullets.map(bullet => `<div class="bullet">• ${boldTechTerms(bullet)}</div>`).join('\n  ')}
  `).join('\n  ')}
  
  ${content.education ? `
  <div class="section-title">EDUCATION</div>
  ${content.education.map(line => `<div style="margin: 8px 0;">${line}</div>`).join('\n  ')}
  ` : ''}
  
  ${content.academicProjects ? `
  <div class="section-title">ACADEMIC PROJECTS</div>
  ${content.academicProjects.map(line => `<div style="margin: 8px 0;">${boldTechTerms(line)}</div>`).join('\n  ')}
  ` : ''}
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
  // Dynamically import pdf-parse to bypass debug mode
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const data = await pdfParse(buffer);
  return data.text;
}
