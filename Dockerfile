# Gunakan node berbasis Debian (bookworm-slim) agar kompatibel dengan 
# library sistem dan seragam dengan backend sebelumnya
FROM node:20-bookworm-slim

# Set folder kerja di dalam container
WORKDIR /app

# Install PM2 secara global agar bisa menggunakan pm2-runtime
RUN npm install -g pm2

# Salin package.json dan package-lock.json (jika ada) untuk install dependencies
COPY package*.json ./

# Install dependencies sesuai package.json
# Menggunakan --omit=dev jika tidak ingin install nodemon di production
RUN npm install

# Salin semua source code dari folder lokal ke folder kerja di container
COPY . .

# Expose port 5000 sesuai kebutuhan admin panel
EXPOSE 5000

# Jalankan aplikasi menggunakan pm2-runtime
# Kita arahkan ke src/app.js sesuai scripts.start di package.json
CMD ["pm2-runtime", "start", "src/app.js", "--name", "aida-admin-panel"]