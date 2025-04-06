document.addEventListener('DOMContentLoaded', () => {
    // ===================== INITIAL SETUP =====================
    
    // Cấu hình Axios
    const api = axios.create({
        baseURL: '/api',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });

    // Xử lý interceptor
    api.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
            }
            return Promise.reject(error);
        }
    );

    // ===================== DOM ELEMENTS =====================
    const elements = {
        logoutBtn: document.getElementById('logoutBtn'),
        conferenceForm: document.getElementById('conference-form'),
        conferenceTableBody: document.getElementById('conference-table-body'),
        conferenceId: document.getElementById('conference-id'),
        tenHoiNghi: document.getElementById('tenHoiNghi'), // Đảm bảo ID khớp với HTML
        diaChi: document.getElementById('diaChiHoiNghi'), // Đảm bảo ID khớp với HTML
        thoiGianBatDau: document.getElementById('thoiGianBatDau'), // Đảm bảo ID khớp với HTML
        thoiGianKetThuc: document.getElementById('thoiGianKetThuc'), // Đảm bảo ID khớp với HTML
        moTa: document.getElementById('moTa'), // Đảm bảo ID khớp với HTML
        trangThai: document.getElementById('trangThai'), // Đảm bảo ID khớp với HTML
        resetBtn: document.getElementById('reset-form')
    };

    // ===================== MAIN FUNCTIONS =====================
    const initAdminPage = () => {
        if (!checkAuth()) return;
        
        // Hiển thị thông tin user
        document.getElementById('admin-username').textContent = currentUser.hoTen;
        
        // Gắn sự kiện
        elements.logoutBtn.addEventListener('click', logout);
        elements.conferenceForm.addEventListener('submit', handleConferenceSubmit);
        elements.resetBtn.addEventListener('click', resetForm);
        
        // Load data ban đầu
        loadConferences();
    };

    const loadConferences = async () => {
        try {
            showLoading();
            const { data } = await api.get('/hoi-nghi');
            renderConferenceTable(data);
        } catch (error) {
            console.error('Load conferences error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
            showError(`Không thể tải danh sách hội nghị: ${errorMsg}`);
        } finally {
            hideLoading();
        }
    };

    const handleConferenceSubmit = async (e) => {
        e.preventDefault();
        
        const formData = {
            tenHoiNghi: elements.tenHoiNghi.value,
            diaChiHoiNghi: elements.diaChi.value,
            thoiGianBatDau: elements.thoiGianBatDau.value,
            thoiGianKetThuc: elements.thoiGianKetThuc.value,
            moTa: elements.moTa.value || null,
            trangThai: elements.trangThai.value
        };

        try {
            // Validate
            validateConferenceData(formData);
            
            if (elements.conferenceId.value) {
                const response = await api.put(`/hoi-nghi/${elements.conferenceId.value}`, formData);
                console.log('Update conference response:', response);
                showSuccess('Cập nhật hội nghị thành công!');
            } else {
                const response = await api.post('/hoi-nghi', formData);
                console.log('Create conference response:', response);
                showSuccess('Tạo hội nghị thành công!');
            }
            
            await loadConferences();
            resetForm();
        } catch (error) {
            console.error('Conference submit error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
            showError(`Lỗi: ${errorMessage}`);
            
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    // ===================== HELPER FUNCTIONS =====================
    const validateConferenceData = (data) => {
        const requiredFields = ['tenHoiNghi', 'diaChiHoiNghi', 'thoiGianBatDau', 'thoiGianKetThuc'];
        requiredFields.forEach(field => {
            if (!data[field]) throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
        });

        const startTime = new Date(data.thoiGianBatDau);
        const endTime = new Date(data.thoiGianKetThuc);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error('Thời gian không hợp lệ');
        }
        
        if (startTime >= endTime) {
            throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
        }
    };

    const renderConferenceTable = (conferences) => {
        elements.conferenceTableBody.innerHTML = conferences.map(conf => {
            const confData = {
                ID_HoiNghi: conf.ID_HoiNghi || conf.id,
                Ten_HoiNghi: conf.Ten_HoiNghi || conf.tenHoiNghi,
                DiaChi_HoiNghi: conf.DiaChi_HoiNghi || conf.diaChiHoiNghi,
                ThoiGian_BatDau_HoiNghi: conf.ThoiGian_BatDau_HoiNghi || conf.thoiGianBatDau,
                ThoiGian_KetThuc_HoiNghi: conf.ThoiGian_KetThuc_HoiNghi || conf.thoiGianKetThuc,
                TrangThai_HoiNghi: conf.TrangThai_HoiNghi || conf.trangThai
            };
            
            return `
                <tr>
                    <td>${confData.Ten_HoiNghi}</td>
                    <td>${confData.DiaChi_HoiNghi}</td>
                    <td>${formatDateTime(confData.ThoiGian_BatDau_HoiNghi)}</td>
                    <td>${formatDateTime(confData.ThoiGian_KetThuc_HoiNghi)}</td>
                    <td>${confData.TrangThai_HoiNghi}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2" 
                            onclick="handleEditConference('${confData.ID_HoiNghi}')">Sửa</button>
                        <button class="btn btn-sm btn-danger" 
                            onclick="handleDeleteConference('${confData.ID_HoiNghi}')">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    window.handleEditConference = async (id) => {
        try {
            const { data } = await api.get(`/hoi-nghi/${id}`);
            populateForm(data.conference);
        } catch (error) {
            showError('Không thể tải thông tin hội nghị: ' + (error.message || 'Lỗi không xác định'));
        }
    };

    window.handleDeleteConference = async (id) => {
        if (!confirm('Bạn có chắc chắn muốn xóa hội nghị này?')) return;
        try {
            await api.delete(`/hoi-nghi/${id}`);
            await loadConferences();
            showSuccess('Xóa hội nghị thành công!');
        } catch (error) {
            showError('Xóa hội nghị thất bại: ' + (error.message || 'Lỗi không xác định'));
        }
    };

    const populateForm = (conference) => {
        elements.conferenceId.value = conference.ID_HoiNghi;
        elements.tenHoiNghi.value = conference.Ten_HoiNghi;
        elements.diaChi.value = conference.DiaChi_HoiNghi;
        
        // Format datetime để tương thích với input
        const startDate = new Date(conference.ThoiGian_BatDau_HoiNghi);
        const endDate = new Date(conference.ThoiGian_KetThuc_HoiNghi);
        
        // Kiểm tra tính hợp lệ của ngày
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Thời gian không hợp lệ');
        }
        
        // Format thành chuỗi datetime-local
        elements.thoiGianBatDau.value = startDate.toISOString().slice(0, 16);
        elements.thoiGianKetThuc.value = endDate.toISOString().slice(0, 16);
        
        elements.moTa.value = conference.MoTa || '';
        elements.trangThai.value = conference.TrangThai_HoiNghi;
    };

    const resetForm = () => {
        elements.conferenceForm.reset();
        elements.conferenceId.value = '';
    };

    const formatDateTime = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleString('vi-VN', options);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.clear();
        window.location.href = '/login.html';
    };

    // ===================== UI FUNCTIONS =====================
    const showLoading = () => {
        elements.conferenceTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary"></div>
                </td>
            </tr>`;
    };

    const hideLoading = () => {
        // Không cần thay đổi nếu bạn không muốn làm gì thêm
    };

    const showSuccess = (message) => {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.main-content').prepend(alert);
    };

    const showError = (message) => {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.main-content').prepend(alert);
    };

    // ===================== REGISTRATION MANAGEMENT =====================
    const loadRegistrations = async (conferenceId) => {
        try {
            const registrationTableBody = document.getElementById('registration-table-body');
            registrationTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="spinner-border text-primary"></div>
                    </td>
                </tr>`;
            
            // Sử dụng API endpoint đúng
            const { data } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            
            // Chuyển đổi dữ liệu để phù hợp với cấu trúc ban đầu
            const formattedData = data.map(item => ({
                idDangKy: item.id,
                hoTen: item.hoTen,
                email: item.email,
                soDienThoai: item.sdt,
                trangThaiThamGia: item.trangThai || 'Đã đăng ký'
            }));
            
            renderRegistrationTable(formattedData);
        } catch (error) {
            console.error('Load registrations error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
            showError(`Không thể tải danh sách đăng ký: ${errorMsg}`);
        }
    };

    const renderRegistrationTable = (registrations) => {
        const registrationTableBody = document.getElementById('registration-table-body');
        
        if (!registrations || registrations.length === 0) {
            registrationTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Không có người đăng ký tham gia</td>
                </tr>`;
            
            // Cập nhật thống kê
            document.getElementById('total-registrations').textContent = '0';
            document.getElementById('total-attended').textContent = '0';
            document.getElementById('total-absent').textContent = '0';
            
            return;
        }
        
        // Tính toán thống kê
        const totalRegistrations = registrations.length;
        const totalAttended = registrations.filter(reg => reg.trangThaiThamGia === 'Đã điểm danh').length;
        const totalAbsent = registrations.filter(reg => reg.trangThaiThamGia === 'Vắng mặt').length;
        
        // Cập nhật thống kê
        document.getElementById('total-registrations').textContent = totalRegistrations;
        document.getElementById('total-attended').textContent = totalAttended;
        document.getElementById('total-absent').textContent = totalAbsent;
        
        registrationTableBody.innerHTML = registrations.map(reg => {
            let statusBadge = '';
            
            if (reg.trangThaiThamGia === 'Đã điểm danh') {
                statusBadge = '<span class="badge bg-success">Đã điểm danh</span>';
            } else if (reg.trangThaiThamGia === 'Vắng mặt') {
                statusBadge = '<span class="badge bg-danger">Vắng mặt</span>';
            } else {
                statusBadge = '<span class="badge bg-info">Đã đăng ký</span>';
            }
            
            return `
                <tr>
                    <td>${reg.hoTen || 'Không có thông tin'}</td>
                    <td>${reg.email || 'Không có thông tin'}</td>
                    <td>${reg.soDienThoai || 'Không có thông tin'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" 
                            onclick="handleCancelRegistration('${reg.idDangKy}')">Hủy đăng ký</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    window.handleCancelRegistration = async (registrationId) => {
        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký này?')) return;
        
        try {
            // Tìm userId từ các DOM đã render
            // Lưu ý: Nếu DOM không có data-user-id, ta sẽ sử dụng API với registrationId
            const conferenceId = document.getElementById('conference-select-registration').value;
            
            // Gọi API lấy lại danh sách người tham gia để tìm userId
            const { data } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            const participant = data.find(p => p.id.toString() === registrationId.toString());
            
            if (participant && participant.userId) {
                await api.delete(`/hoi-nghi/${conferenceId}/attendance/${participant.userId}`);
            } else {
                showError('Không thể xác định người dùng để hủy đăng ký');
                return;
            }
            
            await loadRegistrations(conferenceId);
            showSuccess('Hủy đăng ký thành công!');
        } catch (error) {
            showError('Hủy đăng ký thất bại: ' + (error.response?.data?.message || error.message || 'Lỗi không xác định'));
        }
    };

    // ===================== ATTENDANCE MANAGEMENT =====================
    const loadAttendance = async (conferenceId) => {
        try {
            const attendanceTableBody = document.getElementById('attendance-table-body');
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="spinner-border text-primary"></div>
                    </td>
                </tr>`;
            
            // Sử dụng API endpoint đúng
            const { data } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            
            // Chuyển đổi dữ liệu để phù hợp với cấu trúc ban đầu
            const formattedData = data.map(item => ({
                idDangKy: item.id,
                hoTen: item.hoTen,
                email: item.email,
                trangThaiThamGia: item.trangThai || 'Đã đăng ký',
                userId: item.userId
            }));
            
            renderAttendanceTable(formattedData);
        } catch (error) {
            console.error('Load attendance error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
            showError(`Không thể tải danh sách điểm danh: ${errorMsg}`);
        }
    };

    const renderAttendanceTable = (registrations) => {
        const attendanceTableBody = document.getElementById('attendance-table-body');
        
        if (!registrations || registrations.length === 0) {
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Không có người đăng ký tham gia</td>
                </tr>`;
            return;
        }
        
        attendanceTableBody.innerHTML = registrations.map(reg => {
            let statusBadge = '';
            let attendanceButtons = '';
            
            if (reg.trangThaiThamGia === 'Đã điểm danh') {
                statusBadge = '<span class="badge bg-success">Đã điểm danh</span>';
                attendanceButtons = `
                    <button class="btn btn-sm btn-secondary me-2" disabled>Đã điểm danh</button>
                    <button class="btn btn-sm btn-outline-danger" 
                        onclick="markAttendance('${reg.idDangKy}', 'Vắng mặt')">Đánh dấu vắng mặt</button>
                `;
            } else if (reg.trangThaiThamGia === 'Vắng mặt') {
                statusBadge = '<span class="badge bg-danger">Vắng mặt</span>';
                attendanceButtons = `
                    <button class="btn btn-sm btn-outline-success" 
                        onclick="markAttendance('${reg.idDangKy}', 'Đã điểm danh')">Điểm danh</button>
                    <button class="btn btn-sm btn-secondary ms-2" disabled>Đã đánh dấu vắng mặt</button>
                `;
            } else {
                statusBadge = '<span class="badge bg-info">Đã đăng ký</span>';
                attendanceButtons = `
                    <button class="btn btn-sm btn-success me-2" 
                        onclick="markAttendance('${reg.idDangKy}', 'Đã điểm danh')">Điểm danh</button>
                    <button class="btn btn-sm btn-danger" 
                        onclick="markAttendance('${reg.idDangKy}', 'Vắng mặt')">Vắng mặt</button>
                `;
            }
            
            return `
                <tr data-user-id="${reg.userId || ''}">
                    <td>${reg.hoTen || 'Không có thông tin'}</td>
                    <td>${reg.email || 'Không có thông tin'}</td>
                    <td>${statusBadge}</td>
                    <td>${attendanceButtons}</td>
                </tr>
            `;
        }).join('');
    };

    window.markAttendance = async (registrationId, status) => {
        try {
            const conferenceId = document.getElementById('conference-select-attendance').value;
            
            // Gọi API lấy lại danh sách người tham gia để tìm userId
            const { data } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            const participant = data.find(p => p.id.toString() === registrationId.toString());
            
            if (participant && participant.userId) {
                await api.put(`/hoi-nghi/${conferenceId}/attendance/${participant.userId}`, {
                    trangThaiThamGia: status,
                    ghiChu: null
                });
            } else {
                showError('Không thể xác định người dùng để cập nhật trạng thái');
                return;
            }
            
            await loadAttendance(conferenceId);
            showSuccess(`Cập nhật trạng thái tham gia thành công: ${status}`);
        } catch (error) {
            showError('Cập nhật trạng thái thất bại: ' + (error.response?.data?.message || error.message || 'Lỗi không xác định'));
        }
    };

    // ===================== NAVIGATION =====================
    const setupNavigation = () => {
        // Lấy tất cả các liên kết trong thanh điều hướng
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        const sections = document.querySelectorAll('.management-section');
        
        // Thiết lập sự kiện click
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Xóa lớp active
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Thêm lớp active cho liên kết được nhấp
                this.classList.add('active');
                
                // Lấy section-id từ data-section
                const sectionId = this.getAttribute('data-section');
                
                // Ẩn tất cả các phần
                sections.forEach(section => {
                    section.style.display = 'none';
                });
                
                // Hiển thị phần được chọn
                document.getElementById(sectionId).style.display = 'block';
                
                // Nếu là trang đăng ký hoặc điểm danh, tải danh sách hội nghị cho dropdown
                if (sectionId === 'registration-management' || sectionId === 'attendance-management') {
                    loadConferenceDropdowns();
                }
            });
        });
        
        // Thiết lập các nút chức năng điểm danh nhanh
        const quickAttendanceBtn = document.getElementById('quick-attendance-btn');
        if (quickAttendanceBtn) {
            quickAttendanceBtn.addEventListener('click', handleQuickAttendance);
        }
        
        const markAllPresentBtn = document.getElementById('mark-all-present-btn');
        if (markAllPresentBtn) {
            markAllPresentBtn.addEventListener('click', () => markAllAttendance('Đã điểm danh'));
        }
        
        const markAllAbsentBtn = document.getElementById('mark-all-absent-btn');
        if (markAllAbsentBtn) {
            markAllAbsentBtn.addEventListener('click', () => markAllAttendance('Vắng mặt'));
        }
        
        const resetAllAttendanceBtn = document.getElementById('reset-all-attendance-btn');
        if (resetAllAttendanceBtn) {
            resetAllAttendanceBtn.addEventListener('click', () => markAllAttendance('Đã đăng ký'));
        }
    };

    const loadConferenceDropdowns = async () => {
        try {
            const { data } = await api.get('/hoi-nghi');
            
            // Cập nhật dropdown cho quản lý đăng ký
            const registrationSelect = document.getElementById('conference-select-registration');
            registrationSelect.innerHTML = `
                <option value="">Chọn hội nghị...</option>
                ${data.map(conf => `
                    <option value="${conf.ID_HoiNghi || conf.id}">${conf.Ten_HoiNghi || conf.tenHoiNghi}</option>
                `).join('')}
            `;
            
            // Thiết lập sự kiện thay đổi
            registrationSelect.addEventListener('change', function() {
                if (this.value) {
                    loadRegistrations(this.value);
                } else {
                    document.getElementById('registration-table-body').innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">Vui lòng chọn hội nghị</td>
                        </tr>`;
                }
            });
            
            // Cập nhật dropdown cho quản lý điểm danh
            const attendanceSelect = document.getElementById('conference-select-attendance');
            attendanceSelect.innerHTML = `
                <option value="">Chọn hội nghị...</option>
                ${data.map(conf => `
                    <option value="${conf.ID_HoiNghi || conf.id}">${conf.Ten_HoiNghi || conf.tenHoiNghi}</option>
                `).join('')}
            `;
            
            // Thiết lập sự kiện thay đổi
            attendanceSelect.addEventListener('change', function() {
                if (this.value) {
                    loadAttendance(this.value);
                } else {
                    document.getElementById('attendance-table-body').innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center">Vui lòng chọn hội nghị</td>
                        </tr>`;
                }
            });
        } catch (error) {
            console.error('Load conference dropdowns error:', error);
            showError('Không thể tải danh sách hội nghị: ' + (error.response?.data?.message || error.message || 'Lỗi không xác định'));
        }
    };

    // ===================== AUTH CHECK =====================
    const checkAuth = () => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        
        // Get user data
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        window.currentUser = userData ? JSON.parse(userData) : null;
        
        // Check if user is admin
        if (!window.currentUser || window.currentUser.userType !== 'Admin') {
            alert('Bạn không có quyền truy cập trang này!');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    };
    
    // Xử lý điểm danh nhanh theo email
    const handleQuickAttendance = async () => {
        const emailInput = document.getElementById('quick-email-input');
        const resultDiv = document.getElementById('quick-attendance-result');
        const conferenceId = document.getElementById('conference-select-attendance').value;
        
        if (!conferenceId) {
            resultDiv.innerHTML = '<div class="alert alert-warning">Vui lòng chọn hội nghị trước</div>';
            return;
        }
        
        const email = emailInput.value.trim();
        if (!email) {
            resultDiv.innerHTML = '<div class="alert alert-warning">Vui lòng nhập địa chỉ email</div>';
            return;
        }
        
        try {
            resultDiv.innerHTML = '<div class="spinner-border text-primary"></div>';
            
            // Bước 1: Lấy danh sách người tham gia
            const { data: participants } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            
            // Bước 2: Tìm người dùng với email tương ứng
            const participant = participants.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
            
            if (!participant) {
                resultDiv.innerHTML = '<div class="alert alert-danger">Không tìm thấy đăng ký với email này</div>';
                return;
            }
            
            // Bước 3: Điểm danh cho người dùng
            await api.put(`/hoi-nghi/${conferenceId}/attendance/${participant.userId}`, {
                trangThaiThamGia: 'Đã điểm danh',
                ghiChu: 'Điểm danh qua công cụ điểm danh nhanh'
            });
            
            resultDiv.innerHTML = '<div class="alert alert-success">Điểm danh thành công!</div>';
            
            // Làm mới danh sách điểm danh
            await loadAttendance(conferenceId);
            
            // Xóa input email
            emailInput.value = '';
        } catch (error) {
            console.error('Quick attendance error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Không tìm thấy đăng ký với email này';
            resultDiv.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
        }
    };
    
    // Xử lý điểm danh hàng loạt
    const markAllAttendance = async (status) => {
        const conferenceId = document.getElementById('conference-select-attendance').value;
        
        if (!conferenceId) {
            showError('Vui lòng chọn hội nghị trước');
            return;
        }
        
        if (!confirm(`Bạn có chắc chắn muốn đánh dấu tất cả người tham gia thành ${status}?`)) {
            return;
        }
        
        try {
            showLoading();
            
            // Lấy danh sách tất cả người tham gia
            const { data: participants } = await api.get(`/hoi-nghi/${conferenceId}/nguoi-tham-gia`);
            
            // Cập nhật từng người một
            let successCount = 0;
            for (const participant of participants) {
                try {
                    await api.put(`/hoi-nghi/${conferenceId}/attendance/${participant.userId}`, {
                        trangThaiThamGia: status,
                        ghiChu: `Cập nhật hàng loạt - ${new Date().toLocaleString('vi-VN')}`
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Error updating participant ${participant.id}:`, error);
                }
            }
            
            await loadAttendance(conferenceId);
            showSuccess(`Đã cập nhật ${successCount}/${participants.length} người tham gia thành ${status}!`);
        } catch (error) {
            console.error('Mark all attendance error:', error);
            showError('Cập nhật trạng thái hàng loạt thất bại: ' + (error.response?.data?.message || error.message || 'Lỗi không xác định'));
        }
    };

    // ===================== INITIALIZATION =====================
    setupNavigation();
    initAdminPage();
});
