const router = require('express').Router();

// TODO (người C - tuần 3): GET /me, POST / (transaction đặt vé), seats của suất chiếu
router.post('/', (req, res) => res.status(501).json({ error: 'Chưa làm' }));
router.get('/me', (req, res) => res.status(501).json({ error: 'Chưa làm' }));

module.exports = router;
