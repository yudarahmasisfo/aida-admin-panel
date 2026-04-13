// aida-admin-panel/src/routes/admin.route.js
const express = require('express');
const { proteksiToken,sudahLogin } = require('../middlewares/auth.middleware'); 
const router = express.Router();
const axios = require('axios');


const BACKEND_URL = process.env.BACKEND_URL;

// Middleware Cek Login (Internal Dashboard)
const checkAuth = (req, res, next) => {
    // Jika tidak ada token, arahkan ke login admin
    if (!req.cookies.token) return res.redirect('/login');
    next();
};

// Route Dashboard Utama
router.get('/', checkAuth, async (req, res) => {
    let logs = [];
    let aiStatus = { online: false, message: "API Service AIDA DOWN" };
    let stats = { totalChat: 0, chatHariIni: 0 }; 

    try {
        const token = req.cookies.token;
        const BACKEND_URL = process.env.BACKEND_URL;

        const [healthRes, statsRes, logsRes] = await Promise.allSettled([
            axios.get(`${BACKEND_URL}/chat/health`, { timeout: 2000 }),
            axios.get(`${BACKEND_URL}/admin/stats`, { 
                headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get(`${BACKEND_URL}/admin/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);

        if (healthRes.status === 'fulfilled' && healthRes.value.data.success) {
            aiStatus = { online: true, message: "Aktif / Normal" };
        }

        // Ambil data stats (Pastikan mapping ke stats.totalChat dan stats.chatHariIni)
        if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
            // Karena di backend kita kirim res.json({ totalChat, chatHariIni })
            const dataBackend = statsRes.value.data;
            stats.totalChat = dataBackend.totalChat || 0;
            stats.chatHariIni = dataBackend.chatHariIni || 0;
        }

        if (logsRes.status === 'fulfilled' && logsRes.value.data.success) {
            logs = logsRes.value.data.data; 
        }

        res.render('dashboard', { logs, aiStatus, stats });
    } catch (error) {
        console.error("Dashboard Error:", error.message);
        res.render('dashboard', { logs: [], aiStatus, stats: { totalChat: 0, chatHariIni: 0 } });
    }
});


// Route Login Page
router.get('/login', sudahLogin, (req, res) => res.render('login', { error: null }));

// Route Proses Login
// login post lama sebelum pakai tabel user
// router.post('/login', async (req, res) => {
//     try {
//         const response = await axios.post(`${BACKEND_URL}/chat/login`, req.body);
//         res.cookie('token', response.data.token, { httpOnly: true });
//         res.redirect('/');
//     } catch (error) {
//         res.render('login', { error: 'Username/Password Salah' });
//     }
// });

// login post baru setelah pakai tabel user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Kirim ke backend (Port 3000)
        // 1. Kirim permintaan login ke backend (Port 3000)
        const response = await axios.post(`${BACKEND_URL}/chat/login`, {
            username,
            password
        });

        if (response.data.success) {
            // 2. PROTEKSI ROLE: Cek apakah dia admin?
            // Jika role-nya adalah 'member' atau 'guest', dilarang masuk dashboard
            if (response.data.role !== 'admin') {
                return res.render('login', { 
                    error: "Akses Ditolak! Akun Anda bukan Administrator." 
                });
            }

            // 3. Jika Admin, simpan token ke cookie
            res.cookie('token', response.data.token, { 
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 1 hari token
                // maxAge: 7 * 24 * 60 * 60 * 1000 // Ubah ke 7 hari
            });
            return res.redirect('/');
        }
    } catch (error) {
        // Ambil pesan error spesifik dari backend (misal: "Password salah")
        const errorMessage = error.response?.data?.message || "Koneksi ke server pusat gagal";
        
        console.error("Login Dashboard Gagal:", errorMessage);
        res.render('login', { error: errorMessage });
    }
});

// aida-admin-panel/src/routes/admin.route.js
// --- CRUD LAYANAN ---
router.get('/layanan', checkAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${BACKEND_URL}/admin/layanan`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.render('layanan-list', { data: resp.data.data }); // Buat file layanan-list.ejs
    } catch (error) {
        res.render('layanan-list', { data: [] });
    }
});

// 1. Tampilkan Halaman Form Tambah
router.get('/tambah-layanan', checkAuth, (req, res) => {
    res.render('form-layanan', { item: null, error: null });
});

// 2. Proses Kirim Data ke Backend Pusat
router.post('/tambah-layanan', checkAuth, async (req, res) => {
    try {
        const token = req.cookies.token;
        
        // Kirim data ke Backend (Port 3000)
        await axios.post(`${BACKEND_URL}/admin/layanan`, req.body, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Jika berhasil, balik ke halaman utama
        res.redirect('/layanan?status=success');
    } catch (error) {
        console.error("Gagal tambah layanan:", error.message);
        res.render('form-layanan', { 
            item: null, 
            error: "Gagal menyimpan data ke server pusat." 
        });
    }
});


//edit layanan
// 1. Tampilkan Form Edit (dengan data lama terisi otomatis)
router.get('/edit-layanan/:id', checkAuth, async (req, res) => {
    try {
        const token = req.cookies.token;
        // Kita ambil data layanan spesifik berdasarkan ID dari backend pusat
        const resp = await axios.get(`${BACKEND_URL}/admin/layanan`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Cari data yang ID-nya cocok
        const layanan = resp.data.data.find(item => item.id == req.params.id);

        if (!layanan) return res.redirect('/layanan?status=error');

        res.render('form-layanan', { 
            item: layanan, // Kirim data layanan ke EJS
            error: null 
        });
    } catch (error) {
        res.redirect('/layanan?status=error');
    }
});

// 2. Proses Update Data ke Backend
router.post('/edit-layanan/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params; // dibuat untuk mencegal url yang tidak sesuai dengan id layanan yang diedit
        const token = req.cookies.token;
        
        await axios.put(`${BACKEND_URL}/admin/layanan/${id}`, req.body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        res.redirect('/layanan?status=update'); // Pakai status success agar SweetAlert muncul
    } catch (error) {
        res.render('form-layanan', { 
            item: req.body, 
            error: "Gagal mengupdate data ke server pusat." 
        });
    }
});


//hapus layanan
router.post('/hapus-layanan/:id', checkAuth, async (req, res) => {
    try {
        await axios.delete(`${BACKEND_URL}/admin/layanan/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.redirect('/layanan?status=deleted');
    } catch (error) {
        res.redirect('/layanan?status=error');
    }
});


// --- CRUD INFORMASI DESA ---

// Tampilkan Daftar Info
router.get('/info', checkAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${BACKEND_URL}/admin/info`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.render('info-list', { data: resp.data.data });
    } catch (error) {
        res.render('info-list', { data: [] });
    }
});

// Tampilkan Form Tambah
router.get('/tambah-info', checkAuth, (req, res) => {
    res.render('form-info', { item: null, error: null });
});

// Tampilkan Form Edit
router.get('/edit-info/:id', checkAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${BACKEND_URL}/admin/info`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        const info = resp.data.data.find(i => i.id == req.params.id);
        if (!info) return res.redirect('/info?status=error');
        
        res.render('form-info', { item: info, error: null });
    } catch (error) {
        res.redirect('/info?status=error');
    }
});

// Proses Simpan (Tambah & Update)
router.post('/simpan-info', checkAuth, async (req, res) => {
    try {
        const isUpdate = req.body.id ? true : false;
        await axios.post(`${BACKEND_URL}/admin/info`, req.body, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        
        // Redirect dengan status yang sesuai
        const status = isUpdate ? 'update' : 'success';
        res.redirect(`/info?status=${status}`);
    } catch (error) {
        res.render('form-info', { 
            item: req.body, 
            error: "Gagal menyambung ke server pusat." 
        });
    }
});

// Proses Hapus
router.post('/hapus-info/:id', checkAuth, async (req, res) => {
    try {
        await axios.delete(`${BACKEND_URL}/admin/info/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.redirect('/info?status=deleted');
    } catch (error) {
        res.redirect('/info?status=error');
    }
});



// --- CRUD DOKUMEN ---
router.get('/dokumen', checkAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${BACKEND_URL}/admin/dokumen`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.render('dokumen-list', { data: resp.data.data }); // Buat file dokumen-list.ejs
    } catch (error) {
        res.render('dokumen-list', { data: [] });
    }
});

router.post('/hapus-dokumen/:id', checkAuth, async (req, res) => {
    try {
        await axios.delete(`${BACKEND_URL}/admin/dokumen/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.redirect('/dokumen?status=deleted');
    } catch (error) {
        console.error("Gagal hapus dokumen:", error.message);
        
        // BERIKAN STATUS ERROR AGAR MUNCUL ALERT MERAH
        res.redirect('/dokumen?status=error');
    }
});



// 1. Route untuk menampilkan halaman (mengirimkan token dari cookie ke view)
router.get('/tambah-dokumen', checkAuth, (req, res) => {
    // Kita ambil token dari cookie untuk dikirim ke script EJS nanti
    const token = req.cookies.token; 
    res.render('tambah-dokumen', { token: token }); 
});

/** Halaman User  */
// Route Tampil Semua User
// TAMPILKAN DAFTAR USER
router.get('/users', checkAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${BACKEND_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.render('users-list', { users: resp.data.data });
    } catch (error) {
        res.render('users-list', { users: [], error: "Gagal mengambil data" });
    }
});

// 2. Form Tambah User
router.get('/tambah-user', checkAuth, (req, res) => {
    res.render('form-user', { item: null, error: null }); 
});

// PROSES TAMBAH & EDIT (Satu Route)
router.post('/users/save', checkAuth, async (req, res) => {
    try {
        const { id, username, password, nama, role } = req.body;
        const config = { headers: { Authorization: `Bearer ${req.cookies.token}` } };

        if (id) {
            // Update jika ada ID
            await axios.put(`${BACKEND_URL}/admin/users/${id}`, { nama, role, password }, config);
            res.redirect('/users?status=update');
        } else {
            // Create jika tidak ada ID
            await axios.post(`${BACKEND_URL}/admin/users`, { username, password, nama, role }, config);
            res.redirect('/users?status=success');
        }
    } catch (error) {
        // Jika username sudah ada atau backend menolak
        const errMsg = error.response?.data?.message || "Gagal menyimpan ke server.";
        res.render('form-user', { 
            item: req.body, // Kembalikan data yang sudah diketik agar tidak hilang
            error: errMsg 
        });
    }
});


// Tampilkan Form Edit User
router.get('/edit-user/:id', checkAuth, async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        
        // Cari user yang ID-nya pas
        const user = response.data.data.find(u => u.id == req.params.id);
        
        if (!user) return res.redirect('/users?status=error');

        res.render('form-user', { item: user, error: null });
    } catch (error) {
        res.redirect('/users?status=error');
    }
});

// PROSES HAPUS
router.post('/delete/:id', checkAuth, async (req, res) => {
    try {
        await axios.delete(`${BACKEND_URL}/admin/users/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.cookies.token}` }
        });
        res.redirect('/users?status=deleted');
    } catch (error) {
        res.redirect('/users?status=error');
    }
});


// Route Logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

/** cek sistem hidup atau mati */


module.exports = router;