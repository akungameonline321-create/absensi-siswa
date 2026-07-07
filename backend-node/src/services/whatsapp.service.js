const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let isReady = false;

const initializeWhatsApp = () => {
  console.log('[WhatsApp] Menginisialisasi client...');
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-sekolah' }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  client.on('qr', (qr) => {
    console.log('\n=============================================================');
    console.log('[WhatsApp] SCAN QR CODE DI BAWAH INI MENGGUNAKAN WHATSAPP ANDA:');
    console.log('=============================================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n=============================================================');
    console.log('ATAU BUKA LINK INI JIKA QR DI ATAS TERPOTONG/RUSAK:');
    console.log('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr));
    console.log('=============================================================\n');
  });

  client.on('ready', () => {
    console.log('✅ [WhatsApp] Bot berhasil terhubung dan siap digunakan!');
    isReady = true;
  });

  client.on('auth_failure', msg => {
    console.error('❌ [WhatsApp] Autentikasi gagal:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️ [WhatsApp] Client terputus:', reason);
    isReady = false;
  });

  client.initialize();
};

const formatPhoneNumber = (number) => {
  if (!number) return null;
  // Hapus spasi atau karakter selain angka (pastikan input adalah string)
  let cleaned = String(number).replace(/\D/g, '');
  
  // Ubah awalan 0 menjadi 62, atau tambahkan 62 jika awalan 8
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  // Minimal harus nomor Indonesia yang valid (sekitar 10-13 digit tanpa 62)
  if (cleaned.length < 10) return null;

  // Format ke standar whatsapp-web.js
  if (!cleaned.endsWith('@c.us')) {
    cleaned += '@c.us';
  }
  return cleaned;
};

const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../../wa_debug.log');

const logToDebug = (msg) => {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    console.log(msg);
  } catch(e) {}
};

const sendMessage = async (number, message) => {
  logToDebug(`[WhatsApp] Mencoba mengirim pesan ke: ${number}`);
  
  if (!isReady || !client) {
    logToDebug('[WhatsApp] Bot belum siap, pesan diabaikan.');
    return false;
  }
  
  const formattedNumber = formatPhoneNumber(number);
  
  if (!formattedNumber) {
    logToDebug(`[WhatsApp] Nomor tujuan tidak valid: ${number}`);
    return false;
  }

  try {
    logToDebug(`[WhatsApp] Nomor setelah diformat: ${formattedNumber}`);
    
    // Cek apakah nomor tersebut terdaftar di WhatsApp
    logToDebug('[WhatsApp] Memeriksa apakah nomor terdaftar...');
    const isRegistered = await client.isRegisteredUser(formattedNumber);
    if (!isRegistered) {
      logToDebug(`❌ [WhatsApp] Nomor tidak terdaftar di WhatsApp: ${formattedNumber}`);
      return false;
    }

    logToDebug('[WhatsApp] Memanggil client.sendMessage...');
    
    // Gunakan Promise.race untuk menambahkan timeout (15 detik)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout saat mengirim pesan (15 detik)')), 15000)
    );
    
    const sendPromise = client.sendMessage(formattedNumber, message);
    const response = await Promise.race([sendPromise, timeoutPromise]);
    
    logToDebug(`[WhatsApp] Berhasil terkirim! (ID: ${response.id._serialized})`);
    return true;
  } catch (error) {
    logToDebug(`[WhatsApp] Gagal mengirim pesan ke ${formattedNumber}: ${error.message}`);
    return false;
  }
};

module.exports = {
  initializeWhatsApp,
  sendMessage,
  formatPhoneNumber
};
