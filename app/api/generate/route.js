export async function POST(req) {
  // Check content type to determine how to parse the request
  const contentType = req.headers.get('content-type') || '';
  let jd, name, email, phone, resume;
  
  if (contentType.includes('application/json')) {
    // Handle JSON request (from WhatsApp send-email API)
    const body = await req.json();
    jd = body.jd;
    name = body.name || 'Poojith Reddy A';
    email = body.email || 'poojithreddy.se@gmail.com';
    phone = body.phone || '+1 (312) 536-9779';
    resume = body.resume;
  } else {
    // Handle FormData request (from UI)
    try {
      const formData = await req.formData();
      jd = formData.get('jd');
      name = formData.get('name') || 'Poojith Reddy A';
      email = formData.get('email') || 'poojithreddy.se@gmail.com';
      phone = formData.get('phone') || '+1 (312) 536-9779';
      resume = formData.get('resume');
    } catch (formError) {
      console.error('Error parsing FormData:', formError);
      return Response.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
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

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON with keys: subject, body, recipientEmail
- Each JSON value MUST be on a SINGLE line (no line breaks within strings)
- Use \\n for line breaks within the body text
- Example: "body": "Hi John,\\nI am excited to apply..."
- Do NOT break strings across multiple lines
- Ensure the JSON is properly formatted with all commas and quotes in place
`;

  try {
    // Use Anthropic Claude API
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Claude API error: ${r.status} - ${errText}`);
    }

    const claudeData = await r.json();
    const data = {
      response: claudeData.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
    };

  // Claude response extracted into data.response
  // response should be JSON; parse safely:
  let parsed;
  
  // Extract JSON from response
  const jsonStart = data.response.indexOf("{");
  const jsonEnd = data.response.lastIndexOf("}");
  let jsonString = '';
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonString = data.response.slice(jsonStart, jsonEnd + 1);
  } else {
    jsonString = data.response.trim();
  }
  
  // Try parsing with multiple strategies
  try {
    // Strategy 1: Try as-is first
    parsed = JSON.parse(jsonString);
  } catch {
    try {
      // Strategy 2: Fix literal newlines inside JSON string values
      // The LLM often puts actual newlines inside strings which breaks JSON parsing
      let fixedJson = jsonString;
      
      // Replace literal newlines within string values with escaped \n
      // This regex finds content between quotes and replaces newlines with \n
      fixedJson = fixedJson.replace(/"([^"]*?)"/gs, (match, content) => {
        // Only fix the content, not the quotes
        const fixed = content
          .replace(/\n/g, '\\n')    // Replace literal newlines with \n
          .replace(/\r/g, '')        // Remove carriage returns
          .replace(/\t/g, '\\t');    // Escape tabs
        return `"${fixed}"`;
      });
      
      parsed = JSON.parse(fixedJson);
    } catch (e2) {
      console.error('JSON parse failed after sanitization:', e2);
      console.error('Attempted to parse:', jsonString.substring(0, 500));
      
      // Strategy 3: Manual extraction - try to extract values with regex
      try {
        const subjectMatch = jsonString.match(/"subject"\s*:\s*"([^"]+)"/);
        const emailMatch = jsonString.match(/"recipientEmail"\s*:\s*"([^"]+)"/);
        
        // For body, extract everything between "body": " and the closing "
        let bodyMatch = null;
        const bodyStart = jsonString.indexOf('"body"');
        if (bodyStart !== -1) {
          const afterBody = jsonString.substring(bodyStart);
          const firstQuote = afterBody.indexOf('"', afterBody.indexOf(':') + 1);
          if (firstQuote !== -1) {
            // Find the matching closing quote (looking for ",\n or "\n})
            let quotePos = firstQuote + 1;
            let body = '';
            while (quotePos < afterBody.length) {
              if (afterBody[quotePos] === '"' && 
                  (afterBody[quotePos + 1] === ',' || 
                   afterBody[quotePos + 1] === '\n' || 
                   afterBody.substring(quotePos + 1, quotePos + 3) === '\n}')) {
                body = afterBody.substring(firstQuote + 1, quotePos);
                break;
              }
              quotePos++;
            }
            if (body) bodyMatch = [null, body];
          }
        }
        
        if (subjectMatch && bodyMatch && emailMatch) {
          parsed = {
            subject: subjectMatch[1],
            body: bodyMatch[1].trim(),
            recipientEmail: emailMatch[1]
          };
          console.log('✅ Extracted email via manual parsing');
        } else {
          throw new Error('Could not extract all fields');
        }
      } catch (e3) {
        console.error('Manual extraction also failed:', e3);
        
        // Last resort: Use whatever we can extract from the response
        parsed = {
          subject: "Job Application - " + (company || "Interested Position"),
          body: data.response.includes('"body"') 
            ? data.response.substring(
                data.response.indexOf('"body"'), 
                Math.min(data.response.length, data.response.indexOf('"body"') + 500)
              ).replace(/^"body"\s*:\s*"/, '').replace(/"[,\s]*$/, '').trim()
            : "I am writing to express my interest in the position described in your job posting. As a Java Full Stack Developer with extensive experience in backend and frontend technologies, I am confident that my skills align well with your requirements. I would welcome the opportunity to discuss how my expertise can contribute to your team's success.",
          recipientEmail: recipientEmail
        };
        console.log('⚠️ Using partial/fallback response');
      }
    }
  }

  // Add signature to body and recipient email
  parsed.body += signature;
  parsed.recipientEmail = recipientEmail;

    return Response.json(parsed);
  } catch (error) {
    console.error('Error in email generation:', error);
    
    // Return a fallback response when Claude API is not available
    return Response.json({
      subject: `Job Application - ${company || 'Position of Interest'}`,
      body: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the position described in your job posting. As a Java Full Stack Developer with extensive experience in backend and frontend technologies, I am confident that my skills align well with your requirements.\n\nI would welcome the opportunity to discuss how my expertise can contribute to your team's success. Please find my resume attached for your review.\n\nI look forward to hearing from you.${signature}`,
      recipientEmail: recipientEmail
    });
  }
}
