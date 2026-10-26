/**
 * @fileoverview Mobile Legends: Bang Bang (MLBB) Celestial Interactive Engine for diibaratkan.my.id
 * Handles:
 * - MLBB "Match Found / Entering Land of Dawn" Loading Screen Gate transitions between index.html, about.html, project.html
 * - Persistent Land of Dawn BGM Player (Local MLBB MP3s + cross-page session state)
 * - Web Audio API synthesized MLBB UI Sound Effects (Mana Hover, Mythic Confirm, Match Found Gate, Victory Chime)
 * - Ambient Celestial Mana Particles & Click Ripple Canvas
 * - Page-specific interactivity (Matchmaking Queue modal, Emblem Loadout tabs, Quick Chat, Interactive Land of Dawn Map)
 */

(() => {
  'use strict';

  const STORAGE_KEY_AUDIO = 'mlbb_diibaratkan_audio_state_v1';
  const STORAGE_KEY_TRANSITION = 'mlbb_diibaratkan_transition_v1';

  /**
   * Official Mobile Legends: Bang Bang (MLBB) & Bonus Tracklist
   */
  const MLBB_PLAYLIST = [
    {
      id: 'mlbb-welcome-lobby',
      title: 'Welcome to Mobile Legends (Lobby Theme)',
      src: 'assets/audio/mlbb-welcome-lobby.mp3',
      fallback: 'assets/audio/mlbb-seasonal-theme.mp3',
      defaultPage: 'index'
    },
    {
      id: 'mlbb-piano-theme',
      title: 'Dawn Sanctuary (Hero Mastery Piano)',
      src: 'assets/audio/mlbb-piano-theme.mp3',
      fallback: 'assets/audio/mlbb-welcome-lobby.mp3',
      defaultPage: 'about'
    },
    {
      id: 'mlbb-seasonal-theme',
      title: 'Land of Dawn (Seasonal Theme)',
      src: 'assets/audio/mlbb-seasonal-theme.mp3',
      fallback: 'assets/audio/mlbb-welcome-lobby.mp3',
      defaultPage: 'project'
    },
    {
      id: 'royal-days',
      title: 'Celestial Lounge (Instrumental)',
      src: 'assets/audio/royal-days.mp3',
      fallback: 'assets/audio/mlbb-piano-theme.mp3',
      defaultPage: 'any'
    },
    {
      id: 'take-over',
      title: 'Teamfight Overdrive (Battle Mix)',
      src: 'assets/audio/take-over.mp3',
      fallback: 'assets/audio/mlbb-welcome-lobby.mp3',
      defaultPage: 'any'
    }
  ];

  /* ========================================================================
     1. WEB AUDIO API — MLBB CELESTIAL UI SOUND EFFECTS SYNTHESIZER
     ======================================================================== */
  class CelestialSoundFX {
    constructor() {
      this.ctx = null;
      this.sfxMuted = false;
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    /** Subtle MLBB mana crystal hover chime */
    playHover() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(1479.98, now + 0.045); // F#6

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    /** Golden Mythic button confirm chord */
    playConfirm() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const freqs = [587.33, 880, 1174.66]; // D5 - A5 - D6
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.018);

        gain.gain.setValueAtTime(0.055, now + idx * 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.018);
        osc.stop(now + 0.24);
      });
    }

    /** MLBB "Match Found / Gate Loading" transition sound */
    playSlashTransition() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chord = [293.66, 440, 587.33, 739.99, 1174.66]; // D Major Celestial Resonance
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);
        gain.gain.setValueAtTime(idx === 0 ? 0.04 : 0.05, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.02);
        osc.stop(now + 0.44);
      });
    }

    /** Victory / Objective Inspect Fanfare */
    playAllOutAttack() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.055 * i);
        gain.gain.setValueAtTime(0.06, now + 0.055 * i);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055 * i + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + 0.055 * i);
        osc.stop(now + 0.055 * i + 0.3);
      });
    }
  }

  const sfx = new CelestialSoundFX();

  /* ========================================================================
     2. MLBB LOADING SCREEN / GATE TRANSITION MANAGER
     ======================================================================== */
  function initPageTransitions() {
    const stage = document.getElementById('p5-transition-stage');
    const labelEl = document.getElementById('p5-transition-label');
    const subEl = document.getElementById('p5-transition-sub');
    if (!stage) return;

    // Ensure loading bar exists inside transition banner
    const banner = stage.querySelector('.p5-transition-banner');
    if (banner && !banner.querySelector('.mlbb-loading-bar-wrap')) {
      const barWrap = document.createElement('div');
      barWrap.className = 'mlbb-loading-bar-wrap';
      barWrap.innerHTML = '<div class="mlbb-loading-bar-fill"></div>';
      banner.appendChild(barWrap);
    }

    try {
      const incoming = sessionStorage.getItem(STORAGE_KEY_TRANSITION);
      if (incoming) {
        const parsed = JSON.parse(incoming);
        sessionStorage.removeItem(STORAGE_KEY_TRANSITION);
        if (labelEl && parsed.label) labelEl.textContent = parsed.label;
        if (subEl && parsed.sub) subEl.textContent = parsed.sub;
        stage.classList.add('is-active', 'is-closing');
        requestAnimationFrame(() => {
          setTimeout(() => {
            stage.classList.remove('is-closing');
            stage.classList.remove('is-active');
          }, 90);
        });
      } else {
        stage.classList.remove('is-closing', 'is-active');
      }
    } catch (_) {
      stage.classList.remove('is-closing', 'is-active');
    }

    window.addEventListener('pageshow', () => {
      stage.classList.remove('is-closing', 'is-active');
    });

    const navLinks = document.querySelectorAll('a[data-p5-transition]');
    navLinks.forEach((link) => {
      link.addEventListener('mouseenter', () => sfx.playHover());
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || event.ctrlKey || event.metaKey) {
          return;
        }

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        if (href === currentPath) {
          event.preventDefault();
          sfx.playConfirm();
          return;
        }

        event.preventDefault();
        sfx.playSlashTransition();

        if (window.p5JukeboxInstance) {
          window.p5JukeboxInstance.saveState();
        }

        const customLabel = link.getAttribute('data-transition-title') || 'ENTERING LAND OF DAWN';
        const customSub = link.getAttribute('data-transition-sub') || `LOADING // ${href.toUpperCase()} (100%)`;

        if (labelEl) labelEl.textContent = customLabel;
        if (subEl) subEl.textContent = customSub;

        try {
          sessionStorage.setItem(
            STORAGE_KEY_TRANSITION,
            JSON.stringify({ label: customLabel, sub: customSub })
          );
        } catch (_) {
          // Ignore storage errors
        }

        stage.classList.add('is-active', 'is-closing');

        setTimeout(() => {
          window.location.href = href;
        }, 620);
      });
    });
  }

  /* ========================================================================
     3. PERSISTENT LAND OF DAWN BGM PLAYER
     ======================================================================== */
  class CelestialJukebox {
    constructor() {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.loop = true;
      this.audio.volume = 0.55;

      const pageId = document.body.getAttribute('data-page') || 'index';
      const defaultIdx = MLBB_PLAYLIST.findIndex((t) => t.defaultPage === pageId);
      this.trackIndex = defaultIdx >= 0 ? defaultIdx : 0;
      this.isPlaying = false;

      this.widget = document.getElementById('p5-jukebox');
      this.disc = document.getElementById('p5-vinyl-disc');
      this.selectEl = document.getElementById('p5-track-select');
      this.playBtn = document.getElementById('p5-audio-toggle');
      this.nextBtn = document.getElementById('p5-audio-next');
      this.sfxBtn = document.getElementById('p5-sfx-toggle');

      this.restoreState(pageId);
      this.bindUI();
    }

    restoreState(pageId) {
      let saved = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_AUDIO);
        if (raw) saved = JSON.parse(raw);
      } catch (_) {
        saved = null;
      }

      if (saved && typeof saved.trackIndex === 'number' && MLBB_PLAYLIST[saved.trackIndex]) {
        this.trackIndex = saved.trackIndex;
        this.loadTrack(this.trackIndex, saved.currentTime || 0);
        if (saved.sfxMuted) {
          sfx.sfxMuted = true;
        }
        if (saved.isPlaying) {
          this.tryPlay();
        }
      } else {
        const idx = MLBB_PLAYLIST.findIndex((t) => t.defaultPage === pageId);
        this.trackIndex = idx >= 0 ? idx : 0;
        this.loadTrack(this.trackIndex, 0);
        this.tryPlay();
      }
    }

    loadTrack(index, seekTime = 0) {
      this.trackIndex = (index + MLBB_PLAYLIST.length) % MLBB_PLAYLIST.length;
      const track = MLBB_PLAYLIST[this.trackIndex];

      this.audio.onerror = () => {
        if (track.fallback && this.audio.src !== track.fallback) {
          this.audio.src = track.fallback;
          if (this.isPlaying) this.audio.play().catch(() => {});
        }
      };

      this.audio.src = track.src;
      if (seekTime > 0) {
        this.audio.addEventListener(
          'loadedmetadata',
          () => {
            if (seekTime < this.audio.duration) {
              this.audio.currentTime = seekTime;
            }
          },
          { once: true }
        );
      }

      if (this.selectEl) {
        this.selectEl.value = String(this.trackIndex);
      }
    }

    tryPlay() {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.updateUI();
          })
          .catch(() => {
            this.isPlaying = false;
            this.updateUI();
            const unlock = () => {
              this.audio.play().then(() => {
                this.isPlaying = true;
                this.updateUI();
              }).catch(() => {});
              window.removeEventListener('pointerdown', unlock);
              window.removeEventListener('keydown', unlock);
            };
            window.addEventListener('pointerdown', unlock, { once: true });
            window.addEventListener('keydown', unlock, { once: true });
          });
      }
    }

    togglePlay() {
      sfx.playConfirm();
      if (this.audio.paused) {
        this.tryPlay();
      } else {
        this.audio.pause();
        this.isPlaying = false;
        this.updateUI();
      }
      this.saveState();
    }

    nextTrack() {
      sfx.playHover();
      this.loadTrack(this.trackIndex + 1, 0);
      this.tryPlay();
      this.saveState();
    }

    saveState() {
      try {
        sessionStorage.setItem(
          STORAGE_KEY_AUDIO,
          JSON.stringify({
            trackIndex: this.trackIndex,
            currentTime: this.audio.currentTime || 0,
            isPlaying: !this.audio.paused,
            sfxMuted: sfx.sfxMuted
          })
        );
      } catch (_) {
        // Ignore storage errors
      }
    }

    updateUI() {
      if (this.widget) {
        this.widget.classList.toggle('is-playing', this.isPlaying);
      }
      if (this.disc) {
        this.disc.classList.toggle('is-spinning', this.isPlaying);
      }
      if (this.playBtn) {
        this.playBtn.textContent = this.isPlaying ? 'PAUSE' : 'PLAY BGM';
      }
      if (this.sfxBtn) {
        this.sfxBtn.textContent = sfx.sfxMuted ? 'SFX: OFF' : 'SFX: ON';
        this.sfxBtn.classList.toggle('is-muted', sfx.sfxMuted);
      }
    }

    bindUI() {
      if (this.selectEl) {
        this.selectEl.innerHTML = '';
        MLBB_PLAYLIST.forEach((track, idx) => {
          const opt = document.createElement('option');
          opt.value = String(idx);
          opt.textContent = `♪ ${track.title}`;
          this.selectEl.appendChild(opt);
        });
        this.selectEl.value = String(this.trackIndex);

        this.selectEl.addEventListener('change', (e) => {
          const idx = Number(e.target.value);
          sfx.playConfirm();
          this.loadTrack(idx, 0);
          this.tryPlay();
          this.saveState();
        });
      }

      if (this.playBtn) {
        this.playBtn.addEventListener('click', () => this.togglePlay());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.nextTrack());
      }
      if (this.sfxBtn) {
        this.sfxBtn.addEventListener('click', () => {
          sfx.sfxMuted = !sfx.sfxMuted;
          if (!sfx.sfxMuted) sfx.playConfirm();
          this.updateUI();
          this.saveState();
        });
      }

      window.addEventListener('beforeunload', () => this.saveState());
      this.updateUI();
    }
  }

  /* ========================================================================
     4. AMBIENT CELESTIAL MANA PARTICLES & CLICK RIPPLES
     ======================================================================== */
  function initCelestialCanvas() {
    const canvas = document.getElementById('p5-metaverse-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const motes = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.5 + Math.random() * 2.8,
      vy: -0.2 - Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.3,
      color: Math.random() > 0.45 ? 'rgba(0, 212, 255, 0.55)' : 'rgba(229, 184, 91, 0.55)'
    }));

    const ripples = [];
    window.addEventListener('pointerdown', (e) => {
      ripples.push({ x: e.clientX, y: e.clientY, r: 4, alpha: 0.75 });
    });

    function render() {
      ctx.clearRect(0, 0, width, height);

      motes.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
      });

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const rp = ripples[i];
        rp.r += 2.4;
        rp.alpha -= 0.028;
        if (rp.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 212, 255, ${rp.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  /* ========================================================================
     5. PAGE-SPECIFIC INTERACTIVE CONTROLLERS
     ======================================================================== */

  /** index.html: Matchmaking Queue / Lobby Invite Modal */
  function initLobbyInteractions() {
    const openBtn = document.getElementById('p5-open-calling-card');
    const modal = document.getElementById('p5-calling-card-modal');
    const closeBtn = document.getElementById('p5-close-calling-card');
    const copyBtn = document.getElementById('p5-copy-calling-card');
    if (!openBtn || !modal) return;

    openBtn.addEventListener('mouseenter', () => sfx.playHover());
    openBtn.addEventListener('click', () => {
      sfx.playAllOutAttack();
      modal.classList.add('is-open');
    });

    const closeModal = () => {
      sfx.playConfirm();
      modal.classList.remove('is-open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        sfx.playConfirm();
        const text = 'Join the Celestial Lobby at https://diibaratkan.my.id — Mythical Immortal Developer Portfolio';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
        copyBtn.textContent = 'Lobby Invite Copied ★';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Lobby Invite Link';
        }, 2200);
      });
    }
  }

  /** about.html: Skin Aura Toggle, Emblem Loadout Tabs & Quick Chat */
  function initHeroProfileInteractions() {
    const switchBtn = document.getElementById('p5-outfit-toggle');
    const portraitWrap = document.getElementById('p5-portrait-wrap');
    const attireLabel = document.getElementById('p5-attire-status');
    if (switchBtn && portraitWrap) {
      switchBtn.addEventListener('click', () => {
        sfx.playConfirm();
        const isAlt = portraitWrap.classList.toggle('is-shibuya-mode');
        if (attireLabel) {
          attireLabel.textContent = isAlt
            ? 'Collector Skin // Astral Sovereign'
            : 'Mage / Architect // Mythical Immortal';
        }
        switchBtn.textContent = isAlt
          ? 'Switch to Default Celestial Skin'
          : 'Preview Astral Collector Aura';
      });
    }

    const EMBLEM_DATA = {
      arsene: {
        skills: [
          { name: 'Arcane Frontend Mastery', sub: 'TypeScript, React, Next.js & Modern CSS Grid', cost: 'Mage T3' },
          { name: 'Celestial Motion & Canvas', sub: '60FPS Transitions, WebGL & Interactive SVG', cost: 'Agility' },
          { name: 'Design System Harmony', sub: 'Accessible, Mobile-First Component Architecture', cost: 'Mastery' },
          { name: 'Mana Flow Optimization', sub: 'Instant Load Times & Core Web Vitals Tuning', cost: 'Passive' }
        ]
      },
      satanael: {
        skills: [
          { name: 'Shadow Blade APIs', sub: 'Node.js, Python FastAPI & High-Throughput Services', cost: 'Assassin T3' },
          { name: 'Sanctuary Data Vault', sub: 'PostgreSQL, Redis Caching & Realtime Sync', cost: 'Persistence' },
          { name: 'Immortal Cloud Deployment', sub: 'Docker, CI/CD Pipelines & Edge Infrastructure', cost: 'DevOps' },
          { name: 'Aegis Security Protocol', sub: 'OAuth2, JWT & End-to-End Encryption', cost: 'Defense' }
        ]
      },
      izanagi: {
        skills: [
          { name: 'Oracle AI & LLM Agents', sub: 'RAG Pipelines, Tool Use & Intelligent Workflows', cost: 'Support T3' },
          { name: 'Domain Architecture', sub: 'Clean Codebases, SOLID & Modular Systems', cost: 'Strategy' },
          { name: 'Cross-Lane Responsiveness', sub: 'Seamless Desktop, Tablet & Mobile Execution', cost: 'Utility' },
          { name: 'Rapid Objective Delivery', sub: 'Concept-to-Production Prototyping & Testing', cost: 'Macro' }
        ]
      }
    };

    const tabs = document.querySelectorAll('[data-persona-tab]');
    const skillsContainer = document.getElementById('p5-skill-slots');

    function renderEmblem(key) {
      const p = EMBLEM_DATA[key];
      if (!p || !skillsContainer) return;

      skillsContainer.innerHTML = p.skills
        .map(
          (sk) => `
          <div class="p5-skill-card">
            <div>
              <span class="p5-skill-name">${sk.name}</span>
              <span class="p5-skill-sub">${sk.sub}</span>
            </div>
            <span class="p5-skill-cost">${sk.cost}</span>
          </div>`
        )
        .join('');
    }

    tabs.forEach((tab) => {
      tab.addEventListener('mouseenter', () => sfx.playHover());
      tab.addEventListener('click', () => {
        sfx.playConfirm();
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        renderEmblem(tab.getAttribute('data-persona-tab'));
      });
    });

    const dialogueText = document.getElementById('p5-dialogue-text');
    const choiceBtns = document.querySelectorAll('[data-dialogue-reply]');
    let typeTimer = null;

    function typewrite(message) {
      if (!dialogueText) return;
      if (typeTimer) clearInterval(typeTimer);
      dialogueText.textContent = '';
      let idx = 0;
      typeTimer = setInterval(() => {
        dialogueText.textContent += message.charAt(idx);
        idx += 1;
        if (idx % 5 === 0) sfx.playHover();
        if (idx >= message.length) {
          clearInterval(typeTimer);
        }
      }, 14);
    }

    choiceBtns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => sfx.playHover());
      btn.addEventListener('click', () => {
        sfx.playConfirm();
        const reply = btn.getAttribute('data-dialogue-reply');
        if (reply) typewrite(reply);
      });
    });
  }

  /** project.html: Interactive Land of Dawn Map & Objective Modal */
  function initLandOfDawnMap() {
    const LANE_METADATA = {
      all: {
        title: 'All Lanes Active — Land of Dawn Overview (4 Objectives)',
        desc: 'Inspecting all turrets and sanctuary objectives across EXP Lane, Mid Lane, Gold Lane, and the Luminous Lord Pit.'
      },
      web: {
        title: 'EXP Lane & Lord Sanctum — Web Platforms & Core Architecture',
        desc: 'Frontline web applications built for durability, high concurrency, and seamless cross-page responsiveness.'
      },
      ai: {
        title: 'Mid Lane Sanctum — Arcane AI & Neural Telemetry',
        desc: 'High-ground intelligence systems, real-time analytics dashboards, and LLM agent orchestration.'
      },
      ui: {
        title: 'Gold Lane — Precision Interactive UI & Audio DSP',
        desc: 'High-impact interactive media, custom Web Audio synthesizers, and expressive visual craftsmanship.'
      }
    };

    const filterBtns = document.querySelectorAll('[data-filter]');
    const mapNodes = document.querySelectorAll('[data-map-filter]');
    const cards = document.querySelectorAll('[data-category]');
    const laneTitle = document.getElementById('mlbb-lane-title');
    const laneDesc = document.getElementById('mlbb-lane-desc');

    function applyLaneFilter(filterKey) {
      sfx.playConfirm();

      filterBtns.forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-filter') === filterKey);
      });

      mapNodes.forEach((node) => {
        const nodeFilter = node.getAttribute('data-map-filter');
        const isActive = filterKey === 'all' || nodeFilter === filterKey;
        node.style.opacity = isActive ? '1' : '0.38';
      });

      cards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        const show = filterKey === 'all' || cat === filterKey;
        card.style.display = show ? 'flex' : 'none';
      });

      const meta = LANE_METADATA[filterKey] || LANE_METADATA.all;
      if (laneTitle) laneTitle.textContent = meta.title;
      if (laneDesc) laneDesc.textContent = meta.desc;
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => sfx.playHover());
      btn.addEventListener('click', () => {
        applyLaneFilter(btn.getAttribute('data-filter') || 'all');
      });
    });

    mapNodes.forEach((node) => {
      node.addEventListener('mouseenter', () => sfx.playHover());
      node.addEventListener('click', () => {
        applyLaneFilter(node.getAttribute('data-map-filter') || 'all');
      });
    });

    // Objective Briefing Modal
    const modal = document.getElementById('p5-aoa-modal');
    const modalTitle = document.getElementById('p5-aoa-title');
    const modalTarget = document.getElementById('p5-aoa-target');
    const modalDesc = document.getElementById('p5-aoa-desc');
    const modalImpact = document.getElementById('p5-aoa-impact');
    const closeBtn = document.getElementById('p5-aoa-close');

    const aoaButtons = document.querySelectorAll('[data-aoa-trigger]');
    aoaButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => sfx.playHover());
      btn.addEventListener('click', () => {
        sfx.playAllOutAttack();
        if (!modal) return;
        if (modalTitle) modalTitle.textContent = btn.getAttribute('data-title') || 'Objective Secured';
        if (modalTarget) modalTarget.textContent = btn.getAttribute('data-target') || 'Land of Dawn Objective';
        if (modalDesc) modalDesc.textContent = btn.getAttribute('data-desc') || '';
        if (modalImpact) modalImpact.textContent = btn.getAttribute('data-impact') || '';
        modal.classList.add('is-open');
      });
    });

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        sfx.playConfirm();
        modal.classList.remove('is-open');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          sfx.playConfirm();
          modal.classList.remove('is-open');
        }
      });
    }
  }

  /* ========================================================================
     INITIALIZATION ON DOM READY
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    window.p5JukeboxInstance = new CelestialJukebox();
    initPageTransitions();
    initCelestialCanvas();
    initLobbyInteractions();
    initHeroProfileInteractions();
    initLandOfDawnMap();
  });
})();
