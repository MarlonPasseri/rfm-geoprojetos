(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function activePanel() {
    return document.querySelector('.tab-panel.active');
  }

  function focusActiveSearch() {
    const panel = activePanel();
    const input = panel && panel.querySelector('input[type="text"]');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function installKeyboardNavigation() {
    document.addEventListener('keydown', function (event) {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        focusActiveSearch();
        return;
      }

      const target = event.target;
      const typing = target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
      if (typing) return;

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const tabs = Array.from(document.querySelectorAll('.tab-btn'));
      const current = tabs.findIndex(function (tab) { return tab.classList.contains('active'); });
      if (current < 0) return;
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      const next = (current + dir + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus({ preventScroll: true });
    });
  }

  function installPanelTransitions() {
    const original = window.switchTab;
    if (typeof original !== 'function') return;
    window.switchTab = function (name) {
      const previous = activePanel();
      if (previous && !reduceMotion) {
        previous.classList.add('is-leaving');
        setTimeout(function () { previous.classList.remove('is-leaving'); }, 260);
      }
      original(name);
      const next = document.getElementById('tab-' + name);
      if (next && !reduceMotion) {
        next.classList.remove('is-entering');
        void next.offsetWidth;
        next.classList.add('is-entering');
        setTimeout(function () { next.classList.remove('is-entering'); }, 420);
      }
    };
  }

  function installCardTilt() {
    if (reduceMotion || window.matchMedia('(pointer: coarse)').matches) return;
    document.addEventListener('pointermove', function (event) {
      const card = event.target.closest('.kpi, .panel, .compare-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      card.style.setProperty('--mx', ((x + 1) * 50).toFixed(1) + '%');
      card.style.setProperty('--my', ((y + 1) * 50).toFixed(1) + '%');
      card.style.setProperty('--rx', (-y * 1.1).toFixed(2) + 'deg');
      card.style.setProperty('--ry', (x * 1.1).toFixed(2) + 'deg');
    }, { passive: true });

    document.addEventListener('pointerout', function (event) {
      const card = event.target.closest('.kpi, .panel, .compare-card');
      if (!card || card.contains(event.relatedTarget)) return;
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }

  function installScrollReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll('.kpi, .panel, .compare-card, .controls');
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (item) {
      item.classList.add('reveal-item');
      observer.observe(item);
    });
  }

  function installPointerMode() {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') document.documentElement.classList.add('keyboard-mode');
    });
    document.addEventListener('pointerdown', function () {
      document.documentElement.classList.remove('keyboard-mode');
    }, { passive: true });
  }

  function boot() {
    installPointerMode();
    installKeyboardNavigation();
    installPanelTransitions();
    installCardTilt();
    window.requestAnimationFrame(installScrollReveal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
