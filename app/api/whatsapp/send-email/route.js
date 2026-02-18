import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, recruiterEmail } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    console.log('📧 Generating email for job posting...');

    // Call the email generation API - use the host from request
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    console.log(`Calling generate API at: ${baseUrl}/api/generate`);
    
    const generateResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jd: message,
        name: process.env.DEFAULT_NAME || 'Poojith Reddy A',
        email: process.env.DEFAULT_EMAIL || 'poojithreddy.se@gmail.com',
        phone: process.env.DEFAULT_PHONE || '+1 (312) 536-9779',
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Generate API error:', errorText);
      throw new Error('Failed to generate email');
    }

    const emailData = await generateResponse.json();
    console.log('✅ Email generated successfully');

    // If no recruiter email, return the generated email for manual use
    if (!recruiterEmail) {
      console.log('⚠️ No recruiter email found, returning generated email for manual sending');
      return NextResponse.json({
        success: true,
        message: 'Email generated but no recruiter email found. Please send manually.',
        generatedEmail: emailData,
        needsManualSend: true
      });
    }

    // Send the email
    console.log(`📤 Sending email to: ${recruiterEmail}`);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Attach default resume
    const resumePath = path.join(process.cwd(), 'defaultpoojithresume.txt');
    let attachments = [];
    
    if (fs.existsSync(resumePath)) {
      attachments.push({
        filename: 'Poojith_Reddy_Resume.pdf',
        path: resumePath,
      });
    }

    await transporter.sendMail({
      from: `${process.env.DEFAULT_NAME || 'Poojith Reddy A'} <${process.env.EMAIL_USER}>`,
      to: recruiterEmail,
      subject: emailData.subject,
      text: emailData.body,
      attachments,
    });

    console.log('✅ Email sent successfully!');

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      generatedEmail: emailData
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email: ' + error.message },
      { status: 500 }
    );
  }
}
