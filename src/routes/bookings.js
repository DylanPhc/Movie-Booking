const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// 1. POST /api/bookings - Đặt vé có Transaction và chống race condition
router.post('/', authMiddleware, async (req, res) => {
  const { showtime_id, seats } = req.body;
  const userId = req.user.id;

  if (!showtime_id || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ: thiếu showtime_id hoặc danh sách seats' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Bắt đầu Transaction

    // Kiểm tra suất chiếu có tồn tại không và lấy giá vé
    const showtimeRes = await client.query(
      'SELECT id, price FROM showtimes WHERE id = $1',
      [showtime_id]
    );

    if (showtimeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Suất chiếu không tồn tại' });
    }

    const pricePerSeat = parseFloat(showtimeRes.rows[0].price);
    const totalPrice = pricePerSeat * seats.length;

    // Kiểm tra và khóa các dòng ghế đã bị đặt bằng FOR UPDATE
    const checkSeatQuery = `
      SELECT seat_label 
      FROM booking_seats 
      WHERE showtime_id = $1 AND seat_label = ANY($2::text[])
      FOR UPDATE
    `;
    const conflictRes = await client.query(checkSeatQuery, [showtime_id, seats]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      const conflictSeat = conflictRes.rows[0].seat_label;
      return res.status(409).json({
        error: `Ghế ${conflictSeat} đã được đặt bởi người khác. Vui lòng chọn ghế khác.`
      });
    }

    // Chèn bản ghi vào bảng bookings
    const insertBookingQuery = `
      INSERT INTO bookings (user_id, showtime_id, total_price, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, created_at
    `;
    const bookingRes = await client.query(insertBookingQuery, [userId, showtime_id, totalPrice]);
    const bookingId = bookingRes.rows[0].id;
    const createdAt = bookingRes.rows[0].created_at;

    // Chèn từng ghế đã chọn vào bảng booking_seats
    for (const seat of seats) {
      await client.query(
        'INSERT INTO booking_seats (booking_id, showtime_id, seat_label) VALUES ($1, $2, $3)',
        [bookingId, showtime_id, seat]
      );
    }

    await client.query('COMMIT'); // Lưu toàn bộ thay đổi thành công

    return res.status(201).json({
      id: bookingId,
      booking_code: `BK-${bookingId}`,
      showtime_id,
      seats,
      total_price: totalPrice,
      created_at: createdAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    // Bắt mã lỗi vi phạm UNIQUE constraint (showtime_id, seat_label)
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Ghế bạn chọn vừa được người khác đặt. Vui lòng chọn lại.'
      });
    }
    console.error('Lỗi khi đặt vé:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ trong quá trình đặt vé' });
  } finally {
    client.release(); // Trả kết nối về pool
  }
});

// 2. GET /api/bookings/me - Xem danh sách vé đã đặt của user hiện tại
router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT 
        b.id,
        m.title AS movie_title,
        COALESCE(m.poster_url, '') AS poster_url,
        t.name AS theater_name,
        st.start_time,
        b.total_price,
        b.created_at,
        ARRAY_AGG(bs.seat_label ORDER BY bs.seat_label) AS seats
      FROM bookings b
      JOIN showtimes st ON b.showtime_id = st.id
      JOIN theaters t ON st.theater_id = t.id
      JOIN movies m ON st.movie_id = m.id
      JOIN booking_seats bs ON bs.booking_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.id, m.title, m.poster_url, t.name, st.start_time, b.total_price, b.created_at
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Lỗi lấy lịch sử vé:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách vé đã đặt' });
  }
});

// 3. GET /api/showtimes/:id/booked-seats - Lấy danh sách ghế đã được đặt theo suất chiếu
router.get('/showtimes/:id/booked-seats', async (req, res) => {
  const showtimeId = req.params.id;

  try {
    const query = `
      SELECT seat_label 
      FROM booking_seats 
      WHERE showtime_id = $1
    `;
    const result = await pool.query(query, [showtimeId]);
    const bookedSeats = result.rows.map(row => row.seat_label);

    return res.status(200).json({
      showtime_id: parseInt(showtimeId, 10),
      booked_seats: bookedSeats
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách ghế đã đặt:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy sơ đồ ghế' });
  }
});

module.exports = router;