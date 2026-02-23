import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, TabStopType, TabStopPosition } from 'docx';
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
    
    // Extract user credentials
    const userName = formData.get('userName') || 'John Doe';
    const userEmail = formData.get('userEmail') || 'john.doe@email.com';
    const userPhone = formData.get('userPhone') || '(000) 000-0000';
    const userTitle = formData.get('userTitle') || 'Software Engineer';
    
    const userCredentials = {
      name: userName,
      email: userEmail,
      phone: userPhone,
      title: userTitle
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
      }
      
      // Debug output
      console.log('\n📋 EXTRACTED CONTENT (first 500 chars):');
      console.log('─'.repeat(80));
      console.log(resumeContent.substring(0, 500));
      console.log('─'.repeat(80));
    } else if (resumeText) {
      resumeContent = resumeText;
    } else {
      // Fallback to default resume
      const defaultResumePath = path.join(process.cwd(), 'defaultpoojithresume.txt');
      resumeContent = fs.readFileSync(defaultResumePath, 'utf-8');
    }

    console.log('📝 Starting LLM-based resume tailoring...');
    console.log('   Using AI to parse resume structure and tailor to JD...');

    // Use LLM to parse resume and generate tailored content in one comprehensive call
    const tailoredContent = await parseAndTailorWithLLM(resumeContent, jobDescription, userCredentials);
    
    // Create DOCX
    console.log('\n📄 Generating DOCX...');
    const docxPath = await generateResumeDOCX(tailoredContent);
    
    const endTime = Date.now();
    const totalSeconds = ((endTime - startTime) / 1000).toFixed(0);
    console.log(`✅ Resume generated successfully in ${totalSeconds} sec`);
    
    // Read the final DOCX
    const docxBuffer = fs.readFileSync(docxPath);
    const docxBase64 = docxBuffer.toString('base64');
    
    // Generate HTML preview
    const htmlPreview = generateHTMLPreview(tailoredContent);
    
    // Clean up temp file
    fs.unlinkSync(docxPath);
    
    return NextResponse.json({
      htmlPreview,
      docxBase64,
      generationTime: `${totalSeconds} sec`,
      filename: `${userName.replace(/\s+/g, '')}_Resume_Tailored.docx`
    });
    
  } catch (error) {
    console.error('❌ Error in resume tailor:', error);
    return NextResponse.json(
      { error: 'Failed to generate resume: ' + error.message },
      { status: 500 }
    );
  }
}

