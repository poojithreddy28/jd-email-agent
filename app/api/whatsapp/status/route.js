import { NextResponse } from 'next/server';

// Get status from connect route
export async function GET() {
  try {
    // Import the client status from connect route
    const connectResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/whatsapp/connect`, {
      method: 'GET',
    });
    
    if (connectResponse.ok) {
      const data = await connectResponse.json();
      return NextResponse.json({
        connected: data.connected || false,
        monitoring: false, // Will be updated from monitor route
      });
    }
    
    return NextResponse.json({
      connected: false,
      monitoring: false,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      monitoring: false,
    });
  }
}
