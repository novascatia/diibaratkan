/**
 * Rama's Minimalist Site — Full-Screen Gate Transitions & Engine
 * Cinematic dual-gate closing and opening transition (like before)
 * connecting index.html and project.html seamlessly.
 */

(function () {
  'use strict';

  const TRANSITION_STORAGE_KEY = 'RAMARAM_TRANSITION_ACTIVE';
  const stage = document.getElementById('page-transition-stage');
  const titleEl = document.getElementById('transition-title');

  // ==========================================================================
  // 1. INCOMING PAGE LOAD: SWEEP GATES OPEN
  // ==========================================================================

  try {
    const incoming = sessionStorage.getItem(TRANSITION_STORAGE_KEY);
    if (incoming && stage) {
      sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
      const parsed = JSON.parse(incoming);
      if (titleEl && parsed.title) {
        titleEl.textContent = parsed.title;
      }

      // Start with gates closed over viewport
      stage.classList.add('is-active', 'is-closing');

      // Allow paint, then smoothly sweep gates open
      requestAnimationFrame(() => {
        setTimeout(() => {
          stage.classList.remove('is-closing');
          setTimeout(() => {
            stage.classList.remove('is-active');
          }, 520);
        }, 80);
      });
    } else if (stage) {
      stage.classList.remove('is-closing', 'is-active');
    }
  } catch (_) {
    if (stage) stage.classList.remove('is-closing', 'is-active');
  }

  // Handle browser Back / Forward cache (BFCache)
  window.addEventListener('pageshow', () => {
    if (stage) {
      stage.classList.remove('is-closing', 'is-active');
    }
  });

  // ==========================================================================
  // 2. OUTGOING PAGE NAVIGATION: SLAM GATES SHUT
  // ==========================================================================

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, hash links, mailto, tel, target="_blank", or modifier clicks
    if (
      href.startsWith('http') ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank' ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey
    ) {
      return;
    }

    // Same-page check
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (href === currentPath) return;

    e.preventDefault();

    const isGoingToProject = href.includes('project');
    const transitionTitle = isGoingToProject ? 'OPENING PROJECTS' : 'OPENING BIOGRAPHY';

    if (titleEl) {
      titleEl.textContent = transitionTitle;
    }

    try {
      sessionStorage.setItem(
        TRANSITION_STORAGE_KEY,
        JSON.stringify({ title: transitionTitle })
      );
    } catch (_) {}

    // Slam gates shut
    if (stage) {
      stage.classList.add('is-active', 'is-closing');
    }

    // Navigate to target URL after gates meet in the center
    setTimeout(() => {
      window.location.href = href;
    }, 460);
  });

  // ==========================================================================
  // 3. AUTO-HIDING NAVIGATION BAR (ramaram.my.id style)
  // ==========================================================================

  let lastScroll = 0;
  let ticking = false;
  const navbar = document.getElementById('navbar');

  if (navbar) {
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

            if (currentScroll > lastScroll && currentScroll > 50) {
              navbar.classList.add('navhidden');
            } else {
              navbar.classList.remove('navhidden');
            }

            lastScroll = currentScroll <= 0 ? 0 : currentScroll;
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }
})();
