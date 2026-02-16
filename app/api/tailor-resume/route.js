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
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 8192, // Allow longer responses for 30 bullets
        }
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('❌ Ollama API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to connect to Ollama. Make sure Ollama is running with llama3.2 model.' },
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
3. NO repeated action verbs across bullets
4. NO generic words: "leveraged", "utilized", "facilitated", "responsible for"
5. DO NOT use placeholders like "...27 more bullets" - ACTUALLY GENERATE ALL 30 BULLETS
6. DO NOT write "continue until" - WRITE OUT EVERY SINGLE BULLET
7. Use ONLY strong action verbs from this ATS-approved list:

REQUIRED ACTION VERBS (30 different verbs - never repeat):
Architected, Engineered, Designed, Developed, Implemented, Built, Created, Deployed, Established, Launched, Spearheaded, Pioneered, Transformed, Modernized, Streamlined, Optimized, Automated, Accelerated, Scaled, Reduced, Increased, Improved, Enhanced, Delivered, Achieved, Executed, Directed, Led, Managed, Coordinated

OUTPUT FORMAT (JSON):
{
  "summary": [
    "Point 1 here",
    "Point 2 here",
    "Point 3 here",
    "...continue until Point 30"
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

SUMMARY (EXACTLY 30 bullets):
- Each 2.5-3 lines, keyword-dense, JD-aligned
- Start with context, NOT action verb (e.g., "Senior Java Developer with...")
- Include years of experience, certifications, domain expertise
- Mix: skills, achievements, technologies, methodologies
- NO bold - plain text only

EXPERIENCE (EXACTLY 30 bullets for most recent company):
Products Line: List 2-3 actual product/platform names

Bullet 1-2: BUSINESS/LEADERSHIP IMPACT
- Verbs: Spearheaded, Directed
- Content: Revenue impact, cost savings, team leadership
- Metrics: Dollar amounts, percentages, team sizes

Bullets 3-30: TECHNICAL ACHIEVEMENTS (28 bullets)
- Each starts with DIFFERENT verb from approved list
- Never repeat verbs
- Format: [UniqueVerb] [technical solution] using Tech1, Tech2, Tech3 achieving metric1, improving metric2

METRIC REQUIREMENTS:
- Throughput: requests/day, transactions/sec
- Performance: latency reduction (before → after in ms/sec)
- Scale: concurrent users, data volume, service count
- Reliability: uptime percentage, error rate reduction

EXAMPLES (2.5-3 lines, plain text, no bold):
"Architected event-driven microservices platform using Java 17, Spring Boot 3.2, Apache Kafka, Redis serving 8M daily users across 15 services, reducing average latency by 68% from 520ms to 166ms, and achieving 99.97% uptime"

"Engineered distributed caching strategy with Redis Sentinel, Hazelcast, Spring Cache reducing database load by 81%, improving API response times from 1.8s to 145ms, supporting 75K concurrent users during peak periods"

CRITICAL: Generate ALL 30 summary bullets and ALL 30 experience bullets. DO NOT use "...28 more" or "...continue" - write every single bullet completely. Return ONLY valid JSON. Plain text only - no bold, no HTML, no markdown.`;
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
3. NO repeated action verbs - use 30 DIFFERENT verbs
4. NO generic words: "leveraged", "utilized", "facilitated", "responsible for"
5. DO NOT use placeholders like "...28 more points" - ACTUALLY GENERATE ALL 30 BULLETS
6. DO NOT write "continue until" - WRITE OUT EVERY SINGLE BULLET

REQUIRED ACTION VERBS (30 different verbs - never repeat):
Architected, Engineered, Designed, Developed, Implemented, Built, Created, Deployed, Established, Launched, Spearheaded, Pioneered, Transformed, Modernized, Streamlined, Optimized, Automated, Accelerated, Scaled, Reduced, Increased, Improved, Enhanced, Delivered, Achieved, Executed, Directed, Led, Migrated, Integrated

OUTPUT FORMAT (JSON):
{
  "summary": [
    "Point 1 here",
    "Point 2 here",
    "Point 3 here",
    "...continue until Point 30"
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

SUMMARY (EXACTLY 30 bullets):
- Each 2.5-3 lines, keyword-dense, JD-aligned
- Start with context, NOT action verb
- Include years of experience, certifications, domain expertise
- Mix: skills, achievements, technologies, methodologies, domains
- NO bold - plain text only

EXPERIENCE (EXACTLY 30 bullets for most recent client):
Products Line: List 2-3 actual product/platform/system names

Bullet 1-2: BUSINESS/LEADERSHIP IMPACT
- Verbs: Spearheaded, Directed
- Content: Revenue impact, cost savings, team leadership, stakeholder value
- Metrics: Dollar amounts, percentages, team sizes, timelines

Bullets 3-30: TECHNICAL ACHIEVEMENTS (28 bullets)
- Each starts with DIFFERENT verb from approved list
- Never repeat verbs - track used verbs
- Format: [UniqueVerb] [technical solution] using Tech1, Tech2, Tech3, Tech4 achieving metric1, improving metric2, supporting scale metric

METRIC REQUIREMENTS (include in every technical bullet):
- Throughput: requests/day, transactions/sec, events/hour
- Performance: latency reduction (before → after in ms/sec)
- Scale: concurrent users, data volume, service count
- Reliability: uptime percentage, error rate reduction
- Efficiency: cost savings, time reduction, resource optimization

EXAMPLES (2.5-3 lines, plain text, no bold):
"Architected event-driven microservices platform using Java 17, Spring Boot 3.2, Apache Kafka, Redis Cluster, PostgreSQL, Docker serving 8M daily users across 15 services, reducing average latency by 68% from 520ms to 166ms, achieving 99.97% uptime with zero downtime deployments"

"Engineered distributed caching strategy with Redis Sentinel, Hazelcast, Spring Cache reducing database load by 81%, improving API response times from 1.8s to 145ms, supporting 75K concurrent users during peak periods, cutting infrastructure costs by $180K annually"

"Implemented CI/CD pipeline using Jenkins, Docker, Kubernetes, Helm, ArgoCD, Terraform automating 40+ deployments/week, reducing deployment time by 85% from 4 hours to 35 minutes, eliminating 95% of manual errors"

CRITICAL: Generate ALL 30 summary bullets and ALL 30 experience bullets. DO NOT use "...27 more" or "...continue" - write every single bullet completely. Return ONLY valid JSON. Plain text only - no bold, no HTML, no markdown. Use 30 DIFFERENT action verbs.`;
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
