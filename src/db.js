require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres yêu cầu SSL khi chạy production
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
