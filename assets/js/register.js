// Toggle additional fields based on user type
function toggleAdditionalFields() {
    var userType = document.getElementById('type').value;
    document.getElementById('daibieuFields').style.display = userType === 'daibieu' ? 'block' : 'none';
    document.getElementById('nhanvienFields').style.display = userType === 'nhanvien' ? 'block' : 'none';
}

document.getElementById('type').addEventListener('change', toggleAdditionalFields);

// Initial call to set correct visibility
document.addEventListener('DOMContentLoaded', toggleAdditionalFields);

// Handle form submission for registration
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Get form values
    var name = document.getElementById('name').value;
    var username = document.getElementById('username').value;
    var email = document.getElementById('email').value;
    var type = document.getElementById('type').value;
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirmPassword').value;
    var agreeTerms = document.getElementById('agree-term').checked;
    var messageDiv = document.getElementById('message');
    var submitButton = document.querySelector('button[type="submit"]');

    // Validate passwords match
    if (password !== confirmPassword) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Mật khẩu không khớp!';
        return;
    }

    // Validate terms acceptance
    if (!agreeTerms) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Bạn phải đồng ý với điều khoản để tiếp tục!';
        return;
    }

    // Prepare user data based on type
    var userData = {
        hoTen: name,
        username: username,
        email: email,
        password: password,
        userType: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
        sdt: '',
        coQuan: '',
        chucVu: '',
        role: type === 'daibieu' ? 'User' : 'Staff'
    };

    // Add additional fields based on user type
    if (type === 'daibieu') {
        var sdt = document.getElementById('sdtDaibieu').value;
        var coQuan = document.getElementById('coQuanDaibieu').value;
        
        if (!sdt || !coQuan) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Vui lòng điền đầy đủ thông tin đại biểu!';
            return;
        }
        
        userData.sdt = sdt;
        userData.coQuan = coQuan;
    } else if (type === 'nhanvien') {
        var sdt = document.getElementById('sdtNhanvien').value;
        var chucVu = document.getElementById('chucVuNhanvien').value;
        
        if (!sdt || !chucVu) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Vui lòng điền đầy đủ thông tin nhân viên!';
            return;
        }
        
        userData.sdt = sdt;
        userData.chucVu = chucVu;
    }

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    // Send registration data to API
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(function(response) {
        return response.json().then(function(data) {
            if (!response.ok) {
                throw new Error(data.message || 'Đăng ký thất bại');
            }
            return data;
        });
    })
    .then(function(data) {
        // Show success message
        messageDiv.style.color = 'green';
        messageDiv.textContent = 'Đăng ký thành công! Chuyển hướng đến trang đăng nhập...';
        
        // Redirect to login page after successful registration
        setTimeout(function() {
            window.location.href = '/login.html';
        }, 2000);
    })
    .catch(function(error) {
        // Show error message
        messageDiv.style.color = 'red';
        messageDiv.textContent = error.message || 'Lỗi đăng ký';
        console.error('Lỗi đăng ký:', error);
    })
    .finally(function() {
        // Restore button state
        submitButton.disabled = false;
        submitButton.innerHTML = 'REGISTER';
    });
});