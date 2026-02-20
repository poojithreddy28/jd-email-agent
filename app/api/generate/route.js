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

Return ONLY valid JSON with keys: subject, body, recipientEmail
`;

  try {
    const r = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
      }),
    });

    if (!r.ok) {
      throw new Error(`Ollama server error: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();

  // Ollama returns { response: "..." }
  // response should be JSON; parse safely:
  let parsed;
  try {
    // First, try to extract JSON from the response (in case model adds extra text)
    const jsonStart = data.response.indexOf("{");
    const jsonEnd = data.response.lastIndexOf("}");
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonPart = data.response.slice(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(jsonPart);
    } else {
      // If no JSON brackets found, try parsing the whole response
      parsed = JSON.parse(data.response.trim());
    }
  } catch (e) {
    console.error('JSON parse failed:', e);
    console.error('Response was:', data.response);
    
    // Ultimate fallback - create a structured response
    parsed = {
      subject: "Job Application - " + (company || "Interested Position"),
      body: "I am writing to express my interest in the position described in your job posting. As a Java Full Stack Developer with extensive experience in backend and frontend technologies, I am confident that my skills align well with your requirements. I would welcome the opportunity to discuss how my expertise can contribute to your team's success.",
      recipientEmail: recipientEmail
    };
  }

  // Add signature to body and recipient email
  parsed.body += signature;
  parsed.recipientEmail = recipientEmail;

    return Response.json(parsed);
  } catch (error) {
    console.error('Error in email generation:', error);
    
    // Return a fallback response when Ollama is not available
    return Response.json({
      subject: `Job Application - ${company || 'Position of Interest'}`,
      body: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the position described in your job posting. As a Java Full Stack Developer with extensive experience in backend and frontend technologies, I am confident that my skills align well with your requirements.\n\nI would welcome the opportunity to discuss how my expertise can contribute to your team's success. Please find my resume attached for your review.\n\nI look forward to hearing from you.${signature}`,
      recipientEmail: recipientEmail
    });
  }
}
