(() => {
  const root = document.documentElement;
  const button = document.querySelector('.theme-toggle');
  const label = button.querySelector('.theme-label');

  function updateButton() {
    const isDark = root.dataset.theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    label.textContent = isDark ? 'Light' : 'Dark';
  }

  updateButton();
  button.hidden = false;
  button.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('marcelo-theme', theme); } catch (_) { /* Storage can be disabled. */ }
    updateButton();
  });

  const header = document.querySelector('.topbar');
  const headerName = document.querySelector('.header-name');
  const title = document.querySelector('h1');
  let scrollFramePending = false;

  function setHeaderNameVisible(visible) {
    header.classList.toggle('is-scrolled', visible);
    headerName.classList.toggle('is-visible', visible);
    headerName.setAttribute('aria-hidden', String(!visible));
    headerName.tabIndex = visible ? 0 : -1;
  }

  function updateHeaderName() {
    setHeaderNameVisible(title.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom);
    scrollFramePending = false;
  }

  function scheduleHeaderUpdate() {
    if (!scrollFramePending) {
      scrollFramePending = true;
      requestAnimationFrame(updateHeaderName);
    }
  }

  updateHeaderName();
  window.addEventListener('scroll', scheduleHeaderUpdate, { passive: true });
  window.addEventListener('resize', scheduleHeaderUpdate);
  window.addEventListener('pageshow', scheduleHeaderUpdate);
  // Recheck after fonts load or the navigation wraps on a smaller screen.
  new ResizeObserver(scheduleHeaderUpdate).observe(header);
  new ResizeObserver(scheduleHeaderUpdate).observe(title);
})();
