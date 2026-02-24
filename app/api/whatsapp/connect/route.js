import { NextResponse } from 'next/server';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';

// This will store the WhatsApp client instance
let whatsappClient = null;
let qrCodeData = null;
let isReady = false;
let isInitializing = false;

// Clean up any orphaned browser processes and sessions on server restart
// This handles cases where the server restarts but browser processes remain
const startupCleanup = async () => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Kill any orphaned Chrome/Chromium processes from whatsapp-web.js
    // These can remain after server crashes or restarts
    try {
      // Kill Chrome processes that contain our session path
      await execAsync('pkill -f ".wwebjs_auth" 2>/dev/null || true');
      console.log('Cleaned up orphaned WhatsApp browser processes');
    } catch (killError) {
      // Ignore errors - processes might not exist
    }
    
    // Small delay to let processes fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error('Startup cleanup error:', err);
  }
};

// Run cleanup on module load (server start/restart)
startupCleanup();

// Force kill any orphaned browser processes
async function killOrphanedBrowsers() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    await execAsync('pkill -9 -f ".wwebjs_auth" 2>/dev/null || true');
    console.log('Killed orphaned browser processes');
    
    // Wait for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (err) {
    console.error('Error killing browsers:', err);
  }
}

// Clean up any existing client before creating a new one
async function cleanupExistingClient() {
  if (whatsappClient) {
    try {
      console.log('Cleaning up existing WhatsApp client...');
      await whatsappClient.destroy();
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
    whatsappClient = null;
  }
  
  // Also kill any browser processes
  try {
    const { exec } = require('child_process');
    await new Promise((resolve) => {
      exec('pkill -9 -f ".wwebjs_auth" 2>/dev/null', () => resolve());
    });
  } catch (err) {
    console.error('Error killing browsers during cleanup:', err);
  }
  
  isReady = false;
  qrCodeData = null;
  isInitializing = false;
}

// Initialize client if not already done
async function initializeClient() {
  // Always clean up first to prevent browser conflicts
  await cleanupExistingClient();
  
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
      // Kill any orphaned browsers first to prevent conflicts
      await killOrphanedBrowsers();
      
      await initializeClient();
      
      // Start initialization
      isInitializing = true;
      console.log('Initializing WhatsApp client...');
      
      whatsappClient.initialize().catch(err => {
        console.error('Initialization error:', err);
        isInitializing = false;
        
        // If browser conflict, force cleanup and ask user to retry
        if (err.message && err.message.includes('userDataDir')) {
          console.log('Browser conflict detected, forcing cleanup...');
          
          // Force kill browser processes
          const { exec } = require('child_process');
          exec('pkill -f ".wwebjs_auth" 2>/dev/null', (killErr) => {
            if (killErr) console.error('Error killing browser:', killErr);
          });
          
          cleanupExistingClient();
        } else {
          // Reset client on other errors
          whatsappClient = null;
        }
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
    
    // If error is about session already in use, force cleanup and reset
    if (error.message && error.message.includes('userDataDir')) {
      console.log('Browser session conflict detected, forcing cleanup...');
      
      // Force kill browser processes
      const { exec } = require('child_process');
      exec('pkill -f ".wwebjs_auth" 2>/dev/null', async (killErr) => {
        if (killErr) console.error('Error killing browser:', killErr);
        
        // Wait a bit for processes to die
        await new Promise(resolve => setTimeout(resolve, 2000));
      });
      
      // Force cleanup
      await cleanupExistingClient();
      
      return NextResponse.json(
        { 
          error: 'Browser session conflict detected and cleaned up. The orphaned browser process has been killed. Please wait 3 seconds and try connecting again.',
          canRetry: true
        },
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
      await cleanupExistingClient();
      
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
