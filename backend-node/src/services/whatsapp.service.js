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
  // Hapus spasi atau karakter selain angka
  let cleaned = number.replace(/\D/g, '');
  
  // Ubah awalan 0 menjadi 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // Minimal harus nomor Indonesia yang valid (sekitar 10-13 digit tanpa 62)
  if (cleaned.length < 10) return null;

  // Format ke standar whatsapp-web.js
  if (!cleaned.endsWith('@c.us')) {
    cleaned += '@c.us';
  }
  return cleaned;
};

const sendMessage = async (number, message) => {
  if (!isReady || !client) {
    console.warn('[WhatsApp] Bot belum siap, pesan diabaikan.');
    return false;
  }
  
  const formattedNumber = formatPhoneNumber(number);
  if (!formattedNumber) {
    console.warn(`[WhatsApp] Nomor tujuan tidak valid: ${number}`);
    return false;
  }

  try {
    await client.sendMessage(formattedNumber, message);
    console.log(`[WhatsApp] Pesan berhasil dikirim ke ${number}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Gagal mengirim pesan ke ${number}:`, error.message);
    return false;
  }
};

module.exports = {
  initializeWhatsApp,
  sendMessage,
  formatPhoneNumber
};
