# Tài Liệu Kiến Trúc & Vận Hành Hệ Thống Movie Booking

> **Dành cho thành viên Frontend, Backend, Database và DevOps**  
> Dự án Đồ án Cloud Computing: Hệ thống đặt vé xem phim trực tuyến (Node.js + PostgreSQL + Render).

---

## 1. Mục lục tài liệu

| Tài liệu | Nội dung chính | Đối tượng |
| :--- | :--- | :--- |
| [1. Kiến trúc Backend](./backend-architecture.md) | Vòng đời request, Express server, PostgreSQL connection pool, Render deployment | Backend, Frontend, DevOps |
| [2. Đặc tả API (API Spec)](./api-specification.md) | Toàn bộ endpoints, Headers, Request/Response payload, HTTP status codes | Backend, Frontend |
| [3. Cơ sở dữ liệu & Schema](./database-schema.md) | Cấu trúc 6 bảng, quan hệ khóa ngoại, ràng buộc chống trùng ghế, backup/restore | Database, Backend |
| [4. Tích hợp Frontend - Backend](./frontend-backend-integration.md) | Nguyên tắc tương thích, CORS, JWT Auth header, xử lý kiểu dữ liệu, cơ chế 501 stub | Frontend, Backend |
| [5. Hướng dẫn cài đặt từ Git Clone](./setup-and-run-guide.md) | Hướng dẫn chạy từ A-Z sau khi `git clone`, cấu hình `.env`, init db, xử lý lỗi | Toàn bộ thành viên |

---

## 2. Sơ đồ kiến trúc tổng thể (System Architecture)

```
+-----------------------------------------------------------------------+
|                            TRÌNH DUYỆT (CLIENT)                       |
|                                                                       |
|   [Giao diện Người dùng Web: HTML5, CSS3 Cinema Theme, ES6+ Modules]  |
|   - api.js (API Client, Auto Base URL, Error Handler)                 |
|   - auth.js (Quản lý JWT Token, Session, User UI)                    |
|   - seats.js (Sơ đồ ghế rạp, tính tiền, chọn ghế)                     |
|   - app.js (Render phim, bộ lọc, modal đặt vé, toast thông báo)       |
+-----------------------------------▲-----------------------------------+
                                    │ HTTP / HTTPS (RESTful JSON)
                                    ▼
+-----------------------------------------------------------------------+
|                       EXPRESS.JS BACKEND (Node.js)                    |
|                                                                       |
|  1. Middleware: cors() -> express.json() -> express.static('public') |
|  2. Auth Middleware: jwt.verify(token, JWT_SECRET)                    |
|  3. Endpoints:                                                        |
|     - /health               : Kiểm tra server & DB alive              |
|     - /api/movies           : Lấy danh sách phim & chi tiết & suất    |
|     - /api/auth             : Đăng ký & Đăng nhập (bcrypt, JWT)       |
|     - /api/bookings         : Đặt vé & Lấy lịch sử vé của tôi         |
+-----------------------------------▲-----------------------------------+
                                    │ pg Pool (TCP / SSL)
                                    ▼
+-----------------------------------------------------------------------+
|                      POSTGRESQL DATABASE (Render / Local)             |
|                                                                       |
|  - users        : Tài khoản, email, mật khẩu băm, quyền               |
|  - movies       : Thông tin phim, poster, thể loại, thời lượng        |
|  - theaters     : Phòng chiếu, số hàng, số ghế mỗi hàng               |
|  - showtimes    : Suất chiếu, giá vé, liên kết phim & rạp             |
|  - bookings     : Đơn đặt vé, tổng tiền, liên kết user & suất         |
|  - booking_seats: Ghế đã đặt (UNIQUE showtime_id, seat_label)         |
+-----------------------------------------------------------------------+
```

---

## 3. Phân công vai trò & Ranh giới trách nhiệm

| Thành viên | Vai trò | Trách nhiệm chính | Ranh giới giao tiếp |
| :--- | :--- | :--- | :--- |
| **Nguyễn Đình Minh** | **Frontend, Load test** | Xây dựng toàn bộ giao diện `public/` (UI/UX, sơ đồ rạp ghế, gọi API, load testing) | Tiêu thụ REST API từ Backend; lưu trữ JWT token; gửi request đúng định dạng |
| **Hồ Minh Nhật** | **Backend** | Phát triển API Express (`src/routes/*`, `src/middleware/auth.js`) | Cung cấp endpoints đúng tài liệu `docs/api-specification.md`; xử lý transaction |
| **Huỳnh Hoàng Lâm** | **Database** | Quản lý schema (`db/schema.sql`, `seed.sql`), backup & restore | Đảm bảo bảng, khóa ngoại, chỉ mục index hoạt động tối ưu |
| **Trần Quốc Phước** | **Trưởng nhóm, Deploy** | Quản lý repo, CI/CD GitHub Actions, deploy Render Blueprint (`render.yaml`) | Đảm bảo môi trường deploy hoạt động ổn định trên Render |

---

## 4. Nguyên tắc vàng để không bị xung đột & trở ngại tương thích

1. **Tuân thủ đúng chuẩn REST API**: Backend và Frontend giao tiếp qua JSON, Content-Type `application/json`, header `Authorization: Bearer <token>`.
2. **Không phụ thuộc cứng (Loose Coupling)**: Frontend có cơ chế tự động nhận diện Base URL (cùng domain hay khác domain) và tự động fallback/thông báo khi Backend endpoint đang trong giai đoạn phát triển (501).
3. **Phân biệt nhánh Git rõ ràng**:
   - `feature/Frontend`: Chỉ chỉnh sửa giao diện trong `public/` và tài liệu hỗ trợ.
   - `feature/Backend`: Chỉnh sửa logic nghiệp vụ trong `src/routes/`.
   - Nhờ đó khi tạo Pull Request vào `main`, Git sẽ auto-merge mượt mà không có conflict.
