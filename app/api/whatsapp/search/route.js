import { NextResponse } from 'next/server';

// Function to detect if a message is a job requirement
function isJobRequirement(message) {
  const jobKeywords = [
    // Job types
    'hiring', 'looking for', 'position', 'role', 'job', 
    'opportunity', 'opening', 'vacancy', 'recruiter',
    
    // Tech roles
    'developer', 'engineer', 'programmer', 'architect',
    'java', 'python', 'react', 'angular', 'node',
    'full stack', 'backend', 'frontend', 'devops',
    
    // Experience terms
    'experienced', 'experience', 'exp', 'years', 'yrs',
    'senior', 'junior', 'mid-level',
    
    // Job requirements
    'required', 'must have', 'must', 'skills', 'expertise',
    'proficient', 'knowledge',
    
    // Location/work type
    'location', 'remote', 'hybrid', 'onsite', 'office',
    'local', 'relocation',
    
    // Contract terms
    'contract', 'duration', 'months', 'fulltime', 'full-time',
    'part-time', 'c2c', 'w2', 'permanent',
    
    // Application terms
    'salary', 'apply', 'resume', 'cv', 'candidate',
    'send resume', 'email', 'interested'
  ];

  const messageLower = message.toLowerCase();
  const keywordMatches = jobKeywords.filter(keyword => 
    messageLower.includes(keyword)
  ).length;

  // If message contains 2 or more job-related keywords, consider it a job posting
  // Lowered from 3 to catch more relevant messages
  return keywordMatches >= 2;
}

// Function to extract recruiter email from message
function extractEmail(message) {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = message.match(emailRegex);
  return emails ? emails[0] : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { contactName, timeRangeHours, timeRangeMinutes } = body;

    if (!contactName) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }

    // Support both minutes and hours (prefer minutes if provided)
    const minutes = timeRangeMinutes || (timeRangeHours ? timeRangeHours * 60 : 60);
    console.log(`🔍 Searching messages from "${contactName}" for the last ${minutes} minutes`);

    // Get the WhatsApp client from the connect route
    const { getWhatsAppClient, isWhatsAppReady } = await import('../connect/route.js');
    
    if (!isWhatsAppReady()) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect first.' },
        { status: 400 }
      );
    }
    
    const client = getWhatsAppClient();

    if (!client) {
      return NextResponse.json(
        { error: 'WhatsApp client not available' },
        { status: 400 }
      );
    }

    // Calculate time threshold
    const timeThreshold = new Date();
    timeThreshold.setMinutes(timeThreshold.getMinutes() - minutes);

    // Get all chats
    const chats = await client.getChats();
    
    // Find the target chat
    const targetChat = chats.find(chat => 
      chat.name && (
        chat.name.toLowerCase().includes(contactName.toLowerCase()) ||
        contactName.toLowerCase().includes(chat.name.toLowerCase())
      )
    );

    if (!targetChat) {
      console.log(`❌ Contact "${contactName}" not found`);
      return NextResponse.json({
        success: true,
        messages: [],
        contactFound: false,
        searchedContact: contactName
      });
    }

    console.log(`✅ Found contact: ${targetChat.name}`);

    // Fetch messages from the chat
    const messages = await targetChat.fetchMessages({ limit: 500 });
    
    console.log(`📨 Fetched ${messages.length} messages from ${targetChat.name}`);

    // Filter messages by time and detect job requirements
    const jobMessages = [];
    
    for (const msg of messages) {
      const messageDate = new Date(msg.timestamp * 1000);
      
      // Check if message is within time range
      if (messageDate >= timeThreshold) {
        const messageText = msg.body || '';
        
        // Check if it's a job requirement
        if (isJobRequirement(messageText)) {
          const recruiterEmail = extractEmail(messageText);
          
          jobMessages.push({
            id: msg.id._serialized,
            message: messageText,
            detectedAt: messageDate.toISOString(),
            sender: targetChat.name,
            recruiterEmail,
            emailSent: false,
            generatedEmail: null,
          });
        }
      }
    }

    console.log(`💼 Found ${jobMessages.length} job-related messages`);

    return NextResponse.json({
      success: true,
      messages: jobMessages,
      contactFound: true,
      searchedContact: targetChat.name,
      timeRange: `${timeRangeHours} hour(s)`,
      totalMessagesScanned: messages.length
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search messages: ' + error.message },
      { status: 500 }
    );
  }
}
