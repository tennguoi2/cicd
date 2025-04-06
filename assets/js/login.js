document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // Kiểm tra tham số URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectType = urlParams.get('redirect');
    const conferenceId = urlParams.get('id');
    
    if (redirectType === 'conference' && conferenceId) {
        // Lưu ID hội nghị vào sessionStorage để sau khi đăng nhập có thể quay lại đăng ký
        sessionStorage.setItem('pendingRegistration', conferenceId);
        
        // Hiển thị thông báo
        if (messageDiv) {
            messageDiv.innerHTML = '<div class="alert alert-info">Vui lòng đăng nhập để đăng ký tham gia hội nghị.</div>';
        }
    }

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitButton = document.querySelector('button[type="submit"]');
        const rememberMe = document.getElementById('remember').checked;

        // Hiển thị trạng thái loading
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        // Gọi API login
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                Username: username,
                Password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            // Lưu thông tin người dùng
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('authToken', data.token);
            storage.setItem('userData', JSON.stringify({
                id: data.id,
                username: data.username,
                userType: data.userType, // Lấy từ API
                hoTen: data.hoTen,
                email: data.email
            }));

            // Kiểm tra nếu có đăng ký hội nghị đang chờ
            const pendingRegistration = sessionStorage.getItem('pendingRegistration');
            
            // Phân quyền chuyển hướng
            if (pendingRegistration) {
                // Xóa thông tin đăng ký đang chờ
                sessionStorage.removeItem('pendingRegistration');
                // Chuyển đến trang hội nghị với thông tin hội nghị cần đăng ký
                window.location.href = `my-conferences.html?register=${pendingRegistration}`;
            } else if (data.userType === 'Admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            messageDiv.style.color = 'red';
            messageDiv.textContent = error.message || 'Đăng nhập thất bại';
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = 'SIGN IN';
        });
    });
});