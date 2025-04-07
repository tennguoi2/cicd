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

// ========== HỘI NGHỊ API ROUTES ==========

// Get all hội nghị
app.get('/api/hoi-nghi', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    
    // Get all hội nghị
    const result = await sql.query`
      SELECT h.*, u.HoTen as NguoiTao,
            (SELECT COUNT(*) FROM ThamGiaHoiNghi WHERE ID_HoiNghi = h.ID_HoiNghi) as SoNguoiThamGia
      FROM HoiNghi h
      LEFT JOIN Users u ON h.UserID_NguoiTao = u.ID
      ORDER BY h.ThoiGian_BatDau_HoiNghi DESC
    `;
    
    const hoiNghi = result.recordset.map(item => ({
      id: item.ID_HoiNghi,
      tenHoiNghi: item.Ten_HoiNghi,
      moTa: item.MoTa,
      diaChiHoiNghi: item.DiaChi_HoiNghi,
      thoiGianBatDau: item.ThoiGian_BatDau_HoiNghi,
      thoiGianKetThuc: item.ThoiGian_KetThuc_HoiNghi,
      nguoiTao: item.NguoiTao,
      trangThai: item.TrangThai_HoiNghi,
      soNguoiThamGia: item.SoNguoiThamGia
    }));
    
    res.json(hoiNghi);
  } catch (err) {
    console.error('Error fetching conferences:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách hội nghị' });
  } finally {
    sql.close();
  }
});

// Get hội nghị by ID
app.get('/api/hoi-nghi/:id', async (req, res) => {
  try {
    const hoiNghiId = req.params.id;
    
    await sql.connect(dbConfig);
    
    // Get hội nghị and creator info
    const result = await sql.query`
      SELECT h.*, u.HoTen as NguoiTao
      FROM HoiNghi h
      LEFT JOIN Users u ON h.UserID_NguoiTao = u.ID
      WHERE h.ID_HoiNghi = ${hoiNghiId}
    `;
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hội nghị' });
    }
    
    const hoiNghi = result.recordset[0];
    const responseData = {
      conference: {
        id: hoiNghi.ID_HoiNghi,
        tenHoiNghi: hoiNghi.Ten_HoiNghi,
        moTa: hoiNghi.MoTa,
        diaChiHoiNghi: hoiNghi.DiaChi_HoiNghi,
        thoiGianBatDau: hoiNghi.ThoiGian_BatDau_HoiNghi,
        thoiGianKetThuc: hoiNghi.ThoiGian_KetThuc_HoiNghi,
        nguoiTao: hoiNghi.NguoiTao,
        trangThai: hoiNghi.TrangThai_HoiNghi,
        isRegistered: false,
        registrationStatus: null
      }
    };

    // Nếu có token, kiểm tra trạng thái đăng ký
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Check if user has registered for this conference
        const registration = await sql.query`
          SELECT * FROM ThamGiaHoiNghi
          WHERE UserID = ${userId} AND ID_HoiNghi = ${hoiNghiId}
        `;
        
        if (registration.recordset.length > 0) {
          responseData.conference.isRegistered = true;
          responseData.conference.registrationStatus = registration.recordset[0].TrangThai_ThamGia;
        }
      } catch (error) {
        // Token không hợp lệ, bỏ qua
      }
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Admin: Tạo hội nghị mới
app.post('/api/hoi-nghi', authenticateToken, isAdminOrStaff, async (req, res) => {
    console.log("Request Body:", req.body); // Log the request body
  try {
    const { tenHoiNghi, moTa, diaChiHoiNghi, thoiGianBatDau, thoiGianKetThuc, trangThai } = req.body;

    if (!tenHoiNghi || !diaChiHoiNghi || !thoiGianBatDau || !thoiGianKetThuc) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    const startTime = new Date(thoiGianBatDau);
    const endTime = new Date(thoiGianKetThuc);

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
    }

    if (!req.user || !req.user.id) {
      return res.status(403).json({ message: 'Không xác định được người tạo' });
    }

    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('tenHoiNghi', sql.NVarChar, tenHoiNghi)
      .input('moTa', sql.NVarChar, moTa || null)
      .input('diaChiHoiNghi', sql.NVarChar, diaChiHoiNghi)
      .input('thoiGianBatDau', sql.DateTime, startTime)
      .input('thoiGianKetThuc', sql.DateTime, endTime)
      .input('userId', sql.Int, req.user.id)
      .input('trangThai', sql.NVarChar, trangThai || 'Đang diễn ra')
      .query(`
        INSERT INTO HoiNghi (
          Ten_HoiNghi, 
          MoTa, 
          DiaChi_HoiNghi, 
          ThoiGian_BatDau_HoiNghi, 
          ThoiGian_KetThuc_HoiNghi, 
          UserID_NguoiTao, 
          TrangThai_HoiNghi
        )
        OUTPUT INSERTED.ID_HoiNghi
        VALUES (
          @tenHoiNghi, 
          @moTa, 
          @diaChiHoiNghi, 
          @thoiGianBatDau, 
          @thoiGianKetThuc, 
          @userId, 
          @trangThai
        )
      `);

    res.status(201).json({
      message: 'Tạo hội nghị thành công',
      id: result.recordset[0].ID_HoiNghi,
      tenHoiNghi: tenHoiNghi
    });
  } catch (err) {
    console.error('Lỗi khi tạo hội nghị:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo hội nghị.' });
  }
});

