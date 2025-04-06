// my-conferences.js - User Conference Management

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    checkAuthStatus();
    
    // Load conferences
    loadAllConferences();
    
    // Set up event listeners
    setupEventListeners();
    
    // Kiểm tra URL parameters để xem có yêu cầu đăng ký không
    checkUrlParameters();
});

// Kiểm tra URL parameters
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const registerId = urlParams.get('register');
    
    if (registerId) {
        // Có yêu cầu mở modal đăng ký hội nghị
        setTimeout(() => {
            showConferenceDetails(registerId);
        }, 1000); // Chờ 1 giây để các dữ liệu khác tải xong
        
        // Xóa parameter để tránh mở lại modal khi refresh trang
        window.history.replaceState({}, document.title, 'my-conferences.html');
    }
}

// Check if the user is logged in
function checkAuthStatus() {
    // Check for token in both localStorage and sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userProfile = document.getElementById('user-profile');
    const loginRequired = document.getElementById('login-required');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (token) {
        // User is logged in
        userProfile.style.display = 'block';
        loginRequired.style.display = 'none';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        
        // Load user profile data
        loadUserProfile();
    } else {
        // User is not logged in
        userProfile.style.display = 'none';
        loginRequired.style.display = 'block';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
}

// Load user profile information
function loadUserProfile() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin người dùng');
        }
        return response.json();
    })
    .then(user => {
        const userProfile = document.getElementById('user-profile');
        userProfile.style.display = 'block'; // Show user profile section
        document.getElementById('user-name').textContent = `Xin chào, ${user.hoTen}`;
        document.getElementById('user-email').textContent = user.email;
    })
    .catch(error => {
        console.error('Error:', error);
        // If there's an error, it might be due to an invalid token
        localStorage.removeItem('authToken');
        checkAuthStatus();
    });
}

