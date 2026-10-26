INSERT INTO movies (title, description, duration_min, genre, poster_url) VALUES
 ('Phim Mẫu 1', 'Mô tả phim mẫu 1', 120, 'Hành động', ''),
 ('Phim Mẫu 2', 'Mô tả phim mẫu 2', 105, 'Hài', ''),
 ('Phim Mẫu 3', 'Mô tả phim mẫu 3', 135, 'Tình cảm', '');

INSERT INTO theaters (name, total_rows, seats_per_row) VALUES
 ('Phòng 1', 8, 10),
 ('Phòng 2', 6, 8);

INSERT INTO showtimes (movie_id, theater_id, start_time, price) VALUES
 (1, 1, NOW() + INTERVAL '1 day',  90000),
 (1, 2, NOW() + INTERVAL '2 days', 90000),
 (2, 1, NOW() + INTERVAL '1 day 3 hours', 80000),
 (3, 2, NOW() + INTERVAL '2 days 2 hours', 85000);
