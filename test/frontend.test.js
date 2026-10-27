/**
 * ==========================================================
 * CINECLOUD - FRONTEND INTEGRATION & LOGIC TEST SUITE
 * Chạy với: node --test test/frontend.test.js
 * ==========================================================
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock browser globals (window, document, localStorage)
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();
global.window = {
  location: {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    origin: 'http://localhost:3000'
  },
  dispatchEvent: () => true,
  CustomEvent: class CustomEvent { constructor(name, opts) { this.name = name; this.opts = opts; } }
};

// Import modules
const API = require('../public/js/api.js');
const Auth = require('../public/js/auth.js');
const Seats = require('../public/js/seats.js');
const App = require('../public/js/app.js');

global.API = API;
global.Auth = Auth;
global.Seats = Seats;
global.App = App;

describe('CineCloud Frontend Architecture & Logic Tests', () => {

  beforeEach(() => {
    global.localStorage.clear();
    global.window.location = {
      protocol: 'http:',
      hostname: 'localhost',
      port: '3000',
      origin: 'http://localhost:3000'
    };
    API.state.isDemoMode = false;
    API.state.serverStatus = 'checking';
  });

  describe('1. Base URL Resolution (Universal Host Compatibility)', () => {
    it('should return relative "" when served by Express on port 3000', () => {
      global.window.location.port = '3000';
      assert.strictEqual(API.getBaseUrl(), '');
    });

    it('should return relative "" when Express runs on custom port 3001 (setup-and-run-guide)', () => {
      global.window.location.port = '3001';
      assert.strictEqual(API.getBaseUrl(), '');
    });

    it('should return relative "" when Express runs on custom port 5000 or 8080', () => {
      global.window.location.port = '5000';
      assert.strictEqual(API.getBaseUrl(), '');
    });

    it('should return relative "" on production custom domains (e.g. cinema.vn, onrender.com)', () => {
      global.window.location.port = '';
      global.window.location.hostname = 'cinema.myuniversity.edu.vn';
      assert.strictEqual(API.getBaseUrl(), '');
    });

    it('should fallback to http://localhost:3000 when opened via file:// protocol', () => {
      global.window.location.protocol = 'file:';
      global.window.location.port = '';
      assert.strictEqual(API.getBaseUrl(), 'http://localhost:3000');
    });

    it('should fallback to http://localhost:3000 when opened via VS Code Live Server (port 5500, 5501)', () => {
      global.window.location.protocol = 'http:';
      global.window.location.port = '5500';
      assert.strictEqual(API.getBaseUrl(), 'http://localhost:3000');
    });

    it('should prioritize custom_api_url from localStorage if set by user', () => {
      global.localStorage.setItem('custom_api_url', 'https://api.cinecloud.render.com/');
      assert.strictEqual(API.getBaseUrl(), 'https://api.cinecloud.render.com');
    });
  });

  describe('2. Health Check & Demo Mode Fallback', () => {
    it('should activate Demo Mode when force_demo_mode is enabled', async () => {
      global.localStorage.setItem('force_demo_mode', 'true');
      const health = await API.checkHealth();
      assert.strictEqual(health.isDemo, true);
      assert.strictEqual(API.state.isDemoMode, true);
      assert.strictEqual(API.state.serverStatus, 'demo');
    });

    it('should activate Demo Mode when /health returns DB error (500)', async () => {
      // Mock fetch returning 500 error
      global.fetch = async () => ({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: async () => ({ status: 'error', message: 'connection to server at "127.0.0.1", port 5432 failed' })
      });

      const health = await API.checkHealth();
      assert.strictEqual(health.isDemo, true);
      assert.strictEqual(API.state.isDemoMode, true);
      assert.strictEqual(API.state.serverStatus, 'demo');
    });

    it('should handle offline / network refused gracefully without crashing', async () => {
      global.fetch = async () => {
        throw new Error('fetch failed (ECONNREFUSED)');
      };

      const health = await API.checkHealth();
      assert.strictEqual(health.isDemo, true);
      assert.strictEqual(API.state.isDemoMode, true);
      assert.strictEqual(API.state.serverStatus, 'offline');
    });
  });

  describe('3. Movies & Showtimes Handling', () => {
    it('should return mock movies when in demo mode or unseeded', async () => {
      API.state.isDemoMode = true;
      const movies = await API.getMovies();
      assert.ok(Array.isArray(movies));
      assert.strictEqual(movies.length, 3);
      assert.ok(movies[0].title.includes('Vệ Binh'));
    });

    it('should always provide showtimes for any movie ID to prevent dead-ends', async () => {
      API.state.isDemoMode = true;
      // Movie 1 has predefined mock showtimes
      const st1 = await API.getShowtimes(1);
      assert.ok(st1.length >= 2);

      // Movie 99 has no predefined showtimes, must generate dynamic ones
      const st99 = await API.getShowtimes(99);
      assert.ok(st99.length >= 2);
      assert.strictEqual(st99[0].movie_id, 99);
      assert.ok(st99[0].price);
    });
  });

  describe('4. Theater Layout & Seating Configuration', () => {
    it('should default to 8 rows (A-H) and 10 seats for Phòng 1 / Standard theater', () => {
      const config = Seats.computeTheaterConfig({ theater: 'Phòng 1 (Standard)' });
      assert.strictEqual(config.rows.length, 8);
      assert.deepStrictEqual(config.rows, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
      assert.strictEqual(config.seatsPerRow, 10);
    });

    it('should adapt to 6 rows (A-F) and 8 seats for Phòng 2 (db/seed.sql)', () => {
      const config = Seats.computeTheaterConfig({ theater: 'Phòng 2 (VIP Dolby Atmos)' });
      assert.strictEqual(config.rows.length, 6);
      assert.deepStrictEqual(config.rows, ['A', 'B', 'C', 'D', 'E', 'F']);
      assert.strictEqual(config.seatsPerRow, 8);
    });

    it('should format VND currency accurately with symbol', () => {
      const formatted = Seats.formatCurrency(90000);
      assert.ok(formatted.includes('90.000') || formatted.includes('90,000'));
      assert.ok(formatted.includes('₫') || formatted.includes('VND'));
    });
  });

  describe('5. Authentication Compatibility & Simulated Session', () => {
    it('should simulate login successfully when backend returns 501 or offline', async () => {
      // Mock fetch returning 501
      global.fetch = async () => ({
        ok: false,
        status: 501,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Chưa làm' })
      });

      const res = await Auth.login('tester@vku.udn.vn', 'password123');
      assert.ok(res.token);
      assert.strictEqual(res.user.email, 'tester@vku.udn.vn');
      assert.strictEqual(Auth.isLoggedIn(), true);
      assert.strictEqual(global.localStorage.getItem('auth_token'), res.token);

      Auth.logout();
      assert.strictEqual(Auth.isLoggedIn(), false);
      assert.strictEqual(global.localStorage.getItem('auth_token'), null);
    });
  });

  describe('6. Booking Flow, State Persistence & Anti-Rebooking', () => {
    it('should simulate booking and persist to demo_bookings', async () => {
      const bookingPayload = {
        showtime_id: 1,
        seats: ['C4', 'C5'],
        total_price: 180000,
        movie_title: 'Vệ Binh Dải Ngân Hà',
        theater_name: 'Phòng 1'
      };

      const booking = API.simulateBookingSuccess(bookingPayload);
      assert.ok(booking.booking_code.startsWith('BK-'));
      assert.deepStrictEqual(booking.seats, ['C4', 'C5']);

      // Check localStorage demo_bookings
      const saved = JSON.parse(global.localStorage.getItem('demo_bookings') || '[]');
      assert.strictEqual(saved.length, 1);
      assert.strictEqual(saved[0].booking_code, booking.booking_code);

      // Booked seats should now be returned by getBookedSeats
      const booked = await API.getBookedSeats(1);
      assert.ok(booked.includes('C4'));
      assert.ok(booked.includes('C5'));
    });
  });

  describe('7. Security & XSS Sanitization', () => {
    it('should escape HTML tags and dangerous characters in App.escapeHtml', () => {
      const raw = '<script>alert("XSS")</script>&foo=\'bar\'';
      const escaped = App.escapeHtml(raw);
      assert.strictEqual(escaped.includes('<script>'), false);
      assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
      assert.strictEqual(escaped.includes('&quot;'), true);
      assert.strictEqual(escaped.includes('&#039;'), true);
    });
  });
});
