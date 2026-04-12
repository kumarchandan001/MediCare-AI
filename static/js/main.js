/**
 * main.js — Shared UI Interactions for Karuna AI
 * ────────────────────────────────────────────────
 * Handles: sidebar toggle, mobile menu, topbar, and page transitions.
 */

document.addEventListener('DOMContentLoaded', function () {

  // ── Mobile sidebar toggle ──────────────────────────────────────────────
  const sidebar     = document.getElementById('sidebar');
  const mobileBtn   = document.getElementById('mobile-menu-btn');

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (
        window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !mobileBtn.contains(e.target)
      ) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── Stagger animation for dashboard cards ──────────────────────────────
  const staggerContainers = document.querySelectorAll('.stagger-children');
  staggerContainers.forEach(container => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);
  });

  // ── Active nav highlight (fallback — usually handled by Jinja) ────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    if (item.getAttribute('href') === currentPath) {
      item.classList.add('active');
    }
  });

});
