import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const jobDescription = formData.get('jobDescription');
    const mode = formData.get('mode'); // 'fulltime' or 'ctoc'
    const resumeText = formData.get('resumeText');
    const resumeFile = formData.get('resumeFile');

    if (!jobDescription || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let resumeContent = '';

    // Handle file upload if provided
    if (resumeFile) {
      const buffer = await resumeFile.arrayBuffer();
      const fileType = resumeFile.name.toLowerCase();

      if (fileType.endsWith('.pdf')) {
        // For PDF files, we'll use a simple text extraction
        // In production, you might want to use a library like pdf-parse
        resumeContent = await extractTextFromPDF(buffer);
      } else if (fileType.endsWith('.docx') || fileType.endsWith('.doc')) {
        // For DOCX files, we'll use mammoth or similar
        resumeContent = await extractTextFromDocx(buffer);
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please use PDF or DOCX.' },
          { status: 400 }
        );
      }
    } else if (resumeText) {
      resumeContent = resumeText;
    } else {
      return NextResponse.json(
        { error: 'Please provide resume text or file' },
        { status: 400 }
      );
    }

    // Generate the tailored resume using Ollama
    const prompt = mode === 'fulltime' 
      ? generateFullTimePrompt(jobDescription, resumeContent)
      : generateCtoCPrompt(jobDescription, resumeContent);

    // Call Ollama API
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8, // Higher for more creative, varied vocabulary
          top_p: 0.95, // Nucleus sampling for better diversity
          top_k: 60, // Increase vocabulary diversity
          repeat_penalty: 1.3, // Strongly penalize repetition
          frequency_penalty: 0.8, // Reduce word frequency repetition
          presence_penalty: 0.6, // Encourage new words and phrases
          num_predict: 8192, // Allow longer responses for full generation
        }
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to connect to Ollama. Make sure Ollama is running with llama3:latest model.' },
        { status: 500 }
      );
    }

    const ollamaData = await ollamaResponse.json();
    const generatedText = ollamaData.response;

    // Parse the JSON response from Ollama
    let parsedResponse;
    try {
      let jsonText = generatedText.trim();
      
      // Remove markdown code fences if present
      jsonText = jsonText.replace(/^```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
      
      // Find the first { and last } to extract JSON (handles truncation)
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
      
      parsedResponse = JSON.parse(jsonText);
      
      // Keep summary as array (frontend handles both string and array)
      // No normalization needed - frontend is already updated to handle arrays
      
      // Ensure experience has products field and bullets are arrays
      if (parsedResponse.experience) {
        parsedResponse.experience = parsedResponse.experience.map(exp => ({
          company: exp.company,
          products: exp.products || '',
          bullets: Array.isArray(exp.bullets) ? exp.bullets : [String(exp.bullets)]
        }));
      }
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText.substring(0, 500));
      console.error('Parse error:', parseError.message);
      return NextResponse.json(
        { error: 'Failed to parse AI response. The response may be incomplete. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error in tailor-resume API:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

function generateFullTimePrompt(jobDescription, resume) {
  return `You are an expert ATS resume writer creating accomplishment-driven, keyword-optimized resumes for full-time positions.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resume}

CRITICAL FORMATTING RULES:
1. NO bold formatting - plain text only
2. NO HTML tags, NO markdown, NO asterisks
3. NO repeated action verbs across bullets - each verb used ONLY ONCE
4. NO generic words: "leveraged", "utilized", "facilitated", "responsible for"
5. DO NOT use placeholders - ACTUALLY GENERATE ALL BULLETS
6. DO NOT write "continue until" - WRITE OUT EVERY SINGLE BULLET
7. Use ONLY strong action verbs from the approved list below

ATS VOCABULARY DIVERSITY RULES (STRICTLY ENFORCE):
- CRITICAL: Words "Designed", "Developed", "Architecture", "Architected", "Implemented", "Built", "Created" can ONLY appear MAX 2 times TOTAL across ALL bullets combined
- Track these high-frequency words: Design/Designed, Develop/Developed, Architecture/Architected, Implement/Implemented, Build/Built, Create/Created
- If you use "Designed" once, you CANNOT use "Design" or "Designed" again for at least 10 bullets
- If you use "Developed" once, you CANNOT use "Develop" or "Developed" again for at least 10 bullets  
- Use synonyms: "Crafted", "Established", "Formulated", "Constructed", "Produced", "Composed", "Fashioned"
- Vary sentence structures dramatically - no pattern should repeat
- Each bullet must be completely unique in vocabulary and phrasing
- NEVER start consecutive bullets with similar words or structures

REQUIRED ACTION VERBS (30 different verbs - use each ONLY ONCE):
Architected, Engineered, Developed, Implemented, Built, Created, Deployed, Established, Launched, Spearheaded, Pioneered, Transformed, Modernized, Streamlined, Optimized, Automated, Accelerated, Scaled, Reduced, Increased, Improved, Enhanced, Delivered, Achieved, Executed, Directed, Led, Managed, Coordinated, Integrated

OUTPUT FORMAT (JSON):
{
  "summary": [
    "Point 1 here",
    "Point 2 here",
    "Point 3 here",
    "...continue until Point 26"
  ],
  "experience": [
    {
      "company": "Most Recent Company",
      "products": "Product A, Product B, Platform C",
      "bullets": [
        "Bullet 1 here",
        "Bullet 2 here",
        "Bullet 3 here",
        "...write all 30 bullets - NO PLACEHOLDERS"
      ]
    }
  ]
}

REQUIREMENTS:

SUMMARY (EXACTLY 25-27 bullets):
FIRST BULLET (MANDATORY FORMAT):
"[Senior/Lead/Principal] [Job Title from JD] with [11+] years of experience in [2-3 primary tech stacks from JD], specializing in [2-3 key domains/industries from experience], delivering [type of solutions] for [business context]"

Example: "Senior Java Full Stack Developer with 11+ years of experience in Java/J2EE, Spring Boot, Angular, and cloud technologies, specializing in enterprise applications, microservices architecture, and financial systems, delivering scalable solutions for Fortune 500 companies"

REMAINING 24-26 BULLETS:
- Each 2.5-3 lines, keyword-dense, JD-aligned
- Start with context when possible (not always action verb)
- Include certifications, methodologies, domain expertise
- Mix: technical skills, achievements, technologies, frameworks
- Vary structure: some narrative, some achievement-based
- NO repetition of common words across bullets
- NO bold - plain text only

EXPERIENCE (EXACTLY 30 bullets for most recent company):
Products Line: List 2-3 actual product/platform names from resume

Bullet 1-2: BUSINESS/LEADERSHIP IMPACT
- Verbs: Spearheaded, Directed, Led
- Content: Revenue impact, cost savings, team leadership, business outcomes
- Metrics: Dollar amounts, percentages, team sizes

Bullets 3-30: TECHNICAL ACHIEVEMENTS (28 bullets)
- Each starts with DIFFERENT verb from approved list - track used verbs
- NEVER repeat verbs across any bullets
- STRICTLY avoid repeating patterns or common words
- Format: [UniqueVerb] [technical solution description] using [Tech1, Tech2, Tech3] [achieving/improving/supporting] [specific metrics]
- Vary the structure significantly between bullets

METRIC REQUIREMENTS (every bullet needs metrics):
- Throughput: requests/day, transactions/sec, events/min
- Performance: latency reduction (before → after in ms/sec)
- Scale: concurrent users, data volume processed, service count
- Reliability: uptime percentage, error rate reduction
- Efficiency: time savings, cost reduction, resource optimization

EXAMPLES (2.5-3 lines, plain text, varied structures):
"Architected event-driven microservices platform using Java 17, Spring Boot 3.2, Apache Kafka, Redis Cluster serving 8M daily users across 15 distributed services, reducing average response latency by 68% from 520ms to 166ms, and achieving 99.97% uptime"

"Established robust CI/CD pipeline with Jenkins, Docker, Kubernetes, and Terraform, automating deployment processes for 12 microservices, cutting release cycles from 3 days to 4 hours, eliminating 94% of manual deployment errors"

"Transformed legacy monolithic application into cloud-native microservices using Spring Cloud, Netflix Eureka, and AWS ECS, enabling independent scaling of 18 services, processing 45K transactions per minute with sub-200ms latency"

CRITICAL INSTRUCTIONS:
1. Generate ALL 25-27 summary bullets (not 30) - complete every single one
2. Generate ALL 30 experience bullets - complete every single one
3. DO NOT use "...more bullets" or placeholders
4. Track used action verbs - use each ONLY ONCE
5. Track common words (designed, developed, architecture) - limit to 2-3 uses total
6. Vary sentence structures significantly
7. Return ONLY valid JSON
8. Plain text only - no bold, no HTML, no markdown
9. FIRST summary bullet MUST follow the mandatory format with role, years, tech stack, and domains`;
}

function generateCtoCPrompt(jobDescription, resume) {
  return `You are an expert ATS resume writer creating detailed, keyword-dense resumes for Corp-to-Corp (C2C) contract positions.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resume}

