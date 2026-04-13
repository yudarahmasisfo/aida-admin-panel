// aida-admin-panel/src/app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const adminRoutes = require('./routes/admin.route'); // Impor route baru

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Middleware untuk mendeteksi URL aktif
app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});



// Gunakan Route yang sudah dipisah
app.use('/', adminRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Dashboard Admin berjalan di http://localhost:${PORT}`);
    console.log(`🔗 Terhubung ke Backend: ${process.env.BACKEND_URL}`);
});