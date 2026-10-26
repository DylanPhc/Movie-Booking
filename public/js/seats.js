/**
 * ==========================================================
 * CINECLOUD - SEAT MAP & SELECTION (public/js/seats.js)
 * Sơ đồ rạp chiếu trực quan, tính toán giá vé & quản lý ghế
 * ==========================================================
 */

const Seats = (() => {
  // Trạng thái phiên chọn ghế hiện tại
  let currentShowtime = null;
  let currentMovie = null;
  let selectedSeats = new Set();
  let occupiedSeats = new Set();

  const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const SEATS_PER_ROW = 10;
  const VIP_ROWS = ['E', 'F', 'G']; // Hàng VIP có giá hoặc vị trí đẹp

  /**
   * Khởi tạo sơ đồ rạp cho một suất chiếu
   */
  function initSeatMap(movie, showtime, containerEl) {
    currentMovie = movie;
    currentShowtime = showtime;
    selectedSeats.clear();
    occupiedSeats.clear();

    // Giả lập một số ghế đã có người đặt trước dựa theo showtime id để chân thực
    generateMockOccupiedSeats(showtime.id);

    renderSeats(containerEl);
    updateSummary();
  }

  /**
   * Tạo ngẫu nhiên một vài ghế đã đặt để kiểm thử giao diện
   */
  function generateMockOccupiedSeats(showtimeId) {
    // Dựa vào showtimeId để tạo các ghế occupied cố định
    const seeds = [
      ['A3', 'A4', 'C5', 'C6', 'F7', 'F8'],
      ['B2', 'B3', 'D4', 'D5', 'G5', 'G6'],
      ['E4', 'E5', 'E6', 'H1', 'H2'],
      ['C4', 'C7', 'D8', 'F3', 'F4']
    ];
    const index = (showtimeId || 1) % seeds.length;
    seeds[index].forEach(label => occupiedSeats.add(label));
  }

  /**
   * Vẽ sơ đồ các hàng ghế
   */
  function renderSeats(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    ROWS.forEach(rowLetter => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'seat-row';

      // Nhãn hàng bên trái
      const leftLabel = document.createElement('div');
      leftLabel.className = 'seat-row-label';
      leftLabel.textContent = rowLetter;
      rowDiv.appendChild(leftLabel);

      // Các ghế trong hàng
      for (let col = 1; col <= SEATS_PER_ROW; col++) {
        const seatLabel = `${rowLetter}${col}`;
        const isVip = VIP_ROWS.includes(rowLetter);
        const isOccupied = occupiedSeats.has(seatLabel);
        const isSelected = selectedSeats.has(seatLabel);

        const seatBtn = document.createElement('button');
        seatBtn.type = 'button';
        seatBtn.className = 'seat-btn';
        seatBtn.textContent = col;
        seatBtn.dataset.seat = seatLabel;
        seatBtn.title = `Ghế ${seatLabel} (${isVip ? 'VIP' : 'Thường'})`;

        if (isVip) seatBtn.classList.add('vip');
        if (isOccupied) {
          seatBtn.classList.add('occupied');
          seatBtn.disabled = true;
          seatBtn.title = `Ghế ${seatLabel} (Đã có người đặt)`;
        }
        if (isSelected) seatBtn.classList.add('selected');

        seatBtn.addEventListener('click', () => toggleSeat(seatLabel, seatBtn));
        rowDiv.appendChild(seatBtn);
      }

      // Nhãn hàng bên phải
      const rightLabel = document.createElement('div');
      rightLabel.className = 'seat-row-label';
      rightLabel.textContent = rowLetter;
      rowDiv.appendChild(rightLabel);

      containerEl.appendChild(rowDiv);
    });
  }

  /**
   * Xử lý khi bấm chọn / bỏ chọn ghế
   */
  function toggleSeat(seatLabel, seatBtn) {
    if (occupiedSeats.has(seatLabel)) return;

    if (selectedSeats.has(seatLabel)) {
      selectedSeats.delete(seatLabel);
      seatBtn.classList.remove('selected');
    } else {
      if (selectedSeats.size >= 8) {
        if (window.App && window.App.showToast) {
          window.App.showToast('Bạn chỉ có thể chọn tối đa 8 ghế cho mỗi đơn đặt', 'info');
        }
        return;
      }
      selectedSeats.add(seatLabel);
      seatBtn.classList.add('selected');
    }

    updateSummary();
  }

  /**
   * Cập nhật thông tin tổng tiền và danh sách ghế đang chọn
   */
  function updateSummary() {
    const listEl = document.getElementById('selectedSeatsPills');
    const countEl = document.getElementById('selectedSeatsCount');
    const priceEl = document.getElementById('totalPriceValue');
    const unitPriceEl = document.getElementById('unitPriceValue');
    const checkoutBtn = document.getElementById('confirmBookingBtn');

    const seatsArray = Array.from(selectedSeats).sort();

    if (listEl) {
      if (seatsArray.length === 0) {
        listEl.innerHTML = '<span style="color:var(--text-dim);font-size:0.85rem;">Chưa có ghế nào</span>';
      } else {
        listEl.innerHTML = seatsArray
          .map(s => `<span class="seat-badge">${s}</span>`)
          .join('');
      }
    }

    if (countEl) countEl.textContent = seatsArray.length;

    // Tính giá tiền chuẩn (lấy số từ showtime.price)
    const unitPrice = currentShowtime ? Number(currentShowtime.price) || 90000 : 90000;
    if (unitPriceEl) {
      unitPriceEl.textContent = formatCurrency(unitPrice);
    }

    const total = seatsArray.length * unitPrice;
    if (priceEl) {
      priceEl.textContent = formatCurrency(total);
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = seatsArray.length === 0;
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  function getSelectedSeats() {
    return Array.from(selectedSeats).sort();
  }

  function getTotalPrice() {
    const unitPrice = currentShowtime ? Number(currentShowtime.price) || 90000 : 90000;
    return selectedSeats.size * unitPrice;
  }

  return {
    initSeatMap,
    getSelectedSeats,
    getTotalPrice,
    formatCurrency
  };
})();
