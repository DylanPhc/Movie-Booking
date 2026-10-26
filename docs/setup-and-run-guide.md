# Hướng Dẫn Cài Đặt & Chạy Dự Án Sau Khi Git Clone

Tài liệu này hướng dẫn chi tiết từng bước cho bất kỳ thành viên nào hoặc người chấm đồ án khi vừa thực hiện `git clone` repository về máy.

---

## 1. Yêu cầu môi trường

- **Node.js**: Phiên bản `>= 18.0.0` (Khuyên dùng Node 20 LTS). Kiểm tra bằng lệnh:
  ```bash
  node -v
  npm -v
  ```
- **PostgreSQL**: Phiên bản `>= 14` (có thể dùng PostgreSQL cài trên máy, hoặc dịch vụ PostgreSQL miễn phí trên Render / Supabase / Neon).
- **Git**: Đã cài đặt trên máy.

---

## 2. Các bước cài đặt chi tiết

### Bước 1: Clone mã nguồn và chuyển sang nhánh Frontend
```bash
git clone https://github.com/DylanPhc/Movie-Booking.git
cd Movie-Booking
git checkout feature/Frontend
```

### Bước 2: Cài đặt thư viện dependencies
```bash
npm install
```
Lệnh này sẽ tải các gói: `express`, `pg`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv` và devDependency `nodemon`.

---

### Bước 3: Cấu hình biến môi trường `.env`

Tạo file `.env` tại thư mục gốc của dự án (ngang hàng với `package.json`):

**Cách 1: Sao chép từ mẫu**:
```bash
# Trên Linux/macOS
cp .env.example .env

# Trên Windows PowerShell
Copy-Item .env.example .env
```

**Cách 2: Nội dung chuẩn của file `.env`**:
```ini
# Cấu hình chuỗi kết nối Database local
DATABASE_URL=postgres://postgres:matkhau_cua_ban@localhost:5432/movie_booking

# Khóa bí mật dùng để mã hóa JSON Web Token
JWT_SECRET=bi_mat_khong_tiet_lo_2026

# Cổng khởi chạy máy chủ Express
PORT=3000
```
*(Thay `postgres` và `matkhau_cua_ban` bằng tài khoản PostgreSQL trên máy của bạn).*

> **Lưu ý**: Nếu bạn sử dụng cơ sở dữ liệu Render PostgreSQL:
> ```ini
> DATABASE_URL=postgres://user:password@dpg-xxxxx.singapore-postgres.render.com/movie_booking
> DB_SSL=true
> ```

---

### Bước 4: Tạo cơ sở dữ liệu và nạp dữ liệu mẫu

1. Mở công cụ quản lý PostgreSQL (như pgAdmin, DBeaver hoặc SQL shell) và tạo database:
   ```sql
   CREATE DATABASE movie_booking;
   ```
2. Chạy lệnh tự động tạo bảng và nạp dữ liệu mẫu:
   ```bash
   npm run db:init
   ```
   Nếu màn hình hiển thị:
   ```
   Đã chạy schema.sql
   Đã chạy seed.sql
   ```
   tức là cơ sở dữ liệu đã sẵn sàng với 3 bộ phim mẫu và các suất chiếu.

---

### Bước 5: Khởi động máy chủ

**Chế độ phát triển (Tự động tải lại khi đổi code)**:
```bash
npm run dev
```

**Hoặc chế độ tiêu chuẩn**:
```bash
npm start
```

Màn hình console sẽ xuất hiện:
```
Server chạy cổng 3000
```

---

### Bước 6: Trải nghiệm ứng dụng trên Trình duyệt

Mở trình duyệt web và truy cập:
- **Giao diện người dùng Web**: [http://localhost:3000](http://localhost:3000)
- **Kiểm tra trạng thái kết nối DB**: [http://localhost:3000/health](http://localhost:3000/health)
- **Kiểm tra dữ liệu phim qua API**: [http://localhost:3000/api/movies](http://localhost:3000/api/movies)

---

## 3. Khắc phục sự cố thường gặp (Troubleshooting)

### Lỗi 1: `connect ECONNREFUSED 127.0.0.1:5432`
- **Nguyên nhân**: Dịch vụ PostgreSQL trên máy chưa được bật hoặc chưa cài đặt.
- **Xử lý**: 
  - Mở `Services.msc` trên Windows, tìm `postgresql` và bấm **Start**.
  - Hoặc nếu chưa muốn cài PostgreSQL local ngay, Frontend đã tích hợp sẵn chế độ **Demo Simulation** hiển thị thông báo hướng dẫn và cho phép trải nghiệm giao diện mượt mà!

### Lỗi 2: `password authentication failed for user "postgres"`
- **Nguyên nhân**: Sai mật khẩu trong chuỗi `DATABASE_URL` tại file `.env`.
- **Xử lý**: Kiểm tra lại mật khẩu lúc bạn cài PostgreSQL và cập nhật lại vào `.env`.

### Lỗi 3: `EADDRINUSE: address already in use :::3000`
- **Nguyên nhân**: Port 3000 đang bị ứng dụng khác chiếm giữ.
- **Xử lý**: Đổi biến `PORT=3001` trong `.env` và chạy lại.

### Lỗi 4: `npm run db:init` báo lỗi SSL khi kết nối Render DB
- **Xử lý**: Thêm biến môi trường `DB_SSL=true`:
  - PowerShell: `$env:DB_SSL="true"; npm run db:init`
  - Bash: `DB_SSL=true npm run db:init`
