export async function POST(req) {
  const formData = await req.formData();
  
  const jd = formData.get('jd');
  const name = formData.get('name') || 'Poojith Reddy A';
  const email = formData.get('email') || 'poojithreddy.se@gmail.com';
  const phone = formData.get('phone') || '+1 (312) 536-9779';
  const resume = formData.get('resume');

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
- DO NOT include signature (will be added automatically)

Return ONLY valid JSON with keys: subject, body, recipientEmail
`;

  try {
    const r = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
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
    // Clean the response by removing control characters and fixing common issues
    let cleanResponse = data.response
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .trim();
    
    parsed = JSON.parse(cleanResponse);
  } catch (e) {
    console.error('First parse attempt failed:', e);
    try {
      // fallback if the model adds text - extract JSON part
      const jsonStart = data.response.indexOf("{");
      const jsonEnd = data.response.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonPart = data.response.slice(jsonStart, jsonEnd + 1);
        // Clean the extracted JSON part
        jsonPart = jsonPart
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape newlines
          .replace(/\r/g, '\\r') // Escape carriage returns  
          .replace(/\t/g, '\\t'); // Escape tabs
        
        parsed = JSON.parse(jsonPart);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (e2) {
      console.error('Second parse attempt failed:', e2);
      // Ultimate fallback - create a structured response
      const responseText = data.response || 'Error generating email';
      parsed = {
        subject: "Job Application - " + (company || "Interested Position"),
        body: responseText.includes('{') ? 
          "I am writing to express my interest in the position. Based on the job description provided, I believe my skills and experience align well with your requirements. I would welcome the opportunity to discuss how I can contribute to your team." :
          responseText,
        recipientEmail: recipientEmail
      };
    }
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