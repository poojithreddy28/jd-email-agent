import nodemailer from "nodemailer";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

export async function POST(req) {
  const formData = await req.formData();

  const to = formData.get('to');
  const subject = formData.get('subject');
  const body = formData.get('body');
  const fromName = formData.get('fromName') || 'Poojith Reddy A';
  const fromEmail = formData.get('fromEmail');
  const resumeFile = formData.get('resume');
  const useDefaultResume = formData.get('useDefaultResume');

  let tempPath;
  let filename;

  if (resumeFile && resumeFile.size > 0) {
    // Use uploaded resume
    const bytes = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExtension = resumeFile.name.split('.').pop();
    tempPath = join(tmpdir(), `${fromName}_Resume_${Date.now()}.${fileExtension}`);
    await writeFile(tempPath, buffer);
    filename = `${fromName}_Resume.${fileExtension}`;
  } else if (useDefaultResume === 'true') {
    // Use default Word document resume from root directory
    const defaultResumePath = join(process.cwd(), 'Poojith Java Full Stack Developer.docx');
    
    if (existsSync(defaultResumePath)) {
      tempPath = defaultResumePath; // Use the file directly from root
      filename = 'Poojith_Reddy_Java_Developer_Resume.docx';
    } else {
      // Fallback: create a simple text version if .docx doesn't exist
      const defaultResumeContent = `
${fromName}
Java Full Stack Developer

Email: ${formData.get('fromEmail') || 'poojithreddy.se@gmail.com'}
Phone: +1 (312) 536-9779

SKILLS:
• Java, Spring Boot, Spring Framework
• React, Node.js, JavaScript, TypeScript
• AWS, Docker, Kubernetes
• MySQL, MongoDB, PostgreSQL
• REST APIs, Microservices
• Git, CI/CD, Agile

EXPERIENCE:
Full Stack Developer with 3+ years of experience in developing scalable web applications using Java and modern frontend frameworks.

EDUCATION:
Computer Science - Strong foundation in software development principles and best practices.

For detailed experience and projects, please contact directly.
      `;
      
      tempPath = join(tmpdir(), `${fromName}_Default_Resume_${Date.now()}.txt`);
      await writeFile(tempPath, defaultResumeContent.trim());
      filename = `${fromName}_Resume.txt`;
    }
  } else {
    return Response.json({ error: "Resume is required" }, { status: 400 });
  }

  // Gmail SMTP (free): use App Password
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Create HTML email with clickable links
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 20px;
    }
    .body-content {
      white-space: pre-wrap;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="body-content">${body.replace(/\n/g, '<br>')}</div>
</body>
</html>`;

  await transporter.sendMail({
    from: `${fromName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,  // Plain text fallback
    html: htmlBody,  // HTML version with clickable links
    attachments: [
      {
        filename: filename,
        path: tempPath,
      },
    ],
  });

  return Response.json({ message: "Email sent successfully" });
}