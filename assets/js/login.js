document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

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

            // Phân quyền chuyển hướng
            if (data.userType === 'Admin') {
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