/* 이승빈 포트폴리오 2026 · 모션
   GSAP 3.13(ScrollTrigger, SplitText, CustomEase) + Lenis. 모든 움직임은 목적이 있다:
   로더(진입), 쇼릴 확대(서사), 문장 채우기(읽는 속도), 수치(강조), 레일·스택(탐색 순서), 흐름선(공정 설명), 반전(장 전환).
   prefers-reduced-motion 이면 로더·부드러운 스크롤·고정·스크럽을 모두 끄고 정지 화면으로 보여 준다. */
(() => {
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const loader = $('.loader');

  if (!window.gsap) { body.classList.remove('is-loading'); loader && loader.remove(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  CustomEase.create('out', '0.16,1,0.3,1');
  CustomEase.create('io', '0.7,0,0.3,1');
  gsap.defaults({ ease: 'out', duration: 1 });

  /* ---------- 부드러운 스크롤 ---------- */
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }
  const scrollTo = (target, opts = {}) => {
    if (lenis) return lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), ...opts });
    if (typeof target === 'number') window.scrollTo(0, target); else target.scrollIntoView();
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : $(id);
    if (el === null) return;
    e.preventDefault();
    scrollTo(el);
  }));

  /* ---------- 로더: 숫자와 이름 ---------- */
  const video = $('.reel__video');
  let drawProgress = () => {};
  const prog = { v: 0 };
  const useLoader = !!loader && !reduce;
  if (useLoader) {
    lenis && lenis.stop();
    const num = $('.loader__num'), bar = $('.loader__bar span'), name = $('.loader__name');
    const finalName = name.textContent, glyphs = '#%&*+=<>/\\|ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const scr = { p: 0 };
    gsap.to(scr, { p: 1, duration: 1.5, ease: 'none', onUpdate: () => {
      name.textContent = [...finalName].map((ch, i) => (ch === ' ' || i / finalName.length < scr.p ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    } });
    drawProgress = () => { num.textContent = String(Math.round(prog.v)).padStart(3, '0'); bar.style.transform = `scaleX(${prog.v / 100})`; };
    gsap.to(prog, { v: 86, duration: 1.8, ease: 'power2.out', onUpdate: drawProgress });
  } else {
    loader && loader.remove();
    body.classList.remove('is-loading');
  }

  /* ---------- 글꼴을 받은 뒤 장면을 만든다 ---------- */
  let R = { g: 0, open: useLoader ? 0 : 1 }, applyReel = () => {}, heroChars = [];
  const setupDone = (document.fonts ? document.fonts.ready : Promise.resolve()).then(setup);
  if (useLoader) {
    const canPlay = new Promise(r => (video.readyState >= 3 ? r() : video.addEventListener('canplay', r, { once: true })));
    const settled = Promise.race([Promise.all([canPlay, new Promise(r => setTimeout(r, 1800))]), new Promise(r => setTimeout(r, 4500))]);
    Promise.all([setupDone, settled]).then(() => gsap.to(prog, { v: 100, duration: .55, ease: 'power2.out', onUpdate: drawProgress, onComplete: intro }));
  }

  function setup() {
    /* 워드마크를 폭에 꽉 맞춘다 */
    const heroWord = $('.hero__word'), heroW = $('.hero__w'), footWord = $('.foot__word');
    const fit = (el, measureEl) => {
      el.style.fontSize = '100px';
      const natural = measureEl.getBoundingClientRect().width;
      const avail = el.getBoundingClientRect().width;
      el.style.fontSize = `${(100 * avail / natural).toFixed(2)}px`;
    };
    const fitAll = () => { heroWord && fit(heroWord, heroW); footWord && fit(footWord, $('.foot__fit', footWord)); };
    fitAll();
    ScrollTrigger.addEventListener('refreshInit', fitAll);

    heroChars = new SplitText(heroW, { type: 'chars', charsClass: 'ch' }).chars;
    if (useLoader) gsap.set(heroChars, { yPercent: 118 });

    /* 쇼릴: 카드 → 전체 화면. 화면 크기의 상자를 축소·이동해 카드처럼 보이게 하므로 영상 구도가 그대로 유지된다 */
    const pin = $('.hero__pin'), reel = $('.reel'), card = $('.hero__card'), play = $('.reel__play');
    let geo = null, mob = false;
    // 휴대폰에서는 화면 비율 상자를 줄이지 않고 16:9 카드 자리에 영상을 그대로 둔다
    const measure = () => {
      mob = matchMedia('(max-width: 767px)').matches;
      const p = pin.getBoundingClientRect();
      card.style.aspectRatio = mob ? '16 / 9' : `${p.width} / ${p.height}`;
      const c = card.getBoundingClientRect();
      geo = { x: c.left - p.left, y: c.top - p.top, s: c.width / p.width, W: p.width, H: p.height, cw: c.width, ch: c.height };
      if (mob) Object.assign(reel.style, { inset: '0 auto auto 0', width: `${c.width}px`, height: `${c.height}px` });
      else Object.assign(reel.style, { inset: '', width: '', height: '' });
    };
    applyReel = () => {
      if (!geo) measure();
      const o = (1 - R.open) * 50;
      if (mob) {
        reel.style.transform = `translate3d(${geo.x}px,${geo.y}px,0)`;
        reel.style.clipPath = `inset(${o}% 0% ${o}% 0%)`;
        play.style.transform = `translate3d(${geo.x + geo.cw / 2}px,${geo.y + geo.ch / 2}px,0) translate(-50%,-50%)`;
        play.style.opacity = R.open;
        return;
      }
      const g = R.g, s = geo.s + (1 - geo.s) * g, x = geo.x * (1 - g), y = geo.y * (1 - g);
      reel.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
      reel.style.clipPath = `inset(${o}% 0% ${o}% 0%)`;
      play.style.transform = `translate3d(${x + s * geo.W / 2}px,${y + s * geo.H / 2}px,0) translate(-50%,-50%) scale(${1 + g * .35})`;
      play.style.opacity = R.open;
    };
    reel.style.transformOrigin = '0 0';
    measure(); applyReel();
    ScrollTrigger.addEventListener('refresh', () => { measure(); applyReel(); });

    if (reduce) {
      video.removeAttribute('autoplay'); video.pause();
      const still = () => { video.currentTime = 4; };
      video.readyState >= 1 ? still() : video.addEventListener('loadedmetadata', still, { once: true });
    }

    scenes();
    extras();
    glReel(reel);
  }

  /* ---------- 쇼릴 셰이더: 스크롤 속도만큼 렌즈 왜곡과 색 분리 (데스크톱 · 움직임 허용 시) ---------- */
  function glReel(reel) {
    if (reduce || !fine) return;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) return;
    canvas.className = 'reel__gl';
    canvas.setAttribute('aria-hidden', 'true');
    reel.insertBefore(canvas, reel.querySelector('.reel__shade'));
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 res,tex;uniform float vel,time;
      vec2 cover(vec2 uv){float rs=res.x/res.y,rt=tex.x/tex.y;vec2 s=rs>rt?vec2(1.,rt/rs):vec2(rs/rt,1.);return (uv-.5)*s+.5;}
      void main(){vec2 uv=vec2(v.x,1.-v.y);vec2 c=uv-.5;float d=dot(c,c);
        vec2 q=uv-c*d*vel*.55;float s=vel*.012+.0006;
        float r=texture2D(t,cover(q+vec2(s,0.))).r;float g=texture2D(t,cover(q)).g;float b=texture2D(t,cover(q-vec2(s,0.))).b;
        float vig=smoothstep(.95,.25,d*1.6);gl_FragColor=vec4(vec3(r,g,b)*mix(.82,1.,vig),1.);}`));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const U = n => gl.getUniformLocation(prog, n);
    const uRes = U('res'), uTex = U('tex'), uVel = U('vel');
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(reel.offsetWidth * dpr); canvas.height = Math.round(reel.offsetHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    size(); addEventListener('resize', size);
    let on = true, vel = 0, ok = false;
    new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(reel);
    gsap.ticker.add(() => {
      if (!on || video.readyState < 2) return;
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); } catch (e) { return; }
      if (!ok) { ok = true; reel.classList.add('has-gl'); }
      const target = Math.min(1, Math.abs(lenis ? lenis.velocity : 0) / 38);
      vel += (target - vel) * .08;
      gl.uniform2f(uTex, video.videoWidth, video.videoHeight);
      gl.uniform1f(uVel, vel);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  }

  /* ---------- 글자 뒤섞임 (링크에 마우스를 올릴 때) ---------- */
  const GLY = '#%&*+=<>/\|ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el) {
    const txt = el.dataset.text || (el.dataset.text = el.textContent);
    let f = 0; const total = 14;
    cancelAnimationFrame(el._raf);
    const tick = () => {
      el.textContent = [...txt].map((ch, i) => (ch === ' ' || i < (f / total) * txt.length ? ch : GLY[(Math.random() * GLY.length) | 0])).join('');
      if (f++ < total) el._raf = requestAnimationFrame(tick); else el.textContent = txt;
    };
    tick();
  }

  /* ---------- 첫 장면 ---------- */
  function intro() {
    gsap.timeline()
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'io' })
      .to(heroChars, { yPercent: 0, duration: 1.45, stagger: .032 }, '-=.55')
      .from('.hero__kr, .hero__sub', { y: 28, autoAlpha: 0, duration: 1.1, stagger: .08 }, '-=1.2')
      .to(R, { open: 1, duration: 1.3, ease: 'io', onUpdate: applyReel }, '-=1.3')
      .fromTo('.nav', { yPercent: -100 }, { yPercent: 0, duration: .9 }, '-=1.1')
      .add(() => {
        body.classList.remove('is-loading');
        loader.remove();
        lenis && lenis.start();
        ScrollTrigger.refresh();
      });
  }

  /* ---------- 스크롤 장면 ---------- */
  let flowST = [];
  function scenes() {
    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 768px)', motion: '(prefers-reduced-motion: no-preference)' }, ctx => {
      const { desk, motion } = ctx.conditions;
      if (!motion) return;

      // 쇼릴 확대 + 워드마크 퇴장
      if (desk) {
        gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=150%', pin: true, scrub: .8, anticipatePin: 1 } })
          .to(R, { g: 1, ease: 'none', duration: 1, onUpdate: applyReel }, 0)
          .to('.hero__w', { yPercent: -45, autoAlpha: 0, ease: 'none', duration: .55 }, 0)
          .to('.hero__left', { y: -60, autoAlpha: 0, ease: 'none', duration: .4 }, 0)
          .to({}, { duration: .35 });
        // 다음 장이 쇼릴 위로 덮을 때 영상은 절반 속도로 내려간다
        gsap.to(video, { yPercent: 26, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'top top', scrub: true } });
      }

      // 소개 문장 단어 채우기
      const words = new SplitText('.statement__text', { type: 'words', wordsClass: 'w' }).words;
      gsap.to(words, { color: '#ecebe6', ease: 'none', stagger: .08,
        scrollTrigger: { trigger: '.statement', start: 'top 72%', end: 'bottom 62%', scrub: true } });

      // 수치
      $$('[data-count]').forEach(el => {
        const to = +el.dataset.count, o = { v: 0 };
        el.textContent = '0';
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
          onEnter: () => gsap.to(o, { v: to, duration: 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); } }) });
      });
      gsap.from('.num', { y: 40, autoAlpha: 0, stagger: .08, duration: 1.2, scrollTrigger: { trigger: '.numbers', start: 'top 85%' } });

      // 큰 제목 글자 오르기
      $$('.split-chars').forEach(el => {
        const chars = new SplitText(el, { type: 'words,chars', wordsClass: 'wd', charsClass: 'ch', mask: 'chars' }).chars;
        gsap.from(chars, { yPercent: 110, stagger: .03, duration: 1.3, scrollTrigger: { trigger: el, start: 'top 82%' } });
      });

      // 작업 목록 줄
      gsap.from('.index__row', { y: 50, autoAlpha: 0, stagger: .09, duration: 1.2, scrollTrigger: { trigger: '.index__list', start: 'top 82%' } });

      // 작업 머리
      $$('.work__head').forEach(h => {
        const lines = new SplitText($('.split-lines', h), { type: 'lines', linesClass: 'line', mask: 'lines' }).lines;
        gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 78%' } })
          .from($('.work__no', h), { yPercent: 40, autoAlpha: 0, duration: 1.6 })
          .from($('.work__tags', h), { autoAlpha: 0, y: 14, duration: .9 }, .1)
          .from(lines, { yPercent: 108, stagger: .1, duration: 1.3 }, .15)
          .from($$('.lead, .meta > div', h), { y: 28, autoAlpha: 0, stagger: .07, duration: 1.1 }, .45);
        gsap.to($('.work__no', h), { yPercent: -30, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      // 01 · 데모 사이트 32곳: 두 줄이 서로 다른 속도로 흐른다
      if (desk) {
        const rows = $$('.rail__row'), bar = $('.rail__progress span');
        const dist = () => Math.max(0, rows[0].scrollWidth - innerWidth);
        const skew = rows.map(r => gsap.quickTo(r, 'skewX', { duration: .5, ease: 'power3' }));
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.rail', start: 'top top', end: () => `+=${dist() * .9}`, pin: true, scrub: .9, invalidateOnRefresh: true,
          onUpdate: self => {
            bar.style.transform = `scaleX(${self.progress})`;
            const k = gsap.utils.clamp(-5, 5, self.getVelocity() / -400);
            skew.forEach((f, i) => f(i ? k * .7 : k));
          },
          onLeave: () => skew.forEach(f => f(0)), onLeaveBack: () => skew.forEach(f => f(0)) } });
        tl.fromTo(rows[0], { x: 0 }, { x: () => -dist(), ease: 'none', duration: 1 }, 0)
          .fromTo(rows[1], { x: () => -dist() * .22 }, { x: () => -dist(), ease: 'none', duration: 1 }, 0);
        gsap.from('.rail__big', { yPercent: 40, autoAlpha: 0, duration: 1.4, scrollTrigger: { trigger: '.rail', start: 'top 80%' } });
      }

      // 01 · 겹쳐 쌓이는 카드
      const cards = $$('.card');
      if (desk) {
        cards.forEach((c, i) => {
          c.style.position = 'sticky';
          c.style.top = `calc(9vh + ${i * 14}px)`;
          if (i < cards.length - 1) {
            gsap.to(c, { scale: .9, autoAlpha: .28, ease: 'none',
              scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true } });
          }
          gsap.fromTo($('.card__img img', c), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 15%', scrub: true } });
        });
      } else {
        cards.forEach(c => gsap.from(c, { y: 60, autoAlpha: 0, duration: 1.1, scrollTrigger: { trigger: c, start: 'top 88%' } }));
      }

      // 01 · 자동 검수 표
      gsap.from('.qa__table tr', { y: 24, autoAlpha: 0, stagger: .08, duration: 1, scrollTrigger: { trigger: '.qa', start: 'top 78%' } });
      gsap.from('.qa__text', { y: 40, autoAlpha: 0, duration: 1.2, scrollTrigger: { trigger: '.qa', start: 'top 80%' } });

      // 01 · 휴대폰 시차
      if (desk) $$('.phone').forEach((p, i) => {
        gsap.fromTo(p, { y: (i % 2 ? 120 : 40) }, { y: (i % 2 ? -60 : -120), ease: 'none',
          scrollTrigger: { trigger: '.phones', start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      // 02 · 자동화 도구 화면 확대와 색 돌아오기, 12단계 흐름선
      if (desk) {
        gsap.timeline({ scrollTrigger: { trigger: '.screen', start: 'top top', end: '+=130%', pin: true, scrub: .8 } })
          .fromTo('.screen__frame', { scale: .6 }, { scale: 1, ease: 'none', duration: 1 })
          .fromTo('.screen__color', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: .75 }, .4)
          .to({}, { duration: .25 });
        buildFlow();
      }

      // 02 · 기능 영상 벤토, 03 · 영상 세 편
      $$('.tile, .film').forEach(t => {
        gsap.fromTo($('.tile__media, .film__media', t), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'io',
          scrollTrigger: { trigger: t, start: 'top 88%' } });
        gsap.from($('figcaption', t), { y: 20, autoAlpha: 0, duration: 1, delay: .25, scrollTrigger: { trigger: t, start: 'top 88%' } });
      });

      // 04 · 기능 목록
      gsap.from('.features li', { x: 80, autoAlpha: 0, stagger: .08, duration: 1.2, scrollTrigger: { trigger: '.features', start: 'top 82%' } });

      // 이력: 흰 장이 원형으로 번진다
      gsap.fromTo('.bg__wipe', { clipPath: 'circle(0% at 50% 0%)' }, { clipPath: 'circle(142% at 50% 0%)', ease: 'none',
        scrollTrigger: { trigger: '.bg', start: 'top 88%', end: 'top 5%', scrub: true } });
      gsap.from('.tl', { y: 40, autoAlpha: 0, stagger: .07, duration: 1.1, scrollTrigger: { trigger: '.timeline', start: 'top 82%' } });
      gsap.from('.foot__fit > span', { yPercent: 100, autoAlpha: 0, stagger: .035, duration: 1.3, scrollTrigger: { trigger: '.foot__word', start: 'top 95%' } });

      // 캡션
      gsap.utils.toArray('.caption, .flow__legend').forEach(c => gsap.from(c, { y: 16, autoAlpha: 0, duration: 1, scrollTrigger: { trigger: c, start: 'top 92%' } }));
    });
  }

  /* ---------- 12단계 흐름선 그리기 ---------- */
  function buildFlow() {
    const wrap = $('.flow'), svg = $('.flow__svg'), path = $('.flow__path');
    const dots = $$('.step__dot', $('.flow__steps'));
    const draw = () => {
      const box = wrap.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const pts = dots.map(d => { const r = d.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (Math.abs(y1 - y0) < 4) { d += ` L ${x1} ${y1}`; continue; }
        const bulge = (x0 > box.width / 2 ? 1 : -1) * Math.min(110, box.width * .07);
        d += ` C ${x0 + bulge} ${y0} ${x1 + bulge} ${y1} ${x1} ${y1}`;
      }
      path.setAttribute('d', d);
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      return len;
    };
    flowST.forEach(s => s.kill()); flowST = [];
    let len = draw();
    path.style.strokeDashoffset = `${len}`;
    wrap.classList.add('flow--live');
    flowST.push(ScrollTrigger.create({ trigger: wrap, start: 'top 72%', end: 'bottom 55%', scrub: .6,
      onRefresh: () => { len = draw(); },
      onUpdate: self => {
        path.style.strokeDashoffset = `${len * (1 - self.progress)}`;
        const k = self.progress * (dots.length - 1);
        dots.forEach((dot, i) => dot.parentElement.classList.toggle('is-on', i <= k + .02));
      } }));
  }

  /* ---------- 상호작용 ---------- */
  function extras() {
    const play = $('.reel__play');

    // 업종 흐름(스크롤 속도 따라 빨라지고 기울어진다)
    const mq = $('.marquee__track');
    if (mq && !reduce) {
      let x = 0, dir = -1, on = false;
      new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(mq);
      gsap.ticker.add(() => {
        if (!on) return;
        const v = lenis ? lenis.velocity : 0;
        if (Math.abs(v) > .3) dir = v > 0 ? -1 : 1;
        x += dir * (0.75 + Math.min(Math.abs(v) * .5, 22));
        const half = mq.scrollWidth / 2;
        if (x <= -half) x += half; else if (x > 0) x -= half;
        mq.style.transform = `translate3d(${x}px,0,0) skewX(${gsap.utils.clamp(-10, 10, -v * .35)}deg)`;
      });
    }

    // 작업 목록 미리보기
    const prev = $('.preview'), inner = $('.preview__inner');
    if (prev && fine && !reduce) {
      const xTo = gsap.quickTo(prev, 'x', { duration: .7, ease: 'power3' }), yTo = gsap.quickTo(prev, 'y', { duration: .7, ease: 'power3' });
      addEventListener('pointermove', e => {
        const w = prev.offsetWidth, h = prev.offsetHeight;
        const left = e.clientX + 28 + w > innerWidth ? e.clientX - 28 - w : e.clientX + 28;
        xTo(left); yTo(Math.min(innerHeight - h - 16, Math.max(16, e.clientY - h / 2)));
      }, { passive: true });
      $$('.index__row').forEach(r => {
        r.addEventListener('pointerenter', () => {
          const t = r.dataset.thumb;
          if (t) { inner.classList.remove('is-text'); inner.textContent = ''; inner.style.backgroundImage = `url("${t}")`; }
          else { inner.classList.add('is-text'); inner.style.backgroundImage = 'none'; inner.textContent = $('.index__name', r).textContent; }
          prev.classList.add('is-on');
        });
        r.addEventListener('pointerleave', () => prev.classList.remove('is-on'));
      });
    }

    // 자석 버튼
    if (fine && !reduce) {
      $$('[data-magnetic]').forEach(el => {
        if (el === play) return; // 쇼릴 버튼 위치는 applyReel 이 정한다
        const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * .35); yTo((e.clientY - r.top - r.height / 2) * .45);
        });
        el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
      });
    }

    // 머리 숨김
    const nav = $('.nav');
    if (lenis) {
      let last = 0, hidden = false;
      const set = h => { if (h === hidden) return; hidden = h; gsap.to(nav, { yPercent: h ? -100 : 0, duration: .7, ease: 'out', overwrite: true }); };
      lenis.on('scroll', ({ scroll }) => {
        if (body.classList.contains('is-loading')) return;
        if (scroll > 240 && scroll > last + 4) set(true);
        else if (scroll < last - 4 || scroll < 240) set(false);
        last = scroll;
      });
    }

    // 영상: 화면에 들어올 때만 받고 재생
    const vids = $$('video[data-src]').filter(v => !v.closest('.modal'));
    if (reduce) {
      vids.forEach(v => { v.src = v.dataset.src; v.preload = 'metadata'; v.controls = true; });
    } else {
      const io = new IntersectionObserver(es => es.forEach(e => {
        const v = e.target;
        if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); }
        else v.pause();
      }), { threshold: .15, rootMargin: '200px 0px' });
      vids.forEach(v => io.observe(v));
      // 화면 가운데에 들어온 영상만 색을 돌려준다
      const live = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '-30% 0px -30% 0px' });
      $$('.tile, .film').forEach(f => live.observe(f));
      new IntersectionObserver(es => { es[0].isIntersecting ? video.play().catch(() => {}) : video.pause(); }, { threshold: .02 }).observe($('.reel'));
    }

    // 쇼릴 전체 화면
    const modal = $('.modal'), mv = $('.modal__video'), close = $('.modal__close');
    let lastFocus = null;
    const openReel = () => {
      lastFocus = document.activeElement;
      if (!mv.getAttribute('src')) mv.src = mv.dataset.src;
      modal.hidden = false;
      lenis && lenis.stop();
      video.pause();
      gsap.fromTo(mv, { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduce ? 0 : 1.1, ease: 'io' });
      gsap.fromTo(close, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: .6, delay: reduce ? 0 : .5 });
      mv.currentTime = 0; mv.play().catch(() => {});
      close.focus();
    };
    const closeReel = () => {
      mv.pause();
      gsap.to(mv, { clipPath: 'inset(50% 50% 50% 50%)', duration: reduce ? 0 : .7, ease: 'io', onComplete: () => {
        modal.hidden = true; lenis && lenis.start(); if (!reduce) video.play().catch(() => {}); lastFocus && lastFocus.focus();
      } });
    };
    play.addEventListener('click', openReel);
    close.addEventListener('click', closeReel);
    modal.addEventListener('click', e => { if (e.target === modal) closeReel(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeReel(); });

    // 링크 글자 뒤섞임
    if (fine && !reduce) $$('.nav a, .rail__link, .foot__a .mono, .modal__close').forEach(el => el.addEventListener('pointerenter', () => scramble(el)));

    // 처음으로
    const top = $('.foot__top');
    top && top.addEventListener('click', () => scrollTo(0, { duration: 2.2 }));

    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
