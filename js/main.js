/* Shared navigation behavior. Links remain usable without JavaScript. */
(() => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const updateHeader = () => {
        // Hysteresis avoids flicker as the sticky header changes height.
        if (window.scrollY > 48) header.classList.add('is-scrolled');
        else if (window.scrollY < 8) header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('pageshow', updateHeader);
    updateHeader();
})();
