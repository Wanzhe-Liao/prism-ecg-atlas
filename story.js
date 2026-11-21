/* Native scroll is the only animation clock. At the last stop A becomes A − B,
   using only the coordinates of these two published, quantized group means. */
(() => {
  'use strict';
  const find = (selector) => document.querySelector(selector);
  const story = find('.story');
  const stage = find('.stage');
  const root = document.documentElement;
  const controls = find('.controls');
  const toggle = find('#reading-mode');
  const steps = [...controls.querySelectorAll('[data-at]')];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shortScreen = window.matchMedia('(max-height: 615px), (max-width: 335px)');
  const a = find('#mean-a'), b = find('#mean-b');
  const aMotion = find('#a-motion'), bMotion = find('#b-motion');
  const baseA = find('#base-a'), baseB = find('#base-b');
  const label = find('.stage-label'), note = find('#direction');
  const progress = find('.progress i');
  const mainPlot = find('.main-plot');
  const sourceLabel = mainPlot.getAttribute('aria-label');
  const legend = find('.legend');
  const activeTrace = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  activeTrace.setAttribute('class', 'trace long');
  aMotion.append(activeTrace);
  find('#a-trace').setAttribute('visibility', 'hidden');

  const n = a.points.numberOfItems;
  const mix = (x, y, t) => x + (y - x) * t;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = (lo, hi, p) => {const t = clamp((p-lo)/(hi-lo)); return t*t*(3-2*t);};
  const plotX = [], voltsA = [], voltsB = [];
  for (let i=0;i<n;i++) {
    const A = a.points.getItem(i), B = b.points.getItem(i);
    plotX.push(A.x); voltsA.push(A.y); voltsB.push(B.y);
  }
  let motion = false, staticPreference = false, queued = false, lastP = -1, lastPhase = -1;
  const navHeight = () => find('.masthead').getBoundingClientRect().height;
  const range = () => story.offsetHeight - stage.offsetHeight;
  const phases = [
    ['分开看两组平均心搏', '向下滚动逐步相减，向上滚动可还原'],
    ['把两条线放在同一条零线上', '实线和虚线使用相同的时间位置与电压比例'],
    ['从 A 的平均线逐点减去 B', '正在演示相减；中间形状不是实测结果'],
    ['留下两组平均电压之差', 'A − B 在零线下方，表示此处 A 组平均电压更低'],
  ];

  function draw(p) {
    if (p === lastP) return;
    lastP = p;
    const align = smooth(.08,.43,p), subtract = smooth(.55,.90,p);
    const yA = mix(68,103,align), yB = mix(168,103,align);
    aMotion.setAttribute('transform',`translate(0 ${yA.toFixed(3)}) scale(1 -0.105)`);
    bMotion.setAttribute('transform',`translate(0 ${yB.toFixed(3)}) scale(1 -0.105)`);
    baseA.setAttribute('d',`M0 ${yA.toFixed(3)}H760`);
    baseB.setAttribute('d',`M0 ${yB.toFixed(3)}H760`);
    bMotion.style.opacity = String(1-subtract);
    const points = plotX.map((x,i) => `${x},${(voltsA[i]-subtract*voltsB[i]).toFixed(2)}`).join(' ');
    activeTrace.setAttribute('points',points);
    progress.style.transform = `scaleX(${p})`;
    const phase = p<.23 ? 0 : p<=.55 ? 1 : p<.9 ? 2 : 3;
    if (phase === lastPhase) return;
    lastPhase = phase;
    label.textContent = phases[phase][0]; note.textContent = phases[phase][1];
    mainPlot.setAttribute('aria-label',phase===3 ? '较长组平均波形减去较短组平均波形，横线为零。' : sourceLabel);
    legend.classList.toggle('difference',phase===3);
    steps.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===[0,1,2,2][phase])));
  }
  function render() {
    queued=false;
    draw(motion ? clamp((navHeight()-story.getBoundingClientRect().top)/Math.max(1,range())) : 0);
  }
  function schedule() { if(!queued && motion){ queued=true; requestAnimationFrame(render); } }
  function configure() {
    const allowed=!media.matches&&!shortScreen.matches;
    motion=allowed&&!staticPreference;
    root.classList.toggle('motion',motion);
    controls.hidden=!allowed;
    toggle.setAttribute('aria-pressed',String(staticPreference));
    toggle.textContent=motion?'静态阅读':'恢复滚动';
    steps.forEach(button=>button.disabled=!motion);
    steps[0].parentElement.hidden=!motion; note.hidden=!motion;
    // Use static layout if the reader's font settings leave insufficient room.
    if(motion && find('.stage-inner').offsetHeight+30>stage.clientHeight){
      motion=false;root.classList.remove('motion');controls.hidden=true;
    }
    lastP=-1;lastPhase=-1;render();
  }
  steps.forEach(button=>button.addEventListener('click',()=>{
    if(!motion)return;
    const y=window.scrollY+story.getBoundingClientRect().top-navHeight()+Number(button.dataset.at)*range();
    window.scrollTo(0,Math.round(y));
  }));
  toggle.addEventListener('click',()=>{
    const wasInStage=story.getBoundingClientRect().top<navHeight();
    staticPreference=!staticPreference;configure();
    if(wasInStage)story.scrollIntoView({block:'start'});
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',configure,{passive:true});
  window.addEventListener('pageshow',configure);
  media.addEventListener('change',configure);shortScreen.addEventListener('change',configure);
  configure();
})();
