import { NextResponse } from 'next/server';

// In-memory storage (use database in production)
let monitoringStatus = {
  active: false,
  autoSend: false,
  contactName: '',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { autoSend = false, contactName = '' } = body;

    if (!contactName.trim()) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }

    // Start monitoring
    monitoringStatus = {
      active: true,
      autoSend,
      contactName: contactName.trim(),
    };

    // TODO: Set up WhatsApp message listener for specific contact
    // The actual implementation will be in connect route where we have the client
    
    console.log(`Started monitoring contact: ${contactName}`);

    return NextResponse.json({
      success: true,
      monitoring: true,
      autoSend,
      contactName: contactName.trim(),
      message: `Monitoring started for "${contactName}"`
    });

  } catch (error) {
    console.error('Monitor start error:', error);
    return NextResponse.json(
      { error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const previousContact = monitoringStatus.contactName;
    
    // Stop monitoring
    monitoringStatus = {
      active: false,
      autoSend: false,
      contactName: '',
    };

    console.log(`Stopped monitoring contact: ${previousContact}`);

    return NextResponse.json({
      success: true,
      monitoring: false,
      message: 'Monitoring stopped'
    });

  } catch (error) {
    console.error('Monitor stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop monitoring' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(monitoringStatus);
}

// Export for other routes to access
export { monitoringStatus };
