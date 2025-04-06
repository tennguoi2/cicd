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

    // ===================== START APPLICATION =====================
    initAdminPage();
});
