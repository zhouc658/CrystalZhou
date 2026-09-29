/* The archive is readable and its anchor links work without JavaScript. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const directory = document.querySelector('.category-directory');
    const sections = [...document.querySelectorAll('.work-section')];
    if (!directory) return;

    let selectedCategory = null;
    directory.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const section = document.querySelector(link.getAttribute('href'));
        if (!section) return;
        event.preventDefault();
        selectedCategory = selectedCategory === section.id ? null : section.id;
        sections.forEach(item => { item.hidden = selectedCategory !== null && item.id !== selectedCategory; });
        directory.querySelectorAll('a').forEach(item => {
            if (item.hash === `#${selectedCategory}`) item.setAttribute('aria-current', 'true');
            else item.removeAttribute('aria-current');
        });
        history.replaceState(null, '', selectedCategory ? `#${selectedCategory}` : '#all-work');
    });

    if ('IntersectionObserver' in window) {
        const entrance = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.remove('is-waiting');
                entrance.unobserve(entry.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
        const entranceTargets = [document.querySelector('.archive-intro'), ...sections].filter(Boolean);
        entranceTargets.forEach(section => {
            if (!reducedMotion.matches) section.classList.add('is-waiting');
            entrance.observe(section);
        });
        const previews = [...document.querySelectorAll('.work-project')];
        const previewEntrance = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.remove('is-pending');
                previewEntrance.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        sections.forEach(section => {
            section.querySelectorAll('.work-project').forEach((project, index) => {
                const stagger = section.id === 'graphic' ? 60 : 90;
                project.style.setProperty('--preview-delay', `${320 + (index % 4) * stagger}ms`);
                if (!reducedMotion.matches) project.classList.add('is-pending');
                previewEntrance.observe(project);
            });
        });
        // Keyboard navigation must never land on an unrevealed preview.
        document.addEventListener('focusin', event => {
            event.target.closest('.work-project')?.classList.remove('is-pending');
        });
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) {
                entranceTargets.forEach(section => section.classList.remove('is-waiting'));
                previews.forEach(project => project.classList.remove('is-pending'));
            }
        });
    }

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
