import { NextResponse } from 'next/server';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';

// This will store the WhatsApp client instance
let whatsappClient = null;
let qrCodeData = null;
let isReady = false;
let isInitializing = false;

// Initialize client if not already done
function initializeClient() {
  if (!whatsappClient) {
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // Listen for QR code
    whatsappClient.on('qr', async (qr) => {
      console.log('QR Code received');
      try {
        // Generate QR code as data URL
        qrCodeData = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    });

    // Listen for ready event
    whatsappClient.on('ready', () => {
      console.log('WhatsApp client is ready!');
      isReady = true;
      qrCodeData = null;
      isInitializing = false;
      
      // Set up message listener
      setupMessageListener();
    });

    // Listen for authentication
    whatsappClient.on('authenticated', () => {
      console.log('WhatsApp authenticated');
    });

    // Listen for authentication failure
    whatsappClient.on('auth_failure', () => {
      console.log('Authentication failed');
      isReady = false;
      isInitializing = false;
      qrCodeData = null;
    });

    // Listen for disconnection
    whatsappClient.on('disconnected', (reason) => {
      console.log('WhatsApp disconnected:', reason);
      isReady = false;
      isInitializing = false;
      qrCodeData = null;
      whatsappClient.destroy();
      whatsappClient = null;
    });
  }
}

// Set up message listener for specific contact
async function setupMessageListener() {
  if (!whatsappClient) return;

  console.log('✅ WhatsApp client ready for searches');
}

export async function POST() {
  try {
    // If already connected and ready, return success
    if (whatsappClient && isReady) {
      return NextResponse.json({
        connected: true,
        needsQR: false,
        message: 'Already connected to WhatsApp'
      });
    }

    // If currently initializing, wait
    if (isInitializing) {
      return NextResponse.json({
        connected: false,
        needsQR: false,
        message: 'Already initializing, please wait...'
      });
    }

    // If client exists but not ready yet (waiting for QR or authentication)
    if (whatsappClient && !isReady) {
      if (qrCodeData) {
        return NextResponse.json({
          connected: false,
          needsQR: true,
          qrCode: qrCodeData,
          message: 'Scan QR code with WhatsApp'
        });
      }
      
      return NextResponse.json({
        connected: false,
        needsQR: false,
        message: 'Waiting for authentication...'
      });
    }

    // Initialize new client only if one doesn't exist
    if (!whatsappClient) {
      initializeClient();
      
      // Start initialization
      isInitializing = true;
      console.log('Initializing WhatsApp client...');
      
      whatsappClient.initialize().catch(err => {
        console.error('Initialization error:', err);
        isInitializing = false;
        // Reset client on error
        whatsappClient = null;
      });

      // Wait for QR code or ready state
      let attempts = 0;
      while (!qrCodeData && !isReady && attempts < 30 && isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      isInitializing = false;

      if (isReady) {
        return NextResponse.json({
          connected: true,
          needsQR: false,
          message: 'Connected successfully'
        });
      }

      if (qrCodeData) {
        return NextResponse.json({
          connected: false,
          needsQR: true,
          qrCode: qrCodeData,
          message: 'Scan QR code with WhatsApp'
        });
      }

      return NextResponse.json({
        connected: false,
        needsQR: false,
        message: 'Generating QR code, please try again in a moment'
      });
    }

  } catch (error) {
    console.error('WhatsApp connection error:', error);
    isInitializing = false;
    
    // If error is about session already in use, reset the client
    if (error.message && error.message.includes('userDataDir')) {
      console.log('Browser session conflict detected, resetting client...');
      whatsappClient = null;
      isReady = false;
      qrCodeData = null;
      
      return NextResponse.json(
        { error: 'Browser session conflict. Please try connecting again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to connect to WhatsApp: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    connected: isReady,
    hasQR: !!qrCodeData
  });
}

// DELETE endpoint to disconnect WhatsApp
export async function DELETE() {
  try {
    if (whatsappClient) {
      console.log('Disconnecting WhatsApp client...');
      
      try {
        await whatsappClient.destroy();
      } catch (destroyError) {
        console.error('Error during destroy:', destroyError);
      }
      
      whatsappClient = null;
      isReady = false;
      qrCodeData = null;
      isInitializing = false;
      
      return NextResponse.json({
        message: 'WhatsApp client disconnected successfully'
      });
    }
    
    return NextResponse.json({
      message: 'No active WhatsApp connection'
    });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    
    // Force reset even on error
    whatsappClient = null;
    isReady = false;
    qrCodeData = null;
    isInitializing = false;
    
    return NextResponse.json(
      { error: 'Error disconnecting, client has been reset' },
      { status: 500 }
    );
  }
}

// Export function to get the WhatsApp client (for use by other routes)
export function getWhatsAppClient() {
  return whatsappClient;
}

export function isWhatsAppReady() {
  return isReady;
}