CRITICAL FORMATTING RULES:
1. NO bold formatting - plain text only
2. NO HTML tags, NO markdown, NO asterisks
3. NO repeated action verbs - each verb used ONLY ONCE across all bullets
4. NO generic words: "leveraged", "utilized", "facilitated", "responsible for"
5. DO NOT use placeholders - ACTUALLY GENERATE ALL BULLETS
6. DO NOT write "continue until" - WRITE OUT EVERY SINGLE BULLET

ATS VOCABULARY DIVERSITY RULES (STRICTLY ENFORCE):
- CRITICAL: Words "Designed", "Developed", "Architecture", "Architected", "Implemented", "Built", "Created" can ONLY appear MAX 2 times TOTAL across ALL bullets combined
- Track these high-frequency words meticulously: Design/Designed, Develop/Developed, Architecture/Architected, Implement/Implemented, Build/Built, Create/Created
- If you use "Designed" once, you CANNOT use "Design" or "Designed" again for at least 10 bullets
- If you use "Developed" once, you CANNOT use "Develop" or "Developed" again for at least 10 bullets
- If you use "Architected" once, you CANNOT use "Architecture" or "Architected" again for at least 10 bullets
- Use creative synonyms: "Crafted", "Established", "Formulated", "Constructed", "Produced", "Composed", "Fashioned", "Forged"
- Vary sentence structures dramatically - no two bullets should have similar flow
- Each bullet must be completely unique in vocabulary, tone, and phrasing
- NEVER start consecutive bullets with similar words or structures
- Make every bullet feel fresh and distinct

