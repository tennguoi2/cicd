document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var messageDiv = document.getElementById('message');
    var submitButton = document.querySelector('button[type="submit"]');
    var rememberMe = document.getElementById('remember').checked;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    // Send login request to API
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
    .then(function(response) {
        return response.json().then(function(data) {
            if (!response.ok) {
                throw new Error(data.message || 'Đăng nhập thất bại');
            }
            return data;
        });
    })
    .then(function(data) {
        // Lưu token và thông tin người dùng
        if (rememberMe) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify({
                id: data.id,
                username: data.username,
                userType: data.userType,
                hoTen: data.hoTen,
                email: data.email
            }));
        } else {
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('userData', JSON.stringify({
                id: data.id,
                username: data.username,
                userType: data.userType,
                hoTen: data.hoTen,
                email: data.email
            }));
        }
        
        // Hiển thị thông báo thành công
        messageDiv.style.color = 'green';
        messageDiv.textContent = 'Đăng nhập thành công!';
        
        // Chuyển hướng đến trang chủ
        setTimeout(function() {
            window.location.href = '/index.html';
        }, 1000);
    })
    .catch(function(error) {
        // Hiển thị thông báo lỗi
        messageDiv.style.color = 'red';
        messageDiv.textContent = error.message || 'Lỗi đăng nhập';
        console.error('Lỗi đăng nhập:', error);
    })
    .finally(function() {
        // Khôi phục trạng thái nút submit
        submitButton.disabled = false;
        submitButton.innerHTML = 'SIGN IN';
    });
});