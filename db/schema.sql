DROP TABLE IF EXISTS booking_seats, bookings, showtimes, theaters, movies, users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_min INT,
  poster_url TEXT,
  genre VARCHAR(100)
);

CREATE TABLE theaters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  total_rows INT NOT NULL DEFAULT 8,
  seats_per_row INT NOT NULL DEFAULT 10
);

CREATE TABLE showtimes (
  id SERIAL PRIMARY KEY,
  movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
  theater_id INT REFERENCES theaters(id),
  start_time TIMESTAMP NOT NULL,
  price NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_showtimes_movie ON showtimes(movie_id);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  showtime_id INT REFERENCES showtimes(id),
  total_price NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  showtime_id INT REFERENCES showtimes(id),
  seat_label VARCHAR(5) NOT NULL,
  UNIQUE (showtime_id, seat_label)
);