// Load all conferences
function loadAllConferences() {
    fetch('/api/hoi-nghi')
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể lấy danh sách hội nghị');
        }
        return response.json();
    })
    .then(conferences => {
        displayConferences(conferences);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('conferences-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i> Lỗi: ${error.message}
                </div>
            </div>
        `;
    });
}

// Display conferences
function displayConferences(conferences) {
    const container = document.getElementById('conferences-container');
    container.innerHTML = '';
    
    if (conferences.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i> Hiện tại chưa có hội nghị nào được tổ chức.
                </div>
            </div>
        `;
        return;
    }
    
    conferences.forEach(conference => {
        const card = createConferenceCard(conference);
        container.appendChild(card);
    });
}

// Create a conference card
function createConferenceCard(conference) {
    const col = document.createElement('div');
    col.className = 'col-md-4';
    
    // Format dates
    const startDate = new Date(conference.thoiGianBatDau);
    const endDate = new Date(conference.thoiGianKetThuc);
    const formattedDate = `${startDate.toLocaleDateString('vi-VN')}`;
    const formattedTime = `${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    
    // Status badge color
    let statusClass = 'bg-info';
    if (conference.trangThai === 'Đã kết thúc') {
        statusClass = 'bg-secondary';
    } else if (conference.trangThai === 'Đang diễn ra') {
        statusClass = 'bg-success';
    } else if (conference.trangThai === 'Sắp diễn ra') {
        statusClass = 'bg-primary';
    } else if (conference.trangThai === 'Đã hủy') {
        statusClass = 'bg-danger';
    }
    
    // Check if the user is registered for this conference
    const isRegistered = conference.isRegistered || false;
    
    col.innerHTML = `
        <div class="card conference-card h-100">
            ${isRegistered ? `<div class="registered-badge"><span class="badge bg-success">Đã đăng ký</span></div>` : ''}
            <img src="assets/img/conference-default.jpg" class="card-img-top conference-image" alt="${conference.tenHoiNghi}">
            <div class="card-body">
                <h5 class="card-title">${conference.tenHoiNghi}</h5>
                <p class="card-text text-muted">
                    <i class="bi bi-geo-alt me-2"></i>${conference.diaChiHoiNghi}
                </p>
                <p class="card-text">
                    <i class="bi bi-calendar-event me-2"></i>${formattedDate}<br>
                    <i class="bi bi-clock me-2"></i>${formattedTime}
                </p>
                <p class="card-text">
                    <span class="badge ${statusClass}">${conference.trangThai}</span>
                    <span class="ms-2"><i class="bi bi-people me-1"></i>${conference.soNguoiThamGia || 0} người tham gia</span>
                </p>
            </div>
            <div class="card-footer bg-transparent">
                <button class="btn btn-primary btn-view-details" data-id="${conference.id}">Xem chi tiết</button>
            </div>
        </div>
    `;
    
    // Add event listener to the view details button
    col.querySelector('.btn-view-details').addEventListener('click', function() {
        showConferenceDetails(conference.id);
    });
    
    return col;
}

// Load user's registered conferences
function loadRegisteredConferences() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        return;
    }
    
    document.getElementById('registered-conferences-container').innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Đang tải...</span>
            </div>
            <p class="mt-2">Đang tải danh sách hội nghị đã đăng ký...</p>
        </div>
    `;
    
    fetch('/api/tham-gia-hoi-nghi', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể lấy danh sách hội nghị đã đăng ký');
        }
        return response.json();
    })
    .then(registrations => {
        displayRegisteredConferences(registrations);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('registered-conferences-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i> Lỗi: ${error.message}
                </div>
            </div>
        `;
    });
}

// Display user's registered conferences
function displayRegisteredConferences(registrations) {
    const container = document.getElementById('registered-conferences-container');
    container.innerHTML = '';
    
    if (registrations.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i> Bạn chưa đăng ký tham gia hội nghị nào.
                </div>
            </div>
        `;
        return;
    }
    
    registrations.forEach(registration => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        
        // Format dates
        const startDate = new Date(registration.thoiGianBatDau);
        const endDate = new Date(registration.thoiGianKetThuc);
        const formattedDate = `${startDate.toLocaleDateString('vi-VN')}`;
        const formattedTime = `${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        
        // Status badge color for conference
        let conferenceStatusClass = 'bg-info';
        if (registration.trangThaiHoiNghi === 'Đã kết thúc') {
            conferenceStatusClass = 'bg-secondary';
        } else if (registration.trangThaiHoiNghi === 'Đang diễn ra') {
            conferenceStatusClass = 'bg-success';
        } else if (registration.trangThaiHoiNghi === 'Sắp diễn ra') {
            conferenceStatusClass = 'bg-primary';
        } else if (registration.trangThaiHoiNghi === 'Đã hủy') {
            conferenceStatusClass = 'bg-danger';
        }
        
        // Status badge color for registration
        let registrationStatusClass = 'bg-info';
        if (registration.trangThaiThamGia === 'Đã điểm danh') {
            registrationStatusClass = 'bg-success';
        } else if (registration.trangThaiThamGia === 'Vắng mặt') {
            registrationStatusClass = 'bg-danger';
        }
        
        col.innerHTML = `
            <div class="card conference-card h-100">
                <img src="assets/img/conference-default.jpg" class="card-img-top conference-image" alt="${registration.tenHoiNghi}">
                <div class="card-body">
                    <h5 class="card-title">${registration.tenHoiNghi}</h5>
                    <p class="card-text text-muted">
                        <i class="bi bi-geo-alt me-2"></i>${registration.diaChiHoiNghi}
                    </p>
                    <p class="card-text">
                        <i class="bi bi-calendar-event me-2"></i>${formattedDate}<br>
                        <i class="bi bi-clock me-2"></i>${formattedTime}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge ${conferenceStatusClass}">${registration.trangThaiHoiNghi}</span>
                        <span class="badge ${registrationStatusClass}">${registration.trangThaiThamGia || 'Đăng ký'}</span>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <button class="btn btn-primary btn-view-registration" data-id="${registration.hoiNghiId}">Xem chi tiết</button>
                    <button class="btn btn-danger btn-cancel-registration" data-id="${registration.hoiNghiId}">Hủy đăng ký</button>
                </div>
            </div>
        `;
        
        container.appendChild(col);
    });
    
    // Add event listeners
    document.querySelectorAll('.btn-view-registration').forEach(button => {
        button.addEventListener('click', function() {
            const conferenceId = this.getAttribute('data-id');
            showConferenceDetails(conferenceId);
        });
    });
    
    document.querySelectorAll('.btn-cancel-registration').forEach(button => {
        button.addEventListener('click', function() {
            const conferenceId = this.getAttribute('data-id');
            cancelRegistration(conferenceId);
        });
    });
}

// Show conference details
function showConferenceDetails(conferenceId) {
    // Check for token in both localStorage and sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    let headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    fetch(`/api/hoi-nghi/${conferenceId}`, {
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                // Người dùng chưa đăng nhập
                return response.json().then(data => {
                    throw new Error('Vui lòng đăng nhập để xem chi tiết hội nghị');
                });
            }
            return response.json().then(data => {
                throw new Error(data.message || 'Không thể lấy thông tin hội nghị');
            });
        }
        return response.json();
    })
    .then(data => {
        if (!data.conference) {
            throw new Error('Dữ liệu hội nghị không hợp lệ');
        }
        
        const conference = data.conference;
        
        // Format dates
        const startDate = new Date(conference.thoiGianBatDau);
        const endDate = new Date(conference.thoiGianKetThuc);
        const formattedDate = `${startDate.toLocaleDateString('vi-VN')}`;
        const formattedTime = `${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        
        // Status badge color
        let statusClass = 'bg-info';
        if (conference.trangThai === 'Đã kết thúc') {
            statusClass = 'bg-secondary';
        } else if (conference.trangThai === 'Đang diễn ra') {
            statusClass = 'bg-success';
        } else if (conference.trangThai === 'Sắp diễn ra') {
            statusClass = 'bg-primary';
        } else if (conference.trangThai === 'Đã hủy') {
            statusClass = 'bg-danger';
        }
        
        // Set modal content
        document.getElementById('modal-conference-title').textContent = conference.tenHoiNghi;
        document.getElementById('modal-conference-organizer').textContent = `Người tổ chức: ${conference.nguoiTao || 'Không có thông tin'}`;
        document.getElementById('modal-conference-location').textContent = conference.diaChiHoiNghi;
        document.getElementById('modal-conference-date').textContent = formattedDate;
        document.getElementById('modal-conference-time').textContent = formattedTime;
        document.getElementById('modal-conference-status').textContent = conference.trangThai;
        document.getElementById('modal-conference-status').className = `badge ${statusClass}`;
        document.getElementById('modal-conference-description').textContent = conference.moTa || 'Không có mô tả.';
        
        // Handle registration status
        const registerBtn = document.getElementById('modal-register-btn');
        const unregisterBtn = document.getElementById('modal-unregister-btn');
        const registrationStatus = document.getElementById('modal-registration-status');
        
        if (token) {
            if (data.isRegistered) {
                registerBtn.style.display = 'none';
                unregisterBtn.style.display = 'inline-block';
                
                // Set registration status
                let statusText = 'Đã đăng ký';
                let statusBadgeClass = 'bg-info';
                
                if (data.registrationStatus === 'Đã điểm danh') {
                    statusText = 'Đã điểm danh';
                    statusBadgeClass = 'bg-success';
                } else if (data.registrationStatus === 'Vắng mặt') {
                    statusText = 'Vắng mặt';
                    statusBadgeClass = 'bg-danger';
                }
                
                registrationStatus.innerHTML = `
                    <div class="alert alert-success mt-3">
                        <i class="bi bi-check-circle me-2"></i> Bạn đã đăng ký tham gia hội nghị này
                        <span class="badge ${statusBadgeClass} ms-2">${statusText}</span>
                    </div>
                `;
                
                // Set button data
                unregisterBtn.setAttribute('data-id', conferenceId);
            } else {
                if (conference.trangThai === 'Đã kết thúc' || conference.trangThai === 'Đã hủy') {
                    registerBtn.style.display = 'none';
                    unregisterBtn.style.display = 'none';
                    registrationStatus.innerHTML = `
                        <div class="alert alert-secondary mt-3">
                            <i class="bi bi-info-circle me-2"></i> Hội nghị này đã kết thúc hoặc đã bị hủy
                        </div>
                    `;
                } else {
                    registerBtn.style.display = 'inline-block';
                    unregisterBtn.style.display = 'none';
                    registrationStatus.innerHTML = '';
                    
                    // Set button data
                    registerBtn.setAttribute('data-id', conferenceId);
                }
            }
        } else {
            // Khi chưa đăng nhập, ẩn tất cả các nút đăng ký/hủy đăng ký trong modal
            registerBtn.style.display = 'none';
            unregisterBtn.style.display = 'none';
            
            // Xóa tất cả các nút đăng nhập cũ trong footer (nếu có)
            const modalFooter = document.querySelector('.modal-footer');
            const oldLoginBtns = modalFooter.querySelectorAll('.login-to-register-btn');
            oldLoginBtns.forEach(btn => modalFooter.removeChild(btn));
            
            // Thêm một nút đăng nhập duy nhất vào footer
            const loginBtn = document.createElement('a');
            loginBtn.href = 'login.html?redirect=conference&id=' + conferenceId;
            loginBtn.className = 'btn btn-primary login-to-register-btn';
            loginBtn.textContent = 'Đăng nhập để đăng ký';
            loginBtn.addEventListener('click', function() {
                // Lưu ID hội nghị vào sessionStorage để sau khi đăng nhập có thể quay lại đăng ký
                sessionStorage.setItem('pendingRegistration', conferenceId);
            });
            modalFooter.appendChild(loginBtn);
            
            // Hiển thị thông báo yêu cầu đăng nhập
            registrationStatus.innerHTML = `
                <div class="alert alert-warning mt-3">
                    <i class="bi bi-exclamation-triangle me-2"></i> Vui lòng đăng nhập để đăng ký tham gia hội nghị này
                </div>
            `;
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('conferenceModal'));
        modal.show();
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

// Register for a conference
function registerForConference(conferenceId) {
    // Check for token in both localStorage and sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
    if (!token) {
        // Lưu ID hội nghị vào sessionStorage để sau khi đăng nhập có thể quay lại đăng ký
        sessionStorage.setItem('pendingRegistration', conferenceId);
        window.location.href = 'login.html';
        return;
    }
    
    // Đã đăng nhập, tiến hành đăng ký
    fetch('/api/tham-gia-hoi-nghi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            idHoiNghi: conferenceId
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Không thể đăng ký tham gia hội nghị');
            });
        }
        return response.json();
    })
    .then(data => {
        alert('Đăng ký tham gia hội nghị thành công!');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('conferenceModal'));
        modal.hide();
        
        // Reload conferences
        loadAllConferences();
        
        // If on registered conferences page, reload it
        if (document.getElementById('registered-conferences-section').style.display !== 'none') {
            loadRegisteredConferences();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Lỗi: ' + error.message);
    });
}