// Admin: Update hội nghị
app.put('/api/hoi-nghi/:id', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const hoiNghiId = req.params.id;
    const { tenHoiNghi, moTa, diaChiHoiNghi, thoiGianBatDau, thoiGianKetThuc, trangThai } = req.body;

    // Debug: Log dữ liệu nhận được
    console.log('Update Request Body:', req.body);

    // Kiểm tra định dạng thời gian
    const isValidDate = (dateString) => {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };

    // Kiểm tra từng trường thời gian nếu có
    if (thoiGianBatDau && !isValidDate(thoiGianBatDau)) {
      return res.status(400).json({ message: 'Thời gian bắt đầu không hợp lệ' });
    }
    if (thoiGianKetThuc && !isValidDate(thoiGianKetThuc)) {
      return res.status(400).json({ message: 'Thời gian kết thúc không hợp lệ' });
    }

    // Kết nối database
    await sql.connect(dbConfig);

    // Kiểm tra tồn tại hội nghị
    const checkRequest = new sql.Request();
    checkRequest.input('id', sql.Int, hoiNghiId);
    const checkHoiNghi = await checkRequest.query('SELECT * FROM HoiNghi WHERE ID_HoiNghi = @id');
    if (checkHoiNghi.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hội nghị' });
    }

    // Lấy giá trị hiện tại để kiểm tra logic
    const currentHoiNghi = checkHoiNghi.recordset[0];
    const finalStartTime = thoiGianBatDau ? new Date(thoiGianBatDau) : new Date(currentHoiNghi.ThoiGian_BatDau_HoiNghi);
    const finalEndTime = thoiGianKetThuc ? new Date(thoiGianKetThuc) : new Date(currentHoiNghi.ThoiGian_KetThuc_HoiNghi);

    // Kiểm tra thời gian hợp lệ
    if (finalStartTime >= finalEndTime) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
    }

    // Cập nhật dữ liệu
    const updateRequest = new sql.Request();
    updateRequest.input('id', sql.Int, hoiNghiId);

    let updates = [];
    if (tenHoiNghi) {
      updateRequest.input('tenHoiNghi', sql.NVarChar, tenHoiNghi);
      updates.push('Ten_HoiNghi = @tenHoiNghi');
    }
    if (moTa !== undefined) {
      updateRequest.input('moTa', sql.NVarChar, moTa);
      updates.push('MoTa = @moTa');
    }
    if (diaChiHoiNghi) {
      updateRequest.input('diaChiHoiNghi', sql.NVarChar, diaChiHoiNghi);
      updates.push('DiaChi_HoiNghi = @diaChiHoiNghi');
    }
    if (thoiGianBatDau) {
      updateRequest.input('thoiGianBatDau', sql.DateTime, finalStartTime);
      updates.push('ThoiGian_BatDau_HoiNghi = @thoiGianBatDau');
    }
    if (thoiGianKetThuc) {
      updateRequest.input('thoiGianKetThuc', sql.DateTime, finalEndTime);
      updates.push('ThoiGian_KetThuc_HoiNghi = @thoiGianKetThuc');
    }
    if (trangThai) {
      updateRequest.input('trangThai', sql.NVarChar, trangThai);
      updates.push('TrangThai_HoiNghi = @trangThai');
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' });
    }

    const updateQuery = `UPDATE HoiNghi SET ${updates.join(', ')} WHERE ID_HoiNghi = @id`;
    await updateRequest.query(updateQuery);

    res.json({
      message: 'Cập nhật hội nghị thành công',
      id: hoiNghiId
    });
  } catch (err) {
    console.error('Update conference error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật hội nghị' });
  } finally {
    sql.close();
  }
});

