# Hướng Dẫn Tương Thích & Tích Hợp Frontend - Backend

Tài liệu này giải quyết trọng tâm câu hỏi: **Làm sao để Frontend và Backend kết nối mượt mà, không gặp bất kỳ trở ngại nào về mặt tương thích trong quá trình phát triển độc lập lẫn khi tích hợp?**

---

## 1. Cơ chế kết nối URL động (Base URL Autodetection)

Frontend cần hoạt động tốt trong cả 2 tình huống:
1. **Chế độ Tích hợp (Production / Local Node.js)**:
   - Express phục vụ trực tiếp file tĩnh qua `app.use(express.static('public'))`.
   - Cả Frontend và Backend đều chạy chung cổng (ví dụ: `http://localhost:3000`).
   - Gọi API bằng đường dẫn tương đối (Relative path): `/api/movies`, `/api/bookings`.
2. **Chế độ Phát triển Độc lập (Standalone Live Server / Vite / Dev Server)**:
   - Frontend chạy ở port khác (ví dụ: `http://127.0.0.1:5500` từ VS Code Live Server).
   - Backend chạy ở `http://localhost:3000`.
   - Nếu gọi `/api/movies` tương đối sẽ bị 404 trên port 5500.

### Giải pháp xử lý trong `public/js/api.js`:
```javascript
function getBaseUrl() {
  const custom = localStorage.getItem('custom_api_url');
  if (custom) return custom.trim().replace(/\/$/, '');

  if (window.location.protocol === 'file:') return 'http://localhost:3000';

  // Standalone frontend dev servers (Live Server 5500, Vite 5173...)
  const standaloneDevPorts = ['5500', '5501', '5502', '5173', '63342', '8080'];
  if (standaloneDevPorts.includes(window.location.port)) return 'http://localhost:3000';

  // Express host (mọi cổng 3000, 3001, 5000, Render, custom domain...) -> relative URL
  return '';
}
```
Frontend còn cung cấp **Backend Diagnostic Modal** cho phép người dùng đổi URL API hoặc bật ngay **Chế độ Demo Offline** mà không cần sửa code.

---

## 2. Quản lý Xác thực & Token JWT (Authentication Compatibility)

### Quy trình:
1. Khi người dùng đăng nhập (`POST /api/auth/login`) hoặc đăng ký (`POST /api/auth/register`), Backend trả về `{ token, user }`.
2. Frontend lưu vào `localStorage`:
   ```javascript
   localStorage.setItem('auth_token', data.token);
   localStorage.setItem('auth_user', JSON.stringify(data.user));
   ```
3. Mọi request cần quyền (như đặt vé, xem vé) đều đính kèm Header:
   ```javascript
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
   }
   ```
4. **Xử lý khi Token hết hạn (Mã 401)**:
   - Nếu Backend trả về status `401 Unauthorized`, `api.js` tự động xóa token hỏng và điều hướng người dùng mở modal đăng nhập lại.

---

## 3. Tương thích Kiểu Dữ Liệu giữa PostgreSQL và JavaScript

| Dữ liệu Backend (PostgreSQL) | Kiểu trả về từ Driver `pg` | Rủi ro nếu không xử lý | Cách Frontend xử lý an toàn |
| :--- | :--- | :--- | :--- |
| `price NUMERIC(10,2)` | Chuỗi String (ví dụ: `"90000.00"`) | Cộng chuỗi `"90000.00" + "90000.00" = "90000.0090000.00"` | Luôn ép kiểu: `Number(price)` trước khi nhân số lượng hoặc cộng tổng |
| `start_time TIMESTAMP` | Chuỗi ISO 8601 (ví dụ: `"2026-10-27T10:00:00.000Z"`) | Sai lệch múi giờ UTC vs Giờ Việt Nam (GMT+7) | Dùng `new Date(start_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })` |
| `poster_url TEXT` | Chuỗi rỗng `""` trong dữ liệu mẫu `seed.sql` | Thẻ `<img>` bị vỡ icon (broken image) | Hiển thị poster mặc định hoặc SVG minh họa theo thể loại phim |
| `theaters.total_rows` & `seats_per_row` | Số nguyên (8 x 10) | Không chọn được ghế nếu Backend query chưa join bảng `theaters` | Mặc định 8 hàng (A-H), mỗi hàng 10 ghế (1-10) khi backend trả `theater: "Phòng 1"` |

---

## 4. Xử lý Trạng thái Đang Phát triển của Backend (Mã 501 Stub)

Hiện tại trong nhánh `main` và `feature/Backend`, các route sau đang là stub:
```javascript
// src/routes/auth.js
router.post('/register', (req, res) => res.status(501).json({ error: 'Chưa làm' }));
router.post('/login', (req, res) => res.status(501).json({ error: 'Chưa làm' }));

// src/routes/bookings.js
router.post('/', (req, res) => res.status(501).json({ error: 'Chưa làm' }));
router.get('/me', (req, res) => res.status(501).json({ error: 'Chưa làm' }));
```

### Chiến lược xử lý tương thích của Frontend:
1. **Luôn ưu tiên gọi API thật**: Frontend gửi request chuẩn xác đến `/api/auth/*` và `/api/bookings/*`.
2. **Bắt mã trạng thái 501 một cách êm ái**:
   - Khi nhận mã 501 từ Backend, Frontend KHÔNG bị văng lỗi (crash).
   - Frontend hiển thị thông báo rõ ràng cho người dùng:  
     *"Tính năng này từ Backend đang được bạn phụ trách Backend phát triển (Kế hoạch tuần 2 & 3). Frontend đã chuyển sang chế độ Mô Phỏng Demo để bạn có thể kiểm thử toàn bộ luồng giao diện."*
   - Cung cấp dữ liệu phiên giả lập lưu tạm trong `sessionStorage` để người kiểm thử có thể:
     - Thử đăng ký / đăng nhập
     - Chọn ghế, bấm xác nhận đặt vé, nhận mã vé QR
     - Xem lại vé trong danh sách "Vé của tôi"
3. **Khi Backend hoàn thành**:
   - Chỉ cần Backend trả về mã `200` / `201`, Frontend sẽ lập tức kết nối và lưu trực tiếp vào PostgreSQL mà không cần sửa đổi bất kỳ dòng code Frontend nào!

---

## 5. Quy tắc Git để không xung đột (Conflict-Free Workflow)

1. Nhánh `feature/Frontend`:
   - **Chỉ sửa đổi và thêm mới**: Các file trong `public/` (`index.html`, `css/`, `js/`), thư mục tài liệu `docs/` và `doc/`.
   - **Tuyệt đối không sửa**: `src/routes/auth.js` hay `src/routes/bookings.js` trên nhánh này (để tránh xung đột với bạn Hồ Minh Nhật làm Backend).
2. Khi Backend code xong và đẩy lên `feature/Backend`, trưởng nhóm có thể merge tuần tự vào `main` hoặc rebase mà không bị conflict bất kỳ file nào.

---

## 6. Hướng dẫn Load Test cho thành viên Frontend

Vai trò trong README: **Nguyễn Đình Minh: Frontend, load test**.
- Sau khi giao diện hoàn tất, có thể sử dụng các công cụ:
  - **Artillery** hoặc **Autocannon** để test chịu tải các API `GET /health`, `GET /api/movies`, `GET /api/movies/1/showtimes`.
  - **Lighthouse (Chrome DevTools)** để chấm điểm hiệu năng Frontend: Performance, Accessibility, Best Practices, SEO.
  - Tối ưu kích thước assets: CSS tối giản, JS thuần không thư viện nặng, nén hình ảnh.
