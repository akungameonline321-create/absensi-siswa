FROM node:18-slim

# Instal Chromium untuk keperluan whatsapp-web.js
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0 libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment agar Puppeteer menggunakan Chromium yang terinstal
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Sesuaikan dengan port backend-mu (misal 5000 atau 8080)
EXPOSE 5000

CMD ["node", "server.js"]