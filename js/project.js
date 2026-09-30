/* Native controls always work without JS. Decorative loops are opt-in. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const loops = [...document.querySelectorAll('video[data-decorative-loop]')];
    if (!loops.length) return;
    const visible = new Set();
    const sync = video => {
        if (reducedMotion.matches || document.hidden || !visible.has(video)) video.pause();
        else video.play().catch(() => { /* Native play button remains available. */ });
    };
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
            sync(entry.target);
        }), { threshold: 0.1 });
        loops.forEach(video => observer.observe(video));
    }
    reducedMotion.addEventListener('change', () => loops.forEach(sync));
    document.addEventListener('visibilitychange', () => loops.forEach(sync));
})();
