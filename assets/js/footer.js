// js/load-footer.js
document.addEventListener('DOMContentLoaded', function() {
    // Load footer
    fetch('/include/footer.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('footer').innerHTML = html; // Giả sử footer có id="footer"
        })
        .catch(error => console.error('Lỗi khi tải footer:', error));
});