/**
 * ==========================================================
 * CINECLOUD - API CLIENT (public/js/api.js)
 * Tương thích linh hoạt giữa Backend Node.js và Frontend
 * ==========================================================
 */

const API = (() => {
  // Demo mock data phòng khi database chưa được nạp (Zero-setup fallback)
  const MOCK_MOVIES = [
    {
      id: 1,
      title: 'Phim Mẫu 1: Vệ Binh Dải Ngân Hà',
      description: 'Hành trình bảo vệ vũ trụ đầy kịch tính và hài hước của nhóm chiến binh bất đắc dĩ.',
      duration_min: 120,
      poster_url: '',
      genre: 'Hành động'
    },
    {
      id: 2,
      title: 'Phim Mẫu 2: Tiệm Cà Phê Hoàng Tử',
      description: 'Câu chuyện tình yêu và những tình huống dở khóc dở cười chốn đô thị hiện đại.',
      duration_min: 105,
      poster_url: '',
      genre: 'Hài'
    },
    {
      id: 3,
      title: 'Phim Mẫu 3: Mùa Hè Rực Rỡ',
      description: 'Bản tình ca thanh xuân đằm thắm về những ký ức không thể nào quên.',
      duration_min: 135,
      poster_url: '',
      genre: 'Tình cảm'
    }
  ];

  const MOCK_SHOWTIMES = [
    { id: 1, movie_id: 1, theater: 'Phòng 1 (Standard)', start_time: new Date(Date.now() + 86400000).toISOString(), price: '90000.00' },
    { id: 2, movie_id: 1, theater: 'Phòng 2 (VIP Dolby Atmos)', start_time: new Date(Date.now() + 172800000).toISOString(), price: '90000.00' },
    { id: 3, movie_id: 2, theater: 'Phòng 1 (Standard)', start_time: new Date(Date.now() + 97200000).toISOString(), price: '80000.00' },
    { id: 4, movie_id: 3, theater: 'Phòng 2 (VIP Dolby Atmos)', start_time: new Date(Date.now() + 180000000).toISOString(), price: '85000.00' }
  ];

  // Trạng thái hệ thống
  const state = {
    serverStatus: 'checking', // 'online' | 'demo' | 'offline'
    dbTime: null,
    isDemoMode: typeof localStorage !== 'undefined' && localStorage.getItem('force_demo_mode') === 'true',
    lastPing: 0
  };

  /**
   * Tự động xác định Base URL thông minh:
   * 1. Nếu người dùng cấu hình URL tùy chỉnh trong localStorage -> dùng nó.
   * 2. Nếu Frontend mở qua file:// hoặc các cổng standalone dev server (5500, 5173...) -> trỏ về http://localhost:3000.
   * 3. Nếu Frontend được Express serve (port 3000, 3001, 5000, Render, hay bất kỳ domain nào) -> dùng relative '' để luôn luôn tương thích.
   */
  function getBaseUrl() {
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem('custom_api_url');
      if (custom) return custom.trim().replace(/\/$/, '');
    }

    if (typeof window === 'undefined') {
      return 'http://localhost:3000';
    }

    // Khi chạy mở trực tiếp file HTML qua file:///
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }

    const port = String(window.location.port || '');
    // Danh sách cổng phổ biến của standalone frontend dev server (VS Code Live Server, Vite, WebStorm, http-server)
    const standaloneDevPorts = ['5500', '5501', '5502', '5173', '63342', '8080'];
    if (standaloneDevPorts.includes(port)) {
      return 'http://localhost:3000';
    }

    // Mặc định: Phục vụ qua Express trên cùng host/port hoặc domain bất kỳ -> dùng relative URL
    return '';
  }

  /**
   * Tạo header chuẩn cho các request, tự động đính kèm JWT Bearer Token
   */
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Gửi request HTTP an toàn với timeout và xử lý lỗi chuẩn
   */
  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const config = {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        // Xử lý mã lỗi 501 (Chưa triển khai ở Backend)
        if (response.status === 501) {
          const err = new Error(data.error || 'Tính năng đang được Backend phát triển');
          err.status = 501;
          err.isStub = true;
          throw err;
        }

        // Xử lý mã lỗi 401 (Hết hạn hoặc sai token)
        if (response.status === 401 && typeof localStorage !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        }

        const err = new Error(data.error || data.message || `Lỗi máy chủ (${response.status})`);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      // Bắt lỗi không kết nối được (Network error trên mọi trình duyệt)
      if (!error.status) {
        const targetHost = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        const netErr = new Error(`Không thể kết nối đến máy chủ tại ${targetHost}`);
        netErr.status = 0;
        netErr.originalError = error;
        throw netErr;
      }
      throw error;
    }
  }

  /**
   * Kiểm tra sức khỏe máy chủ (/health)
   */
  async function checkHealth() {
    // Nếu người dùng chủ động chọn chế độ Demo độc lập
    if (typeof localStorage !== 'undefined' && localStorage.getItem('force_demo_mode') === 'true') {
      state.isDemoMode = true;
      state.serverStatus = 'demo';
      return { ok: false, isDemo: true, ping: 0, error: 'Chế độ Demo Offline (Không dùng Backend)' };
    }

    try {
      const start = Date.now();
      const res = await request('/health');
      state.lastPing = Date.now() - start;

      if (res.status === 'ok') {
        state.serverStatus = 'online';
        state.isDemoMode = false;
        state.dbTime = res.dbTime || null;
        return { ok: true, data: res, ping: state.lastPing };
      } else {
        // Backend sống nhưng PostgreSQL chưa kết nối thành công
        state.serverStatus = 'demo';
        state.isDemoMode = true;
        state.dbTime = null;
        return { ok: false, isDemo: true, data: res, ping: state.lastPing, error: res.message || 'Chưa nối database' };
      }
    } catch (e) {
      // Backend trả 500 (DB lỗi) hoặc 0 (server chưa khởi chạy)
      state.serverStatus = e.status === 500 ? 'demo' : 'offline';
      state.isDemoMode = true;
      return { ok: false, isDemo: true, error: e.message, status: e.status };
    }
  }

  /**
   * Lấy danh sách phim (GET /api/movies)
   */
  async function getMovies() {
    if (state.isDemoMode) {
      return MOCK_MOVIES;
    }
    try {
      const movies = await request('/api/movies');
      if (Array.isArray(movies) && movies.length > 0) {
        return movies;
      }
      // Nếu DB chưa có dữ liệu phim, tự động dùng phim mẫu
      return MOCK_MOVIES;
    } catch (e) {
      console.warn('Không gọi được API movies, chuyển sang dữ liệu mẫu:', e.message);
      return MOCK_MOVIES;
    }
  }

  /**
   * Lấy chi tiết 1 phim (GET /api/movies/:id)
   */
  async function getMovieById(id) {
    const numId = Number(id);
    if (state.isDemoMode) {
      return MOCK_MOVIES.find(m => m.id === numId) || MOCK_MOVIES[0];
    }
    try {
      return await request(`/api/movies/${numId}`);
    } catch (e) {
      return MOCK_MOVIES.find(m => m.id === numId) || MOCK_MOVIES[0];
    }
  }

  /**
   * Lấy các suất chiếu của phim (GET /api/movies/:id/showtimes)
   */
  async function getShowtimes(movieId) {
    const mid = Number(movieId);
    if (!state.isDemoMode) {
      try {
        const list = await request(`/api/movies/${mid}/showtimes`);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch (e) {
        // Fallback sang suất chiếu mẫu
      }
    }

    // Suất chiếu mẫu
    let showtimes = MOCK_SHOWTIMES.filter(s => s.movie_id === mid);
    if (showtimes.length === 0) {
      // Tự động sinh suất chiếu mẫu cho bất kỳ ID phim nào để không bao giờ bị cụt luồng
      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(19, 30, 0, 0);
      const dayAfter = new Date(Date.now() + 172800000);
      dayAfter.setHours(20, 15, 0, 0);

      showtimes = [
        { id: mid * 10 + 1, movie_id: mid, theater: 'Phòng 1 (Standard)', start_time: tomorrow.toISOString(), price: '90000.00' },
        { id: mid * 10 + 2, movie_id: mid, theater: 'Phòng 2 (VIP Dolby Atmos)', start_time: dayAfter.toISOString(), price: '95000.00' }
      ];
    }
    return showtimes;
  }

  /**
   * Lấy danh sách ghế đã được đặt cho 1 suất chiếu (GET /api/showtimes/:id/booked-seats)
   */
  async function getBookedSeats(showtimeId) {
    const stId = Number(showtimeId);
    let booked = [];

    // 1. Thử gọi API thật nếu không ở chế độ demo
    if (!state.isDemoMode) {
      try {
        const res = await request(`/api/showtimes/${stId}/booked-seats`);
        if (res && Array.isArray(res.booked_seats)) {
          booked = res.booked_seats;
        } else if (Array.isArray(res)) {
          booked = res;
        }
      } catch (e) {
        // Backend chưa có endpoint này hoặc offline -> fallback
      }
    }

    // 2. Kết hợp với các vé đã lưu trong phiên demo cục bộ
    if (typeof localStorage !== 'undefined') {
      try {
        const demoBookings = JSON.parse(localStorage.getItem('demo_bookings') || '[]');
        demoBookings
          .filter(b => Number(b.showtime_id) === stId)
          .forEach(b => {
            if (Array.isArray(b.seats)) {
              b.seats.forEach(s => { if (!booked.includes(s)) booked.push(s); });
            }
          });
      } catch (e) {
        // Bỏ qua lỗi parse
      }
    }

    return booked;
  }

  /**
   * Đăng ký tài khoản (POST /api/auth/register)
   */
  async function register(userData) {
    if (state.isDemoMode) {
      return simulateAuthSuccess(userData);
    }
    try {
      return await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (e) {
      if (e.status === 501 || e.status === 0 || state.isDemoMode) {
        return simulateAuthSuccess(userData);
      }
      throw e;
    }
  }

  /**
   * Đăng nhập (POST /api/auth/login)
   */
  async function login(credentials) {
    if (state.isDemoMode) {
      return simulateAuthSuccess({
        email: credentials.email,
        full_name: (credentials.email || 'user').split('@')[0]
      });
    }
    try {
      return await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    } catch (e) {
      if (e.status === 501 || e.status === 0 || state.isDemoMode) {
        return simulateAuthSuccess({
          email: credentials.email,
          full_name: (credentials.email || 'user').split('@')[0]
        });
      }
      throw e;
    }
  }

  /**
   * Đặt vé xem phim (POST /api/bookings)
   */
  async function createBooking(bookingData) {
    if (state.isDemoMode) {
      return simulateBookingSuccess(bookingData);
    }
    try {
      return await request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
    } catch (e) {
      if (e.status === 501 || e.status === 0 || state.isDemoMode) {
        return simulateBookingSuccess(bookingData);
      }
      throw e;
    }
  }

  /**
   * Lấy lịch sử vé của tôi (GET /api/bookings/me)
   */
  async function getMyBookings() {
    if (!state.isDemoMode) {
      try {
        const bookings = await request('/api/bookings/me');
        if (Array.isArray(bookings)) {
          return bookings;
        }
      } catch (e) {
        if (e.status !== 501 && e.status !== 0) {
          throw e;
        }
      }
    }

    // Lấy danh sách vé đã lưu trong phiên demo
    if (typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem('demo_bookings') || '[]');
    }
    return [];
  }

  // --- HÀM GIẢ LẬP KHI BACKEND TRẢ 501 HOẶC OFFLINE ---
  function simulateAuthSuccess(user) {
    const simulatedToken = 'mock_jwt_' + Math.random().toString(36).substring(2);
    const simulatedUser = {
      id: Math.floor(Math.random() * 1000) + 1,
      email: user.email || 'user@cinecloud.vn',
      full_name: user.full_name || 'Khách xem phim',
      role: 'user'
    };
    return { token: simulatedToken, user: simulatedUser, isSimulated: true };
  }

  function simulateBookingSuccess(data) {
    const bookingCode = 'BK-' + Math.floor(100000 + Math.random() * 900000);
    const booking = {
      id: Math.floor(Math.random() * 500) + 1,
      booking_code: bookingCode,
      showtime_id: data.showtime_id,
      seats: data.seats,
      total_price: data.total_price || (data.seats.length * 90000),
      movie_title: data.movie_title || 'Phim đã chọn',
      theater_name: data.theater_name || 'Phòng 1',
      start_time: data.start_time || new Date().toISOString(),
      created_at: new Date().toISOString(),
      isSimulated: true
    };

    if (typeof localStorage !== 'undefined') {
      const current = JSON.parse(localStorage.getItem('demo_bookings') || '[]');
      current.unshift(booking);
      localStorage.setItem('demo_bookings', JSON.stringify(current));
    }

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('booking:created', { detail: booking }));
    }

    return booking;
  }

  return {
    state,
    getBaseUrl,
    getHeaders,
    request,
    checkHealth,
    getMovies,
    getMovieById,
    getShowtimes,
    getBookedSeats,
    register,
    login,
    createBooking,
    getMyBookings,
    simulateAuthSuccess,
    simulateBookingSuccess
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
