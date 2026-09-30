/* Shared Home / Work preview lifecycle; full project players are untouched. */
(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const states = new Map();
    document.querySelectorAll('[data-preview-slideshow], video[data-preview-video]').forEach(element => {
        const video = element.matches('video');
        const slides = video ? [] : [...element.querySelectorAll('.preview-slide')];
        const state = {element, video, slides, visible: false, index: 0, timer: null};
        states.set(element, state);
        if (video) {
            const silence = () => { element.muted = true; if (element.volume !== 0) element.volume = 0; };
            silence();
            element.addEventListener('volumechange', silence);
            element.addEventListener('canplay', () => update(state));
        }
    });
    function update(state) {
        const {element, video, slides} = state;
        const active = state.visible && !document.hidden && !reduced.matches && !element.closest('[hidden]');
        if (video) {
            if (active) element.play().catch(() => {});
            else element.pause();
            // Reload just on preference changes to restore the static poster.
            if (reduced.matches && !state.static) { element.removeAttribute('autoplay'); element.load(); }
            state.static = reduced.matches;
            return;
        }
        clearTimeout(state.timer);
        if (reduced.matches) {
            state.index = 0;
            slides.forEach((slide, i) => { slide.classList.toggle('is-active', i === 0); slide.setAttribute('aria-hidden', String(i !== 0)); });
        }
        if (!active || slides.length < 2) return;
        const next = slides[(state.index + 1) % slides.length];
        if (next.dataset.src) { next.src = next.dataset.src; delete next.dataset.src; }
        state.timer = setTimeout(() => {
            if (next.complete && next.naturalWidth) {
                slides[state.index].classList.remove('is-active');
                slides[state.index].setAttribute('aria-hidden', 'true');
                state.index = (state.index + 1) % slides.length;
                next.classList.add('is-active'); next.setAttribute('aria-hidden', 'false');
            }
            update(state);
        }, 5000);
    }
    states.forEach(update);
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
            const state = states.get(entry.target); state.visible = entry.isIntersecting; update(state);
        }));
        states.forEach(state => observer.observe(state.element));
    } else states.forEach(state => { state.visible = true; update(state); });
    document.addEventListener('visibilitychange', () => states.forEach(update));
    reduced.addEventListener('change', () => states.forEach(update));
})();
