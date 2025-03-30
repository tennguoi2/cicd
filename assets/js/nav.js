// js/load-nav.js
document.addEventListener('DOMContentLoaded', function() {
    // Load navigation
    fetch('/include/navmenu.html')
      .then(response => response.text())
      .then(html => {
        document.getElementById('navmenu').innerHTML = html;
        setActiveLink();
        initDropdowns();
        handleSectionLinks();
      });
  
    // Xử lý active class
    function setActiveLink() {
      const currentPath = window.location.pathname;
      document.querySelectorAll('#navmenu a').forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  
    // Xử lý dropdown
    function initDropdowns() {
      document.querySelectorAll('.toggle-dropdown').forEach(arrow => {
        arrow.parentElement.addEventListener('click', function(e) {
          e.preventDefault();
          const dropdown = this.closest('.dropdown');
          dropdown.classList.toggle('active');
        });
      });
    }

    // Xử lý liên kết đến các phần trong trang chủ
    function handleSectionLinks() {
      // Chỉ xử lý trên trang chính
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        document.querySelectorAll('#navmenu a[href^="/index.html#"]').forEach(link => {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').split('#')[1];
            const targetElement = document.getElementById(target);
            
            if (targetElement) {
              // Tính toán vị trí cuộn, trừ đi chiều cao của header cố định
              const headerHeight = document.querySelector('header').offsetHeight;
              const elementPosition = targetElement.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
              
              // Cuộn mượt đến vị trí
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          });
        });
      }
    }
  });