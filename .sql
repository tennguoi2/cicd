create database login 
use login
CREATE TABLE Users (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    UserPW VARCHAR(255) NOT NULL, -- Hash mật khẩu trước khi lưu
    UserType NVARCHAR(20) NOT NULL CHECK (UserType IN ('DaiBieu', 'NhanVien', 'Admin')),
    HoTen NVARCHAR(255) NOT NULL,
    SDT VARCHAR(15) UNIQUE NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    CoQuan NVARCHAR(255) NULL,
    ChucVu NVARCHAR(255) NULL,
    Role VARCHAR(50) NULL,
    NgayTao DATETIME DEFAULT GETDATE() NOT NULL,
    TrangThai NVARCHAR(50) DEFAULT N'Hoạt động' CHECK (TrangThai IN (N'Hoạt động', N'Đã xóa'))
);

CREATE TABLE HoiNghi (
    ID_HoiNghi INT IDENTITY(1,1) PRIMARY KEY,
    Ten_HoiNghi NVARCHAR(255) NOT NULL,
    MoTa NVARCHAR(1000),
    DiaChi_HoiNghi NVARCHAR(255) NOT NULL,
    ThoiGian_BatDau_HoiNghi DATETIME NOT NULL,
    ThoiGian_KetThuc_HoiNghi DATETIME NOT NULL,
    NgayTao DATETIME DEFAULT GETDATE() NOT NULL,
    UserID_NguoiTao INT NOT NULL,
    TrangThai_HoiNghi NVARCHAR(50) DEFAULT N'Đang diễn ra' NOT NULL CHECK (TrangThai_HoiNghi IN (N'Đang diễn ra', N'Đã kết thúc', N'Đã hủy')),
    FOREIGN KEY (UserID_NguoiTao) REFERENCES Users(ID)
);


CREATE TABLE ThamGiaHoiNghi (
    ID_ThamGiaHoiNghi INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ID_HoiNghi INT NOT NULL, 
    TrangThai_ThamGia NVARCHAR(50) DEFAULT N'Đăng ký' NOT NULL CHECK (TrangThai_ThamGia IN (N'Đăng ký', N'Đã điểm danh', N'Vắng mặt')),
    ThoiGian_DangKy DATETIME DEFAULT GETDATE() NOT NULL,
    ThoiGian_DiemDanh DATETIME NULL,
    GhiChu NVARCHAR(500) NULL,
    FOREIGN KEY (UserID) REFERENCES Users(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_HoiNghi) REFERENCES HoiNghi(ID_HoiNghi) ON DELETE CASCADE
);
select * from HoiNghi

delete from Users where ID = 11