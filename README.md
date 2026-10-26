# Movie Booking - Đồ án Cloud Computing

Web đặt vé xem phim: Node.js (Express) + PostgreSQL, triển khai trên Render.

## Chạy ở máy local

```bash
git clone <URL-REPO>
cd movie-booking
npm install
cp .env.example .env        # sửa DATABASE_URL cho DB local của bạn
npm run db:init             # tạo bảng + dữ liệu mẫu
npm run dev                 # mở http://localhost:3000
```

Kiểm tra: http://localhost:3000/health và http://localhost:3000/api/movies

## Quy trình Git của nhóm

**Không push thẳng vào `main`** (Render tự deploy từ nhánh này).

```bash
git checkout main && git pull origin main
git checkout -b feature/ten-tinh-nang
# ... code ...
git add . && git commit -m "Mô tả ngắn việc đã làm"
git push -u origin feature/ten-tinh-nang
```

Rồi lên GitHub bấm **Compare & pull request**, nhờ 1 bạn review, **Merge**.
Sau đó: `git checkout main && git pull`.

Không bao giờ commit file `.env`.

## Nạp dữ liệu lên Render DB

```bash
# Mac/Linux
DATABASE_URL="<EXTERNAL_URL>" DB_SSL=true npm run db:init
# Windows PowerShell
$env:DATABASE_URL="<EXTERNAL_URL>"; $env:DB_SSL="true"; npm run db:init
```

## Deploy

Render Dashboard → New + → Blueprint → chọn repo này (dùng `render.yaml`).

## Tài liệu kỹ thuật & Hướng dẫn tích hợp

Xem toàn bộ kiến trúc Backend, đặc tả API, schema cơ sở dữ liệu và cẩm nang tích hợp trong thư mục [docs/](docs/README.md) (hoặc [doc/](doc/README.md)).

## Phân công

| Thành viên      | Vai trò                    |
| --------------- | -------------------------- |
| Trần Quốc Phước | Trưởng nhóm, deploy, CI/CD |
| Huỳnh Hoàng lâm | Database, backup/restore   |
| Hồ Minh Nhật    | Backend                    |
| Nguyễn Đình Minh | Frontend, load test        |
