import { NextResponse } from 'next/server';

export async function POST(req) {
  const formData = await req.formData();
  
  const jd = formData.get('jd');
  const name = formData.get('name') || 'Poojith Reddy A';
  const email = formData.get('email') || 'poojithreddy.se@gmail.com';
  const phone = formData.get('phone') || '+1 (312) 536-9779';
  const resume = formData.get('resume');
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local' },
      { status: 500 }
    );
  }

  // Extract email from JD using regex patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const extractedEmails = jd.match(emailPattern) || [];
  const recipientEmail = extractedEmails.find(e => !e.includes('example') && !e.includes('sample')) || '';

  // Extract company name from common patterns
  const companyPatterns = [
    /(?:at|join)\s+([A-Z][a-zA-Z\s&,.-]+?)(?:\s+(?:is|as|we|our|the|to|in|and|,))/gi,
    /([A-Z][a-zA-Z\s&,.-]+?)\s+(?:is\s+(?:seeking|looking|hiring))/gi
  ];
  
  let company = '';
  for (const pattern of companyPatterns) {
    const match = jd.match(pattern);
    if (match) {
      company = match[0].replace(/^(at|join)\s+/i, '').replace(/\s+(is|as|we|our|the|to|in|and|,).*$/i, '').trim();
      break;
    }
  }

  const signature = `\n\nBest Regards,\n${name}\nEmail: ${email}\nPhone: ${phone}`;

  const prompt = `
You are writing a job application email for ${name}, a skilled Java Full Stack Developer.

Candidate: ${name}
Email: ${email}
Phone: ${phone}
Company: ${company || 'the company'}
Resume: ${resume ? 'Custom resume attached' : 'Default resume (Java Full Stack Developer with strong backend and frontend skills)'}

Job description:
${jd}

Write a short, professional email (4-6 lines max). Requirements:
- Sound confident and professional
- Mention 2-3 relevant Java/Full Stack skills from the JD
- Keep it concise and direct
- NO dashes or bullet points
- End with a clear call to action
- In the body, do NOT use the phrase "at your company"
- In the body, do NOT use the phrase "at your organization"
- In the body, do NOT use "Dear Hiring Manager" or similar greetings
- In the body, do NOT use "at company" or "at the company"
- The body must start with "Hi {Name}," where {Name} is the contact name from the JD
- DO NOT include signature (will be added automatically)

Subject rules:
- Extract the job role/title from the JD and use it in the subject
- Extract the job location from the JD (city/state/country or Remote/Hybrid) and include it in the subject
- Use this format: "Application for {Role} - {Location}"
- If no location is found, use: "Application for {Role}"

Return ONLY valid JSON with keys: subject, body, recipientEmail

Example response:
{
  "subject": "Application for Senior Java Developer - New York, NY",
  "body": "Hi John,\\n\\nI am writing to express my strong interest in the Senior Java Developer position. With expertise in Spring Boot, microservices architecture, and cloud deployments, I have successfully delivered scalable applications serving millions of users. I would welcome the opportunity to discuss how my experience aligns with your team's goals.\\n\\nLooking forward to hearing from you.",
  "recipientEmail": "john@company.com"
}
`;

  try {
    // Try to list available models
    let availableModels = [];
    try {
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      );
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        availableModels = listData.models
          ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', '')) || [];
      }
    } catch (error) {
      console.log('Could not fetch model list:', error.message);
    }

    // Try models from the list first, then fall back to common names
    const modelConfigs = [
      ...availableModels.map(model => ({ api: 'v1beta', model })),
      { api: 'v1beta', model: 'gemini-1.5-flash' },
      { api: 'v1', model: 'gemini-1.5-flash' },
      { api: 'v1beta', model: 'gemini-1.5-pro' },
    ];

    let geminiResponse;
    let lastError;

    for (const config of modelConfigs) {
      try {
        geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/${config.api}/models/${config.model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              }
            }),
          }
        );

        if (geminiResponse.ok) {
          console.log(`✅ Email generation using: ${config.api}/models/${config.model}`);
          break;
        } else {
          const errorData = await geminiResponse.json();
          lastError = errorData;
          continue;
        }
      } catch (error) {
        lastError = { error: { message: error.message } };
        continue;
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      throw new Error('All Gemini models failed: ' + (lastError?.error?.message || 'Unknown error'));
    }

    const data = await geminiResponse.json();
    const generatedText = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    let parsed;
    try {
      // Clean the response
      let cleanResponse = generatedText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim();
      
      // Extract JSON from markdown code blocks if present
      // Handle both ```json\n{...} and ```json{...} formats
      if (cleanResponse.includes('```')) {
        // Remove markdown code fences
        cleanResponse = cleanResponse.replace(/```(?:json)?/g, '').trim();
      }
      
      // Find the JSON object (everything from first { to last })
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = cleanResponse.substring(firstBrace, lastBrace + 1);
        parsed = JSON.parse(jsonString);
      } else {
        parsed = JSON.parse(cleanResponse);
      }
    } catch (e) {
      console.error('Parse error:', e);
      console.error('Response:', generatedText);
      
      // Fallback parsing
      return NextResponse.json({
        subject: `Application for position at ${company}`,
        body: generatedText.replace(/```json|```/g, '').trim(),
        recipientEmail: recipientEmail
      });
    }

    // Add signature to body
    parsed.body = parsed.body + signature;

    return NextResponse.json({
      subject: parsed.subject || `Application for position at ${company}`,
      body: parsed.body || generatedText,
      recipientEmail: recipientEmail
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email: ' + error.message },
      { status: 500 }
    );
  }
}
