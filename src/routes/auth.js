const router = require('express').Router();

// TODO (người C - tuần 2): POST /register, POST /login (bcrypt + JWT)
router.post('/register', (req, res) => res.status(501).json({ error: 'Chưa làm' }));
router.post('/login', (req, res) => res.status(501).json({ error: 'Chưa làm' }));

module.exports = router;
