/* Native scroll is the only animation clock. The cover isolates one published lead. In the V4 comparison A becomes A − B,
   using only the coordinates of these two published, quantized group means. */
(() => {
  'use strict';
  const root = document.documentElement;
  const find = selector => document.querySelector(selector);
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = (lo, hi, value) => {
    const t = clamp((value - lo) / (hi - lo));
    return t * t * (3 - 2 * t);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shortScreen = window.matchMedia('(max-height: 615px), (max-width: 335px)');
  let staticPreference = false;
  let queued = false;

  function initHeroStory() {
    const story = find('.story');
    const stage = find('.stage');
    const controls = find('.controls');
    const toggle = find('#reading-mode');
    const a = find('#mean-a');
    const b = find('#mean-b');
    const difference = find('#mean-difference');
    const aMotion = find('#a-motion');
    const bMotion = find('#b-motion');
    const baseA = find('#base-a');
    const baseB = find('#base-b');
    const label = find('.stage-label');
    const note = find('#direction');
    const progress = find('.progress i');
    const mainPlot = find('.main-plot');
    const legend = find('.legend');
    if (!story || !stage || !controls || !toggle || !a || !b || !difference ||
        !aMotion || !bMotion || !baseA || !baseB || !label || !note ||
        !progress || !mainPlot || !legend) return null;
    if (a.points.numberOfItems !== 381 || b.points.numberOfItems !== 381 ||
        difference.points.numberOfItems !== 381) return null;

    const steps = [...controls.querySelectorAll('[data-at]')];
    const sourceLabel = mainPlot.getAttribute('aria-label');
    const activeTrace = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    activeTrace.setAttribute('class', 'trace long');
    activeTrace.setAttribute('data-active-trace', '');
    aMotion.append(activeTrace);
    find('#a-trace').setAttribute('visibility', 'hidden');

    const plotX = [];
    const voltsA = [];
    const voltsB = [];
    for (let i = 0; i < 381; i += 1) {
      const pointA = a.points.getItem(i);
      const pointB = b.points.getItem(i);
      plotX.push(pointA.x);
      voltsA.push(pointA.y);
      voltsB.push(pointB.y);
    }
    const phases = [
      ['从一组人的平均心搏开始', '向下滚动，加入第二组人的平均线'],
      ['两组均值叠加，早期波峰分开', '同一导联、同一位置、同一电压比例'],
      ['上下分开，分别看两个平均心搏', '上下错开两条零线，保留各组电压'],
      ['重新对齐两组平均心搏', '两条均值回到共同零线'],
      ['回到同一零线，逐点相减', '过渡线显示逐点相减的运算过程'],
      ['早期 QRS 段，A 组平均电压较低', 'A 组均值减去 B 组均值，向上滚动可还原'],
    ];
    let motion = false;
    let lastP = -1;
    let lastPhase = -1;
    const navHeight = () => find('.masthead').getBoundingClientRect().height;
    const range = () => story.offsetHeight - stage.offsetHeight;

    function draw(value) {
      const p = clamp(value);
      if (p === lastP) return;
      lastP = p;
      const reveal = smooth(.035, .19, p);
      const separate = smooth(.29, .46, p) * (1 - smooth(.54, .66, p));
      const subtract = smooth(.67, .93, p);
      const yA = 108 + (62 - 108) * separate;
      const yB = 108 + (165 - 108) * separate;
      aMotion.setAttribute('transform', `translate(0 ${yA.toFixed(3)}) scale(1 -0.105)`);
      bMotion.setAttribute('transform', `translate(0 ${yB.toFixed(3)}) scale(1 -0.105)`);
      baseA.setAttribute('d', `M0 ${yA.toFixed(3)}H760`);
      baseB.setAttribute('d', `M0 ${yB.toFixed(3)}H760`);
      bMotion.style.opacity = String(reveal * (1 - subtract));
      baseB.style.opacity = String(reveal * (1 - subtract));
      const points = plotX.map((x, i) => `${x},${(voltsA[i] - subtract * voltsB[i]).toFixed(2)}`).join(' ');
      activeTrace.setAttribute('points', points);
      progress.style.transform = `scaleX(${p})`;
      const phase = p < .08 ? 0 : p < .34 ? 1 : p < .57 ? 2 : p < .67 ? 3 : p < .93 ? 4 : 5;
      story.dataset.phase = String(phase);
      story.dataset.progress = p.toFixed(4);
      if (phase === lastPhase) return;
      lastPhase = phase;
      label.textContent = phases[phase][0];
      note.textContent = phases[phase][1];
      const labels = [
        '2 型糖尿病患者中，心室激动时间平均较长组的 V4 导联平均波形。',
        sourceLabel,
        '两组 V4 平均波形上下分开，仅改变显示零线，不改变电压。',
        '两组 V4 平均波形重新对齐到同一零线，尚未相减。',
        '较长组均值正在逐点减去较短组均值；中间形状不是新的实测人群。',
        '两组平均电压之差，不代表个人心搏。负值表示较长组的均值较低。',
      ];
      mainPlot.setAttribute('aria-label', labels[phase]);
      legend.classList.toggle('difference', phase === 5);
      legend.classList.toggle('solo', phase === 0);
      activeTrace.classList.toggle('subtracted', phase >= 4);
      const activeButton = [-1, 0, 1, 2, 3, 3][phase];
      steps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === activeButton)));
    }

    function render() {
      draw(motion ? clamp((navHeight() - story.getBoundingClientRect().top) / Math.max(1, range())) : .25);
    }

    function configure(allowed, requestedMotion) {
      motion = requestedMotion;
      root.classList.toggle('motion', motion);
      controls.hidden = !allowed;
      toggle.setAttribute('aria-pressed', String(staticPreference));
      toggle.textContent = motion ? '静态阅读' : '恢复滚动';
      steps.forEach(button => { button.disabled = !motion; });
      steps[0].parentElement.hidden = !motion;
      note.hidden = !motion;
      if (motion && find('.stage-inner').offsetHeight + 16 > stage.clientHeight) {
        motion = false;
        root.classList.remove('motion');
        controls.hidden = true;
      }
      lastP = -1;
      lastPhase = -1;
      render();
      return motion;
    }

    steps.forEach(button => button.addEventListener('click', () => {
      if (!motion) return;
      const y = window.scrollY + story.getBoundingClientRect().top - navHeight() + Number(button.dataset.at) * range();
      window.scrollTo({ top: Math.round(y), behavior: 'auto' });
    }));
    toggle.addEventListener('click', () => {
      const wasInStage = story.getBoundingClientRect().top < navHeight();
      staticPreference = !staticPreference;
      configureAll();
      if (wasInStage) story.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    return { render, configure };
  }

  function initAtlas() {
    const opening = find('#opening');
    const cover = find('.cover');
    const traces = [...cover.querySelectorAll('.atlas-trace')];
    const axis = find('.single-axis');
    const caption = find('#atlas-caption');
    const button = find('#isolate-lead');
    const hint = find('.scroll-cue');
    const leadTag = find('.plate-no');
    const heading = find('.cover-line');
    const description = find('.cover-copy p:last-child');
    const fullHeading = heading.innerHTML;
    const fullDescription = description.textContent;
    const mobile = window.matchMedia('(max-width: 720px)');
    let scrollEnabled = false;
    let staticFocus = false;
    let lastProgress = -1;
    let focused = null;
    const range = () => Math.max(1, opening.offsetHeight - cover.offsetHeight);

    function render() {
      const header = find('.masthead').offsetHeight;
      const p = scrollEnabled ? clamp((header - opening.getBoundingClientRect().top) / range()) : Number(staticFocus);
      if (p === lastProgress) return;
      lastProgress = p;
      const focus = smooth(.03, .9, p);
      const fade = smooth(.12, .76, p);
      const close = mobile.matches;
      traces.forEach((row, i) => {
        const selected = row.dataset.lead === 'II';
        const startX = close ? 20 + 11 * i : 38 + 13 * i;
        const startY = 90 + i * 13;
        const x = startX + (75 - startX) * focus;
        const y = startY + (108 - startY) * focus;
        const sx = .985 + .065 * focus;
        const sy = .51 + .40 * focus;
        row.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`);
        row.style.opacity = selected ? '1' : String(.85 * (1 - fade));
      });
      axis.style.opacity = String(smooth(.55, .88, p));
      opening.dataset.focus = p.toFixed(4);
      const single = p >= .75;
      if (single !== focused) {
        focused = single;
        leadTag.textContent = single ? 'II' : '12';
        heading.innerHTML = single ? '沿着 II 导联，<br>看两组心搏的差异。' : fullHeading;
        description.textContent = single ? '画面保留了刚才十二条曲线中的 II 导联。每一点都是两组心衰患者在同一位置的平均电压差。' : fullDescription;
        caption.textContent = single ? 'II 导联 / 0–380 配准采样点' : '两组平均心搏之差 / 十二导联';
        button.textContent = single ? '查看十二导联' : '单看 II 导联';
        button.setAttribute('aria-label', single ? '查看十二导联' : '单看 II 导联');
        hint.firstChild.textContent = single ? '上滑还原十二导联 ' : '滚动聚焦 II 导联 ';
        hint.lastElementChild.textContent = single ? '↑' : '↓';
      }
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      if (scrollEnabled) {
        const top = scrollY + opening.getBoundingClientRect().top - find('.masthead').offsetHeight;
        window.scrollTo({top: Math.round(top + (focused ? 0 : range())), behavior:'auto'});
      } else {
        staticFocus = !staticFocus;
        render();
      }
    });
    function configure(allowed) {
      scrollEnabled = allowed;
      root.classList.toggle('atlas-motion', scrollEnabled);
      lastProgress = -1;
      render();
    }
    return {render, configure};
  }

  function initReconstruction() {
    const panel = find('.recon-panel');
    const controls = panel.querySelector('.seg');
    const traces = panel.querySelectorAll('.reconstructed');
    const observed = controls.querySelector('[data-recon="observed"]');
    const both = controls.querySelector('[data-recon="both"]');
    const key = panel.querySelector('.legend span:nth-child(2)');
    let manual = null;
    let useScroll = false;
    let previous = -1;
    controls.hidden = false;
    function render() {
      const top = panel.getBoundingClientRect().top;
      const progress = smooth(.06, .46, (window.innerHeight - top) / window.innerHeight);
      const opacity = manual ?? (useScroll ? progress : 1);
      if (previous === opacity) return;
      previous = opacity;
      traces.forEach(trace => { trace.style.opacity = String(opacity); });
      key.style.visibility = opacity === 0 ? 'hidden' : 'visible';
      observed.setAttribute('aria-pressed', String(opacity === 0));
      both.setAttribute('aria-pressed', String(opacity > 0));
    }
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-recon]');
      if (!button) return;
      manual = button === both ? 1 : 0;
      render();
    });
    return {render, configure(enabled) { useScroll = enabled; render(); }};
  }

  const menu = find('.chapter-menu');
  const chapters = [...document.querySelectorAll('section[data-chapter]')];
  const links = [...menu.querySelectorAll('[data-chapter-link]')];
  const readingBar = find('#reading-progress-bar');
  let currentId = '';
  function updateNavigation() {
    const threshold = find('.masthead').offsetHeight + window.innerHeight * .22;
    let id = chapters[0].id;
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top > threshold) break;
      id = chapter.id;
    }
    if (currentId !== id) {
      currentId = id;
      links.forEach(link => {
        if (link.dataset.chapterLink === id) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }
    const range = Math.max(1, root.scrollHeight - window.innerHeight);
    readingBar.style.transform = `scaleX(${clamp(scrollY / range)})`;
  }
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    menu.open = false;
    const target = document.getElementById(link.dataset.chapterLink);
    target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  });
  document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });

  const hero = initHeroStory();
  const atlas = initAtlas();
  const reconstruction = initReconstruction();
  function renderAll() {
    queued = false;
    atlas.render();
    if (hero) hero.render();
    reconstruction.render();
    updateNavigation();
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(renderAll);
  }
  function configureAll() {
    const allowed = !reducedMotion.matches && !shortScreen.matches;
    const motion = allowed && !staticPreference;
    atlas.configure(motion);
    if (hero) hero.configure(allowed,motion);
    reconstruction.configure(motion);
    root.dataset.reading = motion ? 'enhanced' : 'static';
    renderAll();
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', configureAll, {passive:true});
  window.addEventListener('pageshow', configureAll);
  reducedMotion.addEventListener('change', configureAll);
  shortScreen.addEventListener('change', configureAll);
  configureAll();
})();
