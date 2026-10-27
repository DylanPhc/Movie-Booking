/**
 * ==========================================================
 * CINECLOUD - MAIN APPLICATION CONTROLLER (public/js/app.js)
 * Điều phối luồng giao diện, Modal, Bộ lọc & Tương tác
 * ==========================================================
 */

const App = (() => {
  let allMovies = [];
  let filteredMovies = [];
  let selectedMovie = null;
  let selectedShowtime = null;
  let activeGenre = 'all';

  /**
   * Khởi chạy ứng dụng khi DOM tải xong
   */
  async function init() {
    // 1. Khởi tạo xác thực
    if (typeof Auth !== 'undefined' && Auth.init) {
      Auth.init();
    }

    // 2. Kiểm tra kết nối Backend
    await checkServerConnection();

    // 3. Tải danh sách phim
    await loadMovies();

    // 4. Thiết lập sự kiện lắng nghe
    setupEventListeners();
  }

  /**
   * Kiểm tra trạng thái máy chủ Backend
   */
  async function checkServerConnection() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;

    const health = await API.checkHealth();

    if (health.ok) {
      dot.className = 'status-dot online';
      text.textContent = `Backend Online (${health.ping}ms)`;
    } else if (health.isDemo) {
      dot.className = 'status-dot demo';
      text.textContent = 'Chế độ Demo (Chưa nối DB)';
    } else {
      dot.className = 'status-dot demo';
      text.textContent = 'Máy chủ Offline (Chế độ Demo)';
    }
  }

  /**
   * Tải danh sách phim từ Backend
   */
  async function loadMovies() {
    const grid = document.getElementById('moviesGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🎬</div>
          <div class="state-title">Đang tải danh sách phim...</div>
          <div class="state-desc">Đang đồng bộ dữ liệu từ PostgreSQL qua REST API</div>
        </div>
      `;
    }

    try {
      allMovies = await API.getMovies();
      renderGenreFilters();
      applyFilters();
    } catch (e) {
      if (grid) {
        grid.innerHTML = `
          <div class="state-box">
            <div class="state-icon">⚠️</div>
            <div class="state-title">Không tải được phim</div>
            <div class="state-desc">${escapeHtml(e.message)}</div>
            <button class="btn btn-primary" onclick="App.loadMovies()">Thử lại</button>
          </div>
        `;
      }
    }
  }

  /**
   * Tạo các pill lọc thể loại phim
   */
  function renderGenreFilters() {
    const container = document.getElementById('genreFilterPills');
    if (!container) return;

    const genres = ['all', ...new Set(allMovies.map(m => m.genre).filter(Boolean))];
    container.innerHTML = genres.map(g => {
      const label = g === 'all' ? 'Tất cả' : g;
      const isActive = activeGenre === g ? 'active' : '';
      return `<button type="button" class="filter-btn ${isActive}" data-genre="${escapeHtml(g)}">${escapeHtml(label)}</button>`;
    }).join('');

    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeGenre = btn.dataset.genre;
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
    });
  }

  /**
   * Áp dụng tìm kiếm và bộ lọc
   */
  function applyFilters() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

    filteredMovies = allMovies.filter(m => {
      const matchGenre = activeGenre === 'all' || m.genre === activeGenre;
      const matchSearch = !searchVal ||
        (m.title || '').toLowerCase().includes(searchVal) ||
        (m.description || '').toLowerCase().includes(searchVal);
      return matchGenre && matchSearch;
    });

    renderMovieCards();
  }

  /**
   * Hiển thị danh sách card phim
   */
  function renderMovieCards() {
    const grid = document.getElementById('moviesGrid');
    if (!grid) return;

    if (filteredMovies.length === 0) {
      grid.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🔍</div>
          <div class="state-title">Không tìm thấy phim phù hợp</div>
          <div class="state-desc">Hãy thử tìm với từ khóa khác hoặc chọn tất cả thể loại.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredMovies.map(movie => {
      const posterHtml = movie.poster_url
        ? `<img class="movie-poster-img" src="${movie.poster_url}" alt="${escapeHtml(movie.title)}" onerror="this.onerror=null; this.parentElement.innerHTML=App.getFallbackPosterHtml('${escapeHtml(movie.title)}', '${escapeHtml(movie.genre || '')}')">`
        : getFallbackPosterHtml(movie.title, movie.genre);

      return `
        <div class="movie-card">
          <div class="movie-poster-wrap">
            ${posterHtml}
            <div class="movie-badges">
              <span class="badge-genre">${escapeHtml(movie.genre || 'Phim')}</span>
              <span class="badge-duration">${movie.duration_min || 120} phút</span>
            </div>
          </div>
          <div class="movie-info">
            <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
            <p class="movie-desc">${escapeHtml(movie.description || 'Chưa có mô tả chi tiết cho phim này.')}</p>
            <div class="movie-actions">
              <button class="btn btn-secondary btn-sm" onclick="App.openMovieDetails(${movie.id})">
                ℹ️ Chi tiết
              </button>
              <button class="btn btn-primary btn-sm" onclick="App.openBookingModal(${movie.id})">
                🎟️ Đặt vé
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getFallbackPosterHtml(title, genre) {
    const icons = {
      'Hành động': '⚡',
      'Hài': '🎭',
      'Tình cảm': '❤️',
      'Kinh dị': '👻',
      'Hoạt hình': '🎨'
    };
    const icon = icons[genre] || '🎬';

    return `
      <div class="movie-poster-fallback">
        <div class="fallback-icon">${icon}</div>
        <div style="font-weight:700;font-size:1rem;color:#fff;">${escapeHtml(title)}</div>
        <div style="font-size:0.75rem;color:var(--accent-gold);margin-top:0.25rem;">CineCloud Cinema</div>
      </div>
    `;
  }

  /**
   * Mở Modal Chi tiết phim & Suất chiếu
   */
  async function openMovieDetails(movieId) {
    selectedMovie = allMovies.find(m => m.id === Number(movieId));
    if (!selectedMovie) return;

    const titleEl = document.getElementById('modalMovieTitle');
    const genreEl = document.getElementById('modalMovieGenre');
    const durEl = document.getElementById('modalMovieDuration');
    const descEl = document.getElementById('modalMovieDesc');
    const showtimesEl = document.getElementById('modalShowtimesList');

    if (titleEl) titleEl.textContent = selectedMovie.title;
    if (genreEl) genreEl.textContent = selectedMovie.genre || 'Chưa cập nhật';
    if (durEl) durEl.textContent = `${selectedMovie.duration_min || 120} phút`;
    if (descEl) descEl.textContent = selectedMovie.description || 'Không có mô tả chi tiết.';

    if (showtimesEl) {
      showtimesEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">Đang tải suất chiếu...</div>';
      const showtimes = await API.getShowtimes(selectedMovie.id);

      if (showtimes.length === 0) {
        showtimesEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">Chưa có lịch chiếu sắp tới cho phim này.</div>';
      } else {
        showtimesEl.innerHTML = showtimes.map(st => {
          const date = new Date(st.start_time);
          const isValidDate = !isNaN(date.getTime());
          const timeStr = isValidDate ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '19:30';
          const dateStr = isValidDate ? date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Hôm nay';
          const price = Number(st.price) || 90000;

          return `
            <div class="showtime-item" onclick="App.selectShowtimeAndBook(${st.id})">
              <div class="st-time">${timeStr}</div>
              <div class="st-date">${dateStr}</div>
              <div class="st-room">📍 ${escapeHtml(st.theater || 'Phòng 1')}</div>
              <div class="st-price">${Seats.formatCurrency(price)}</div>
            </div>
          `;
        }).join('');
      }
    }

    openModal('movieDetailsModal');
  }

  /**
   * Chuyển trực tiếp từ Suất chiếu sang Chọn ghế
   */
  async function selectShowtimeAndBook(showtimeId) {
    closeModal('movieDetailsModal');
    if (!selectedMovie) return;
    await startBookingProcess(selectedMovie, showtimeId);
  }

  /**
   * Mở trực tiếp Modal đặt vé từ card phim
   */
  async function openBookingModal(movieId) {
    selectedMovie = allMovies.find(m => m.id === Number(movieId));
    if (!selectedMovie) return;

    const showtimes = await API.getShowtimes(selectedMovie.id);
    if (!showtimes || showtimes.length === 0) {
      showToast('Phim hiện chưa có suất chiếu sắp tới', 'info');
      return;
    }

    await startBookingProcess(selectedMovie, showtimes[0].id, showtimes);
  }

  /**
   * Bắt đầu phiên chọn ghế
   */
  async function startBookingProcess(movie, showtimeId, cachedShowtimes = null) {
    selectedMovie = movie;
    const showtimes = cachedShowtimes || await API.getShowtimes(movie.id);
    selectedShowtime = showtimes.find(s => s.id === Number(showtimeId)) || showtimes[0];

    // Cập nhật thông tin tiêu đề modal chọn ghế
    const titleEl = document.getElementById('seatModalMovieTitle');
    const infoEl = document.getElementById('seatModalShowtimeInfo');
    const roomEl = document.getElementById('seatModalRoom');

    if (titleEl) titleEl.textContent = movie.title;
    if (roomEl) roomEl.textContent = selectedShowtime.theater || 'Phòng 1';

    if (infoEl) {
      const date = new Date(selectedShowtime.start_time);
      const isValidDate = !isNaN(date.getTime());
      if (isValidDate) {
        const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        infoEl.textContent = `${timeStr} - ${dateStr}`;
      } else {
        infoEl.textContent = 'Suất chiếu sắp tới';
      }
    }

    // Vẽ sơ đồ ghế
    const container = document.getElementById('seatsGridContainer');
    await Seats.initSeatMap(movie, selectedShowtime, container);

    openModal('seatBookingModal');
  }

  /**
   * Xác nhận đặt vé (Gọi API hoặc Giả lập nếu Backend 501 / Offline)
   */
  async function handleConfirmBooking() {
    const seats = Seats.getSelectedSeats();
    if (seats.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ghế trước khi tiếp tục', 'info');
      return;
    }

    // Kiểm tra đăng nhập
    if (!Auth.isLoggedIn()) {
      showToast('Vui lòng đăng nhập để tiến hành đặt vé', 'info');
      openAuthModal('login');
      return;
    }

    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Đang xử lý...';
    }

    try {
      const payload = {
        showtime_id: selectedShowtime.id,
        seats: seats,
        total_price: Seats.getTotalPrice(),
        movie_title: selectedMovie.title,
        theater_name: selectedShowtime.theater || 'Phòng 1',
        start_time: selectedShowtime.start_time
      };

      const result = await API.createBooking(payload);

      closeModal('seatBookingModal');

      // Hiển thị vé xác nhận
      displayTicketConfirmation(result);

      if (result.isSimulated) {
        showToast('Đặt vé mô phỏng thành công! (Lưu phiên Demo)', 'success');
      } else {
        showToast('Đặt vé thành công và đã lưu vào cơ sở dữ liệu!', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Lỗi đặt vé, vui lòng thử lại', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Xác nhận đặt vé';
      }
    }
  }

  /**
   * Hiển thị Modal Vé xác nhận thành công
   */
  function displayTicketConfirmation(booking) {
    const codeEl = document.getElementById('ticketConfirmCode');
    const movieEl = document.getElementById('ticketConfirmMovie');
    const theaterEl = document.getElementById('ticketConfirmTheater');
    const timeEl = document.getElementById('ticketConfirmTime');
    const seatsEl = document.getElementById('ticketConfirmSeats');
    const totalEl = document.getElementById('ticketConfirmTotal');

    if (codeEl) codeEl.textContent = booking.booking_code || `#BK-${booking.id}`;
    if (movieEl) movieEl.textContent = booking.movie_title || selectedMovie?.title || 'Phim đã đặt';
    if (theaterEl) theaterEl.textContent = booking.theater_name || selectedShowtime?.theater || 'Phòng 1';

    if (timeEl) {
      const d = new Date(booking.start_time || selectedShowtime?.start_time || Date.now());
      timeEl.textContent = !isNaN(d.getTime()) ? d.toLocaleString('vi-VN') : 'Suất chiếu sắp tới';
    }

    if (seatsEl) {
      const seatList = Array.isArray(booking.seats) ? booking.seats : [booking.seats];
      seatsEl.textContent = seatList.join(', ');
    }

    if (totalEl) {
      totalEl.textContent = Seats.formatCurrency(Number(booking.total_price) || 0);
    }

    openModal('ticketSuccessModal');
  }

  /**
   * Mở Modal "Vé của tôi"
   */
  async function openMyBookingsModal() {
    if (!Auth.isLoggedIn()) {
      showToast('Vui lòng đăng nhập để xem danh sách vé của bạn', 'info');
      openAuthModal('login');
      return;
    }

    const listContainer = document.getElementById('myBookingsList');
    if (listContainer) {
      listContainer.innerHTML = '<div style="color:var(--text-muted);padding:1rem;">Đang tải danh sách vé...</div>';
    }

    openModal('myBookingsModal');

    try {
      const bookings = await API.getMyBookings();
      if (!bookings || bookings.length === 0) {
        if (listContainer) {
          listContainer.innerHTML = `
            <div class="state-box" style="padding:2rem 1rem;">
              <div class="state-icon">🎟️</div>
              <div class="state-title">Bạn chưa có vé nào</div>
              <div class="state-desc">Hãy chọn một bộ phim yêu thích và đặt vé ngay hôm nay!</div>
            </div>
          `;
        }
        return;
      }

      if (listContainer) {
        listContainer.innerHTML = bookings.map(b => {
          const seats = Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || 'Ghế');
          const d = new Date(b.start_time || b.created_at);
          const dateStr = !isNaN(d.getTime()) ? d.toLocaleString('vi-VN') : 'Đã xác nhận';
          const price = Number(b.total_price) || 0;

          return `
            <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:1rem;margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <div style="font-weight:700;font-size:1.05rem;color:#fff;">${escapeHtml(b.movie_title || 'Phim đã đặt')}</div>
                <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.2rem;">
                  📍 ${escapeHtml(b.theater_name || 'Phòng 1')} • ⏰ ${dateStr}
                </div>
                <div style="font-size:0.85rem;color:var(--accent-green);font-weight:600;margin-top:0.2rem;">
                  Ghế: ${escapeHtml(seats)}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:monospace;font-weight:700;color:var(--accent-gold);">${escapeHtml(b.booking_code || '#' + b.id)}</div>
                <div style="font-weight:700;font-size:1rem;color:#fff;margin-top:0.2rem;">${Seats.formatCurrency(price)}</div>
                <span class="user-role-tag" style="background:rgba(16,185,129,0.15);color:var(--accent-green);border-color:rgba(16,185,129,0.3);">Đã xác nhận</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      if (listContainer) {
        listContainer.innerHTML = `<div style="color:var(--accent-red);padding:1rem;">Lỗi tải vé: ${escapeHtml(e.message)}</div>`;
      }
    }
  }

  /**
   * Mở Modal Chẩn đoán & Cấu hình Backend
   */
  async function openDiagnosticModal() {
    const urlInput = document.getElementById('diagApiUrlInput');
    const healthEl = document.getElementById('diagHealthResult');
    const forceDemoCheck = document.getElementById('diagForceDemoCheckbox');

    if (urlInput && typeof localStorage !== 'undefined') {
      urlInput.value = localStorage.getItem('custom_api_url') || '';
    }
    if (forceDemoCheck && typeof localStorage !== 'undefined') {
      forceDemoCheck.checked = localStorage.getItem('force_demo_mode') === 'true';
    }
    if (healthEl) healthEl.textContent = 'Đang kiểm tra kết nối...';

    openModal('diagnosticModal');

    const health = await API.checkHealth();
    if (healthEl) {
      if (health.ok) {
        healthEl.innerHTML = `<span style="color:var(--accent-green);font-weight:600;">✅ Kết nối thành công!</span> DB Time: ${escapeHtml(health.data.dbTime || 'N/A')} (Ping: ${health.ping}ms)`;
      } else if (health.isDemo) {
        healthEl.innerHTML = `<span style="color:var(--accent-gold);font-weight:600;">⚡ Chế độ Demo:</span> ${escapeHtml(health.error || 'Database chưa sẵn sàng, ứng dụng tự động hoạt động ở chế độ Demo mô phỏng.')}`;
      } else {
        healthEl.innerHTML = `<span style="color:var(--accent-red);font-weight:600;">❌ Không kết nối được:</span> ${escapeHtml(health.error)}`;
      }
    }
  }

  /**
   * Lưu cấu hình URL tùy chỉnh và chế độ Demo
   */
  function saveCustomApiUrl() {
    const input = document.getElementById('diagApiUrlInput');
    const val = (input?.value || '').trim();
    if (typeof localStorage !== 'undefined') {
      if (val) {
        localStorage.setItem('custom_api_url', val);
        showToast(`Đã lưu URL Backend: ${val}`, 'success');
      } else {
        localStorage.removeItem('custom_api_url');
        showToast('Đã khôi phục URL tự động mặc định', 'info');
      }

      const forceDemoCheck = document.getElementById('diagForceDemoCheckbox');
      if (forceDemoCheck) {
        if (forceDemoCheck.checked) {
          localStorage.setItem('force_demo_mode', 'true');
          showToast('Đã bật chế độ Demo Offline (Không cần Backend)', 'info');
        } else {
          localStorage.removeItem('force_demo_mode');
        }
      }
    }

    closeModal('diagnosticModal');
    checkServerConnection();
    loadMovies();
  }

  /**
   * Mở modal Auth với tab chỉ định ('login' hoặc 'register')
   */
  function openAuthModal(tab = 'login') {
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');

    if (tab === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (loginFormContainer) loginFormContainer.style.display = 'none';
      if (registerFormContainer) registerFormContainer.style.display = 'block';
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (loginFormContainer) loginFormContainer.style.display = 'block';
      if (registerFormContainer) registerFormContainer.style.display = 'none';
    }

    openModal('authModal');
  }

  /**
   * Thông báo Toast nổi bật
   */
  function showToast(message, type = 'info') {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      info: '💡'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:1.1rem;">${icons[type] || '🔔'}</span>
      <div style="flex:1;">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Quản lý đóng/mở Modal
   */
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Gán sự kiện cho các thành phần giao diện
   */
  function setupEventListeners() {
    // Tìm kiếm phim
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    // Nút xác nhận đặt vé
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    if (confirmBookingBtn) {
      confirmBookingBtn.addEventListener('click', handleConfirmBooking);
    }

    // Đóng modal khi bấm nút close hoặc click ra ngoài nền
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
      const closeBtn = modal.querySelector('.modal-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      }
    });

    // Form Đăng nhập
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        try {
          const res = await Auth.login(email, password);
          closeModal('authModal');
          if (res.isSimulated) {
            showToast('Đăng nhập mô phỏng thành công! (Phiên Demo)', 'success');
          } else {
            showToast('Đăng nhập thành công!', 'success');
          }
        } catch (err) {
          showToast(err.message || 'Lỗi đăng nhập', 'error');
        }
      });
    }

    // Form Đăng ký
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName')?.value;
        const email = document.getElementById('regEmail')?.value;
        const password = document.getElementById('regPassword')?.value;
        const confirmPass = document.getElementById('regConfirmPassword')?.value;

        if (password !== confirmPass) {
          showToast('Mật khẩu xác nhận không khớp', 'error');
          return;
        }

        try {
          const res = await Auth.register(email, password, fullName);
          closeModal('authModal');
          registerForm.reset();
          if (res.isSimulated) {
            showToast('Đăng ký mô phỏng thành công! (Phiên Demo)', 'success');
          } else {
            showToast('Đăng ký tài khoản thành công!', 'success');
          }
        } catch (err) {
          showToast(err.message || 'Lỗi đăng ký', 'error');
        }
      });
    }

    // Chuyển tab Đăng nhập / Đăng ký
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => openAuthModal('login'));
      tabRegister.addEventListener('click', () => openAuthModal('register'));
    }

    // Nút đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
        showToast('Đã đăng xuất', 'info');
      });
    }

    // Lắng nghe phím ESC để đóng modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
      }
    });
  }

  return {
    init,
    loadMovies,
    openMovieDetails,
    openBookingModal,
    selectShowtimeAndBook,
    openMyBookingsModal,
    openDiagnosticModal,
    openAuthModal,
    saveCustomApiUrl,
    showToast,
    openModal,
    closeModal,
    getFallbackPosterHtml,
    escapeHtml
  };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', App.init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
