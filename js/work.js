/* The archive is readable and its anchor links work without JavaScript. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const directory = document.querySelector('.category-directory');
    const sections = [...document.querySelectorAll('.work-section')];
    if (!directory) return;

    const entranceTargets = [document.querySelector('.archive-intro'), ...sections].filter(Boolean);
    const previews = [...document.querySelectorAll('.work-project')];
    const targets = [...entranceTargets, ...previews];
    const pendingClass = target => target.matches('.work-project') ? 'is-pending' : 'is-waiting';
    let entrance;
    let departure;
    const reset = target => target.classList.toggle(pendingClass(target), !reducedMotion.matches);
    const reveal = target => target.classList.remove(pendingClass(target));
    const observe = () => targets.forEach(target => {
        entrance.observe(target);
        departure.observe(target);
    });

    if ('IntersectionObserver' in window) {
        // Observe stable layout boxes, not the moving artwork. Enter 32px inside
        // the viewport; re-arm only after leaving it by 64px (hysteresis).
        entrance = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.closest('[hidden]')) reveal(entry.target);
            });
        }, { threshold: 0, rootMargin: '-32px 0px' });
        departure = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) reset(entry.target);
            });
        }, { threshold: 0, rootMargin: '64px 0px' });
        sections.forEach(section => {
            section.querySelectorAll('.work-project').forEach((project, index) => {
                const stagger = section.id === 'graphic' ? 60 : 90;
                project.style.setProperty('--preview-delay', `${320 + (index % 4) * stagger}ms`);
            });
        });
        targets.forEach(reset);
        // Commit the starting styles before the observers reveal visible content.
        void directory.offsetWidth;
        observe();
        document.addEventListener('focusin', event => {
            const project = event.target.closest('.work-project');
            if (project) {
                reveal(project);
                reveal(project.closest('.work-section'));
            }
        });
        reducedMotion.addEventListener('change', () => {
            // A preference change must never hide content currently being read.
            targets.forEach(reveal);
        });
    }

    let selectedCategory = 'all-work';
    directory.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const category = link.hash.slice(1);
        if (category !== 'all-work' && !sections.some(section => section.id === category)) return;
        event.preventDefault();
        if (category === selectedCategory) return;
        selectedCategory = category;
        // Re-observe after filtering so even already-intersecting content gets
        // a fresh entry notification. No queued events from the old layout survive.
        entrance?.takeRecords();
        departure?.takeRecords();
        entrance?.disconnect();
        departure?.disconnect();
        sections.forEach(section => {
            section.hidden = category !== 'all-work' && section.id !== category;
            if (entrance) {
                reset(section);
                section.querySelectorAll('.work-project').forEach(reset);
            }
        });
        directory.querySelectorAll('a').forEach(item => {
            if (item.hash === `#${category}`) item.setAttribute('aria-current', 'true');
            else item.removeAttribute('aria-current');
        });
        if (entrance) {
            void directory.offsetWidth;
            observe();
        }
        history.replaceState(null, '', `#${category}`);
    });

    // Only decorative pseudo-elements move with scrolling; content stays fixed.
    const driftTargets = [
        document.querySelector('.archive-intro'),
        document.querySelector('.creative-section'),
        document.querySelector('.graphic-section')
    ].filter(Boolean);
    let driftFrame = 0;
    const updateDrift = () => {
        driftFrame = 0;
        const height = window.innerHeight;
        driftTargets.forEach(target => {
            const rect = target.getBoundingClientRect();
            const progress = Math.max(-1, Math.min(1, (height / 2 - (rect.top + rect.height / 2)) / height));
            target.style.setProperty('--decor-drift', reducedMotion.matches ? '0px' : `${progress * 10}px`);
            target.style.setProperty('--paper-drift', reducedMotion.matches ? '0px' : `${progress * 3}px`);
        });
    };
    const requestDrift = () => {
        if (!driftFrame) driftFrame = requestAnimationFrame(updateDrift);
    };
    window.addEventListener('scroll', () => { if (!reducedMotion.matches) requestDrift(); }, { passive: true });
    window.addEventListener('resize', requestDrift, { passive: true });
    reducedMotion.addEventListener('change', requestDrift);
    requestDrift();

    // Opt-in hover video: set data-preview-src to a real asset when available.
    document.querySelectorAll('.motion-preview[data-preview-src]').forEach(project => {
        let video;
        const stop = () => { if (video) { video.pause(); video.hidden = true; } };
        project.addEventListener('pointerenter', event => {
            if (reducedMotion.matches || event.pointerType !== 'mouse') return;
            if (!video) {
                video = document.createElement('video');
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = 'none';
                video.setAttribute('aria-hidden', 'true');
                video.src = project.dataset.previewSrc;
                project.querySelector('.work-image').append(video);
            }
            video.hidden = false;
            video.play().catch(stop);
        });
        project.addEventListener('pointerleave', stop);
        reducedMotion.addEventListener('change', stop);
    });
})();