REQUIRED ACTION VERBS (30 different verbs - use each ONLY ONCE):
Architected, Engineered, Developed, Implemented, Built, Created, Deployed, Established, Launched, Spearheaded, Pioneered, Transformed, Modernized, Streamlined, Optimized, Automated, Accelerated, Scaled, Reduced, Increased, Improved, Enhanced, Delivered, Achieved, Executed, Directed, Led, Migrated, Integrated, Orchestrated

OUTPUT FORMAT (JSON):
{
  "summary": [
    "Point 1 here",
    "Point 2 here",
    "Point 3 here",
    "...continue until Point 26"
  ],
  "experience": [
    {
      "company": "Most Recent Client Name",
      "products": "Product Alpha, Platform Beta, System Gamma",
      "bullets": [
        "Bullet 1 here",
        "Bullet 2 here",
        "Bullet 3 here",
        "...continue until Bullet 30"
      ]
    }
  ]
}

REQUIREMENTS:

SUMMARY (EXACTLY 25-27 bullets):
FIRST BULLET (MANDATORY FORMAT):
"[Senior/Lead/Principal] [Job Title from JD] with [11+] years of experience in [2-3 primary tech stacks from JD], specializing in [2-3 key domains/industries], delivering [type of solutions] for [client context/industry]"

Example: "Senior Java Full Stack Developer with 11+ years of experience in Java/J2EE, Spring Boot, React, and AWS cloud platforms, specializing in enterprise microservices, fintech applications, and e-commerce systems, delivering high-performance solutions for Fortune 500 clients"

