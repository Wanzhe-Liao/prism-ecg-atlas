/* Native scroll is the only animation clock. At the last stop A becomes A − B,
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
  const sceneScreen = window.matchMedia('(min-width: 900px) and (min-height: 650px)');
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
      ['叠加均值：两组人的波峰并不重合', '同一导联、同一位置、同一电压比例'],
      ['上下分开，分别看两个平均心搏', '只移动了零线，没有改变实际波形'],
      ['重新对齐两组平均心搏', '两条线回到同一零线；这一步尚未相减'],
      ['回到同一零线，逐点相减', '正在演示相减；中间形状不是新的实测波形'],
      ['早段的负差值：A 组平均电压较低', 'A 组均值减去 B 组均值；向上滚动可还原'],
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
      if (motion && find('.stage-inner').offsetHeight + 30 > stage.clientHeight) {
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

  function initScrollScenes() {
    return [...document.querySelectorAll('.scroll-scene')].map(scene => {
      const layers = [...scene.querySelectorAll('.scene-layer')];
      const steps = [...scene.querySelectorAll('.scene-step')];
      let motion = false;
      let active = -1;

      function setActive(index) {
        if (index === active) return;
        active = index;
        scene.dataset.active = String(index);
        layers.forEach((layer, i) => {
          layer.classList.toggle('is-active', i === index);
          layer.setAttribute('aria-hidden', String(i !== index));
        });
        steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
      }

      function render() {
        if (!motion) return;
        let index = 0;
        const threshold = window.innerHeight * .56;
        steps.forEach((step, i) => {
          if (step.getBoundingClientRect().top <= threshold) index = i;
        });
        setActive(index);
      }

      function configure(requestedMotion) {
        motion = requestedMotion;
        active = -1;
        if (motion) {
          setActive(0);
          render();
        } else {
          scene.dataset.active = 'static';
          layers.forEach(layer => {
            layer.classList.remove('is-active');
            layer.removeAttribute('aria-hidden');
          });
          steps.forEach(step => step.classList.remove('is-active'));
        }
      }
      return { render, configure };
    });
  }

  function initChapterNavigation() {
    const chapters = [...document.querySelectorAll('.chapter[data-chapter]')];
    const links = [...document.querySelectorAll('[data-chapter-link]')];
    const current = find('#current-chapter');
    const count = find('#chapter-count');
    const progress = find('#reading-progress-bar');
    let currentId = '';

    function setCurrent(id) {
      if (!id || id === currentId) return;
      currentId = id;
      const index = Math.max(0, chapters.findIndex(chapter => chapter.id === id));
      const chapter = chapters[index];
      if (chapter && current) current.textContent = chapter.dataset.chapter;
      if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
      links.forEach(link => {
        if (link.dataset.chapterLink === id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    links.forEach(link => link.addEventListener('click', () => {
      const target = find(`#${link.dataset.chapterLink}`);
      if (target) {
        target.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
      const menu = link.closest('details.chapter-menu');
      if (menu) menu.open = false;
    }));

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        });
      }, { rootMargin: '-22% 0px -62% 0px', threshold: 0 });
      chapters.forEach(chapter => observer.observe(chapter));
    }
    setCurrent(chapters[0] && chapters[0].id);

    function render() {
      if (progress) {
        const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = `scaleX(${clamp(window.scrollY / range)})`;
      }
      if (!('IntersectionObserver' in window)) {
        let id = chapters[0] && chapters[0].id;
        chapters.forEach(chapter => {
          if (chapter.getBoundingClientRect().top <= window.innerHeight * .36) id = chapter.id;
        });
        setCurrent(id);
      }
    }
    return { render };
  }

  const hero = initHeroStory();
  const scenes = initScrollScenes();
  const navigation = initChapterNavigation();

  function renderAll() {
    queued = false;
    if (hero) hero.render();
    scenes.forEach(scene => scene.render());
    if (navigation) navigation.render();
  }

  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(renderAll);
    }
  }

  function configureAll() {
    const allowed = !reducedMotion.matches && !shortScreen.matches;
    const requestedMotion = allowed && !staticPreference;
    const heroMotion = hero ? hero.configure(allowed, requestedMotion) : false;
    const sceneMotion = requestedMotion && sceneScreen.matches;
    root.classList.toggle('scene-motion', sceneMotion);
    scenes.forEach(scene => scene.configure(sceneMotion));
    root.dataset.reading = heroMotion || sceneMotion ? 'enhanced' : 'static';
    renderAll();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', configureAll, { passive: true });
  window.addEventListener('pageshow', configureAll);
  window.addEventListener('load', configureAll);
  reducedMotion.addEventListener('change', configureAll);
  shortScreen.addEventListener('change', configureAll);
  sceneScreen.addEventListener('change', configureAll);
  configureAll();
})();
