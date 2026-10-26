/**
 * ==========================================================
 * CINECLOUD - AUTHENTICATION MODULE (public/js/auth.js)
 * Quản lý trạng thái phiên đăng nhập, JWT Token & Header UI
 * ==========================================================
 */

const Auth = (() => {
  let currentUser = null;

  /**
   * Khởi tạo thông tin người dùng từ localStorage khi tải trang
   */
  function init() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token && userStr) {
        try {
          currentUser = JSON.parse(userStr);
        } catch (e) {
          currentUser = null;
          localStorage.removeItem('auth_user');
        }
      }
    }
    updateUI();

    // Lắng nghe sự kiện token hết hạn từ api.js
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:expired', () => {
        currentUser = null;
        updateUI();
        if (window.App && window.App.showToast) {
          window.App.showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 'info');
        }
      });
    }
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  /**
   * Cập nhật giao diện header dựa trên trạng thái đăng nhập
   */
  function updateUI() {
    if (typeof document === 'undefined') return;

    const authButtons = document.getElementById('authButtons');
    const userProfileBadge = document.getElementById('userProfileBadge');
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const userRoleEl = document.getElementById('userRole');

    if (currentUser) {
      if (authButtons) authButtons.style.display = 'none';
      if (userProfileBadge) userProfileBadge.style.display = 'flex';
      if (userNameEl) userNameEl.textContent = currentUser.full_name || currentUser.email;
      if (userAvatarEl) {
        const initial = (currentUser.full_name || currentUser.email || 'U').charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
      }
      if (userRoleEl) {
        userRoleEl.textContent = currentUser.role === 'admin' ? 'Quản trị' : 'Thành viên';
      }
    } else {
      if (authButtons) authButtons.style.display = 'flex';
      if (userProfileBadge) userProfileBadge.style.display = 'none';
    }
  }

  function getApi() {
    if (typeof API !== 'undefined') return API;
    if (typeof window !== 'undefined' && window.API) return window.API;
    if (typeof global !== 'undefined' && global.API) return global.API;
    return null;
  }

  /**
   * Đăng nhập
   */
  async function login(email, password) {
    const api = getApi();
    if (!api) throw new Error('Dịch vụ API chưa sẵn sàng');
    const res = await api.login({ email, password });
    if (res && res.token) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_user', JSON.stringify(res.user));
      }
      currentUser = res.user;
      updateUI();
      return res;
    }
    throw new Error('Đăng nhập không thành công, không nhận được token');
  }

  /**
   * Đăng ký
   */
  async function register(email, password, full_name) {
    const api = getApi();
    if (!api) throw new Error('Dịch vụ API chưa sẵn sàng');
    const res = await api.register({ email, password, full_name });
    if (res && res.token) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_user', JSON.stringify(res.user));
      }
      currentUser = res.user;
      updateUI();
      return res;
    }
    throw new Error('Đăng ký không thành công, không nhận được token');
  }

  /**
   * Đăng xuất
   */
  function logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    currentUser = null;
    updateUI();
  }

  return {
    init,
    getUser,
    isLoggedIn,
    login,
    register,
    logout,
    updateUI
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
