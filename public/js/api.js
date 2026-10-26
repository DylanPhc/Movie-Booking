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
    isDemoMode: false,
    lastPing: 0
  };

  /**
   * Tự động xác định Base URL thông minh:
   * 1. Nếu người dùng cấu hình URL tùy chỉnh trong localStorage -> dùng nó.
   * 2. Nếu Frontend được Express serve chung (port 3000 hoặc host Render) -> dùng relative ''.
   * 3. Nếu Frontend mở độc lập (như Live Server 5500) -> tự trỏ về 'http://localhost:3000'.
   */
  function getBaseUrl() {
    const custom = localStorage.getItem('custom_api_url');
    if (custom) return custom.trim().replace(/\/$/, '');

    const port = window.location.port;
    const hostname = window.location.hostname;
    const isExpressHost = port === '3000' || hostname.includes('onrender.com');

    return isExpressHost ? '' : 'http://localhost:3000';
  }

  /**
   * Tạo header chuẩn cho các request, tự động đính kèm JWT Bearer Token
   */
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        const err = new Error(data.error || data.message || `Lỗi máy chủ (${response.status})`);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      // Bắt lỗi không kết nối được (Network error)
      if (!error.status && error.message.includes('fetch')) {
        const netErr = new Error(`Không thể kết nối đến máy chủ tại ${baseUrl || window.location.origin}`);
        netErr.status = 0;
        throw netErr;
      }
      throw error;
    }
  }

  /**
   * Kiểm tra sức khỏe máy chủ (/health)
   */
  async function checkHealth() {
    try {
      const start = Date.now();
      const res = await request('/health');
      state.lastPing = Date.now() - start;
      state.serverStatus = res.status === 'ok' ? 'online' : 'demo';
      state.dbTime = res.dbTime || null;
      return { ok: true, data: res, ping: state.lastPing };
    } catch (e) {
      state.serverStatus = 'offline';
      return { ok: false, error: e.message };
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
      // Nếu DB chưa seed, tự fallback dữ liệu mẫu
      console.warn('Database chưa có phim, đang hiển thị phim mẫu...');
      return MOCK_MOVIES;
    } catch (e) {
      console.warn('Không gọi được API movies, dùng dữ liệu mẫu:', e.message);
      return MOCK_MOVIES;
    }
  }

  /**
   * Lấy chi tiết 1 phim (GET /api/movies/:id)
   */
  async function getMovieById(id) {
    if (state.isDemoMode) {
      return MOCK_MOVIES.find(m => m.id === Number(id)) || MOCK_MOVIES[0];
    }
    try {
      return await request(`/api/movies/${id}`);
    } catch (e) {
      return MOCK_MOVIES.find(m => m.id === Number(id)) || MOCK_MOVIES[0];
    }
  }

  /**
   * Lấy các suất chiếu của phim (GET /api/movies/:id/showtimes)
   */
  async function getShowtimes(movieId) {
    if (state.isDemoMode) {
      return MOCK_SHOWTIMES.filter(s => s.movie_id === Number(movieId));
    }
    try {
      const list = await request(`/api/movies/${movieId}/showtimes`);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
      // Nếu DB chưa có suất chiếu trong tương lai, fallback suất chiếu mẫu
      return MOCK_SHOWTIMES.filter(s => s.movie_id === Number(movieId));
    } catch (e) {
      return MOCK_SHOWTIMES.filter(s => s.movie_id === Number(movieId));
    }
  }

  /**
   * Đăng ký tài khoản (POST /api/auth/register)
   */
  async function register(userData) {
    try {
      return await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (e) {
      if (e.status === 501) {
        // Backend đang là stub "Chưa làm" -> Tạo phiên Demo cục bộ
        return simulateAuthSuccess(userData);
      }
      throw e;
    }
  }

  /**
   * Đăng nhập (POST /api/auth/login)
   */
  async function login(credentials) {
    try {
      return await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    } catch (e) {
      if (e.status === 501) {
        // Backend đang là stub "Chưa làm" -> Tạo phiên Demo cục bộ
        return simulateAuthSuccess({
          email: credentials.email,
          full_name: credentials.email.split('@')[0]
        });
      }
      throw e;
    }
  }

  /**
   * Đặt vé xem phim (POST /api/bookings)
   */
  async function createBooking(bookingData) {
    try {
      return await request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
    } catch (e) {
      if (e.status === 501) {
        // Backend chưa hoàn thành endpoint đặt vé -> Giả lập hoàn tất đơn hàng
        return simulateBookingSuccess(bookingData);
      }
      throw e;
    }
  }

  /**
   * Lấy lịch sử vé của tôi (GET /api/bookings/me)
   */
  async function getMyBookings() {
    try {
      return await request('/api/bookings/me');
    } catch (e) {
      if (e.status === 501 || e.status === 0) {
        // Lấy danh sách vé đã lưu trong phiên demo
        const localBookings = JSON.parse(localStorage.getItem('demo_bookings') || '[]');
        return localBookings;
      }
      throw e;
    }
  }

  // --- HÀM GIẢ LẬP KHI BACKEND TRẢ 501 (CHƯA XONG) ---
  function simulateAuthSuccess(user) {
    const simulatedToken = 'mock_jwt_' + Math.random().toString(36).substring(2);
    const simulatedUser = {
      id: Math.floor(Math.random() * 1000) + 1,
      email: user.email,
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
      theater_name: data.theater_name || 'Phòng chiếu 1',
      start_time: data.start_time || new Date().toISOString(),
      created_at: new Date().toISOString(),
      isSimulated: true
    };

    // Lưu vào localStorage để người dùng xem lại ở "Vé của tôi"
    const current = JSON.parse(localStorage.getItem('demo_bookings') || '[]');
    current.unshift(booking);
    localStorage.setItem('demo_bookings', JSON.stringify(current));

    return booking;
  }

  return {
    state,
    getBaseUrl,
    checkHealth,
    getMovies,
    getMovieById,
    getShowtimes,
    register,
    login,
    createBooking,
    getMyBookings
  };
})();
