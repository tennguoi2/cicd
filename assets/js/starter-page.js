document.addEventListener('DOMContentLoaded', () => {
    const api = axios.create({
        baseURL: '/api',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });

    let currentUser = null;
    let registeredConferences = new Set();

    // Check authentication
    const checkAuth = () => {
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        if (!userData) {
            window.location.href = '/login.html';
            return false;
        }
        currentUser = userData;
        return true;
    };

    // Load all conferences
    const loadConferences = async () => {
        try {
            const { data } = await api.get('/hoi-nghi');
            renderConferences(data);
            loadRegisteredConferences();
        } catch (error) {
            console.error('Error loading conferences:', error);
            showError('Không thể tải danh sách hội nghị');
        }
    };

    // Load user's registered conferences
    const loadRegisteredConferences = async () => {
        try {
            const { data } = await api.get(`/thamgiahoinghi?userId=${currentUser.id}`);
            registeredConferences = new Set(data.map(conf => conf.ID_HoiNghi));
            updateUI();
        } catch (error) {
            console.error('Error loading registered conferences:', error);
        }
    };

    // Render conferences
    const renderConferences = (conferences) => {
        const container = document.getElementById('conferencesList');
        const emptyState = document.getElementById('emptyState');
        
        if (conferences.length === 0) {
            emptyState.classList.remove('d-none');
            container.innerHTML = '';
            return;
        }

        emptyState.classList.add('d-none');
        container.innerHTML = conferences.map(conf => `
            <div class="col-md-4">
                <div class="card pricing-card">
                    ${registeredConferences.has(conf.ID_HoiNghi) ? 
                        `<div class="registered-badge">Đã đăng ký</div>` : ''}
                    <div class="card-body">
                        <h5 class="card-title">${conf.Ten_HoiNghi}</h5>
                        <div class="conference-date">
                            ${formatDate(conf.ThoiGian_BatDau_HoiNghi)} - 
                            ${formatDate(conf.ThoiGian_KetThuc_HoiNghi)}
                        </div>
                        <div class="conference-location">
                            <i class="bi bi-geo-alt"></i>${conf.DiaChi_HoiNghi}
                        </div>
                        <div class="participants-count">
                            <i class="bi bi-people"></i>${conf.SoLuongThamGia} người tham gia
                        </div>
                        <button class="btn btn-primary btn-register" 
                            onclick="showConferenceDetail('${conf.ID_HoiNghi}')">
                            Chi tiết
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Show conference details modal
    window.showConferenceDetail = async (id) => {
        try {
            const { data } = await api.get(`/hoi-nghi/${id}`);
            populateModal(data);
            $('#conferenceDetailModal').modal('show');
        } catch (error) {
            console.error('Error loading conference details:', error);
            showError('Không thể tải chi tiết hội nghị');
        }
    };

    // Populate modal with conference data
    const populateModal = (conference) => {
        document.getElementById('modalTitle').textContent = conference.Ten_HoiNghi;
        document.getElementById('modalDate').textContent = 
            `${formatDate(conference.ThoiGian_BatDau_HoiNghi)} - 
            ${formatDate(conference.ThoiGian_KetThuc_HoiNghi)}`;
        document.getElementById('modalLocation').textContent = conference.DiaChi_HoiNghi;
        document.getElementById('modalDescription').textContent = conference.MoTa;
        document.getElementById('modalParticipants').textContent = 
            `${conference.SoLuongThamGia} người tham gia`;

        const registerBtn = document.getElementById('registerBtn');
        const cancelBtn = document.getElementById('cancelRegistrationBtn');

        if (registeredConferences.has(conference.ID_HoiNghi)) {
            registerBtn.classList.add('d-none');
            cancelBtn.classList.remove('d-none');
        } else {
            registerBtn.classList.remove('d-none');
            cancelBtn.classList.add('d-none');
        }

        registerBtn.onclick = () => joinConference(conference.ID_HoiNghi);
        cancelBtn.onclick = () => cancelRegistration(conference.ID_HoiNghi);
    };

    // Join conference
    const joinConference = async (id) => {
        try {
            await api.post('/thamgiahoinghi', {
                ID_HoiNghi: id,
                ID_NguoiDung: currentUser.id
            });
            registeredConferences.add(id);
            updateUI();
            showSuccess('Đăng ký tham gia thành công!');
            $('#conferenceDetailModal').modal('hide');
        } catch (error) {
            console.error('Error joining conference:', error);
            showError('Đăng ký tham gia thất bại');
        }
    };

    // Cancel registration
    const cancelRegistration = async (id) => {
        try {
            await api.delete(`/thamgiahoinghi/${id}/${currentUser.id}`);
            registeredConferences.delete(id);
            updateUI();
            showSuccess('Hủy đăng ký thành công!');
            $('#conferenceDetailModal').modal('hide');
        } catch (error) {
            console.error('Error canceling registration:', error);
            showError('Hủy đăng ký thất bại');
        }
    };

    // Update UI based on registration status
    const updateUI = () => {
        const myConferencesSection = document.getElementById('myConferences');
        if (registeredConferences.size > 0) {
            myConferencesSection.classList.remove('d-none');
        } else {
            myConferencesSection.classList.add('d-none');
        }
        loadConferences();
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Show success message
    const showSuccess = (message) => {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.main').prepend(alert);
    };

    // Show error message
    const showError = (message) => {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.main').prepend(alert);
    };

    // Initialize
    if (checkAuth()) {
        loadConferences();
    }
});
