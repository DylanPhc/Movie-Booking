const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Đường dẫn đến file cấu hình PostgreSQL Pool của dự án

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, password và full_name' });
  }

  try {
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // 2. Hash mật khẩu (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Thêm user mới vào bảng users (cột password_hash)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, full_name, role`,
      [email, passwordHash, full_name]
    );

    const user = result.rows[0];

    // 4. Ký JWT Bearer token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Lỗi register:', err);
    return res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng cung cấp email và password' });
  }

  try {
    // 1. Tìm tài khoản theo email
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const user = result.rows[0];

    // 2. So khớp mật khẩu người dùng gửi lên với password_hash trong DB
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    // 3. Ký token trả về cho client
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Lỗi login:', err);
    return res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
});

module.exports = router;