// Cancel registration for a conference
function cancelRegistration(conferenceId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia hội nghị này?')) {
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    fetch(`/api/tham-gia-hoi-nghi/${conferenceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Không thể hủy đăng ký tham gia hội nghị');
            });
        }
        return response.json();
    })
    .then(data => {
        alert('Hủy đăng ký tham gia hội nghị thành công!');
        
        // Reload conferences
        loadAllConferences();
        
        // If on registered conferences page, reload it
        if (document.getElementById('registered-conferences-section').style.display !== 'none') {
            loadRegisteredConferences();
        }
        
        // If modal is open, close it and reload the details
        const modal = bootstrap.Modal.getInstance(document.getElementById('conferenceModal'));
        if (modal) {
            modal.hide();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Lỗi: ' + error.message);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
    
    // View registered conferences button
    document.getElementById('view-registered-btn').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('all-conferences-section').style.display = 'none';
        document.getElementById('registered-conferences-section').style.display = 'block';
        loadRegisteredConferences();
    });
    
    // Back to all conferences button
    document.getElementById('back-to-all-btn').addEventListener('click', function() {
        document.getElementById('all-conferences-section').style.display = 'block';
        document.getElementById('registered-conferences-section').style.display = 'none';
    });
    
    // Register button in modal
    document.getElementById('modal-register-btn').addEventListener('click', function() {
        const conferenceId = this.getAttribute('data-id');
        registerForConference(conferenceId);
    });
    
    // Unregister button in modal
    document.getElementById('modal-unregister-btn').addEventListener('click', function() {
        const conferenceId = this.getAttribute('data-id');
        cancelRegistration(conferenceId);
    });
} 