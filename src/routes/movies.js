const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM movies ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM movies WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Không tìm thấy phim' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/showtimes', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT s.id, s.start_time, s.price, t.name AS theater
       FROM showtimes s JOIN theaters t ON t.id = s.theater_id
       WHERE s.movie_id=$1 AND s.start_time > NOW()
       ORDER BY s.start_time`, [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
