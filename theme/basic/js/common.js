/* BOXMEDIA clone — common.js (vanilla JS, no jQuery) */
(function () {
    'use strict';

    /* ---------- mobile menu ---------- */
    var btnMenu = document.getElementById('btnMenu');
    var btnClose = document.getElementById('btnMenuClose');
    var mMenu = document.getElementById('mobileMenu');
    var menuDim = document.getElementById('menuDim');

    function openMenu() {
        if (!mMenu) return;
        mMenu.classList.add('is-open');
        mMenu.setAttribute('aria-hidden', 'false');
        if (btnMenu) btnMenu.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        if (!mMenu) return;
        mMenu.classList.remove('is-open');
        mMenu.setAttribute('aria-hidden', 'true');
        if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (btnMenu) btnMenu.addEventListener('click', openMenu);
    if (btnClose) btnClose.addEventListener('click', closeMenu);
    if (menuDim) menuDim.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });

    /* ---------- scrolled header / scroll-top ---------- */
    var header = document.getElementById('header');
    var scrollTopBtn = document.getElementById('scrollTop');

    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (header) header.classList.toggle('is-scrolled', y > 30);
        if (scrollTopBtn) scrollTopBtn.classList.toggle('is-show', y > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ---------- counter (숫자로 보는 박스미디어) ---------- */
    var counters = document.querySelectorAll('[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                animateCount(entry.target);
                io.unobserve(entry.target);
            });
        }, { threshold: 0.4 });
        counters.forEach(function (el) { io.observe(el); });
    } else {
        counters.forEach(function (el) {
            el.textContent = el.getAttribute('data-count');
        });
    }

    function animateCount(el) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var duration = 1600;
        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            el.textContent = Math.round(target * eased).toLocaleString('ko-KR');
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---------- hero video rotation (메인 히어로 영상 로테이션) ----------
       - 영상이 끝나면 다음 슬라이드로 (1회 재생, loop 없음 — 원본 순서 1→5 루프)
       - 하단 타임라인: 활성 항목의 게이지가 영상 진행률만큼 차오름, 클릭 시 점프
       - 첫 영상만 즉시 로드, 다음 영상은 현재 슬라이드 재생 중 미리 로드
       - 영상 정지/로드 실패 대비 슬라이드당 최대 20초 안전 타이머              */
    var heroSlider = document.getElementById('heroSlider');
    if (heroSlider) {
        var slides = heroSlider.querySelectorAll('.hero-slide');
        var tlItems = document.querySelectorAll('.hero-dots__item');
        var FADE_MS = 1200;     // 크로스페이드 시간 (CSS transition과 동일)
        var MAX_SLIDE_MS = 20000; // 안전 타이머: 이 시간 지나면 강제 전환
        var heroCur = 0;
        var fallbackTimer = null;

        var videoOf = function (i) { return slides[i].querySelector('video'); };
        var barOf = function (i) {
            return tlItems[i] ? tlItems[i].querySelector('.hero-dots__bar') : null;
        };

        var prepareNext = function (i) {
            var v = videoOf(i);
            if (v && v.readyState === 0) v.load(); // preload="none" 상태면 로드 시작
        };

        var playSafe = function (v) {
            if (!v) return;
            try { v.currentTime = 0; } catch (e) {}
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
        };

        // 활성 영상 진행률 → 타임라인 게이지
        (function gauge() {
            var v = videoOf(heroCur);
            var bar = barOf(heroCur);
            if (v && bar && v.duration) {
                bar.style.width = Math.min(v.currentTime / v.duration * 100, 100) + '%';
            }
            requestAnimationFrame(gauge);
        })();

        var showSlide = function (next) {
            next = (next + slides.length) % slides.length;
            var prev = heroCur;
            if (next === prev) return;
            heroCur = next;

            playSafe(videoOf(next));
            slides[next].classList.add('is-active');
            slides[prev].classList.remove('is-active');

            for (var i = 0; i < tlItems.length; i++) {
                tlItems[i].classList.toggle('is-active', i === next);
                var b = barOf(i);
                if (b) b.style.width = i === next ? '0%' : '0%';
            }

            // 크로스페이드 종료 후 지나간 영상 정지
            setTimeout(function () {
                if (prev !== heroCur) {
                    var pv = videoOf(prev);
                    if (pv) pv.pause();
                }
            }, FADE_MS + 100);

            armSlide();
        };

        // 슬라이드 시작 시: 다음 영상 미리 로드 + 안전 타이머 재설정
        var armSlide = function () {
            prepareNext((heroCur + 1) % slides.length);
            if (fallbackTimer) clearTimeout(fallbackTimer);
            fallbackTimer = setTimeout(function () {
                showSlide(heroCur + 1);
            }, MAX_SLIDE_MS);
        };

        if (slides.length > 1) {
            // 영상이 끝나면 다음으로 (loop 제거됨)
            for (var i = 0; i < slides.length; i++) {
                (function (idx) {
                    var v = videoOf(idx);
                    if (v) v.addEventListener('ended', function () {
                        if (idx === heroCur) showSlide(heroCur + 1);
                    });
                })(i);
            }
            // 타임라인 클릭으로 점프
            for (var j = 0; j < tlItems.length; j++) {
                (function (idx) {
                    tlItems[idx].addEventListener('click', function () { showSlide(idx); });
                })(j);
            }
            armSlide();
        }
    }
})();