// Admin: Delete hội nghị
app.delete('/api/hoi-nghi/:id', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const hoiNghiId = req.params.id;
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if hội nghị exists
    const request = new sql.Request();
    request.input('id', sql.Int, hoiNghiId);
    
    const checkHoiNghi = await request.query('SELECT * FROM HoiNghi WHERE ID_HoiNghi = @id');
    if (checkHoiNghi.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hội nghị' });
    }
    
    // Delete hội nghị
    await request.query('DELETE FROM HoiNghi WHERE ID_HoiNghi = @id');
    
    // Return success response
    res.json({
      message: 'Xóa hội nghị thành công'
    });
  } catch (err) {
    console.error('Delete conference error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa hội nghị. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// ========== ĐĂNG KÝ HỘI NGHỊ API ROUTES ==========
app.post('/api/tham-gia-hoi-nghi', authenticateToken, async (req, res) => {
  try {
    const { idHoiNghi, ghiChu } = req.body;
    
    // Validate required fields
    if (!idHoiNghi) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ID hội nghị' });
    }
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if hội nghị exists and is not ended/canceled
    const request = new sql.Request();
    request.input('id', sql.Int, idHoiNghi);
    
    const checkHoiNghi = await request.query(`
      SELECT * FROM HoiNghi 
      WHERE ID_HoiNghi = @id 
      AND TrangThai_HoiNghi != N'Đã kết thúc' 
      AND TrangThai_HoiNghi != N'Đã hủy'
    `);
    
    if (checkHoiNghi.recordset.length === 0) {
      return res.status(404).json({ message: 'Hội nghị không tồn tại hoặc đã kết thúc/hủy' });
    }
    
    // Check if user has already registered
    const checkRequest = new sql.Request();
    checkRequest.input('userId', sql.Int, req.user.id);
    checkRequest.input('hoiNghiId', sql.Int, idHoiNghi);
    
    const checkRegistration = await checkRequest.query(`
      SELECT * FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    if (checkRegistration.recordset.length > 0) {
      return res.status(400).json({ message: 'Bạn đã đăng ký tham gia hội nghị này' });
    }
    
    // Insert new registration
    const insertRequest = new sql.Request();
    insertRequest.input('userId', sql.Int, req.user.id);
    insertRequest.input('hoiNghiId', sql.Int, idHoiNghi);
    insertRequest.input('ghiChu', sql.NVarChar, ghiChu || null);
    
    const result = await insertRequest.query(`
      INSERT INTO ThamGiaHoiNghi (UserID, ID_HoiNghi, GhiChu)
      OUTPUT INSERTED.ID_ThamGiaHoiNghi
      VALUES (@userId, @hoiNghiId, @ghiChu)
    `);
    
    const registrationId = result.recordset[0].ID_ThamGiaHoiNghi;
    
    // Return success response
    res.status(201).json({
      message: 'Đăng ký tham gia hội nghị thành công',
      id: registrationId
    });
  } catch (err) {
    console.error('Conference registration error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký tham gia hội nghị. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// Hủy đăng ký tham gia hội nghị
app.delete('/api/tham-gia-hoi-nghi/:idHoiNghi', authenticateToken, async (req, res) => {
  try {
    const idHoiNghi = req.params.idHoiNghi;
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if registration exists
    const request = new sql.Request();
    request.input('userId', sql.Int, req.user.id);
    request.input('hoiNghiId', sql.Int, idHoiNghi);
    
    const checkRegistration = await request.query(`
      SELECT * FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    if (checkRegistration.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký tham gia hội nghị' });
    }
    
    // Delete registration
    await request.query(`
      DELETE FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    // Return success response
    res.json({
      message: 'Hủy đăng ký tham gia hội nghị thành công'
    });
  } catch (err) {
    console.error('Cancel registration error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi hủy đăng ký tham gia hội nghị. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// Admin: Lấy danh sách người tham gia hội nghị
app.get('/api/hoi-nghi/:id/nguoi-tham-gia', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const hoiNghiId = req.params.id;
    
    await sql.connect(dbConfig);
    
    // Get participants
    const request = new sql.Request();
    request.input('hoiNghiId', sql.Int, hoiNghiId);
    
    const result = await request.query(`
      SELECT tg.*, u.HoTen, u.Email, u.SDT, u.UserType, u.CoQuan, u.ChucVu
      FROM ThamGiaHoiNghi tg
      JOIN Users u ON tg.UserID = u.ID
      WHERE tg.ID_HoiNghi = @hoiNghiId
      ORDER BY tg.ThoiGian_DangKy DESC
    `);
    
    const participants = result.recordset.map(p => ({
      id: p.ID_ThamGiaHoiNghi,
      userId: p.UserID,
      hoTen: p.HoTen,
      email: p.Email,
      sdt: p.SDT,
      coQuan: p.CoQuan,
      chucVu: p.ChucVu,
      userType: p.UserType,
      trangThai: p.TrangThai_ThamGia,
      thoiGianDangKy: p.ThoiGian_DangKy,
      thoiGianDiemDanh: p.ThoiGian_DiemDanh,
      ghiChu: p.GhiChu
    }));
    
    res.json(participants);
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách người tham gia hội nghị' });
  } finally {
    sql.close();
  }
});

// Admin: Điểm danh người tham gia
app.put('/api/tham-gia-hoi-nghi/:id/diem-danh', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { trangThai, ghiChu } = req.body;
    
    // Validate status
    if (trangThai && !['Đăng ký', 'Đã điểm danh', 'Vắng mặt'].includes(trangThai)) {
      return res.status(400).json({ message: 'Trạng thái tham gia không hợp lệ' });
    }
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if registration exists
    const request = new sql.Request();
    request.input('id', sql.Int, registrationId);
    
    const checkRegistration = await request.query(`
      SELECT * FROM ThamGiaHoiNghi WHERE ID_ThamGiaHoiNghi = @id
    `);
    
    if (checkRegistration.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký tham gia hội nghị' });
    }
    
    // Update registration
    const updateRequest = new sql.Request();
    updateRequest.input('id', sql.Int, registrationId);
    updateRequest.input('trangThai', sql.NVarChar, trangThai || 'Đã điểm danh');
    updateRequest.input('thoiGianDiemDanh', sql.DateTime, trangThai === 'Đã điểm danh' ? new Date() : null);
    updateRequest.input('ghiChu', sql.NVarChar, ghiChu || checkRegistration.recordset[0].GhiChu);
    
    await updateRequest.query(`
      UPDATE ThamGiaHoiNghi
      SET TrangThai_ThamGia = @trangThai,
          ThoiGian_DiemDanh = @thoiGianDiemDanh,
          GhiChu = @ghiChu
      WHERE ID_ThamGiaHoiNghi = @id
    `);
    
    // Return success response
    res.json({
      message: 'Cập nhật trạng thái tham gia hội nghị thành công'
    });
  } catch (err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật trạng thái tham gia hội nghị. Vui lòng thử lại.' });
  } finally {
    sql.close();
  }
});

// Admin: Điểm danh người dùng cụ thể
app.put('/api/hoi-nghi/:idHoiNghi/attendance/:userId', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const idHoiNghi = req.params.idHoiNghi;
    const userId = req.params.userId;
    const { trangThaiThamGia, ghiChu } = req.body;
    
    // Validate status
    if (!['Đăng ký', 'Đã điểm danh', 'Vắng mặt'].includes(trangThaiThamGia)) {
      return res.status(400).json({ message: 'Trạng thái tham gia không hợp lệ' });
    }
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if registration exists
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('hoiNghiId', sql.Int, idHoiNghi);
    
    const checkRegistration = await request.query(`
      SELECT * FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    if (checkRegistration.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký tham gia' });
    }
    
    // Update attendance status
    const updateRequest = new sql.Request();
    updateRequest.input('userId', sql.Int, userId);
    updateRequest.input('hoiNghiId', sql.Int, idHoiNghi);
    updateRequest.input('trangThai', sql.NVarChar, trangThaiThamGia);
    updateRequest.input('ghiChu', sql.NVarChar, ghiChu || null);
    updateRequest.input('thoiGianDiemDanh', sql.DateTime, trangThaiThamGia === 'Đã điểm danh' ? new Date() : null);
    
    await updateRequest.query(`
      UPDATE ThamGiaHoiNghi
      SET TrangThai_ThamGia = @trangThai,
          ThoiGian_DiemDanh = @thoiGianDiemDanh,
          GhiChu = @ghiChu
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    res.json({ message: 'Cập nhật điểm danh thành công' });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ message: 'Lỗi khi cập nhật điểm danh' });
  } finally {
    sql.close();
  }
});

// Admin: Hủy đăng ký của người dùng
app.delete('/api/hoi-nghi/:idHoiNghi/attendance/:userId', authenticateToken, isAdminOrStaff, async (req, res) => {
  try {
    const idHoiNghi = req.params.idHoiNghi;
    const userId = req.params.userId;
    
    // Connect to database
    await sql.connect(dbConfig);
    
    // Check if registration exists
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('hoiNghiId', sql.Int, idHoiNghi);
    
    const checkRegistration = await request.query(`
      SELECT * FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    if (checkRegistration.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đăng ký tham gia' });
    }
    
    // Delete registration
    await request.query(`
      DELETE FROM ThamGiaHoiNghi 
      WHERE UserID = @userId AND ID_HoiNghi = @hoiNghiId
    `);
    
    res.json({ message: 'Hủy đăng ký tham gia hội nghị thành công' });
  } catch (err) {
    console.error('Admin cancel registration error:', err);
    res.status(500).json({ message: 'Lỗi khi hủy đăng ký tham gia hội nghị' });
  } finally {
    sql.close();
  }
});

// Lấy danh sách hội nghị đã đăng ký của người dùng
app.get('/api/tham-gia-hoi-nghi', authenticateToken, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    
    // Get registered conferences
    const request = new sql.Request();
    request.input('userId', sql.Int, req.user.id);
    
    const result = await request.query(`
      SELECT h.*, t.TrangThai_ThamGia, t.ThoiGian_DangKy, t.ThoiGian_DiemDanh, t.GhiChu
      FROM ThamGiaHoiNghi t
      JOIN HoiNghi h ON t.ID_HoiNghi = h.ID_HoiNghi
      WHERE t.UserID = @userId
      ORDER BY h.ThoiGian_BatDau_HoiNghi DESC
    `);
    
    const registrations = result.recordset.map(r => ({
      id: r.ID_ThamGiaHoiNghi,
      hoiNghiId: r.ID_HoiNghi,
      tenHoiNghi: r.Ten_HoiNghi,
      diaChiHoiNghi: r.DiaChi_HoiNghi,
      thoiGianBatDau: r.ThoiGian_BatDau_HoiNghi,
      thoiGianKetThuc: r.ThoiGian_KetThuc_HoiNghi,
      trangThaiHoiNghi: r.TrangThai_HoiNghi,
      trangThaiThamGia: r.TrangThai_ThamGia,
      thoiGianDangKy: r.ThoiGian_DangKy,
      thoiGianDiemDanh: r.ThoiGian_DiemDanh,
      ghiChu: r.GhiChu
    }));
    
    res.json(registrations);
  } catch (err) {
    console.error('Error fetching registered conferences:', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách hội nghị đã đăng ký' });
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

// Route for serving starter page
app.get('/starter-page.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../starter-page.html'));
});

// Admin pages
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../', req.path));
});

// Start server
app.listen(PORT, () => {
  console.log(`API server đang chạy tại http://localhost:${PORT}`);
});
