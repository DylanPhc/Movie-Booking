# Thư Mục Tài Liệu Hệ Thống Movie Booking (Documentation)

Chào mừng bạn đến với thư mục tài liệu kỹ thuật của dự án **Movie Booking - Đồ án Cloud Computing**.

Toàn bộ tài liệu chi tiết, đặc tả kiến trúc, API contract, hướng dẫn tích hợp và hướng dẫn cài đặt sau khi `git clone` được tổ chức đầy đủ tại:

👉 **[Xem toàn bộ tài liệu trong thư mục `docs/`](../docs/README.md)**

### Danh mục tài liệu chi tiết:
1. **[Kiến trúc vận hành Backend](../docs/backend-architecture.md)**: Chi tiết vòng đời request, Express server, PostgreSQL connection pool, Render deployment.
2. **[Đặc tả API (API Specification)](../docs/api-specification.md)**: Toàn bộ danh sách endpoint, request/response body, mã trạng thái HTTP, định dạng lỗi.
3. **[Cấu trúc Cơ sở dữ liệu (Database Schema)](../docs/database-schema.md)**: 6 bảng dữ liệu, ràng buộc khóa ngoại, ràng buộc chống trùng vé `UNIQUE (showtime_id, seat_label)`, kịch bản backup/restore.
4. **[Hướng dẫn tích hợp Frontend - Backend](../docs/frontend-backend-integration.md)**: Nguyên tắc tương thích, CORS, JWT Bearer Token, xử lý kiểu dữ liệu, cơ chế xử lý 501 stub.
5. **[Hướng dẫn cài đặt từ Git Clone](../docs/setup-and-run-guide.md)**: Các bước cài đặt từ A-Z, cấu hình `.env`, `npm run db:init`, chạy máy chủ và xử lý lỗi.