REMAINING 24-26 BULLETS:
- Each 2.5-3 lines, keyword-dense, JD-aligned
- Start with context when appropriate (not always action verb)
- Include certifications, methodologies, domain expertise, client types
- Mix: technical skills, achievements, technologies, frameworks, business value
- Significant variety in structure: some narrative, some achievement-focused, some skill-focused
- ZERO repetition of common words across bullets
- NO bold - plain text only

EXPERIENCE (EXACTLY 30 bullets for most recent client):
Products Line: List 2-3 actual product/platform/system names from resume

Bullet 1-2: BUSINESS/LEADERSHIP IMPACT
- Verbs: Spearheaded, Directed, Led
- Content: Revenue impact, cost savings, team leadership, stakeholder value, business outcomes
- Metrics: Dollar amounts, percentages, team sizes, timelines

Bullets 3-30: TECHNICAL ACHIEVEMENTS (28 bullets)
- Each starts with DIFFERENT verb from approved list - maintain strict tracking
- NEVER repeat verbs across any bullets
- STRICTLY avoid repeating patterns, phrases, or common words
- Format: [UniqueVerb] [detailed technical solution] using [Tech1, Tech2, Tech3, Tech4] [achieving/improving/supporting/enabling] [2-3 specific metrics with numbers]
- Dramatically vary the structure and flow between consecutive bullets

METRIC REQUIREMENTS (every bullet needs 2-3 metrics):
- Throughput: requests/day, transactions/sec, events/hour, API calls/minute
- Performance: latency reduction (before → after in ms/sec)
- Scale: concurrent users, data volume processed, service count, system capacity
- Reliability: uptime percentage, error rate reduction, zero-downtime achievements
- Efficiency: time savings, cost reduction percentages, resource optimization, ROI

EXAMPLES (2.5-3 lines, plain text, highly varied structures):
"Architected event-driven microservices platform using Java 17, Spring Boot 3.2, Apache Kafka, Redis Cluster, PostgreSQL, Docker Swarm serving 8M daily users across 15 distributed services, reducing average response latency by 68% from 520ms to 166ms, achieving 99.97% uptime with zero-downtime deployments"

"Transformed legacy monolithic system into cloud-native architecture leveraging Spring Cloud Gateway, Netflix Eureka, AWS EKS, and RDS Aurora, enabling independent scaling of 22 microservices, processing 3.2M transactions daily with sub-150ms P95 latency, cutting infrastructure costs by $240K annually"

"Established comprehensive CI/CD pipeline with Jenkins, GitLab CI, Docker, Kubernetes, Helm Charts, ArgoCD, and Terraform, automating 50+ deployments weekly across 8 environments, reducing deployment time by 87% from 4.5 hours to 32 minutes, eliminating 96% of manual configuration errors"

"Engineered real-time data processing pipeline using Apache Kafka Streams, Apache Flink, AWS Kinesis, and DynamoDB, handling 120K events per second with exactly-once semantics, reducing data latency from 45 minutes to under 3 seconds, enabling instant analytics for business stakeholders"

CRITICAL INSTRUCTIONS:
1. Generate ALL 25-27 summary bullets (not 30) - complete every single one
2. Generate ALL 30 experience bullets - complete every single one
3. DO NOT use "...more bullets" or any placeholders whatsoever
4. Track used action verbs meticulously - use each ONLY ONCE
5. Track common words (designed, developed, architecture, implemented) - limit to 2-3 uses total across all bullets
6. Vary sentence structures dramatically - no two bullets should feel similar
7. Return ONLY valid JSON with no additional text
8. Plain text only - absolutely no bold, no HTML, no markdown
9. FIRST summary bullet MUST follow the mandatory format with role, 11+ years, tech stack, domains, and client context
10. Make every bullet unique in vocabulary, tone, and structure for maximum ATS optimization`;
}

// Extract text from PDF using pdf-parse (dynamic import for CommonJS compatibility)
async function extractTextFromPDF(buffer) {
  try {
    // Dynamic import for pdf-parse (CommonJS module)
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file. Please ensure it\'s a valid PDF or paste the text directly.');
  }
}

// Extract text from DOCX using mammoth
async function extractTextFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file. Please ensure it\'s a valid DOCX or paste the text directly.');
  }
}
