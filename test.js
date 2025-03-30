const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_jwt_secret';

// Database config
const config = {
    user: 'sa',
    password: '123',
    server: 'PC',
    database: 'WebMVC',
    options: { encrypt: false }
};

// Khởi tạo pool kết nối
let pool;
sql.connect(config)
    .then(p => {
        pool = p;
        console.log('Connected to SQL Server');
    })
    .catch(err => console.error('Database connection failed:', err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trang chủ
app.get('/', (req, res) => {
    res.send(`
        <h1>Xác Thực Người Dùng</h1>
        <a href="/register">Đăng Ký</a>
        <a href="/login">Đăng Nhập</a>
    `);
});

// Trang đăng ký
app.get('/register', (req, res) => {
    res.send(`
        <h1>Đăng Ký</h1>
        <form action="/api/User" method="post">
            <label>Tên Người Dùng:</label>
            <input type="text" name="Username" required>
            <label>Mật Khẩu:</label>
            <input type="password" name="UserPW" required>
            <button type="submit">Đăng Ký</button>
        </form>
    `);
});

// Trang đăng nhập
app.get('/login', (req, res) => {
    res.send(`
        <h1>Đăng Nhập</h1>
        <form action="/api/User/login" method="post">
            <label>Tên Người Dùng:</label>
            <input type="text" name="Username" required>
            <label>Mật Khẩu:</label>
            <input type="password" name="UserPW" required>
            <button type="submit">Đăng Nhập</button>
        </form>
    `);
});

// API User (Đăng ký)
app.post('/api/User', async (req, res) => {
    try {
        const { Username, UserPW } = req.body;
        const hashedPassword = await bcrypt.hash(UserPW, 10);

        const result = await pool.request()
            .input('Username', sql.VarChar, Username)
            .input('UserPW', sql.VarChar, hashedPassword)
            .query('INSERT INTO Users OUTPUT INSERTED.ID VALUES (@Username, @UserPW, GETDATE())');

        res.status(201).json({ id: result.recordset[0].ID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Login
app.post('/api/User/login', async (req, res) => {
    try {
        const { Username, UserPW } = req.body;

        const result = await pool.request()
            .input('Username', sql.VarChar, Username)
            .query('SELECT * FROM Users WHERE Username = @Username');

        const user = result.recordset[0];
        if (!user || !await bcrypt.compare(UserPW, user.UserPW)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.ID }, JWT_SECRET);
        res.json({ token, userId: user.ID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API DaiBieu
app.post('/api/DaiBieu', async (req, res) => {
    try {
        const { UserID, ...daiBieuData } = req.body;

        await pool.request()
            .input('UserID', sql.Int, UserID)
            .input('Ten', sql.NVarChar, daiBieuData.Ten_DaiBieu)
            .input('SDT', sql.VarChar, daiBieuData.SDT_DaiBieu)
            .input('Email', sql.VarChar, daiBieuData.Email)
            .input('CoQuan', sql.NVarChar, daiBieuData.CoQuan_DaiBieu)
            .input('ChucVu', sql.NVarChar, daiBieuData.ChucVu_DaiBieu)
            .query(`INSERT INTO DaiBieu VALUES (
                @UserID, @Ten, @SDT, @Email, @CoQuan, @ChucVu, GETDATE(), N'Hoạt động'
            )`);

        res.status(201).json({ message: 'Đại biểu created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));