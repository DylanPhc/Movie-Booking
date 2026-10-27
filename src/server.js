require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check: Render dùng endpoint này để biết service còn sống
app.get('/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/bookings', require('./routes/bookings'));
// Để hỗ trợ GET /api/showtimes/:id/booked-seats
app.use('/api', require('./routes/bookings'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy cổng ${PORT}`));
