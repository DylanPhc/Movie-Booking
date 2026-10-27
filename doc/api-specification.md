# Đặc Tả API Chi Tiết (API Specification)

Tài liệu này là hợp đồng giao tiếp (API Contract) giữa **Frontend** và **Backend**. Mọi endpoint đều phải tuân thủ đúng định dạng dữ liệu, tên trường và mã trạng thái HTTP tại đây để đảm bảo hai bên hoạt động tương thích tuyệt đối.

---

## 1. Quy ước chung

- **Base URL**:
  - Khi chạy local: `http://localhost:3000` (hoặc relative `/api/...` nếu Frontend được phục vụ trực tiếp từ Express).
  - Khi deploy Render: `https://movie-booking-xxxx.onrender.com`.
- **Content-Type**: Mọi request có body đều phải có header `Content-Type: application/json`.
- **Mã hóa chuỗi**: `UTF-8`.
- **Xác thực (Auth)**:
  - Header: `Authorization: Bearer <token_jwt>`.
  - Token được cấp từ API `/api/auth/login` hoặc `/api/auth/register`.
- **Định dạng lỗi chuẩn**:
  ```json
  {
    "error": "Mô tả nguyên nhân lỗi bằng tiếng Việt hoặc tiếng Anh"
  }
  ```

---

## 2. Danh sách Endpoints

| Phương thức | Đường dẫn | Trạng thái Backend | Quyền truy cập | Mô tả |
| :---: | :--- | :---: | :---: | :--- |
| `GET` | `/health` | Đã xong | Công khai | Kiểm tra server và database |
| `GET` | `/api/movies` | Đã xong | Công khai | Danh sách toàn bộ phim |
| `GET` | `/api/movies/:id` | Đã xong | Công khai | Chi tiết 1 phim theo ID |
| `GET` | `/api/movies/:id/showtimes` | Đã xong | Công khai | Danh sách suất chiếu còn hiệu lực của phim |
| `POST` | `/api/auth/register` | Đang làm (501) | Công khai | Đăng ký tài khoản người dùng mới |
| `POST` | `/api/auth/login` | Đang làm (501) | Công khai | Đăng nhập lấy JWT Bearer token |
| `POST` | `/api/bookings` | Đang làm (501) | Yêu cầu Token | Đặt vé xem phim (chọn suất và ghế) |
| `GET` | `/api/bookings/me` | Đang làm (501) | Yêu cầu Token | Xem lịch sử các vé đã đặt của tôi |
| `GET` | `/api/showtimes/:id/booked-seats` | Khuyến nghị thêm | Công khai | Lấy danh sách các ghế đã bị đặt của suất chiếu |

---

## 3. Chi tiết từng Endpoint

### 3.1. Health Check
- **Đường dẫn**: `GET /health`
- **Mục đích**: Render kiểm tra liveness và Frontend kiểm tra trạng thái Backend.
- **Phản hồi thành công (200 OK)**:
  ```json
  {
    "status": "ok",
    "dbTime": "2026-10-26T15:20:00.000Z"
  }
  ```
- **Phản hồi lỗi (500 Internal Server Error)**:
  ```json
  {
    "status": "error",
    "message": "connect ECONNREFUSED 127.0.0.1:5432"
  }
  ```

---

### 3.2. Lấy danh sách phim
- **Đường dẫn**: `GET /api/movies`
- **Mục đích**: Hiển thị danh sách phim trên trang chủ.
- **Phản hồi thành công (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "title": "Phim Mẫu 1",
      "description": "Mô tả phim mẫu 1",
      "duration_min": 120,
      "poster_url": "https://example.com/poster1.jpg",
      "genre": "Hành động"
    },
    {
      "id": 2,
      "title": "Phim Mẫu 2",
      "description": "Mô tả phim mẫu 2",
      "duration_min": 105,
      "poster_url": "",
      "genre": "Hài"
    }
  ]
  ```
- **Lưu ý Frontend**: Trường `poster_url` có thể là chuỗi rỗng `""`. Frontend cần hiển thị poster mặc định hoặc icon placeholder thay thế để không bị vỡ ảnh.

---

### 3.3. Chi tiết phim theo ID
- **Đường dẫn**: `GET /api/movies/:id`
- **Tham số URL**: `id` (số nguyên, ví dụ `1`).
- **Phản hồi thành công (200 OK)**:
  ```json
  {
    "id": 1,
    "title": "Phim Mẫu 1",
    "description": "Mô tả phim mẫu 1",
    "duration_min": 120,
    "poster_url": "",
    "genre": "Hành động"
  }
  ```
- **Phản hồi khi không tìm thấy (404 Not Found)**:
  ```json
  {
    "error": "Không tìm thấy phim"
  }
  ```

---

### 3.4. Lấy các suất chiếu của phim
- **Đường dẫn**: `GET /api/movies/:id/showtimes`
- **Tham số URL**: `id` (ID của phim).
- **Phản hồi thành công (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "start_time": "2026-10-27T10:00:00.000Z",
      "price": "90000.00",
      "theater": "Phòng 1"
    },
    {
      "id": 2,
      "start_time": "2026-10-28T14:30:00.000Z",
      "price": "90000.00",
      "theater": "Phòng 2"
    }
  ]
  ```
