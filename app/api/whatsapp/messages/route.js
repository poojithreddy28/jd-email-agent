import { NextResponse } from 'next/server';

// In-memory message storage (use database in production)
let detectedMessages = [];

export async function GET() {
  try {
    return NextResponse.json({
      messages: detectedMessages
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Function to detect if a message is a job requirement
function isJobRequirement(message) {
  const jobKeywords = [
    'hiring', 'looking for', 'position', 'role', 'job', 
    'opportunity', 'opening', 'vacancy', 'recruiter',
    'experienced', 'developer', 'engineer', 'required',
    'skills', 'years of experience', 'location', 'salary',
    'apply', 'resume', 'cv', 'candidate'
  ];

  const messageLower = message.toLowerCase();
  const keywordMatches = jobKeywords.filter(keyword => 
    messageLower.includes(keyword)
  ).length;

  // If message contains 3 or more job-related keywords, consider it a job posting
  return keywordMatches >= 3;
}

// Function to extract recruiter email from message
function extractEmail(message) {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = message.match(emailRegex);
  return emails ? emails[0] : null;
}

// This would be called by WhatsApp webhook in production
export async function POST(request) {
  try {
    const body = await request.json();
    const { message, sender, timestamp } = body;

    console.log('📩 Received message for processing:', { sender, message: message.substring(0, 50) + '...' });

    // Check if message is a job requirement
    if (isJobRequirement(message)) {
      console.log('✅ Job requirement detected!');
      const recruiterEmail = extractEmail(message);
      
      const newMessage = {
        id: Date.now().toString(),
        message,
        sender,
        detectedAt: timestamp || new Date().toISOString(),
        recruiterEmail,
        emailSent: false,
        generatedEmail: null,
      };

      detectedMessages.unshift(newMessage);

      console.log(`📝 Stored message. Total messages: ${detectedMessages.length}`);

      return NextResponse.json({
        success: true,
        detected: true,
        message: newMessage
      });
    }

    console.log('❌ Not a job requirement - insufficient keywords');
    return NextResponse.json({
      success: true,
      detected: false,
      message: 'Not a job requirement'
    });

  } catch (error) {
    console.error('Message processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
