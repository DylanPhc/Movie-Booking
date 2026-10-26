# Kiến Trúc Vận Hành Backend (Node.js + Express + PostgreSQL)

Tài liệu này giải thích chi tiết cách mã nguồn Backend vận hành từ lúc khởi động server, nạp biến môi trường, tiếp nhận HTTP request, tương tác database cho đến khi phản hồi về Frontend.

---

## 1. Công nghệ sử dụng trong Backend

- **Runtime**: Node.js (phiên bản `>= 18.x`, trên CI dùng Node 20).
- **Web Framework**: Express.js 4.19.2 (đơn giản, hiệu năng cao, dễ mở rộng).
- **Database Client**: `pg` (node-postgres 8.12.0) sử dụng cơ chế **Connection Pooling (`pg.Pool`)**.
- **Bảo mật & Xác thực**: 
  - `bcrypt`: Băm mật khẩu người dùng với salt rounds.
  - `jsonwebtoken` (JWT): Tạo và xác minh Bearer token phiên làm việc.
  - `cors`: Cung cấp Cross-Origin Resource Sharing cho phép gọi API từ domain khác.
  - `dotenv`: Đọc biến môi trường từ file `.env`.
- **Triển khai (Cloud Deployment)**: Render Web Service (Node Runtime) kết nối Render PostgreSQL Database tại vùng `singapore`.

---

## 2. Cấu trúc thư mục Backend

```
src/
├── db.js                 # Khởi tạo kết nối PostgreSQL Pool & cấu hình SSL
├── server.js             # File khởi động chính, cấu hình middleware, routes & cổng
├── middleware/
│   └── auth.js           # Middleware chặn và xác thực JWT Bearer token
└── routes/
    ├── auth.js           # Route POST /register, POST /login
    ├── movies.js         # Route GET /, GET /:id, GET /:id/showtimes
    └── bookings.js       # Route POST /, GET /me
```

---

## 3. Quá trình khởi động Server (`src/server.js`)

1. **Nạp biến môi trường**: `require('dotenv').config()` đọc file `.env` tại thư mục gốc vào `process.env`.
2. **Cấu hình Middleware**:
   - `cors()`: Mở quyền truy cập cho tất cả các nguồn (Origin) giúp Frontend có thể gọi API dù chạy trên port khác (như Live Server 5500).
   - `express.json()`: Tự động phân tích payload dạng JSON trong body của các request `POST`/`PUT`.
   - `express.static(path.join(__dirname, '../public'))`: Cung cấp toàn bộ file tĩnh (HTML, CSS, JS, ảnh) trong thư mục `public/`.
3. **Đăng ký Router**:
   - `/health` -> Endpoint kiểm tra trạng thái sức khỏe service và kết nối DB.
   - `/api/auth` -> Các route liên quan đến xác thực.
   - `/api/movies` -> Các route liên quan đến danh sách phim và suất chiếu.
   - `/api/bookings` -> Các route đặt vé và xem vé cá nhân.
4. **Lắng nghe cổng**:
   - Biến `PORT`: Lấy từ `process.env.PORT` (mặc định Render cấp phát động) hoặc fallback về `3000` khi chạy máy local.
   - Server bắt đầu tiếp nhận request và ghi log: `Server chạy cổng <PORT>`.

---

## 4. Cơ chế kết nối Cơ sở dữ liệu (`src/db.js`)

Backend sử dụng `pg.Pool` thay vì `pg.Client` đơn lẻ:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres yêu cầu SSL khi chạy production
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
```

### Điểm quan trọng cần lưu ý:
1. **Connection Pooling**:
   - `Pool` tự động quản lý một nhóm các kết nối (connections) có sẵn.
   - Khi có request vào, Backend mượn 1 kết nối từ Pool, thực thi truy vấn và trả lại kết nối cho Pool ngay sau khi hoàn thành.
   - Nhờ đó, server không bị tốn tài nguyên tạo mới kết nối TCP mỗi lần có request, chịu tải tốt khi chạy load test.
2. **Cấu hình SSL**:
   - Khi chạy ở máy cá nhân (`NODE_ENV` không phải `production`), `ssl: false`.
   - Khi chạy trên Render (`NODE_ENV=production`), `ssl: { rejectUnauthorized: false }` được kích hoạt để vượt qua chứng chỉ tự ký của Render Database.
   - Lưu ý khi chạy script nạp dữ liệu từ xa: Biến `DB_SSL=true` được sử dụng trong `scripts/init-db.js`.

---

## 5. Vòng đời xử lý một HTTP Request (Request Lifecycle)

```
Client Request
      │
      ▼
1. CORS Middleware
   (Kiểm tra Header Origin, phương thức OPTIONS preflight)
      │
      ▼
2. express.json()
   (Chuyển chuỗi JSON gửi lên thành req.body Object)
      │
      ▼
3. Router Matching
   (Xác định route khớp: /api/movies, /api/auth, /api/bookings...)
      │
      ├── [Nếu route yêu cầu đăng nhập: /api/bookings]
      │     ▼
      │   authMiddleware (src/middleware/auth.js)
      │   - Đọc header req.headers.authorization
      │   - Kiểm tra định dạng 'Bearer <token>'
      │   - jwt.verify(token, process.env.JWT_SECRET)
      │   - Thành công: Gán req.user = payload giải mã -> next()
      │   - Thất bại: Trả ngay 401 Unauthorized
      │
      ▼
4. Controller Logic
   (Truy vấn database qua pool.query(...), tính toán logic)
      │
      ▼
5. Response
   (res.json(data) hoặc res.status(code).json({ error: message }))
```

---

## 6. Biến môi trường cần thiết (`.env`)

| Tên biến | Bắt buộc | Mô tả | Giá trị mẫu |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL | `postgres://postgres:123456@localhost:5432/movie_booking` |
| `JWT_SECRET` | Có | Khóa bí mật ký token JWT | `movie_booking_super_secret_key_2026` |
| `PORT` | Không | Cổng chạy Express server (mặc định 3000) | `3000` |
| `NODE_ENV` | Không | Môi trường chạy (`development` hoặc `production`) | `development` |
| `DB_SSL` | Không | Bật SSL cho script `init-db.js` | `true` |

---

## 7. Cơ chế kiểm tra sức khỏe hệ thống (`/health`)

Endpoint `GET /health` thực thi câu lệnh SQL nhẹ:
```javascript
SELECT NOW();
```
- **Nếu thành công**: Trả về `200 OK` kèm `{ status: "ok", dbTime: "<timestamp>" }`.
- **Nếu database chưa chạy hoặc sai mật khẩu**: Trả về `500 Internal Server Error` kèm `{ status: "error", message: "<chi tiết lỗi>" }`.
- Render sử dụng endpoint này để xác nhận ứng dụng đã sẵn sàng nhận traffic.
- Frontend có thể ping định kỳ endpoint này để hiển thị trạng thái kết nối máy chủ cho người dùng.