- **Lưu ý quan trọng**:
  - `price` được driver `pg` trả về dạng **string** (ví dụ `"90000.00"`). Frontend cần convert bằng `Number(item.price)` hoặc `parseFloat(item.price)`.
  - Backend đang lọc `start_time > NOW()`, do đó các suất chiếu trong quá khứ sẽ không xuất hiện.
  - Sơ đồ phòng chiếu mặc định là 8 hàng x 10 ghế (A1 - H10).

---

### 3.5. Đăng ký tài khoản (Auth Register)
- **Đường dẫn**: `POST /api/auth/register`
- **Request Body (JSON)**:
  ```json
  {
    "email": "user@example.com",
    "password": "matkhau123",
    "full_name": "Nguyễn Văn A"
  }
  ```
- **Xử lý Backend**:
  - Kiểm tra email hợp lệ và chưa tồn tại trong bảng `users`.
  - Băm mật khẩu bằng `bcrypt.hash(password, 10)`.
  - Thêm bản ghi vào bảng `users`.
  - Ký JWT token chứa `{ id: user.id, email: user.email, role: user.role }`.
- **Phản hồi thành công (201 Created)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "role": "user"
    }
  }
  ```
- **Phản hồi lỗi (400 Bad Request)**:
  ```json
  {
    "error": "Email đã được sử dụng"
  }
  ```

---

### 3.6. Đăng nhập tài khoản (Auth Login)
- **Đường dẫn**: `POST /api/auth/login`
- **Request Body (JSON)**:
  ```json
  {
    "email": "user@example.com",
    "password": "matkhau123"
  }
  ```
- **Phản hồi thành công (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "role": "user"
    }
  }
  ```
- **Phản hồi lỗi (401 Unauthorized)**:
  ```json
  {
    "error": "Email hoặc mật khẩu không chính xác"
  }
  ```

---

### 3.7. Đặt vé xem phim (Create Booking)
- **Đường dẫn**: `POST /api/bookings`
- **Header**: `Authorization: Bearer <token>`
- **Request Body (JSON)**:
  ```json
  {
    "showtime_id": 1,
    "seats": ["A4", "A5"]
  }
  ```
- **Xử lý Backend**:
  - Xác thực user từ token JWT (`req.user.id`).
  - Kiểm tra suất chiếu `showtime_id` có tồn tại.
  - Sử dụng Transaction (`BEGIN ... COMMIT`) để kiểm tra bảng `booking_seats`.
  - Nếu ghế đã có người đặt trước: Rollback và trả về mã lỗi `409 Conflict`.
  - Nếu hợp lệ:
    1. Tạo đơn trong bảng `bookings` với `total_price = seats.length * showtime.price`.
    2. Chèn từng ghế vào `booking_seats (booking_id, showtime_id, seat_label)`.
- **Phản hồi thành công (201 Created)**:
  ```json
  {
    "id": 10,
    "booking_code": "BK-10",
    "showtime_id": 1,
    "seats": ["A4", "A5"],
    "total_price": 180000,
    "created_at": "2026-10-26T15:30:00.000Z"
  }
  ```
- **Phản hồi lỗi khi trùng ghế (409 Conflict)**:
  ```json
  {
    "error": "Ghế A4 đã được đặt bởi người khác. Vui lòng chọn ghế khác."
  }
  ```

---

### 3.8. Xem danh sách vé đã đặt của tôi
- **Đường dẫn**: `GET /api/bookings/me`
- **Header**: `Authorization: Bearer <token>`
- **Phản hồi thành công (200 OK)**:
  ```json
  [
    {
      "id": 10,
      "movie_title": "Phim Mẫu 1",
      "poster_url": "",
      "theater_name": "Phòng 1",
      "start_time": "2026-10-27T10:00:00.000Z",
      "seats": ["A4", "A5"],
      "total_price": "180000.00",
      "created_at": "2026-10-26T15:30:00.000Z"
    }
  ]
  ```

---

### 3.9. Lấy danh sách ghế đã đặt theo suất chiếu (Khuyến nghị cho Backend)
- **Đường dẫn**: `GET /api/showtimes/:id/booked-seats`
- **Mục đích**: Cho phép Frontend vô hiệu hóa các ghế đã được đặt trước trên sơ đồ ghế.
- **Phản hồi thành công (200 OK)**:
  ```json
  {
    "showtime_id": 1,
    "booked_seats": ["A4", "A5", "C2", "D7"]
  }
  ```
