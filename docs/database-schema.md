# Cấu Trúc Cơ Sở Dữ Liệu (PostgreSQL Database Schema)

Tài liệu này cung cấp mô hình thực thể quan hệ (ERD), cấu trúc từng bảng dữ liệu, các ràng buộc toàn vẹn và cơ chế backup/restore trong dự án Movie Booking.

---

## 1. Mô hình quan hệ thực thể (ERD)

```
 [ users ] (1)
     │
     │ 1:N
     ▼
 [ bookings ] (1) ──── 1:N ────► [ booking_seats ]
     ▲
     │ N:1
     │
 [ showtimes ] (N) ◄──── 1:1 ──── (đối chiếu showtime_id trong booking_seats)
     │        │
 N:1 │        │ N:1
     ▼        ▼
[ movies ]  [ theaters ]
```

---

## 2. Chi tiết các bảng dữ liệu (`db/schema.sql`)

### 2.1. Bảng `users` (Người dùng)
Lưu thông tin tài khoản đăng nhập của khách hàng và ban quản trị.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Khóa chính tự tăng |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Email đăng nhập, không trùng lặp |
| `password_hash` | `TEXT` | `NOT NULL` | Mật khẩu đã được mã hóa băm bằng bcrypt |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Họ tên hiển thị của người dùng |
| `role` | `VARCHAR(10)` | `NOT NULL DEFAULT 'user'` | Phân quyền: `'user'` hoặc `'admin'` |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Ngày giờ đăng ký |

---

### 2.2. Bảng `movies` (Danh mục phim)
Lưu trữ thông tin chi tiết các bộ phim đang được chiếu tại cụm rạp.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Khóa chính tự tăng |
| `title` | `VARCHAR(200)` | `NOT NULL` | Tên bộ phim |
| `description` | `TEXT` | Cho phép `NULL` | Tóm tắt nội dung phim |
| `duration_min` | `INT` | Cho phép `NULL` | Thời lượng phim tính theo phút (vd: 120) |
| `poster_url` | `TEXT` | Cho phép `NULL` | Đường dẫn ảnh poster (có thể chuỗi rỗng) |
| `genre` | `VARCHAR(100)` | Cho phép `NULL` | Thể loại phim (Hành động, Hài, Tình cảm...) |

---

### 2.3. Bảng `theaters` (Phòng chiếu)
Quản lý các phòng chiếu trong rạp và quy mô sức chứa.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Khóa chính |
| `name` | `VARCHAR(100)` | `NOT NULL` | Tên phòng chiếu (vd: Phòng 1, Phòng 2) |
| `total_rows` | `INT` | `NOT NULL DEFAULT 8` | Số lượng hàng ghế (mặc định 8, tương ứng A-H) |
| `seats_per_row` | `INT` | `NOT NULL DEFAULT 10` | Số ghế mỗi hàng (mặc định 10, tương ứng 1-10) |

*Tổng số ghế một phòng tiêu chuẩn*: `8 * 10 = 80 ghế`.

---

### 2.4. Bảng `showtimes` (Lịch / Suất chiếu)
Xác định bộ phim nào được chiếu ở phòng chiếu nào, vào khung giờ nào và giá vé bao nhiêu.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Khóa chính |
| `movie_id` | `INT` | `REFERENCES movies(id) ON DELETE CASCADE` | Phim được chiếu (xóa phim sẽ xóa suất chiếu) |
| `theater_id` | `INT` | `REFERENCES theaters(id)` | Phòng chiếu tổ chức |
| `start_time` | `TIMESTAMP` | `NOT NULL` | Thời gian bắt đầu chiếu |
| `price` | `NUMERIC(10,2)` | `NOT NULL` | Đơn giá mỗi vé (vd: 90000.00) |

*Index hỗ trợ truy vấn nhanh*: `CREATE INDEX idx_showtimes_movie ON showtimes(movie_id);`.

---

### 2.5. Bảng `bookings` (Đơn đặt vé)
Lưu hóa đơn đặt vé của người dùng.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Mã đơn đặt vé |
| `user_id` | `INT` | `REFERENCES users(id)` | Khách hàng đặt vé |
| `showtime_id` | `INT` | `REFERENCES showtimes(id)` | Suất chiếu đã chọn |
| `total_price` | `NUMERIC(10,2)` | Cho phép `NULL` | Tổng tiền thanh toán của đơn |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Thời gian tạo đơn |

---

### 2.6. Bảng `booking_seats` (Chi tiết ghế đã đặt)
Rất quan trọng trong việc quản lý chỗ ngồi và chống đặt trùng ghế (race condition).

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Khóa chính |
| `booking_id` | `INT` | `REFERENCES bookings(id) ON DELETE CASCADE` | Liên kết đến đơn đặt vé |
| `showtime_id` | `INT` | `REFERENCES showtimes(id)` | Suất chiếu của ghế |
| `seat_label` | `VARCHAR(5)` | `NOT NULL` | Ký hiệu vị trí ghế (vd: `'A1'`, `'B5'`) |

> ⚠️ **Ràng buộc vàng chống trùng ghế**:  
> `UNIQUE (showtime_id, seat_label)`  
> Ràng buộc này đảm bảo ở tầng cơ sở dữ liệu: Trong cùng 1 suất chiếu, một vị trí ghế chỉ có thể được lưu trữ duy nhất 1 lần. Nếu 2 người đồng thời bấm đặt ghế `A5`, người đến sau sẽ bị PostgreSQL ném lỗi vi phạm ràng buộc Unique, ngăn chặn hoàn toàn hiện tượng bán trùng vé.

---

## 3. Khởi tạo dữ liệu mẫu (`scripts/init-db.js`)

Script thực thi tuần tự hai file SQL:
1. `db/schema.sql`: Xóa bảng cũ nếu tồn tại (`DROP TABLE IF EXISTS ... CASCADE`) và tạo mới 6 bảng cùng chỉ mục.
2. `db/seed.sql`: Chèn 3 bộ phim mẫu, 2 phòng chiếu và 4 suất chiếu vào các ngày tiếp theo (`NOW() + INTERVAL '1 day'`).

Cách chạy:
```bash
npm run db:init
```

---

## 4. Sao lưu và phục hồi (Backup & Restore)

- **Backup (`scripts/backup.sh`)**:
  ```bash
  pg_dump "$DATABASE_URL" --format=c -f "backups/backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
- **Restore (`scripts/restore.sh`)**:
  ```bash
  pg_restore --clean --no-owner -d "$DATABASE_URL" "$1"
  ```
