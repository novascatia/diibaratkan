/**
 * @fileoverview Persona 5 Royal Interactive Engine for diibaratkan.my.id
 * Handles:
 * - Page-to-page Calling Card / Diagonal Slash transitions between index.html, about.html, project.html
 * - Persistent Velvet Room / Leblanc BGM Jukebox (Local P5R MP3s + Archive.org streams + session state)
 * - Web Audio API synthesized Persona 5 UI Sound Effects (Menu Hover, Dagger Confirm, Transition Slash, All-Out Attack)
 * - Interactive Metaverse Canvas (Hypnotic rings, floating comic stars, click slash bursts)
 * - Page-specific interactivity (Calling Card modal, Compendium tabs, Confidant dialogue, All-Out Attack modal)
 */

(() => {
  'use strict';

  const STORAGE_KEY_AUDIO = 'p5_diibaratkan_audio_state_v1';
  const STORAGE_KEY_TRANSITION = 'p5_diibaratkan_transition_v1';

  /**
   * Official Persona 5 / Persona 5 Royal Tracklist
   * Prioritizes local fast-loading MP3s in assets/audio/ with remote Archive.org fallback
   */
  const P5_PLAYLIST = [
    {
      id: 'colors-flying-high',
      title: 'Colors Flying High (P5R Opening)',
      src: 'assets/audio/colors-flying-high.mp3',
      fallback: 'https://archive.org/download/persona-5-royal-ost/1-01%20Colors%20Flying%20High%20%28Opening%20Movie%20Version%29.mp3',
      defaultPage: 'index'
    },
    {
      id: 'no-more-what-ifs',
      title: 'No More What Ifs (Leblanc Jazz)',
      src: 'assets/audio/no-more-what-ifs.mp3',
      fallback: 'https://archive.org/download/persona-5-royal-ost/1-08%20No%20More%20What%20Ifs.mp3',
      defaultPage: 'about'
    },
    {
      id: 'take-over',
      title: 'Take Over (Ambush Battle)',
      src: 'assets/audio/take-over.mp3',
      fallback: 'https://archive.org/download/persona-5-royal-ost/1-03%20Take%20Over.mp3',
      defaultPage: 'project'
    },
    {
      id: 'royal-days',
      title: 'Royal Days (Tokyo Daylight)',
      src: 'assets/audio/royal-days.mp3',
      fallback: 'https://archive.org/download/persona-5-royal-ost/1-02%20Royal%20Days.mp3',
      defaultPage: 'any'
    },
    {
      id: 'last-surprise',
      title: 'Last Surprise (Phantom Battle)',
      src: 'https://archive.org/download/Persona5LastSurpriseOFFICIALLyrics/Persona%205%20-%20Last%20Surprise%20OFFICIAL%20Lyrics.mp3',
      fallback: 'assets/audio/take-over.mp3',
      defaultPage: 'any'
    },
    {
      id: 'wake-up-get-up',
      title: 'Wake Up, Get Up, Get Out There',
      src: 'https://archive.org/download/1-01.-wake-up-get-up-get-out-there/1-01.%20Wake%20Up%2C%20Get%20Up%2C%20Get%20Out%20There.mp3',
      fallback: 'assets/audio/colors-flying-high.mp3',
      defaultPage: 'any'
    },
    {
      id: 'aria-of-the-soul',
      title: 'Aria of the Soul (Velvet Room)',
      src: 'https://archive.org/download/persona-5-ost-aria-of-the-soul.mp3/Persona%205%20OST%20-%20Aria%20Of%20The%20Soul.mp3',
      fallback: 'assets/audio/no-more-what-ifs.mp3',
      defaultPage: 'any'
    }
  ];

  /* ========================================================================
     1. WEB AUDIO API — PERSONA 5 UI SOUND EFFECTS SYNTHESIZER
     ======================================================================== */
  class PersonaSoundFX {
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

    /** Crisp Persona 5 menu cursor tick/clack */
    playHover() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(2450, now + 0.038);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.048);
    }

    /** Metallic Rebel Dagger stab + jazz seventh chord accent */
    playConfirm() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const freqs = [587.33, 880, 1108.73, 1396.91]; // Dmaj7 sharp punk stab
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.014);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + 0.19);

        gain.gain.setValueAtTime(0.06, now + idx * 0.014);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.014);
        osc.stop(now + 0.24);
      });
    }

    /** Full-screen Page Transition Chain & Slash Whoosh */
    playSlashTransition() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // White noise burst for blade slash
      const bufferSize = this.ctx.sampleRate * 0.28;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.09));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(3400, now + 0.22);
      filter.Q.value = 1.8;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.27);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      // Dramatic P5 low-end sting
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(220, now);
      sub.frequency.exponentialRampToValueAtTime(73.42, now + 0.32);
      subGain.gain.setValueAtTime(0.14, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.35);
    }

    /** All-Out Attack Shatter Fanfare */
    playAllOutAttack() {
      if (this.sfxMuted) return;
      this.initContext();
      if (!this.ctx) return;

      this.playSlashTransition();
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + 0.06 * i);
        gain.gain.setValueAtTime(0.07, now + 0.06 * i);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06 * i + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + 0.06 * i);
        osc.stop(now + 0.06 * i + 0.32);
      });
    }
  }

  const sfx = new PersonaSoundFX();

  /* ========================================================================
     2. RANSOM-NOTE CUTOUT TYPOGRAPHY FORMATTER
     ======================================================================== */
  function initRansomTypography() {
    const nodes = document.querySelectorAll('[data-ransom]');
    nodes.forEach((node) => {
      const rawText = node.textContent.trim();
      node.textContent = '';
      node.classList.add('p5-ransom-word');
      node.setAttribute('aria-label', rawText);

      Array.from(rawText).forEach((char) => {
        if (char === ' ') {
          const spacer = document.createElement('span');
          spacer.style.width = '0.35em';
          spacer.setAttribute('aria-hidden', 'true');
          node.appendChild(spacer);
          return;
        }
        const span = document.createElement('span');
        span.className = 'p5-ransom-char';
        span.textContent = char;
        span.setAttribute('aria-hidden', 'true');
        node.appendChild(span);
      });
    });
  }

  /* ========================================================================
     3. PAGE-TO-PAGE CALLING CARD / SLASH TRANSITION MANAGER
     ======================================================================== */
  function initPageTransitions() {
    const stage = document.getElementById('p5-transition-stage');
    const labelEl = document.getElementById('p5-transition-label');
    const subEl = document.getElementById('p5-transition-sub');
    if (!stage) return;

    // Check if arriving from an animated page transition
    try {
      const incoming = sessionStorage.getItem(STORAGE_KEY_TRANSITION);
      if (incoming) {
        const parsed = JSON.parse(incoming);
        sessionStorage.removeItem(STORAGE_KEY_TRANSITION);
        if (labelEl && parsed.label) labelEl.textContent = parsed.label;
        if (subEl && parsed.sub) subEl.textContent = parsed.sub;
      }
    } catch (_) {
      // Ignore storage errors
    }

    // Play opening reveal animation (blades slide open to unveil page)
    requestAnimationFrame(() => {
      setTimeout(() => {
        stage.classList.remove('is-closing');
        stage.classList.remove('is-active');
      }, 90);
    });

    // Intercept links to index.html, about.html, project.html
    const navLinks = document.querySelectorAll('a[data-p5-transition]');
    navLinks.forEach((link) => {
      link.addEventListener('mouseenter', () => sfx.playHover());
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || event.ctrlKey || event.metaKey) {
          return;
        }

        // Prevent redundant navigation if already on the exact same page file
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        if (href === currentPath) {
          event.preventDefault();
          sfx.playConfirm();
          return;
        }

        event.preventDefault();
        sfx.playSlashTransition();

        // Persist current BGM state right before navigating
        if (window.p5JukeboxInstance) {
          window.p5JukeboxInstance.saveState();
        }

        const customLabel = link.getAttribute('data-transition-title') || 'TAKING YOUR HEART';
        const customSub = link.getAttribute('data-transition-sub') || `INFILTRATING // ${href.toUpperCase()}`;

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
        }, 660);
      });
    });
  }

  /* ========================================================================
     4. PERSISTENT VELVET ROOM / LEBLANC BGM JUKEBOX
     ======================================================================== */
  class PersonaJukebox {
    constructor() {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.loop = true;
      this.audio.volume = 0.55;

      const pageId = document.body.getAttribute('data-page') || 'index';
      const defaultIdx = P5_PLAYLIST.findIndex((t) => t.defaultPage === pageId);
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

      if (saved && typeof saved.trackIndex === 'number' && P5_PLAYLIST[saved.trackIndex]) {
        this.trackIndex = saved.trackIndex;
        this.loadTrack(this.trackIndex, saved.currentTime || 0);
        if (saved.sfxMuted) {
          sfx.sfxMuted = true;
        }
        if (saved.isPlaying) {
          this.tryPlay();
        }
      } else {
        const idx = P5_PLAYLIST.findIndex((t) => t.defaultPage === pageId);
        this.trackIndex = idx >= 0 ? idx : 0;
        this.loadTrack(this.trackIndex, 0);
        // Attempt auto-start or start on first interaction
        this.tryPlay();
      }
    }

    loadTrack(index, seekTime = 0) {
      this.trackIndex = (index + P5_PLAYLIST.length) % P5_PLAYLIST.length;
      const track = P5_PLAYLIST[this.trackIndex];

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
            // Browser blocked autoplay until user gesture; unlock on first click/keydown
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
        P5_PLAYLIST.forEach((track, idx) => {
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
     5. INTERACTIVE METAVERSE CANVAS (RINGS, STARS & CLICK SLASHES)
     ======================================================================== */
  function initMetaverseCanvas() {
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

    // Floating P5 4-point stars
    const stars = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 6 + Math.random() * 14,
      speedY: -0.25 - Math.random() * 0.65,
      speedX: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      color: Math.random() > 0.72 ? '#FFE600' : Math.random() > 0.35 ? '#D80018' : '#F7F5F0'
    }));

    // Click slash bursts
    const slashes = [];
    window.addEventListener('pointerdown', (e) => {
      slashes.push({
        x: e.clientX,
        y: e.clientY,
        angle: -0.35 + (Math.random() - 0.5) * 0.5,
        life: 1.0
      });
    });

    function drawFourPointStar(cx, cy, radius, rotation, fill) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const r = i % 2 === 0 ? radius : radius * 0.32;
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#070709';
      ctx.stroke();
      ctx.restore();
    }

    let tick = 0;
    function render() {
      ctx.clearRect(0, 0, width, height);
      tick += 0.012;

      // Subtle Mementos target ripple rings in top-right / center-right
      const centerX = width * 0.76;
      const centerY = height * 0.46;
      ctx.save();
      for (let r = 0; r < 5; r += 1) {
        const radius = ((r * 135 + tick * 60) % 680) + 40;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(216, 0, 24, 0.14)' : 'rgba(247, 245, 240, 0.06)';
        ctx.lineWidth = r % 2 === 0 ? 6 : 2;
        ctx.setLineDash([28, 18]);
        ctx.stroke();
      }
      ctx.restore();

      // Update & draw floating comic stars
      stars.forEach((s) => {
        s.x += s.speedX;
        s.y += s.speedY;
        s.rot += s.rotSpeed;
        if (s.y < -30) {
          s.y = height + 25;
          s.x = Math.random() * width;
        }
        drawFourPointStar(s.x, s.y, s.size, s.rot, s.color);
      });

      // Update & draw click dagger slashes
      for (let i = slashes.length - 1; i >= 0; i -= 1) {
        const sl = slashes[i];
        sl.life -= 0.06;
        if (sl.life <= 0) {
          slashes.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.rotate(sl.angle);
        const len = 110 * (1.2 - sl.life * 0.4);
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(0, -9 * sl.life);
        ctx.lineTo(len, 0);
        ctx.lineTo(0, 9 * sl.life);
        ctx.closePath();
        ctx.fillStyle = sl.life > 0.5 ? '#F7F5F0' : '#D80018';
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  /* ========================================================================
     6. PAGE-SPECIFIC INTERACTIVE CONTROLLERS
     ======================================================================== */

  /** index.html: Calling Card Modal Generator */
  function initPortalInteractions() {
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
        const text =
          'SIR / MADAM OF THE DIGITAL REALM — We will steal your boredom and materialize unforgettable web experiences at https://diibaratkan.my.id — From: The Phantom Architect of diibaratkan.my.id';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
        copyBtn.textContent = 'CALLING CARD DISPATCHED ★';
        setTimeout(() => {
          copyBtn.textContent = 'COPY CALLING CARD MESSAGE';
        }, 2400);
      });
    }
  }

  /** about.html: Outfit Mode Switch, Persona Compendium Tabs & Confidant Dialogue */
  function initAboutInteractions() {
    // 1. Outfit Toggle (Metaverse Phantom Thief vs Shibuya Citizen)
    const switchBtn = document.getElementById('p5-outfit-toggle');
    const portraitWrap = document.getElementById('p5-portrait-wrap');
    const attireLabel = document.getElementById('p5-attire-status');
    if (switchBtn && portraitWrap) {
      switchBtn.addEventListener('click', () => {
        sfx.playConfirm();
        const isShibuya = portraitWrap.classList.toggle('is-shibuya-mode');
        if (attireLabel) {
          attireLabel.textContent = isShibuya
            ? 'ATTIRE: SHIBUYA CITIZEN // REAL WORLD'
            : 'ATTIRE: PHANTOM THIEF // METAVERSE';
        }
        switchBtn.textContent = isShibuya
          ? 'ENTER METAVERSE FORM'
          : 'SWITCH TO SHIBUYA MODE';
      });
    }

    // 2. Persona Compendium Tabs
    const PERSONA_DATA = {
      arsene: {
        affinities: { PHYS: 'STR', FIRE: 'NUL', ICE: '—', ELEC: 'RPL', WIND: '—', PSY: 'STR', NUKE: '—', CURSE: 'DR' },
        skills: [
          { name: 'MEGIDOLAON.TS', sub: 'TypeScript / Next.js / React Architecture', cost: '38 SP' },
          { name: 'EIGAON.CSS', sub: 'Custom WebGL, Canvas & CSS Keyframe Choreography', cost: '22 SP' },
          { name: 'SUKUKAJA.UX', sub: '60FPS Motion Design & Micro-Interactions', cost: '15 SP' },
          { name: 'REBEL SOUL', sub: 'Distinctive Non-Generic Frontend Direction', cost: 'PASSIVE' }
        ]
      },
      satanael: {
        affinities: { PHYS: 'RPL', FIRE: 'DR', ICE: 'NUL', ELEC: 'NUL', WIND: 'STR', PSY: 'NUL', NUKE: 'RPL', CURSE: 'NUL' },
        skills: [
          { name: 'SINFUL SHELL.API', sub: 'Distributed Node.js / Python / Go Microservices', cost: '64 SP' },
          { name: 'HEAT RISER.DB', sub: 'PostgreSQL, Redis & High-Concurrency Caching', cost: '30 SP' },
          { name: 'VICTORY CRY.OPS', sub: 'Docker, CI/CD Pipelines & Cloud Edge Deployments', cost: 'PASSIVE' },
          { name: 'TYRANT MIND', sub: 'Zero-Downtime System Security & Auth', cost: 'PASSIVE' }
        ]
      },
      izanagi: {
        affinities: { PHYS: 'NUL', FIRE: 'STR', ICE: 'STR', ELEC: 'DR', WIND: 'NUL', PSY: 'RPL', NUKE: 'STR', CURSE: 'NUL' },
        skills: [
          { name: 'MYRIAD TRUTHS.AI', sub: 'LLM Agents, RAG Pipelines & Creative AI Tools', cost: '48 SP' },
          { name: 'CONCENTRATE.SYS', sub: 'Clean Architecture & Domain-Driven Design', cost: '25 SP' },
          { name: 'ANGELIC GRACE', sub: 'WCAG Accessibility & Cross-Device Responsiveness', cost: 'PASSIVE' },
          { name: 'ALMIGHTY BOOST', sub: 'End-to-End Product Strategy & Prototyping', cost: 'PASSIVE' }
        ]
      }
    };

    const tabs = document.querySelectorAll('[data-persona-tab]');
    const affinityContainer = document.getElementById('p5-affinity-strip');
    const skillsContainer = document.getElementById('p5-skill-slots');

    function renderPersona(key) {
      const p = PERSONA_DATA[key];
      if (!p || !affinityContainer || !skillsContainer) return;

      affinityContainer.innerHTML = Object.entries(p.affinities)
        .map(
          ([elem, val]) => `
          <div class="p5-affinity-cell">
            <span class="p5-affinity-elem">${elem}</span>
            <span class="p5-affinity-val">${val}</span>
          </div>`
        )
        .join('');

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
        renderPersona(tab.getAttribute('data-persona-tab'));
      });
    });

    // 3. Confidant Dialogue Choices
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
        if (idx % 4 === 0) sfx.playHover();
        if (idx >= message.length) {
          clearInterval(typeTimer);
        }
      }, 16);
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

  /** project.html: Category Filter & All-Out Attack Project Modal */
  function initProjectInteractions() {
    const filterBtns = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('[data-category]');
    const secPct = document.getElementById('p5-security-pct');
    const secFill = document.getElementById('p5-security-fill');

    filterBtns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => sfx.playHover());
      btn.addEventListener('click', () => {
        sfx.playConfirm();
        filterBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.getAttribute('data-filter');
        let visibleCount = 0;
        cards.forEach((card) => {
          const cat = card.getAttribute('data-category');
          const show = filter === 'all' || cat === filter;
          card.style.display = show ? 'flex' : 'none';
          if (show) visibleCount += 1;
        });

        const pct = filter === 'all' ? 99 : Math.min(99, 65 + visibleCount * 11);
        if (secPct) secPct.textContent = `${pct}%`;
        if (secFill) secFill.style.width = `${pct}%`;
      });
    });

    // All-Out Attack Dossier Modal
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
        if (modalTitle) modalTitle.textContent = btn.getAttribute('data-title') || 'PALACE TREASURE';
        if (modalTarget) modalTarget.textContent = btn.getAttribute('data-target') || 'TARGET SECURED';
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
    initRansomTypography();
    window.p5JukeboxInstance = new PersonaJukebox();
    initPageTransitions();
    initMetaverseCanvas();
    initPortalInteractions();
    initAboutInteractions();
    initProjectInteractions();
  });
})();
