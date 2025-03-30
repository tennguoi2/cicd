// api.js - Pure API server file
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database config
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: process.env.DB_SERVER || 'PC',
  database: process.env.DB_NAME || 'login',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '../../')));

// Helper functions
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.ID, 
      username: user.Username,
      userType: user.UserType
    }, 
    JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Yêu cầu cung cấp token xác thực' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    req.user = user;
    next();
  });
};

// Role-based middleware
const isAdmin = (req, res, next) => {
  if (req.user.userType !== 'Admin') {
    return res.status(403).json({ message: 'Yêu cầu quyền quản trị viên' });
  }
  next();
};

const isAdminOrStaff = (req, res, next) => {
  if (req.user.userType !== 'Admin' && req.user.userType !== 'NhanVien') {
    return res.status(403).json({ message: 'Yêu cầu quyền quản trị viên hoặc nhân viên' });
  }
  next();
};

// ========== API ROUTES ==========

// Register API
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, userType, hoTen, sdt, email, coQuan, chucVu, role } = req.body;
    
    // Validate required fields
    if (!username || !password || !userType || !hoTen || !email) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if username already exists
    const checkUser = await sql.query`SELECT ID FROM Users WHERE Username = ${username}`;
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }
    
    // Check if email already exists
    const checkEmail = await sql.query`SELECT ID FROM Users WHERE Email = ${email}`;
    if (checkEmail.recordset.length > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    
    // Check if phone number already exists if provided
    if (sdt) {
      const checkSDT = await sql.query`SELECT ID FROM Users WHERE SDT = ${sdt}`;
      if (checkSDT.recordset.length > 0) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Set role based on userType
    let userRole = role;
    if (!userRole && (userType === 'NhanVien' || userType === 'Admin')) {
      userRole = userType;
    }
    
    // Insert new user
    const result = await sql.query`
      INSERT INTO Users (Username, UserPW, UserType, HoTen, SDT, Email, CoQuan, ChucVu, Role)
      VALUES (${username}, ${hashedPassword}, ${userType}, ${hoTen}, ${sdt || null}, ${email}, ${coQuan || null}, ${chucVu || null}, ${userRole || null})
      SELECT SCOPE_IDENTITY() AS ID
    `;
    
    const userId = result.recordset[0].ID;
    
    // Return success response
    res.status(201).json({
      message: 'Đăng ký thành công',
      id: userId,
      username: username
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { Username, Password } = req.body;
    
    // Validate required fields
    if (!Username || !Password) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu' });
    }
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Get user
    const result = await sql.query`
      SELECT ID, Username, UserPW, UserType, HoTen, Email, SDT, CoQuan, ChucVu, TrangThai
      FROM Users
      WHERE Username = ${Username}
    `;
    
    // Check if user exists
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    const user = result.recordset[0];
    
    // Check if user is active
    if (user.TrangThai === 'Đã xóa') {
      return res.status(401).json({ message: 'Tài khoản này đã bị vô hiệu hóa' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(Password, user.UserPW);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return user info and token
    res.json({
      id: user.ID,
      username: user.Username,
      userType: user.UserType,
      hoTen: user.HoTen,
      email: user.Email,
      token: token,
      message: 'Đăng nhập thành công'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    
    const result = await sql.query`
      SELECT ID, Username, UserType, HoTen, Email, SDT, CoQuan, ChucVu, Role
      FROM Users
      WHERE ID = ${req.user.id}
    `;
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    const user = result.recordset[0];
    
    res.json({
      id: user.ID,
      username: user.Username,
      userType: user.UserType,
      hoTen: user.HoTen,
      email: user.Email,
      sdt: user.SDT,
      coQuan: user.CoQuan,
      chucVu: user.ChucVu,
      role: user.Role
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng' });
  } finally {
    sql.close();
  }
});

// Admin: Get all users
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    
    const result = await sql.query`
      SELECT ID, Username, UserType, HoTen, Email, SDT, CoQuan, ChucVu, NgayTao, TrangThai
      FROM Users
      ORDER BY NgayTao DESC
    `;
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách người dùng' });
  } finally {
    sql.close();
  }
});

// Route for serving index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Route for serving login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../login.html'));
});

// Route for serving register page
app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../register.html'));
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Lỗi server' });
});
// Start server
app.listen(PORT, () => {
  console.log(`API server đang chạy tại http://localhost:${PORT}`);
});