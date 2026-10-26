/* ===== Всплывающие уведомления (тосты) ===== */
'use strict';

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Автоматически скрываем через 3 секунды
  setTimeout(() => {
    toast.style.transition = 'opacity .25s, transform .25s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}