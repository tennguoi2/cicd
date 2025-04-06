// Kiểm tra người dùng đã đăng nhập hay chưa
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Hàm kiểm tra trạng thái xác thực
function checkAuthStatus() {
    // Lấy phần tử nút đăng nhập và vị trí để hiển thị thông tin người dùng
    const loginButton = document.querySelector('.btn-getstarted');
    const headerContainer = document.querySelector('.header-container');
    
    // Kiểm tra xem đã có avatar hiển thị chưa
    const existingAvatar = document.querySelector('.user-profile.d-flex.align-items-center');
    if (existingAvatar) {
        // Đã có avatar hiển thị, không cần thêm nữa
        return;
    }
    
    // Kiểm tra xem có token trong localStorage hoặc sessionStorage không
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
        // Không có token, người dùng chưa đăng nhập
        return;
    }
    
    // Kiểm tra tính hợp lệ của token (có thể gọi API để xác thực token)
    try {
        // Giải mã token (phía client chỉ kiểm tra định dạng)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const tokenData = JSON.parse(jsonPayload);
        
        // Kiểm tra token có hết hạn chưa
        if (tokenData.exp * 1000 < Date.now()) {
            // Token đã hết hạn, xóa khỏi storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            return;
        }
        
        // Token còn hạn, lấy thông tin người dùng
        const userData = JSON.parse(localStorage.getItem('userData')) || JSON.parse(sessionStorage.getItem('userData'));
        
        if (userData) {
            // Người dùng đã đăng nhập
            // Ẩn nút đăng nhập
            if (loginButton) {
                loginButton.style.display = 'none';
            }
            
            // Tạo phần tử hiển thị thông tin người dùng và nút đăng xuất
            const userElement = document.createElement('div');
            userElement.className = 'user-profile d-flex align-items-center';
            userElement.innerHTML = `
<div class="dropdown">
  <div class="user-info-wrapper" data-bs-toggle="dropdown" aria-expanded="false">
    <img src="${userData.avatar || 'https://i.pravatar.cc/40?u=' + userData.email}" 
         class="user-avatar" 
         alt="User Avatar">
    
    <span class="user-badge"></span>
  </div>
  <ul class="dropdown-menu">
    <li>
      <a class="dropdown-item" href="/profile">
        <i class="bi bi-person"></i>
        Thông tin
      </a>
    </li>
    <li>
      <a class="dropdown-item" href="/settings">
        <i class="bi bi-gear"></i>
        Cài đặt
      </a>
    </li>
    <li><hr class="dropdown-divider"></li>
    <li>
      <a class="dropdown-item text-danger logout-btn" href="#">
        <i class="bi bi-box-arrow-right"></i>
        Đăng xuất
      </a>
    </li>
  </ul>
</div>
`;

// Thêm badge notification (tuỳ chọn)
if (userData.unreadNotifications > 0) {
  userElement.querySelector('.user-badge').style.display = 'block';
}
            
            // Thêm phần tử vào header
            if (headerContainer) {
                headerContainer.appendChild(userElement);
            }
            
            // Xử lý sự kiện nút đăng xuất
            const logoutBtn = document.querySelector('.logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    logout();
                });
            }
        }
    } catch (error) {
        console.error('Lỗi xác thực token:', error);
        // Nếu có lỗi xử lý token, xóa khỏi storage
        logout();
    }
}

// Hàm đăng xuất
function logout() {
    // Xóa dữ liệu đăng nhập
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    
    // Chuyển hướng về trang chủ
    window.location.href = '/';
}

// Thêm CSS cho phần tử user profile
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        /* User Profile Section */
.user-profile {
  margin-left: 1.5rem;
  position: relative;
}

.user-info-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.user-info-wrapper:hover {
  background: var(--primary-color);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #fff;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.user-info-text {
  display: flex;
  flex-direction: column;
}

.user-greeting {
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
}

.user-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  margin: 0;
}

/* Dropdown Menu */
.user-profile .dropdown-menu {
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  margin-top: 0.75rem;
  min-width: 220px;
  padding: 0.5rem 0;
  transform-origin: top right;
  animation: dropdownFadeIn 0.2s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: #4a5568;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: var(--primary-color);
  transform: translateX(3px);
}

.dropdown-item i.bi {
  width: 20px;
  text-align: center;
  font-size: 1.1rem;
  color: #718096;
}

.dropdown-divider {
  margin: 0.5rem 0;
  border-color: #e2e8f0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .user-profile {
    margin-left: auto;
  }
  
  .user-name {
    display: none;
  }
  
  .user-info-wrapper {
    padding: 0.5rem;
  }
}

/* Hover Effects */
.user-info-wrapper:hover .user-avatar {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

/* Badge Notification */
.user-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #48bb78;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #2d3748;
}
    `;
    document.head.appendChild(style);
}); 