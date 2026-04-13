const jwt = require('jsonwebtoken');

const proteksiToken = (req, res, next) => {
    // Di dashboard, kita biasanya simpan token di cookie
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Menyimpan data user (id, username, role)
        next();
    } catch (error) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

// Middleware untuk mencegah user yang sudah login mengakses halaman login kembali
const sudahLogin = (req, res, next) => {
    // Cek apakah ada token di cookie atau header
    // (Tergantung Bapak simpan session admin di mana)
    const token = req.cookies.token || req.headers['authorization'];

    if (token) {
        // Jika ada token, langsung lempar ke Dashboard Admin
        return res.redirect('/'); 
    }
    next();
};

module.exports = { proteksiToken, sudahLogin };