// LLM-based parsing and tailoring (replaces manual regex parsing)
async function parseAndTailorWithLLM(resumeText, jd, userCredentials) {
  console.log('🤖 Using LLM to parse and tailor resume...');
  
  const prompt = `You are an expert ATS resume writer creating a credible, interview-defensible resume tailored to a job description.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE PRINCIPLE: HONEST KEYWORD OPTIMIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOAL: Maximize ATS score + Interview defensibility
- Include ALL JD keywords (Summary, Experience, Skills, Labs)
- Transform entire resume to match JD stack where plausible
- Use "safe placement" strategies for any remaining technologies
- Maintain domain coherence and seniority-appropriate language

JOB DESCRIPTION:
${jd}

CANDIDATE'S RESUME:
${resumeText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1: TECHNOLOGY CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before writing, classify each JD technology:

PROVEN TECHNOLOGY (already in candidate's resume):
  ✅ CAN claim: "Implemented", "Developed", "Built", "Designed"
  ✅ CAN use in: Summary, Work Experience bullets, Skills (Proven section)
  ✅ CAN include: Specific metrics, production claims, architecture decisions

ADJACENT TECHNOLOGY (not in resume, but technically related):
  ⚠️ CAN claim: "Integrated with", "Collaborated with teams using", "Supported services using"
  ⚠️ CAN use in: Work Experience (1-2 bullets max per company)
  ⚠️ EXAMPLES:
    - "Integrated authentication service with OAuth2-based identity provider"
    - "Collaborated with platform team deploying services to Kubernetes clusters"
    - "Supported API gateway using gRPC for internal service communication"

NEW/LEARNING TECHNOLOGY (not in resume, no proven experience):
  ⚠️ CAN claim production work if technically plausible and domain-matched
  ✅ Safe options:
    (a) Direct implementation: "Implemented Kafka consumers for event streaming" (if role used messaging)
    (b) Hands-on Labs section: "Built gRPC POC for microservices communication"
    (c) Skills section: List under "Familiarity / Working Knowledge"
    (d) Summary: "Working knowledge of Kubernetes, Helm, and container orchestration"
    (e) Experience: "Created internal POC using Kafka for event streaming" (if not production-ready)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2: DOMAIN COHERENCE CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE adding JD technology to a company, verify domain match:

Healthcare/Medical company:
  ✅ Plausible: Healthcare APIs, HIPAA, patient data, medical records, billing, HL7/FHIR
  ⚠️ Adjacent: General backend tech (REST APIs, databases, microservices, Docker, Kubernetes)
  ❌ Implausible: IoT gateways, smart home, industrial automation, trading systems

Education/EdTech company:
  ✅ Plausible: LMS, student data, course management, content delivery, grading systems
  ⚠️ Adjacent: General backend tech (APIs, databases, cloud platforms)
  ❌ Implausible: Healthcare billing, IoT devices, financial trading, home automation

Finance/Fintech company:
  ✅ Plausible: Payment APIs, fraud detection, trading systems, financial data, transactions
  ⚠️ Adjacent: General backend tech (microservices, databases, messaging)
  ❌ Implausible: Healthcare systems, education platforms, IoT devices

IoT/Smart Home company:
  ✅ Plausible: IoT gateways, device integration, MQTT, sensor data, home automation
  ⚠️ Adjacent: General backend tech (APIs, cloud, databases)
  ❌ Implausible: Healthcare billing, education platforms, financial trading

General Tech/SaaS/Platform company:
  ✅ Plausible: Most technologies (broad scope)

⚠️ RULE: If technology doesn't match company domain → Use Adjacent/Learning placement only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PROFESSIONAL SUMMARY (6-8 bullets, 150-250 chars each - 1.5 to 2.5 lines)
   
   FIRST BULLET (MANDATORY FORMAT):
   "[Job Title from JD] with [X]+ years of experience in [primary domain], specializing in [key tech stack from JD] and [secondary skills]. Proven track record in [main achievement area] across [types of systems/domains]."
   
   Example first bullets:
   ✅ "Software Engineer with 5+ years of experience in backend development, specializing in Go, Python, and distributed systems. Proven track record in building scalable microservices architectures across healthcare and fintech domains."
   ✅ "Senior Backend Developer with 7+ years of experience in API development, specializing in RESTful services, GraphQL, and cloud-native architectures. Extensive expertise in designing high-performance systems handling millions of requests daily."
   
   REMAINING BULLETS (5-7 bullets):
   Distribution:
   - 50% (2-3 bullets): Proven skills and technical achievements
   - 30% (2 bullets): JD keywords and domain expertise
   - 20% (1-2 bullets): Additional technologies and methodologies
   
   Each bullet should:
   - Be 150-250 characters (1.5-2.5 lines of readable content)
   - Include specific technologies, metrics, or outcomes
   - Flow naturally without sounding templated
   - For unproven tech, use phrases:
     * "Working knowledge of [tech]"
     * "Hands-on experience with [tech] through prototyping"
     * "Familiar with [tech] and [related tech]"
   
   Example bullets:
   ✅ "Expert in designing and implementing microservices architectures using Docker and Kubernetes, with hands-on experience deploying containerized applications to AWS and GCP cloud platforms"
   ✅ "Strong background in database optimization and data modeling with PostgreSQL, MongoDB, and Redis, consistently improving query performance by 40-60% through indexing strategies and caching mechanisms"
   ✅ "Proficient in CI/CD automation using Jenkins, GitLab CI, and GitHub Actions, implementing comprehensive testing frameworks that reduced production bugs by 50%"
   ❌ "Architected distributed Kubernetes platform" (too vague, no context)

2. WORK EXPERIENCE (EACH COMPANY: 8-10 bullets, 150-200 chars each)
   
   Bullet Distribution per company:
   - 40-50% (4-5 bullets): PROVEN - Authentic company domain work
   - 30-40% (3-4 bullets): ADAPTED - Bridge to JD tech (plausible only)
   - 10-20% (1-2 bullets): TRANSFERABLE - Universal skills (CI/CD, testing, collaboration)
   
   Proven Bullets (maintain company's actual domain):
   - Can transform to use JD technologies if domain-appropriate
   - Preserve company's industry context (healthcare → medical, education → learning)
   - Show accomplishments with JD-aligned tech stack where plausible
   - Example: "Developed HIPAA-compliant APIs for patient data management using Go and PostgreSQL"
   
   Adapted Bullets (bridge to JD tech where plausible):
   - Transform technologies to match JD stack
   - Use "adjacent" language for new tech: "integrated with", "supported", "collaborated"
   - Keep or improve metrics
   - Examples:
     * If JD wants microservices → Can claim "Designed microservices architecture"
     * If JD wants Kubernetes → Can claim "Deployed services to Kubernetes"
     * ❌ If healthcare company → DON'T add "IoT gateway" unless technically adjacent
   
   Transferable Bullets (universal engineering skills):
   - CI/CD pipelines, testing, code quality, team collaboration
   - Performance optimization (database, queries, APIs)
   - Can fully adapt to JD keywords
   - Example: "Implemented CI/CD pipelines using Jenkins and GitLab CI, reducing deployment time by 40%"
   
   Safe placement for remaining JD tech:
   - "Collaborated with platform team deploying services to Kubernetes"
   - "Created internal POC using Kafka for event streaming evaluation"
   - "Supported integration with gRPC-based internal services"
   
   ⚠️ AVOID:
   - Cross-domain contamination (IoT keywords in healthcare, finance keywords in education)
   - Scope inflation for seniority level

3. TECHNICAL SKILLS (Organized in 2 sections)
   
   Section A: PROVEN SKILLS (6-8 categories)
   - Include ALL JD technologies
   - Transform candidate's tech stack to match JD where plausible
   - Categories: Languages, Cloud, Databases, Frameworks, DevOps, Messaging, etc.
   
   Section B: FAMILIARITY / WORKING KNOWLEDGE (2-3 categories) - OPTIONAL
   - List JD technologies NOT easily provable in work experience
   - Group by category: "Container Orchestration (Learning): Kubernetes, Helm"
   - Be honest: "Currently expanding knowledge through hands-on projects"
   
   Example:
   PROVEN SKILLS:
     - Languages: Go, Python, Java, JavaScript (from JD)
     - Databases: PostgreSQL, MongoDB, Redis (from JD)
     - DevOps: Jenkins, GitLab CI, Docker, Kubernetes (from JD)
   
   WORKING KNOWLEDGE (optional):
     - Service Mesh & Networking: Istio, OpenVPN (hands-on labs)

4. HANDS-ON LABS / PROJECTS (OPTIONAL - 4-6 bullets)
   
   Purpose: Capture remaining JD keywords ethically
   
   For each unproven JD technology not placed elsewhere:
   - Be explicit: "Built POC", "Created lab environment", "Learned through"
   - Include what you built and what you learned
   - Use present tense for ongoing learning
   
   Examples:
   ✅ "Built gRPC-based microservices POC in Go to evaluate performance vs REST APIs"
   ✅ "Deployed sample containerized applications to local Kubernetes cluster using Helm charts"
   ✅ "Created Kafka event streaming prototype for real-time data processing evaluation"
   ✅ "Learning OpenVPN configuration and service mesh concepts through hands-on experimentation"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STYLE & WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BULLET FORMAT:
   Structure: [Action Verb] + [Technology/Method] + [Metric/Impact] + [Business Context]
   Length: 150-200 characters
   
   Example:
   ✅ "Optimized PostgreSQL query performance for high-traffic patient portal, reducing response time by 55% through indexing and query refactoring strategies"
   ❌ "Worked on database optimization" (too vague)
   ❌ "Single-handedly architected enterprise-scale distributed Kubernetes platform serving 10M users" (unrealistic for mid-level)

2. VERB TIERS BY SENIORITY:
   Junior (0-2 years): Implemented, Developed, Built, Contributed to, Assisted in
   Mid (2-4 years): Developed, Built, Designed (components), Optimized, Implemented
   Senior (4-6 years): Architected (systems), Led, Designed (platforms), Engineered
   Staff+ (6+ years): Architected (platforms), Established, Led org initiatives
   
   ⚠️ Match verbs to candidate's actual experience level

3. METRICS RULES:
   - Use if provided in candidate's resume, or create believable ones
   - Prefer relative impact: "improved", "reduced", "increased"
   - Avoid unrealistic numbers: "10M requests/sec", "99.999% uptime"
   - Prefer believable ranges: "50K+ requests/day", "reduced latency by 30-40%"

4. AVOID:
   ❌ Repetition between Summary and first job bullets
   ❌ Meta-text: "Here are bullets", "Revised version", "New bullets"
   ❌ Multiple bullets about the same accomplishment
   ❌ Buzzword stacking without context: "cloud-native AI-driven blockchain microservices"
   ❌ Technologies that contradict company domain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION CHECKLIST (Before returning resume)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verify:
1. ✅ ALL JD keywords appear at least once (Summary, Experience, Skills, or Labs)
2. ✅ Production claims transformed to match JD stack where plausible
3. ✅ Each company's bullets match their actual industry domain
4. ✅ Remaining unproven JD tech in "Hands-on Labs" or "Working Knowledge" sections (if needed)
5. ✅ Action verbs match candidate's seniority level
6. ✅ No domain-contradicting claims (IoT at healthcare company unless adjacent)
7. ✅ 8-10 bullets per company (proven + adapted + transferable)
8. ✅ "Hands-on Labs" section present with 4-6 bullets (if needed for remaining keywords)
9. ✅ Skills include ALL JD technologies
10. ✅ All bullets are interview-defensible (candidate can explain)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return JSON:
{
  "name": "Candidate Name",
  "title": "Job title from JD",
  "email": "email@example.com",
  "phone": "123-456-7890",
  "summary": [
    "FIRST: [Job Title] with [X]+ years of experience in [domain], specializing in [key tech stack]. Proven track record in [achievements] across [systems/domains]. (150-250 chars)",
    "Bullet 2: Proven skill with specific technologies and outcomes (150-250 chars)",
    "Bullet 3: Technical expertise with metrics or impact (150-250 chars)",
    "Bullet 4: JD keyword - adapted with context (150-250 chars)",
    "Bullet 5: Additional technologies and methodologies (150-250 chars)",
    "Bullet 6: Working knowledge of remaining tech if needed (150-250 chars)"
  ],
  "companies": [
    {
      "role": "Role Title",
      "company": "Company Name",
      "location": "City, State",
      "period": "Jan 2021 - Dec 2023",
      "bullets": [
        "Proven bullet 1 (company's domain + JD tech where plausible)",
        "Proven bullet 2 (company's domain + JD tech where plausible)",
        "Proven bullet 3 (company's domain + JD tech where plausible)",
        "Adapted bullet 1 (transform to JD tech - plausible only)",
        "Adapted bullet 2 (transform to JD tech - plausible only)",
        "Adapted bullet 3 (adjacent tech: 'integrated with', 'supported')",
        "Transferable bullet 1 (CI/CD, testing - use JD tech)",
        "Transferable bullet 2 (optimization, collaboration)",
        "POC/Lab bullet (if needed): 'Created POC using [remaining JD tech]'"
      ],
      "technologies": "PLAIN TEXT STRING: Tech1, Tech2, Tech3 (match bullets - prioritize JD tech)"
    }
  ],
  "skills": {
    "proven": {
      "Languages": "ALL from JD",
      "Cloud": "ALL from JD",
      "Databases": "ALL from JD",
      "DevOps": "ALL from JD"
    },
    "workingKnowledge": {
      "Category": "Remaining JD tech (if any)"
    }
  },
  "handsOnLabs": [
    "Built gRPC microservices POC (if needed for remaining JD tech)",
    "Deployed to Kubernetes cluster (if needed for remaining JD tech)",
    "Created Kafka prototype (if needed for remaining JD tech)"
  ],
  "education": "University    Degree    Dates (PLAIN TEXT STRING)"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL REMINDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GOAL: 100% JD keyword coverage + interview defensibility
✅ STRATEGY: Transform entire resume to JD stack + safe placement for remaining tech
✅ OUTCOME: Pass ATS + Pass recruiter + Pass hiring manager + Pass interview

⚠️ MAINTAIN: Domain coherence, seniority-appropriate verbs
⚠️ AVOID: Cross-domain claims that don't make sense

Now generate the resume. Return ONLY valid JSON, no explanations:`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8,  // Slightly higher for more detailed/creative bullets
          num_predict: 20000,  // Increased for 8-10 detailed bullets per company (150-200 chars each)
          num_ctx: 20480,  // Larger context window for comprehensive output
          stop: []  // Don't stop early
        }
      })
    });

    const data = await response.json();
    let parsedData;
    let cleanResponse = '';  // Declare outside try block for error logging
    
    console.log('📋 Full LLM Response:');
    console.log('─'.repeat(80));
    console.log(data.response);
    console.log('─'.repeat(80));
    
    try {
      // Clean the response - extract JSON from mixed content
      cleanResponse = data.response.trim();
      
      console.log(`📏 LLM response length: ${cleanResponse.length} characters`);
      
      // Remove common markdown code block patterns
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/```\s*$/,'');
      cleanResponse = cleanResponse.replace(/^```\s*/i, '').replace(/```\s*$/,'');
      
      // Find JSON object - look for opening { and closing }
      const jsonStart = cleanResponse.indexOf('{');
      let jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart === -1) {
        throw new Error('No valid JSON object found in response');
      }
      
      // Extract only the JSON portion
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      
      // Check if JSON appears complete (basic validation)
      const openBraces = (cleanResponse.match(/{/g) || []).length;
      const closeBraces = (cleanResponse.match(/}/g) || []).length;
      const openBrackets = (cleanResponse.match(/\[/g) || []).length;
      const closeBrackets = (cleanResponse.match(/\]/g) || []).length;
      
      console.log(`🔧 JSON Structure: {${openBraces}/${closeBraces} [${openBrackets}/${closeBrackets}]`);
      
      // Attempt to repair JSON if brackets/braces are mismatched
      if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
        console.warn(`⚠️  JSON incomplete - attempting repair...`);
        
        // Add missing closing brackets
        const missingBrackets = openBrackets - closeBrackets;
        if (missingBrackets > 0) {
          cleanResponse += ']'.repeat(missingBrackets);
          console.log(`   Added ${missingBrackets} closing bracket(s)`);
        }
        
        // Add missing closing braces
        const missingBraces = openBraces - closeBraces;
        if (missingBraces > 0) {
          cleanResponse += '}'.repeat(missingBraces);
          console.log(`   Added ${missingBraces} closing brace(s)`);
        }
      }
      
      parsedData = JSON.parse(cleanResponse);
      console.log('✅ LLM successfully parsed and tailored resume');
      console.log(`   - Companies extracted: ${parsedData.companies?.length || 0}`);
      console.log(`   - Summary points: ${parsedData.summary?.length || 0}`);
      console.log(`   - Skill categories: ${Object.keys(parsedData.skills || {}).length}`);
      
      // Validate we have critical data
      if (!parsedData.companies || parsedData.companies.length === 0) {
        throw new Error('No work experience extracted. LLM failed to parse companies from resume.');
      }
      
      if (!parsedData.summary || parsedData.summary.length === 0) {
        throw new Error('No summary generated. LLM output incomplete.');
      }
      
      // Check if skills extraction is too minimal
      const skillCategories = Object.keys(parsedData.skills || {});
      if (skillCategories.length < 3) {
        console.warn(`⚠️  Only ${skillCategories.length} skill categories - JD may have more technologies to extract`);
      }
      
      if (parsedData.companies) {
        parsedData.companies.forEach((c, idx) => {
          console.log(`     ${idx + 1}. ${c.role} @ ${c.company} (${c.bullets?.length || 0} bullets)`);
          if (!c.bullets || c.bullets.length === 0) {
            console.warn(`       ⚠️  Company ${idx + 1} has no bullets!`);
          } else if (c.bullets.length < 8) {
            console.warn(`       ⚠️  Company ${idx + 1} has only ${c.bullets.length} bullets - should have 8-10 for rich content`);
          }
        });
      }
      
      // Post-process: Expand companies with < 8 bullets
      console.log('\n🔍 Checking bullet count for each company...');
      for (let idx = 0; idx < parsedData.companies.length; idx++) {
        const company = parsedData.companies[idx];
        if (!company.bullets || company.bullets.length < 8) {
          const currentCount = company.bullets?.length || 0;
          const needed = 8 - currentCount;
          console.log(`\n📝 Company "${company.company}" has only ${currentCount} bullets. Expanding to 8 bullets...`);
          
          // Use LLM to generate additional bullets
          const expansionPrompt = `You are expanding work experience bullets for a resume. CRITICAL: Maintain credibility and domain alignment.

JOB DESCRIPTION TARGET:
${jd}

COMPANY: ${company.company}
ROLE: ${company.role}
PERIOD: ${company.period}

EXISTING BULLETS (${currentCount}):
${company.bullets?.join('\n') || 'None'}

⚠️ CREDIBILITY RULES:
1. **RESPECT COMPANY DOMAIN**: If company is healthcare, don't add IoT. If education, don't add finance.
2. **PLAUSIBLE TECHNOLOGIES**: Only add JD tech that makes sense for this company's industry
3. **SENIORITY-APPROPRIATE**: Use verbs matching the role level (avoid "Architected platform" for junior roles)
4. **FOLLOW EXISTING STYLE**: Match the tone and technical level of existing bullets

TASK: Generate ${needed} MORE bullets (150-200 chars each) that:
- Maintain consistency with company's actual domain
- Bridge to JD requirements where TECHNICALLY PLAUSIBLE
- Use different action verbs than existing bullets
- Include specific metrics, technologies, and business impact
- Focus on: testing, CI/CD, performance optimization, collaboration, monitoring (universal skills)
- DO NOT fabricate experience in domains company doesn't operate in

Return ONLY the new bullet points, one per line, without numbers or bullet symbols.`;

          try {
            const expansionResponse = await fetch('http://localhost:11434/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama3:latest',
                prompt: expansionPrompt,
                stream: false,
                options: {
                  temperature: 0.8,  // Slightly higher for creativity
                  num_predict: 2000,
                  num_ctx: 8192
                }
              })
            });
            
            const expansionData = await expansionResponse.json();
            const newBullets = expansionData.response.trim().split('\n')
              .filter(line => line.trim().length > 50)  // Filter out short/empty lines
              .map(line => line.trim().replace(/^[-•*]\s*/, ''))  // Remove bullet symbols
              .slice(0, needed);  // Take only what we need
            
            if (newBullets.length > 0) {
              company.bullets = [...(company.bullets || []), ...newBullets];
              console.log(`   ✅ Added ${newBullets.length} bullets. Total now: ${company.bullets.length}`);
            } else {
              console.warn(`   ⚠️  Failed to generate additional bullets for ${company.company}`);
            }
          } catch (error) {
            console.error(`   ❌ Error expanding bullets for ${company.company}:`, error.message);
          }
        } else {
          console.log(`   ✅ ${company.company}: ${company.bullets.length} bullets (sufficient)`);
        }
      }
      console.log('');
      
    } catch (parseError) {
      console.error('❌ Failed to parse LLM JSON response:', parseError.message);
      console.error('Full response length:', data.response.length);
      console.error('Attempted to parse (first 1000 chars):');
      console.error(cleanResponse?.substring(0, 1000));
      console.error('Attempted to parse (last 500 chars):');
      console.error(cleanResponse?.substring(cleanResponse.length - 500));
      
      throw new Error(`LLM returned invalid JSON: ${parseError.message}. The model may be truncating output. Try with a shorter JD or resume.`);
    }

    // Merge with user credentials (use LLM data as base, override with user input if provided)
    return {
      name: userCredentials.name || parsedData.name,
      title: userCredentials.title || parsedData.title,
      email: userCredentials.email || parsedData.email,
      phone: userCredentials.phone || parsedData.phone,
      summary: parsedData.summary || [],
      companies: parsedData.companies || [],
      skills: parsedData.skills || {},
      education: parsedData.education || ''
    };
    
  } catch (error) {
    console.error('❌ LLM parsing error:', error);
    throw new Error('Failed to parse resume with LLM: ' + error.message);
  }
}

// OLD MANUAL PARSING FUNCTIONS - DEPRECATED
// These are kept as backup but no longer used
/*
function parseResume(resumeContent) {
  const lines = resumeContent.split('\n');
  const data = {
    summary: [],
    education: '',
    companies: [],
    skills: {}
  };
  
  let currentSection = null;
  let currentCompany = null;
  let inTechnologiesUsed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect sections
    if (line.match(/^PROFESSIONAL\s+SUMMARY:?$/i) || line.match(/^SUMMARY:?$/i)) {
      currentSection = 'summary';
      console.log(`📍 Found SUMMARY section at line ${i}`);
      continue;
    }
    
    if (line.match(/^(WORK\s+)?EXPERIENCE:?$/i) || line.match(/^PROFESSIONAL\s+EXPERIENCE:?$/i)) {
      currentSection = 'experience';
      console.log(`📍 Found EXPERIENCE section at line ${i}`);
      continue;
    }
    
    if (line.match(/^EDUCATION:?$/i)) {
      currentSection = 'education';
      console.log(`📍 Found EDUCATION section at line ${i}`);
      continue;
    }
    
    if (line.match(/^TECHNICAL\s+SKILLS:?$/i) || line.match(/^SKILLS:?$/i)) {
      currentSection = 'skills';
      console.log(`📍 Found SKILLS section at line ${i}`);
      continue;
    }
    
    // Parse summary bullets
    if (currentSection === 'summary' && line.startsWith('•')) {
      data.summary.push(line.substring(1).trim());
      continue;
    }
    
    // Parse work experience
    if (currentSection === 'experience') {
      // Check for "Technologies Used:" line
      if (line.match(/^Technologies\s+Used:/i)) {
        inTechnologiesUsed = true;
        const techText = line.substring(line.indexOf(':') + 1).trim();
        if (currentCompany && techText) {
          currentCompany.technologies = techText;
        }
        continue;
      }
      
      // If we're in technologies section, continue adding to it
      if (inTechnologiesUsed && currentCompany && !line.match(/^(Senior|Software|Junior|Staff|Lead|Principal|Data|Associate)/i)) {
        if (line.length > 0 && !line.startsWith('•')) {
          currentCompany.technologies += ' ' + line;
        }
        if (line.length === 0) {
          inTechnologiesUsed = false;
        }
        continue;
      }
      
      // Try multiple company/role formats:
      let jobMatch = null;
      let role = null, company = null, location = null, period = null;
      
      // Format 1: "Role @ Company | Location     Date" (e.g., Software Engineer @ Google | NYC    Jan 2020 - Present)
      jobMatch = line.match(/^(.+?)\s+@\s+(.+?)\s+\|\s+(.+?)(\s{2,})(.+)$/);
      if (jobMatch) {
        role = jobMatch[1].trim();
        company = jobMatch[2].trim();
        location = jobMatch[3].trim();
        period = jobMatch[5].trim();
      }
      
      // Format 2: "Company Name | Location     Date" (company line, role on next line)
      if (!jobMatch) {
        jobMatch = line.match(/^(.+?)\s+\|\s+(.+?)(\s{2,})(.+)$/);
        if (jobMatch && !line.match(/^(Senior|Software|Junior|Staff|Lead|Principal|Data|Associate|Engineer)/i)) {
          company = jobMatch[1].trim();
          location = jobMatch[2].trim();
          period = jobMatch[4].trim();
          // Role will be on next line - store partial company
          currentCompany = {
            role: '',
            company,
            location,
            period,
            bullets: [],
            technologies: ''
          };
          data.companies.push(currentCompany);
          console.log(`   ✅ Found company (awaiting role): ${company} (${period})`);
          continue;
        }
      }
      
      // Format 3: "Role | Company Name | Location | Date" (all delimited by |)
      if (!jobMatch) {
        jobMatch = line.match(/^(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/);
        if (jobMatch) {
          role = jobMatch[1].trim();
          company = jobMatch[2].trim();
          location = jobMatch[3].trim();
          period = jobMatch[4].trim();
        }
      }
      
      // If we found role and company through any format, create/update company entry
      if (role && company) {
        inTechnologiesUsed = false;
        currentCompany = {
          role,
          company,
          location,
          period,
          bullets: [],
          technologies: ''
        };
        data.companies.push(currentCompany);
        console.log(`   ✅ Found company: ${role} @ ${company} (${period})`);
        continue;
      }
      
      // If previous line was company without role, this might be the role line
      if (currentCompany && !currentCompany.role && line.match(/^(Senior|Software|Junior|Staff|Lead|Principal|Data|Associate|Engineer)/i)) {
        currentCompany.role = line.trim();
        console.log(`   ✅ Added role: ${currentCompany.role}`);
        continue;
      }
      
      // Parse bullet points
      if (currentCompany && line.startsWith('•')) {
        currentCompany.bullets.push(line.substring(1).trim());
        continue;
      }
    }
    
    // Parse education
    if (currentSection === 'education' && line.length > 0) {
      if (!data.education) {
        data.education = line;
      }
      continue;
    }
    
    // Parse skills
    if (currentSection === 'skills') {
      // Format: "Category: skills, skills, skills"
      const skillMatch = line.match(/^(.+?):\s*(.+)$/);
      if (skillMatch) {
        const category = skillMatch[1].trim();
        const skills = skillMatch[2].trim();
        data.skills[category] = skills;
        console.log(`   📝 Skill category: ${category}`);
        continue;
      }
    }
  }
  
  return data;
}

// Generate tailored content using AI
async function generateTailoredContent(jd, resumeData, userCredentials) {
  console.log('\n🚀 Generating tailored content with AI...');
  
  // Generate summary
  console.log('📝 Generating summary...');
  const summaryPrompt = `Job Description:
${jd}

Original Resume Summary Points:
${resumeData.summary.join('\n')}

Generate a PROFESSIONAL SUMMARY with 6-8 bullet points that:
- Highlight relevant skills and experience for this specific job
- Use powerful action verbs and quantifiable achievements
- Emphasize technologies and methodologies mentioned in the JD
- Keep each bullet concise (100-150 characters)
- Start with strong technical competencies

Return ONLY the bullet points, one per line, without bullet symbols.`;

  const summaryResponse = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      prompt: summaryPrompt,
      stream: false
    })
  });
  
  const summaryData = await summaryResponse.json();
  const summaryPoints = summaryData.response.trim().split('\n').filter(l => l.trim().length > 0);
  console.log(`   ✅ Generated ${summaryPoints.length} summary points`);
  
  // Generate tailored bullets for each company
  const tailoredCompanies = [];
  for (const company of resumeData.companies) {
    console.log(`📝 Tailoring bullets for ${company.company}...`);
    
    const bulletPrompt = `Job Description:
${jd}

Company: ${company.company}
Role: ${company.role}
Original Accomplishments:
${company.bullets.join('\n')}

Generate 5-6 achievement bullet points that:
- Align with the job description requirements
- Emphasize relevant technologies, methodologies, and skills
- Include quantifiable metrics and impact
- Use strong action verbs (Developed, Architected, Implemented, Optimized, etc.)
- Keep each bullet concise (120-180 characters)
- Focus on technical depth and business impact

Return ONLY the bullet points, one per line, without bullet symbols.`;

    const bulletResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: bulletPrompt,
        stream: false
      })
    });
    
    const bulletData = await bulletResponse.json();
    const bulletPoints = bulletData.response.trim().split('\n').filter(l => l.trim().length > 0);
    
    tailoredCompanies.push({
      ...company,
      bullets: bulletPoints
    });
    
    console.log(`   ✅ Generated ${bulletPoints.length} bullets`);
  }
  
  // Generate JD-tailored skills
  console.log('📝 Generating JD-tailored skills...');
  const skillsPrompt = `Job Description:
${jd}

Original Skills from Resume:
${Object.entries(resumeData.skills).map(([cat, skills]) => `${cat}: ${skills}`).join('\n')}

Analyze the job description and generate a TECHNICAL SKILLS section with 6-8 categories that:
- Prioritize skills EXPLICITLY mentioned in the JD
- Include relevant technologies, frameworks, and tools from the JD
- Organize into logical categories (e.g., Programming Languages, Cloud Platforms, Databases, etc.)
- Use the candidate's existing skills as a foundation but emphasize JD-relevant ones
- Keep each category concise with 4-8 items

Format: Return ONLY in this exact format:
Category Name: skill1, skill2, skill3, skill4
Category Name: skill1, skill2, skill3

Do NOT include explanations, just the category:skills format.`;

  const skillsResponse = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      prompt: skillsPrompt,
      stream: false
    })
  });
  
  const skillsData = await skillsResponse.json();
  const skillsText = skillsData.response.trim();
  
  // Parse AI-generated skills into object
  const generatedSkills = {};
  const skillLines = skillsText.split('\n').filter(l => l.trim().length > 0);
  for (const line of skillLines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const category = match[1].trim();
      const skills = match[2].trim();
      generatedSkills[category] = skills;
    }
  }
  
  console.log(`   ✅ Generated ${Object.keys(generatedSkills).length} skill categories tailored to JD`);

  return {
    name: userCredentials.name,
    title: userCredentials.title,
    email: userCredentials.email,
    phone: userCredentials.phone,
    summary: summaryPoints,
    companies: tailoredCompanies,
    skills: Object.keys(generatedSkills).length > 0 ? generatedSkills : resumeData.skills,
    education: resumeData.education
  };
}
*/
// END OF DEPRECATED MANUAL PARSING FUNCTIONS

// Generate DOCX matching the screenshot format
async function generateResumeDOCX(content) {
  console.log('📋 Creating DOCX with exact format match...');
  
  const sections = [];
  
  // Header: Name Title (no dash)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: content.name,
          bold: true,
          size: 28
        }),
        new TextRun({
          text: ' ',
          size: 28
        }),
        new TextRun({
          text: content.title,
          size: 28
        })
      ],
      spacing: { after: 100 }
    })
  );
  
  // Contact info
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${content.phone} | ${content.email}`,
          size: 20
        })
      ],
      spacing: { after: 200 }
    })
  );
  
  // PROFESSIONAL SUMMARY header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'PROFESSIONAL SUMMARY:',
          bold: true,
          size: 22
        })
      ],
      spacing: { before: 200, after: 150 }
    })
  );
  
  // Summary bullets
  for (const point of content.summary) {
    sections.push(
      new Paragraph({
        text: point,
        bullet: { level: 0 },
        size: 20,
        spacing: { before: 60, after: 60 }  // Slightly tighter for 2-page layout
      })
    );
  }
  
  // EDUCATION header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EDUCATION:',
          bold: true,
          size: 22
        })
      ],
      spacing: { before: 200, after: 120 }  // Tighter spacing
    })
  );
  
  // Education content - handle both string and object formats
  let educationText = content.education;
  if (typeof content.education === 'object' && content.education !== null) {
    // If it's an object, convert to string
    if (content.education.university && content.education.degree) {
      educationText = `${content.education.university}    ${content.education.degree}    ${content.education.dates || ''}`;
    } else {
      educationText = JSON.stringify(content.education);
    }
  }
  sections.push(
    new Paragraph({
      text: educationText,
      size: 20,
      spacing: { after: 200 }
    })
  );
  
  // WORK EXPERIENCE header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'WORK EXPERIENCE:',
          bold: true,
          size: 22
        })
      ],
      spacing: { before: 200, after: 120 }  // Tighter spacing
    })
  );
  
  // Work experience entries
  for (const company of content.companies) {
    // Company header: Role @ Company | Location with date right-aligned
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${company.role} @ ${company.company} | ${company.location}`,
            bold: true,
            size: 20
          }),
          new TextRun({
            text: '\t',
            size: 20
          }),
          new TextRun({
            text: company.period,
            size: 20
          })
        ],
        spacing: { before: 200, after: 100 },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX
          }
        ]
      })
    );
    
    // Bullet points
    for (const bullet of company.bullets) {
      sections.push(
        new Paragraph({
          text: bullet,
          bullet: { level: 0 },
          size: 20,
          spacing: { before: 50, after: 50 }  // Tighter for 8-10 bullets per company
        })
      );
    }
    
    // Technologies Used - handle both string and object formats
    if (company.technologies) {
      let techText = company.technologies;
      if (typeof company.technologies === 'object' && company.technologies !== null) {
        // If it's an object, convert to comma-separated string
        if (Array.isArray(company.technologies)) {
          techText = company.technologies.join(', ');
        } else {
          techText = Object.values(company.technologies).flat().join(', ');
        }
      }
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Technologies Used: ',
              bold: true,
              size: 20
            }),
            new TextRun({
              text: techText,
              size: 20
            })
          ],
          spacing: { before: 100, after: 150 }
        })
      );
    }
  }
  
  // HANDS-ON LABS / PROJECTS (optional section)
  if (content.handsOnLabs && Array.isArray(content.handsOnLabs) && content.handsOnLabs.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'HANDS-ON LABS / PROJECTS:',
            bold: true,
            size: 22
          })
        ],
        spacing: { before: 250, after: 150 }
      })
    );
    
    // Hands-on labs bullets
    for (const lab of content.handsOnLabs) {
      sections.push(
        new Paragraph({
          text: lab,
          bullet: { level: 0 },
          size: 20,
          spacing: { before: 60, after: 60 }
        })
      );
    }
  }
  
  // TECHNICAL SKILLS header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'TECHNICAL SKILLS:',
          bold: true,
          size: 22
        })
      ],
      spacing: { before: 250, after: 120 }  // Tighter spacing
    })
  );
  
  // Skills - handle both flat structure and nested (proven/workingKnowledge) structure
  const skillsData = content.skills;
  if (skillsData.proven && typeof skillsData.proven === 'object') {
    // New nested structure
    for (const [category, skills] of Object.entries(skillsData.proven)) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${category}: `,
              bold: true,
              size: 20
            }),
            new TextRun({
              text: skills,
              size: 20
            })
          ],
          spacing: { before: 80, after: 80 }
        })
      );
    }
    
    // Working Knowledge section (if present)
    if (skillsData.workingKnowledge && typeof skillsData.workingKnowledge === 'object' && Object.keys(skillsData.workingKnowledge).length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'WORKING KNOWLEDGE / FAMILIARITY:',
              bold: true,
              size: 20,
              italics: true
            })
          ],
          spacing: { before: 150, after: 100 }
        })
      );
      
      for (const [category, skills] of Object.entries(skillsData.workingKnowledge)) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                bold: true,
                size: 20
              }),
              new TextRun({
                text: skills,
                size: 20
              })
            ],
            spacing: { before: 80, after: 80 }
          })
        );
      }
    }
  } else {
    // Flat structure (backward compatible)
    for (const [category, skills] of Object.entries(skillsData)) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${category}: `,
              bold: true,
              size: 20
            }),
            new TextRun({
              text: skills,
              size: 20
            })
          ],
          spacing: { before: 80, after: 80 }
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
            top: 576,    // 0.4 inches - optimized for 2-page content
            right: 576,
            bottom: 576,
            left: 576
          }
        }
      },
      children: sections
    }]
  });
  
  // Save to temp file
  const fileName = `resume_${Date.now()}.docx`;
  const filePath = path.join(TEMP_DIR, fileName);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

// Generate HTML preview
function generateHTMLPreview(content) {
  // Handle education - convert object to string if needed
  let educationText = content.education;
  if (typeof content.education === 'object' && content.education !== null) {
    if (content.education.university && content.education.degree) {
      educationText = `${content.education.university}    ${content.education.degree}    ${content.education.dates || ''}`;
    } else {
      educationText = JSON.stringify(content.education);
    }
  }
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 5px; }
    .contact { margin-bottom: 20px; font-size: 14px; }
    h2 { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
    ul { margin: 10px 0; padding-left: 25px; }
    li { margin: 8px 0; }
    .company-header { font-weight: bold; margin-top: 20px; display: flex; justify-content: space-between; }
    .tech-used { margin-top: 10px; margin-bottom: 15px; }
    .tech-used strong { font-weight: bold; }
  </style>
</head>
<body>
  <h1>${content.name} ${content.title}</h1>
  <div class="contact">${content.phone} | ${content.email}</div>
  
  <h2>PROFESSIONAL SUMMARY:</h2>
  <ul>
    ${content.summary.map(p => `<li>${p}</li>`).join('')}
  </ul>
  
  <h2>EDUCATION:</h2>
  <p>${educationText}</p>
  
  <h2>WORK EXPERIENCE:</h2>
  ${content.companies.map(c => {
    // Handle technologies - convert object to string if needed
    let techText = c.technologies || '';
    if (typeof c.technologies === 'object' && c.technologies !== null) {
      if (Array.isArray(c.technologies)) {
        techText = c.technologies.join(', ');
      } else {
        techText = Object.values(c.technologies).flat().join(', ');
      }
    }
    
    return `
    <div class="company-header">
      <span>${c.role} @ ${c.company} | ${c.location}</span>
      <span>${c.period}</span>
    </div>
    <ul>
      ${c.bullets.map(b => `<li>${b}</li>`).join('')}
    </ul>
    ${techText ? `<div class="tech-used"><strong>Technologies Used:</strong> ${techText}</div>` : ''}
  `;
  }).join('')}
  
  ${content.handsOnLabs && Array.isArray(content.handsOnLabs) && content.handsOnLabs.length > 0 ? `
  <h2>HANDS-ON LABS / PROJECTS:</h2>
  <ul>
    ${content.handsOnLabs.map(lab => `<li>${lab}</li>`).join('')}
  </ul>
  ` : ''}
  
  <h2>TECHNICAL SKILLS:</h2>
  ${content.skills.proven && typeof content.skills.proven === 'object' ? `
    ${Object.entries(content.skills.proven).map(([cat, skills]) => 
      `<p><strong>${cat}:</strong> ${skills}</p>`
    ).join('')}
    ${content.skills.workingKnowledge && typeof content.skills.workingKnowledge === 'object' && Object.keys(content.skills.workingKnowledge).length > 0 ? `
      <h3 style="font-size: 16px; font-style: italic; margin-top: 20px;">WORKING KNOWLEDGE / FAMILIARITY:</h3>
      ${Object.entries(content.skills.workingKnowledge).map(([cat, skills]) => 
        `<p><strong>${cat}:</strong> ${skills}</p>`
      ).join('')}
    ` : ''}
  ` : `
    ${Object.entries(content.skills).map(([cat, skills]) => 
      `<p><strong>${cat}:</strong> ${skills}</p>`
    ).join('')}
  `}
</body>
</html>`;
  
  return html;
}

// Extract text from DOCX
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const data = await pdfParse(buffer);
  return data.text;
}
