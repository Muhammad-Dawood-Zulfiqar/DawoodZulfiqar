(() => {
    const html = document.documentElement;
    const THEME_KEY = 'cmd-portfolio-theme';

    /* ---------- Theme ---------- */
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
        html.setAttribute('data-theme', stored);
    }

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', next);
            localStorage.setItem(THEME_KEY, next);
        });
    }

    /* ---------- Mobile menu ---------- */
    const menuBtn = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            const open = navLinks.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', String(open));
        });
        navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            navLinks.classList.remove('is-open');
            menuBtn.setAttribute('aria-expanded', 'false');
        }));
    }

    /* ---------- Nav shadow on scroll ---------- */
    const nav = document.getElementById('siteNav');
    if (nav) {
        const onScroll = () => {
            nav.classList.toggle('is-scrolled', window.scrollY > 30);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---------- Reveal on scroll ---------- */
    const reveals = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(el => io.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('is-visible'));
    }

    /* ---------- Footer year ---------- */
    const yr = document.getElementById('footerYear');
    if (yr) yr.textContent = String(new Date().getFullYear());

    /* ---------- Project galleries ---------- */
    document.querySelectorAll('[data-gallery]').forEach(initGallery);

    function showFallback(root) {
        const projectRoot = root.closest('.project');
        const title = projectRoot?.querySelector('h3')?.textContent?.trim() || 'Project';
        const initials = title
            .split(/\s+/)
            .map(w => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();

        root.replaceChildren();
        root.classList.add('gallery-fallback');

        const ring = document.createElement('div');
        ring.className = 'fallback-ring';
        const mono = document.createElement('span');
        mono.className = 'fallback-mono';
        mono.textContent = initials;
        ring.appendChild(mono);

        const label = document.createElement('div');
        label.className = 'fallback-label';
        label.textContent = title;

        const sub = document.createElement('div');
        sub.className = 'fallback-sub';
        sub.textContent = 'Visuals coming soon';

        root.append(ring, label, sub);
    }

    function initGallery(root) {
        const track = root.querySelector('.gallery-track');
        const prevBtn = root.querySelector('.gallery-nav.prev');
        const nextBtn = root.querySelector('.gallery-nav.next');
        const dotsHost = root.querySelector('.gallery-dots');
        if (!track) return;

        const slides = Array.from(track.querySelectorAll('.gallery-slide'));

        // Hide slides whose image fails to load. Track per-slide load state.
        let remaining = slides.length;
        let index = 0;

        const refresh = () => {
            const visible = slides.filter(s => !s.classList.contains('is-broken'));
            const count = visible.length;

            // Show a designed fallback if nothing loaded
            if (count === 0) {
                showFallback(root);
                return;
            }

            // Update dots
            if (dotsHost) {
                dotsHost.replaceChildren();
                if (count > 1) {
                    visible.forEach((_, i) => {
                        const btn = document.createElement('button');
                        btn.className = 'dot' + (i === index ? ' is-active' : '');
                        btn.setAttribute('aria-label', `Image ${i + 1}`);
                        btn.addEventListener('click', () => goTo(i, visible));
                        dotsHost.appendChild(btn);
                    });
                }
            }

            // Hide arrows if only one image
            if (prevBtn) prevBtn.classList.toggle('is-hidden', count <= 1);
            if (nextBtn) nextBtn.classList.toggle('is-hidden', count <= 1);

            // Rebuild track ordering: keep only visible slides
            slides.forEach(s => {
                s.style.display = s.classList.contains('is-broken') ? 'none' : '';
            });

            goTo(Math.min(index, count - 1), visible);
        };

        const goTo = (i, visible) => {
            const list = visible || slides.filter(s => !s.classList.contains('is-broken'));
            if (list.length === 0) return;
            index = (i + list.length) % list.length;
            // Translate by index of i among visible (since hidden have display:none they take no space)
            // But flex still gives them 0 width when display:none, so each visible is 100%.
            track.style.transform = `translateX(-${index * 100}%)`;
            if (dotsHost) {
                dotsHost.querySelectorAll('.dot').forEach((d, di) => {
                    d.classList.toggle('is-active', di === index);
                });
            }
        };

        slides.forEach(slide => {
            const img = slide.querySelector('img');
            if (!img) {
                slide.classList.add('is-broken');
                if (--remaining <= 0) refresh();
                return;
            }
            const handleDone = (ok) => {
                if (!ok) slide.classList.add('is-broken');
                if (--remaining <= 0) refresh();
            };
            if (img.complete) {
                handleDone(img.naturalWidth > 0);
            } else {
                img.addEventListener('load', () => handleDone(true), { once: true });
                img.addEventListener('error', () => handleDone(false), { once: true });
            }
        });

        if (prevBtn) prevBtn.addEventListener('click', () => {
            const list = slides.filter(s => !s.classList.contains('is-broken'));
            goTo(index - 1, list);
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            const list = slides.filter(s => !s.classList.contains('is-broken'));
            goTo(index + 1, list);
        });

        // Optional swipe support
        let startX = null;
        track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', e => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            startX = null;
            const list = slides.filter(s => !s.classList.contains('is-broken'));
            if (Math.abs(dx) < 40) return;
            goTo(index + (dx < 0 ? 1 : -1), list);
        });
    }
})();
