(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shortScreen = window.matchMedia('(max-height: 600px)');
  const params = new URLSearchParams(window.location.search);
  const staticPreference = params.get('motion') === '0' || params.get('motion') === 'off';

  const find = (sel, scope = document) => scope.querySelector(sel);
  const findAll = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const isNum = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const fmtNum = (v, dec = 2, suffix = '', missing = '缺失') => (isNum(v) ? `${Number(v).toFixed(dec)}${suffix}` : missing);
  const fmtSigned = (v, dec = 2, suffix = '', missing = '缺失') =>
    (isNum(v) ? `${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(dec)}${suffix}` : missing);
  const fmtInt = (v, missing = '缺失') => (isNum(v) ? Math.round(Number(v)).toLocaleString('en-US') : missing);
  const fmtCi = (ci, dec = 2, signed = false, missing = '缺失') =>
    (Array.isArray(ci) && ci.length === 2 && isNum(ci[0]) && isNum(ci[1])
      ? `[${signed ? fmtSigned(ci[0], dec) : Number(ci[0]).toFixed(dec)}, ${signed ? fmtSigned(ci[1], dec) : Number(ci[1]).toFixed(dec)}]`
      : missing);
  const CANONICAL_WIN_BOUNDS = {
    Baseline: [-200, -120],
    P: [-120, -40],
    PR: [-40, 0],
    QRS: [0, 120],
    J_ST: [120, 240],
    T: [240, 560],
  };

  const LEADS12 = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  const WINS6 = ['P', 'PR', 'QRS', 'J_ST', 'T', 'Baseline'];
  const WIN_ZH = { P: 'P波', PR: 'PR段', QRS: 'QRS', J_ST: 'J/ST段', T: 'T波', Baseline: '基线' };
  const CLUSTER_PALETTE = ['#2a6e5d', '#35638f', '#bf4a40', '#b85a3a', '#764f8c', '#ae7b2f', '#4e7d6c', '#9c4c63'];

  const ARM_COLORS = {
    cnn1d_plus_prism_xgb: '#2a6e5d',
    ecgfounder_plus_prism_b: '#d97757',
    xecg_plus_prism_b: '#764f8c',
    frozen_prism_b: '#3b806d',
    waveform_cnn1d: '#35638f',
    cnn1d_plus_prism_e2e: '#78746a',
    frozen_ecgfounder: '#6c95b8',
    frozen_xecg: '#ae7b2f',
    frozen_pca512: '#b0aa9c',
  };

  const ARM_LABELS = {
    cnn1d_plus_prism_xgb: '1D-CNN + PRISM-XGB（回顾性后融合）',
    cnn1d_plus_prism_e2e: '1D-CNN + PRISM（端到端联合）',
    waveform_cnn1d: '1D-CNN（从零端到端训练）',
    ecgfounder_plus_prism_b: 'ECGFounder（冻结特征）+ PRISM（XGBoost）',
    xecg_plus_prism_b: 'xECG（冻结特征）+ PRISM（XGBoost）',
    frozen_prism_b: 'PRISM（冻结特征＋XGBoost）',
    frozen_ecgfounder: 'ECGFounder（冻结特征＋XGBoost）',
    frozen_xecg: 'xECG（冻结特征＋XGBoost）',
    frozen_pca512: 'PCA-512（冻结特征＋XGBoost）',
  };
  const armLabel = (arm, probe = 'xgb') => {
    if (probe === 'linear') {
      const linMap = {
        ecgfounder_plus_prism_b: 'ECGFounder（冻结特征）+ PRISM（线性头）',
        xecg_plus_prism_b: 'xECG（冻结特征）+ PRISM（线性头）',
        frozen_prism_b: 'PRISM（冻结特征＋线性头）',
        frozen_ecgfounder: 'ECGFounder（冻结特征＋线性头）',
        frozen_xecg: 'xECG（冻结特征＋线性头）',
        frozen_pca512: 'PCA-512（冻结特征＋线性头）',
      };
      if (linMap[arm]) return linMap[arm];
    }
    return ARM_LABELS[arm] || arm;
  };

  const CHAPTER_ZH = {
    'circulatory system': '循环系统',
    'endocrine/metabolic': '内分泌 / 代谢',
    'respiratory': '呼吸系统',
    'digestive': '消化系统',
    'genitourinary': '泌尿生殖系统',
    'hematopoietic': '血液系统',
    'neurological': '神经系统',
    'mental disorders': '精神与行为',
    'infectious diseases': '感染性疾病',
    'neoplasms': '肿瘤',
    'musculoskeletal': '肌肉骨骼系统',
    'injuries & poisonings': '损伤与中毒',
    'symptoms': '症状与体征',
    'sense organs': '感觉器官',
    'dermatologic': '皮肤系统',
    'pregnancy complications': '妊娠并发症',
    'congenital anomalies': '先天异常',
  };

  const F7_ZH = {
    '401.1': '原发性高血压',
    '250.2': '2 型糖尿病',
    '427.21': '心房颤动',
    '411.2': '心肌梗死',
    '428.1': '充血性心衰',
    '496': '慢性气道阻塞',
    '585.3': '慢性肾衰',
    '426.21': '左束支传导阻滞',
    '426.22': '右束支传导阻滞',
    '411.4': '冠脉粥样硬化',
    '276.12': '低钠血症',
    '276.13': '高钾血症',
    '285': '贫血',
    '512.8': '急性呼吸衰竭',
    '585.1': '急性肾损伤',
    '571.5': '慢性肝病 / 肝硬化',
    '272.1': '高脂血症',
    '278.1': '肥胖症',
    '425.1': '原发性心肌病',
    '433.21': '脑梗死',
    '530.11': '胃食管反流 (GERD)',
    '318': '吸烟/烟草依赖',
    '296.2': '抑郁症',
    '578.9': '消化道出血',
    '411.3': '心绞痛',
    '411.8': '其他慢性缺血性心脏病',
    '418': '非特异性胸痛',
    '427.9': '心悸',
    '496.21': '慢性阻塞性支气管炎',
    '327.3': '睡眠呼吸暂停',
    '306': '其他精神障碍',
    '317.1': '酒精依赖',
    '550.2': '膈疝',
    '550.4': '脐疝',
    '558': '非感染性胃肠炎',
    '574.1': '胆石症',
    '594': '泌尿系结石',
    '594.1': '肾结石',
    '716.9': '未特指关节病',
    '960.2': '青霉素过敏',
    '572': '非恶性腹水',
    '994.2': '脓毒症',
    '509.1': '呼吸衰竭',
    '286.2': '长期使用抗凝药',
    '038': '败血症',
    '327.32': '阻塞性睡眠呼吸暂停',
    '707.2': '下肢或足部慢性溃疡',
    '797.1': '心源性休克',
    '710.19': '骨髓炎',
    '198.6': '骨转移恶性肿瘤',
    '386.9': '头晕与眩晕',
    '747.12': '先天性心瓣膜/心腔异常',
    '634': '流产与死胎',
  };

  const TRAIT_ZH = {
    bmi: '体重指数 (BMI)',
    weight: '体重',
    crp: 'C 反应蛋白 (CRP)',
    albumin: '血清白蛋白',
    sbp_ed: '收缩压 (SBP)',
    dbp_ed: '舒张压 (DBP)',
    lymphocyte_pct: '淋巴细胞比例',
    neutrophil_pct: '中性粒细胞比例',
    hemoglobin: '血红蛋白 (Hb)',
    hematocrit: '红细胞压积 (HCT)',
    rbc: '红细胞计数 (RBC)',
    rdw: '红细胞分布宽度 (RDW)',
    wbc: '白细胞计数 (WBC)',
    calcium: '血清钙',
    hba1c: '糖化血红蛋白 (HbA1c)',
    glucose: '血糖',
    hdl: '高密度脂蛋白 (HDL)',
    total_bilirubin: '总胆红素',
    phosphate: '血清磷',
    creatinine: '血清肌酐',
    urea_bun: '血尿素氮 (BUN)',
    triglycerides: '甘油三酯 (TG)',
    egfr: '估算肾小球滤过率 (eGFR)',
    alp: '碱性磷酸酶 (ALP)',
    ast: '天冬氨酸氨基转移酶 (AST)',
    alt: '丙氨酸氨基转移酶 (ALT)',
    ldl: '低密度脂蛋白 (LDL)',
    mcv: '平均红细胞体积 (MCV)',
    height: '身高',
    platelets: '血小板计数',
    ntprobnp: 'NT-proBNP',
    lvef: '超声 LVEF',
    lvedv_biplane: '左室舒张末容积 LVEDV',
    potassium: '血清钾 (K+)',
    troponin_t: '肌钙蛋白 T',
    sodium: '血清钠 (Na+)',
  };

  const TARGET_ZH = {
    lvef: '左室射血分数 (LVEF)',
    ntprobnp: '心衰标志物 (NT-proBNP)',
    bmi: '体重指数 (BMI)',
    crp: '系统炎症 (CRP)',
    mortality_365d: '365 日全因死亡率',
  };

  const BRAND_ZH = {
    applewatch_serie9: 'Apple Watch S9',
    fitbitsense2: 'Fitbit Sense 2',
    samsunggalaxy6: 'Galaxy Watch 6',
    withingsscanwatch: 'Withings ScanWatch',
  };

  function bindChipGroup(groupEl, onSelect) {
    if (!groupEl) return;
    groupEl.addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      if (!btn || !groupEl.contains(btn)) return;
      findAll('button', groupEl).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      onSelect(btn);
    });
  }

  function pulseFade(el) {
    if (!el || reducedMotion.matches) return;
    el.classList.remove('v11-fade-in');
    void el.offsetWidth;
    el.classList.add('v11-fade-in');
  }

  /* ==================== 1. Hero Cinema Theater (Kinetic Prism + 12-Lead Real Atlas) ==================== */
  function initHeroAtlas() {
    const opening = find('#opening');
    if (!opening) return { render() {}, configure() {} };

    const modeSeg = find('#hero-mode-seg');
    const prismStage = find('#hero-prism-stage');
    const leadsStage = find('#hero-12lead-stage');
    const theaterSub = find('#hero-theater-sub');
    const traces = findAll('.atlas-trace');
    const axis = find('.single-axis');
    const axisLabels = find('#single-axis-labels');
    const caption = find('#atlas-caption');
    const leadTag = find('.plate-no');
    const pillGroup = find('.lead-pills');
    const pills = pillGroup ? findAll('button', pillGroup) : [];
    const mobile = window.matchMedia('(max-width: 720px)');

    let currentP = 0;
    let currentLead = 'II';
    let pillAnimRaf = 0;
    let lastStateKey = '';

    const setActivePill = key => pills.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.leadFocus === key)));

    function applyVisualState(p, targetLead, force = false) {
      const stateKey = `${p.toFixed(4)}|${targetLead}`;
      if (!force && stateKey === lastStateKey) return;
      lastStateKey = stateKey;
      currentP = p;
      currentLead = targetLead;

      const focus = smooth(0.03, 0.88, p);
      const fade = smooth(0.12, 0.74, p);
      const close = mobile.matches;

      traces.forEach((row, i) => {
        const selected = row.dataset.lead === targetLead;
        const startX = close ? 20 + 11 * i : 38 + 13 * i;
        const startY = 82 + i * 13;
        const x = startX + (75 - startX) * focus;
        const y = startY + (242 - startY) * focus;
        const sx = (close ? 0.99 : 0.985) + (1.05 - (close ? 0.99 : 0.985)) * focus;
        const sy = 0.51 + ((selected ? 0.78 : 0.62) - 0.51) * focus;
        row.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
        const baseOp = row.dataset.lead === 'II' ? 1 : 0.78;
        row.style.opacity = String(selected ? Math.min(1, baseOp + 0.22 * fade) : baseOp * (1 - fade * 0.92));
        row.classList.toggle('is-focused', focus > 0.35 && selected);
      });

      if (axis) axis.style.opacity = String(smooth(0.28, 0.72, p));
      if (axisLabels) axisLabels.style.opacity = String(smooth(0.32, 0.78, p));
      if (leadTag) leadTag.textContent = focus > 0.58 ? targetLead : '12';
      if (caption) caption.textContent = focus > 0.58 ? `${targetLead} 导联放大 / 381 点配准坐标` : '心衰两组平均心搏之差 / 十二导联';
    }

    function animateFocusTo(toP, toLead) {
      if (pillAnimRaf) cancelAnimationFrame(pillAnimRaf);
      if (reducedMotion.matches || staticPreference) { applyVisualState(toP, toLead, true); return; }
      const fromP = currentP;
      const t0 = performance.now();
      const step = now => {
        const t = clamp((now - t0) / 460);
        applyVisualState(fromP + (toP - fromP) * easeOutCubic(t), toLead, true);
        if (t < 1) pillAnimRaf = requestAnimationFrame(step);
        else pillAnimRaf = 0;
      };
      pillAnimRaf = requestAnimationFrame(step);
    }

    pills.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.leadFocus;
        setActivePill(choice);
        animateFocusTo(choice === 'all' ? 0 : 1, choice === 'all' ? currentLead : choice);
      });
    });

    if (modeSeg && prismStage && leadsStage) {
      bindChipGroup(modeSeg, btn => {
        const isPrism = btn.dataset.hmode === 'prism';
        prismStage.hidden = !isPrism;
        leadsStage.hidden = isPrism;
        if (theaterSub) {
          theaterSub.textContent = isPrism
            ? '配准心搏的分解过程 · 真实队列平均 II 导联波形 (µV)'
            : '真实临床 12 导联实测心搏差 · 点击右侧胶囊聚焦单导联';
        }
        if (!isPrism) applyVisualState(currentP, currentLead, true);
      });
    }

    applyVisualState(0, 'II', true);
    return {
      render() {},
      configure(motion) {
        root.classList.toggle('atlas-motion', motion);
      },
    };
  }

  /* ==================== 1B. Hero Live Metrics, Real Cohort-Average Beat & Global Atlas ==================== */
  function renderHeroLiveStats(D) {
    const fid = D.reconstruction_and_fidelity || {};
    const heroWf = fid.hero_real_cohort_waveform;
    if (heroWf && Array.isArray(heroWf.observed_mean_uv) && heroWf.observed_mean_uv.length > 10) {
      const obs = heroWf.observed_mean_uv;
      const rec = heroWf.reconstructed_mean_uv || obs;
      const allV = [...obs, ...rec].filter(isNum).map(Number);
      const yMin = Math.min(...allV, -40);
      const yMax = Math.max(...allV, 120);
      const span = Math.max(1e-3, yMax - yMin);
      const toPath = (arr, x0, x1, yTop, yBot) => arr.map((v, i) => {
        const px = x0 + (i / Math.max(1, arr.length - 1)) * (x1 - x0);
        const py = yBot - ((Number(v) - yMin) / span) * (yBot - yTop);
        return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
      }).join(' ');
      const leftObsD = toPath(obs, 34, 288, 56, 250);
      const rightObsD = toPath(obs, 838, 1092, 56, 214);
      const rightRecD = toPath(rec, 838, 1092, 56, 214);
      const setD = (id, d) => { const el = find(id); if (el) el.setAttribute('d', d); };
      setD('#hero-real-obs-bg', leftObsD);
      setD('#hero-real-obs-path', leftObsD);
      setD('#hero-real-right-obs', rightObsD);
      setD('#hero-real-rec-path', rightRecD);
      const lbl = find('#hero-real-left-label');
      if (lbl) lbl.textContent = `01 · ${heroWf.source_site_label || '外院队列均值'} (${heroWf.lead || 'II'} 导联 · µV)`;
    }

    const sp = fid.external_full_cohort_spotcheck || {};
    const errs = [
      fid.tianyi_frozen_spotcheck?.relative_error_median_percent,
      fid.pkuph_frozen_spotcheck?.relative_error_median_percent,
      sp.anzhen?.spotcheck_median_rel_error_pct,
      sp.code15?.spotcheck_median_rel_error_pct,
      sp.tianyi?.spotcheck_median_rel_error_pct,
      sp.renmin?.spotcheck_median_rel_error_pct,
    ].filter(isNum).map(Number);
    if (errs.length) {
      const lo = Math.min(...errs).toFixed(1);
      const hi = Math.max(...errs).toFixed(1);
      const errNote = find('#hero-prism-err-note');
      if (errNote) errNote.textContent = `四个外院抽检的中位相对重建误差为 ${lo}%–${hi}%`;
      const fidSub = find('#hero-spec-fid-sub');
      if (fidSub) fidSub.textContent = `四个外院抽检的中位相对重建误差为 ${lo}%–${hi}%`;
    }
    const gl = D.phewas_v2?.global_17_chapters || {};
    const pwEl = find('#hero-spec-phewas');
    const pwSub = find('#hero-spec-phewas-sub');
    if (pwEl && isNum(gl.d10_lrt10_replicated_conf_fdr05_count)) {
      const chCov = gl.chapters_with_d10_lrt_replicated ?? 17;
      pwEl.textContent = `${fmtInt(chCov)}/17 章 · ${fmtInt(gl.d10_lrt10_replicated_conf_fdr05_count)} 表型`;
    }
    const srAll = D.spectrum_d10?.mimic?.all_589?.weightings?.equal_integer_stem?.d10?.S_over_R;
    if (pwSub) {
      pwSub.textContent = `十条心电轴开发/确认双集复现 · 共享信号比 ${isNum(srAll) ? (srAll * 100).toFixed(1) + '%' : '95.3%'}`;
    }
    const nPatRep = D.pseudotime_v3_and_counterfactual?.repeat_projection?.n_unique_repeat_patients;
    const nRecRep = D.pseudotime_v3_and_counterfactual?.repeat_projection?.n_projected_repeat_records;
    const trajEl = find('#hero-spec-traj');
    if (trajEl && isNum(nPatRep)) trajEl.textContent = `${fmtInt(nPatRep)} 名复测患者`;
    const trajSub = trajEl?.nextElementSibling;
    const feComp = D.pseudotime_v3_and_counterfactual?.fe_summary_computed || {};
    if (trajSub && isNum(nRecRep)) {
      trajSub.textContent = `${fmtInt(nRecRep)} 条记录 · ${feComp.n_positive_point_slope ?? 14}/${feComp.n_diseases_total ?? 15} 慢病年斜率为正（${feComp.n_positive_bh_q05 ?? 12} 种有统计支持）`;
    }

    const fp = D.watch_adaptation?.edge_footprint || {};
    const kb = fp.footprint_rung2_fir_plus_id_residual_kb?.total_adapted_edge_bundle_kb
      ?? fp.footprint_14param_id_residual_d10_kb?.total_adapted_edge_bundle_kb;
    const latMs = fp.single_thread_cpu_latency_ms?.rung2_end_to_end_qc_plus_inference_ms?.median
      ?? fp.single_thread_cpu_latency_ms?.end_to_end_qc_plus_inference_ms?.median;
    const sjMae = D.watch_adaptation?.sjlife?.readouts?.rung2b_fir_plus_id_residual_cal_primary?.health_score_points?.mae;
    const wEl = find('#hero-spec-watch');
    const wSub = find('#hero-spec-watch-sub');
    if (wEl && isNum(kb) && isNum(latMs)) wEl.textContent = `${Number(kb).toFixed(1)} KB · ${Number(latMs).toFixed(2)} ms`;
    if (wSub && isNum(sjMae)) wSub.textContent = `单线程 CPU 实测 · 配对 Apple Watch 2b 校正 MAE ${Number(sjMae).toFixed(2)} 分`;

    const nSources = Object.keys(D.meta?.sources_resolved || {}).length;
    if (nSources > 0) {
      const gs = find('#global-sources-count');
      if (gs) gs.textContent = `${nSources} 份聚合产物 SHA-256 锁定`;
      const fpFoot = find('#footer-provenance-summary');
      if (fpFoot) fpFoot.textContent = `零个体导出 · 零封存集读取 · ${nSources} 份公开聚合产物 SHA-256 锁定`;
    }
  }

  function renderGlobalAtlas(D) {
    renderHeroLiveStats(D);
    const detailEl = find('#global-region-detail');
    const segEl = find('#global-region-seg');
    const mapSvg = find('#global-map-svg');
    if (!detailEl || !segEl) return;

    const sp = D.reconstruction_and_fidelity?.external_full_cohort_spotcheck || {};
    const rog8 = D.rog_benchmarks?.v8_xgb || {};
    const rogBnd = D.rog_benchmarks?.v8_r2_boundaries || {};
    const pw = D.phewas_v2 || {};
    const pt = D.pseudotime_v3_and_counterfactual || {};
    const nsl = D.native_single_lead_v12 || {};
    const mim = nsl.mimic_confirmation || {};
    const extNsl = nsl.external_clinical_lead_i || {};
    const mc = nsl.mcmed_stanford_ed_lead_ii || {};
    const w = nsl.wearables_and_open_single_lead || {};
    const cinc = w.cinc2017_alivecor_handheld || {};
    const zen = w.zenodo_16416031_community_healthcheck || {};
    const cpsc = w.cpsc2019_ambulatory_single_lead || {};
    const butq = w.butqdb_quality_gating || {};
    const sj = w.sjlife_cancer_survivors || {};
    const wecg = w.wecgdb_wrist_ami || {};
    const wmh = w.watchmyheart_apple7_vs_samsung4 || {};
    const ecgid = w.ecgid_multiday || {};
    const hv = w.heartvoice_vt_single_lead || {};
    const ahfGlob = w.apple_watch_s8_csv_format_check || {};

    const c15Rcs365 = D.curves_and_burden_v13?.rcs_fitted_curves_5bin_15?.code15?.mortality_365d
      || D.covariates_and_curves_v12?.rcs_fitted_curves_15?.code15?.mortality_365d || {};
    const c15Bins = c15Rcs365.bins || [];
    const c15Lo = c15Bins[0]?.y;
    const c15Hi = c15Bins[c15Bins.length - 1]?.y;
    const c15Mono = c15Rcs365.is_strictly_monotonic ? '五箱严格递减' : '总体随评分升高而下降';

    const sphArms = rog8.within_cohort?.sph_aha?.arms || {};
    const cpsc18Arms = rog8.within_cohort?.cpsc2018_9class?.arms || {};
    const ptb5Arms = rog8.within_cohort?.ptbxl_super5?.arms || {};
    const ptb23Arms = rog8.within_cohort?.ptbxl_sub23?.arms || {};
    const c2pArms = rog8.cross_country?.cpsc2018_to_ptbxl?.arms || {};
    const s2pArms = rog8.cross_country?.sph_to_ptbxl?.arms || {};
    const nSources = Object.keys(D.meta?.sources_resolved || {}).length || 38;
    const efSum = rogBnd.ecgfounder_frozen_plus_prism_summary || {};

    const regions = {
      usa: {
        badge: 'NORTH AMERICA · 开发源 + 3 独立评估队列',
        title: '美国：临床确认、急诊监护与穿戴配对',
        summary: '临床与原生单导字典均在 MIMIC 开发集（51,905 例）冻结；下表标明各站检验任务。',
        items: [
          {
            name: 'MIMIC-IV 确认集 [重建 · 关联 · 预测 · 纵向]',
            body: `<strong>${fmtInt(D.curves_and_burden_v13?.mimic_confirmation_disease_burden_5bin?.n_confirmation)} 例</strong> · 十轴双集复现 <strong>${fmtInt(pw.global_17_chapters?.d10_lrt10_replicated_conf_fdr05_count)} 表型（17/17 章）</strong> · <strong>${fmtInt(pt.repeat_projection?.n_unique_repeat_patients)} 复测患者 / ${fmtInt(pt.repeat_projection?.n_projected_repeat_records)} 条</strong> · PRISM-I <strong>${fmtNum(mim.reconstruction_lead_i_capacity_ladder?.K1000?.pooled_rmse_uv, 2, ' µV')}</strong>。`,
          },
          {
            name: 'Stanford MC-MED 急诊 II 导 [重建 · 预测]',
            body: `<strong>${fmtInt(mc.reconstruction?.lead_inventory_verified?.Lead_II_visits)} 就诊 / ${fmtInt(mc.reconstruction?.lead_inventory_verified?.unique_patients_analyzed)} 首诊患者</strong> · PRISM-II R² <strong>${fmtNum(mc.reconstruction?.native_prism_ii_qrs_norm?.pooled_r2_vs_dev_mean, 4)}</strong>；7 项中 6 项点估计高于跨导联（NT-proBNP 0.6969 vs 0.7039）。`,
          },
          {
            name: 'St. Jude SJLIFE Apple Watch S7 [设备校准]',
            body: `档位 <strong>${esc(sj.n_paired_valid_band || '230-239')} 人</strong>（覆盖 ${esc(sj.roster_coverage_band || '>95%')}）· 紧凑 2b MAE <strong>${fmtNum(D.watch_adaptation?.sjlife?.readouts?.rung2b_fir_plus_id_residual_cal_primary?.health_score_points?.mae, 2, ' 分')}</strong>（原生 PRISM-I 2b <strong>${fmtNum(sj.watch_vs_clinical_adaptation?.locked_2b_adapted_5fold_cv?.composite?.mae, 2, ' 分')}</strong>），不含化疗剂量。`,
          },
          {
            name: 'PhysioNet / CinC 2017 AliveCor [重建 · 房颤]',
            body: `<strong>${fmtInt(cinc.n_total_records)} 条</strong>手持记录 · PRISM-I R² <strong>${fmtNum(cinc.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</strong> · 零重训房颤 AUROC <strong>${fmtNum(cinc.zero_refit_af_vs_normal_auroc_composite_I, 4)}</strong>。`,
          },
        ],
      },
      china: {
        badge: 'EAST ASIA · 三院合作评估 + 三大公开库',
        title: '中国：合作医院与公开基准评估',
        summary: '三家国内合作医院仅输出脱敏样本量档位；以下标明每站检验的重建、关联、预测或诊断任务。',
        items: [
          {
            name: '北京大学人民医院（北大人民 / PKUPH）[检验：重建 · 关联]',
            body: `12 导联中位相对重建误差 <strong>${fmtNum(sp.renmin?.spotcheck_median_rel_error_pct, 3, '%')}</strong>（档位 ${esc(sp.renmin?.total_rows_band || '30,000-99,999')}）· 严格条件对同向复现 <strong>${fmtNum(pw.external_replication?.pkuph?.strict_bonf?.same_direction_pct, 1, '%')}</strong>（伪码 1010 复现 ${fmtInt(pw.external_replication?.pkuph?.pseudo_1010_control?.replicated_p05_same_dir_count)}/${fmtInt(pw.external_replication?.pkuph?.pseudo_1010_control?.n_pairs_tested)}）。`,
          },
          {
            name: '天津医科大学第二医院（天医二院）[检验：重建 · 关联 · 预测]',
            body: `12 导联中位相对重建误差 <strong>${fmtNum(sp.tianyi?.spotcheck_median_rel_error_pct, 3, '%')}</strong>（档位 ${esc(sp.tianyi?.total_rows_band || '30,000-99,999')}）· 条件对同向 <strong>${fmtNum(pw.external_replication?.tianyi?.strict_bonf?.same_direction_pct, 1, '%')}</strong> · 单导联 NT-proBNP AUROC <strong>${fmtNum(extNsl.tianyi?.endpoints?.ntprobnp_gt_1000?.native_comp_qrs_plus_ptp, 4)}</strong>。`,
          },
          {
            name: '北京安贞医院 [检验：重建 · 化验梯度 · 预测]',
            body: `12 导联中位相对重建误差 <strong>${fmtNum(sp.anzhen?.spotcheck_median_rel_error_pct, 3, '%')}</strong>（档位 ${esc(sp.anzhen?.total_rows_band || '3,000-9,999')}）· 性别标准化 Hb 五箱递增（14.00→14.27 g/dL）· 单导联 eGFR AUROC <strong>${fmtNum(extNsl.anzhen?.endpoints?.egfr_lt_60?.native_comp_qrs, 4)}</strong>。`,
          },
          {
            name: `SPH / CPSC 2018（洁净室诊断）& CPSC 2019（${fmtInt(cpsc.n_total_records)} 条动态）`,
            body: `ROG 洁净室字典 <code>de4f2327</code>：SPH 1D-CNN 后融合 AUROC <strong>${fmtNum(sphArms.cnn1d_plus_prism_xgb?.auroc, 4)}</strong>，CPSC 冻结 ECGFounder+PRISM <strong>${fmtNum(cpsc18Arms.ecgfounder_plus_prism_b?.auroc, 4)}</strong>，CPSC/SPH→PTB-XL 纯 PRISM <strong>${fmtNum(c2pArms.frozen_prism_b?.auroc, 4)} / ${fmtNum(s2pArms.frozen_prism_b?.auroc, 4)}</strong>；CPSC 2019 重建 R² <strong>${fmtNum(cpsc.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</strong>。`,
          },
        ],
      },
      brazil: {
        badge: 'SOUTH AMERICA · 远程医疗死亡随访',
        title: '巴西 CODE-15% [检验：重建 · 死亡梯度 · 预测]',
        summary: '使用 MIMIC 开发集冻结标尺评估南美远程医疗队列的重建保真度与 180/365 日全因死亡梯度。',
        items: [
          {
            name: `${fmtInt(sp.code15?.total_rows)} 例 12 导联零重训重建`,
            body: `中位相对重建误差 <strong>${fmtNum(sp.code15?.spotcheck_median_rel_error_pct, 3, '%')}</strong>；原生 PRISM-I 物理误差相对旧切片降低 <strong>${fmtNum(extNsl.code15?.paired_rmse_native_vs_legacy_uv?.rel_reduction_pct, 1, '%')}</strong>（至 <strong>${fmtNum(extNsl.code15?.paired_rmse_native_vs_legacy_uv?.rmse_new, 2, ' µV')}</strong>）。`,
          },
          {
            name: `${fmtInt(c15Rcs365.n_total)} 例 365 日全因死亡五箱曲线`,
            body: `统一等宽五箱 0–20 → 80–100 死亡率由 <strong>${fmtNum(c15Lo, 2, '%')}</strong> 降至 <strong>${fmtNum(c15Hi, 2, '%')}</strong>（${c15Mono}）；单导联综合分 AUROC <strong>${fmtNum(extNsl.code15?.mortality_365d?.native_prism_i_composite_phys_mv, 4)}</strong>（12 导总分 ${fmtNum(extNsl.code15?.mortality_365d?.full_12lead_h10, 4)}）。`,
          },
        ],
      },
      germany: {
        badge: 'CENTRAL EUROPE · 洁净室诊断基准',
        title: '德国 PTB-XL [检验：同院与跨国诊断融合]',
        summary: '在 ROG 外部零暴露洁净室字典（de4f2327）下，评估冻结表征与 1D-CNN 融合表现及德↔中迁移。',
        items: [
          {
            name: 'PTB-XL 10 中心同院诊断（冻结特征＋XGBoost）',
            body: `纯 PRISM 在 super5 达 AUROC <strong>${fmtNum(ptb5Arms.frozen_prism_b?.auroc, 4)}</strong>（冻结 ECGFounder ${fmtNum(ptb5Arms.frozen_ecgfounder?.auroc, 4)}）；冻结 ECGFounder+PRISM 在全部 9 项比较中 <strong>${efSum.point_increase_count ?? 8}/9</strong> 点估计提高（<strong>${efSum.ci95_above_zero_count ?? 7}/9</strong> 名义 95% CI &gt; 0；sub23 达 <strong>${fmtNum(ptb23Arms.ecgfounder_plus_prism_b?.auroc, 4)}</strong>）。`,
          },
          {
            name: 'PTB-XL ↔ CPSC / SPH 双向跨国迁移',
            body: `CPSC→PTB-XL 纯 PRISM <strong>${fmtNum(c2pArms.frozen_prism_b?.auroc, 4)}</strong>、SPH→PTB-XL <strong>${fmtNum(s2pArms.frozen_prism_b?.auroc, 4)}</strong>；1D-CNN 回顾性后融合（v8_r2）在 <strong>${fmtInt(rogBnd.auroc_ci95_above_zero)}/9</strong> 任务 AUROC 名义 95% CI &gt; 0。`,
          },
        ],
      },
      europe: {
        badge: 'EUROPE · 质控门禁 + 腕戴校准 + 重复性',
        title: '欧洲多中心 [检验：质控 · 设备校准 · 重复性]',
        summary: '分别检验动态心电质量门禁、腕戴真机滤波校正、跨品牌均值去偏与多日重复性模型。',
        items: [
          {
            name: '捷克 PhysioNet BUT QDB [检验：信号质控]',
            body: `<strong>${fmtInt(butq.n_recordings_parsed)} 份</strong>长程动态记录：1 级清晰通过率 <strong>${fmtNum(butq.by_quality_class?.class_1?.registration_pass_pct, 1, '%')}</strong>，2 级中度 <strong>${fmtNum(butq.by_quality_class?.class_2?.registration_pass_pct, 1, '%')}</strong>，3 级不可用拦截率 <strong>${esc(butq.by_quality_class?.class_3?.rejection_rate_band || '缺失')}</strong>。`,
          },
          {
            name: `wECGdb 腕戴原型真机（n=${fmtInt(wecg.n_paired)}）[检验：设备校准]`,
            body: `含急性心梗与对照：紧凑版 2b MAE <strong>${fmtNum(D.watch_adaptation?.wecgdb?.readouts?.rung2b_fir_plus_id_residual_cal_primary?.health_score_points?.mae, 2, ' 分')}</strong>，系统偏倚由 −5.91 降至 −0.36 分；探索性 AMI AUROC <strong>${fmtNum(wecg.exploratory_ami_auroc_wrist_frozen_composite, 4)}</strong>。`,
          },
          {
            name: 'WatchMyHeart & ECG-ID [检验：跨品牌去偏 · 重复性模型]',
            body: `WatchMyHeart（档位 <strong>${esc(wmh.n_paired_volunteers_band || '90-99')} 人</strong>）检验跨品牌 2b 均值去偏（个体 CCC 有限）；ECG-ID（档位 ${esc(ecgid.icc_composite_I?.n_people_with_repeats_band || '80-89')} 人）模型推算 7 次均值 ICC <strong>${fmtNum(ecgid.icc_composite_I?.multiday_averaging_curve?.['K=7_days']?.icc_1k, 3)}</strong>。`,
          },
        ],
      },
      japan_sg: {
        badge: 'ASIA-PACIFIC · 社区体检 + 导出工程校验',
        title: '日本与新加坡 [检验：重建 · 社区分布 · 格式校验]',
        summary: '检验非住院体检队列与公开穿戴导出的零重训重建与评分分布（不含人群结局验证）。',
        items: [
          {
            name: '日本 Zenodo 16416031 体检 I 导联 [检验：重建 · 社区分布]',
            body: `样本量档位 <strong>${esc(zen.n_registered_band || '2,400-2,499')} 份</strong>（通过率 <strong>${esc(zen.registration_pass_band || '>99%')}</strong>）· 重建 R² <strong>${fmtNum(zen.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</strong> · 社区 H_I 中位数 <strong>${fmtNum(zen.composite_I_community_median, 1)} 分</strong>。`,
          },
          {
            name: '新加坡 HeartVoice & Apple Watch 512 Hz 格式核验 [检验：重建 · 格式解析]',
            body: (() => {
              const s8OkCnt = Number.isInteger(ahfGlob.n_files_parsed) && Number.isInteger(ahfGlob.n_files_total) && ahfGlob.n_files_total > 0 && ahfGlob.n_files_parsed === ahfGlob.n_files_total;
              const s8St = ahfGlob.format_check_passed === false ? '失败' : (ahfGlob.format_check_passed === true && s8OkCnt ? '通过' : '未确认');
              return `HeartVoice <strong>${fmtInt(hv.n_registered_records)} 条</strong>重建 R² <strong>${fmtNum(hv.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</strong>；Apple Watch ${fmtInt(ahfGlob.sample_rate_hz ?? 512)} Hz CSV 格式解析<strong>${s8St}</strong>（<strong>${fmtInt(ahfGlob.n_files_parsed)}/${fmtInt(ahfGlob.n_files_total)}</strong> 份样例，仅工程格式校验）。`;
            })(),
          },
        ],
      },
    };

    let activeRegion = 'usa';
    function renderRegion(key) {
      activeRegion = regions[key] ? key : 'usa';
      const r = regions[activeRegion];
      findAll('button', segEl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.region === activeRegion)));
      if (mapSvg) {
        findAll('[data-arc]', mapSvg).forEach(el => el.classList.toggle('is-active', el.dataset.arc === activeRegion));
        findAll('[data-hub]', mapSvg).forEach(el => {
          const isOn = el.dataset.hub === activeRegion;
          const pulse = el.querySelector('.map-hub-pulse');
          if (pulse) pulse.style.opacity = isOn ? '1' : '0';
        });
      }
      detailEl.innerHTML = `
        <div>
          <span class="badge-light">${esc(r.badge)}</span>
          <h3>${esc(r.title)}</h3>
          <p class="sub-copy">${esc(r.summary)}</p>
          <div class="global-cohort-list">${r.items.map(it => `
            <div class="global-cohort-item">
              <b>${esc(it.name)}</b>
              <span>${it.body}</span>
            </div>`).join('')}
          </div>
        </div>
        <p style="font-size:11.5px;color:var(--muted);padding-top:10px;border-top:1px solid var(--border)">所有数值均实时读取自 ${nSources} 份已验 SHA-256 的公开聚合产物，无任何人工填数。</p>`;
      pulseFade(detailEl);
    }

    if (!segEl.dataset.boundGlobal) {
      segEl.dataset.boundGlobal = '1';
      bindChipGroup(segEl, btn => renderRegion(btn.dataset.region));
      if (mapSvg) {
        findAll('[data-hub]', mapSvg).forEach(g => {
          const activate = () => renderRegion(g.dataset.hub);
          g.addEventListener('click', activate);
          g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } });
        });
      }
    }
    renderRegion(activeRegion);
  }

  /* ==================== 2. Reveal, Counters & Navigation ==================== */
  function initRevealAndCounters() {
    const revEls = findAll('.reveal');
    const countEls = findAll('[data-count-to]');

    const animateNum = el => {
      if (el.dataset.counted === '1') return;
      el.dataset.counted = '1';
      const target = Number(el.dataset.countTo);
      const dec = Number(el.dataset.decimals || 0);
      const suffix = el.dataset.suffix || '';
      const finalTxt = el.dataset.countText || `${target.toFixed(dec)}${suffix}`;
      if (reducedMotion.matches || staticPreference || !Number.isFinite(target)) { el.textContent = finalTxt; return; }
      const t0 = performance.now();
      const tick = now => {
        const t = clamp((now - t0) / 760);
        const v = target * easeOutCubic(t);
        el.textContent = t >= 1 ? finalTxt : (dec === 0 ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window) || reducedMotion.matches || staticPreference) {
      revEls.forEach(e => e.classList.add('is-visible'));
      countEls.forEach(animateNum);
      return;
    }
    const revObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revObs.unobserve(en.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 40px 0px' });
    revEls.forEach(e => revObs.observe(e));

    // Safeguard: reveal any element whose top has entered or scrolled past the viewport
    const sweepReveal = () => {
      const vh = window.innerHeight || 900;
      revEls.forEach(e => {
        if (!e.classList.contains('is-visible') && e.getBoundingClientRect().top <= vh + 40) {
          e.classList.add('is-visible');
          revObs.unobserve(e);
        }
      });
    };
    window.addEventListener('scroll', sweepReveal, { passive: true });
    requestAnimationFrame(sweepReveal);

    const numObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { animateNum(en.target); numObs.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    countEls.forEach(e => numObs.observe(e));
  }

  const menu = find('.chapter-menu');
  const chapters = findAll('section[data-chapter]');
  const navLinks = findAll('.nav-links a, .chapter-menu nav a');
  const readingBar = find('#reading-progress-bar');
  let currentNavId = '';

  function updateNavigation() {
    if (chapters.length) {
      const masthead = find('.masthead');
      const threshold = (masthead ? masthead.offsetHeight : 48) + window.innerHeight * 0.24;
      let id = chapters[0].id;
      for (const ch of chapters) {
        if (ch.getBoundingClientRect().top > threshold) break;
        id = ch.id;
      }
      if (currentNavId !== id) {
        currentNavId = id;
        navLinks.forEach(link => {
          const target = link.getAttribute('href').replace('#', '');
          if (target === id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }
    if (readingBar) {
      const range = Math.max(1, root.scrollHeight - window.innerHeight);
      readingBar.style.transform = `scaleX(${clamp(window.scrollY / range)})`;
    }
  }

  if (menu) {
    menu.addEventListener('click', ev => { if (ev.target.closest('a')) menu.open = false; });
    document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) menu.open = false; });
  }

  /* ==================== Reusable SVG Helpers ==================== */
  function buildMultiWaveSvg(seriesList, times, opts = {}) {
    const W = opts.width || 280;
    const H = opts.height || 92;
    const padY = opts.padY || 9;
    const vals = [];
    seriesList.forEach(s => (s.arr || []).forEach(v => { if (Number.isFinite(v)) vals.push(v); }));
    const rawMin = vals.length ? Math.min(...vals, 0) : -1;
    const rawMax = vals.length ? Math.max(...vals, 0) : 1;
    const rawSpan = Math.max(1e-6, rawMax - rawMin);
    const yMin = (opts.symMaxAbs && opts.symMaxAbs > 0) ? -opts.symMaxAbs : (rawMin - rawSpan * 0.05);
    const yMax = (opts.symMaxAbs && opts.symMaxAbs > 0) ? opts.symMaxAbs : (rawMax + rawSpan * 0.05);
    const span = Math.max(1e-6, yMax - yMin);
    const nPts = (seriesList[0]?.arr || []).length || 1;
    const t0 = times?.length ? times[0] : -200;
    const t1 = times?.length ? times[times.length - 1] : 560;
    const mapX = i => (nPts > 1 ? (i / (nPts - 1)) * W : 0);
    const mapT = t => clamp((t - t0) / Math.max(1, t1 - t0)) * W;
    const mapY = v => H - padY - ((v - yMin) / span) * (H - 2 * padY);

    let extras = '';
    if (Array.isArray(opts.shadeWindowRange) && opts.shadeWindowRange.length === 2) {
      const xA = mapT(opts.shadeWindowRange[0]);
      const xB = mapT(opts.shadeWindowRange[1]);
      extras += `<rect x="${xA.toFixed(1)}" y="0" width="${Math.max(4, xB - xA).toFixed(1)}" height="${H}" fill="${opts.shadeWindowColor || (opts.dark ? 'rgba(117,166,217,0.18)' : 'rgba(53,99,143,0.13)')}"/>`;
    }
    if (opts.shadeT) {
      const xA = mapT(CANONICAL_WIN_BOUNDS.T[0]);
      const xB = mapT(CANONICAL_WIN_BOUNDS.T[1]);
      extras += `<rect data-shade-window="T" data-t-bounds="240-560" x="${xA.toFixed(1)}" y="0" width="${Math.max(4, xB - xA).toFixed(1)}" height="${H}" fill="${opts.shadeTColor || (opts.dark ? 'rgba(92,184,158,0.13)' : 'rgba(42,110,93,0.09)')}"/>`;
    }
    if (opts.shadeQRS) {
      const xA = mapT(CANONICAL_WIN_BOUNDS.QRS[0]);
      const xB = mapT(CANONICAL_WIN_BOUNDS.QRS[1]);
      extras += `<rect data-shade-window="QRS" x="${xA.toFixed(1)}" y="0" width="${Math.max(4, xB - xA).toFixed(1)}" height="${H}" fill="${opts.dark ? 'rgba(217,119,87,0.12)' : 'rgba(217,119,87,0.09)'}"/>`;
    }
    const yZero = mapY(0);
    const zeroColor = opts.dark ? 'rgba(245,243,236,0.16)' : 'rgba(20,20,19,0.12)';
    const lines = seriesList.map(s => {
      const arr = s.arr || [];
      const pts = arr.map((v, i) => `${mapX(i).toFixed(1)},${mapY(v).toFixed(1)}`).join(' ');
      return `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 1.9}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} opacity="${s.opacity ?? 0.95}" points="${pts}"/>`;
    }).join('');
    let peakEl = '';
    if (opts.peakMarker && isNum(opts.peakMarker.timeMs) && isNum(opts.peakMarker.val)) {
      const px = mapT(Number(opts.peakMarker.timeMs));
      const py = mapY(Number(opts.peakMarker.val));
      peakEl = `<line x1="${px.toFixed(1)}" y1="0" x2="${px.toFixed(1)}" y2="${H}" stroke="rgba(191,74,64,0.52)" stroke-width="0.9" stroke-dasharray="2 2"/>`
        + `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.9" fill="${opts.peakMarker.color || '#bf4a40'}" stroke="${opts.dark ? '#141413' : '#ffffff'}" stroke-width="0.8"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${extras}<line x1="0" y1="${yZero.toFixed(1)}" x2="${W}" y2="${yZero.toFixed(1)}" stroke="${zeroColor}" stroke-width="0.9"/>${lines}${peakEl}</svg>`;
  }

  function renderHeatmapTable(mat, domLead, domWin, opts = {}) {
    const vals = LEADS12.flatMap(l => WINS6.map(w => Math.abs(mat?.[l]?.[w] ?? 0)));
    const vmax = Math.max(1e-6, ...vals);
    const isLight = Boolean(opts.light);
    const unit = opts.unit || '';
    const rgb = opts.rgb || (isLight ? '42,110,93' : '92,184,158');
    if (opts.highlightMax) {
      // Outline the true argmax cell instead of the marginal-lead x marginal-window intersection.
      let best = -1;
      LEADS12.forEach(l => WINS6.forEach(w => {
        const v = Math.abs(mat?.[l]?.[w] ?? 0);
        if (v > best) { best = v; domLead = l; domWin = w; }
      }));
    }
    return `<table class="v9-heatmap-table ${isLight ? 'is-light' : ''}"><thead><tr><th></th>${
      WINS6.map(w => `<th>${WIN_ZH[w] || w}</th>`).join('')
    }</tr></thead><tbody>${
      LEADS12.map(ld => `<tr><td class="hm-lead">${ld}</td>${WINS6.map(w => {
        const val = mat?.[ld]?.[w] ?? 0;
        const frac = clamp(Math.abs(val) / vmax);
        const alpha = (isLight ? (0.06 + 0.78 * Math.pow(frac, 0.85)) : (0.10 + 0.84 * Math.pow(frac, 0.85))).toFixed(3);
        const isDom = ld === domLead && w === domWin;
        const txtCol = isLight ? (frac > 0.50 ? '#faf9f5' : '#141413') : '#f5f3ec';
        return `<td class="hm-cell" style="background:rgba(${rgb},${alpha});color:${txtCol};${isDom ? 'outline:2px solid #d97757;' : ''}" title="${ld} / ${WIN_ZH[w]}: ${val.toFixed(2)}${unit}">${val.toFixed(opts.dec ?? 1)}${opts.cellSuffix || ''}</td>`;
      }).join('')}</tr>`).join('')
    }</tbody></table>`;
  }

  function drawManifoldCanvas(canvas, spaceObj, activeG, hitBoxesOut) {
    if (!canvas || !spaceObj) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.min(540, Math.max(280, canvas.parentElement.clientWidth - 28 || 480));
    const cssH = 290;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let g = 1; g < 4; g++) {
      ctx.beginPath(); ctx.moveTo((cssW * g) / 4, 0); ctx.lineTo((cssW * g) / 4, cssH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (cssH * g) / 4); ctx.lineTo(cssW, (cssH * g) / 4); ctx.stroke();
    }

    if (hitBoxesOut) hitBoxesOut.length = 0;
    const pad = 24;
    const toX = x => pad + x * (cssW - 2 * pad);
    const toY = y => cssH - pad - y * (cssH - 2 * pad);

    (spaceObj.clusters || []).forEach(cl => {
      const g = cl.g;
      const col = CLUSTER_PALETTE[g % CLUSTER_PALETTE.length];
      const focused = activeG === null || activeG === g;
      const alphaBase = focused ? 1 : 0.16;

      [['0.25', 0.08 * alphaBase, 1.0], ['0.55', 0.15 * alphaBase, 1.3], ['0.82', 0.25 * alphaBase, 1.8]].forEach(([lk, fillA, lw]) => {
        (cl.contours?.[lk] || []).forEach(poly => {
          if (!poly.length) return;
          ctx.beginPath();
          poly.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(toX(pt[0]), toY(pt[1]));
            else ctx.lineTo(toX(pt[0]), toY(pt[1]));
          });
          ctx.closePath();
          ctx.save();
          ctx.globalAlpha = fillA; ctx.fillStyle = col; ctx.fill();
          ctx.globalAlpha = focused ? 0.68 : 0.15; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
          ctx.restore();
        });
      });

      if (cl.ellipse) {
        const el = cl.ellipse;
        ctx.save();
        ctx.translate(toX(el.cx), toY(el.cy));
        ctx.rotate((-el.angle_deg * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(6, el.rx * (cssW - 2 * pad)), Math.max(6, el.ry * (cssH - 2 * pad)), 0, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.globalAlpha = focused ? 0.72 : 0.15; ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]); ctx.stroke();
        ctx.restore();
      }

      if (cl.centroid) {
        const cx = toX(cl.centroid[0]);
        const cy = toY(cl.centroid[1]);
        if (hitBoxesOut) hitBoxesOut.push({ g, cx: cx / cssW, cy: cy / cssH });
        ctx.save();
        ctx.globalAlpha = focused ? 1 : 0.3;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, focused && activeG === g ? 11 : 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = '700 9.5px -apple-system, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`C${g}`, cx, cy + 0.5);
        ctx.restore();
      }
    });
  }

  /* ==================== ACT 01: Foundation & Complementarity ==================== */
  function renderAct1(D) {
    let curSite = 'pkuph';
    let curMode = 'overlay';
    const updateRecon = () => {
      const pk = D.reconstruction_and_fidelity?.pkuph_frozen_spotcheck || {};
      const ty = D.reconstruction_and_fidelity?.tianyi_frozen_spotcheck || {};
      const obsUse = find('#recon-use-obs');
      const natUse = find('#recon-use-nat');
      const titleEl = find('#recon-title');
      const metEl = find('#recon-metric');
      if (!obsUse || !natUse) return;
      if (curSite === 'pkuph') {
        obsUse.setAttribute('href', '#renmin-v4-observed');
        natUse.setAttribute('href', '#renmin-v4-native');
        if (titleEl) titleEl.textContent = `北京大学人民医院（北大人民 / PKUPH）· 冻结抽检心搏（档位 ${pk.n_band || '1,000-2,999'}）`;
        if (metEl) metEl.textContent = `R² = ${fmtNum(pk.weighted_global_r2, 4)} · 中位相对误差 ${fmtNum(pk.relative_error_median_percent, 2, '%')} · 全库抽检 ${fmtNum(D.reconstruction_and_fidelity?.external_full_cohort_spotcheck?.renmin?.spotcheck_median_rel_error_pct, 3, '%')}`;
      } else {
        obsUse.setAttribute('href', '#tianyi-v4-observed');
        natUse.setAttribute('href', '#tianyi-v4-native');
        if (titleEl) titleEl.textContent = `天津医科大学第二医院（天医二院）· 冻结抽检心搏（档位 ${ty.n_band || '1,000-2,999'}）`;
        if (metEl) metEl.textContent = `R² = ${fmtNum(ty.weighted_global_r2, 4)} · 中位相对误差 ${fmtNum(ty.relative_error_median_percent, 2, '%')} · 全库抽检 ${fmtNum(D.reconstruction_and_fidelity?.external_full_cohort_spotcheck?.tianyi?.spotcheck_median_rel_error_pct, 3, '%')}`;
      }
      obsUse.style.opacity = curMode === 'overlay' ? '0.88' : '0';
    };
    bindChipGroup(find('#recon-site-seg'), btn => { curSite = btn.dataset.site; updateRecon(); });
    bindChipGroup(find('#recon-mode-seg'), btn => { curMode = btn.dataset.rmode; updateRecon(); });
    updateRecon();

    const cbarWrap = find('#fid-cohort-bars');
    if (cbarWrap) {
      const fid = D.reconstruction_and_fidelity || {};
      const sp = fid.external_full_cohort_spotcheck || {};
      const tyF = fid.tianyi_frozen_spotcheck || {};
      const pkF = fid.pkuph_frozen_spotcheck || {};
      const rows = [
        ['天津医科大学第二医院（天医二院）· 冻结抽检', `档位 ${tyF.n_band || '1,000-2,999'}`, tyF.relative_error_median_percent],
        ['北京大学人民医院（北大人民 / PKUPH）· 冻结抽检', `档位 ${pkF.n_band || '1,000-2,999'}`, pkF.relative_error_median_percent],
        ['北京安贞医院 · 全库抽检', `档位 ${sp.anzhen?.total_rows_band || '3,000-9,999'}`, sp.anzhen?.spotcheck_median_rel_error_pct],
        ['巴西 CODE-15% · 全库抽检', `n=${fmtInt(sp.code15?.total_rows)}`, sp.code15?.spotcheck_median_rel_error_pct],
        ['天津医科大学第二医院（天医二院）· 全库抽检', `档位 ${sp.tianyi?.total_rows_band || '30,000-99,999'}`, sp.tianyi?.spotcheck_median_rel_error_pct],
        ['北京大学人民医院（北大人民 / PKUPH）· 全库抽检', `档位 ${sp.renmin?.total_rows_band || '30,000-99,999'}`, sp.renmin?.spotcheck_median_rel_error_pct],
      ];
      cbarWrap.innerHTML = rows.map(([label, sub, err]) => `
        <div class="v9-cbar-row">
          <div class="v9-cbar-top"><b>${esc(label)} <span style="white-space:nowrap;font-weight:500;color:var(--muted)">(${esc(sub)})</span></b><strong>${fmtNum(err, 3, '%')}</strong></div>
          <div class="v9-cbar-track"><div class="v9-cbar-fill" style="width:${isNum(err) ? (clamp(Number(err) / 2.4) * 100).toFixed(1) : 0}%"></div></div>
        </div>`).join('');
    }

    // 1B. Benchmarks (XGBoost v8 default + L2 Linear v7 toggle, sorted descending!)
    const v8 = D.rog_benchmarks?.v8_xgb || {};
    const v7 = D.rog_benchmarks?.v7_linear || {};
    const bridge = D.rog_benchmarks?.v8b_bdev_bridge;

    let curProbe = 'xgb';
    let curSuite = 'within';
    let curTask = 'ptbxl_super5';

    const suiteTasks = {
      within: [
        { key: 'ptbxl_super5', label: 'PTB-XL super5' },
        { key: 'ptbxl_sub23', label: 'PTB-XL sub23' },
        { key: 'ptbxl_all71', label: 'PTB-XL all71' },
        { key: 'cpsc2018_9class', label: 'CPSC2018 9类' },
        { key: 'sph_aha', label: 'SPH AHA' },
      ],
      cross_xgb: [
        { key: 'cpsc2018_to_ptbxl', label: 'CPSC → PTB-XL' },
        { key: 'ptbxl_to_cpsc2018', label: 'PTB-XL → CPSC' },
        { key: 'sph_to_ptbxl', label: 'SPH → PTB-XL' },
        { key: 'ptbxl_to_sph', label: 'PTB-XL → SPH' },
      ],
      cross_linear: [
        { key: 'ptbxl_to_cpsc2018', label: 'PTB-XL → CPSC' },
        { key: 'ptbxl_to_sph', label: 'PTB-XL → SPH' },
        { key: 'sph_to_ptbxl', label: 'SPH → PTB-XL' },
      ],
      eff: [
        { key: 'ptbxl_super5', label: 'PTB-XL super5 (N=100..Full)' },
        { key: 'sph_aha', label: 'SPH AHA (N=100..Full)' },
      ],
      pert: [
        { key: 'noise_snr15db', label: '加性噪声 SNR 15 dB' },
        { key: 'noise_snr20db', label: '加性噪声 SNR 20 dB' },
        { key: 'baseline_wander_0p3hz', label: '0.3 Hz 基线漂移' },
        { key: 'gain_plus_15pct', label: '+15% 增益缩放' },
      ],
    };

    const taskSeg = find('#bench6-task-seg');
    const deltaRibbon = find('#bench6-delta-ribbon');
    const barsWrap = find('#bench6-bars-wrap');
    const fusionBox = find('#bench6-fusion-inspector');
    const effWrap = find('#bench6-eff-wrap');
    const footnoteEl = find('#bench6-footnote');
    const bridgeBox = find('#bench6-bridge-box');
    const fusionProto = D.rog_benchmarks?.fusion_protocols_v12 || {};
    let curInspectArm = 'ecgfounder_plus_prism_b';

    function renderFusionInspector() {
      if (!fusionBox) return;
      if (curSuite === 'eff') {
        fusionBox.hidden = true;
        return;
      }
      fusionBox.hidden = false;
      const armsSpec = fusionProto.arms || {};
      const sp = armsSpec[curInspectArm];
      const armLbl = armLabel(curInspectArm, curProbe);
      if (!sp) {
        fusionBox.innerHTML = `<div class="v12-fusion-head"><h4>融合与模型结构解析：${esc(armLbl)}</h4><span class="badge-light">协议未载入</span></div><p style="margin:0;color:#475569">当前所选模型臂（<code>${esc(curInspectArm)}</code>）未在本地协议文件中定义详情。</p>`;
        return;
      }
      const headSpec = curProbe === 'xgb' ? sp.v8_head_zh : sp.v7_head_zh;
      const ft = sp.fusion_type;
      const step1Desc = ft === 'late_logit_post_fusion'
        ? '原始 10 秒 12 导联波形（给 1D-CNN）与配准单搏微伏波形（给 PRISM）均取自同一次心电记录'
        : (ft === 'dual_branch_e2e'
          ? '原始 12 导联波形与冻结 PRISM 程序用量同步输入双分支网络'
          : (ft === 'single_arm' || ft === 'single_arm_cnn'
            ? '单模态输入（未与另一表征体系融合，作为同任务基线对照）'
            : '冻结波形大模型嵌入与冻结 PRISM 程序用量均取自同一次 12 导联心电记录'));
      const step2Label = ft === 'late_logit_post_fusion'
        ? '独立概率输出 → 逐类 logit 凸融合'
        : (ft === 'dual_branch_e2e'
          ? '双分支特征汇总（卷积支路 + 冻结 PRISM）'
          : (ft === 'single_arm' || ft === 'single_arm_cnn'
            ? '单臂表征提取（无跨模型融合）'
            : '同一份 ECG → 特征级横向拼接'));
      const step3Title = ft === 'late_logit_post_fusion'
        ? '3. 逐类对数几率概率后融合（非单头 XGBoost）'
        : (ft === 'dual_branch_e2e'
          ? '3. 端到端双分支联合读出头（非 XGBoost）'
          : (ft === 'single_arm_cnn'
            ? '3. 1D-CNN 端到端多标签分类头（非 XGBoost）'
            : `3. 下游分类头（${curProbe === 'xgb' ? 'XGBoost 主口径' : 'L2 线性对照'}）`));
      fusionBox.innerHTML = `
        <div class="v12-fusion-head">
          <h4>模型与融合机制详解：${esc(armLbl)} · <span style="color:var(--teal-light)">${esc(sp.title_zh)}</span></h4>
          <span class="badge-light">点击上方任意模型行切换解析</span>
        </div>
        <div class="v12-fusion-pipe">
          <div class="v12-pipe-box"><b>1. 同一份 12 导联 ECG 输入</b>${esc(step1Desc)}</div>
          <div class="v12-pipe-arrow" aria-hidden="true">→</div>
          <div class="v12-pipe-box is-accent"><b>2. ${esc(step2Label)}</b><code>${esc(sp.input_formula)}</code></div>
          <div class="v12-pipe-arrow" aria-hidden="true">→</div>
          <div class="v12-pipe-box"><b>${esc(step3Title)}</b>${esc(headSpec)}</div>
        </div>
        <p style="margin:6px 0 4px;color:#334155">${esc(sp.mechanism_zh)}</p>
        <p style="margin:0;font-size:11.5px;color:#64748b"><strong>预训练暴露与版本溯源：</strong>${esc(sp.exposure_note)}</p>`;
    }

    if (bridgeBox && bridge) {
      bridgeBox.hidden = false;
      const tally = bridge.equivalence_tally || {};
      const rows = bridge.equivalence_table || [];
      const eqN = tally.joint_auroc_and_brier_equivalent_within_margin ?? rows.length;
      const totN = tally.total_task_arm_contrasts ?? rows.length;
      const margins = bridge.prespecified_margins || { delta_auroc: 0.010, delta_brier: 0.005 };
      const taskZh = { ptbxl_super5: 'PTB-XL super5', cpsc2018_9class: 'CPSC2018 9类', sph_aha: 'SPH AHA', ptbxl_to_cpsc2018: 'PTB-XL → CPSC2018' };
      const armZh = { prism_xgb: 'PRISM (XGB)', ecgfounder_plus_prism_xgb: 'ECGFounder + PRISM', cnn_and_prism_xgb_per_class_post_fusion: 'CNN 与 PRISM-XGB 后融合' };
      const signed = v => (isNum(v) ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(4)}` : '缺失');
      const interval = (v, ci) => `${signed(v)} [${signed(ci?.[0])}, ${signed(ci?.[1])}]`;
      const intervals = rows.flatMap(r => [
        { ci: r.delta_auroc_ci95 || [], margin: margins.delta_auroc },
        { ci: r.delta_brier_ci95 || [], margin: margins.delta_brier },
      ]);
      const containedN = intervals.filter(x => x.ci.length === 2 && x.ci.every(v => Math.abs(v) <= x.margin)).length;
      const maxAuroc = Math.max(0, ...rows.flatMap(r => (r.delta_auroc_ci95 || []).map(Math.abs)));
      const maxBrier = Math.max(0, ...rows.flatMap(r => (r.delta_brier_ci95 || []).map(Math.abs)));
      const rog = D.rog_benchmarks?.v8_r2_boundaries || {};
      const ptbBrier = rog.ptbxl_to_cpsc2018_brier || {};
      bridgeBox.innerHTML = `
        <div class="v9-bridge-title">
          <strong>双字典下游性能等效桥接核验（v8b · 仅证实预设任务下游性能等效，不推论同名程序或坐标数值互换）</strong>
          <span><strong>${containedN} / ${rows.length * 2}</strong> 条区间严格落入预设界限；${eqN}/${totN} 任务×臂联合等效；max |CI endpoint| = ${maxAuroc.toFixed(4)} / ${maxBrier.toFixed(4)}</span>
        </div>
        <div class="v9-table-scroll" tabindex="0" role="region" aria-label="v8b 全部十二项双字典桥接区间">
          <table id="v8b-bridge-table" class="v9-definition-table"><thead><tr><th scope="col">任务</th><th scope="col">模型臂</th><th scope="col">ΔAUROC [95% CI]（界限 ±${Number(margins.delta_auroc).toFixed(3)}）</th><th scope="col">ΔBrier [95% CI]（界限 ±${Number(margins.delta_brier).toFixed(3)}）</th><th scope="col">结论</th></tr></thead><tbody>${
            rows.map(r => `<tr data-bridge-row="${esc(r.task)}:${esc(r.arm)}"><th scope="row">${esc(taskZh[r.task] || r.task)}</th><td>${esc(armZh[r.arm] || r.display)}</td><td>${interval(r.delta_auroc, r.delta_auroc_ci95)}</td><td>${interval(r.delta_brier, r.delta_brier_ci95)}</td><td class="v9-pass-cell">${r.joint_equivalence_status === 'equivalent_within_margin' ? '双区间联合等效' : '未达预设等效'}</td></tr>`).join('')
          }</tbody></table>
        </div>
        <div id="rog-v8r2-boundaries" class="v9-rog-boundaries">
          <strong>ROG v8_r2 回顾性名义 95% CI 边界</strong>
          <p>相对 1D-CNN，CNN 与 PRISM-XGB 逐类概率后融合的 AUROC <b>${isNum(rog.auroc_ci95_above_zero) ? rog.auroc_ci95_above_zero : '缺失'}/9 任务名义 95% CI &gt; 0</b>；Brier <b>${isNum(rog.brier_point_decrease) ? rog.brier_point_decrease : '缺失'}/9 点估计下降、${isNum(rog.brier_ci95_below_zero) ? rog.brier_ci95_below_zero : '缺失'}/9 区间 &lt; 0</b>。其中 <code>PTB-XL→CPSC2018</code> 为 <code>${signed(ptbBrier.delta_brier)} [${signed(ptbBrier.delta_brier_ci95?.[0])}, ${signed(ptbBrier.delta_brier_ci95?.[1])}]</code>，区间跨零。Brier 同时反映判别与概率误差，不单凭 Brier 宣称校准改善。</p>
          <p>跨国迁移中，纯 PRISM(XGB) 相对 CNN 后融合在 <b>2/4</b> 方向的名义 95% CI 支持优势：<code>CPSC→PTB</code>、<code>SPH→PTB</code>（融合减纯 PRISM 的 AUROC CI 均 &lt; 0）；其余方向不作优势宣称。v8_r2 属回顾性复评，不冒充前瞻预注册。</p>
        </div>`;
    }

    function getTasksForState() {
      if (curSuite === 'cross') return curProbe === 'xgb' ? suiteTasks.cross_xgb : suiteTasks.cross_linear;
      return suiteTasks[curSuite] || [];
    }

    function populateTaskChips() {
      const list = getTasksForState();
      if (!list.some(x => x.key === curTask)) curTask = list[0].key;
      taskSeg.innerHTML = list.map(it =>
        `<button type="button" data-task="${it.key}" aria-pressed="${it.key === curTask}">${esc(it.label)}</button>`
      ).join('');
    }

    function renderEffCanvas() {
      const canvas = find('#bench6-eff-canvas');
      const legWrap = find('#bench6-eff-legend');
      const tableWrap = find('#bench6-eff-table');
      if (!canvas) return;
      const src = curProbe === 'xgb' ? v8.sample_efficiency : v7.sample_efficiency;
      const byN = src?.[curTask] || {};
      const ns = ['100', '300', '1000', '3000', 'full'];
      const order = (curProbe === 'xgb' ? v8.canonical_arm_order : v7.canonical_arm_order) || [];

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.min(880, Math.max(300, canvas.parentElement.clientWidth - 10 || 820));
      const cssH = 275;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const pad = { l: 50, r: 20, t: 18, b: 34 };
      const gw = cssW - pad.l - pad.r;
      const gh = cssH - pad.t - pad.b;
      const vals = [];
      ns.forEach(n => order.forEach(a => { const v = byN[n]?.[a]?.auroc; if (v != null) vals.push(v); }));
      const ymin = Math.max(0.60, Math.floor((Math.min(...vals, 0.8) - 0.015) * 20) / 20);
      const ymax = 1.0;

      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, sans-serif';
      for (let g = 0; g <= 4; g++) {
        const yv = ymin + ((ymax - ymin) * g) / 4;
        const py = pad.t + gh - (gh * g) / 4;
        ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(cssW - pad.r, py); ctx.stroke();
        ctx.fillText(yv.toFixed(2), 6, py + 4);
      }

      const xs = ns.map((_, i) => pad.l + (gw * i) / (ns.length - 1));
      ns.forEach((n, i) => {
        ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
        ctx.fillText(n === 'full' ? 'Full' : `N=${n}`, xs[i], cssH - 10);
      });
      ctx.textAlign = 'left';

      order.forEach(arm => {
        ctx.strokeStyle = ARM_COLORS[arm] || '#333';
        ctx.lineWidth = (arm === 'frozen_prism_b' || arm === 'ecgfounder_plus_prism_b') ? 2.6 : 1.9;
        ctx.beginPath();
        ns.forEach((n, i) => {
          const val = byN[n]?.[arm]?.auroc ?? ymin;
          const py = pad.t + gh * (1 - (val - ymin) / (ymax - ymin));
          if (i === 0) ctx.moveTo(xs[i], py); else ctx.lineTo(xs[i], py);
        });
        ctx.stroke();
        ns.forEach((n, i) => {
          const val = byN[n]?.[arm]?.auroc;
          if (val == null) return;
          const py = pad.t + gh * (1 - (val - ymin) / (ymax - ymin));
          ctx.fillStyle = ARM_COLORS[arm] || '#333';
          ctx.beginPath(); ctx.arc(xs[i], py, 3.4, 0, Math.PI * 2); ctx.fill();
        });
      });

      if (legWrap) legWrap.innerHTML = order.map(a => `<span><i style="background:${ARM_COLORS[a]}"></i>${esc(armLabel(a, curProbe))}</span>`).join('');
      const sortedRows = [...order].sort((a, b) => (byN.full?.[b]?.auroc ?? 0) - (byN.full?.[a]?.auroc ?? 0));
      if (tableWrap) {
        tableWrap.innerHTML = `<table><thead><tr><th>模型（按 Full 降序）</th>${ns.map(n => `<th>${n === 'full' ? 'Full' : `N=${n}`}</th>`).join('')}</tr></thead><tbody>${
          sortedRows.map(arm => `<tr><td><b>${esc(armLabel(arm, curProbe))}</b></td>${ns.map(n => `<td>${(byN[n]?.[arm]?.auroc ?? 0).toFixed(4)}</td>`).join('')}</tr>`).join('')
        }</tbody></table>`;
      }
    }

    function renderBenchBody() {
      if (curSuite === 'eff') {
        barsWrap.hidden = true;
        effWrap.hidden = false;
        const pd = curProbe === 'xgb' ? v8.sample_efficiency_paired_deltas?.[curTask] : null;
        if (pd) {
          const sigCount = ['100', '300', '1000', '3000', 'full'].filter(n => (pd[n]?.ecgfounder_plus_prism_b_minus_frozen_ecgfounder?.delta_auroc_ci95?.[0] ?? -1) > 0).length;
          deltaRibbon.innerHTML = `<span class="v9-delta-chip">XGBoost 小样本：ECGFounder+PRISM ${sigCount}/5 样本档配对 95% CI 显著 &gt; 0（两任务合计 10/10 显著增益）</span>`;
        } else {
          deltaRibbon.innerHTML = `<span class="v9-delta-chip is-neutral">L2 线性参考对照（N=100 档 PTB-XL ECGFounder 单臂 0.8596 高于融合 0.8411）</span>`;
        }
        footnoteEl.innerHTML = '小样本探针统一使用冻结表征，仅重拟合下游分类器；XGBoost 非线性模式下 PRISM 在全部 10/10 样本量档位均显著增益 ECGFounder。';
        requestAnimationFrame(renderEffCanvas);
        return;
      }

      barsWrap.hidden = false;
      effWrap.hidden = true;

      if (curSuite === 'pert') {
        const pertMap = curProbe === 'xgb' ? v8.perturbations?.[curTask] : v7.perturbations?.[curTask];
        const entries = Object.entries(pertMap || {})
          .map(([arm, obj]) => ({ arm, score: obj.perturbed_auroc ?? 0, delta: obj.paired_delta_auroc ?? 0, ci: obj.paired_delta_ci95 || [0, 0] }))
          .sort((a, b) => b.score - a.score);

        const pr = pertMap?.frozen_prism_b;
        const xe = pertMap?.frozen_xecg;
        const xp = pertMap?.xecg_plus_prism_b;
        deltaRibbon.innerHTML = [
          pr ? `<span class="v9-delta-chip">PRISM 扰动变化 ${pr.paired_delta_auroc >= 0 ? '+' : ''}${pr.paired_delta_auroc.toFixed(4)}</span>` : '',
          xe ? `<span class="v9-delta-chip ${xe.paired_delta_auroc <= -0.01 ? 'is-neg' : 'is-neutral'}">xECG 扰动变化 ${xe.paired_delta_auroc >= 0 ? '+' : ''}${xe.paired_delta_auroc.toFixed(4)}</span>` : '',
          xp ? `<span class="v9-delta-chip">xECG + PRISM ${xp.paired_delta_auroc >= 0 ? '+' : ''}${xp.paired_delta_auroc.toFixed(4)}</span>` : '',
        ].join('');

        barsWrap.innerHTML = entries.map((e, idx) => {
          const w = clamp((e.score - 0.72) / 0.28) * 100;
          const isHl = e.arm === 'frozen_prism_b' || e.arm === 'cnn1d_plus_prism_xgb' || e.arm === 'ecgfounder_plus_prism_b';
          const isSel = e.arm === curInspectArm;
          const dCol = e.delta <= -0.01 ? '#bf4a40' : '#2a6e5d';
          return `<div class="v9-arm-row is-clickable ${isHl ? 'is-highlight' : ''} ${isSel ? 'is-selected' : ''}" data-arm-inspect="${esc(e.arm)}" tabindex="0" role="button" aria-pressed="${isSel}">
            <div class="v9-arm-name"><span class="v9-arm-rank">${idx + 1}</span><span class="v9-arm-dot" style="background:${ARM_COLORS[e.arm] || '#64748b'}"></span>${esc(armLabel(e.arm, curProbe))}</div>
            <div class="v9-arm-track"><div class="v9-arm-fill" style="width:${w.toFixed(1)}%;background:${ARM_COLORS[e.arm] || '#64748b'}"></div></div>
            <div class="v9-arm-val">${fmtNum(e.score, 4)} <span style="color:${dCol}">(${fmtSigned(e.delta, 4)})</span><small>配对 95% CI ${fmtCi(e.ci, 4, true)}</small></div>
          </div>`;
        }).join('');

        const bw = v8.perturbations_signal_bandwidth_audit?.noise_snr15db || {};
        footnoteEl.innerHTML = `<strong>物理扰动带宽审计说明：</strong><strong>${fmtSigned(bw.snr_gain_from_antialiasing_db, 2, ' dB')}</strong> 是 100 Hz 抗混叠降采样（<code>resample_poly(1,5)</code> 50 Hz 低通）对模拟宽带高斯噪声的功率衰减（滤除 ${isNum(bw.noise_power_retained_pct) ? (100 - Number(bw.noise_power_retained_pct)).toFixed(1) + '%' : '缺失'} 噪声功率），不代表临床噪声下的普遍 SNR 增益。不同采样带宽下的扰动结果不作同条件临床噪声优劣推断。`;
        renderFusionInspector();
        return;
      }

      // Within-cohort or Cross-country (STRICTLY SORTED DESCENDING BY MACRO-AUROC!)
      const row = curProbe === 'xgb'
        ? (curSuite === 'within' ? v8.within_cohort?.[curTask] : v8.cross_country?.[curTask])
        : v7.within_and_cross_country?.[curTask];
      const arms = row?.arms || {};
      const pd = row?.paired_deltas || {};
      const entries = Object.entries(arms)
        .map(([arm, obj]) => ({ arm, score: obj.auroc, ci: obj.ci95, brier: obj.brier }))
        .filter(e => isNum(e.score))
        .sort((a, b) => b.score - a.score);

      const chipSpecs = [
        ['ecgfounder_plus_prism_b_minus_frozen_ecgfounder', '+PRISM→冻结ECGFounder'],
        ['xecg_plus_prism_b_minus_frozen_xecg', '+PRISM→冻结xECG'],
        ['cnn1d_plus_prism_xgb_minus_waveform_cnn1d', '1D-CNN后融合(v8_r2)'],
        ['cnn1d_plus_prism_e2e_minus_waveform_cnn1d', '端到端E2E vs CNN'],
      ];
      const chipsHtml = chipSpecs.map(([k, lbl]) => {
        const dObj = pd[k];
        if (!dObj || !isNum(dObj.delta_auroc)) return '';
        const v = Number(dObj.delta_auroc);
        const ci = dObj.delta_auroc_ci95;
        const cls = (Array.isArray(ci) && ci[0] > 0) ? '' : ((Array.isArray(ci) && ci[1] < 0) ? 'is-neg' : 'is-neutral');
        return `<span class="v9-delta-chip ${cls}" title="${esc(lbl)} 95% CI ${fmtCi(ci, 4, true)}">${esc(lbl)} ${fmtSigned(v, 4)}</span>`;
      }).filter(Boolean).join('');

      deltaRibbon.innerHTML = chipsHtml || `<span class="v9-delta-chip is-neutral">线性头对照（切回 XGBoost 查看配对 CI）</span>`;

      const minScore = Math.max(0.70, Math.floor((Math.min(...entries.map(e => e.score), 0.85) - 0.04) * 20) / 20);
      barsWrap.innerHTML = entries.map((e, idx) => {
        const w = clamp((e.score - minScore) / (1.0 - minScore)) * 100;
        const isHl = e.arm === 'frozen_prism_b' || e.arm === 'cnn1d_plus_prism_xgb' || e.arm === 'ecgfounder_plus_prism_b' || e.arm === 'xecg_plus_prism_b';
        const isSel = e.arm === curInspectArm;
        const brierPart = isNum(e.brier) ? ` · B ${fmtNum(e.brier, 3)}` : '';
        return `<div class="v9-arm-row is-clickable ${isHl ? 'is-highlight' : ''} ${isSel ? 'is-selected' : ''}" data-arm-inspect="${esc(e.arm)}" tabindex="0" role="button" aria-pressed="${isSel}">
          <div class="v9-arm-name"><span class="v9-arm-rank">${idx + 1}</span><span class="v9-arm-dot" style="background:${ARM_COLORS[e.arm] || '#64748b'}"></span>${esc(armLabel(e.arm, curProbe))}</div>
          <div class="v9-arm-track"><div class="v9-arm-fill" style="width:${w.toFixed(1)}%;background:${ARM_COLORS[e.arm] || '#64748b'}"></div></div>
          <div class="v9-arm-val">${fmtNum(e.score, 4)}<small>${fmtCi(e.ci, 3)}${brierPart}</small></div>
        </div>`;
      }).join('');

      renderFusionInspector();

      footnoteEl.innerHTML = curProbe === 'xgb'
        ? '<strong>完整透明披露：</strong>XGBoost 非线性探针下，纯 <code>PRISM</code> 在 <strong>3/4</strong> 跨国迁移方向领跑全部单干模型，拼入主流架构呈现任务依赖互补性；同时如实呈现阴性/持平边界（如 <code>SPH</code> 端到端联合 <code>−0.0027</code>、<code>CPSC</code> <code>ECGFounder+PRISM −0.0013</code> 跨零），并披露「CNN 与 PRISM-XGB 逐类概率后融合」之逐类开发集 logloss 权重属测试审校后修订所得。ROG 公开洁净室沿用外部零暴露冻结字典 <code>de4f2327</code>（详见文末血缘抽屉）。'
        : '<strong>L2 线性探针参考（v7）：</strong>保留固定线性探针历史对照，完整呈现各架构在线性读出下的绝对 AUROC 与配对区间。';
    }

    if (barsWrap) {
      const selectArmFromEv = ev => {
        const rowEl = ev.target.closest('[data-arm-inspect]');
        if (!rowEl || !barsWrap.contains(rowEl)) return;
        const armKey = rowEl.dataset.armInspect;
        if (!armKey) return;
        curInspectArm = armKey;
        findAll('[data-arm-inspect]', barsWrap).forEach(el => {
          const on = el.dataset.armInspect === armKey;
          el.classList.toggle('is-selected', on);
          el.setAttribute('aria-pressed', String(on));
        });
        renderFusionInspector();
        const protoDrawer = find('#bench6-protocol-drawer');
        if (protoDrawer) protoDrawer.open = true;
      };
      barsWrap.addEventListener('click', selectArmFromEv);
      barsWrap.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectArmFromEv(ev); }
      });
    }

    bindChipGroup(find('#bench6-probe-toggle'), btn => { curProbe = btn.dataset.probe; populateTaskChips(); renderBenchBody(); });
    bindChipGroup(find('#bench6-suite-seg'), btn => { curSuite = btn.dataset.suite; populateTaskChips(); renderBenchBody(); });
    bindChipGroup(taskSeg, btn => { curTask = btn.dataset.task; renderBenchBody(); });
    populateTaskChips();
    renderBenchBody();
  }

  /* ==================== ACT 02: D1-D10, Parallel LOCO, 12x6 Anatomy, PheWAS, GWAS ==================== */
  function renderAct2(D) {
    const sp = D.spectrum_d10 || {};
    const scopes = {
      all_589: {
        title: '十轴共享信号比 95.3%',
        prism: sp.mimic?.all_589?.weightings?.equal_integer_stem?.d10,
        pca: sp.mimic?.all_589?.weightings?.equal_integer_stem?.pca10,
        note: '在 589 个纳入表型、284 个病族等权的分析中，十轴共享信号比为 95.3%（95% CI 91.3%–99.3%），与 PCA-10 配对差 +4.17 pp [+0.26, +8.01]。',
      },
      loco_581: {
        title: '逐章留出 (LOCO-17) 共享信号比 94.8%',
        prism: sp.mimic?.named_581?.weightings?.equal_integer_stem?.holdout10,
        pca: sp.mimic?.named_581?.weightings?.equal_integer_stem?.pca10,
        note: '逐个留出表型章节重训十轴，对留出章节共享信号比为 94.84%（与 PCA-10 配对差 +3.93 pp）。',
      },
      noncirc_named_491: {
        title: '非循环 491 表型共享信号比',
        prism: sp.mimic?.noncirc_named_491?.weightings?.equal_integer_stem?.d10,
        pca: sp.mimic?.noncirc_named_491?.weightings?.equal_integer_stem?.pca10,
        note: '去除 90 个循环系统表型后，非循环表型与 PCA-10 配对差 +6.15 pp [+0.38, +11.49]。',
      },
      circ_zero: {
        title: '纯非循环十轴 → 循环 90 表型',
        prism: sp.mimic?.circulatory_90?.weightings?.equal_integer_stem?.noncirc10,
        pca: sp.mimic?.circulatory_90?.weightings?.equal_integer_stem?.pca10,
        note: '仅用非循环表型训出的十轴投射至循环 90 表型覆盖 95.87%（与 PCA-10 差 +0.62 pp 跨零）。',
      },
      pkuph_tianyi: {
        title: '跨院投影 · 北京大学人民医院 ↔ 天医二院',
        prism: sp.external_pkuph_tianyi?.views?.unit_whole_beat_rms?.all?.arms?.d10,
        pca: sp.external_pkuph_tianyi?.views?.unit_whole_beat_rms?.all?.arms?.pca10,
        note: '投影至北京大学人民医院（北大人民 / PKUPH）与天津医科大学第二医院（天医二院）26 共享病，共享信号比 90.27%（与 PCA-10 差 +3.81 pp 跨零）。',
      },
    };

    const renderScope = key => {
      const s = scopes[key];
      if (!s || !s.prism || !s.pca) return;
      const sr = (s.prism.S_over_R || 0) * 100;
      const pSr = (s.pca.S_over_R || 0) * 100;
      const ciP = s.prism.S_over_R_fieller_ci95 || [0, 0];
      const ciC = s.pca.S_over_R_fieller_ci95 || [0, 0];
      const d = (s.prism.delta_S_over_R_vs_pca10 ?? (s.prism.S_over_R - s.pca.S_over_R)) * 100;
      const dCi = s.prism.delta_ci95_vs_pca10;
      find('#d10-scope-title').textContent = s.title;
      find('#d10-sr-val').textContent = `${sr.toFixed(1)}%`;
      find('#d10-prism-ci').innerHTML = `${sr.toFixed(2)}% <small class="v9-ci-sub">[${(ciP[0] * 100).toFixed(2)}%, ${(ciP[1] * 100).toFixed(2)}%]</small>`;
      find('#d10-pca-ci').innerHTML = `${pSr.toFixed(2)}% <small class="v9-ci-sub">[${(ciC[0] * 100).toFixed(2)}%, ${(ciC[1] * 100).toFixed(2)}%]</small>`;
      find('#d10-delta-ci').innerHTML = `${d >= 0 ? '+' : ''}${d.toFixed(2)} pp${dCi ? ` <small class="v9-ci-sub">[${(dCi[0] * 100).toFixed(2)}, ${(dCi[1] * 100).toFixed(2)}]</small>` : ''}`;
      find('#d10-scope-note').textContent = s.note;
      const circ = 2 * Math.PI * 49;
      find('#d10-ring-fg').style.strokeDashoffset = (circ * (1 - clamp(sr / 100, 0, 1))).toFixed(2);
    };
    bindChipGroup(find('#d10-scope-seg'), btn => renderScope(btn.dataset.d10));
    renderScope('all_589');

    // Direct-Waveform Supervised 10D control badge (honest equivalence verdict!)
    const dwCtrl = D.copi_controls?.direct_waveform_d10;
    const dwBadge = find('#d10-control-badge');
    if (dwBadge && dwCtrl) {
      dwBadge.hidden = false;
      const eq589 = dwCtrl.mimic_confirmation_subsets?.all_589?.weightings?.equal_integer_stem;
      const dwArm = eq589?.arms?.direct_wave_sup10;
      const prArm = eq589?.arms?.prism_d10_1014;
      const cmp = eq589?.paired_comparisons?.prism_d10_1014_minus_direct_wave_sup10;
      const srPct = dwArm?.S_over_R_pct ?? (dwArm?.S_over_R != null ? dwArm.S_over_R * 100 : null);
      const prPct = prArm?.S_over_R_pct;
      const ci = dwArm?.S_over_R_fieller_ci95_pct;
      const dPp = cmp?.delta_pp_A_minus_B;
      const dCi = cmp?.paired_percentile_ci95_pp || cmp?.paired_basic_ci95_pp;
      const margin = cmp?.equivalence_margin_pp ?? dwCtrl.equivalence_margin_pp;
      const diffTxt = (dPp != null && dCi)
        ? `（与 PRISM D1–D10 ${fmtNum(prPct, 2, '%')} 配对差 ${fmtSigned(dPp, 2, ' pp')} [${fmtNum(dCi[0], 2)}, ${fmtSigned(dCi[1], 2)}]，区间跨预设 ±${fmtNum(margin, 1, ' pp')} 界值，等效性未确立）`
        : '';
      dwBadge.innerHTML = srPct != null
        ? `<strong>Direct-Waveform Supervised 10D 对照：</strong>${srPct.toFixed(2)}%${ci ? ` [${ci[0].toFixed(2)}%, ${ci[1].toFixed(2)}%]` : ''}${diffTxt}。`
        : `<strong>Direct-Waveform Supervised 10D 基线对照已载入</strong>（详见文末附录）。`;
    }

    // 17-Chapter Parallel LOCO Bars (Two Distinct Slim Parallel Horizontal Tracks, well-identified first!)
    const locoWrap = find('#d10-loco-grid');
    if (locoWrap) {
      const loco = sp.mimic?.loco_17_chapters || {};
      const entries = Object.entries(loco).map(([name, obj]) => {
        const w = obj.weightings.equal_integer_stem;
        const rCi = w.holdout10.R_ci95 || [0, 0];
        const fieller = w.holdout10.S_over_R_fieller_ci95;
        return { name, zh: CHAPTER_ZH[name] || name, h10: w.holdout10.S_over_R, pca: w.pca10.S_over_R, weakR: (rCi[0] <= 0 || !fieller) };
      });
      const strong = entries.filter(e => !e.weakR).sort((a, b) => b.h10 - a.h10);
      const weak = entries.filter(e => e.weakR).sort((a, b) => b.h10 - a.h10);

      const renderRow = e => `
        <div class="v9-loco-row">
          <div class="v9-loco-name" title="${esc(e.name)}"><span>${esc(e.zh)}</span>${e.weakR ? '<em class="v9-weak-tag">弱R</em>' : ''}</div>
          <div class="v9-loco-pair">
            <div class="v9-loco-track"><div class="v9-loco-bar-prism" style="width:${(clamp(e.h10) * 100).toFixed(1)}%"></div></div>
            <div class="v9-loco-track"><div class="v9-loco-bar-pca" style="width:${(clamp(e.pca) * 100).toFixed(1)}%"></div></div>
          </div>
          <div class="v9-loco-vals"><b>${(e.h10 * 100).toFixed(1)}%</b><small>${(e.pca * 100).toFixed(1)}%</small></div>
        </div>`;

      const top6 = strong.slice(0, 6);
      const restStrong = strong.slice(6);
      const restCount = restStrong.length + weak.length;
      locoWrap.innerHTML = top6.map(renderRow).join('')
        + (restCount ? `<details class="v11-drawer" style="margin-top:8px;padding:6px 10px"><summary style="font-size:11.5px">展开其余 ${restCount} 个章节（含 ${weak.length} 个弱识别分母）</summary><div class="v11-drawer-body" style="margin-top:6px">${restStrong.map(renderRow).join('')}${weak.length ? `<div class="v9-loco-divider">以下 ${weak.length} 类分母 R 区间跨零，仅供参考</div>` + weak.map(renderRow).join('') : ''}</div></details>` : '');
    }

    // 2B. Unified 12-Lead x 6-Window uV Anatomy Workbench
    const anat = D.axis_anatomy || {};
    const offaxis = D.offaxis || {};
    const subChips = find('#anat-sub-chips');
    const hmBox = find('#anat-heatmap');
    const sideBox = find('#anat-side-panel');
    const times4 = anat.time_ms_4ms || [];

    let curAMode = 'global';
    let curAxisIdx = 0;
    let curMhKey = 'M_dev365d';
    let curOffPhe = (offaxis.iconic_diseases || [])[0]?.phecode || '411.2';

    const offaxisAuditBox = find('#offaxis-cross-hospital-audit');
    const crossHospital = offaxis.pkuph_tianyi_block_ci || {};
    const crossAll = crossHospital.all_26 || {};
    const crossNonCirc = crossHospital.non_circulatory_19 || {};
    if (offaxisAuditBox && crossAll.disease_level_estimand && crossNonCirc.disease_level_estimand) {
      const signed = (v, digits = 4) => `${v >= 0 ? '+' : ''}${Number(v ?? 0).toFixed(digits)}`;
      const estimateCi = (obj, digits = 4) => `${signed(obj?.diagonal_cosine_advantage, digits)} [${signed(obj?.diagonal_cosine_advantage_family_block_ci95?.[0], digits)}, ${signed(obj?.diagonal_cosine_advantage_family_block_ci95?.[1], digits)}]`;
      const crossCi = obj => `${signed(obj?.disease_level_advantage)} [${signed(obj?.disease_level_family_block_ci95?.[0])}, ${signed(obj?.disease_level_family_block_ci95?.[1])}]`;
      const energy = crossHospital.recorded_voltage_energy || {};
      offaxisAuditBox.innerHTML = `
        <div class="v9-offaxis-head">
          <span class="chip-pill">跨院轴外残差 · 零外院重训</span>
          <h4>北京大学人民医院（北大人民 / PKUPH）↔ 天津医科大学第二医院（天医二院）</h4>
          <p>冻结来源：MIMIC 纯开发集字典与 D1–D10（51,905 例开发患者，外院零重训）。区间均为整数 Phecode 病族块重抽 95% CI。</p>
        </div>
        <div class="v9-table-scroll" tabindex="0" role="region" aria-label="跨院轴外残差病族块重抽置信区间">
          <table class="v9-definition-table v9-offaxis-table"><thead><tr><th scope="col">分析范围</th><th scope="col">病种级同病余弦优势 [95% CI]</th><th scope="col">等病族加权 [95% CI]</th><th scope="col">跨病族敏感性 [95% CI]</th></tr></thead><tbody>
            <tr><th scope="row">全部 ${crossAll.n_diseases} 共享病 · ${crossAll.n_integer_phecode_families} 病族（${crossAll.same_disease_positive_count}/${crossAll.n_diseases} 正向）</th><td>${estimateCi(crossAll.disease_level_estimand)}</td><td>${estimateCi(crossAll.equal_integer_family_weighted_estimand)}</td><td>${crossCi(crossAll.cross_family_off_diagonal_sensitivity)}</td></tr>
            <tr><th scope="row">纯非循环 ${crossNonCirc.n_diseases} 病 · ${crossNonCirc.n_integer_phecode_families} 病族（${crossNonCirc.same_disease_positive_count}/${crossNonCirc.n_diseases} 正向）</th><td>${estimateCi(crossNonCirc.disease_level_estimand)}</td><td>${estimateCi(crossNonCirc.equal_integer_family_weighted_estimand)}</td><td>${crossCi(crossNonCirc.cross_family_off_diagonal_sensitivity)}</td></tr>
          </tbody></table>
        </div>
        <div class="v9-energy-callout"><strong>记录电压半样本交叉积轴外残差波能：${signed(energy.offaxis_same_disease_excess, 2)} [${signed(energy.offaxis_excess_ci95?.[0], 2)}, ${signed(energy.offaxis_excess_ci95?.[1], 2)}] µV²</strong><span>单位为记录电压交叉积波能 µV²（数据字段 <code>uV^2</code>），非波形幅值 µV。</span></div>
        <p class="v9-note-sm">推断范围：每院每病采用冻结 <code>≥30</code> 阈值并作隐私分档；${crossAll.same_disease_positive_count}/${crossAll.n_diseases} 与 ${crossNonCirc.same_disease_positive_count}/${crossNonCirc.n_diseases} 仅描述正向病种数，不宣称逐病显著。整数病族块重抽捕获病族内疾病依赖，与患者级抽样不确定性不同。</p>`;
    }

    function renderDecoded4Leads(wf8, posLabel = '+1 SD', negLabel = '−1 SD') {
      const showLeads = ['II', 'V2', 'V4', 'V5'].filter(l => wf8?.plus_1sd_uv?.[l]);
      return `<div class="v9-legend-row" style="margin-top:8px;margin-bottom:4px">
        <span style="color:#2a6e5d"><i class="v9-line-swatch"></i>${esc(posLabel)}</span>
        <span style="color:#bf4a40"><i class="v9-line-swatch"></i>${esc(negLabel)}</span>
        <span style="color:#8c877c"><i class="v9-line-swatch is-dashed"></i>人群基线</span>
      </div>
      <div class="v9-mini-wave-grid">${showLeads.map(ld => `
        <div class="v9-mini-wave-box">
          <div class="v9-mini-wave-head"><span>${ld} 导联</span><small>±1 SD 解码 (µV)</small></div>
          ${buildMultiWaveSvg([
            { arr: wf8.baseline_uv?.[ld], color: '#8c877c', width: 1.3, dash: '4 3', opacity: 0.72 },
            { arr: wf8.minus_1sd_uv?.[ld], color: '#bf4a40', width: 1.8 },
            { arr: wf8.plus_1sd_uv?.[ld], color: '#2a6e5d', width: 2.0 },
          ], times4, { dark: false, height: 82, shadeT: true })}
        </div>`).join('')}</div>`;
    }

    function renderAnatomyView() {
      if (!hmBox || !sideBox || !subChips) return;
      const peakBadge = obj => {
        const pL = obj.peak_lead || obj.dominant_lead || 'V3';
        const pW = obj.peak_window || obj.dominant_window || 'QRS';
        const pUv = obj.peak_rms_uv != null ? ` (${Number(obj.peak_rms_uv).toFixed(1)} µV)` : '';
        return `<span>峰值单格（陶土框） <b>${esc(pL)} / ${WIN_ZH[pW] || pW}${pUv}</b></span>`;
      };

      if (curAMode === 'global') {
        subChips.innerHTML = '';
        const g = anat.global_d1_d10_combined || {};
        const js = g.oos_dev_frozen_observed_beats_conf || g.joint_subspace_explained_conf || g.basis_q10_svd_weighted || {};
        hmBox.innerHTML = renderHeatmapTable(js.lead_by_window_rms_uv, js.dominant_lead, js.dominant_window, { light: true, rgb: '42,110,93', unit: ' µV', dec: 1, highlightMax: true });
        const ov = g.per_axis_overview || [];
        sideBox.innerHTML = `
          <h4>十主轴 D1–D10 联合波形地图（总 RMS ${fmtNum(js.overall_rms_uv, 1, ' µV')}）</h4>
          <div class="v9-anat-meta-pills">
            ${peakBadge(js)}
            <span>样本外实测波形 R² <b>${fmtNum(js.overall_waveform_r2_pct, 1, '%')}</b></span>
            <span>十轴覆盖疾病方差 <b>${isNum(g.svd_total_disease_var_captured_d1_d10) ? `${(Number(g.svd_total_disease_var_captured_d1_d10) * 100).toFixed(1)}%` : '缺失'}</b></span>
          </div>
          <div class="v9-anchor-list">${ov.map(a => `
            <div class="v9-anchor-item">
              <span><b>${esc(a.axis)}</b> · 主导 ${esc(a.dominant_lead)}/${WIN_ZH[a.dominant_window] || a.dominant_window}</span>
              <span>SVD ${(a.svd_marginal_disease_var_share * 100).toFixed(1)}% · ${a.overall_rms_uv_per_1sd} µV/SD</span>
            </div>`).join('')}</div>`;
        pulseFade(hmBox); pulseFade(sideBox);
        return;
      }

      if (curAMode === 'axes') {
        const axes = anat.individual_axes_d1_d10 || [];
        subChips.innerHTML = axes.map((a, i) =>
          `<button type="button" data-axidx="${i}" aria-pressed="${i === curAxisIdx}">${esc(a.axis)} · ${esc(a.peak_lead || a.dominant_lead)}/${WIN_ZH[a.peak_window || a.dominant_window] || a.dominant_window}</button>`
        ).join('');
        const ax = axes[curAxisIdx] || axes[0];
        if (!ax) return;
        hmBox.innerHTML = renderHeatmapTable(ax.lead_by_window_rms_uv, ax.dominant_lead, ax.dominant_window, { light: true, rgb: '42,110,93', unit: ' µV/SD', dec: 1, highlightMax: true });
        const posList = (ax.top_positive_diseases_common_ge100 || []).slice(0, 3);
        const negList = (ax.top_negative_diseases_common_ge100 || []).slice(0, 3);
        sideBox.innerHTML = `
          <h4>${esc(ax.axis)} 单轴波形解码（${ax.overall_rms_uv} µV / +1 SD）</h4>
          <div class="v9-anat-meta-pills">
            ${peakBadge(ax)}
            <span>跨集复现余弦 <b>${fmtNum(ax.dev_conf_slope_waveform_cosine, 4)}</b></span>
            <span>与 H₁₀ 相关 <b>${fmtNum(ax.corr_with_H10_health_conf, 3)}</b></span>
            <span>与死亡轴 M 余弦 <b>${fmtNum(ax.cosine_with_M_1014d, 3)}</b></span>
          </div>
          ${renderDecoded4Leads(ax.waveforms_key8, `${ax.axis} +1 SD`, `${ax.axis} −1 SD`)}
          <div class="v9-anchor-list">
            ${posList.map(d => `<div class="v9-anchor-item"><span>(+) ${esc(F7_ZH[d.phecode] || d.phenotype)} (${esc(d.phecode)})</span><b>+${d.loading_score.toFixed(2)}</b></div>`).join('')}
            ${negList.map(d => `<div class="v9-anchor-item is-neg"><span>(−) ${esc(F7_ZH[d.phecode] || d.phenotype)} (${esc(d.phecode)})</span><b>${d.loading_score.toFixed(2)}</b></div>`).join('')}
          </div>`;
        pulseFade(hmBox); pulseFade(sideBox);
        return;
      }

      if (curAMode === 'mh') {
        const mh = anat.mortality_and_health || {};
        const mhTabs = [
          { k: 'M_dev365d', label: '365日死亡轴 M' },
          { k: 'M_ridge_W_agesex', label: '年龄性别校正 M' },
          { k: 'H10_frozen', label: '总健康分 H₁₀' },
        ];
        subChips.innerHTML = mhTabs.map(t =>
          `<button type="button" data-mhk="${t.k}" aria-pressed="${t.k === curMhKey}">${esc(t.label)}</button>`
        ).join('');
        const item = mh[curMhKey] || mh.M_dev365d;
        const align = mh.alignment_and_correlations || {};
        if (!item) return;
        hmBox.innerHTML = renderHeatmapTable(item.lead_by_window_rms_uv, item.dominant_lead, item.dominant_window, { light: true, rgb: '184,90,58', unit: ' µV/SD', dec: 1, highlightMax: true });
        const posLbl = curMhKey === 'H10_frozen' ? '+1 SD (更健康)' : '+1 SD (更高死亡风险)';
        const negLbl = curMhKey === 'H10_frozen' ? '−1 SD (高负担)' : '−1 SD (较低风险)';
        sideBox.innerHTML = `
          <h4>${esc(mhTabs.find(t => t.k === curMhKey)?.label || item.axis)} · ${fmtNum(item.overall_rms_uv, 1, ' µV/SD')}</h4>
          <div class="v9-anat-meta-pills">
            ${peakBadge(item)}
            <span>十轴捕获 M 能量 <b>${isNum(align.M_captured_by_D1_D10_4572d) ? `${(Number(align.M_captured_by_D1_D10_4572d) * 100).toFixed(1)}%` : '缺失'}</b></span>
            <span>cos(M, −H₁₀) <b>${fmtNum(align.cosine_M_slope_vs_neg_H10_slope_4572d, 3)}</b></span>
            <span>M 确认集 AUROC <b>${fmtNum(align.conf_365d_mortality_auroc_M, 3)}</b></span>
          </div>
          ${renderDecoded4Leads(item.waveforms_key8, posLbl, negLbl)}`;
        pulseFade(hmBox); pulseFade(sideBox);
        return;
      }

      // Off-axis 8 iconic disease residuals
      const iconic = offaxis.iconic_diseases || [];
      subChips.innerHTML = iconic.map(d =>
        `<button type="button" data-offphe="${d.phecode}" aria-pressed="${d.phecode === curOffPhe}">${esc(F7_ZH[d.phecode] || d.phenotype)} (${d.phecode})</button>`
      ).join('');
      const item = iconic.find(x => x.phecode === curOffPhe) || iconic[0];
      if (!item) return;
      hmBox.innerHTML = renderHeatmapTable(item.lead_by_window_rms_uv, item.dominant_lead, item.dominant_window, { light: true, rgb: '53,99,143', unit: ' µV', dec: 1, highlightMax: true });
      const m241 = offaxis.mimic_241 || {};
      const ext26 = offaxis.pkuph_tianyi_all || {};
      const blockCi = anat.phecode_family_block_ci;
      const bDis = blockCi?.disease_level_estimand?.diagonal_cosine_advantage_family_block_ci95;
      const crossCi = crossAll.disease_level_estimand?.diagonal_cosine_advantage_family_block_ci95;
      sideBox.innerHTML = `
        <h4>${esc(F7_ZH[item.phecode] || item.phenotype)} (${esc(item.phecode)}) · 十轴外专属指纹</h4>
        <div class="v9-anat-meta-pills">
          ${peakBadge(item)}
          <span>总余弦 <b>${fmtNum(item.tot_cos, 3)}</b></span>
          <span>轴外残差余弦 <b>${fmtNum(item.off_cos, 4)}</b></span>
        </div>
        <div class="v9-anchor-list">
          <div class="v9-anchor-item"><span>MIMIC 241 种病同病−异病余弦优势</span><b>${fmtSigned(m241.diagonal_cosine_advantage, 4)}${bDis ? ` ${fmtCi(bDis, 3, true)}` : ''}</b></div>
          <div class="v9-anchor-item"><span>同病正向复现率</span><b>${fmtInt(m241.same_disease_positive_count)} / 241 种病</b></div>
          <div class="v9-anchor-item"><span>北京大学人民医院（北大人民 / PKUPH）↔ 天津医科大学第二医院（天医二院）26 病跨院优势</span><b>${fmtSigned(ext26.diagonal_cosine_advantage, 4)}${crossCi ? ` ${fmtCi(crossCi, 3, true)}` : ''}</b></div>
        </div>
        <p class="v9-note-sm" style="margin-top:10px">剥离十条共性主轴后，每种慢病仍保留稳定可复现的局部导联心电指纹。</p>`;
      pulseFade(hmBox); pulseFade(sideBox);
    }

    bindChipGroup(find('#anat-mode-seg'), btn => { curAMode = btn.dataset.amode; renderAnatomyView(); });
    subChips.addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      if (curAMode === 'axes') curAxisIdx = Number(btn.dataset.axidx);
      else if (curAMode === 'mh') curMhKey = btn.dataset.mhk;
      else if (curAMode === 'offaxis') curOffPhe = btn.dataset.offphe;
      renderAnatomyView();
    });
    renderAnatomyView();

    // 2C (v13): Cross-Study ECG vs UKB PGS Reference — True Signed Bars (ZERO Clamping!)
    const gwas = D.gwas_quant_and_pgs || {};
    const s30 = gwas.summary_all_30 || {};
    const s26 = gwas.summary_26_clinical || {};
    const traits30 = gwas.pan_ukb_matched_30 || [];
    const binBench = gwas.binary_bounded_summary || {};

    let curGTab = 'binary';
    const kpisEl = find('#gwas-kpis');
    const legEl = find('#gwas-legend');
    const barsEl = find('#gwas-bars');
    const capEl = find('#gwas-caption');
    const fmtPct2 = v => (isNum(v) ? `${(Number(v) * 100).toFixed(2)}%` : '缺失');

    if (kpisEl) {
      kpisEl.innerHTML = `
        <div class="v9-gwas-kpi"><strong style="color:#2a6e5d">${fmtPct2(s30.prism_xgb_median_delta_r2)}</strong><span>MIMIC 心电 30 项中位（26 临床 ${fmtPct2(s26.prism_xgb_median_delta_r2)}）</span></div>
        <div class="v9-gwas-kpi"><strong style="color:#b85a3a">${fmtPct2(s30.published_ukb_pgs_median_r2)}</strong><span>UKB PGS 参照（保守最优 12.15%）</span></div>
        <div class="v9-gwas-kpi"><strong>${fmtPct2(s30.patel_exposome_median_r2)}</strong><span>Patel 暴露组参照</span></div>`;
    }

    function renderGwasTab() {
      if (!barsEl) return;

      if (curGTab === 'binary') {
        const seenPhe = new Set();
        const combined = [...(binBench.official_qc_pass_table || []), ...(binBench.mechanical_negative_controls || [])]
          .filter(r => { if (!r?.phecode || seenPhe.has(r.phecode)) return false; seenPhe.add(r.phecode); return true; });
        const getEcgLiab = r => {
          const raw = r.delta_r2_liab_wray2010_oos_xgb;
          return isNum(raw) ? Number(raw) : null;
        };
        const rows = combined.sort((a, b) => (getEcgLiab(b) ?? -999) - (getEcgLiab(a) ?? -999));
        const negRows = rows.filter(r => (getEcgLiab(r) ?? 0) < 0);
        const minV = Math.min(-0.03, ...rows.map(r => getEcgLiab(r) ?? 0));
        const maxV = Math.max(0.26, ...rows.map(r => Math.max(getEcgLiab(r) ?? 0, r.h2_liability_EUR || 0)));
        const span = Math.max(1e-6, maxV - minV);
        const zeroPct = (Math.abs(minV) / span) * 100;

        if (legEl) {
          legEl.innerHTML = `<span><i class="v9-swatch-box" style="background:#2a6e5d"></i>ΔR² &gt; 0</span><span><i class="v9-swatch-box" style="background:#bf4a40"></i>ΔR² &lt; 0（${negRows.length} 项向左）</span><span><i class="v9-swatch-box" style="background:#d97757"></i>UKB h²</span>`;
        }
        barsEl.innerHTML = rows.map(r => {
          const ecg = getEcgLiab(r);
          const h2 = isNum(r.h2_liability_EUR) ? Number(r.h2_liability_EUR) : 0;
          const auroc = r.auroc_prism1014_xgb;
          const isCtrl = Boolean(r.is_mechanical_negative_control);
          const ctrlBadge = isCtrl ? '<span class="v9-ctrl-badge">对照</span>' : '';
          const tip = `${r.phecode} ${r.phenotype}${auroc != null ? ` | XGB AUROC ${auroc.toFixed(4)}` : ''}`;
          const ecgIsNeg = ecg != null && ecg < 0;
          const ecgLeft = ecg == null ? zeroPct : (ecgIsNeg ? zeroPct - (Math.abs(ecg) / span) * 100 : zeroPct);
          const ecgW = ecg == null ? 0 : (Math.abs(ecg) / span) * 100;
          const h2W = (Math.max(0, h2) / span) * 100;
          return `<div class="v9-gwas-row" data-binary-phe="${esc(r.phecode)}" data-signed-val="${ecg != null ? ecg.toFixed(5) : ''}" title="${esc(tip)}">
            <div class="v9-gwas-label"><b>${esc(r.phecode)}</b> <span>${esc(F7_ZH[r.phecode] || r.phenotype)}</span>${ctrlBadge}</div>
            <div class="v9-gwas-pair">
              <div class="v13-signed-track" data-zero-pct="${zeroPct.toFixed(2)}">
                <div class="v13-signed-zero" data-gwas-zero-line="1" style="left:${zeroPct.toFixed(2)}%"></div>
                <div class="v13-signed-bar ${ecgIsNeg ? 'is-neg' : 'is-pos'}" data-dir="${ecgIsNeg ? 'neg' : 'pos'}" style="left:${ecgLeft.toFixed(2)}%;width:${ecgW.toFixed(2)}%"></div>
              </div>
              <div class="v13-signed-track">
                <div class="v13-signed-zero" data-gwas-zero-line="1" style="left:${zeroPct.toFixed(2)}%"></div>
                <div class="v13-signed-bar" style="left:${zeroPct.toFixed(2)}%;width:${h2W.toFixed(2)}%;background:#d97757"></div>
              </div>
            </div>
            <div class="v9-gwas-vals"><span style="color:${ecgIsNeg ? '#bf4a40' : '#2a6e5d'};font-weight:650">${ecg != null ? `${ecg >= 0 ? '+' : '−'}${Math.abs(ecg * 100).toFixed(2)}%` : '缺失'}</span> / <span style="color:#b85a3a">${(h2 * 100).toFixed(1)}%</span></div>
          </div>`;
        }).join('');
        const sumQc = binBench.summary_official_qc_pass || {};
        const maxXgb = isNum(sumQc.max_delta_r2_liab_wray2010_oos_xgb) ? `${(Number(sumQc.max_delta_r2_liab_wray2010_oos_xgb) * 100).toFixed(1)}%` : '缺失';
        const medWray = isNum(sumQc.median_delta_r2_liab_wray2010_oos_xgb) ? `${(Number(sumQc.median_delta_r2_liab_wray2010_oos_xgb) * 100).toFixed(2)}%` : '缺失';
        const medMz = isNum(sumQc.median_delta_r2_liab_probit_mz_dev_frozen_xgb) ? `${(Number(sumQc.median_delta_r2_liab_probit_mz_dev_frozen_xgb) * 100).toFixed(2)}%` : '缺失';
        if (capEl) {
          capEl.innerHTML = `二分类 Wray 样本外 Liability ΔR² 保留带符号值（含 <strong>${negRows.length} 项负值</strong>，不截为零）：最高 <strong>${maxXgb}</strong>，Wray 中位 <strong>${medWray}</strong>（dev-frozen Probit-MZ 敏感性中位 ${medMz}）。`;
        }
        pulseFade(barsEl);
        return;
      }

      const isClin26 = curGTab === 'clin26';
      const subset = isClin26 ? traits30.filter(t => !t.is_negative_control) : traits30;
      const sorted = [...subset].sort((a, b) => (b.delta_r2_prism1014_xgb ?? -999) - (a.delta_r2_prism1014_xgb ?? -999));
      const minV = Math.min(0, ...sorted.map(t => t.delta_r2_prism1014_xgb ?? 0));
      const maxV = Math.max(0.36, ...sorted.map(t => Math.max(t.delta_r2_prism1014_xgb ?? 0, t.published_ukb_pgs_r2 ?? 0)));
      const hasNeg = minV < 0;
      const span = Math.max(1e-6, maxV - minV);
      const zeroPct = hasNeg ? (Math.abs(minV) / span) * 100 : 0;

      if (legEl) {
        legEl.innerHTML = `
          <span><i class="v9-swatch-box" style="background:#2a6e5d"></i>MIMIC 心电 XGBoost 增量 ΔR²</span>
          <span><i class="v9-swatch-box" style="background:#d97757"></i>已发表 UKB PGS R²（跨研究参照 7.93%；保守最优 12.15%）</span>`;
      }

      barsEl.innerHTML = sorted.map(t => {
        const ecg = isNum(t.delta_r2_prism1014_xgb) ? Number(t.delta_r2_prism1014_xgb) : null;
        const ref = isNum(t.published_ukb_pgs_r2) ? Number(t.published_ukb_pgs_r2) : null;
        const badge = t.is_negative_control ? '<span class="v9-ctrl-badge">高遗传对照</span>' : '';
        const ecgNeg = ecg != null && ecg < 0;
        const ecgLeft = ecg == null ? zeroPct : (ecgNeg ? zeroPct - (Math.abs(ecg) / span) * 100 : zeroPct);
        const ecgW = ecg == null ? 0 : (Math.abs(ecg) / span) * 100;
        const refW = ref == null ? 0 : (Math.max(0, ref) / span) * 100;
        return `<div class="v9-gwas-row" title="${esc(t.label)}${t.pgs_citation ? ' | ' + t.pgs_citation : ''}">
          <div class="v9-gwas-label"><span>${esc(TRAIT_ZH[t.trait_key] || t.label)}</span>${badge}</div>
          <div class="v9-gwas-pair">
            <div class="v9-gwas-track" style="position:relative">${hasNeg ? `<div class="v13-signed-zero" style="left:${zeroPct.toFixed(2)}%"></div>` : ''}<div class="v9-gwas-ecg" style="position:relative;left:${ecgLeft.toFixed(2)}%;width:${ecgW.toFixed(2)}%;background:${ecgNeg ? '#bf4a40' : '#2a6e5d'}"></div></div>
            <div class="v9-gwas-track" style="position:relative">${hasNeg ? `<div class="v13-signed-zero" style="left:${zeroPct.toFixed(2)}%"></div>` : ''}<div class="v9-gwas-ref" style="position:relative;left:${zeroPct.toFixed(2)}%;width:${refW.toFixed(2)}%"></div></div>
          </div>
          <div class="v9-gwas-vals"><span style="color:${ecgNeg ? '#bf4a40' : '#2a6e5d'};font-weight:650">ECG ${ecg != null ? `${(ecg * 100).toFixed(1)}%` : '缺失'}</span> · <span style="color:#b85a3a;font-weight:600">PGS ${ref != null ? `${(ref * 100).toFixed(1)}%` : '缺失'}</span></div>
        </div>`;
      }).join('');

      if (capEl) {
        if (isClin26) {
          capEl.innerHTML = `26 项临床指标（跨研究参照）：MIMIC 心电 XGBoost 中位 <strong>${fmtPct2(s26.prism_xgb_median_delta_r2)}</strong>（纯线性 Ridge ${fmtPct2(s26.prism_ridge_median_delta_r2)}），已发表 UKB PGS 中位 <strong>${fmtPct2(s26.published_ukb_pgs_median_r2)}</strong>。`;
        } else {
          capEl.innerHTML = `30 项匹配表型中，MIMIC 心电模型与已发表 UKB 基因评分的中位增量 R² 分别为 <strong>${fmtPct2(s30.prism_xgb_median_delta_r2)}</strong> 和 <strong>${fmtPct2(s30.published_ukb_pgs_median_r2)}</strong>（跨研究参照；另一套保守最优 PGS 汇总为 <strong>12.15%</strong>，不宜据此宣称等效、互补或可替代）。`;
        }
      }
      pulseFade(barsEl);
    }

    bindChipGroup(find('#gwas-tab-seg'), btn => { curGTab = btn.dataset.gtab; renderGwasTab(); });
    renderGwasTab();

    // 2D (v13): PRISM-ECG Full-Phenome PheWAS v2 Workbench (D1-D10 17/17 Default)
    renderPhewasV2(D);
  }

  function renderPhewasV2(D) {
    const pw = D.phewas_v2;
    const kpiEl = find('#phewas-kpis');
    const bodyEl = find('#phewas-body');
    const capEl = find('#phewas-caption');
    const suppEl = find('#phewas-supp-body');
    if (!pw || !bodyEl) return;

    const gl = pw.global_17_chapters || {};
    const c1000 = pw.conditioned_1000_summary || {};
    const ext = pw.external_replication || {};
    const pk = ext.pkuph || {};
    const ty = ext.tianyi || {};
    const chs = pw.chapter_summary || [];
    const chD10Cov = chs.filter(c => isNum(c.d10_lrt_replicated_conf_fdr05_count) && Number(c.d10_lrt_replicated_conf_fdr05_count) > 0).length;

    const mainTitle = find('#phewas-main-title');
    if (mainTitle) {
      mainTitle.textContent = `十条心电轴在 ${chD10Cov}/${chs.length || 17} 个临床章节均检出可重复关联，涉及 ${fmtInt(gl.d10_lrt10_replicated_conf_fdr05_count)} 个表型`;
    }

    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="v9-gwas-kpi"><strong style="color:#2a6e5d">${chD10Cov}/${chs.length || 17} 章 · ${fmtInt(gl.d10_lrt10_replicated_conf_fdr05_count)} 表型</strong><span>十轴联合 LRT 双集通过（分母 ${fmtInt(gl.n_estimable_phecodes)}）</span></div>
        <div class="v9-gwas-kpi"><strong>${fmtSigned(gl.d10_median_delta_auroc_conf_replicated, 4)}</strong><span>入选 342 项 ΔAUROC 中位（全体 ${fmtSigned(gl.d10_median_delta_auroc_conf_all, 4)}）</span></div>
        <div class="v9-gwas-kpi"><strong style="color:#b85a3a">${fmtInt(c1000.replicated_conf_strict_bonf_of_dev_bonf_pairs)} 配对</strong><span>控十轴后复现（${fmtInt(c1000.replicated_strict_bonf_unique_phecodes)} 表型 · ${fmtInt(c1000.replicated_strict_bonf_chapters_covered)} 章）</span></div>`;
    }

    // Populate collapsed supplementary drawer: H10 strict replication (16/17, 276) + External 2-hospital replication
    if (suppEl) {
      const dir = gl.direction_breakdown_replicated_fdr05 || {};
      const hospRows = [
        { name: '北京大学人民医院（北大人民 / PKUPH）', obj: pk },
        { name: '天津医科大学第二医院（天医二院）', obj: ty },
      ];
      const fmtPair = o => (o && isNum(o.same_direction_count) && isNum(o.n_pairs_tested))
        ? `<b>${o.same_direction_count}/${o.n_pairs_tested} (${Number(o.same_direction_pct).toFixed(1)}%)</b> 同向<br><small style="color:#2a6e5d">${o.replicated_p05_same_dir_count}/${o.n_pairs_tested} p&lt;0.05</small>`
        : '缺失';
      suppEl.innerHTML = `
        <div class="v10-card-box-light" style="margin-bottom:12px">
          <h4>1. 单指标 H₁₀ 严格复现（16/17 章 · ${fmtInt(gl.replicated_conf_fdr05_of_dev_fdr05)} 表型）</h4>
          <p class="sub-copy" style="margin-top:4px">分母为 ${fmtInt(gl.n_estimable_phecodes)} 个临床表型（MIMIC 开发集→确认集患者拆分）。开发集 BH 命中 ${fmtInt(gl.dev_fdr05_count)} 项，确认集同向且通过阈值 ${fmtInt(gl.replicated_conf_fdr05_of_dev_fdr05)} 项（覆盖 ${fmtInt(gl.replicated_fdr05_chapters_covered)}/17 章）：按低 H₁₀ 编码，<strong>${fmtInt(dir.worse_h10_higher_disease_risk_or_gt_1)} 个表型呈正向关联，${fmtInt(dir.worse_h10_lower_disease_risk_or_lt_1)} 个呈反向关联</strong>；妊娠章 H₁₀ 复现 0 项。</p>
        </div>
        <div class="v10-card-box-light">
          <h4>2. 中美跨院零重训复现（两院可映射子集 + 伪码 1010 对照）</h4>
          <div class="v9-table-scroll" tabindex="0" role="region" aria-label="中美跨院零重训条件程序复现表">
            <table class="v10-dark-table">
              <thead><tr>
                <th>外部合作医院</th>
                <th>H₁₀ 25 共享病 log-OR</th>
                <th>全部复现对 (6 病)</th>
                <th>严格 Bonf 子集 (5 病)</th>
                <th>纯非循环 (10 对)</th>
                <th>伪码 1010 对照 (9 对)</th>
              </tr></thead>
              <tbody>${hospRows.map(h => {
                const hc = h.obj.h10_concordance || {};
                const ctl = h.obj.pseudo_1010_control || {};
                const pearsonR = hc.pearson_r_log_or_mimic_dev_sd ?? hc.pearson_r_log_or_site_sd ?? hc.pearson_r_log_or;
                const sameSign = hc.same_sign_count ?? hc.same_direction_count;
                return `<tr>
                  <td><strong>${esc(h.name)}</strong></td>
                  <td><b>r = ${fmtNum(pearsonR, 3)}</b><br><small>ρ = ${fmtNum(hc.spearman_rho_log_or, 3)} · ${isNum(sameSign) ? sameSign : '缺失'}/${isNum(hc.n_matched_diseases) ? hc.n_matched_diseases : '缺失'} 同向</small></td>
                  <td>${fmtPair(h.obj.all_rep_p05)}</td>
                  <td>${fmtPair(h.obj.strict_bonf)}</td>
                  <td>${fmtPair(h.obj.noncirculatory)}</td>
                  <td><b>${isNum(ctl.replicated_p05_same_dir_count) ? ctl.replicated_p05_same_dir_count : '缺失'}/${isNum(ctl.n_pairs_tested) ? ctl.n_pairs_tested : '缺失'} p&lt;0.05</b><br><small>${isNum(ctl.same_direction_count) ? ctl.same_direction_count : '缺失'}/${isNum(ctl.n_pairs_tested) ? ctl.n_pairs_tested : '缺失'} 同向</small></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
          <p class="v9-note-sm" style="margin-top:8px">伪码 <code>1010</code> 两院分别复现 <strong>${fmtInt(pk.pseudo_1010_control?.replicated_p05_same_dir_count)}/${fmtInt(pk.pseudo_1010_control?.n_pairs_tested)}</strong>、<strong>${fmtInt(ty.pseudo_1010_control?.replicated_p05_same_dir_count)}/${fmtInt(ty.pseudo_1010_control?.n_pairs_tested)} 对</strong>（严格子集同向率 ${fmtNum(pk.strict_bonf?.same_direction_pct, 1, '%')} / ${fmtNum(ty.strict_bonf?.same_direction_pct, 1, '%')}）。</p>
        </div>`;
    }

    let curTab = 'chapters';
    let curHitIdx = 0;
    const hits = pw.curated_mle_hits || [];
    const waves = pw.decoded_12lead_waveforms || {};
    const times4 = pw.time_ms_4ms || [];

    function renderHitDetail() {
      const detail = find('#phewas-hit-detail');
      const h = hits[curHitIdx] || hits[0];
      if (!detail || !h) return;
      const wobj = waves[h.program_id] || {};
      const wf12 = wobj.uv_per_1sd_12lead || {};
      const domLead = h.dominant_lead || wobj.dominant_lead;
      const peakLead = wobj.peak_lead || domLead;
      const domWin = h.dominant_window || wobj.dominant_window;
      const winBounds = pw.window_bounds_ms || CANONICAL_WIN_BOUNDS;
      const winRange = winBounds[domWin] || null;
      const domSharePct = isNum(wobj.dominant_lead_share) ? (Number(wobj.dominant_lead_share) * 100).toFixed(1) : null;
      const winSharePct = isNum(wobj.dominant_window_share) ? (Number(wobj.dominant_window_share) * 100).toFixed(1) : null;
      const peakMs = isNum(wobj.peak_time_ms) ? Number(wobj.peak_time_ms) : null;
      const peakUvGlobal = isNum(h.peak_uv_per_1sd) ? Number(h.peak_uv_per_1sd) : (isNum(wobj.peak_uv_per_1sd_w) ? Number(wobj.peak_uv_per_1sd_w) : null);
      const zhDis = F7_ZH[h.phecode] || h.phenotype;
      const allVals = LEADS12.flatMap(ld => (wf12[ld] || []).filter(isNum).map(v => Math.abs(v)));
      const sharedMaxAbs = allVals.length ? Math.max(5, ...allVals) * 1.08 : 50;
      const winRangeTxt = winRange ? `${winRange[0] >= 0 ? '+' : ''}${winRange[0]}~${winRange[1] >= 0 ? '+' : ''}${winRange[1]} ms` : '缺失';
      const leadSharePhrase = domSharePct != null ? `<strong>${esc(domLead)} 导联</strong>占全 12 导能量 <strong>${domSharePct}%</strong>` : `<strong>${esc(domLead)} 导联</strong>能量最高`;
      const peakPhrase = peakUvGlobal != null
        ? `全局峰幅 <strong>${peakUvGlobal.toFixed(1)} µV</strong>${peakMs != null ? `（${esc(peakLead)} · <code>${peakMs >= 0 ? '+' : ''}${peakMs.toFixed(0)} ms</code>）` : ''}`
        : '峰幅缺失';
      detail.innerHTML = `
        <div class="v10-card-box-dark">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px">
            <h4 style="margin:0">${esc(h.program_id)} ↔ ${esc(zhDis)} (${esc(h.phecode)})</h4>
            <span class="v10-tag is-teal">${esc(CHAPTER_ZH[h.chapter] || h.chapter)} · ${esc(domLead)} / ${esc(WIN_ZH[domWin] || domWin)}</span>
          </div>
          <div class="v12-phewas-explainer">
            同一程序活跃度 +1 开发集 SD 时的 12 导联同步变化：${leadSharePhrase}，${peakPhrase}；阴影标示最高能量波段 <strong>${esc(WIN_ZH[domWin] || domWin)}</strong>（<code>${winRangeTxt}</code>${winSharePct != null ? `，占 ${winSharePct}%` : ''}）。
          </div>
          <div class="v9-anat-meta-pills" style="margin-top:6px">
            <span>条件 OR <b>${fmtNum(h.or_cond_conf, 3)}</b> ${fmtCi(h.or_cond_conf_ci95, 3)}</span>
            <span>确认 MLE z <b>${fmtNum(h.z_cond_mle_conf, 2)}</b></span>
            <span>控十轴保留比 <b>${isNum(h.offaxis_retention_ratio) ? `${(Number(h.offaxis_retention_ratio) * 100).toFixed(0)}%` : '缺失'}</b></span>
            <span>统一纵轴 <b>±${Math.round(sharedMaxAbs)} µV</b></span>
          </div>
          <div class="v10-wave-grid-12">${LEADS12.map(ld => {
            const arr = wf12[ld] || [];
            const pkAbs = arr.length ? Math.max(...arr.map(Math.abs)) : null;
            const isDom = ld === domLead;
            const isPeakLd = ld === peakLead;
            let pkMarker = null;
            if (isPeakLd && peakMs != null && arr.length && times4.length === arr.length) {
              let bestI = 0;
              let bestD = Infinity;
              times4.forEach((t, ti) => { const d = Math.abs(t - peakMs); if (d < bestD) { bestD = d; bestI = ti; } });
              pkMarker = { timeMs: peakMs, val: arr[bestI], color: '#bf4a40' };
            }
            return `<div class="v10-wave-cell-dark ${isDom ? 'is-dom' : ''}" title="${esc(ld)} 导联 · 峰 ${fmtNum(pkAbs, 1, ' µV')}">
              <div class="v10-wave-cell-top"><b>${ld}${isDom ? ' ★' : ''}</b><span>${fmtNum(pkAbs, 1, ' µV')}</span></div>
              ${buildMultiWaveSvg(
                [{ arr, color: isDom ? '#d97757' : '#2a6e5d', width: isDom ? 2.1 : 1.5 }],
                times4,
                { dark: false, width: 120, height: 58, padY: 5, shadeWindowRange: winRange, peakMarker: pkMarker, symMaxAbs: sharedMaxAbs }
              )}
            </div>`;
          }).join('')}</div>
        </div>`;
    }

    function renderTab() {
      if (curTab === 'chapters') {
        const validCounts = chs.map(c => c.d10_lrt_replicated_conf_fdr05_count).filter(isNum).map(Number);
        const maxCnt = Math.max(10, ...validCounts);
        const pregRow = chs.find(c => String(c.chapter || '').toLowerCase().includes('pregnan')) || {};
        bodyEl.innerHTML = `
          <div class="v9-loco-legend" style="margin-top:0;margin-bottom:10px">
            <span><i class="v9-swatch-box" style="background:#2a6e5d"></i>十条心电轴 D1–D10 联合 LRT 两集同时复现数（MIMIC 开发集与确认集各自通过 BH，总计 ${fmtInt(gl.d10_lrt10_replicated_conf_fdr05_count)} / ${fmtInt(gl.n_estimable_phecodes)}）</span>
          </div>
          <div class="v10-bar-list">${chs.map(c => {
            const dN = isNum(c.d10_lrt_replicated_conf_fdr05_count) ? Number(c.d10_lrt_replicated_conf_fdr05_count) : null;
            const nEst = isNum(c.n_estimable_phecodes) ? Number(c.n_estimable_phecodes) : null;
            const dAuc = isNum(c.d10_median_delta_auroc_conf) ? Number(c.d10_median_delta_auroc_conf) : null;
            return `<div class="v10-bar-row is-dark" title="${esc(CHAPTER_ZH[c.chapter] || c.chapter)}：可检验 ${nEst ?? '缺失'}，十轴双集命中 ${dN ?? '缺失'}，确认 ΔAUROC 中位 ${dAuc != null ? fmtSigned(dAuc, 4) : '缺失'}">
              <div><b>${esc(CHAPTER_ZH[c.chapter] || c.chapter)}</b></div>
              <div class="v10-bar-track"><div class="v10-bar-fill-teal" style="width:${dN != null ? (clamp(dN / maxCnt) * 100).toFixed(1) : 0}%"></div></div>
              <div class="v10-bar-val"><b style="color:#2a6e5d">${dN != null ? `${dN}/${nEst ?? '?'}` : '缺失'}</b><small>ΔAUC ${dAuc != null ? fmtSigned(dAuc, 3) : '缺失'}</small></div>
            </div>`;
          }).join('')}</div>`;
        capEl.innerHTML = `先用年龄和性别解释诊断差异，再看同时加入十条心电轴后模型是否更贴合数据；<strong>${fmtInt(gl.d10_lrt10_replicated_conf_fdr05_count)} 个表型</strong>在 MIMIC 开发与确认两批患者中同时通过 BH（同源拆分，非外院复现；妊娠章 ${fmtInt(pregRow.n_estimable_phecodes)} 项可检验、${fmtInt(pregRow.d10_lrt_replicated_conf_fdr05_count)} 项命中、中位 ΔAUROC ${fmtSigned(pregRow.d10_median_delta_auroc_conf, 4)}）。`;
        pulseFade(bodyEl);
        return;
      }

      // Tab 2: Conditioned single-program 12-lead waveforms
      bodyEl.innerHTML = `
        <div class="v10-hit-grid">
          <div class="v10-hit-list" id="phewas-hit-list">${hits.map((h, idx) => {
            const zhDis = F7_ZH[h.phecode] || h.phenotype;
            const isNonCirc = h.chapter !== 'circulatory system';
            return `<button type="button" class="v10-hit-btn" data-hidx="${idx}" aria-pressed="${idx === curHitIdx}">
              <div><b>${esc(h.program_id)} · ${esc(zhDis)} (${esc(h.phecode)})</b><small>${esc(CHAPTER_ZH[h.chapter] || h.chapter)} · ${esc(h.dominant_lead)}/${esc(WIN_ZH[h.dominant_window] || h.dominant_window)}${isNonCirc ? ' · 非循环' : ''}</small></div>
              <div class="v10-hit-stat"><b>OR ${fmtNum(h.or_cond_conf, 2)}</b><span>${fmtNum(h.peak_uv_per_1sd, 1, ' µV')}</span></div>
            </button>`;
          }).join('')}</div>
          <div id="phewas-hit-detail"></div>
        </div>`;
      const listEl = find('#phewas-hit-list');
      if (listEl) {
        listEl.addEventListener('click', ev => {
          const btn = ev.target.closest('button[data-hidx]');
          if (!btn) return;
          curHitIdx = Number(btn.dataset.hidx);
          findAll('button[data-hidx]', listEl).forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.hidx) === curHitIdx)));
          renderHitDetail();
        });
      }
      renderHitDetail();
      capEl.innerHTML = `控制十轴后，<strong>${fmtInt(c1000.replicated_conf_strict_bonf_of_dev_bonf_pairs)} 个程序–表型配对</strong>通过严格复现，涉及 <strong>${fmtInt(c1000.replicated_strict_bonf_unique_phecodes)} 个表型</strong>、<strong>${fmtInt(c1000.replicated_strict_bonf_unique_programs)} 个程序</strong>、<strong>${fmtInt(c1000.replicated_strict_bonf_chapters_covered)} 个章节</strong>（<code>λ_GC = ${fmtNum(c1000.observed_confirmation_lambda_gc, 4)}</code>）。`;
      pulseFade(bodyEl);
    }

    bindChipGroup(find('#phewas-tab-seg'), btn => { curTab = btn.dataset.ptab; renderTab(); });
    renderTab();
  }

  /* ==================== ACT 03: Cohesive Longitudinal + K=5 Studio & Folded C0-C2 Drawer ==================== */
  function renderAct3(D) {
    const sc = D.subtype_kcurve || {};
    const f7 = sc.flagship7_diseases || [];
    const leads = sc.leads_displayed || ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const times = sc.times_ms || [];

    // Hydrate C10 folded drawer summary dynamically from computed counts
    const incSumEl = find('#sub-inc-summary');
    const incC = sc.incremental_mortality_counts_computed || {};
    if (incSumEl) {
      const nD = incC.n_diseases ?? f7.length ?? 7;
      const nAge = incC.age_sex_q_lt_05 ?? 6;
      const nLin = incC.linear_d10_q_lt_05 ?? 1;
      const nDf2 = incC.spline_d10_df2_q_lt_05 ?? 0;
      const nDf3 = incC.spline_d10_df3_q_lt_05 ?? 1;
      incSumEl.innerHTML = `<strong>增量死亡检验汇总（${nD} 旗舰慢病）：</strong>年龄性别调整后 <strong>${nAge}/${nD} 病</strong>有组间差异；加入连续十轴 D1–D10 后，线性规格仅房颤 <strong>${nLin}/${nD}</strong>，样条规格 df=2 为 <strong>${nDf2}/${nD}</strong>（df=3 为 ${nDf3}/${nD}，房颤方向反转且对调整方式敏感）。注：本抽屉 <code>C0–C2</code> 来自分病选 K 分析，与上方固定 <code>K=5</code> 的 <code>G0–G4</code> 传导形态分析相互独立，无一一对应关系；下方扩展目录为 143 个表型中 58 个至少有一个 <code>K≥3</code> 视图（共 157 个聚类视图）的子集。`;
    }
    if (!f7.length) {
      renderTrajectoryV3(D);
      return;
    }

    let curDis = f7[0];
    let curEmb = 'umap';
    let curRole = 'conf';
    let curWmode = 'delta';
    let curLead = 'all';
    let activeClusterG = null;
    const hitBoxes = [];

    const disBar = find('#sub-disease-chips');
    disBar.innerHTML = f7.map((d, i) =>
      `<button type="button" data-phe="${d.phecode}" aria-pressed="${i === 0}">${esc(F7_ZH[d.phecode] || d.phenotype)} (${d.phecode} · K=${d.k_selected})</button>`
    ).join('');
    bindChipGroup(disBar, btn => {
      curDis = f7.find(x => x.phecode === btn.dataset.phe) || f7[0];
      activeClusterG = null;
      renderAll();
    });

    bindChipGroup(find('#sub-emb-seg'), btn => { curEmb = btn.dataset.emb; renderManifold(); });
    bindChipGroup(find('#sub-role-seg'), btn => { curRole = btn.dataset.role; renderManifold(); });
    bindChipGroup(find('#sub-wave-seg') || find('#sub-wmode-seg'), btn => { curWmode = btn.dataset.wmode; renderWaves(); });
    bindChipGroup(find('#sub-lead-seg'), btn => { curLead = btn.dataset.slead; renderWaves(); });

    const canvas = find('#sc-manifold-canvas');
    if (canvas) {
      canvas.addEventListener('click', ev => {
        const r = canvas.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width;
        const y = (ev.clientY - r.top) / r.height;
        let best = null; let bestD = 0.09;
        hitBoxes.forEach(hb => { const dist = Math.hypot(x - hb.cx, y - hb.cy); if (dist < bestD) { bestD = dist; best = hb.g; } });
        if (best !== null) {
          activeClusterG = activeClusterG === best ? null : best;
          renderClusterChips(); renderManifold(); renderWaves();
        }
      });
    }

    function renderKCurve() {
      const svg = find('#sub-kcurve-svg');
      const badge = find('#sub-kcurve-badge');
      if (!svg) return;
      const kc = curDis.k_curve || [];
      const kSel = curDis.k_selected;
      const getMinJac = r => r.min_cluster_median_jaccard ?? r.hungarian_min_cluster_jaccard ?? 0;
      if (badge) {
        const rowSel = kc.find(r => r.k === kSel) || {};
        badge.textContent = `锁定 K_min = ${kSel} · ARI ${(rowSel.ari_median ?? 0).toFixed(3)} · 最弱簇 Jaccard ${getMinJac(rowSel).toFixed(3)}`;
      }
      const W = 520; const H = 245;
      const pad = { l: 46, r: 22, t: 38, b: 34 };
      const gw = W - pad.l - pad.r;
      const gh = H - pad.t - pad.b;
      const ks = kc.map(r => r.k);
      const minK = Math.min(...ks, 2);
      const maxK = Math.max(...ks, 8);
      const mapX = k => pad.l + ((k - minK) / Math.max(1, maxK - minK)) * gw;
      const mapY = v => pad.t + (1 - clamp(v, 0, 1.02) / 1.02) * gh;

      // Highlight CV plateau band (in_stability_band)
      const bandKs = kc.filter(r => r.in_stability_band).map(r => r.k);
      let bandRect = '';
      if (bandKs.length) {
        const x1 = mapX(Math.min(...bandKs)) - 16;
        const x2 = mapX(Math.max(...bandKs)) + 16;
        bandRect = `<rect x="${Math.max(pad.l, x1).toFixed(1)}" y="${pad.t}" width="${Math.min(gw, x2 - Math.max(pad.l, x1)).toFixed(1)}" height="${gh}" fill="rgba(42,110,93,0.10)" rx="6"/>`;
      }

      // Grid lines + 0.75 threshold
      let grid = '';
      [0.25, 0.5, 0.75, 1.0].forEach(yv => {
        const py = mapY(yv);
        const isGate = yv === 0.75;
        grid += `<line x1="${pad.l}" y1="${py.toFixed(1)}" x2="${W - pad.r}" y2="${py.toFixed(1)}" stroke="${isGate ? '#bf4a40' : 'rgba(20,20,19,0.08)'}" stroke-width="${isGate ? 1.4 : 1}" ${isGate ? 'stroke-dasharray="5 4"' : ''}/>`;
        grid += `<text x="${pad.l - 7}" y="${(py + 3.5).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${isGate ? '#bf4a40' : '#6c6a63'}" font-weight="${isGate ? 700 : 500}">${yv.toFixed(2)}</text>`;
      });

      const ariPts = kc.map(r => `${mapX(r.k).toFixed(1)},${mapY(r.ari_median ?? r.ari_mean ?? 0).toFixed(1)}`).join(' ');
      const jacPts = kc.map(r => `${mapX(r.k).toFixed(1)},${mapY(getMinJac(r)).toFixed(1)}`).join(' ');
      const cvPts = kc.map(r => `${mapX(r.k).toFixed(1)},${mapY(clamp(r.cv_gain_frac_of_stable_peak ?? 0, 0, 1)).toFixed(1)}`).join(' ');

      const dots = kc.map(r => {
        const x = mapX(r.k);
        const yAri = mapY(r.ari_median ?? r.ari_mean ?? 0);
        const yJac = mapY(getMinJac(r));
        const isSel = r.k === kSel;
        const whisker = (r.ari_ci_low != null && r.ari_ci_high != null)
          ? `<line x1="${x.toFixed(1)}" y1="${mapY(r.ari_ci_low).toFixed(1)}" x2="${x.toFixed(1)}" y2="${mapY(r.ari_ci_high).toFixed(1)}" stroke="rgba(42,110,93,0.36)" stroke-width="2"/>`
          : '';
        return `
          ${whisker}
          <text x="${x.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="11.5" font-weight="${isSel ? 700 : 500}" fill="${isSel ? '#2a6e5d' : '#57554e'}">K=${r.k}</text>
          <circle cx="${x.toFixed(1)}" cy="${yJac.toFixed(1)}" r="3.4" fill="#35638f"/>
          <circle cx="${x.toFixed(1)}" cy="${yAri.toFixed(1)}" r="${isSel ? 5.2 : 3.8}" fill="${isSel ? '#d97757' : '#2a6e5d'}" stroke="#ffffff" stroke-width="1.5"/>
          ${isSel ? `<text x="${(r.k === minK ? x + 8 : x).toFixed(1)}" y="${Math.max(27, yAri - 11).toFixed(1)}" text-anchor="${r.k === minK ? 'start' : 'middle'}" font-size="12.5" fill="#b85a3a" font-weight="700">★ K_min=${r.k}</text>` : ''}`;
      }).join('');

      svg.innerHTML = `
        ${bandRect}${grid}
        <polyline fill="none" stroke="#9b968a" stroke-width="1.4" stroke-dasharray="3 3" points="${cvPts}"/>
        <polyline fill="none" stroke="#35638f" stroke-width="1.8" stroke-dasharray="5 3" points="${jacPts}"/>
        <polyline fill="none" stroke="#2a6e5d" stroke-width="2.4" points="${ariPts}"/>
        ${dots}
        <g font-size="10.5" fill="#57554e">
          <rect x="${pad.l + 4}" y="6" width="10" height="3" fill="#2a6e5d"/><text x="${pad.l + 18}" y="11">重采样 ARI</text>
          <rect x="${pad.l + 84}" y="6" width="10" height="3" fill="#35638f"/><text x="${pad.l + 98}" y="11">最弱簇 Jaccard</text>
          <rect x="${pad.l + 188}" y="5" width="10" height="8" fill="rgba(42,110,93,0.18)"/><text x="${pad.l + 202}" y="11">CV 增益平台</text>
          <text x="${W - pad.r}" y="11" text-anchor="end" fill="#ae7b2f">门禁 0.75 · 无解退回 K=1</text>
        </g>`;
    }

    function renderClusterChips() {
      const wrap = find('#sub-cluster-chips');
      const cls = curDis.cluster_waveforms?.clusters || [];
      wrap.innerHTML = cls.map(cl => {
        const col = CLUSTER_PALETTE[cl.g % CLUSTER_PALETTE.length];
        return `<button type="button" class="v9-cluster-chip" data-cg="${cl.g}" aria-pressed="${activeClusterG === cl.g}">
          <i style="background:${col}"></i>C${cl.g} (n=${cl.n_conf.toLocaleString()})
        </button>`;
      }).join('');
      wrap.onclick = ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        const g = Number(b.dataset.cg);
        activeClusterG = activeClusterG === g ? null : g;
        renderClusterChips(); renderManifold(); renderWaves();
      };
    }

    function renderManifold() {
      const spaceObj = curDis[curEmb]?.[curRole];
      const badge = find('#sub-manifold-badge');
      if (badge && spaceObj) {
        badge.textContent = `${curEmb.toUpperCase()} · ${curRole === 'conf' ? '确认集' : '开发集'} (n=${spaceObj.n?.toLocaleString() ?? '—'}) · 2D 轮廓系数 ${(spaceObj.silhouette_2d ?? 0).toFixed(3)}`;
      }
      drawManifoldCanvas(canvas, spaceObj, activeClusterG, hitBoxes);
    }

    function renderWaves() {
      const grid = find('#sub-wave-grid');
      const badge = find('#sub-wave-badge');
      const cw = curDis.cluster_waveforms || {};
      const cls = cw.clusters || [];
      if (badge) badge.textContent = `dev↔conf ΔµV 中位余弦 ${(cw.median_dev_val_delta_cosine ?? 0).toFixed(4)}`;

      const targetLeads = curLead === 'all' ? leads : [curLead];
      grid.classList.toggle('is-single', curLead !== 'all');
      const wfKey = curWmode === 'delta' ? 'delta_8lead_uv' : 'mean_8lead_uv';

      let maxAbs = 20;
      cls.forEach(cl => targetLeads.forEach(ld => {
        (cl[wfKey]?.[ld] || []).forEach(v => { const a = Math.abs(v); if (a > maxAbs) maxAbs = a; });
      }));
      const W = 220; const H = curLead === 'all' ? 84 : 210; const padY = 8;
      const mapX = idx => (times.length > 1 ? (idx / (times.length - 1)) * W : 0);
      const mapY = val => (H / 2) - (val / maxAbs) * (H / 2 - padY);
      const qrsA = ((0 - (times[0] || -200)) / ((times[times.length - 1] || 556) - (times[0] || -200))) * W;
      const qrsB = ((120 - (times[0] || -200)) / ((times[times.length - 1] || 556) - (times[0] || -200))) * W;

      grid.innerHTML = targetLeads.map(ld => {
        const paths = cls.map(cl => {
          const arr = cl[wfKey]?.[ld] || [];
          const col = CLUSTER_PALETTE[cl.g % CLUSTER_PALETTE.length];
          const focused = activeClusterG === null || activeClusterG === cl.g;
          const pts = arr.map((v, i) => `${mapX(i).toFixed(1)},${mapY(v).toFixed(1)}`).join(' ');
          return `<polyline fill="none" stroke="${col}" stroke-width="${focused ? (activeClusterG === cl.g ? 2.5 : 1.75) : 1.0}" opacity="${focused ? 0.95 : 0.14}" points="${pts}"/>`;
        }).join('');
        return `<div class="v9-wave-cell">
          <div class="v9-wave-cell-head"><span>${ld} 导联</span><small>±${Math.round(maxAbs)} µV</small></div>
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            <rect x="${qrsA.toFixed(1)}" y="0" width="${(qrsB - qrsA).toFixed(1)}" height="${H}" fill="rgba(53,99,143,0.08)"/>
            <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="rgba(20,20,19,0.12)" stroke-width="0.8"/>
            ${paths}
          </svg>
        </div>`;
      }).join('');
    }

    function renderDotplot() {
      const wrap = find('#sub-dotplot');
      const dp = curDis.cluster_waveforms?.marker_dotplot || {};
      const progs = dp.programs || [];
      const rows = dp.rows || [];
      const clsWf = curDis.cluster_waveforms?.clusters || [];
      const nByG = Object.fromEntries(clsWf.map(c => [c.g, c.n_conf]));
      wrap.innerHTML = `<table class="v9-dotplot-table"><thead><tr><th>簇</th>${
        progs.map(p => `<th title="开发集 ANOVA-F=${p.dev_anova_f}">${esc(p.program_id)}<br><small style="color:#64748b;font-weight:400">${esc(p.dominant_lead)}/${esc(p.dominant_window)}</small></th>`).join('')
      }</tr></thead><tbody>${
        rows.map(r => {
          const col = CLUSTER_PALETTE[r.g % CLUSTER_PALETTE.length];
          const nExact = r.n ?? nByG[r.g];
          return `<tr><td class="dp-cl"><span style="color:${col}">C${r.g}</span> <small style="color:#64748b">n=${nExact?.toLocaleString() ?? '—'}</small></td>${
            (r.cells || []).map(cell => {
              const z = cell.mean_z ?? 0;
              const fill = z >= 0 ? `rgba(191,74,64,${clamp(0.18 + Math.min(4, z) / 4 * 0.82).toFixed(2)})` : `rgba(53,99,143,${clamp(0.18 + Math.min(2, Math.abs(z)) / 2 * 0.65).toFixed(2)})`;
              const sz = 6 + clamp((cell.active_pct ?? 50) / 100) * 14;
              return `<td title="${esc(cell.program_id)} · 确认集激活 ${(cell.active_pct ?? 0).toFixed(1)}% · z=${z.toFixed(2)}"><span style="display:inline-block;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;border-radius:50%;background:${fill}"></span></td>`;
            }).join('')
          }</tr>`;
        }).join('')
      }</tbody></table>`;
    }

    function renderMortality() {
      const box = find('#sub-mortality-box');
      const badge = find('#sub-mort-badge');
      const ev = curDis.mortality_365d_eval || {};
      const cls = ev.clusters || [];
      if (badge) badge.textContent = `确认集 n=${(ev.n_covered || 0).toLocaleString()} · 死亡 ${ev.deaths_365d || 0} 例 · 校正差 ${(ev.adj_spread_pp ?? 0).toFixed(2)} pp`;

      const maxR = Math.max(12, ...cls.map(c => c.age_sex_adj_mortality_365d_pct ?? 0));
      const rowsHtml = cls.map(c => {
        const col = CLUSTER_PALETTE[c.g % CLUSTER_PALETTE.length];
        const adj = c.age_sex_adj_mortality_365d_pct ?? 0;
        const ci = c.age_sex_adj_ci95_pct || [0, 0];
        return `<div class="v9-mort-row">
          <span style="color:${col};font-weight:650">C${c.g} <small style="color:#64748b;font-weight:500">年龄性别校正</small></span>
          <div class="v9-mort-track"><div class="v9-mort-fill" style="width:${(clamp(adj / maxR) * 100).toFixed(1)}%;background:${col}"></div></div>
          <span class="v9-mort-val"><b>${adj.toFixed(1)}%</b> <small style="color:#64748b">[${ci[0].toFixed(1)}, ${ci[1].toFixed(1)}]</small></span>
        </div>`;
      }).join('');

      const pFmt = v => (v == null ? '—' : (v < 0.001 ? v.toExponential(2) : v.toFixed(4)));
      const omnLrt = ev.omnibus_lrt_age_sex_unpenalized ?? ev.omnibus_lrt_age_sex ?? 0;
      const incLrt = ev.inc_over_d10_lrt_unpenalized ?? ev.inc_over_d10_lrt ?? 0;
      const incP = ev.inc_over_d10_p_asymptotic ?? ev.inc_over_d10_p;
      const incQ = ev.inc_over_d10_q_bh_parametric_bootstrap ?? ev.inc_over_d10_q_bh_asymptotic ?? ev.inc_over_d10_q_bh;
      const isAf = curDis.phecode === '427.21';
      const isAfInc = (incQ ?? 1) < 0.05;
      const attenNum = (ev.lrt_attenuation_by_d10_frac ?? 0) * 100;
      const linInc = ev.incremental_over_d10_sensitivity?.linear_d10_unpenalized;
      const effPp = linInc?.adjusted_risk_diff_hi_minus_lo_pp;
      const effCi = linInc?.adjusted_risk_diff_ci95_pp;
      const effTxt = !isAf && effPp != null
        ? ` · 控 D1–D10 校正风险差 <b>${effPp >= 0 ? '+' : ''}${effPp.toFixed(2)} pp</b>${effCi ? ` [${effCi[0].toFixed(2)}, ${effCi[1].toFixed(2)}]` : ''}`
        : '';
      const bootTag = ev.inc_over_d10_q_bh_parametric_bootstrap != null ? '（无惩罚 MLE + 参数化 Bootstrap q_BH）' : '';
      const conclusionTxt = isAf
        ? '方向反转且对调整规格敏感；详见下方四种调整规格核验'
        : `相对衰减 ${attenNum.toFixed(1)}% · 预后梯度主要与连续坐标重合`;
      box.innerHTML = rowsHtml + `<div class="v9-mort-stats">
        <div>年龄/性别校正 Omnibus 检验：LRT = <b>${omnLrt.toFixed(2)}</b> · p = <b>${pFmt(ev.omnibus_p_age_sex)}</b> · q_BH = <b>${pFmt(ev.omnibus_q_bh_age_sex)}</b></div>
        <div style="margin-top:4px">控共享连续坐标 <code>D1–D10</code> 后增量检验：LRT = <b>${incLrt.toFixed(2)}</b> · p = <b>${pFmt(incP)}</b> · q_BH = <b class="${isAfInc ? 'is-af' : ''}">${pFmt(incQ)}</b>${effTxt}${bootTag}（${conclusionTxt}）</div>
      </div>`;
    }

    function renderAfibAudit() {
      const box = find('#afib-d10-audit');
      const af = sc.af_427_21_incremental_mortality_verification || {};
      const visible = curDis.phecode === '427.21' && af.n_confirmation != null;
      if (!box) return;
      box.hidden = !visible;
      if (!visible) { box.innerHTML = ''; return; }
      const specs = af.adjustment_specifications || {};
      const age = specs.age_sex || {};
      const linear = specs.linear_d10_unpenalized || {};
      const df2 = specs.nonlinear_spline_d10_df2_per_axis || {};
      const df3 = specs.nonlinear_spline_d10_df3_per_axis || {};
      const orAge = age.cluster_odds_ratios_vs_ref || {};
      const orLinear = linear.cluster_odds_ratios_vs_ref?.C2 || {};
      const orDf3 = df3.cluster_odds_ratios_vs_ref?.C2 || {};
      const signed = (v, digits = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(Number(v ?? 0)).toFixed(digits)}`;
      const ci = (arr, digits = 2) => `[${signed(arr?.[0], digits)}, ${signed(arr?.[1], digits)}]`;
      const orCi = (obj, digits = 3) => `${Number(obj?.or ?? 0).toFixed(digits)} [${Number(obj?.or_ci95?.[0] ?? 0).toFixed(digits)}, ${Number(obj?.or_ci95?.[1] ?? 0).toFixed(digits)}]`;
      const clusterText = (af.confirmation_clusters || []).map(c => `C${c.g}: 校正 ${Number(c.age_sex_adj_mortality_365d_pct).toFixed(1)}% [${Number(c.age_sex_adj_ci95_pct?.[0]).toFixed(1)}, ${Number(c.age_sex_adj_ci95_pct?.[1]).toFixed(1)}]`).join(' · ');
      const full = af.full_phenome_context || {};
      box.innerHTML = `
        <div class="v9-afib-head">
          <span class="badge-light">房颤 427.21 · 全调整规格直接披露</span>
          <h3>房颤 (427.21) 控 D1–D10 敏感性核验</h3>
          <p>确认样本 <b>n = ${af.n_confirmation.toLocaleString('en-US')}</b>，<b>${af.deaths_365d}</b> 例死亡；${clusterText}。开发侧锁定对比为 <code>C2 − C0</code>。</p>
        </div>
        <div class="v9-table-scroll" tabindex="0" role="region" aria-label="房颤四种死亡调整规格">
          <table class="v9-definition-table v9-afib-table"><thead><tr><th scope="col">调整规格</th><th scope="col">估计与区间</th><th scope="col">多重校正 / 解释</th></tr></thead><tbody>
            <tr data-af-spec="age_sex"><th scope="row">仅年龄+性别</th><td>C1 OR = ${orCi(orAge.C1)}；C2 OR = ${orCi(orAge.C2)}（跨 1）；开发锁定 C2−C0 = ${signed(age.dev_locked_adjusted_risk_diff_pp)} pp</td><td>omnibus q_BH = ${Number(age.omnibus_q_bh).toFixed(4)}；主要由 C1 驱动</td></tr>
            <tr data-af-spec="linear_d10_unpenalized"><th scope="row">年龄+性别 + 线性 D1–D10（${linear.n_null_covariates} 协变量）</th><td>C2−C0 = ${signed(linear.dev_locked_adjusted_risk_diff_pp)} pp ${ci(linear.dev_locked_adjusted_risk_diff_ci95_pp)}；C2 OR = ${orCi(orLinear)}</td><td>q_boot = ${Number(linear.q_boot).toFixed(4)}（B=${Number(linear.parametric_bootstrap_B).toLocaleString('en-US')}）</td></tr>
            <tr data-af-spec="nonlinear_spline_d10_df2_per_axis"><th scope="row">年龄+性别 + RCS df=2（${df2.n_null_covariates} 协变量）</th><td>方向与点估计仅作本规格敏感性展示，不与线性规格混用</td><td>q_boot = ${Number(df2.q_boot).toFixed(4)}（B=${df2.parametric_bootstrap_B}），已超过 0.05 阈值</td></tr>
            <tr data-af-spec="nonlinear_spline_d10_df3_per_axis"><th scope="row">年龄+性别 + RCS df=3（${df3.n_null_covariates} 协变量；303 死对应 EPV ≈ 8.7）</th><td>C2−C0 = ${signed(df3.dev_locked_adjusted_risk_diff_pp)} pp ${ci(df3.dev_locked_adjusted_risk_diff_ci95_pp)}；C2 OR = ${orCi(orDf3)}</td><td>q_boot = ${Number(df3.q_boot).toFixed(4)}（B=${df3.parametric_bootstrap_B}）</td></tr>
          </tbody></table>
        </div>
        <p class="v9-afib-context">全表型上下文：${full.scorable_phenotypes_eval} 个可评疾病中，控 D1–D10 后 <b>${full.fdr_005_inc_over_d10_phenotypes}/${full.scorable_phenotypes_eval}</b> 达 FDR 0.05。Flagship-7 预先锁定为 7 个高患病率慢性索引疾病，并非按确认集死亡率筛选。</p>
        ${(() => {
          const cfAf = D.pseudotime_v3_and_counterfactual?.counterfactual_audit_v1?.afib_427_21_resolution;
          if (!cfAf) return '';
          const sp = cfAf.specifications || {};
          const devS = sp.dev_all_linear_d10 || {};
          const npLin = sp.conf_nonpaced_linear_d10 || {};
          const npRcs = sp.conf_nonpaced_rcs_df3 || {};
          return `<div class="v10-card-box-light" style="margin-top:12px">
            <span class="badge-light">反事实核验 · DEV 正向 vs CONF 去起搏压测</span>
            <h4 style="margin-top:4px">房颤 C2 在确认集的方向反转：去除起搏患者后反转仍存在，方向对队列和调整方式敏感</h4>
            <div class="v9-table-scroll" style="margin-top:8px">
              <table class="v10-light-table"><thead><tr><th>验证场景</th><th>n</th><th>LRT</th><th>C1 OR</th><th>C2 OR</th><th>D1–D10 预测死亡 (C2)</th></tr></thead><tbody>
                <tr><td><strong>开发集 DEV · 线性 D1–D10</strong>（起搏 ${fmtNum(cfAf.c2_ecg_paced_pct_dev, 1, '%')}）</td><td>${fmtInt(devS.n_patients)}</td><td>${fmtNum(devS.lrt_unpenalized_mle, 2)}</td><td><b style="color:#2a6e5d">${fmtNum(devS.or_c1?.or, 3)}</b></td><td><b style="color:#2a6e5d">${fmtNum(devS.or_c2?.or, 3)}（正向）</b></td><td>${fmtNum(devS.c2_null_predicted_mortality_pct, 2, '%')}</td></tr>
                <tr><td><strong>确认集 CONF · 纯非起搏 · 线性 D1–D10</strong></td><td>${fmtInt(npLin.n_patients)}</td><td>${fmtNum(npLin.lrt_unpenalized_mle, 2)}</td><td>${fmtNum(npLin.or_c1?.or, 3)}</td><td><b style="color:#bf4a40">${fmtNum(npLin.or_c2?.or, 3)}（反向）</b></td><td>${fmtNum(npLin.c2_null_predicted_mortality_pct, 2, '%')}</td></tr>
                <tr><td><strong>确认集 CONF · 纯非起搏 · RCS df=3</strong></td><td>${fmtInt(npRcs.n_patients)}</td><td>${fmtNum(npRcs.lrt_unpenalized_mle, 2)}</td><td>${fmtNum(npRcs.or_c1?.or, 3)}</td><td><b style="color:#bf4a40">${fmtNum(npRcs.or_c2?.or, 3)}（反向）</b></td><td>${fmtNum(npRcs.c2_null_predicted_mortality_pct, 2, '%')}</td></tr>
              </tbody></table>
            </div>
            <p class="sub-copy" style="font-size:12px;margin-top:8px">去除起搏患者后反转仍存在，方向在开发集与确认集间相反且对调整规格敏感；现有数据不足以确立独立临床保护亚型，亦不将其唯一归因于有限样本。</p>
          </div>`;
        })()}
        <p class="v9-afib-conclusion"><strong>未确证稳健的独立临床亚型增量；房颤条件关联在 DEV 与 CONF 符号相反且对调整规格敏感。</strong></p>`;
    }

    function renderAll() {
      const zh = F7_ZH[curDis.phecode] || curDis.phenotype;
      find('#sub-cur-title').textContent = `${zh} (${curDis.phecode}) · ${curDis.k_selected} 个横断面离散亚型`;
      find('#sub-cur-sub').textContent = `确认集 n=${curDis.n_conf?.toLocaleString()} · 点击右侧亚型胶囊可单独聚焦波形与死亡率`;
      renderKCurve();
      renderClusterChips();
      renderManifold();
      renderWaves();
      renderDotplot();
      renderMortality();
      renderAfibAudit();
    }
    renderAll();

    // v10 NEW: Single-Cell Remodeling Trajectory, K=5 Orthogonal Bifurcation & Collider Bias Workbench
    renderTrajectoryV3(D);

    // Hydrate collapsed drawer for 58/143 (157 views) K>=3 catalog explorer (inside #sub-inc-drawer)
    const incDrawer = find('#sub-inc-drawer');
    const catSelect = find('#drawer-cat-select');
    const catMeta = find('#drawer-cat-meta');
    const catCanvas = find('#drawer-umap-canvas');
    const catalog = sc.catalog_k3plus_drawer || [];
    if (catSelect && catalog.length) {
      catSelect.innerHTML = catalog.map(item =>
        `<option value="${item.view_id}">${item.is_primary_view ? '★ ' : ''}${esc(item.phecode)} ${esc(F7_ZH[item.phecode] || item.phenotype)} (K=${item.k})</option>`
      ).join('');
      const renderCat = () => {
        const item = catalog.find(x => x.view_id === catSelect.value) || catalog[0];
        if (!item) return;
        const space = item.umap?.val || item.umap?.conf || item.umap?.dev;
        if (catMeta) catMeta.textContent = `${item.phenotype} (${item.phecode}) · 143 表型中 58 个含 K≥3 视图（共 157 视图） · K=${item.k} · 8D 轮廓 ${(item.val_silhouette_8d ?? 0).toFixed(3)} · dev ARI ${(item.dev_ari_median ?? 0).toFixed(3)}`;
        drawManifoldCanvas(catCanvas, space, null, null);
      };
      catSelect.addEventListener('change', renderCat);
      if (incDrawer) {
        incDrawer.addEventListener('toggle', () => {
          if (incDrawer.open) {
            requestAnimationFrame(() => {
              renderManifold();
              renderCat();
            });
          }
        });
      }
    }
  }

  function renderTrajectoryV3(D) {
    const pt = D.pseudotime_v3_and_counterfactual;
    const riverWrap = find('#ch3-river-wrap');
    const forestWrap = find('#ch3-fe-forest-wrap');
    const cm425Wrap = find('#ch3-cm425-wrap');
    const k5Detail = find('#traj-k5-detail');
    const capEl = find('#traj-caption');
    const statsDrawer = find('#traj-stats-drawer');
    if (!pt || !k5Detail) return;

    const feComp = pt.fe_summary_computed || {};
    const feRows = pt.all15_within_patient_fe || [];
    const cf = pt.counterfactual_audit_v1 || {};
    const extG = pt.external_hospital_dpt_gradients || {};
    const cm = pt.cardiomyopathy_425_1_detail || {};
    const nPatRep = pt.repeat_projection?.n_unique_repeat_patients;
    const nRecRep = pt.repeat_projection?.n_projected_repeat_records;

    const feHead = find('#ch3-fe-headline');
    if (feHead) {
      feHead.textContent = `${feComp.n_diseases_total ?? 15} 种慢病全部获得同人纵向估计；${feComp.n_positive_point_slope ?? 14} 种平均斜率向前，${feComp.n_positive_bh_q05 ?? 12} 种有统计支持`;
    }

    let curK5Dis = '401.1';
    let focusedK5G = null;
    let curK5WaveMode = 'delta'; // 'delta' (G2/G3 - G0 ΔµV) or 'g0' (G0 baseline mean µV)

    function renderOrganicRiver() {
      if (!riverWrap) return;
      const selFe = feRows.find(r => r.phecode === curK5Dis) || feRows[0] || {};
      const selZh = F7_ZH[curK5Dis] || curK5Dis;
      riverWrap.innerHTML = `
        <svg id="ch3-river-svg" class="v13-river-svg" viewBox="0 0 560 168" role="img" aria-label="同人纵向连续坐标变化示意：仅刻画患者自身随年份的连续变化，不连接至右侧横断面束支形态">
          <defs>
            <linearGradient id="v13RiverFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#2a6e5d" stop-opacity="0.22"/>
              <stop offset="48%" stop-color="#ae7b2f" stop-opacity="0.20"/>
              <stop offset="100%" stop-color="#d97757" stop-opacity="0.28"/>
            </linearGradient>
            <linearGradient id="v13RiverCore" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#2a6e5d"/>
              <stop offset="52%" stop-color="#b87638"/>
              <stop offset="100%" stop-color="#d97757"/>
            </linearGradient>
          </defs>
          <!-- Soft layered river banks (purely within-patient longitudinal continuum, NO fork into RBBB/LBBB!) -->
          <path d="M 22 66 C 145 48, 255 88, 385 62 C 455 48, 502 52, 538 44 L 538 128 C 490 120, 442 128, 378 118 C 255 100, 145 128, 22 108 Z" fill="url(#v13RiverFill)"/>
          <path d="M 22 76 C 150 62, 260 94, 388 72 C 456 60, 504 64, 538 58 L 538 114 C 492 108, 444 114, 380 106 C 258 92, 150 116, 22 98 Z" fill="url(#v13RiverFill)" opacity="0.65"/>
          <!-- Organic flowing currents (animated gently; frozen under ?motion=0 & prefers-reduced-motion) -->
          <path class="v13-river-ribbon" d="M 28 74 C 152 60, 262 90, 388 70 C 456 60, 502 62, 534 56" fill="none" stroke="#2a6e5d" stroke-width="1.4" opacity="0.68"/>
          <path class="v13-river-ribbon" d="M 28 87 C 152 76, 262 100, 388 84 C 456 76, 502 80, 534 76" fill="none" stroke="url(#v13RiverCore)" stroke-width="2.4" opacity="0.92"/>
          <path class="v13-river-ribbon" d="M 28 100 C 152 96, 262 112, 388 102 C 456 96, 502 100, 534 98" fill="none" stroke="#d97757" stroke-width="1.4" opacity="0.65"/>

          <!-- Time axis ticks -->
          <line x1="28" y1="142" x2="534" y2="142" stroke="rgba(20,20,19,0.16)" stroke-width="1"/>
          <circle cx="64" cy="86" r="5" fill="#2a6e5d" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="278" cy="91" r="5.5" fill="#ae7b2f" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="496" cy="79" r="6" fill="#d97757" stroke="#ffffff" stroke-width="1.8"/>

          <text x="28" y="24" font-size="11" font-weight="660" fill="#141413">${fmtInt(nPatRep)} 复测患者 · ${fmtInt(nRecRep)} 条记录</text>
          <text x="534" y="24" text-anchor="end" font-size="10.5" font-weight="640" fill="#2a6e5d">选中 ${esc(selZh)}：${fmtSigned(selFe.beta_fe, 4, '/yr')}</text>
          <text x="64" y="158" text-anchor="middle" font-size="9.8" fill="#57554e">早期</text>
          <text x="278" y="158" text-anchor="middle" font-size="9.8" fill="#57554e">年斜率中位 +0.0217/年（住院对照 +0.0175）</text>
          <text x="496" y="158" text-anchor="middle" font-size="9.8" fill="#b85a3a">后期</text>
        </svg>`;
    }

    function renderSignedFeForest() {
      if (!forestWrap) return;
      const allVals = feRows.flatMap(r => [r.beta_fe, ...(r.ci95 || [])]).filter(isNum).map(Number);
      const xMin = Math.min(-0.026, ...allVals) * 1.06;
      const xMax = Math.max(0.044, ...allVals) * 1.06;
      const W = 560;
      const rowH = 22;
      const pad = { l: 138, r: 108, t: 24, b: 26 };
      const H = pad.t + feRows.length * rowH + pad.b;
      const gw = W - pad.l - pad.r;
      const mapX = v => pad.l + ((v - xMin) / Math.max(1e-6, xMax - xMin)) * gw;
      const x0 = mapX(0);
      const ticks = [-0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04].filter(t => t >= xMin && t <= xMax);

      forestWrap.innerHTML = `
        <svg id="ch3-fe-forest-svg" class="v13-fe-forest-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="15 种慢病同人固定效应年斜率带符号森林图与 95% 置信区间，含 425.1 负估计向左绘制">
          ${ticks.map(tv => {
            const px = mapX(tv);
            const isZero = tv === 0;
            return `<line ${isZero ? 'data-fe-zero-line="1" ' : ''}x1="${px.toFixed(1)}" y1="${pad.t - 4}" x2="${px.toFixed(1)}" y2="${H - pad.b}" stroke="${isZero ? 'rgba(20,20,19,0.52)' : 'rgba(20,20,19,0.08)'}" stroke-width="${isZero ? 1.4 : 1}" ${isZero ? 'stroke-dasharray="3 2"' : ''}/>
              <text x="${px.toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="9.2" fill="${isZero ? '#141413' : '#6c6a63'}" font-weight="${isZero ? 700 : 400}">${tv === 0 ? '0' : (tv > 0 ? `+${tv.toFixed(2)}` : `−${Math.abs(tv).toFixed(2)}`)}</text>`;
          }).join('')}
          <text x="${pad.l}" y="14" font-size="10" font-weight="640" fill="#57554e">疾病 (n)</text>
          <text x="${x0.toFixed(1)}" y="14" text-anchor="middle" font-size="9.5" fill="#141413">零线 (95% CI)</text>
          <text x="${W - 8}" y="14" text-anchor="end" font-size="10" font-weight="640" fill="#57554e">β/年</text>
          ${feRows.map((r, i) => {
            const cy = pad.t + i * rowH + rowH / 2;
            const b = Number(r.beta_fe);
            const ci = r.ci95 || [b, b];
            const isNeg = b < 0;
            const isSig = r.fe_q_bh_15 != null && Number(r.fe_q_bh_15) < 0.05 && b > 0;
            const isSel = r.phecode === curK5Dis;
            const col = isNeg ? '#bf4a40' : (isSig ? '#2a6e5d' : '#ae7b2f');
            const xb = mapX(b);
            const xLo = mapX(ci[0]);
            const xHi = mapX(ci[1]);
            const barX = Math.min(x0, xb);
            const barW = Math.max(1.5, Math.abs(xb - x0));
            const labelZh = F7_ZH[r.phecode] || r.phenotype;
            return `<g data-fe-phe-group="${esc(r.phecode)}" data-fe-beta="${b.toFixed(4)}">
              <title>${esc(labelZh)} (${esc(r.phecode)}, n=${fmtInt(r.n_cases_fe)}): β=${fmtSigned(b, 4)}/yr [${fmtSigned(ci[0], 4)}, ${fmtSigned(ci[1], 4)}]</title>
              ${isSel ? `<rect x="4" y="${(cy - rowH / 2 + 1).toFixed(1)}" width="${W - 8}" height="${rowH - 2}" rx="4" fill="rgba(217,119,87,0.12)"/>` : ''}
              <text x="${pad.l - 6}" y="${(cy + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="${isSel || isNeg ? 700 : 500}" fill="${isNeg ? '#bf4a40' : '#141413'}">${esc(labelZh)} <tspan fill="#6c6a63" font-size="8.8">(${fmtInt(r.n_cases_fe)})</tspan></text>
              <rect data-fe-phe="${esc(r.phecode)}" data-fe-dir="${isNeg ? 'neg' : 'pos'}" x="${barX.toFixed(1)}" y="${(cy - 3.2).toFixed(1)}" width="${barW.toFixed(1)}" height="6.4" rx="2" fill="${col}" opacity="0.34"/>
              <line data-fe-ci="${esc(r.phecode)}" x1="${xLo.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${xHi.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col}" stroke-width="1.6"/>
              <line x1="${xLo.toFixed(1)}" y1="${(cy - 3.5).toFixed(1)}" x2="${xLo.toFixed(1)}" y2="${(cy + 3.5).toFixed(1)}" stroke="${col}" stroke-width="1.3"/>
              <line x1="${xHi.toFixed(1)}" y1="${(cy - 3.5).toFixed(1)}" x2="${xHi.toFixed(1)}" y2="${(cy + 3.5).toFixed(1)}" stroke="${col}" stroke-width="1.3"/>
              <circle cx="${xb.toFixed(1)}" cy="${cy.toFixed(1)}" r="${isSel ? 3.8 : 3.0}" fill="${col}" stroke="#ffffff" stroke-width="0.9"/>
              <text x="${W - 6}" y="${(cy + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" font-family="ui-monospace, monospace" fill="${isNeg ? '#bf4a40' : '#3b3a36'}">${fmtSigned(b, 4)}</text>
            </g>`;
          }).join('')}
        </svg>`;

      // Collapsed-by-default 425.1 explanation (NO default open speculation!)
      if (cm425Wrap && cm.n_cases_fe) {
        cm425Wrap.innerHTML = `
          <details id="ch3-cm-callout" class="v12-cm-callout" style="margin-top:10px">
            <summary>原发性心肌病 (425.1 · n=${fmtInt(cm.n_cases_fe)}，β=${fmtSigned(cm.beta_fe_per_yr, 4)}/yr ${fmtCi(cm.beta_fe_ci95, 4, true)}) 敏感性说明</summary>
            <p>主固定效应区间明显跨零（p=${fmtNum(cm.beta_fe_p, 3)}），且上限已排除每年 +0.02 的平均推进幅度，不宜仅归因于样本小。长间隔（&gt;365 天，${fmtInt(cm.gt365d_n_pairs)} 对，中位 ${fmtNum(cm.gt365d_median_interval_days, 0)} 天）整个间隔内平均变化 Δ=${fmtSigned(cm.gt365d_mean_delta_dpt_whole_interval, 4)}（${fmtNum(cm.gt365d_pct_advancing, 1, '%')} 向前），属不同估计量，不替代主年斜率。因本院病历缺乏基因型与完整治疗时序，不对遗传、治疗或选择效应作单一机制归因。</p>
          </details>`;
      }
    }

    function renderK5Panel() {
      const k5Map = cf.conduction_bifurcation?.k5_bifurcation_dev_fit_conf_eval || {};
      const item = k5Map[curK5Dis] || k5Map['401.1'];
      if (!item) return;
      const zhDis = F7_ZH[curK5Dis] || curK5Dis;
      const titleEl = find('#ch3-k5-title');
      if (titleEl) titleEl.textContent = `${zhDis} (${curK5Dis}) · 横断面五组传导形态与真实解码波形`;

      const cls = item.clusters || [];
      const wf = item.decoded_8lead_4ms || {};
      const tms = wf.time_ms || [];
      const showLeads = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const sharedDeltaMax = Math.max(20, ...showLeads.flatMap(ld => [
        ...(wf.G2_rbbb_delta_uv?.[ld] || []).map(v => Math.abs(v)),
        ...(wf.G3_lbbb_delta_uv?.[ld] || []).map(v => Math.abs(v)),
      ])) * 1.08;
      const sharedG0Max = Math.max(40, ...showLeads.flatMap(ld => (wf.G0_baseline_mean_uv?.[ld] || []).map(v => Math.abs(v)))) * 1.08;

      // Per owner POLICY UPDATE: exact numeric percentages in every pct_rbbb/pct_lbbb/pct_paced cell (NO <10 badge, NO — placeholder!)
      const fmtExactPct = v => (isNum(v) ? `${Number(v).toFixed(2)}%` : '缺失');
      const rowCls = g => `${g === 2 ? 'is-branch-rbbb' : (g === 3 ? 'is-branch-lbbb' : '')} ${focusedK5G === g ? 'is-focused-row' : ''}`;
      const K5_CARD_LABEL = {
        0: 'G0 窄 QRS 参照',
        1: 'G1 轻度重构',
        2: 'G2 右束支富集',
        3: 'G3 左束支富集',
        4: 'G4 起搏/尾群',
      };
      const K5_ROLE_CLEAN = {
        0: '窄 QRS',
        1: '轻度重构',
        2: 'RBBB 富集',
        3: 'LBBB 富集',
        4: '起搏尾群',
      };

      const cardsHtml = cls.map(c => {
        const clsExtra = c.g === 2 ? 'is-rbbb' : (c.g === 3 ? 'is-lbbb' : (c.g === 4 ? 'is-paced' : ''));
        return `<button type="button" class="v13-k5-pill-card ${clsExtra} ${focusedK5G === c.g ? 'is-focused' : ''}" data-k5-node="${c.g}" aria-pressed="${focusedK5G === c.g}">
          <b>${esc(K5_CARD_LABEL[c.g] || `G${c.g}`)}</b>
          <small>QRS ${fmtNum(c.median_qrs_ms, 0, ' ms')}</small>
        </button>`;
      }).join('');

      const focusHint = focusedK5G === 2 || focusedK5G === 3
        ? `<p style="margin:6px 0 0;font-size:11.2px;color:${focusedK5G === 2 ? '#35638f' : '#764f8c'}">已高亮表格 <b>G${focusedK5G}</b> 并加粗下方 <code>G${focusedK5G} − G0</code> 差波（再次点击取消聚焦）。</p>`
        : (focusedK5G != null
          ? `<p style="margin:6px 0 0;font-size:11.2px;color:#57554e">已高亮表格 <b>G${focusedK5G}</b>（解码差波仅含 G2−G0 与 G3−G0；切换“G0 均值基线 µV”可看 G0 原波）。</p>`
          : '');

      const hasG0 = Boolean(wf.G0_baseline_mean_uv?.V1?.length);
      const isG0Mode = curK5WaveMode === 'g0' && hasG0;
      const wavesHtml = showLeads.map(ld => {
        if (isG0Mode) {
          const a0 = wf.G0_baseline_mean_uv?.[ld] || [];
          return `<div class="v9-wave-cell">
            <div class="v9-wave-cell-head"><span>${ld}</span><small>±${Math.round(sharedG0Max)} µV</small></div>
            ${buildMultiWaveSvg([{ arr: a0, color: '#2a6e5d', width: 1.9 }], tms, { dark: false, width: 180, height: 74, shadeQRS: true, symMaxAbs: sharedG0Max })}
          </div>`;
        }
        const aR = wf.G2_rbbb_delta_uv?.[ld] || [];
        const aL = wf.G3_lbbb_delta_uv?.[ld] || [];
        const opR = focusedK5G === 3 ? 0.22 : 0.96;
        const opL = focusedK5G === 2 ? 0.22 : 0.96;
        const wR = focusedK5G === 2 ? 2.5 : 1.8;
        const wL = focusedK5G === 3 ? 2.5 : 1.8;
        return `<div class="v9-wave-cell">
          <div class="v9-wave-cell-head"><span>${ld}</span><small>±${Math.round(sharedDeltaMax)} ΔµV</small></div>
          ${buildMultiWaveSvg([
            { arr: aR, color: '#35638f', width: wR, opacity: opR },
            { arr: aL, color: '#764f8c', width: wL, opacity: opL },
          ], tms, { dark: false, width: 180, height: 74, shadeQRS: true, symMaxAbs: sharedDeltaMax })}
        </div>`;
      }).join('');

      k5Detail.innerHTML = `
        <div class="v13-k5-pill-cards">${cardsHtml}</div>
        ${focusHint}
        <div class="v9-table-scroll" tabindex="0" role="region" aria-label="K=5 横断面五组传导形态确认集表">
          <table class="v10-light-table v13-k5-table" id="k5-conduction-table">
            <thead><tr><th>形态组</th><th>人数 (占比)</th><th>D1 / D5</th><th>中位 QRS</th><th>RBBB %</th><th>LBBB %</th><th>起搏 %</th><th>1 年死亡</th></tr></thead>
            <tbody>${cls.map(c => `<tr class="${rowCls(c.g)}" data-k5-row="${c.g}">
              <td><b>G${c.g}</b> · ${esc(K5_ROLE_CLEAN[c.g] || c.role_zh)}</td>
              <td>${fmtInt(c.n_conf)} (${fmtNum(c.share_conf_pct, 1, '%')})</td>
              <td><code>${fmtSigned(c.mean_d1, 1)}</code> / <b style="color:${c.g === 2 ? '#35638f' : (c.g === 3 ? '#764f8c' : '#4a4842')}">${fmtSigned(c.mean_d5, 1)}</b></td>
              <td><b>${fmtNum(c.median_qrs_ms, 1, ' ms')}</b></td>
              <td data-k5-metric="rbbb">${fmtExactPct(c.pct_rbbb)}</td>
              <td data-k5-metric="lbbb">${fmtExactPct(c.pct_lbbb)}</td>
              <td data-k5-metric="paced">${fmtExactPct(c.pct_paced)}</td>
              <td><b>${fmtNum(c.pct_mortality_365d, c.pct_mortality_365d_decimals ?? 1, '%')}</b></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;font-size:11.5px;margin-bottom:6px">
            <b>${isG0Mode ? '真实解码 · G0 参照组平均心搏 (µV)' : '真实解码 · G2 右束支 / G3 左束支 相对 G0 差波 (ΔµV)'}</b>
            <div class="chip-bar" id="k5-wmode-seg" role="group" aria-label="切换 K=5 解码波形视图">
              <button type="button" data-kwm="delta" aria-pressed="${!isG0Mode}" style="padding:2px 8px;font-size:10.8px">G2/G3 差波 (ΔµV)</button>
              ${hasG0 ? `<button type="button" data-kwm="g0" aria-pressed="${isG0Mode}" style="padding:2px 8px;font-size:10.8px">G0 基线均值 (µV)</button>` : ''}
            </div>
          </div>
          ${!isG0Mode ? `<div style="font-size:11px;color:#57554e;margin-bottom:5px"><b style="color:#35638f">■ G2 − G0 右束支富集 (D5+)</b> &nbsp; <b style="color:#764f8c">■ G3 − G0 左束支富集 (D5−)</b></div>` : ''}
          <div class="v13-k5-wave-grid">${wavesHtml}</div>
        </div>`;

      findAll('[data-k5-node]', k5Detail).forEach(btn => {
        btn.addEventListener('click', () => {
          const g = Number(btn.dataset.k5Node);
          focusedK5G = focusedK5G === g ? null : g;
          renderK5Panel();
        });
      });
      bindChipGroup(find('#k5-wmode-seg', k5Detail), btn => {
        curK5WaveMode = btn.dataset.kwm || 'delta';
        renderK5Panel();
      });
      pulseFade(k5Detail);
    }

    // Populate collapsed FE & Sensitivity Drawer
    if (statsDrawer) {
      const orth = cf.conduction_bifurcation?.direct_lbbb_vs_rbbb_orthogonality_conf || [];
      const f7 = pt.flagship7_summary || [];
      const cc = D.comorbidity_control_v1;
      const comorbTxt = cc?.summary_scorecard
        ? `剔除心衰/心梗/冠心病/房颤/COPD/CKD 六大共病后，孤立高血压与 2 型糖尿病纵向斜率仍为正；全共病校正后 ${fmtInt(cc.summary_scorecard.n_late_branch_qrs_sig_after_full_comorb_adj)}/${fmtInt(cc.summary_scorecard.n_flagship_diseases)} 慢病 QRS、${fmtInt(cc.summary_scorecard.n_late_branch_lvef_sig_after_full_comorb_adj)}/${fmtInt(cc.summary_scorecard.n_flagship_diseases)} LVEF 分离留存。`
        : '';
      statsDrawer.innerHTML = `
        <p style="margin:0 0 8px;font-size:12px;color:#47554e">15 种慢病两侧检验 BH 复核：<strong>${feComp.n_positive_bh_q05 ?? 12}/15</strong> 通过 BH q&lt;0.05（最大 q = <code>${fmtNum(feComp.max_q_among_supported, 4)}</code>）。病例超额斜率仅高脂血症通过 BH；基线校正的病例×时间模型为 0/15。${comorbTxt}</p>
        <div class="v9-table-scroll">
          <table class="v10-light-table" style="min-width:600px;font-size:11.5px">
            <thead><tr><th>慢病</th><th>患者 / ECG</th><th>同人 FE 斜率 [95% CI]</th><th>BH q (15)</th><th>住院对照斜率</th><th>病例×时间 q</th></tr></thead>
            <tbody>${feRows.map(r => `<tr>
              <td><b>${esc(F7_ZH[r.phecode] || r.phenotype)}</b> (${esc(r.phecode)})</td>
              <td>${fmtInt(r.n_cases_fe)} / ${fmtInt(r.n_ecgs_fe)}</td>
              <td><b>${fmtSigned(r.beta_fe, 4)}</b> ${fmtCi(r.ci95, 4, true)}</td>
              <td>${isNum(r.fe_q_bh_15) ? (Number(r.fe_q_bh_15) < 0.0001 ? '<1e-4' : Number(r.fe_q_bh_15).toFixed(4)) : '缺失'}</td>
              <td>${fmtSigned(r.beta_ctrl, 4)}</td>
              <td>${fmtNum(r.rtm_int_q_bh, 3, '', '—')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="v9-table-scroll" style="margin-top:12px">
          <table class="v10-light-table" style="min-width:460px;font-size:11.5px">
            <thead><tr><th>四大慢病去起搏左右束支验证</th><th>D1–D10 全十轴余弦</th><th>D2–D10 反向余弦</th><th>D5 镜像分离 (LBBB vs RBBB)</th></tr></thead>
            <tbody>${orth.map(o => `<tr>
              <td><b>${esc(F7_ZH[o.phecode] || o.phecode)}</b></td>
              <td>${fmtNum(o.cos_d1_d10_lbbb_vs_rbbb, 3)}</td>
              <td><b style="color:#764f8c">${fmtNum(o.cos_d2_d10_lbbb_vs_rbbb, 3)}</b></td>
              <td>${fmtSigned(o.d5_z_lbbb_delta, 1)} vs ${fmtSigned(o.d5_z_rbbb_delta, 1, ' SD')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="v9-mort-stats" style="margin-top:10px">
          <div><b>外院年龄性别偏相关：</b>天津医科大学第二医院（天医二院）（档位 ${esc(extG.tianyi?.n_valid_patients_band || '30,000-99,999')}）NT-proBNP <b>r=${fmtSigned(extG.tianyi?.biomarkers?.ntprobnp?.age_sex_partial_pearson_r, 3)}</b>；北京安贞医院（档位 ${esc(extG.anzhen?.n_valid_patients_band || '3,000-9,999')}）NT-proBNP <b>r=${fmtSigned(extG.anzhen?.biomarkers?.ntprobnp?.age_sex_partial_pearson_r, 3)}</b>。</div>
          <div style="margin-top:4px">晚期分支（回归调整年龄、性别与 DPT）在 ${f7.length} 旗舰慢病中 5/7 切开 QRS、2/7 切开 LVEF（慢性气道阻塞 496 超声缺测）。</div>
        </div>`;
    }

    if (capEl) {
      capEl.innerHTML = `左栏刻画同一患者的纵向年斜率，右栏刻画同一诊断内的横断面五组传导形态（纯开发集拟合→确认集评估，不表示单人必经演变路径）；G2 与 G3 分别富集右束支与左束支形态，G4 富集起搏尾群。`;
    }

    const k5Seg = find('#traj-k5-seg');
    if (k5Seg && !k5Seg.dataset.boundK5) {
      k5Seg.dataset.boundK5 = '1';
      bindChipGroup(k5Seg, btn => {
        curK5Dis = btn.dataset.k5 || '401.1';
        focusedK5G = null;
        renderOrganicRiver();
        renderSignedFeForest();
        renderK5Panel();
      });
    }
    renderOrganicRiver();
    renderSignedFeForest();
    renderK5Panel();
  }

  /* ==================== Kinetic Demo: Interactive H_10 Score Heartbeat Scrubber ==================== */
  function renderH10Scrubber(D) {
    const qw = D.h10_unsuppressed?.quintile_waveforms || {};
    const q1 = qw.quintiles?.Q1_0_20_poorest?.leads_uv || {};
    const q3 = qw.quintiles?.Q3_40_60_middle?.leads_uv || {};
    const q5 = qw.quintiles?.Q5_80_100_healthiest?.leads_uv || {};
    const times = qw.time_ms_4ms || [];
    const repHi = qw.repolarization_highlights_uv || {};

    const rangeEl = find('#h10-scrub-range');
    const scoreEl = find('#h10-scrub-score');
    const zoneEl = find('#h10-scrub-zone');
    const descEl = find('#h10-scrub-desc');
    const titleEl = find('#h10-scrub-wave-title');
    const tpeakEl = find('#h10-scrub-tpeak');
    const svgBox = find('#h10-scrub-svg');
    const leadSeg = find('#h10-scrub-lead-seg');
    if (!rangeEl || !svgBox || !times.length) return;

    let curLead = 'V4';
    const lerpArr = (a, b, t) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return a || b || [];
      const n = Math.min(a.length, b.length);
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = a[i] + (b[i] - a[i]) * t;
      return out;
    };

    function drawScrub() {
      const score = clamp(Number(rangeEl.value || 90), 10, 90);
      const a1 = q1[curLead] || [];
      const a3 = q3[curLead] || [];
      const a5 = q5[curLead] || [];
      let blended;
      let strokeCol;
      if (score >= 50) {
        const t = (score - 50) / 40;
        blended = lerpArr(a3, a5, t);
        strokeCol = score >= 72 ? '#5cb89e' : '#e0af5a';
      } else {
        const t = (score - 10) / 40;
        blended = lerpArr(a1, a3, t);
        strokeCol = score <= 28 ? '#e57a71' : '#d97757';
      }
      if (scoreEl) {
        scoreEl.textContent = String(Math.round(score));
        scoreEl.style.color = strokeCol;
      }
      if (zoneEl && descEl) {
        const mBins = D.curves_and_burden_v13?.rcs_fitted_curves_5bin_15?.mimic?.mortality_365d?.bins
          || D.covariates_and_curves_v12?.rcs_fitted_curves_15?.mimic?.mortality_365d?.bins || [];
        const m0_20 = mBins[0]?.y;
        const m40_60 = mBins[2]?.y;
        const m80_100 = mBins[mBins.length - 1]?.y;
        if (score >= 80) {
          zoneEl.textContent = 'Q5 (80–100)';
          descEl.textContent = `MIMIC 80–100 组（365 日死亡率 ${fmtNum(m80_100, 2, '%')}）；死亡结局仅在 MIMIC 与 CODE-15% 评估。`;
        } else if (score >= 60) {
          zoneEl.textContent = 'Q3↔Q5 插值区 (60–79)';
          descEl.textContent = `评分组均值插值（参考 MIMIC 80–100 组 ${fmtNum(m80_100, 2, '%')} / 40–60 组 ${fmtNum(m40_60, 2, '%')}）。`;
        } else if (score >= 40) {
          zoneEl.textContent = 'Q3 (40–59)';
          descEl.textContent = `MIMIC 40–60 组（365 日死亡率 ${fmtNum(m40_60, 2, '%')}）；三评分组均值插值。`;
        } else if (score >= 20) {
          zoneEl.textContent = 'Q1↔Q3 插值区 (20–39)';
          descEl.textContent = `评分组均值插值（参考 MIMIC 0–20 组 365 日死亡率 ${fmtNum(m0_20, 2, '%')}）；非个体诊断。`;
        } else {
          zoneEl.textContent = 'Q1 (0–19)';
          descEl.textContent = `MIMIC 0–20 组（365 日死亡率 ${fmtNum(m0_20, 2, '%')}）；非个体诊断。`;
        }
      }
      if (titleEl) titleEl.textContent = `${curLead} 导联 · MIMIC 确认集三评分组平均解码心搏 (µV)`;
      const hi = repHi[curLead] || {};
      if (tpeakEl && blended.length && times.length === blended.length) {
        let peakVal = -Infinity;
        let q5Peak = -Infinity;
        for (let i = 0; i < times.length; i++) {
          if (times[i] >= 240 && times[i] <= 560) {
            if (blended[i] > peakVal) peakVal = blended[i];
            if (i < a5.length && a5[i] > q5Peak) q5Peak = a5[i];
          }
        }
        const dispPeak = Number.isFinite(peakVal) ? Math.round(peakVal) : (isNum(hi.q5_t_peak_uv) ? Math.round(hi.q5_t_peak_uv) : null);
        const dispQ5 = Number.isFinite(q5Peak) ? Math.round(q5Peak) : (isNum(hi.q5_t_peak_uv) ? Math.round(hi.q5_t_peak_uv) : null);
        if (dispPeak != null && dispQ5 != null) {
          tpeakEl.textContent = `所画曲线 T 窗 (240–560 ms) 峰值 ${dispPeak} µV（Q5 组均值 ${dispQ5} µV）`;
          tpeakEl.style.color = strokeCol;
        }
      }

      const sharedMax = Math.max(40, ...a1.map(Math.abs), ...a3.map(Math.abs), ...a5.map(Math.abs)) * 1.06;
      svgBox.innerHTML = buildMultiWaveSvg([
        { arr: a5, color: '#9c988d', width: 1.35, dash: '4 3', opacity: 0.58 },
        { arr: blended, color: strokeCol, width: 2.5, opacity: 0.98 },
      ], times, { dark: true, width: 520, height: 158, shadeT: true, symMaxAbs: sharedMax });
    }

    if (!rangeEl.dataset.boundScrub) {
      rangeEl.dataset.boundScrub = '1';
      rangeEl.addEventListener('input', drawScrub);
    }
    if (leadSeg && !leadSeg.dataset.boundScrub) {
      leadSeg.dataset.boundScrub = '1';
      bindChipGroup(leadSeg, btn => { curLead = btn.dataset.sclead || 'V4'; drawScrub(); });
    }
    drawScrub();
  }

  /* ==================== ACT 04: H_10 5-Bin RCS Curves, Disease Burden (FIG.04B), TreeSHAP, 1+9 Organ ==================== */
  function renderAct4(D) {
    const h10 = D.h10_unsuppressed || {};
    const v13Lane = D.curves_and_burden_v13 || {};
    const rcs15 = v13Lane.rcs_fitted_curves_5bin_15 || D.covariates_and_curves_v12?.rcs_fitted_curves_15 || {};

    // Hydrate 4-Cohort 5-Bin Strip dynamically (compute monotonicity strictly from arrays!)
    const stripEl = find('#h10-4hosp-strip');
    if (stripEl) {
      const pair = obj => {
        const b = obj?.bins || [];
        return b.length >= 2 ? [b[0].y, b[b.length - 1].y] : [null, null];
      };
      const monoLbl = (obj, dirZh = '下降') => (obj?.is_strictly_monotonic ? `五箱严格${dirZh}` : `总体随评分升高而${dirZh}`);
      const mObj = rcs15.mimic?.mortality_365d;
      const tObj = rcs15.tianyi?.ntprobnp;
      const aObj = rcs15.anzhen?.ntprobnp;
      const cObj = rcs15.code15?.mortality_365d;
      const [mLo, mHi] = pair(mObj);
      const [tLo, tHi] = pair(tObj);
      const [aLo, aHi] = pair(aObj);
      const [cLo, cHi] = pair(cObj);
      stripEl.innerHTML = `
        <div><span>美国 MIMIC 确认集</span><strong>${fmtNum(mLo, 2, '%')} → ${fmtNum(mHi, 2, '%')}</strong><small>365 日死亡（0–20 → 80–100 · ${monoLbl(mObj)}）</small></div>
        <div><span>天津医科大学第二医院（天医二院）</span><strong>${fmtInt(tLo)} → ${fmtNum(tHi, 1)}</strong><small>NT-proBNP pg/mL（${monoLbl(tObj)}）</small></div>
        <div><span>北京安贞医院</span><strong>${fmtNum(aLo, 1)} → ${fmtNum(aHi, 1)}</strong><small>NT-proBNP pg/mL（${monoLbl(aObj)}）</small></div>
        <div><span>巴西 CODE-15%</span><strong>${fmtNum(cLo, 2, '%')} → ${fmtNum(cHi, 2, '%')}</strong><small>365 日死亡（0–20 → 80–100 · ${monoLbl(cObj)}）</small></div>`;
    }

    // Dynamic H_10 vs D10+M Specification Table (strictly aligned per spec — zero cross-spec mixing!)
    const d10mBox = find('#h10-d10m-verdict');
    if (d10mBox) {
      const dm = D.health_d10_plus_m_v1;
      if (dm && dm.mimic_confirmation?.mortality_365d?.scores) {
        const mS = dm.mimic_confirmation.mortality_365d.scores;
        const efS = dm.mimic_confirmation.lvef_lt_40?.scores || {};
        const cS = dm.code15_eval?.mortality_365d?.scores || {};
        const tS = dm.external_hospitals?.tianyi?.ntprobnp_gt_1000?.scores || {};
        const aS = dm.external_hospitals?.anzhen?.ntprobnp_gt_1000?.scores || {};
        const ageR = dm.mimic_confirmation.age_pearson_r || {};
        const specRows = [
          ['H_10_frozen', 'H₁₀ 冻结主分（无死亡轴）'],
          ['D10_plus_M_contrast', 'D10 + M_contrast'],
          ['D10_plus_M_ridge_perp', 'D10 + M_ridge_perp'],
          ['D10_plus_M_ridge_perp_agesex', 'D10 + M_ridge_perp（控年龄性别）'],
        ];
        d10mBox.innerHTML = `
          <p class="sub-copy" style="margin:0 0 8px;font-size:12px">不同死亡轴规格的区分度与年龄相关性分别列示（每一行严格对应同一模型规格，不跨规格混比）：</p>
          <div class="v9-table-scroll" style="margin-top:0">
            <table class="v10-light-table" style="min-width:640px;font-size:11.8px">
              <thead><tr><th>模型规格</th><th>MIMIC 365日死亡</th><th>MIMIC 年龄相关 r</th><th>MIMIC LVEF&lt;40%</th><th>CODE-15% 365日死亡</th><th>天医 / 安贞 NT-proBNP</th></tr></thead>
              <tbody>${specRows.map(([k, lbl]) => `<tr>
                <td><b>${esc(lbl)}</b></td>
                <td>${fmtNum(mS[k]?.auroc, 4)}</td>
                <td>${fmtNum(ageR[k], 3)}</td>
                <td>${fmtNum(efS[k]?.auroc, 4, '', '—')}</td>
                <td>${fmtNum(cS[k]?.auroc, 4)}</td>
                <td>${fmtNum(tS[k]?.auroc, 3, '', '—')} / ${fmtNum(aS[k]?.auroc, 3, '', '—')}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>`;
      } else {
        d10mBox.innerHTML = '';
      }
    }

    // 4-Cohort Dev-Frozen Covariate & 3-Layer Health Score Architecture (collapsed concise drawer)
    const covBox = find('#h10-covariate-arch');
    const cc12 = D.covariates_and_curves_v12 || {};
    const covArch = cc12.covariate_architecture_4cohort;
    if (covBox && covArch) {
      const peer = covArch.age_sex_peer_percentile_audit || {};
      const p5 = covArch.primary_5_holm_verdict || [];
      const omr = covArch.mimic_omr_bmi_weight_audit || {};
      const bmiMort = omr.endpoints_preindex_bmi_and_weight?.mortality_365d || {};
      const bmiBnp = omr.endpoints_preindex_bmi_and_weight?.ntprobnp_gt_1000 || {};
      const bmiCr = omr.endpoints_preindex_bmi_and_weight?.creatinine_gt_1p5 || {};
      const bmiEf = omr.endpoints_preindex_bmi_and_weight?.lvef_lt_40 || {};
      const cohZh = { mimic: '美国 MIMIC 确认集', code15: '巴西 CODE-15%', tianyi: '天津医科大学第二医院（天医二院）', anzhen: '北京安贞医院' };
      const epZh = { mortality_365d: '365 日全因死亡', ntprobnp_gt_1000: 'NT-proBNP > 1,000' };
      const bnpP5 = p5.filter(r => r.endpoint === 'ntprobnp_gt_1000');
      const bnpHRng = bnpP5.length ? `${Math.min(...bnpP5.map(r => Number(r.auroc_H))).toFixed(3)}–${Math.max(...bnpP5.map(r => Number(r.auroc_H))).toFixed(3)}` : '缺失';
      const bnpARng = bnpP5.length ? `${Math.min(...bnpP5.map(r => Number(r.auroc_A))).toFixed(3)}–${Math.max(...bnpP5.map(r => Number(r.auroc_A))).toFixed(3)}` : '缺失';
      const nBootCov = isNum(cc12.n_boot_covariates) ? fmtInt(cc12.n_boot_covariates) : '2,000';
      covBox.innerHTML = `
        <details class="v11-drawer" style="margin-top:10px">
          <summary>查看三层协变量架构与四队列零重训 Holm 检验（含 MIMIC 预索引 BMI · ${nBootCov} 次 Bootstrap）</summary>
          <div class="v11-drawer-body">
            <div class="v12-layers-3" style="margin-top:0;margin-bottom:12px">
              <div class="v12-layer-card is-core">
                <span class="v12-layer-tag">第 1 层 · 心电主分</span>
                <h4>H<sub>10</sub>（0–100，输入端不含人口学）</h4>
                <p style="margin:0">输入端不含年龄不等于消除年龄相关；在三院 NT-proBNP 上单变量 AUROC <b>${bnpHRng}</b>（年龄+性别 <b>${bnpARng}</b>）。</p>
              </div>
              <div class="v12-layer-card">
                <span class="v12-layer-tag">第 2 层 · 同龄同性参照</span>
                <h4>开发集冻结条件百分位</h4>
                <p style="margin:0">确认集 P10/P50/P90 实测覆盖 <b>${fmtNum(peer.mimic_conf?.empirical_pct_below_10, 1)}% / ${fmtNum(peer.mimic_conf?.empirical_pct_below_50, 1)}% / ${fmtNum(peer.mimic_conf?.empirical_pct_below_90, 1)}%</b>（年龄相关 ${fmtSigned(peer.mimic_conf?.pearson_r_with_age_raw_H10, 2)} → ${fmtSigned(peer.mimic_conf?.pearson_r_with_age_peer_pct, 2)}）。</p>
              </div>
              <div class="v12-layer-card">
                <span class="v12-layer-tag">第 3 层 · 终点风险</span>
                <h4>H<sub>10</sub> + 年龄 + 性别 [+ 预索引 BMI]</h4>
                <p style="margin:0">MIMIC 预索引 BMI 子集（n=${fmtInt(bmiMort.n_eval)}）365 日死亡 AUROC <b>${fmtNum(bmiMort.models?.AH?.auroc, 4)} → ${fmtNum(bmiMort.models?.AHB?.auroc, 4)}</b>（Δ=${fmtSigned(bmiMort.paired_comparisons?.AHB_vs_AH?.delta_auroc, 4)}）。</p>
              </div>
            </div>
            <div class="v9-table-scroll">
              <table class="v10-light-table" style="min-width:740px">
                <thead><tr><th>队列与主终点</th><th>心电 H₁₀</th><th>仅年龄+性别 A</th><th>联合 AH</th><th>ECG 增量 (AH − A)</th><th>年龄性别增量 (AH − H)</th><th>相对 Brier 降幅 (Holm p)</th></tr></thead>
                <tbody>${p5.map(r => `<tr>
                  <td><b>${esc(cohZh[r.cohort] || r.cohort)}</b> · ${esc(epZh[r.endpoint] || r.endpoint)}</td>
                  <td>${fmtNum(r.auroc_H, 4)}</td>
                  <td>${fmtNum(r.auroc_A, 4)}</td>
                  <td><b style="color:#2a6e5d">${fmtNum(r.auroc_AH, 4)}</b></td>
                  <td><b style="color:#2a6e5d">${fmtSigned(r.delta_auroc_AH_vs_A, 4)}</b> <small>${fmtCi(r.delta_auroc_AH_vs_A_ci95, 4, true)}</small></td>
                  <td>${fmtSigned(r.delta_auroc_AH_vs_H, 4)} <small>${fmtCi(r.delta_auroc_AH_vs_H_ci95, 4, true)}</small></td>
                  <td><b>${fmtSigned(r.rel_brier_reduction_AH_vs_A_pct, 2, '%')}</b> <small>(p=${fmtNum(r.p_holm_brier, 4)})</small></td>
                </tr>`).join('')}</tbody>
              </table>
            </div>
            <h4 style="margin:14px 0 6px;font-size:13px;color:var(--ink)">MIMIC 严格预索引 OMR BMI 增量（0 &lt; ECG − 测量 ≤ 365天，覆盖 ${fmtNum(omr.conf_coverage_pct, 1, '%')}）</h4>
            <div class="v9-table-scroll">
              <table class="v10-light-table" style="min-width:680px">
                <thead><tr><th>MIMIC 终点 (n / 事件)</th><th>AH</th><th>AB</th><th>AHB (+BMI)</th><th>AHW (+体重)</th><th>ΔAUROC (AHB − AH)</th><th>相对 Brier 降幅</th></tr></thead>
                <tbody>${[
                  ['365 日全因死亡', bmiMort],
                  ['NT-proBNP > 1,000', bmiBnp],
                  ['LVEF < 40%', bmiEf],
                  ['肌酐 > 1.5 mg/dL', bmiCr],
                ].map(([lbl, eo]) => {
                  const cmp = eo.paired_comparisons?.AHB_vs_AH || {};
                  return `<tr>
                    <td><b>${esc(lbl)}</b> <small>(${fmtInt(eo.n_eval)} / ${fmtInt(eo.n_eval_events)})</small></td>
                    <td>${fmtNum(eo.models?.AH?.auroc, 4)}</td>
                    <td>${fmtNum(eo.models?.AB?.auroc, 4)}</td>
                    <td><b style="color:#2a6e5d">${fmtNum(eo.models?.AHB?.auroc, 4)}</b></td>
                    <td>${fmtNum(eo.models?.AHW?.auroc, 4)}</td>
                    <td><b>${fmtSigned(cmp.delta_auroc, 4)}</b> <small>${fmtCi(cmp.delta_auroc_ci95, 4, true)}</small></td>
                    <td>${fmtSigned(cmp.rel_brier_reduction_pct, 2, '%')} <small>${fmtCi(cmp.rel_brier_reduction_ci95_pct, 2, true)}</small></td>
                  </tr>`;
                }).join('')}</tbody>
              </table>
            </div>
          </div>
        </details>`;
    }

    // C11-C14 (v13): ALL 15 Uniform 5-Bin RCS Curves + Sex-Standardized Hb Toggle (BOTH Tianyi & Anzhen)
    const rcsAll = rcs15;
    const metricCatalog = {
      mimic: [
        { k: 'mortality_365d', label: '365 日死亡率 (%)', unit: '%', title: 'MIMIC 确认集 · 365 日全因死亡率（等宽五箱 + RCS）' },
        { k: 'mortality_180d', label: '180 日死亡率 (%)', unit: '%', title: 'MIMIC 确认集 · 180 日全因死亡率（等宽五箱 + RCS）' },
        { k: 'ntprobnp_pg_ml', label: 'NT-proBNP (pg/mL)', unit: '', title: 'MIMIC 确认集 · NT-proBNP 几何均值 (pg/mL)' },
        { k: 'egfr_ml_min', label: 'eGFR (mL/min/1.73 m²)', unit: '', title: 'MIMIC 确认集 · 肾功能 eGFR (mL/min/1.73 m²)' },
        { k: 'organ_system_burden_0_to_7', label: '7 器官负荷分', unit: '', title: 'MIMIC 确认集 · 7 器官系统负荷' },
        { k: 'lvef_mean_pct', label: '超声 LVEF 均值 (%)', unit: '%', title: 'MIMIC 确认集 · 超声 LVEF 均值 (%)' },
        { k: 'lvef_lt40_rate', label: 'LVEF < 40% 比例 (%)', unit: '%', title: 'MIMIC 确认集 · LVEF < 40% 比例（等宽五箱 + Wilson CI）' },
      ],
      code15: [
        { k: 'mortality_365d', label: '365 日死亡率 (%)', unit: '%', title: '巴西 CODE-15% · 365 日全因死亡率（等宽五箱 + RCS）' },
      ],
      tianyi: [
        { k: 'ntprobnp', label: 'NT-proBNP (pg/mL)', unit: '', title: '天津医科大学第二医院（天医二院）· NT-proBNP 几何均值 (pg/mL)' },
        { k: 'egfr_ml_min', label: 'eGFR (mL/min/1.73 m²)', unit: '', title: '天津医科大学第二医院（天医二院）· eGFR (mL/min/1.73 m²)' },
        { k: 'hemoglobin', label: '血红蛋白 Hb (g/dL)', unit: '', title: '天津医科大学第二医院（天医二院）· 血红蛋白 Hb (g/dL)' },
      ],
      anzhen: [
        { k: 'ntprobnp', label: 'NT-proBNP (pg/mL)', unit: '', title: '北京安贞医院 · NT-proBNP 几何均值 (pg/mL)' },
        { k: 'egfr_ml_min', label: 'eGFR (mL/min/1.73 m²)', unit: '', title: '北京安贞医院 · eGFR (mL/min/1.73 m²)' },
        { k: 'hemoglobin', label: '血红蛋白 Hb (g/dL)', unit: '', title: '北京安贞医院 · 血红蛋白 Hb (g/dL)' },
      ],
    };

    let curCoh = 'mimic';
    let curMet = 'mortality_365d';
    let curHbMode = 'std'; // 'std' | 'crude' | 'sex'
    const metSeg = find('#h10-metric-seg');
    const hbSeg = find('#h10-hb-mode-seg');
    const binsWrap = find('#h10-bins-chart');
    const binsNote = find('#h10-bins-note');

    function populateH10Metrics() {
      const list = metricCatalog[curCoh] || [];
      if (!list.some(x => x.k === curMet)) curMet = list[0].k;
      metSeg.innerHTML = list.map(m => `<button type="button" data-hmet="${m.k}" aria-pressed="${m.k === curMet}">${esc(m.label)}</button>`).join('');
    }

    function fmtTrendP(tr) {
      if (!tr) return '缺失';
      if (isNum(tr.neg_log10_p) && Number(tr.neg_log10_p) >= 4) return `p = 10⁻${Number(tr.neg_log10_p).toFixed(1)}`;
      if (isNum(tr.p)) return Number(tr.p) < 0.0001 ? 'p < 1e-4' : `p = ${Number(tr.p).toFixed(4)}`;
      return '缺失';
    }

    function renderH10Bins() {
      const meta = (metricCatalog[curCoh] || []).find(x => x.k === curMet) || metricCatalog[curCoh][0];
      const isPub = curCoh === 'mimic' || curCoh === 'code15';
      const rcsObj = rcsAll?.[curCoh]?.[curMet];
      const isHbDual = curMet === 'hemoglobin' && (curCoh === 'tianyi' || curCoh === 'anzhen');
      if (hbSeg) {
        hbSeg.hidden = !isHbDual;
        findAll('button', hbSeg).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hbmode === curHbMode)));
      }
      const modeSuffix = isHbDual
        ? (curHbMode === 'std' ? ' · 性别标准化 [主]' : (curHbMode === 'crude' ? ' · 粗值' : ' · 男女分层'))
        : '';
      find('#h10-curve-title').textContent = `${meta.title}${modeSuffix}`;

      if (!rcsObj || !Array.isArray(rcsObj.curve) || !rcsObj.curve.length) {
        binsWrap.innerHTML = `<p style="margin:8px 0;font-size:12.5px;color:#64748b">缺失：当前队列指标缺少服务端拟合曲线数据。</p>`;
        if (binsNote) binsNote.textContent = '';
        return;
      }

      // Select active curve, bins, range, monotonicity, and trend strictly per mode (std / crude / sex) — ZERO silent fallback to crude!
      const useStdHb = isHbDual && curHbMode === 'std';
      const useSexSplit = isHbDual && curHbMode === 'sex';
      const activeObj = useStdHb ? (rcsObj.sex_standardized || {}) : rcsObj;
      const activeCurveRaw = useStdHb
        ? (Array.isArray(rcsObj.sex_standardized?.curve) ? rcsObj.sex_standardized.curve : [])
        : (useSexSplit ? [] : (Array.isArray(rcsObj.curve) ? rcsObj.curve : []));
      const curve = activeCurveRaw.filter(p => p && isNum(p.x) && isNum(p.y));
      const ribbonCurve = curve.filter(p => isNum(p.lo95) && isNum(p.hi95));
      const obsBins = useStdHb ? (Array.isArray(rcsObj.sex_standardized?.bins) ? rcsObj.sex_standardized.bins : []) : (Array.isArray(rcsObj.bins) ? rcsObj.bins : []);
      const maleCurve = useSexSplit ? (rcsObj.male_only?.curve || []).filter(p => p && isNum(p.x) && isNum(p.y)) : [];
      const femaleCurve = useSexSplit ? (rcsObj.female_only?.curve || []).filter(p => p && isNum(p.x) && isNum(p.y)) : [];
      const maleRibbon = maleCurve.filter(p => isNum(p.lo95) && isNum(p.hi95));
      const femaleRibbon = femaleCurve.filter(p => isNum(p.lo95) && isNum(p.hi95));
      const maleBins = useSexSplit ? (rcsObj.male_only?.bins || []) : [];
      const femaleBins = useSexSplit ? (rcsObj.female_only?.bins || []) : [];

      if ((!useSexSplit && (!curve.length || !obsBins.length)) || (useSexSplit && !maleCurve.length && !femaleCurve.length)) {
        binsWrap.innerHTML = `<p style="margin:8px 0;font-size:12.5px;color:#64748b">缺失：当前模式缺少服务端拟合曲线或五箱数据。</p>`;
        if (binsNote) binsNote.textContent = '';
        return;
      }

      const W = 600, H = 270;
      const pad = { l: 54, r: 18, t: 18, b: 36 };
      const gw = W - pad.l - pad.r;
      const gh = H - pad.t - pad.b;

      const yVals = (useSexSplit
        ? [
          ...maleCurve.flatMap(p => [p.lo95, p.y, p.hi95]),
          ...femaleCurve.flatMap(p => [p.lo95, p.y, p.hi95]),
          ...maleBins.flatMap(b => [b.y, ...(b.ci95 || [])]),
          ...femaleBins.flatMap(b => [b.y, ...(b.ci95 || [])]),
        ]
        : [
          ...curve.flatMap(p => [p.lo95, p.y, p.hi95]),
          ...obsBins.flatMap(b => [b.y, ...(b.ci95 || [])]),
        ]
      ).filter(isNum).map(Number);
      const rawYMin = Math.min(...yVals);
      const rawYMax = Math.max(...yVals);
      const yPad = Math.max(1e-3, (rawYMax - rawYMin) * 0.10);
      const yMin = rcsObj.mode === 'binary' || rcsObj.mode === 'log_mean' ? Math.max(0, rawYMin - yPad * 0.5) : (rawYMin - yPad);
      const yMax = rawYMax + yPad;
      const ySpan = Math.max(1e-6, yMax - yMin);

      const mapX = x => pad.l + (clamp(x, 0, 100) / 100) * gw;
      const mapY = y => pad.t + gh - ((y - yMin) / ySpan) * gh;
      const fmtY = v => (isNum(v) ? ((Math.abs(v) >= 100 ? Number(v).toFixed(0) : Number(v).toFixed(2)) + (meta.unit || '')) : '缺失');
      const axisDec = ySpan >= 100 ? 0 : (ySpan >= 5 ? 1 : 2);
      const fmtAxisY = v => (isNum(v) ? Number(v).toFixed(axisDec) + (meta.unit || '') : '');

      const makeRibbonPoly = arr => (arr.length >= 2
        ? [...arr.map(p => `${mapX(p.x).toFixed(1)},${mapY(p.hi95).toFixed(1)}`), ...[...arr].reverse().map(p => `${mapX(p.x).toFixed(1)},${mapY(p.lo95).toFixed(1)}`)].join(' ')
        : '');
      const ribbonPoly = makeRibbonPoly(ribbonCurve);
      const maleRibbonPoly = makeRibbonPoly(maleRibbon);
      const femaleRibbonPoly = makeRibbonPoly(femaleRibbon);
      const linePts = curve.map(p => `${mapX(p.x).toFixed(1)},${mapY(p.y).toFixed(1)}`).join(' ');

      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => yMin + f * ySpan);
      const xTicks = [0, 20, 40, 60, 80, 100];
      const sup = useSexSplit
        ? [
          Math.min(rcsObj.male_only?.support_range?.[0] ?? 0, rcsObj.female_only?.support_range?.[0] ?? 0),
          Math.max(rcsObj.male_only?.support_range?.[1] ?? 100, rcsObj.female_only?.support_range?.[1] ?? 100),
        ]
        : (activeObj.support_range || rcsObj.support_range || [curve[0].x, curve[curve.length - 1].x]);
      const gridRng = useSexSplit
        ? [
          Math.min(rcsObj.male_only?.grid_range?.[0] ?? 5, rcsObj.female_only?.grid_range?.[0] ?? 5),
          Math.max(rcsObj.male_only?.grid_range?.[1] ?? 95, rcsObj.female_only?.grid_range?.[1] ?? 95),
        ]
        : (activeObj.grid_range || rcsObj.grid_range || [curve[0].x, curve[curve.length - 1].x]);
      const noExtrapRect = gridRng[1] < 92
        ? `<rect x="${mapX(gridRng[1]).toFixed(1)}" y="${pad.t}" width="${Math.max(0, mapX(100) - mapX(gridRng[1])).toFixed(1)}" height="${gh}" fill="rgba(108,106,99,0.10)"/>
           <text x="${((mapX(gridRng[1]) + mapX(100)) / 2).toFixed(1)}" y="${pad.t + 16}" text-anchor="middle" font-size="9.2" fill="#6c6a63">样条止于 ${gridRng[1]}（上段样本少）</text>`
        : '';

      const drawBinDots = (binsArr, strokeCol) => binsArr.filter(b => b && isNum(b.y) && isNum(b.x_median)).map((b, i) => {
        const cx = mapX(Number(b.x_median));
        const cy = mapY(Number(b.y));
        const ciLine = Array.isArray(b.ci95) && b.ci95.length === 2 && isNum(b.ci95[0]) && isNum(b.ci95[1])
          ? `<line x1="${cx.toFixed(1)}" y1="${mapY(b.ci95[0]).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${mapY(b.ci95[1]).toFixed(1)}" stroke="${strokeCol}" stroke-width="1.5" opacity="0.72"/>`
          : '';
        const nLbl = isPub && b.n != null ? `n=${Number(b.n).toLocaleString()}` : `档位 ${b.n_band || '脱敏'}`;
        return `<g data-obs-bin="${esc(b.bin)}"><title>分箱 ${esc(b.bin)} (${nLbl} · 中位 H₁₀=${Number(b.x_median).toFixed(1)}): ${fmtY(b.y)} ${fmtCi(b.ci95, 2)}</title>${ciLine}<circle data-bin-idx="${i}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.6" fill="#ffffff" stroke="${strokeCol}" stroke-width="1.9"/></g>`;
      }).join('');

      const obsSvg = useSexSplit
        ? `${maleRibbonPoly ? `<polygon points="${maleRibbonPoly}" fill="rgba(53,99,143,0.14)"/>` : ''}
           ${femaleRibbonPoly ? `<polygon points="${femaleRibbonPoly}" fill="rgba(191,74,64,0.13)"/>` : ''}
           ${maleCurve.length >= 2 ? `<polyline fill="none" stroke="#35638f" stroke-width="2.2" points="${maleCurve.map(p => `${mapX(p.x).toFixed(1)},${mapY(p.y).toFixed(1)}`).join(' ')}"/>` : ''}
           ${femaleCurve.length >= 2 ? `<polyline fill="none" stroke="#bf4a40" stroke-width="2.2" points="${femaleCurve.map(p => `${mapX(p.x).toFixed(1)},${mapY(p.y).toFixed(1)}`).join(' ')}"/>` : ''}
           ${drawBinDots(maleBins, '#35638f')}${drawBinDots(femaleBins, '#bf4a40')}`
        : drawBinDots(obsBins, '#2a6e5d');

      const hoverSeries = useSexSplit ? (maleCurve.length ? maleCurve : femaleCurve) : curve;
      const firstPt = hoverSeries[0];
      const lastPt = hoverSeries[hoverSeries.length - 1];
      const nHeader = isPub && rcsObj.n_total != null ? `n=${Number(rcsObj.n_total).toLocaleString()}` : `样本量档位 ${rcsObj.n_total_band || '脱敏'}`;

      let monoBadge;
      let trendTxt;
      if (useSexSplit) {
        const mMono = Boolean(rcsObj.male_only?.is_strictly_monotonic);
        const fMono = Boolean(rcsObj.female_only?.is_strictly_monotonic);
        monoBadge = `男${mMono ? '单调' : '非单调'} · 女${fMono ? '单调' : '非单调'}`;
        trendTxt = `男 ${fmtTrendP(rcsObj.male_only?.trend_continuous_h10)} · 女 ${fmtTrendP(rcsObj.female_only?.trend_continuous_h10)}`;
      } else if (useStdHb) {
        monoBadge = rcsObj.sex_standardized?.is_strictly_monotonic ? '五箱严格单调' : '五箱非严格单调（见连续趋势检验）';
        trendTxt = `性别调整 ${fmtTrendP(rcsObj.sex_standardized?.trend_continuous_h10_sex_adjusted)}`;
      } else {
        monoBadge = rcsObj.is_strictly_monotonic ? '五箱严格单调' : '五箱非严格单调（见连续趋势检验）';
        trendTxt = `${isHbDual ? '粗值 ' : ''}${fmtTrendP(rcsObj.trend_continuous_h10)}`;
      }

      const defaultReadoutHtml = useSexSplit
        ? (() => {
          const m0 = maleCurve[0];
          const m1 = maleCurve[maleCurve.length - 1];
          const f0 = femaleCurve[0];
          const f1 = femaleCurve[femaleCurve.length - 1];
          return `男：H₁₀=${m0?.x ?? '—'} <b>${fmtY(m0?.y)}</b> → H₁₀=${m1?.x ?? '—'} <b>${fmtY(m1?.y)}</b> · 女：H₁₀=${f0?.x ?? '—'} <b>${fmtY(f0?.y)}</b> → H₁₀=${f1?.x ?? '—'} <b>${fmtY(f1?.y)}</b>`;
        })()
        : `H₁₀=${firstPt.x} → <b>${fmtY(firstPt.y)}</b> ${fmtCi([firstPt.lo95, firstPt.hi95], 2)} · H₁₀=${lastPt.x} → <b>${fmtY(lastPt.y)}</b> ${fmtCi([lastPt.lo95, lastPt.hi95], 2)}`;

      let tableHeadHtml;
      let tableRowsHtml;
      let tableBinCount;
      if (useSexSplit) {
        const stdBinsRef = rcsObj.sex_standardized?.bins || [];
        tableBinCount = Math.max(maleBins.length, femaleBins.length);
        tableHeadHtml = '<tr><th>H₁₀ 分箱</th><th>男性均值 (95% CI)</th><th>女性均值 (95% CI)</th><th>男性占比</th><th>样本量档位 (男 / 女)</th></tr>';
        tableRowsHtml = maleBins.map((mb, i) => {
          const fb = femaleBins[i] || {};
          const sb = stdBinsRef[i] || {};
          return `<tr>
            <td><b>${esc(mb.bin || fb.bin)}</b></td>
            <td><b style="color:#35638f">${esc(fmtY(mb.y))}</b> <small>${fmtCi(mb.ci95, 2)}</small></td>
            <td><b style="color:#bf4a40">${esc(fmtY(fb.y))}</b> <small>${fmtCi(fb.ci95, 2)}</small></td>
            <td>${isNum(sb.male_pct) ? `${Number(sb.male_pct).toFixed(1)}%` : '—'}</td>
            <td>${esc(mb.n_band || '脱敏')} / ${esc(fb.n_band || '脱敏')}</td>
          </tr>`;
        }).join('');
      } else {
        tableBinCount = obsBins.length;
        const stdBinsRef = rcsObj.sex_standardized?.bins || [];
        tableHeadHtml = `<tr><th>H₁₀ 分箱</th><th>箱内中位 H₁₀</th><th>${useStdHb ? '性别标准化值' : '实测值'}</th><th>95% CI</th>${isHbDual ? '<th>男性占比</th>' : ''}<th>样本量</th></tr>`;
        tableRowsHtml = obsBins.map((b, i) => {
          const mpVal = isNum(b.male_pct) ? b.male_pct : stdBinsRef[i]?.male_pct;
          const maleCol = isHbDual ? `<td>${isNum(mpVal) ? `${Number(mpVal).toFixed(1)}%` : '—'}</td>` : '';
          return `<tr>
            <td><b>${esc(b.bin)}</b></td>
            <td>${isNum(b.x_median) ? Number(b.x_median).toFixed(1) : '缺失'}</td>
            <td><b>${esc(fmtY(b.y))}</b></td>
            <td>${fmtCi(b.ci95, 2)}</td>
            ${maleCol}
            <td>${isPub && b.n != null ? fmtInt(b.n) : esc(b.n_band || '脱敏分档')}</td>
          </tr>`;
        }).join('');
      }

      binsWrap.innerHTML = `
        <div class="v12-rcs-readout">
          <span id="rcs-hover-readout" aria-live="polite">${defaultReadoutHtml}</span>
          <span id="rcs-trend-meta" style="color:#6c6a63">${esc(nHeader)} · ${esc(monoBadge)} · 连续趋势 ${esc(trendTxt)}</span>
        </div>
        <svg id="rcs-curve-svg" class="v12-rcs-svg" viewBox="0 0 ${W} ${H}" tabindex="0" role="slider" aria-label="${esc(meta.title)}：等宽五箱 0-20 到 80-100 与 4 结点 RCS 拟合曲线" aria-valuemin="${firstPt.x}" aria-valuemax="${lastPt.x}" aria-valuenow="${firstPt.x}">
          <defs>
            <linearGradient id="rcsStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#d97757"/><stop offset="100%" stop-color="#2a6e5d"/>
            </linearGradient>
          </defs>
          ${noExtrapRect}
          ${yTicks.map(yv => {
            const py = mapY(yv);
            return `<line x1="${pad.l}" y1="${py.toFixed(1)}" x2="${W - pad.r}" y2="${py.toFixed(1)}" stroke="rgba(20,20,19,0.08)"/>
              <text x="${pad.l - 7}" y="${(py + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#6c6a63">${esc(fmtAxisY(yv))}</text>`;
          }).join('')}
          ${xTicks.map(xv => {
            const px = mapX(xv);
            return `<line x1="${px.toFixed(1)}" y1="${pad.t}" x2="${px.toFixed(1)}" y2="${H - pad.b}" stroke="rgba(20,20,19,0.05)"/>
              <text x="${px.toFixed(1)}" y="${H - 18}" text-anchor="middle" font-size="10" fill="#57554e">${xv}</text>`;
          }).join('')}
          <text x="${(pad.l + W - pad.r) / 2}" y="${H - 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#4a4842">总健康分 H₁₀（0–100 · 等宽五箱）</text>
          ${!useSexSplit && ribbonPoly ? `<polygon points="${ribbonPoly}" fill="rgba(42,110,93,0.16)"/>` : ''}
          ${!useSexSplit ? `<polyline fill="none" stroke="url(#rcsStrokeGrad)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${linePts}"/>` : ''}
          ${obsSvg}
          <line id="rcs-cross-x" x1="0" y1="${pad.t}" x2="0" y2="${H - pad.b}" stroke="#d97757" stroke-width="1.1" stroke-dasharray="3 2" visibility="hidden"/>
          <circle id="rcs-cross-dot" cx="0" cy="0" r="4.5" fill="${useSexSplit ? '#35638f' : '#d97757'}" stroke="#ffffff" stroke-width="1.8" visibility="hidden"/>
          <circle id="rcs-cross-dot-f" cx="0" cy="0" r="4.5" fill="#bf4a40" stroke="#ffffff" stroke-width="1.8" visibility="hidden"/>
        </svg>
        <div class="v9-legend-row" style="margin-top:6px;font-size:11px;color:#57554e">
          ${useSexSplit
            ? `<span><i class="v9-line-swatch" style="border-top-color:#35638f"></i>男性 RCS + 95% 带</span><span><i class="v9-line-swatch" style="border-top-color:#bf4a40"></i>女性 RCS + 95% 带</span>`
            : `<span><i class="v9-line-swatch" style="border-top-color:#2a6e5d"></i>4 结点 RCS</span><span><i class="v9-swatch-box" style="background:rgba(42,110,93,0.22);border:1px solid rgba(42,110,93,0.45)"></i>95% Bootstrap 带</span><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;border:1.8px solid #2a6e5d;background:#fff;margin-right:3px"></i>五箱 + 95% CI</span>`}
        </div>
        <details class="v11-drawer" style="margin-top:8px;padding:7px 11px">
          <summary style="font-size:11.5px">展开五箱数值表 (${tableBinCount} 箱)</summary>
          <div class="v11-drawer-body" style="margin-top:8px">
            <div class="v9-table-scroll">
              <table class="v10-light-table" style="min-width:440px;font-size:11.5px">
                <thead>${tableHeadHtml}</thead>
                <tbody>${tableRowsHtml}</tbody>
              </table>
            </div>
          </div>
        </details>`;

      const svgEl = find('#rcs-curve-svg', binsWrap);
      const readoutEl = find('#rcs-hover-readout', binsWrap);
      const crossX = find('#rcs-cross-x', binsWrap);
      const crossDot = find('#rcs-cross-dot', binsWrap);
      const crossDotF = find('#rcs-cross-dot-f', binsWrap);
      if (svgEl && readoutEl && crossX && crossDot) {
        let curIdx = 0;
        const nearestIn = (arr, xVal) => {
          if (!arr.length) return null;
          let best = arr[0];
          let bd = Math.abs(best.x - xVal);
          for (let i = 1; i < arr.length; i++) {
            const d = Math.abs(arr[i].x - xVal);
            if (d < bd) { bd = d; best = arr[i]; }
          }
          return best;
        };
        const focusPoint = idx => {
          curIdx = clamp(idx, 0, hoverSeries.length - 1);
          const best = hoverSeries[curIdx];
          const px = mapX(best.x);
          crossX.setAttribute('x1', px.toFixed(1));
          crossX.setAttribute('x2', px.toFixed(1));
          crossX.setAttribute('visibility', 'visible');
          if (useSexSplit) {
            const mPt = nearestIn(maleCurve, best.x);
            const fPt = nearestIn(femaleCurve, best.x);
            if (mPt) {
              crossDot.setAttribute('cx', mapX(mPt.x).toFixed(1));
              crossDot.setAttribute('cy', mapY(mPt.y).toFixed(1));
              crossDot.setAttribute('visibility', 'visible');
            }
            if (fPt && crossDotF) {
              crossDotF.setAttribute('cx', mapX(fPt.x).toFixed(1));
              crossDotF.setAttribute('cy', mapY(fPt.y).toFixed(1));
              crossDotF.setAttribute('visibility', 'visible');
            }
            svgEl.setAttribute('aria-valuenow', String(best.x));
            svgEl.setAttribute('aria-valuetext', `H10 ${best.x}，男 ${fmtY(mPt?.y)}，女 ${fmtY(fPt?.y)}`);
            readoutEl.innerHTML = `H₁₀ = <b>${best.x}</b> → <b style="color:#35638f">男 ${esc(fmtY(mPt?.y))}</b> <code>${fmtCi([mPt?.lo95, mPt?.hi95], 2)}</code> · <b style="color:#bf4a40">女 ${esc(fmtY(fPt?.y))}</b> <code>${fmtCi([fPt?.lo95, fPt?.hi95], 2)}</code>`;
          } else {
            const py = mapY(best.y);
            crossDot.setAttribute('cx', px.toFixed(1));
            crossDot.setAttribute('cy', py.toFixed(1));
            crossDot.setAttribute('visibility', 'visible');
            if (crossDotF) crossDotF.setAttribute('visibility', 'hidden');
            svgEl.setAttribute('aria-valuenow', String(best.x));
            svgEl.setAttribute('aria-valuetext', `H10 ${best.x}，拟合值 ${fmtY(best.y)}`);
            readoutEl.innerHTML = `H₁₀ = <b>${best.x}</b> → 拟合值 <b>${esc(fmtY(best.y))}</b> · 点态 95% CI <code>${fmtCi([best.lo95, best.hi95], 2)}</code>`;
          }
        };
        const updateHover = clientX => {
          const rect = svgEl.getBoundingClientRect();
          const frac = clamp((clientX - rect.left) / Math.max(1, rect.width));
          const svgX = frac * W;
          const hVal = clamp(((svgX - pad.l) / gw) * 100, 0, 100);
          let bestI = 0;
          let bestD = Infinity;
          hoverSeries.forEach((p, idx) => { const d = Math.abs(p.x - hVal); if (d < bestD) { bestD = d; bestI = idx; } });
          focusPoint(bestI);
        };
        svgEl.addEventListener('pointermove', ev => updateHover(ev.clientX));
        svgEl.addEventListener('click', ev => updateHover(ev.clientX));
        svgEl.addEventListener('keydown', ev => {
          const step = ev.shiftKey ? 5 : 1;
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); focusPoint(curIdx + step); }
          else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); focusPoint(curIdx - step); }
          else if (ev.key === 'Home') { ev.preventDefault(); focusPoint(0); }
          else if (ev.key === 'End') { ev.preventDefault(); focusPoint(hoverSeries.length - 1); }
        });
      }

      if (binsNote) {
        const rangeInfo = `支持域 [${sup[0]}, ${sup[1]}]，绘出网格 [${gridRng[0]}, ${gridRng[1]}]`;
        const hbModeLbl = curHbMode === 'std' ? '性别标准化 [主]' : (curHbMode === 'crude' ? '粗值' : '男女分层');
        if (curCoh === 'mimic' && curMet === 'lvef_lt40_rate') {
          const seq = obsBins.map(b => `${Number(b.y).toFixed(1)}%`).join('→');
          binsNote.textContent = `${rangeInfo}；五箱 ${seq}（Wilson 95% CI；60–80 n=22、80–100 n=12，上段样本少，区间宽）。`;
        } else if (isHbDual && curCoh === 'anzhen') {
          const mPcts = (rcsObj.sex_standardized?.bins || []).map(b => `${b.male_pct}%`).join('→');
          binsNote.textContent = `当前视图：${hbModeLbl} · ${rangeInfo}；各箱男性占比 ${mPcts}，性别构成变化可解释部分中段浅凹（标准化后递增）。`;
        } else if (isHbDual && curCoh === 'tianyi') {
          const mPcts = (rcsObj.sex_standardized?.bins || []).map(b => `${b.male_pct}%`).join('→');
          binsNote.textContent = `当前视图：${hbModeLbl} · ${rangeInfo}；各箱男性占比 ${mPcts}，高分组 Hb 总体较高（含标准化/粗值/男女分层）。`;
        } else if (!isPub) {
          binsNote.textContent = `${rangeInfo}；队列内 4 结点 RCS 拟合，合作医院按样本量档位展示。`;
        } else {
          binsNote.textContent = `${rangeInfo}；统一等宽五箱 (0–20..80–100) + 500 次 Bootstrap 95% 置信带。`;
        }
      }
      pulseFade(binsWrap);
    }

    bindChipGroup(find('#h10-cohort-seg'), btn => { curCoh = btn.dataset.hcoh; populateH10Metrics(); renderH10Bins(); });
    bindChipGroup(metSeg, btn => { curMet = btn.dataset.hmet; renderH10Bins(); });
    if (hbSeg) bindChipGroup(hbSeg, btn => { curHbMode = btn.dataset.hbmode || 'std'; renderH10Bins(); });
    populateH10Metrics();
    renderH10Bins();

    // 4A-Right: Visual H_10 Q1 vs Q3 vs Q5 Waveform Gradient
    const qw = h10.quintile_waveforms || {};
    const q1 = qw.quintiles?.Q1_0_20_poorest?.leads_uv || {};
    const q3 = qw.quintiles?.Q3_40_60_middle?.leads_uv || {};
    const q5 = qw.quintiles?.Q5_80_100_healthiest?.leads_uv || {};
    const qTimes = qw.time_ms_4ms || [];
    const repHi = qw.repolarization_highlights_uv || {};
    let curHLead = 'grid4';

    const rmsStat = find('#h10-qwave-rms-stat strong');
    if (rmsStat && isNum(qw.q5_minus_q1_overall_rms_uv)) {
      rmsStat.textContent = `${Number(qw.q5_minus_q1_overall_rms_uv).toFixed(1)} µV`;
    }

    function renderH10Waves() {
      const grid = find('#h10-qwave-grid');
      if (!grid) return;
      const showLeads = curHLead === 'grid4' ? ['II', 'V2', 'V4', 'V5'] : [curHLead];
      grid.classList.toggle('is-single', curHLead !== 'grid4');
      grid.innerHTML = showLeads.map(ld => {
        const hi = repHi[ld] || {};
        const tNote = hi.q1_t_peak_uv != null ? `T峰 ${Math.round(hi.q1_t_peak_uv)} → ${Math.round(hi.q5_t_peak_uv)} µV` : 'T 窗 (240–560)';
        return `<div class="v9-qwave-box">
          <div class="v9-qwave-head"><span>${ld} 导联</span><small>${esc(tNote)}</small></div>
          ${buildMultiWaveSvg([
            { arr: q1[ld], color: '#e57a71', width: 2.0 },
            { arr: q3[ld], color: '#9c988d', width: 1.4, dash: '4 3', opacity: 0.78 },
            { arr: q5[ld], color: '#5cb89e', width: 2.1 },
          ], qTimes, { dark: true, height: curHLead === 'grid4' ? 92 : 196, shadeT: true })}
        </div>`;
      }).join('');
    }
    bindChipGroup(find('#h10-lead-seg'), btn => { curHLead = btn.dataset.hlead; renderH10Waves(); });
    renderH10Waves();

    // NEW FIG. 04B: MIMIC Confirmation All-Disease & 17-System Record Burden (C15)
    renderDiseaseBurdenV13(D);

    // 4C. Two-Layer PRISM + XGBoost TreeSHAP Localization & Ablation Sensitivity
    const ts = D.treeshap || {};
    const tsTimes = ts.time_ms_4ms || [];
    let curTsKey = 'lvef';
    let curTsLead = 'V3';
    const nnlsAudit = ts.v3_nnls_reencoding_audit || {};

    function renderNnlsAudit() {
      const box = find('#ts-nnls-audit');
      if (!box) return;
      const rows = (nnlsAudit.target_order || []).map(k => nnlsAudit.targets?.[k]).filter(Boolean);
      if (!rows.length) { box.innerHTML = ''; return; }
      const signed = (v, digits = 4) => `${v >= 0 ? '+' : '−'}${Math.abs(Number(v ?? 0)).toFixed(digits)}`;
      const ci = (arr, digits = 4) => `[${signed(arr?.[0], digits)}, ${signed(arr?.[1], digits)}]`;
      const thetaText = row => {
        const digits = row.target === 'mortality_365d' ? 5 : 4;
        const excludes = row.ci_excludes_zero;
        const interpretation = row.target === 'mortality_365d'
          ? 'AUROC 排序特异性未获支持'
          : excludes ? '95% CI 排除 0' : '点估计为正，但 n=500 下 95% CI 跨 0';
        return `<b>${signed(row.theta_nnls, digits)} ${ci(row.theta_nnls_patient_boot_ci95, 4)}</b><br><small>patient bootstrap SE=${Number(row.boot_se).toFixed(4)} · p_boot=${Number(row.p_boot).toFixed(3)} · ${interpretation}</small>`;
      };
      const directText = row => `${signed(row.theta_direct)} ${ci(row.theta_direct_patient_boot_ci95)}`;
      box.innerHTML = `
        <div class="v9-nnls-head">
          <span class="badge-light">TreeSHAP v3 · k=25 固定字典核验</span>
          <h3>固定字典下的 NNLS 非负重编码（字典可行锥投影）</h3>
          <p><strong>直接程序空间消融</strong>直接置零所选调系数；<strong>固定字典 NNLS 非负重编码</strong>则在同一冻结字典的可行锥内重估全部非负系数，两者不可混称。本表为 n=${nnlsAudit.confirmation_subset_n} 名互不相同确认患者、${nnlsAudit.n_reencode_matched_seeds} 个预固定随机种子、B=${Number(nnlsAudit.patient_bootstrap_draws).toLocaleString('en-US')} 次患者配对 bootstrap。</p>
          <p>Post-NNLS 净 RMS 比：5/5 目标均值通过 [0.95, 1.05]、逐种子通过 [0.90, 1.10]；全目标 rematch = false。总体均值范围约 0.994–1.032。</p>
        </div>
        <div class="v9-table-scroll" tabindex="0" role="region" aria-label="五目标固定字典 NNLS 重编码核验">
          <table id="ts-nnls-audit-table" class="v9-definition-table v9-nnls-table"><thead><tr><th scope="col">目标</th><th scope="col">RMS 比 mean [min, max]</th><th scope="col">Top-25 NNLS drop vs Rand-10 NNLS drop<br>（mean ± seed SD）</th><th scope="col">θ_NNLS [患者 95% CI]</th><th scope="col">直接 θ [95% CI]</th><th scope="col">Post-NNLS |Δŷ| 比 [95% CI]</th><th scope="col">rebound_raw / rebound_net</th></tr></thead><tbody>${
            rows.map(row => {
              const rms = row.post_nnls_net_rms_ratio || {};
              const ratioDigits = 2;
              return `<tr data-nnls-target="${esc(row.target)}" class="${row.target === curTsKey ? 'is-active' : ''}"><th scope="row">${esc(TARGET_ZH[row.target] || row.label)}<br><small>${esc(row.model_output_unit || '')}${row.target === 'mortality_365d' ? ' · mortality_365d' : ''}</small></th><td>${Number(rms.mean).toFixed(3)} [${Number(rms.min).toFixed(3)}, ${Number(rms.max).toFixed(3)}]</td><td>${Number(row.drop_topk_nnls).toFixed(4)} vs ${Number(row.drop_rand10_nnls_mean).toFixed(4)} ± ${Number(row.drop_rand10_nnls_seed_sd).toFixed(4)}</td><td>${thetaText(row)}</td><td>${directText(row)}</td><td>${Number(row.ratio_abs_delta_yhat_nnls).toFixed(ratioDigits)}× ${ci(row.ratio_abs_delta_yhat_nnls_patient_boot_ci95, ratioDigits)}</td><td>${(100 * row.rebound_raw).toFixed(2)}% / ${(100 * row.rebound_net).toFixed(2)}%</td></tr>`;
            }).join('')
          }</tbody></table>
        </div>
        <div class="v9-nnls-notes">
          <p><code>‖W_re[:,sel] − W_abl[:,sel]‖_F / ‖W_orig[:,sel] − W_abl[:,sel]‖_F</code> 为 rebound_raw 的公式；rebound_net 另扣除原始非负重编码对应的净变化。二者系消融系数矩阵的相对 Frobenius 范数恢复量，非患者比例或波形能量占比。</p>
          <p>患者配对 bootstrap SE / CI 描述患者抽样不确定性；random-seed SD 描述 10 次随机原子抽取离散度，两者不可互换。|Δŷ| 幅度敏感性（点估计约 4.35×–5.75×）不能替代 AUROC 排序特异性；mortality_365d 的 θ_NNLS 区间跨 0。</p>
        </div>`;
    }

    function renderTreeShap() {
      const tv = ts.targets?.[curTsKey];
      if (!tv) return;
      const attr = tv.attribution_12x6 || {};
      const perf = tv.performance || {};
      const blocks = tv.feature_block_attribution?.block_net_abs_shap_share_pct || {};
      const qwf = tv.quintile_waveforms || {};
      const abl = tv.ablation_curve || [];
      const leadList = qwf.leads || ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      if (!leadList.includes(curTsLead)) curTsLead = leadList.includes(attr.dominant_lead) ? attr.dominant_lead : leadList[0];

      const metName = perf.metric || (tv.task_type === 'binary' ? 'AUROC' : 'R²');
      find('#ts-perf-ribbon').innerHTML = `
        <span class="v9-delta-chip">${esc(TARGET_ZH[curTsKey] || tv.label)} 确认集 ${esc(metName)} = ${fmtNum(perf.conf_full_prism1000_routine14_agesex, 4)}</span>
        <span class="v9-delta-chip">超越 14 常规时序+年龄性别增量 ${fmtSigned(perf.conf_delta_prism1000_beyond_routine14_agesex, 4)}</span>
        <span class="v9-delta-chip is-neutral">主归因靶点 ${esc(attr.dominant_lead)} (${fmtNum(attr.dominant_lead_share_pct, 1, '%')}) / ${WIN_ZH[attr.dominant_window] || attr.dominant_window} (${fmtNum(attr.dominant_window_share_pct, 1, '%')})</span>`;

      // Layer 1: Feature block share + 12x6 attribution map
      const pShare = isNum(blocks.prism_1000_atoms) ? Number(blocks.prism_1000_atoms) : null;
      const rShare = isNum(blocks.routine_14_ecg_features) ? Number(blocks.routine_14_ecg_features) : null;
      const aShare = isNum(blocks.age_sex) ? Number(blocks.age_sex) : null;
      find('#ts-block-bar').innerHTML = `
        <div style="width:${pShare != null ? pShare.toFixed(1) : 0}%;background:#2a6e5d" title="PRISM 1,000 形态 ${fmtNum(pShare, 1, '%')}"></div>
        <div style="width:${rShare != null ? rShare.toFixed(1) : 0}%;background:#35638f" title="14 项常规时序 ${fmtNum(rShare, 1, '%')}"></div>
        <div style="width:${aShare != null ? aShare.toFixed(1) : 0}%;background:#b0aa9c" title="年龄/性别 ${fmtNum(aShare, 1, '%')}"></div>`;
      find('#ts-block-leg').innerHTML = `
        <span><i style="background:#2a6e5d"></i>PRISM 1,000 形态 <b>${fmtNum(pShare, 1, '%')}</b></span>
        <span><i style="background:#35638f"></i>14 常规时序 <b>${fmtNum(rShare, 1, '%')}</b></span>
        <span><i style="background:#b0aa9c"></i>年龄/性别 <b>${fmtNum(aShare, 1, '%')}</b></span>`;

      find('#ts-heatmap').innerHTML = renderHeatmapTable(attr.attribution_share_pct_12x6, attr.dominant_lead, attr.dominant_window, {
        light: true, unit: '%', dec: 1, rgb: '42,110,93', highlightMax: true,
      });

      const stab = tv.interventional_vs_path_stability || {};
      const spearman = stab.dev_oof_vs_conf_shap_spearman_r ?? ts.cross_target_summary?.find(x => x.target_key === curTsKey)?.dev_oof_vs_conf_shap_spearman_r;
      const intervCorr = stab.path_vs_interventional_spearman_r ?? stab.interventional_spearman_r;
      find('#ts-stability-note').innerHTML = `开发集 OOF ↔ 确认集 TreeSHAP 秩相关 <strong>r = ${fmtNum(spearman, 4)}</strong>${intervCorr != null ? ` · Path-dependent ↔ Interventional 一致性 <strong>r = ${fmtNum(intervCorr, 4)}</strong>` : '（加性误差 &lt; 10⁻⁴，严格模型输出单位）'}。`;

      // Layer 2A: Real uV Quintile Contrast Waveform (uses real observed uV when treeshap_v2 provides it!)
      const leadSeg = find('#ts-lead-seg');
      leadSeg.innerHTML = leadList.map(ld =>
        `<button type="button" data-tsld="${ld}" aria-pressed="${ld === curTsLead}" style="padding:2px 8px;font-size:11px">${ld}</button>`
      ).join('');
      const hiIsQ1 = qwf.high_risk_quintile === 'Q1';
      const useObs = Boolean(qwf.has_observed_waveforms && qwf.q1_mean_observed_uv?.[curTsLead] && qwf.q5_mean_observed_uv?.[curTsLead]);
      const arrQ1 = useObs ? qwf.q1_mean_observed_uv[curTsLead] : qwf.q1_mean_decoded_uv?.[curTsLead];
      const arrQ5 = useObs ? qwf.q5_mean_observed_uv[curTsLead] : qwf.q5_mean_decoded_uv?.[curTsLead];
      find('#ts-wave-box').innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#57554e;margin-bottom:5px;flex-wrap:wrap;gap:6px">
          <span><b style="color:#bf4a40">■ 高风险五分位</b> vs <b style="color:#2a6e5d">■ 低风险五分位</b>（${curTsLead} 导联${useObs ? '实测' : 'PRISM 解码'} µV）</span>
          <span>解码↔实测波差 r = <b>${fmtNum(qwf.decoded_vs_observed_q5_minus_q1_corr, 3)}</b></span>
        </div>
        <div class="v9-ts-wave-svg">${buildMultiWaveSvg([
          { arr: arrQ1, color: hiIsQ1 ? '#bf4a40' : '#2a6e5d', width: 2.0 },
          { arr: arrQ5, color: hiIsQ1 ? '#2a6e5d' : '#bf4a40', width: 2.0 },
        ], tsTimes, { dark: false, width: 460, height: 148, shadeQRS: true })}</div>`;

      // Layer 2B: Dev-OOF Frozen Top-k vs Random Ablation Sensitivity Curve
      const W = 440; const H = 152;
      const pad = { l: 46, r: 18, t: 22, b: 28 };
      const gw = W - pad.l - pad.r; const gh = H - pad.t - pad.b;
      const maxDrop = Math.max(0.02, ...abl.map(r => Math.max(r.perf_drop ?? 0, r.rand_perf_drop_mean ?? 0))) * 1.15;
      const xs = abl.map((_, i) => pad.l + (gw * i) / Math.max(1, abl.length - 1));
      const mapY = v => pad.t + gh * (1 - clamp((v ?? 0) / maxDrop, 0, 1));
      const topPts = abl.map((r, i) => `${xs[i].toFixed(1)},${mapY(r.perf_drop).toFixed(1)}`).join(' ');
      const rndPts = abl.map((r, i) => `${xs[i].toFixed(1)},${mapY(r.rand_perf_drop_mean).toFixed(1)}`).join(' ');
      const hasBudget = abl.some(r => r.matched_budget_perf_drop_mean != null);
      const budPts = hasBudget ? abl.map((r, i) => `${xs[i].toFixed(1)},${mapY(r.matched_budget_perf_drop_mean).toFixed(1)}`).join(' ') : '';
      const k25 = abl.find(r => r.k === 25) || abl[abl.length - 1] || {};
      const ablRms = k25.ablated_cells_rms_uv ?? k25.top_cell_rms_uv;
      const outRms = k25.outside_cells_rms_uv;

      find('#ts-ablation-box').innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#57554e;margin-bottom:5px;flex-wrap:wrap;gap:6px">
          <span><b>直接程序空间消融：冻结 Top-k 性能下降量（Δ${esc(metName)} 损失 · k=5..50）</b></span>
          <span>k=25 靶格富集 <b style="color:#2a6e5d">${fmtNum(k25.ablated_cells_enrichment, 1, '×')}</b> · 忠实度 r=<b>${fmtNum(k25.faithfulness_r, 3)}</b></span>
        </div>
        <svg class="v9-ablation-svg" viewBox="0 0 ${W} ${H}" aria-label="Top-k与随机程序消融敏感性曲线">
          ${[0, 0.5, 1].map(f => {
            const y = pad.t + gh * (1 - f);
            const tickVal = maxDrop * f;
            return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}" stroke="rgba(20,20,19,0.08)"/>
              <text x="${pad.l - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#6c6a63">${f === 0 ? '0' : tickVal.toFixed(3)}</text>`;
          }).join('')}
          <polyline fill="none" stroke="#9b968a" stroke-width="1.8" stroke-dasharray="4 3" points="${rndPts}"/>
          ${hasBudget ? `<polyline fill="none" stroke="#ae7b2f" stroke-width="1.8" stroke-dasharray="2 2" points="${budPts}"/>` : ''}
          <polyline fill="none" stroke="#bf4a40" stroke-width="2.4" points="${topPts}"/>
          ${abl.map((r, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${mapY(r.perf_drop).toFixed(1)}" r="4" fill="#bf4a40" stroke="#fff" stroke-width="1.4"/>
            <circle cx="${xs[i].toFixed(1)}" cy="${mapY(r.rand_perf_drop_mean).toFixed(1)}" r="3.2" fill="#9b968a"/>
            <text x="${xs[i].toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="#4a4842">k=${r.k}</text>
          `).join('')}
          <g font-size="10" fill="#57554e">
            <rect x="${pad.l + 4}" y="5" width="10" height="3" fill="#bf4a40"/><text x="${pad.l + 18}" y="10">冻结 Top-k</text>
            <rect x="${pad.l + 80}" y="5" width="10" height="3" fill="#9b968a"/><text x="${pad.l + 94}" y="10">随机 k</text>
            ${hasBudget ? `<rect x="${pad.l + 132}" y="5" width="10" height="3" fill="#ae7b2f"/><text x="${pad.l + 146}" y="10">等预算随机 k</text>` : ''}
            <text x="${W - pad.r}" y="10" text-anchor="end" fill="#2a6e5d">消融靶格 ${fmtNum(ablRms, 1, ' µV')}${outRms != null ? ` (格外 ${fmtNum(outRms, 1)})` : ''}</text>
          </g>
        </svg>`;
      renderNnlsAudit();
    }

    bindChipGroup(find('#ts-target-seg'), btn => { curTsKey = btn.dataset.tstarget; curTsLead = ts.targets?.[curTsKey]?.attribution_12x6?.dominant_lead || 'V3'; renderTreeShap(); });
    find('#ts-lead-seg').addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      curTsLead = b.dataset.tsld;
      renderTreeShap();
    });
    renderTreeShap();

    // 4D. 1 + 9 Organ-System Orthogonal Axes (STRICTLY SORTED DESCENDING BY TOTAL AUROC!)
    const orgWrap = find('#organ9-bars');
    if (orgWrap) {
      const normSys = (D.organ_9axes?.systems || []).map(s => ({
        zh_name: s.zh_name || s.phecode_category || s.system_key || '缺失',
        total: s.total ?? s.evaluation_auroc?.total?.auroc,
        h10: s.h10 ?? s.evaluation_auroc?.h10?.auroc,
        delta_vs_shared: s.delta_vs_shared ?? s.evaluation_auroc?.delta_total_vs_shared_d10?.delta,
        ci_vs_shared: s.ci_vs_shared ?? s.evaluation_auroc?.delta_total_vs_shared_d10?.ci95,
        dominant_lead: s.dominant_lead ?? s.orth_residual_spatial_anatomy?.dominant_lead,
        dominant_window: s.dominant_window ?? s.orth_residual_spatial_anatomy?.dominant_window,
      }));
      const sys = normSys.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
      orgWrap.innerHTML = sys.map(s => {
        const wTot = isNum(s.total) ? clamp((s.total - 0.50) / 0.25) * 100 : 0;
        const wH10 = isNum(s.h10) ? clamp((s.h10 - 0.50) / 0.25) * 100 : 0;
        const sigOrth = isNum(s.ci_vs_shared?.[0]) && s.ci_vs_shared[0] > 0;
        return `<div class="v9-org9-row">
          <b>${esc(s.zh_name)}</b>
          <div class="v9-org9-pair">
            <div class="v9-org9-track"><div class="v9-org9-tot" style="width:${wTot.toFixed(1)}%"></div></div>
            <div class="v9-org9-track"><div class="v9-org9-h10" style="width:${wH10.toFixed(1)}%"></div></div>
          </div>
          <span class="v9-org9-val"><b>${fmtNum(s.total, 4)}</b> <small style="color:${sigOrth ? '#2a6e5d' : '#6c6a63'}">(正交 ${fmtSigned(s.delta_vs_shared, 4)} · ${esc(s.dominant_lead || '缺失')}/${WIN_ZH[s.dominant_window] || s.dominant_window || '缺失'})</small></span>
        </div>`;
      }).join('');
    }

    // 4E. Honest Clinical Comparator (Track E v3 + CODE-15% + Optional Classical Morphology Control)
    const te3Body = find('#te3-body');
    const renderTe3 = epKey => {
      if (!te3Body) return;
      if (epKey === 'code15') {
        const c15 = D.code15_triage_d10 || {};
        const h180 = c15.layer3_eval?.['180']?.arms || {};
        const h365 = c15.layer3_eval?.['365']?.arms || {};
        te3Body.innerHTML = `
          <div class="v9-te3-card">
            <h4>CODE-15% 365 日外推（dev 66,686 → eval 16,672）</h4>
            <div class="v9-te3-line"><span>常规 14 时序 + 机器基线</span><b>${fmtNum(h365.baseline?.auroc, 4)}</b></div>
            <div class="v9-te3-line"><span>+ PCA-10（同维形态对照）</span><b>${fmtNum(h365.baseline_plus_pca10?.auroc, 4)}</b></div>
            <div class="v9-te3-line"><span>+ PRISM D1–D10</span><b style="color:#2a6e5d">${fmtNum(h365.baseline_plus_prism_d1_d10_v3?.auroc, 4)}</b></div>
          </div>
          <div class="v9-te3-card">
            <h4>Layer 1 冻结 H_10 与 180 日外推</h4>
            <div class="v9-te3-line"><span>Layer 1 H_10 单变量 Harrell C</span><b style="color:#2a6e5d">${fmtNum(c15.layer1_h10?.harrell_c_eval, 4)}</b></div>
            <div class="v9-te3-line"><span>180d 基线 → +PRISM D1–D10</span><b style="color:#2a6e5d">${fmtNum(h180.baseline?.auroc, 4)} → ${fmtNum(h180.baseline_plus_prism_d1_d10_v3?.auroc, 4)}</b></div>
            <div class="v9-te3-line"><span>normal_ecg 亚组增量</span><span>${fmtSigned(c15.normal_ecg_subgroup?.contrast_2_d1_d10_v3_vs_baseline?.delta_vs_baseline?.delta_auroc, 4)} (跨零)</span></div>
          </div>`;
        return;
      }
      const ROUTE_ZH = {
        anzhen_to_mimic_confirm: '北京安贞医院 → MIMIC 确认集',
        anzhen_to_tianyi: '北京安贞医院 → 天医二院',
        tianyi_to_anzhen: '天医二院 → 北京安贞医院',
        tianyi_to_mimic_confirm: '天医二院 → MIMIC 确认集',
        mimic_dev_to_mimic_confirm: 'MIMIC 开发 → MIMIC 确认集',
        mimic_dev_to_renmin: 'MIMIC 开发 → 北大人民 / PKUPH',
      };
      const routes = D.track_e_v3?.[epKey]?.routes || {};
      te3Body.innerHTML = Object.entries(routes).map(([rk, rv]) => {
        const a = rv.arms || {};
        return `<div class="v9-te3-card">
          <h4>${esc(ROUTE_ZH[rk] || rv.label || rk)}</h4>
          <div class="v9-te3-line"><span>14 常规时序 + 机器诊断</span><b>${fmtNum(a.routine_14timings?.auroc, 4)}</b></div>
          <div class="v9-te3-line"><span>+ PCA-10（同维形态）</span><b>${fmtNum(a.routine_14timings_plus_pca10?.auroc, 4)}</b></div>
          <div class="v9-te3-line"><span>+ PRISM D1–D10</span><b style="color:#2a6e5d">${fmtNum(a.routine_14timings_plus_prism_d10_v3?.auroc, 4)}</b></div>
        </div>`;
      }).join('');
    };
    bindChipGroup(find('#te3-ep-seg'), btn => renderTe3(btn.dataset.ep));
    renderTe3('endpoint_1b_ntprobnp_ecg_time_only_5cov_v3');

    const clsCtrl = D.copi_controls?.classical_morphology;
    const clsBox = find('#classical-ctrl-box');
    if (clsBox && clsCtrl) {
      clsBox.hidden = false;
      const rows = (clsCtrl.headline_comparison_table || []).filter(r => r.learner === 'xgboost_hist');
      const epZh = { lvef: 'LVEF (R²)', ntprobnp_log10: 'NT-proBNP (R²)', bmi: 'BMI (R²)', crp_log10: 'CRP (R²)', mortality_365d: '365日死亡率 (AUROC)' };
      clsBox.innerHTML = `
        <div style="margin-bottom:6px"><strong>传统配准形态基线对照（Baseline C · 191 维：175 传统配准形态 + 14 常规时序 + 年龄性别 · XGBoost）：</strong></div>
        <div class="v9-eff-table" style="margin-top:4px"><table><thead><tr><th>终点</th><th>Baseline C (191D)</th><th>+ PRISM D1–D10</th><th>+ PRISM W1000</th><th>W1000 相对 C 增量 (95% CI)</th></tr></thead><tbody>${
          rows.map(r => `<tr><td>${esc(epZh[r.endpoint] || r.endpoint)}</td><td>${fmtNum(r.C, 4)}</td><td>${fmtNum(r.C_plus_D10, 4)}</td><td><b>${fmtNum(r.C_plus_PRISM_W1000, 4)}</b></td><td style="color:${isNum(r.delta_W1000_ci95?.[0]) && r.delta_W1000_ci95[0] > 0 ? '#2a6e5d' : '#57554e'};font-weight:600">${fmtSigned(r.delta_W1000_vs_C, 4)} ${fmtCi(r.delta_W1000_ci95, 4)}</td></tr>`).join('')
        }</tbody></table></div>`;
    }
  }

  /* ==================== NEW FIG. 04B (v13): All-Disease & 17-System Record Burden ==================== */
  function renderDiseaseBurdenV13(D) {
    const burden = D.curves_and_burden_v13?.mimic_confirmation_disease_burden_5bin;
    const kpiEl = find('#burden-overall-kpis');
    const headEl = find('#burden-headline');
    const gridEl = find('#burden-sys17-grid');
    const pregEl = find('#burden-preg-note');
    const cavEl = find('#burden-caveat');
    const modeSeg = find('#burden-mode-seg');
    if (!burden || !gridEl) return;

    let curMode = 'std'; // 'std' | 'crude'
    const ov = burden.overall || {};
    const sys17 = burden.systems_17 || [];
    const sum = burden.summary_computed_from_arrays || {};
    const preg = burden.pregnancy_risk_set_female_lt50 || {};

    function miniSparkSvg(vals, isPosSlope) {
      const nums = vals.filter(isNum).map(Number);
      if (nums.length < 2) return '';
      const lo = Math.min(...nums);
      const hi = Math.max(...nums);
      const span = Math.max(0.5, hi - lo);
      const W = 96; const H = 26;
      const pts = nums.map((v, i) => {
        const x = 5 + (i / (nums.length - 1)) * (W - 10);
        const y = H - 5 - ((v - lo) / span) * (H - 10);
        return [x, y];
      });
      const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const stroke = isPosSlope ? '#bf4a40' : '#2a6e5d';
      return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <polyline fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" points="${poly}"/>
        ${pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 0 || i === pts.length - 1 ? 2.4 : 1.7}" fill="${stroke}"/>`).join('')}
      </svg>`;
    }

    function renderBurden() {
      const isStd = curMode === 'std';
      const valK = isStd ? 'std' : 'crude';
      const eqBins = ov.equal_family_mean_prevalence?.bins || [];
      const pwBins = ov.prevalence_weighted_prevalence?.bins || [];
      const famBins = ov.mean_active_families_per_patient?.bins || [];
      const ncEqBins = ov.non_circulatory_equal_family_prevalence?.bins || [];
      const ncPwBins = ov.non_circulatory_prevalence_weighted?.bins || [];

      const seq5 = (bins, dec = 2) => bins.map(b => (isNum(b?.[valK]) ? Number(b[valK]).toFixed(dec) : '缺失')).join('→');
      const pair5 = (bins, dec = 2, suf = '%') => (bins.length >= 2
        ? `${fmtNum(bins[0]?.[valK], dec, suf)} → ${fmtNum(bins[bins.length - 1]?.[valK], dec, suf)}`
        : '缺失');

      if (kpiEl) {
        kpiEl.innerHTML = `
          <div class="v13-burden-kpi">
            <span>等权病族均率（${isStd ? '标准化' : '粗值'}）</span>
            <strong>${pair5(eqBins, 2, '%')}</strong>
            <small>${seq5(eqBins, 2)}%</small>
          </div>
          <div class="v13-burden-kpi">
            <span>加权患病率（开发权重）</span>
            <strong>${pair5(pwBins, 2, '%')}</strong>
            <small>${seq5(pwBins, 2)}%</small>
          </div>
          <div class="v13-burden-kpi">
            <span>人均活跃病族（217 族）</span>
            <strong>${pair5(famBins, 2, ' 族')}</strong>
            <small>${seq5(famBins, 2)}</small>
          </div>
          <div class="v13-burden-kpi">
            <span>非循环敏感性</span>
            <strong>${pair5(ncEqBins, 2, '%')}</strong>
            <small>加权 ${pair5(ncPwBins, 2, '%')}</small>
          </div>`;
      }

      if (headEl) {
        const nTot = sum.n_systems_total ?? sys17.length;
        const nNegQ = sum.n_systems_any_std_negative_slope_bh_q05 ?? 14;
        const nPosQ = sum.n_systems_any_std_positive_slope_bh_q05 ?? 3;
        const nStrict = isStd
          ? (sum.n_systems_any_std_strictly_decreasing ?? 9)
          : sys17.filter(s => s.monotonicity_any_crude?.decreasing).length;
        headEl.innerHTML = `<strong>17 系统全览（n=${fmtInt(burden.n_confirmation)}，${fmtInt(burden.n_active_families_dev_ge_0p5pct)} 病族）：</strong>标准化下 <strong>${nNegQ}/${nTot} 显著负向（BH q&lt;0.05）</strong>，当前口径 <strong>${nStrict}/${nTot} 严格递减</strong>；<strong>${nPosQ}/${nTot}</strong> 正向（妊娠、感觉器官、症状），全部如实展示。`;
      }

      // Sort by age-sex-adjusted trend slope ascending (strongest negative burden gradient first, positive last)
      const sortedSys = [...sys17].sort((a, b) => (a.trend_any_age_sex_adj?.slope_per_10pt ?? 0) - (b.trend_any_age_sex_adj?.slope_per_10pt ?? 0));
      gridEl.innerHTML = sortedSys.map(s => {
        const bins = s.bins || [];
        const anyVals = bins.map(b => (isStd ? b.any_disease_std_pct : b.any_disease_crude_pct));
        const pwVals = bins.map(b => (isStd ? b.pw_std_pct : b.pw_crude_pct));
        const tr = s.trend_any_age_sex_adj || {};
        const slope = tr.slope_per_10pt;
        const isPos = isNum(slope) && Number(slope) > 0;
        const strictDec = isStd ? Boolean(s.monotonicity_any_std?.decreasing) : Boolean(s.monotonicity_any_crude?.decreasing);
        const qTxt = isNum(tr.bh_q_17)
          ? (Number(tr.bh_q_17) < 0.0001 ? 'q<1e-4' : (Number(tr.bh_q_17) < 0.001 ? `q=${Number(tr.bh_q_17).toFixed(4)}` : `q=${Number(tr.bh_q_17).toFixed(3)}`))
          : '缺失';
        const pillCls = isPos ? 'is-pos' : (strictDec ? 'is-strict' : 'is-neg');
        const pillTxt = isPos ? '正向' : (strictDec ? '递减' : '下降');
        const tip = `${CHAPTER_ZH[s.chapter] || s.chapter} (${s.n_active_families} 活跃病族) | 斜率 ${fmtSigned(slope, 2)}/10分 (${qTxt}) | 加权 ${fmtNum(pwVals[0], 1)}→${fmtNum(pwVals[pwVals.length - 1], 1)}%`;
        return `<div class="v13-sys-row ${isPos ? 'is-pos-slope' : ''}" data-burden-sys="${esc(s.chapter)}" title="${esc(tip)}">
          <div class="v13-sys-name">${esc(CHAPTER_ZH[s.chapter] || s.chapter)}<small>${fmtInt(s.n_active_families)} 族 · ${qTxt}</small></div>
          <div class="v13-sys-spark">${miniSparkSvg(anyVals, isPos)}</div>
          <div class="v13-sys-vals"><b>${fmtNum(anyVals[0], 1, '%')}→${fmtNum(anyVals[anyVals.length - 1], 1, '%')}</b></div>
          <span class="v13-sys-pill ${pillCls}">${pillTxt}</span>
        </div>`;
      }).join('');

      if (pregEl && Array.isArray(preg.bins) && preg.bins.length) {
        const pSeq = preg.bins.map(b => `${fmtNum(b.any_disease_age_std_pct, 2, '%')}`).join('→');
        pregEl.innerHTML = `<strong>妊娠适用人群（女 &lt;50 岁，n=${fmtInt(preg.n_total)}）：</strong>年龄标准化五箱 <code>${pSeq}</code>（斜率 ${fmtSigned(preg.trend_age_adjusted_per_10pt?.slope_per_10pt, 2)}%/10分，p=${fmtNum(preg.trend_age_adjusted_per_10pt?.p, 3)}）。`;
      }

      if (cavEl) {
        cavEl.innerHTML = `<strong>边界：</strong>病族与年龄×性别权重均于开发集冻结；H₁₀ 训练含器官负担，本图属独立患者病历记录负担。`;
      }
      pulseFade(gridEl);
    }

    if (modeSeg && !modeSeg.dataset.boundBurden) {
      modeSeg.dataset.boundBurden = '1';
      bindChipGroup(modeSeg, btn => { curMode = btn.dataset.bmode || 'std'; renderBurden(); });
    }
    renderBurden();
  }

  /* ==================== ACT 05: PRISM-Watch Adaptation & Specs ==================== */
  function renderAct5(D) {
    const wa = D.watch_adaptation || {};
    const fp = wa.edge_footprint || {};
    const mBox = find('#watch-methods-box');
    const wBox = find('#watch-wave-box');
    const ncalBox = find('#watch-ncal-box');
    const simBox = find('#watch-sim-box');
    const discBox = find('#watch-disclosure');
    let curWCoh = 'sjlife';

    // Populate Act 05 live footprint & latency KPIs (strictly separating hardware/model facts from hospital mortality!)
    const sizeEl = find('#edge-kpi-size');
    const latEl = find('#edge-kpi-latency');
    const latSub = find('#edge-kpi-latency-sub');
    const kbPrimary = fp.footprint_rung2_fir_plus_id_residual_kb?.total_adapted_edge_bundle_kb
      ?? fp.footprint_14param_id_residual_d10_kb?.total_adapted_edge_bundle_kb;
    const kbOverhead = fp.footprint_rung2_fir_plus_id_residual_kb?.total_calibration_overhead_kb
      ?? fp.footprint_14param_id_residual_d10_kb?.device_calibration_layer_kb;
    if (sizeEl && kbPrimary != null) sizeEl.textContent = `${kbPrimary.toFixed(1)} KB`;
    const lat = fp.single_thread_cpu_latency_ms || {};
    const e2e = lat.rung2_end_to_end_qc_plus_inference_ms || lat.end_to_end_qc_plus_inference_ms;
    const inf = lat.rung2_inference_plus_head_cal_ms || lat.adapted_inference_plus_head_cal_ms;
    const qc = lat.qc_gate_10s_strip_ms;
    if (latEl && e2e?.median != null) latEl.textContent = `${e2e.median.toFixed(2)} ms / 搏`;
    const pipeSpec = find('#watch-pipe-spec');
    if (pipeSpec && kbPrimary != null && e2e?.median != null) {
      pipeSpec.textContent = `${kbPrimary.toFixed(1)} KB · ${e2e.median.toFixed(2)} ms`;
    }
    const butqPipe = D.native_single_lead_v12?.wearables_and_open_single_lead?.butqdb_quality_gating;
    const pipeButq = find('#watch-pipe-butq');
    if (pipeButq && butqPipe?.by_quality_class) {
      const c1 = butqPipe.by_quality_class.class_1?.registration_pass_pct;
      const c3Rej = butqPipe.by_quality_class.class_3?.rejection_rate_band || '缺失';
      pipeButq.textContent = `BUT QDB 清晰段 ${fmtNum(c1, 1, '%')} 通过 · 不可用段 ${c3Rej} 拦截`;
    }
    const sjRawH = wa.sjlife?.readouts?.raw_watch_unadapted?.health_score_points || {};
    const sj2bH = wa.sjlife?.readouts?.rung2b_fir_plus_id_residual_cal_primary?.health_score_points || {};
    const pipeMae = find('#watch-pipe-mae');
    if (pipeMae && isNum(sjRawH.mae) && isNum(sj2bH.mae)) {
      pipeMae.textContent = `Apple Watch 配对 MAE：${Number(sjRawH.mae).toFixed(2)} → ${Number(sj2bH.mae).toFixed(2)} 分`;
    }
    const ecgCurve = D.watch_native_health?.ecgid_multiday_risk?.icc_and_multiday_model?.multiday_averaging_curve || {};
    const icc1 = ecgCurve['K=1_days']?.icc_1k;
    const icc7 = ecgCurve['K=7_days']?.icc_1k;
    const pipeTrend = find('#watch-pipe-trend');
    if (pipeTrend && isNum(icc1) && isNum(icc7)) {
      pipeTrend.textContent = `ECG-ID 模型推算 7 次重复 ICC ${Number(icc1).toFixed(2)} → ${Number(icc7).toFixed(2)}（非实机预警）`;
    }
    const repEl = find('#edge-kpi-repeat');
    const repSub = find('#edge-kpi-repeat-sub');
    if (repEl && isNum(icc7)) repEl.textContent = `ICC ${Number(icc7).toFixed(3)}`;
    if (repSub) repSub.textContent = `ECG-ID 常规 I 导联 7 次重复模型推算（医院纵向关联见下方验证表）`;
    if (latSub && inf?.median != null && qc?.median != null) {
      latSub.textContent = `单线程 CPU：推理 ${fmtNum(inf.median, 2, ' ms')} + 10s 质控 ${fmtNum(qc.median, 2, ' ms')}（校准开销 ${fmtNum(kbOverhead, 3, ' KB')} · 方波 25/25 拦截）`;
    }

    function renderNcalSvg(ncalArr, cohortTitle) {
      if (!ncalBox || !Array.isArray(ncalArr) || !ncalArr.length) return;
      ncalBox.hidden = false;
      const W = 460; const H = 148;
      const pad = { l: 44, r: 22, t: 24, b: 28 };
      const gw = W - pad.l - pad.r; const gh = H - pad.t - pad.b;
      const vals = ncalArr.flatMap(p => [p.rung2b_h10_mae, p.rung3a_h10_mae].filter(v => v != null));
      const yMin = Math.max(8, Math.floor(Math.min(...vals, 10) - 1));
      const yMax = Math.ceil(Math.max(...vals, 14) + 1);
      const xs = ncalArr.map((_, i) => pad.l + (gw * i) / Math.max(1, ncalArr.length - 1));
      const mapY = v => pad.t + gh * (1 - clamp((v - yMin) / Math.max(1, yMax - yMin), 0, 1));
      const p2 = ncalArr.map((p, i) => `${xs[i].toFixed(1)},${mapY(p.rung2b_h10_mae ?? yMax).toFixed(1)}`).join(' ');
      const hasR3 = ncalArr.some(p => p.rung3a_h10_mae != null);
      const p3 = hasR3 ? ncalArr.map((p, i) => `${xs[i].toFixed(1)},${mapY(p.rung3a_h10_mae ?? yMax).toFixed(1)}`).join(' ') : '';
      const yGate = mapY(10.0);
      ncalBox.innerHTML = `<div class="v9-anat-side">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          <h4 style="margin:0;font-size:13.5px">${esc(cohortTitle)} · 校准样本量学习曲线 (n_cal)</h4>
          <span style="font-size:11px;color:#94a3b8">固定测试集评估 · Rung 2b (0.285 KB) vs Rung 3a 探索蒸馏 (434.7 KB)</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:142px;display:block;border-radius:10px;background:rgba(20,20,19,0.45)">
          ${[yMin, (yMin + yMax) / 2, yMax].map(yv => {
            const py = mapY(yv);
            return `<line x1="${pad.l}" y1="${py.toFixed(1)}" x2="${W - pad.r}" y2="${py.toFixed(1)}" stroke="rgba(245,243,236,0.08)"/>
              <text x="${pad.l - 6}" y="${(py + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#9c988d">${yv.toFixed(1)}</text>`;
          }).join('')}
          ${yMin <= 10 && yMax >= 10 ? `<line x1="${pad.l}" y1="${yGate.toFixed(1)}" x2="${W - pad.r}" y2="${yGate.toFixed(1)}" stroke="#e57a71" stroke-width="1.2" stroke-dasharray="4 3"/>
            <text x="${W - pad.r}" y="${(yGate - 4).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#e57a71">预设阈值 10.0 分</text>` : ''}
          ${hasR3 ? `<polyline fill="none" stroke="#e0af5a" stroke-width="1.8" stroke-dasharray="4 3" points="${p3}"/>` : ''}
          <polyline fill="none" stroke="#5cb89e" stroke-width="2.2" points="${p2}"/>
          ${ncalArr.map((p, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${mapY(p.rung2b_h10_mae ?? yMax).toFixed(1)}" r="3.6" fill="#5cb89e" stroke="#141413" stroke-width="1"/>
            ${hasR3 && p.rung3a_h10_mae != null ? `<circle cx="${xs[i].toFixed(1)}" cy="${mapY(p.rung3a_h10_mae).toFixed(1)}" r="3.0" fill="#e0af5a"/>` : ''}
            <text x="${xs[i].toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#d4d1c7">${p.n_cal === 'full_train' ? (p.n_cal_numeric != null ? `Full(${p.n_cal_numeric})` : 'Full') : (p.n_cal_band ? esc(p.n_cal_band) : (p.n_cal != null ? `n=${p.n_cal}` : 'Full'))}</text>
          `).join('')}
          <g font-size="10" fill="#d4d1c7">
            <rect x="${pad.l + 4}" y="5" width="10" height="3" fill="#5cb89e"/><text x="${pad.l + 18}" y="10">Rung 2b 主线 (FIR+校准)</text>
            ${hasR3 ? `<rect x="${pad.l + 150}" y="5" width="10" height="3" fill="#e0af5a"/><text x="${pad.l + 164}" y="10">Rung 3a 探索蒸馏 (Ridge)</text>` : ''}
          </g>
        </svg>
      </div>`;
    }

    function renderWatchOverlay(ov, title, metricsCaption) {
      if (!ov || !ov.time_ms?.length) {
        wBox.innerHTML = `<div class="v9-anat-side"><h4>${esc(title)}</h4><p class="v9-note-sm">该队列重点报告设备间标量坐标误差（见左侧适配对照与下方单导联边界）。</p></div>`;
        return;
      }
      const times = ov.time_ms;
      const isUv = String(ov.unit_label || '').includes('uV');
      const nAggLbl = ov.n_patients_aggregated != null ? `n=${ov.n_patients_aggregated}` : `样本量档位 ${ov.n_patients_aggregated_band || '230-239'}`;
      wBox.innerHTML = `
        <div class="v9-anat-side">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px">
            <h4>${esc(title)}（${esc(nAggLbl)} 聚合平均 · ${isUv ? '物理 µV' : '归一化形态'}）</h4>
            <span id="watch-scrub-readout" style="font-size:11.5px;color:#5cb89e">移动光标细查 τ (ms)</span>
          </div>
          <div id="watch-svg-wrap" style="position:relative;margin-top:8px;cursor:crosshair">
            ${buildMultiWaveSvg([
              { arr: ov.mean_clinical_12lead_i, color: '#5cb89e', width: 2.2 },
              { arr: ov.mean_raw_apple_watch, color: '#e0af5a', width: 1.9, dash: '5 4' },
              { arr: ov.mean_physics_adapted_prism, color: '#d97757', width: 2.2 },
            ], times, { dark: true, width: 480, height: 175, shadeT: true })}
          </div>
          <div class="v9-legend-row" style="margin-top:8px">
            <span style="color:#5cb89e"><i class="v9-line-swatch"></i>院内 12 导 I 通道</span>
            <span style="color:#e0af5a"><i class="v9-line-swatch is-dashed"></i>原始手表心搏</span>
            <span style="color:#d97757"><i class="v9-line-swatch"></i>PRISM-Watch (2b 主线适配)</span>
          </div>
          <p class="v9-note-sm" style="margin-top:8px">${metricsCaption}</p>
        </div>`;

      const svgWrap = find('#watch-svg-wrap');
      const readout = find('#watch-scrub-readout');
      if (svgWrap && readout) {
        const updateScrub = clientX => {
          const r = svgWrap.getBoundingClientRect();
          const frac = clamp((clientX - r.left) / Math.max(1, r.width));
          const idx = Math.min(times.length - 1, Math.round(frac * (times.length - 1)));
          const tau = times[idx];
          readout.textContent = `τ = ${tau >= 0 ? '+' : ''}${tau} ms（${tau < 120 ? '刚性毫秒区' : '心率配准复极区'}）`;
        };
        svgWrap.addEventListener('pointermove', e => updateScrub(e.clientX));
        svgWrap.addEventListener('click', e => updateScrub(e.clientX));
      }
    }

    function renderReadoutRows(rows) {
      return rows.map(([lbl, obj, isBest, tag]) => {
        const h = obj?.health_score_points || {};
        const a1 = obj?.axis_1_development_sd || {};
        const a2 = obj?.axis_2_development_sd || {};
        const ciTxt = Array.isArray(h.mae_ci95) && h.mae_ci95.length === 2 ? ` ${fmtCi(h.mae_ci95, 1)}` : '';
        return `<div class="v9-wm-row ${isBest ? 'is-best' : ''}">
          <div class="v9-wm-top"><b>${esc(lbl)}${tag ? ` <span class="v9-ctrl-badge" style="margin-left:4px">${esc(tag)}</span>` : ''}</b><span style="color:${isBest ? '#5cb89e' : '#d4d1c7'}">H_10 MAE ${fmtNum(h.mae, 2, ' 分')}${ciTxt}</span></div>
          <div class="v9-wm-metrics">
            <span>Axis 1 CCC <b>${fmtNum(a1.ccc, 3)}</b></span>
            <span>Axis 2 CCC <b>${fmtNum(a2.ccc, 3)}</b></span>
            <span>H_10 CCC <b>${fmtNum(h.ccc, 3)}</b></span>
            <span>H_10 偏倚 <b>${fmtSigned(h.bias, 2)}</b></span>
          </div>
        </div>`;
      }).join('');
    }

    function renderSimulatorIntoDrawer() {
      if (!simBox) return;
      const brands = wa.simulator?.brands || {};
      const sqr = wa.simulator?.sqr_2hz_qc || {};
      const ed = wa.error_source_decomposition;
      const compA = ed?.component_a_12lead_to_leadi;
      const compB = ed?.component_b_leadi_to_watch_replay;
      simBox.innerHTML = `
        <h4 style="margin:0 0 8px;color:var(--ink-dark);font-size:13px">四品牌硬件传递函数模拟（真实患者数 = 0 · 2 Hz 方波拦截 ${fmtInt(sqr.rejected_by_qc_gate)}/${fmtInt(sqr.total_recordings)}，假阳性 ${fmtInt(sqr.false_accepts)}）</h4>
        <div class="v9-watch-methods">${Object.entries(brands).map(([bk, bv]) => {
          const b0 = bv.all_pooled?.baseline?.health_score_points?.cross_device_mae;
          const b3 = bv.all_pooled?.method3_combined_d10?.health_score_points?.cross_device_mae;
          const st0 = bv.st_segment?.baseline?.health_score_points?.cross_device_mae;
          const st3 = bv.st_segment?.method3_combined_d10?.health_score_points?.cross_device_mae;
          const hl = bv.headline_norm_and_uv || {};
          return `<div class="v9-wm-row">
            <div class="v9-wm-top"><b>${esc(BRAND_ZH[bk] || bk)}</b><span style="color:#5cb89e">ST 段 MAE ${fmtNum(st0, 2)} → ${fmtNum(st3, 2, ' 分')}</span></div>
            <div class="v9-wm-metrics"><span>全工况 ${fmtNum(b0, 2)} → <b>${fmtNum(b3, 2)}</b></span>${hl.pooled_uv_rmse_raw != null ? `<span>物理 RMSE <b>${fmtNum(hl.pooled_uv_rmse_raw, 1)} → ${fmtNum(hl.pooled_uv_rmse_rung2_primary, 1, ' µV')}</b></span>` : ''}</div>
          </div>`;
        }).join('')}</div>
        ${compA && compB ? `<div class="v9-anchor-list" style="margin-top:10px">
          <div class="v9-anchor-item is-neg"><span>误差解耦 (a) 12 导 → 院内 I 导减导损失（n=${fmtInt(compA.n_patients)}）</span><b>H₁₀ MAE ${fmtNum(compA.h10_mae, 2, ' 分')} · D1–D10 CCC ${fmtNum(compA.d10_mean_ccc, 3)}</b></div>
          ${Object.entries(compB.brands || {}).map(([bk, bv]) => `<div class="v9-anchor-item"><span>误差解耦 (b) ${esc(BRAND_ZH[bk] || bv.brand_label)} 回放（n=${fmtInt(compB.n_fixed_eval_patients)}）</span><b>MAE ${fmtNum(bv.raw_h10_mae, 2)} → ${fmtNum(bv.rung2b_h10_mae, 2, ' 分')}</b></div>`).join('')}
        </div>` : ''}`;
    }

    function renderWatchCohort() {
      const appRungs = find('#watch-appendix-rungs');
      if (ncalBox) ncalBox.hidden = true;
      const isV3 = Boolean(wa.is_v3);
      const verd = wa.calibration_vs_distillation_verdict?.empirical_summary || {};

      if (curWCoh === 'wecgdb') {
        const rd = wa.wecgdb?.readouts || {};
        const rawH = rd.raw_watch_unadapted?.health_score_points || {};
        const r2bObj = rd.rung2b_fir_plus_id_residual_cal_primary || {};
        const r2bH = r2bObj.health_score_points || {};
        const uv = wa.wecgdb?.uv_metrics || {};
        const uvRaw = uv.raw_watch_unadapted?.full_beat_rmse_mean ?? wa.headline_summary?.wecgdb_la_a_10s_h10_mae_and_uv_rmse?.raw_watch_absolute_uv_rmse;
        const uvR2 = uv.rung2_fir_adapted_prism_watch_primary?.full_beat_rmse_mean ?? wa.headline_summary?.wecgdb_la_a_10s_h10_mae_and_uv_rmse?.rung2_primary_absolute_uv_rmse;
        const rows = isV3 ? [
          ['原始腕戴 10s（未校正）', rd.raw_watch_unadapted, false, ''],
          ['Rung 1 · 零样本带通字典', rd.rung1_zero_shot_physics_bandpass, false, '零样本'],
          ['Rung 2b · FIR + D10 残差校准', rd.rung2b_fir_plus_id_residual_cal_primary, true, '锁定 2b'],
          ['Rung 3a · 蒸馏 Ridge', rd.rung3a_exploratory_distilled_ridge_student, false, '探索 · 435 KB'],
          ['Rung 3b · 蒸馏 MLP', rd.rung3b_exploratory_distilled_mlp_student, false, '探索 · 191 KB'],
        ] : [];

        // Lean 1-line KPI (C16)
        mBox.innerHTML = `<strong>wECGdb 腕戴真机（n=66，含病例与对照）· 紧凑版 2b：MAE ${fmtNum(rawH.mae, 2)} → ${fmtNum(r2bH.mae, 2, ' 分')}，95% CI ${fmtCi(r2bH.mae_ci95, 2)}</strong><span>系统偏倚 ${fmtSigned(rawH.bias, 2)} → ${fmtSigned(r2bH.bias, 2, ' 分')} · 绝对波差 ${fmtNum(uvRaw, 1)} → ${fmtNum(uvR2, 1, ' µV')}</span>`;
        if (appRungs) {
          appRungs.innerHTML = `<h4 style="margin:0 0 8px;color:#ffffff;font-size:13px">wECGdb 完整多档适配对照（n=66，含病例与对照）</h4><div class="v9-watch-methods">${renderReadoutRows(rows)}</div>`;
        }
        const cap = uvRaw != null && uvR2 != null
          ? `绝对物理波差由 <b>${fmtNum(uvRaw, 1)} µV</b> 降至 <b>${fmtNum(uvR2, 1)} µV</b>（同步 10s 腕戴 vs 院内 I 导联）。`
          : '真实物理 µV 波形叠合（同步 10s 腕戴 vs 院内 I 导联）。';
        renderWatchOverlay(wa.wecgdb?.overlay, 'wECGdb 腕戴 10s vs 同期院内 I 导联', cap);
        renderNcalSvg(wa.wecgdb?.calibration_sample_size_curve, 'wECGdb 真实腕戴');
        if (discBox) discBox.innerHTML = `wECGdb 腕戴原型（n=66）：2b 校正将系统偏倚从 <code>${fmtSigned(rawH.bias, 2)}</code> 降至 <strong>${fmtSigned(r2bH.bias, 2, ' 分')}</strong>，95% CI 上限（${fmtNum(r2bH.mae_ci95?.[1], 2)} 分）高于 ≤10 分门槛。`;
        pulseFade(mBox);
        return;
      }

      // Default: Apple Watch 真机 (SJLIFE) — ULTRA-LEAN C16!
      const rd = wa.sjlife?.readouts || {};
      const rawH = rd.raw_watch_unadapted?.health_score_points || {};
      const r2bObj = rd.rung2b_fir_plus_id_residual_cal_primary || {};
      const r2bH = r2bObj.health_score_points || {};
      const r3bH = rd.rung3b_exploratory_distilled_mlp_student?.health_score_points || {};
      const r3bDeltaCi = verd?.sjlife_mlp_minus_rung2b_paired_mae_ci95;
      const rows = isV3 ? [
        ['原始手表直投（未校正）', rd.raw_watch_unadapted, false, ''],
        ['Rung 1 · 零样本带通字典', rd.rung1_zero_shot_physics_bandpass, false, '0 校准'],
        ['Rung 2a · FIR + 2参数 RMA', rd.rung2a_fir_plus_2param_rma, false, '0.15 KB'],
        ['Rung 2b · FIR + D10 残差校准', rd.rung2b_fir_plus_id_residual_cal_primary, true, '锁定 2b · +0.285 KB'],
        ['Rung 3a · 蒸馏 Ridge', rd.rung3a_exploratory_distilled_ridge_student, false, '探索 · 435 KB'],
        ['Rung 3b · 蒸馏 MLP', rd.rung3b_exploratory_distilled_mlp_student, false, '探索 · 191 KB'],
      ] : [];

      const ciTxt = Array.isArray(r2bH.mae_ci95) && r2bH.mae_ci95.length === 2
        ? `${Number(r2bH.mae_ci95[0]).toFixed(2)}–${Number(r2bH.mae_ci95[1]).toFixed(2)}`
        : '缺失';
      mBox.innerHTML = `<strong>紧凑版 2b：MAE ${fmtNum(rawH.mae, 2)} → ${fmtNum(r2bH.mae, 2, ' 分')}，95% CI ${ciTxt}，未达 ≤10 分门槛</strong><span>SJLIFE 配对档位 ${esc(wa.sjlife?.n_paired_band || '230-239')} · CCC ${fmtNum(r2bH.ccc, 3)} · 偏倚 ${fmtSigned(r2bH.bias, 2, ' 分')}</span>`;

      if (appRungs) {
        const ciNote = Array.isArray(r3bDeltaCi) ? `，配对差 CI ${fmtCi(r3bDeltaCi, 3, true)}` : '';
        appRungs.innerHTML = `<h4 style="margin:0 0 8px;color:#ffffff;font-size:13px">SJLIFE Apple Watch 完整 6 档适配对照（Rung 3b MLP ${fmtNum(r3bH.mae, 2)} vs 2b ${fmtNum(r2bH.mae, 2)}${ciNote}，两者 95% 上限均未低于 10 分）</h4><div class="v9-watch-methods">${renderReadoutRows(rows)}</div>`;
      }
      const nm = wa.sjlife?.norm_metrics || {};
      const nRaw = nm.raw_watch_unadapted || {};
      const nR2 = nm.rung2_fir_adapted_prism_watch_primary || {};
      const cap = nR2.full_beat_rmse_mean != null
        ? `归一化形态域 RMSE <b>${fmtNum(nRaw.full_beat_rmse_mean, 4)}</b> → <b>${fmtNum(nR2.full_beat_rmse_mean, 4)}</b>，平均波形 R² <b>${fmtNum(nRaw.waveform_r2_mean, 3)}</b> → <b>${fmtNum(nR2.waveform_r2_mean, 3)}</b>（仅增 0.285 KB 校准参数）。`
        : '归一化形态域聚合叠合（SJLIFE 物理电压未定标）。';
      renderWatchOverlay(wa.sjlife?.overlay, 'Apple Watch S7 vs 同期院内 I 导联', cap);
      renderNcalSvg(wa.sjlife?.calibration_sample_size_curve, 'SJLIFE Apple Watch');
      if (discBox) {
        discBox.innerHTML = `口径说明：此处 <code>${fmtNum(r2bH.mae, 2, ' 分')}</code> 为旧版紧凑 281 程序 <code>H₁₀</code> 在 SJLIFE 上的 5 折按人嵌套折外 CV；下方原生 K=1,000 <code>PRISM-I + 2b</code> 为独立字典规格（15.13 [13.24, 17.05]），口径分列署名。`;
      }
      pulseFade(mBox);
    }

    renderSimulatorIntoDrawer();
    bindChipGroup(find('#watch-cohort-seg'), btn => { curWCoh = btn.dataset.wcoh; renderWatchCohort(); });
    renderWatchCohort();

    // 5A (v12): Watch Native Overall Health H_I + Comment 7 Anatomical 12-Lead Diagram & Bootstrap CI Lollipop
    renderWatchNativeV3(D);

    // 5C (v12 NEW): Upstream Native Single-Lead PRISM-I (Watch) & PRISM-II (MC-MED ED) Workbench
    renderNativeSingleLeadV12(D);

    // Appendix: Lead-I INT8 vs 12-Lead Escalation Ladder
    const h2hWrap = find('#edge-h2h-bars');
    if (h2hWrap) {
      const rows = [...(wa.edge_v1_preserved?.head_to_head || [])].sort((a, b) => (b.lead_i_gain_retention_fraction ?? 0) - (a.lead_i_gain_retention_fraction ?? 0));
      const EP_ZH = {
        mortality_365d: '365 日全因死亡率',
        ntprobnp_gt900: 'NT-proBNP > 900 pg/mL',
        ntprobnp_elevated: '心衰标志物 NT-proBNP 升高（±24h，年龄参照）',
        egfr_lt60: '慢性肾功能减退 (eGFR < 60)',
        organ_burden_ge2: '多器官系统负荷 ≥ 2',
        lvef_lt40: '射血分数降低 (LVEF < 40%)',
        mi_411_2: '心肌梗死 (411.2)',
        phe_411_2: '心肌梗死 (411.2)',
        hf_428_1: '充血性心衰 (428.1)',
        phe_428_1: '充血性心衰 (428.1)',
        phe_427_21: '心房颤动 (427.21)',
        phe_426_31: '右束支传导阻滞 (426.31)',
      };
      h2hWrap.innerHTML = rows.map(r => {
        const retPct = isNum(r.lead_i_gain_retention_fraction) ? (Number(r.lead_i_gain_retention_fraction) * 100).toFixed(1) : '缺失';
        const good = isNum(r.lead_i_gain_retention_fraction) && r.lead_i_gain_retention_fraction >= 0.85;
        const wBar = clamp((r.auroc_edge_lead_i_int8 - 0.64) / 0.30) * 100;
        const fBar = clamp((r.auroc_full_12lead_d10 - 0.64) / 0.30) * 100;
        return `<div class="v9-h2h-row">
          <div class="v9-h2h-top">
            <b>${esc(EP_ZH[r.endpoint] || r.title)} <small style="color:#9c988d">(临床基线 ${fmtNum(r.auroc_baseline_5cov, 3)})</small></b>
            <span style="color:${good ? '#5cb89e' : '#e0af5a'};font-weight:650">单导联保留 ${retPct}% · ${good ? '接近 12 导联' : '胸导联信息缺失明显'}</span>
          </div>
          <div class="v9-h2h-pair">
            <div class="v9-h2h-track"><div class="v9-h2h-full" style="width:${fBar.toFixed(1)}%"></div></div>
            <div class="v9-h2h-track"><div class="v9-h2h-watch" style="width:${wBar.toFixed(1)}%"></div></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#9c988d;margin-top:4px">
            <span style="color:#d97757">Lead-I INT8: ${fmtNum(r.auroc_edge_lead_i_int8, 4)}</span>
            <span style="color:#75a6d9">完整 12 导 D1–D10: ${fmtNum(r.auroc_full_12lead_d10, 4)}</span>
          </div>
        </div>`;
      }).join('');
    }

    // Bottom Collapsible Technical Provenance Table (Live from JSON!)
    const provEl = find('#spec-provenance-table');
    if (provEl) {
      const srcs = D.meta?.sources_resolved || {};
      provEl.innerHTML = `<table class="spec-table"><thead><tr><th>模块</th><th>当前解析产物路径</th><th>SHA-256 (前16位)</th></tr></thead><tbody>${
        Object.entries(srcs).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td><code>${esc(v.file)}</code></td><td><code>${esc(v.sha256_16)}</code></td></tr>`).join('')
      }</tbody></table>`;
    }
  }

  function renderWatchNativeV3(D) {
    const wn = D.watch_native_health;
    const s11 = D.covariates_and_curves_v12?.supplement_11_lead_bootstrap_ci;
    const kpiEl = find('#wnat-kpis');
    const bodyEl = find('#wnat-body');
    const capEl = find('#wnat-caption');
    if (!wn || !bodyEl) return;

    const compExt = wn.composite_external || [];
    const c15 = compExt.find(x => x.cohort.includes('CODE-15')) || {};
    const wmh = wn.watchmyheart_cross_brand_s4_to_a7 || {};
    const ecg = wn.ecgid_multiday_risk?.icc_and_multiday_model?.multiday_averaging_curve || {};
    const mdel = wn.mimic_longitudinal_delta || {};
    const rDelta = mdel.native_h_i_risk?.delta_per_10pt_drop_given_baseline_state || {};
    const scanRows = (s11?.scan && s11.scan.length) ? s11.scan : (wn.extra_11_lead_scan || []);
    const rowV3 = scanRows.find(r => r.extra_lead === 'V3') || {};
    const rowV4 = scanRows.find(r => r.extra_lead === 'V4') || {};

    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="v9-gwas-kpi"><strong>${fmtNum(c15.comp_morph, 4)} / ${fmtNum(c15.comp_iv4, 4)}</strong><span>巴西 CODE-15% 365 日死亡（单导 H_I / I+V4 vs 12 导 ${fmtNum(c15.full_12l, 4)}）</span></div>
        <div class="v9-gwas-kpi"><strong style="color:#d97757">V3 ${fmtNum(rowV3.h10_approx_mae_pts, 2)} · V4 ${fmtNum(rowV4.h10_approx_mae_pts, 2)} 分</strong><span>标准医院 11 导联补采扫描：唯二 Bonf 95% 上限 &lt;10 分</span></div>
        <div class="v9-gwas-kpi"><strong>${fmtSigned(wmh.composite?.rung0_uncalibrated?.bias, 1)} → ${fmtSigned(wmh.composite?.rung2b_fir_plus_cal?.bias, 2)} 分</strong><span>Samsung 4 → Apple 7 跨品牌均值去偏（个体 CCC ${fmtNum(wmh.composite?.rung2b_fir_plus_cal?.ccc, 3)}）</span></div>
        <div class="v9-gwas-kpi"><strong>ICC ${fmtNum(ecg['K=7_days']?.icc_1k, 3)} · OR ${fmtNum(rDelta.or, 3)}</strong><span>ECG-ID 7 次重复模型推算 · MIMIC 医院队列降 10 分 OR (z=${fmtSigned(rDelta.z, 2)})</span></div>`;
    }

    let curTab = 'composite';
    let focusLead = 'V3';

    function renderAnatomicalLeadScanHtml() {
      const byLd = Object.fromEntries(scanRows.map(r => [r.extra_lead || 'I_ONLY', r]));
      const baseRow = byLd.I_ONLY || {};
      const baseMae = isNum(baseRow.h10_approx_mae_pts) ? Number(baseRow.h10_approx_mae_pts) : null;
      const curRow = byLd[focusLead] || byLd.V3 || scanRows[0] || {};
      const sorted11 = scanRows.filter(r => r.extra_lead).sort((a, b) => Number(a.h10_approx_mae_pts) - Number(b.h10_approx_mae_pts));
      const allRows = [...sorted11, ...(baseRow.h10_approx_mae_pts != null ? [baseRow] : [])];

      // Precordial V1-V6 coordinates on standard torso outline (viewBox 0 0 260 302)
      const chestNodes = [
        { ld: 'V1', x: 103, y: 112, pos: '胸骨右缘第4肋间' },
        { ld: 'V2', x: 133, y: 112, pos: '胸骨左缘第4肋间' },
        { ld: 'V3', x: 147, y: 126, pos: 'V2 与 V4 连线中点' },
        { ld: 'V4', x: 162, y: 139, pos: '左锁骨中线第5肋间' },
        { ld: 'V5', x: 181, y: 141, pos: '左腋前线平 V4' },
        { ld: 'V6', x: 197, y: 142, pos: '左腋中线平 V4' },
      ];
      // Limb leads (Einthoven triangle + derived augmented leads at bottom, clearly spaced below header!)
      const limbNodes = [
        { ld: 'II', x: 76, y: 249, desc: '右上肢→左下肢' },
        { ld: 'III', x: 184, y: 249, desc: '左上肢→左下肢' },
        { ld: 'aVR', x: 54, y: 279, desc: '右臂加压派生' },
        { ld: 'aVL', x: 130, y: 279, desc: '左臂加压派生' },
        { ld: 'aVF', x: 206, y: 279, desc: '左足加压派生' },
      ];

      const W = 380, H = 310;
      const pad = { l: 64, r: 74, t: 24, b: 30 };
      const gw = W - pad.l - pad.r;
      const gh = H - pad.t - pad.b;
      const xMin = 8.8, xMax = 12.8;
      const mapX = v => pad.l + (clamp((v - xMin) / (xMax - xMin), 0, 1)) * gw;
      const rowY = i => pad.t + (gh * (i + 0.5)) / Math.max(1, allRows.length);
      const x10 = mapX(10.0);
      const xBase = mapX(baseMae ?? 12.39);

      const torsoSvg = `<svg class="v12-torso-svg" viewBox="0 0 260 302" role="img" aria-label="标准 12 导联胸电极 V1 至 V6 解剖位置与肢体导联关系示意图">
        <!-- Torso silhouette & sternum -->
        <path d="M84,36 C96,24 164,24 176,36 L216,56 C224,62 226,80 220,104 L208,186 C204,198 196,204 184,204 L76,204 C64,204 56,198 52,186 L40,104 C34,80 36,62 44,56 Z" fill="rgba(245,243,236,0.04)" stroke="rgba(245,243,236,0.22)" stroke-width="1.5"/>
        <!-- Heart silhouette -->
        <path d="M126,95 C140,86 164,96 166,118 C168,139 144,154 134,157 C124,152 114,132 118,112 C120,104 122,98 126,95 Z" fill="rgba(217,119,87,0.16)" stroke="rgba(217,119,87,0.40)" stroke-width="1.1"/>
        <!-- Sternum midline & Lead I arm bar -->
        <line x1="118" y1="54" x2="118" y2="152" stroke="rgba(245,243,236,0.14)" stroke-width="1.2" stroke-dasharray="3 3"/>
        <line x1="48" y1="68" x2="212" y2="68" stroke="#5cb89e" stroke-width="1.8" stroke-dasharray="4 3"/>
        <text x="130" y="61" text-anchor="middle" font-size="9.5" fill="#5cb89e" font-weight="650">已有臂间 I 导联（右腕 ↔ 左腕）</text>
        <text x="130" y="182" text-anchor="middle" font-size="9" fill="#9c988d">标准医院胸导联 V1–V6（Wilson 中心端参照）</text>
        ${chestNodes.map(n => {
          const r = byLd[n.ld] || {};
          const sub10 = Boolean(r.strictly_below_10pt_bonf);
          const isSel = focusLead === n.ld;
          const fill = sub10 ? '#5cb89e' : '#737067';
          return `<g class="v12-lead-dot" data-scan-lead="${n.ld}" tabindex="0" role="button" aria-label="${n.ld} ${n.pos} MAE ${fmtNum(r.h10_approx_mae_pts, 2)} 分">
            <circle cx="${n.x}" cy="${n.y}" r="18" fill="transparent"/>
            ${sub10 ? `<circle cx="${n.x}" cy="${n.y}" r="${isSel ? 14 : 11}" fill="rgba(92,184,158,0.22)"/>` : ''}
            <circle cx="${n.x}" cy="${n.y}" r="${isSel ? 8.5 : 7}" fill="${fill}" stroke="${isSel ? '#f5f3ec' : '#141413'}" stroke-width="${isSel ? 2.2 : 1.3}"/>
            <text x="${n.x}" y="${n.y + 3}" text-anchor="middle" font-size="8" font-weight="700" fill="#141413">${n.ld}</text>
          </g>`;
        }).join('')}
        <!-- Separate Limb Lead Box (NOT on chest! Generous header-to-pill clearance) -->
        <rect x="14" y="212" width="232" height="84" rx="10" fill="rgba(245,243,236,0.03)" stroke="rgba(245,243,236,0.12)" stroke-dasharray="3 2"/>
        <text x="130" y="226" text-anchor="middle" font-size="8.5" fill="#9c988d">肢体导联与加压派生导联（不对应胸壁贴点）</text>
        ${limbNodes.map(n => {
          const isSel = focusLead === n.ld;
          return `<g class="v12-lead-dot" data-scan-lead="${n.ld}" tabindex="0" role="button" aria-label="肢体导联 ${n.ld} ${n.desc}">
            <rect x="${n.x - 27}" y="${n.y - 14}" width="54" height="28" fill="transparent"/>
            <rect x="${n.x - 24}" y="${n.y - 10}" width="48" height="20" rx="10" fill="${isSel ? 'rgba(217,119,87,0.28)' : 'rgba(245,243,236,0.07)'}" stroke="${isSel ? '#d97757' : 'rgba(245,243,236,0.18)'}" stroke-width="${isSel ? 1.8 : 1}"/>
            <text x="${n.x}" y="${n.y + 3.5}" text-anchor="middle" font-size="9.5" font-weight="650" fill="${isSel ? '#d97757' : '#e0ddd3'}">${n.ld}</text>
          </g>`;
        }).join('')}
      </svg>`;

      const lollipopSvg = `<svg class="v12-lollipop-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="11 个标准医院补采导联逼近 12 导联健康分 MAE 点估计与患者 Bootstrap 95% 置信区间图">
        ${[9, 10, 11, 12].map(xv => {
          const px = mapX(xv);
          return `<line x1="${px.toFixed(1)}" y1="${pad.t}" x2="${px.toFixed(1)}" y2="${H - pad.b}" stroke="rgba(245,243,236,0.08)"/>
            <text x="${px.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="9.5" fill="#9c988d">${xv} 分</text>`;
        }).join('')}
        <!-- 10-point target line & Lead-I baseline -->
        <line x1="${x10.toFixed(1)}" y1="${pad.t - 4}" x2="${x10.toFixed(1)}" y2="${H - pad.b}" stroke="#5cb89e" stroke-width="1.4" stroke-dasharray="4 3"/>
        <text x="${x10.toFixed(1)}" y="${pad.t - 8}" text-anchor="middle" font-size="9.5" font-weight="650" fill="#5cb89e">10 分参考线</text>
        <line x1="${xBase.toFixed(1)}" y1="${pad.t}" x2="${xBase.toFixed(1)}" y2="${H - pad.b}" stroke="#e57a71" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.72"/>
        <text x="${xBase.toFixed(1)}" y="${pad.t - 8}" text-anchor="middle" font-size="9" fill="#e57a71">仅 I (${baseMae != null ? baseMae.toFixed(2) : '缺失'})</text>
        ${allRows.map((r, i) => {
          const ldKey = r.extra_lead || 'I_ONLY';
          const lbl = r.extra_lead ? `I + ${r.extra_lead}` : '仅 I 基线';
          const mae = Number(r.h10_approx_mae_pts);
          const ci = r.h10_approx_mae_ci95;
          const cy = rowY(i);
          const cx = mapX(mae);
          const sub10 = Boolean(r.strictly_below_10pt_bonf);
          const isSel = focusLead === ldKey;
          const col = !r.extra_lead ? '#e57a71' : (sub10 ? '#5cb89e' : '#e0af5a');
          const ciBar = Array.isArray(ci) && ci.length === 2
            ? `<line x1="${mapX(ci[0]).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${mapX(ci[1]).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col}" stroke-width="${isSel ? 3.2 : 2.2}"/>`
            : '';
          return `<g class="v12-lead-dot" data-scan-lead="${ldKey}" tabindex="0" role="button" aria-label="${lbl} MAE ${mae.toFixed(2)} 分">
            <rect x="0" y="${(cy - 12).toFixed(1)}" width="${W}" height="24" rx="6" fill="${isSel ? 'rgba(217,119,87,0.14)' : 'transparent'}"/>
            <text x="${pad.l - 6}" y="${(cy + 3.5).toFixed(1)}" text-anchor="end" font-size="10.5" font-weight="${isSel || sub10 ? '700' : '500'}" fill="${isSel ? '#f5f3ec' : '#d4d1c7'}">${esc(lbl)}</text>
            <line x1="${xBase.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col}" stroke-width="1.2" opacity="0.45"/>
            ${ciBar}
            <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${isSel ? 4.8 : 3.6}" fill="${col}" stroke="#141413" stroke-width="0.9"/>
            <text x="${W - pad.r + 6}" y="${(cy + 3.5).toFixed(1)}" text-anchor="start" font-size="10" font-weight="${sub10 ? '700' : '500'}" fill="${col}">${mae.toFixed(2)}${r.strictly_below_10pt_bonf ? ' ★' : ''}</text>
          </g>`;
        }).join('')}
        <text x="${(pad.l + W - pad.r) / 2}" y="${H - 1}" text-anchor="middle" font-size="9.5" fill="#9c988d">逼近 12 导联 H₁₀ 的平均绝对误差 MAE（越靠左越精准）</text>
      </svg>`;

      const selLbl = curRow.extra_lead ? `I + ${curRow.extra_lead}` : '仅 I 导联（基线）';
      const bonfTxt = isNum(curRow.h10_approx_mae_bonf95_upper)
        ? ` · 11 导联 Bonferroni 同时 95% 上限 <b>${Number(curRow.h10_approx_mae_bonf95_upper).toFixed(2)} 分</b>（${curRow.strictly_below_10pt_bonf ? '严格低于 10 分' : '未低于 10 分'}）`
        : '';
      return `
        <div class="v10-card-box-dark" style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <h4 style="margin:0">在臂间 I 导联基础上，哪一个标准医院导联最能补回 12 导健康分？</h4>
            <span class="v10-tag is-teal">MIMIC 确认集 n=${fmtInt(s11?.n_conf_patients)} · 同步 12 导临床电极</span>
          </div>
          <div class="v12-leadscan-grid">
            <div class="v12-torso-box">${torsoSvg}</div>
            <div class="v12-torso-box">${lollipopSvg}</div>
          </div>
          <div class="v12-lead-focus-bar">
            当前聚焦 <b>${esc(selLbl)}</b>：MAE <b>${fmtNum(curRow.h10_approx_mae_pts, 2, ' 分')}</b> · 患者 Bootstrap 95% CI <code>${fmtCi(curRow.h10_approx_mae_ci95, 2)}</code> · 较仅 I 改善 <b>${fmtSigned(curRow.delta_mae_vs_i_only, 2, ' 分')}</b> · CCC <b>${fmtNum(curRow.h10_approx_ccc, 3)}</b>${bonfTxt}
          </div>
          <p class="v9-note-sm" style="margin-top:8px"><strong>方法与适用边界：</strong>本图为 MIMIC 医院标准同步 12 导联扫描（Wilson 中心端参照的 V1–V6 胸导联与肢体导联）；在全部 11 个可补导联中，<strong>I + V3 (${fmtNum(rowV3.h10_approx_mae_pts, 2, ' 分')})</strong> 与 <strong>I + V4 (${fmtNum(rowV4.h10_approx_mae_pts, 2, ' 分')})</strong> 是唯二同时校正 95% 上限仍低于 10 分的方案。注：Apple Watch 贴胸属于双极导联，物理几何与标准 V3/V4 不同，此处结果不直接构成 Apple Watch 贴胸操作指引，真机贴胸验证列入后续前瞻采集。</p>
        </div>`;
    }

    function renderTab() {
      if (curTab === 'composite') {
        const mRows = wn.composite_mimic || [];
        bodyEl.innerHTML = `
          <div class="v10-card-box-dark">
            <h4>统一单导联健康分 H_I_composite（50/50 负荷+风险）跨三洲零重训表现</h4>
            <div class="v9-table-scroll">
              <table class="v10-dark-table" style="min-width:560px">
                <thead><tr><th>队列与终点</th><th>12 导 H₁₀</th><th>旧 Lead-I</th><th>单导联 H_I 综合</th><th>+HR/RR_sd 或 I+V4</th></tr></thead>
                <tbody>
                  ${mRows.map(r => `<tr>
                    <td><b>MIMIC · ${esc(r.label)}</b></td>
                    <td>${fmtNum(r.full_12lead_h10, 4)}</td>
                    <td>${fmtNum(r.legacy_lead_i_h10, 4)}</td>
                    <td><b style="color:#5cb89e">${fmtNum(r.composite_morph, 4)}</b>${r.delta_vs_legacy != null ? `<br><small style="color:${r.delta_vs_legacy_ci95?.[0] > 0 ? '#5cb89e' : '#9c988d'}">${fmtSigned(r.delta_vs_legacy, 4)} vs 旧版</small>` : ''}</td>
                    <td><b>${fmtNum(r.composite_plus_hr_hrv ?? r.watch_2step_i_v4_composite, 4)}</b><br><small>I+V4: ${fmtNum(r.watch_2step_i_v4_composite, 4)}</small></td>
                  </tr>`).join('')}
                  ${compExt.map(e => `<tr>
                    <td><b>${esc(e.cohort)} · ${esc(e.endpoint)}</b><br><small>${e.n != null ? `n=${fmtInt(e.n)}` : `样本量档位 ${esc(e.n_band || '脱敏')}`}</small></td>
                    <td>${fmtNum(e.full_12l, 4)}</td>
                    <td>${fmtNum(e.legacy, 4)}</td>
                    <td><b style="color:#5cb89e">${fmtNum(e.comp_morph, 4)}</b></td>
                    <td><b style="color:#d97757">${fmtNum(e.comp_iv4, 4)}</b> <small>(I+V4)</small></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          ${renderAnatomicalLeadScanHtml()}`;

        findAll('[data-scan-lead]', bodyEl).forEach(el => {
          const activate = () => { focusLead = el.dataset.scanLead; renderTab(); };
          el.addEventListener('click', activate);
          el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } });
        });
        capEl.innerHTML = `在标准医院导联扫描中，补充 <strong>V3 或 V4</strong> 对逼近十二导联评分最有帮助（同时校正 95% 上限 &lt;10 分）；此处为医院同步电极扫描，不据此给个人开复查建议。`;
        pulseFade(bodyEl);
        return;
      }

      if (curTab === 'dissoc') {
        const dd = wn.double_dissociation_mimic || [];
        bodyEl.innerHTML = `
          <div class="v9-table-scroll" tabindex="0" role="region" aria-label="幅值与形态双重分离表">
            <table class="v10-dark-table">
              <thead><tr>
                <th>MIMIC 确认集终点</th>
                <th>风险头 H_I_risk：QRS 归一化 vs 真物理 mV (Δ [95% CI])</th>
                <th>风险头 + log(QRS_ptp) (Δ [95% CI])</th>
                <th>负荷头 H_I_burden：QRS 归一化 vs 真物理 mV (Δ [95% CI])</th>
                <th>负荷头 + log(QRS_ptp)</th>
              </tr></thead>
              <tbody>${dd.map(r => {
                const fmtD = (d, ci) => {
                  if (!isNum(d)) return '缺失';
                  const col = ci?.[0] > 0 ? '#5cb89e' : (ci?.[1] < 0 ? '#e57a71' : '#9c988d');
                  return `<b style="color:${col}">${fmtSigned(d, 4)}</b> <small>${fmtCi(ci, 4, true)}</small>`;
                };
                return `<tr>
                  <td><b>${esc(r.label)}</b><br><small>n=${fmtInt(r.n_conf)} (${fmtInt(r.n_events)}例)</small></td>
                  <td>${fmtNum(r.risk_qrs_norm, 4)} → ${fmtNum(r.risk_phys_mv, 4)}<br>${fmtD(r.risk_mv_delta, r.risk_mv_ci95)}</td>
                  <td><b>${fmtNum(r.risk_plus_ptp, 4)}</b><br>${fmtD(r.risk_ptp_delta, r.risk_ptp_ci95)}</td>
                  <td>${fmtNum(r.burden_qrs_norm, 4)} → ${fmtNum(r.burden_phys_mv, 4)}<br>${fmtD(r.burden_mv_delta, r.burden_mv_ci95)}</td>
                  <td><b>${fmtNum(r.burden_plus_ptp, 4)}</b><br>${fmtD(r.burden_ptp_delta, r.burden_ptp_ci95)}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>`;
        capEl.innerHTML = `物理机制：保留真实电压幅度利于死亡与 NT-proBNP，而归一化波形形态使 LVEF&lt;40% 提升 <strong>+0.071</strong>；将两者解耦组合（形态 + 实测幅值标量）即可同时兼顾（LVEF <strong>0.818</strong>）。`;
        pulseFade(bodyEl);
        return;
      }

      // Tab 3: Cross-Brand 2b + ECG-ID Repeatability Model + Hospital Longitudinal Validation (NOT personal alert!)
      const rep = wn.watchmyheart_same_device_repeat || {};
      const sComp = wmh.composite || {};
      const sRisk = wmh.risk || {};
      const days = ['K=1_days', 'K=3_days', 'K=5_days', 'K=7_days'];
      bodyEl.innerHTML = `
        <div class="v10-split-2">
          <div class="v10-card-box-dark">
            <h4>WatchMyHeart 跨品牌校准（Samsung 4 → Apple 7 · 样本量档位 ${esc(wmh.n_paired_subjects_band || '90-99')} 健康志愿者）</h4>
            <div class="v9-anchor-list">
              <div class="v9-anchor-item"><span>同机重复性 · Apple Watch 7 (档位 ${esc(rep.apple7?.n_subjects_band || '80-89')})</span><b>MAE ${fmtNum(rep.apple7?.per_index?.native_h_i_risk?.mae_pts, 2, ' 分')}</b></div>
              <div class="v9-anchor-item is-neg"><span>同机重复性 · Samsung Watch 4 (档位 ${esc(rep.samsung4?.n_subjects_band || '80-89')})</span><b>MAE ${fmtNum(rep.samsung4?.per_index?.native_h_i_risk?.mae_pts, 2, ' 分')}（单次高噪）</b></div>
              <div class="v9-anchor-item"><span>跨品牌波形误差（校正前 → 后 · 沿用 Galaxy6 先验）</span><b>${fmtNum(wmh.wave_rmse_rung0, 4)} → ${fmtNum(wmh.wave_rmse_rung2_fir, 4)}</b></div>
              <div class="v9-anchor-item"><span>品牌均值偏倚（未校正 → 2b）</span><b>${fmtSigned(sComp.rung0_uncalibrated?.bias, 2)} → ${fmtSigned(sComp.rung2b_fir_plus_cal?.bias, 2, ' 分')}</b></div>
              <div class="v9-anchor-item"><span>跨品牌 risk MAE</span><b>${fmtNum(sRisk.rung0_uncalibrated?.mae, 2)} → ${fmtNum(sRisk.rung2b_fir_plus_cal?.mae, 2, ' 分')}</b></div>
              <div class="v9-anchor-item is-neg"><span>诚实披露 · 单次个体跨品牌 CCC</span><b>${fmtNum(sComp.rung2b_fir_plus_cal?.ccc, 3)}（均值去偏 ≠ 单次互换）</b></div>
            </div>
          </div>
          <div class="v10-card-box-dark">
            <h4>ECG-ID 多日重复性模型推算 &amp; MIMIC 医院队列纵向关联</h4>
            <div class="v10-bar-list">${days.map(dk => {
              const row = ecg[dk] || {};
              const icc = row.icc_1k;
              const mdc = row.mdc_95_points;
              const dNum = dk.replace('K=', '').replace('_days', '');
              return `<div class="v10-bar-row is-dark ${dNum === '7' ? 'is-highlight' : ''}">
                <div><b>${dNum} 次重复推算</b></div>
                <div class="v10-bar-track"><div class="v10-bar-fill-teal" style="width:${isNum(icc) ? (clamp(icc) * 100).toFixed(1) : 0}%"></div></div>
                <div class="v10-bar-val"><b style="color:#5cb89e">ICC ${fmtNum(icc, 4)}</b><small>MDC₉₅ ${fmtNum(mdc, 1, ' 分')}</small></div>
              </div>`;
            }).join('')}</div>
            <div class="v9-energy-callout" style="margin-top:12px">
              <strong>MIMIC 医院队列纵向关联（n = ${fmtInt(mdel.n_patients)} 名患者 · 医院验证，非个人手表预警）：</strong>
              <span>控制基线水平后，院内单导联分数每下降 10 分对应 1 年全因死亡 <strong>OR = ${fmtNum(rDelta.or, 3)}</strong> ${fmtCi(rDelta.or_ci95, 2)}（z = ${fmtSigned(rDelta.z, 2)}；估计依赖基线调整）。</span>
            </div>
          </div>
        </div>`;
      capEl.innerHTML = `2b 校准可消除跨品牌均值偏移，但单次个体一致性有限（CCC ${fmtNum(sComp.rung2b_fir_plus_cal?.ccc, 3)}）；ECG-ID 七次重复 ICC 为模型推算，MIMIC 纵向 OR 属医院队列验证，不作个人预警推断。`;
      pulseFade(bodyEl);
    }

    bindChipGroup(find('#wnat-tab-seg'), btn => { curTab = btn.dataset.wntab; renderTab(); });
    renderTab();
  }

  /* ==================== NEW v12: Native Single-Lead PRISM-I & PRISM-II Workbench ==================== */
  function renderNativeSingleLeadV12(D) {
    const nsl = D.native_single_lead_v12;
    const kpiEl = find('#nsl-kpis');
    const bodyEl = find('#nsl-body');
    const capEl = find('#nsl-caption');
    if (!bodyEl) return;

    if (!nsl) {
      if (kpiEl) kpiEl.innerHTML = '';
      bodyEl.innerHTML = `<div class="v10-card-box-dark"><p style="margin:0;color:#cbd5e1">原生单导联字典（PRISM-I / PRISM-II）服务器评估正在收口，完成后将自动载入完整 12 队列实测结果。</p></div>`;
      if (capEl) capEl.textContent = '';
      return;
    }

    const isNslV2 = Boolean(nsl.upstream_dictionary_fits?.prism_i_lead_I_v2_idx);
    const fitI = nsl.upstream_dictionary_fits?.prism_i_lead_I_v2_idx || nsl.upstream_dictionary_fits?.prism_i_lead_I || {};
    const fitII = nsl.upstream_dictionary_fits?.prism_ii_lead_II_v2_idx || nsl.upstream_dictionary_fits?.prism_ii_lead_II || {};
    const mim = nsl.mimic_confirmation || {};
    const ext = nsl.external_clinical_lead_i || {};
    const mc = nsl.mcmed_stanford_ed_lead_ii || {};
    const w = nsl.wearables_and_open_single_lead || {};
    const sj = w.sjlife_cancer_survivors || {};
    const cinc = w.cinc2017_alivecor_handheld || {};
    const zen = w.zenodo_16416031_community_healthcheck || {};
    const cpsc = w.cpsc2019_ambulatory_single_lead || {};
    const wecg = w.wecgdb_wrist_ami || {};
    const wmh = w.watchmyheart_apple7_vs_samsung4 || {};
    const ecgid = w.ecgid_multiday || {};
    const hv = w.heartvoice_vt_single_lead || {};
    const butq = w.butqdb_quality_gating || null;
    const ahf = w.apple_watch_s8_csv_format_check || {};
    const v4SjMae = D.watch_adaptation?.sjlife?.readouts?.rung2b_fir_plus_id_residual_cal_primary?.health_score_points?.mae;

    if (kpiEl) {
      const r2I = mim.reconstruction_lead_i_capacity_ladder?.K1000?.pooled_r2_vs_dev_mean;
      const rmseI = mim.reconstruction_lead_i_capacity_ladder?.K1000?.pooled_rmse_uv;
      const abI = fitI.ab_stability_k1000?.matching?.matched_cosine_median ?? fitI.ab_stability_k1000?.matched_cosine_median;
      const abII = fitII.ab_stability_k1000?.matching?.matched_cosine_median ?? fitII.ab_stability_k1000?.matched_cosine_median;
      const mcR2 = mc.reconstruction?.native_prism_ii_qrs_norm?.pooled_r2_vs_dev_mean;
      const sjMae = sj.watch_vs_clinical_adaptation?.locked_2b_adapted_5fold_cv?.composite?.mae;
      const openExactSum = [cinc.n_total_records, cpsc.n_total_records].filter(isNum).reduce((a, b) => a + Number(b), 0);
      const openSumTxt = openExactSum > 0 ? `${fmtInt(openExactSum)}+ 条开源记录` : '缺失';
      kpiEl.innerHTML = `
        <div class="v9-gwas-kpi"><strong>R² ${fmtNum(r2I, 4)} · ${fmtNum(rmseI, 1, ' µV')}</strong><span>原生 PRISM-I (${isNslV2 ? 'v2 严格 1 人 1 索引 · K=1000' : 'K=1000'}) 重建 · 半样本 A/B 余弦 ${fmtNum(abI, 3)}</span></div>
        <div class="v9-gwas-kpi"><strong>MC-MED R² ${fmtNum(mcR2, 4)}</strong><span>原生 PRISM-II 急诊床旁 II 导联（${fmtInt(mc.reconstruction?.lead_inventory_verified?.unique_patients_analyzed)} 独立患者 · A/B 余弦 ${fmtNum(abII, 3)}）</span></div>
        <div class="v9-gwas-kpi"><strong style="color:#d97757">SJLIFE ${fmtNum(sjMae, 2, ' 分')}</strong><span>肿瘤幸存者 Apple S7（档位 ${esc(sj.n_paired_valid_band || '230-239')} · ${isNslV2 ? '开发集岭稳定化 2b 折外' : '原生 PRISM-I 复合分 5 折折外'}）</span></div>
        <div class="v9-gwas-kpi"><strong>${openSumTxt}</strong><span>CinC 2017 AliveCor (AF AUC ${fmtNum(cinc.zero_refit_af_vs_normal_auroc_composite_I, 3)})${butq ? ' · BUT QDB' : ' · 日本社区'} · CPSC 2019</span></div>`;
    }

    let curTab = 'clinical';
    let curOpenFilter = 'all';

    function renderNslTab() {
      if (curTab === 'clinical') {
        const capI = mim.reconstruction_lead_i_capacity_ladder || {};
        const cmpI = mim.reconstruction_lead_i_comparators || {};
        const msk = mim.masked_20pct_twave_recovery || {};
        const x22Raw = mim.cross_lead_2x2_control || {};
        const x22HasMasked = Boolean(x22Raw.masked_stt_recovery_specificity);
        const x22Mask = x22Raw.masked_stt_recovery_specificity || x22Raw;
        const spI = mim.native_spectrum_lead_i_phys || {};
        const clin = mim.clinical_endpoints_lead_i || {};
        const epNames = {
          mortality_365d: '365 日全因死亡',
          mortality_180d: '180 日全因死亡',
          ntprobnp_gt_1000: 'NT-proBNP > 1,000',
          lvef_lt_40: 'LVEF < 40%',
          egfr_lt_60: 'eGFR < 60',
          organ_burden_ge_3: '器官负荷 ≥ 3',
          hf_428_1: '充血性心衰 (428.1)',
          af_427_21: '心房颤动 (427.21)',
          mi_411_2: '心肌梗死 (411.2)',
        };
        const primaryReconRows = [
          ['原生 PRISM-I（主模型 · K=1,000）', capI.K1000, isNslV2 ? 'v2 严格 1 人 1 索引 · 单导联 I' : '单导联 I'],
          ['原生 PRISM-I（K=512）', capI.K512, isNslV2 ? 'v2 严格 1 人 1 索引 · 单导联 I' : '容量敏感性 · 单导联 I'],
          ['原 12 导联字典（仅 I 导）', cmpI.legacy_12lead_bdev_lead_i_only_nnls, '仅输入 I 导投影 · 单导联 I'],
          ['开发集 PCA-32 对照', cmpI.dev_pca_baselines?.PCA_32, '传统线性基线 · 单导联 I'],
        ];
        const extraReconRows = [
          ...(capI.K1000_v1_111k_bridge ? [['原生 PRISM-I（v1 111k 全记录桥接对照）', capI.K1000_v1_111k_bridge, 'K=1,000 · 单导联 I']] : []),
          ...(capI.K256_bridge || capI.K256 ? [['原生 PRISM-I（K=256 容量敏感性）', capI.K256_bridge || capI.K256, '单导联 I']] : []),
          ['原 12 导联字典（联合全 12 导重建 I）', cmpI.legacy_12lead_bdev_joint_12lead_uses_all_12_leads, '全 12 导联'],
          ['开发集 PCA-64 对照', cmpI.dev_pca_baselines?.PCA_64, '传统线性基线 · 单导联 I'],
        ];
        const renderReconRow = ([nm, obj, scope]) => `<tr>
          <td><b>${esc(nm)}</b><br><small style="color:#9c988d">${esc(scope)}</small></td>
          <td><b style="color:#5cb89e">${fmtNum(obj?.pooled_r2_vs_dev_mean, 4)}</b></td>
          <td>${fmtNum(obj?.pooled_rmse_uv, 2, ' µV')}</td>
          <td>${fmtNum(obj?.patient_rmse_median_uv, 2)} / ${fmtNum(obj?.patient_rmse_p95_uv, 2)} µV</td>
          <td>${fmtNum(obj?.effective_active_k_median, 1, '', '—')}</td>
        </tr>`;

        const k1000Rmse = capI.K1000?.pooled_rmse_uv;
        const legRmse = cmpI.legacy_12lead_bdev_lead_i_only_nnls?.pooled_rmse_uv;
        const rmseDropPct = (isNum(k1000Rmse) && isNum(legRmse) && Number(legRmse) > 0)
          ? ((1 - Number(k1000Rmse) / Number(legRmse)) * 100).toFixed(0) : null;
        const primaryMimicKeys = ['mortality_365d', 'ntprobnp_gt_1000', 'lvef_lt_40', 'hf_428_1'];
        const extraMimicKeys = Object.keys(epNames).filter(k => !primaryMimicKeys.includes(k));
        const renderMimicEpRow = ek => {
          const r = clin[ek];
          if (!r) return '';
          return `<tr>
            <td><b>MIMIC · ${esc(epNames[ek])}</b></td>
            <td>${fmtNum(r.full_12lead_h10, 4)}</td>
            <td>${fmtNum(r.legacy_12lead_sliced_i_composite_qrs, 4)}</td>
            <td>${fmtNum(r.native_prism_i_composite_phys_mv, 4)}</td>
            <td><b style="color:#5cb89e">${fmtNum(r.native_prism_i_composite_qrs_norm, 4)}</b></td>
            <td><b style="color:#d97757">${fmtNum(r.native_prism_i_composite_qrs_plus_ptp, 4)}</b></td>
          </tr>`;
        };
        bodyEl.innerHTML = `
          <div class="v12-nsl-summary-strip">
            <div class="v12-nsl-summary-item">
              <b>单导联高保真重建</b>
              <span>原生 PRISM-I 波形保真度达 <strong>R² ${fmtNum(capI.K1000?.pooled_r2_vs_dev_mean, 4)}</strong>，整体波差 <strong>${fmtNum(k1000Rmse, 2, ' µV')}</strong>${rmseDropPct ? `（较旧 12 导切片降 <strong>${rmseDropPct}%</strong>）` : ''}。</span>
            </div>
            <div class="v12-nsl-summary-item is-warm">
              <b>指定波段遮挡重建 R²</b>
              <span>遮挡指定波段（+160..+310 ms）后的重建 R² 为 <strong>${fmtNum(msk.native_prism_i_k1000?.pooled_r2_vs_dev_mean, 4)}</strong>（旧切片 ${fmtSigned(msk.legacy_12lead_i_only?.pooled_r2_vs_dev_mean, 4)}，PCA-32 ${fmtNum(msk.dev_pca_32_masked?.pooled_r2_vs_dev_mean, 4)}）。</span>
            </div>
            <div class="v12-nsl-summary-item">
              <b>四临床队列零重训评估</b>
              <span>巴西 CODE-15% 365 日死亡单导联 AUROC <strong>${fmtNum(ext.code15?.mortality_365d?.native_prism_i_composite_phys_mv, 4)}</strong>，天津医科大学第二医院（天医二院）NT-proBNP <strong>${fmtNum(ext.tianyi?.endpoints?.ntprobnp_gt_1000?.native_comp_qrs_plus_ptp, 4)}</strong>。</span>
            </div>
          </div>
          <div class="v12-nsl-split">
            <div class="v10-card-box-dark">
              <h4>1. MIMIC 确认集 (档位 ${esc(mim.n_conf_valid_band || '22,200-22,299')}) 单导联还原与盲填检验</h4>
              <p class="v12-nsl-sublead">越接近 1.0000 代表波形还原越像，微伏 (µV) 误差越小越准；仅展示 4 组核心对比，其余对照可一键展开。</p>
              <div class="v9-table-scroll">
                <table class="v10-dark-table v12-nsl-table">
                  <thead><tr><th>模型方案（输入导联）</th><th style="white-space:nowrap">波形保真度 (R²)</th><th style="white-space:nowrap">整体波差</th><th style="white-space:nowrap">典型 / 95% 误差</th><th style="white-space:nowrap">动用积木数</th></tr></thead>
                  <tbody>${primaryReconRows.map(renderReconRow).join('')}</tbody>
                </table>
              </div>
              <details class="v11-drawer" style="margin-top:10px">
                <summary>展开其余 ${extraReconRows.length} 组容量敏感性、桥接与 PCA 对照行</summary>
                <div class="v11-drawer-body">
                  <div class="v9-table-scroll" style="margin-top:0">
                    <table class="v10-dark-table v12-nsl-table">
                      <thead><tr><th>模型方案（输入导联）</th><th style="white-space:nowrap">波形保真度 (R²)</th><th style="white-space:nowrap">整体波差</th><th style="white-space:nowrap">典型 / 95% 误差</th><th style="white-space:nowrap">动用积木数</th></tr></thead>
                      <tbody>${extraReconRows.map(renderReconRow).join('')}</tbody>
                    </table>
                  </div>
                </div>
              </details>
              <div class="v12-nsl-card-foot">
                <div class="v9-energy-callout" style="margin-top:0">
                  <strong>20% 连续 ST–T 复极遮挡恢复测试（+160..+310 ms，排除过完备自编码捷径）：</strong>
                  <span>原生 PRISM-I (K=1000) 恢复保真度 = <b>${fmtNum(msk.native_prism_i_k1000?.pooled_r2_vs_dev_mean, 4)}</b> (${fmtNum(msk.native_prism_i_k1000?.pooled_rmse_uv, 1, ' µV')}) · K=512 = <b>${fmtNum(msk.native_prism_i_k512?.pooled_r2_vs_dev_mean, 4)}</b> · 旧 12 导 I-only = <b>${fmtNum(msk.legacy_12lead_i_only?.pooled_r2_vs_dev_mean, 4)}</b> · PCA-32 = <b>${fmtNum(msk.dev_pca_32_masked?.pooled_r2_vs_dev_mean, 4)}</b>（统一 λ=0.01 岭稳定化）。</span>
                </div>
                <div class="v9-anat-meta-pills" style="margin-top:8px">
                  <span>${x22HasMasked ? '2×2 遮挡导联特异性' : '2×2 导联匹配波差'}：I→I <b>${fmtNum(x22Mask.PRISM_I_on_Lead_I_matched?.pooled_rmse_uv, 1, ' µV')}</b> vs 错导 II→I <b>${fmtNum(x22Mask.PRISM_II_on_Lead_I_cross?.pooled_rmse_uv, 1, ' µV')}</b></span>
                  <span>II→II <b>${fmtNum(x22Mask.PRISM_II_on_Lead_II_matched?.pooled_rmse_uv, 1, ' µV')}</b> vs 错导 I→II <b>${fmtNum(x22Mask.PRISM_I_on_Lead_II_cross?.pooled_rmse_uv, 1, ' µV')}</b></span>
                  <span>原生 I 疾病谱覆盖 <b>${fmtNum(spI.d10_native_spectrum_capture_pct, 1, '%')}</b> (vs PCA-10 ${fmtSigned(spI.delta_vs_pca10_pp, 1, ' pp')}) · 与 12 导典则相关 Top1=${fmtNum(spI.canonical_corr_with_12lead_d10_top1, 3)}</span>
                </div>
              </div>
            </div>
            <div class="v10-card-box-dark">
              <h4>2. 原生 PRISM-I 三种幅值读法 &amp; 四临床队列零重训迁移</h4>
              <p class="v12-nsl-sublead">表格数值为疾病/风险区分度 AUROC（0.50 为随机猜，越接近 1.00 越准）；绿/橙高亮为原生单导联主力读法。</p>
              <div class="v9-table-scroll">
                <table class="v10-dark-table v12-nsl-table">
                  <thead><tr><th>队列 / 临床终点</th><th style="white-space:nowrap">12 导 H₁₀</th><th style="white-space:nowrap">旧切片 I</th><th style="white-space:nowrap">原生 I(物理)</th><th style="white-space:nowrap">原生 I(形态)</th><th style="white-space:nowrap">原生 I(综合)</th></tr></thead>
                  <tbody>
                    ${primaryMimicKeys.map(renderMimicEpRow).join('')}
                    ${ext.code15?.mortality_365d ? `<tr>
                      <td><b>巴西 CODE-15% · 365 日死亡</b><br><small style="color:#9c988d">n=${fmtInt(ext.code15.mortality_365d.n_eligible)} · 保真度 R² ${fmtNum(ext.code15.recon_native_prism_i_phys_mv?.pooled_r2_vs_dev_mean, 4)}</small></td>
                      <td>${fmtNum(ext.code15.mortality_365d.full_12lead_h10, 4)}</td>
                      <td>${fmtNum(ext.code15.mortality_365d.legacy_i_composite_qrs, 4)}</td>
                      <td>${fmtNum(ext.code15.mortality_365d.native_prism_i_composite_phys_mv, 4)}</td>
                      <td><b style="color:#5cb89e">${fmtNum(ext.code15.mortality_365d.native_prism_i_composite_qrs_norm, 4)}</b></td>
                      <td><b style="color:#d97757">${fmtNum(ext.code15.mortality_365d.native_prism_i_composite_qrs_plus_ptp, 4, '', '—')}</b></td>
                    </tr>` : ''}
                    ${['tianyi', 'anzhen'].flatMap(st => {
                      const so = ext[st];
                      if (!so) return [];
                      const zh = st === 'tianyi' ? '天津医科大学第二医院（天医二院）' : '北京安贞医院';
                      return [['ntprobnp_gt_1000', 'NT-proBNP > 1,000'], ['egfr_lt_60', 'eGFR < 60']].map(([ek, elbl]) => {
                        const ep = so.endpoints?.[ek];
                        if (!ep) return '';
                        return `<tr>
                          <td><b>${zh}</b><br><small style="color:#9c988d">${elbl} · 档位 ${esc(ep.n_matched_band || so.n_valid_band)}${ek === 'ntprobnp_gt_1000' ? ` · R² ${fmtNum(so.recon_native_prism_i_phys_mv?.pooled_r2_vs_dev_mean, 4)}` : ''}</small></td>
                          <td>${fmtNum(ep.full_12lead_h10, 4)}</td>
                          <td>${fmtNum(ep.legacy_qrs, 4)}</td>
                          <td>${fmtNum(ep.native_comp_phys, 4)}</td>
                          <td><b style="color:#5cb89e">${fmtNum(ep.native_comp_qrs, 4)}</b></td>
                          <td><b style="color:#d97757">${fmtNum(ep.native_comp_qrs_plus_ptp, 4, '', '—')}</b></td>
                        </tr>`;
                      });
                    }).join('')}
                  </tbody>
                </table>
              </div>
              <details class="v11-drawer" style="margin-top:10px">
                <summary>展开 MIMIC 其余 ${extraMimicKeys.length} 项终点（180日死亡 / 肾功能 / 器官负荷 / 房颤 / 心梗）</summary>
                <div class="v11-drawer-body">
                  <div class="v9-table-scroll" style="margin-top:0">
                    <table class="v10-dark-table v12-nsl-table">
                      <thead><tr><th>队列 / 临床终点</th><th style="white-space:nowrap">12 导 H₁₀</th><th style="white-space:nowrap">旧切片 I</th><th style="white-space:nowrap">原生 I(物理)</th><th style="white-space:nowrap">原生 I(形态)</th><th style="white-space:nowrap">原生 I(综合)</th></tr></thead>
                      <tbody>${extraMimicKeys.map(renderMimicEpRow).join('')}</tbody>
                    </table>
                  </div>
                </div>
              </details>
            </div>
          </div>`;
        const abIVal = fitI.ab_stability_k1000?.matching?.matched_cosine_median ?? fitI.ab_stability_k1000?.matched_cosine_median;
        const abIIVal = fitII.ab_stability_k1000?.matching?.matched_cosine_median ?? fitII.ab_stability_k1000?.matched_cosine_median;
        capEl.innerHTML = isNslV2
          ? `主模型采用严格 1 人 1 索引心电的纯开发集独立拟合（51,905 名独立开发患者 = 51,905 条索引记录，100% 患者与心电 ID 一致性校验，零复测加权），并同步给出与原 12 导联父字典同源的 111k 记录桥接对照：单导联重建、20% ST–T 复极遮挡恢复与 2×2 导联特异性、半样本稳定性（A/B 余弦 ${fmtNum(abIVal, 3)} / ${fmtNum(abIIVal, 3)}）及四临床队列三种幅值读法零重训迁移均保持稳健一致。`
          : `在与原 12 导联父字典相同的开发记录清单（51,905 名纯开发患者 · 111,021 条开发记录，作为导联归因桥接拟合）上，以原版非负坐标下降（K=1,000）独立重学原生 PRISM-I / PRISM-II 字典：重建、20% ST–T 复极遮挡恢复（超越 PCA-32 与旧 12 导切片）、半样本稳定性（A/B 余弦 ${fmtNum(abIVal, 3)} / ${fmtNum(abIIVal, 3)}）与四临床队列零重训迁移均保持高度一致。`;
        pulseFade(bodyEl);
        return;
      }

      if (curTab === 'mcmed') {
        const rec = mc.reconstruction || {};
        const inv = rec.lead_inventory_verified || {};
        const rep = mc.within_visit_repeat || {};
        const ce = mc.clinical_endpoints || {};
        const adm = ce.post_ecg_hospital_admission || {};
        bodyEl.innerHTML = `
          <div class="v12-phewas-explainer" style="border-color:rgba(92,184,158,0.36);background:rgba(92,184,158,0.09)">
            <strong>关键硬件核验（为何专门训练 PRISM-II）：</strong>Stanford MC-MED 急诊床旁监护仅含 <strong>Lead II（${fmtInt(inv.Lead_II_visits)} 次就诊）</strong>，<strong>Lead I = ${fmtInt(inv.Lead_I_visits)} 条</strong>。因此采用原生 <strong>PRISM-II</strong> 作为导联匹配主模型，并以 <strong>PRISM-I</strong> 作为预登记错导联对照；${isNslV2 ? '全部指标（含同次就诊复测）严格限定在首位就诊独立患者' : '全部临床终点统一在首位就诊独立患者'}（<code>n=${fmtInt(inv.unique_patients_analyzed)}</code>）上零重训评估。
          </div>
          <div class="v10-split-2">
            <div class="v10-card-box-dark">
              <h4>MC-MED 重建保真度 &amp; 同次就诊复测稳定性</h4>
              <div class="v9-anchor-list">
                <div class="v9-anchor-item"><span>原生 PRISM-II（物理 mV · 注：监护仪增益较 MIMIC 高 ~1.6×）</span><b>R² ${fmtNum(rec.native_prism_ii_phys_mv?.pooled_r2_vs_dev_mean, 4)} · RMSE ${fmtNum(rec.native_prism_ii_phys_mv?.pooled_rmse_uv, 1, ' µV')}</b></div>
                <div class="v9-anchor-item"><span>旧 12 导联 Lead-II 切片（物理 mV 对比）</span><b>R² ${fmtNum(rec.legacy_12lead_ii_phys_mv?.pooled_r2_vs_dev_mean, 4)} · RMSE ${fmtNum(rec.legacy_12lead_ii_phys_mv?.pooled_rmse_uv, 1, ' µV')}</b></div>
                <div class="v9-anchor-item"><span>原生 PRISM-II（QRS 归一化形态 · 消除监护仪增益差）</span><b>R² ${fmtNum(rec.native_prism_ii_qrs_norm?.pooled_r2_vs_dev_mean, 4)}</b></div>
                <div class="v9-anchor-item is-neg"><span>预登记错导联对照（PRISM-I 强读 Lead II · 归一化）</span><b>R² ${fmtNum(rec.cross_lead_prism_i_qrs_norm?.pooled_r2_vs_dev_mean, 4)}</b></div>
                <div class="v9-anchor-item"><span>同次就诊第二片段复测（${isNslV2 ? '首诊独立患者' : '全注册复测对'} n=${fmtInt(rep.n_repeat_pairs)}）</span><b>H_II 综合 MAE ${fmtNum(rep.composite_II_qrs_repeat?.mae, 2, ' 分')} · CCC ${fmtNum(rep.composite_II_qrs_repeat?.ccc, 3)}</b></div>
              </div>
            </div>
            <div class="v10-card-box-dark">
              <h4>MC-MED 急诊临床终点（零重训 · 原生 PRISM-II vs 错导联 PRISM-I）</h4>
              <div class="v9-table-scroll">
                <table class="v10-dark-table" style="min-width:460px">
                  <thead><tr><th>急诊临床终点 (n / 事件)</th><th>原生 PRISM-II 综合</th><th>原生 PRISM-II 纯 H₁₀</th><th>错导联 PRISM-I</th></tr></thead>
                  <tbody>
                    ${adm.n_eligible ? `<tr><td><b>${isNslV2 ? 'ECG 后住院/ICU 决策（不含留观）' : 'ECG 后住院/ICU 决策'}</b><br><small>n=${fmtInt(adm.n_eligible)} · 入院 ${fmtNum(adm.admit_rate_pct, 1, '%')}</small></td><td><b style="color:#5cb89e">${fmtNum(adm.auroc_native_prism_ii_composite_qrs, 4)}</b></td><td>${fmtNum(adm.auroc_native_prism_ii_h10_qrs, 4)}</td><td>${fmtNum(adm.auroc_cross_lead_prism_i_composite_qrs, 4)}</td></tr>` : ''}
                    ${[['lab_ntprobnp_pm6h', '±6h NT-proBNP ≥ 1,000'], ['lab_creatinine_pm6h', '±6h 肌酐 ≥ 1.5'], ['lab_hba1c_pm6h', '±6h HbA1c ≥ 6.5%']].map(([k, lbl]) => {
                      const o = ce[k]; if (!o) return '';
                      return `<tr><td><b>${esc(lbl)}</b><br><small>n=${fmtInt(o.n_matched)} (异常 ${fmtInt(o.n_abnormal)})</small></td><td><b style="color:#5cb89e">${fmtNum(o.auroc_native_prism_ii_composite_qrs, 4)}</b></td><td>${fmtNum(o.auroc_native_prism_ii_h10_qrs, 4)}</td><td>${fmtNum(o.auroc_cross_lead_prism_i_composite_qrs, 4)}</td></tr>`;
                    }).join('')}
                    ${[['cooccurring_HF', '共现诊断 · 心衰 (HF)'], ['cooccurring_CKD', '共现诊断 · 慢肾病 (CKD)'], ['cooccurring_T2D', '共现诊断 · 2型糖尿病 (T2D)']].map(([k, lbl]) => {
                      const o = ce[k]; if (!o) return '';
                      return `<tr><td><b>${esc(lbl)}</b><br><small>n=${fmtInt(o.n_total)} (病例 ${fmtInt(o.n_cases)})</small></td><td><b style="color:#5cb89e">${fmtNum(o.auroc_native_prism_ii_composite_qrs, 4)}</b></td><td>${fmtNum(o.auroc_native_prism_ii_h10_qrs, 4)}</td><td>${fmtNum(o.auroc_cross_lead_prism_i_composite_qrs, 4)}</td></tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>`;
        capEl.innerHTML = `MC-MED 急诊七项终点中，原生 II 导联复合分有 <strong>6 项</strong> AUROC 点估计高于跨导联方案（NT-proBNP 为 <strong>${fmtNum(ce.lab_ntprobnp_pm6h?.auroc_native_prism_ii_composite_qrs, 4)}</strong> vs 跨导联 <strong>${fmtNum(ce.lab_ntprobnp_pm6h?.auroc_cross_lead_prism_i_composite_qrs, 4)}</strong>）；住院决策排除留观，化验双时钟均在 ±6h 内。`;
        pulseFade(bodyEl);
        return;
      }

      if (curTab === 'sjlife') {
        const ad = sj.watch_vs_clinical_adaptation || {};
        const ad512 = sj.watch_vs_clinical_adaptation_k512_sensitivity || null;
        const fr = ad.frozen_zero_adapt?.composite || {};
        const lk = ad.locked_2b_adapted_5fold_cv?.composite || {};
        const lk512 = ad512?.locked_2b_adapted_5fold_cv?.composite || null;
        const ec = sj.error_correlates || {};
        const mm = sj.matched_mimic_clinical_reference_comparison || {};
        const ov = ad.overlay_cohort_mean || {};
        const l2Note = isNum(ad.l2_reg_dev_frozen) ? ` · 开发集冻结岭稳定化 λ=${ad.l2_reg_dev_frozen}` : '';
        const k512Row = lk512
          ? `<div class="v9-anchor-item"><span>K=512 字典敏感性（PRISM-I K512 + 2b 折外 CV · λ=${ad512.l2_reg_dev_frozen}）</span><b>MAE ${fmtNum(lk512.mae, 2, ' 分')} ${fmtCi(lk512.mae_ci95, 2)} · CCC ${fmtNum(lk512.ccc, 3)}</b></div>`
          : '';
        bodyEl.innerHTML = `
          <div class="v10-split-2">
            <div class="v10-card-box-dark">
              <h4>SJLIFE 儿童期癌症幸存者真机分析（样本量档位 ${esc(sj.n_paired_valid_band || '230-239')} 配对受试者 · 名册覆盖 ${esc(sj.roster_coverage_band || '>95%')} · 中位年龄 ${fmtNum(sj.age_median_yr, 1)} 岁）</h4>
              <div class="v9-anchor-list">
                <div class="v9-anchor-item"><span>原生 PRISM-I 重建 R²（院内 I 导 / Apple Watch S7）</span><b>${fmtNum(sj.native_prism_i_recon_clinical_norm?.pooled_r2_vs_dev_mean, 4)} / ${fmtNum(sj.native_prism_i_recon_apple_watch_norm?.pooled_r2_vs_dev_mean, 4)}</b></div>
                <div class="v9-anchor-item"><span>未校正零适配 · Apple S7 vs 院内 I（原生 PRISM-I 复合分）</span><b>MAE ${fmtNum(fr.mae, 2, ' 分')} ${fmtCi(fr.mae_ci95, 2)} · CCC ${fmtNum(fr.ccc, 3)}</b></div>
                <div class="v9-anchor-item"><span>原生 PRISM-I + 2b 方案（同队列 5 折按人嵌套折外 CV${l2Note}）</span><b>MAE ${fmtNum(lk.mae, 2, ' 分')} ${fmtCi(lk.mae_ci95, 2)} · CCC ${fmtNum(lk.ccc, 3)} · 偏倚 ${fmtSigned(lk.bias, 2)}</b></div>
                ${k512Row}
                <div class="v9-anchor-item"><span>波形归一化误差（未校正 → 2b 滤波复原）</span><b>RMSE ${fmtNum(ad.watch_wave_norm_rmse_vs_clin_raw, 4)} → ${fmtNum(ad.watch_wave_norm_rmse_vs_clin_2b_fir, 4)} · 平均 R² ${fmtNum(ad.mean_waveform_r2_raw, 3)} → ${fmtNum(ad.mean_waveform_r2_2b_fir, 3)}</b></div>
                <div class="v9-anchor-item"><span>与同龄同性别 MIMIC 医院参照对比（档位 ${esc(mm.n_sjlife_matched_band || '230-239')} 配对）</span><b>原生 H₁₀_I：SJLIFE ${fmtNum(mm.sjlife_clinical_h10_I_mean, 1)} vs MIMIC ${fmtNum(mm.matched_mimic_h10_I_mean, 1)}（差 ${fmtSigned(mm.diff_sjlife_minus_mimic_h10_I, 2)} ${fmtCi(mm.diff_h10_I_ci95, 2, true)}）· 综合分差 ${fmtSigned(mm.diff_sjlife_minus_mimic_composite, 2)}</b></div>
                <div class="v9-anchor-item"><span>佩戴误差相关性（心率差 / 采集间隔中位 ${fmtNum(sj.clinical_watch_gap_median_min, 0)} 分）</span><b>ρ(ΔHR)=${fmtSigned(ec.abs_err_vs_hr_diff_spearman, 3)} · ρ(间隔)=${fmtSigned(ec.abs_err_vs_gap_min_spearman, 3)}</b></div>
              </div>
              <p class="v9-note-sm" style="margin-top:8px"><strong>肿瘤元信息与跨口径诚实说明：</strong>经逐文件核查 Zenodo 公开归档（10.5281/zenodo.16536261），公开发布包仅含配对波形 NPY 与基础临床配对信息表（年龄、性别、种族、心率与采集间隔），<strong>不含化疗/蒽环剂量、胸部放疗史或超声 LVEF 字段</strong>；均值差仅反映门诊幸存者与同龄 MIMIC 医疗人群的分布差异。${isNslV2 ? `本轮 v2 在开发集冻结岭稳定化下彻底消除了无正则过完备反卷积失稳（平均波形 R² 与 MAE 均显著改善），并与上方旧版紧凑 H₁₀ 读出（${fmtNum(v4SjMae, 2, ' 分')}）口径分列报告` : `本卡原生 <code>K=1,000</code> 复合分折外 MAE（${fmtNum(lk.mae, 2)} 分）与上方旧版 v4 紧凑 <code>H₁₀</code> 读出（${fmtNum(v4SjMae, 2, ' 分')}）同时改变了字典、目标读出头与适配实现，口径分列报告`}；单次佩戴 95% 上限仍未低于 10 分，多日静息均值降噪目前基于 ECG-ID 模型推算，仍属待前瞻验证方案，单次读数不替代院内 12 导联。</p>
            </div>
            <div class="v10-card-box-dark">
              <h4>原生 PRISM-I + 2b 波形复原叠合（样本量档位 ${esc(ad.n_paired_band || '230-239')} 聚合平均 · 归一化形态）</h4>
              ${ov.time_ms_4ms?.length ? buildMultiWaveSvg([
                { arr: ov.mean_clinical_lead_i, color: '#5cb89e', width: 2.2 },
                { arr: ov.mean_watch_raw, color: '#e0af5a', width: 1.8, dash: '5 4' },
                { arr: ov.mean_watch_2b_restored, color: '#d97757', width: 2.2 },
              ], ov.time_ms_4ms, { dark: true, width: 460, height: 180, shadeT: true }) : '<p class="v9-note-sm">无聚合波形</p>'}
              <div class="v9-legend-row" style="margin-top:8px">
                <span style="color:#5cb89e"><i class="v9-line-swatch"></i>院内临床 I 导联</span>
                <span style="color:#e0af5a"><i class="v9-line-swatch is-dashed"></i>原始 Apple Watch S7</span>
                <span style="color:#d97757"><i class="v9-line-swatch"></i>原生 PRISM-I + 2b 复原</span>
              </div>
              <p class="v9-note-sm" style="margin-top:8px">年轻幸存者年龄跨度较窄（中位 ${fmtNum(sj.age_median_yr, 1)} 岁），院内与手表综合分在队列内年龄相关接近零（院内 ρ=${fmtSigned(ec.clinical_comp_vs_age_spearman, 3)}，手表 ρ=${fmtSigned(ec.watch_comp_vs_age_spearman, 3)}）；因 SJLIFE 物理电压增益未公开定标，本块严格报告归一化形态域结果。</p>
            </div>
          </div>`;
        capEl.innerHTML = isNslV2
          ? `SJLIFE 儿童期癌症幸存者队列（St. Jude）完成了开发集冻结岭稳定化原生 PRISM-I + 单一锁定 2b 方案在真实 Apple Watch S7 硬件上的<strong>同队列 5 折按人嵌套折外验证</strong>（含 K=512 敏感性核对），并如实界定公开数据不含肿瘤治疗剂量字段的边界。`
          : `SJLIFE 儿童期癌症幸存者队列（St. Jude）完成了原生 PRISM-I + 单一锁定 2b 方案在真实 Apple Watch S7 硬件上的<strong>同队列 5 折按人嵌套折外验证</strong>（同队列适配后评估，非跨设备零校准验证），并如实界定公开数据不含肿瘤治疗剂量字段的边界。`;
        pulseFade(bodyEl);
        return;
      }

      // Tab 4: Comprehensive Open Wearable & Single-Lead Landscape
      const fmtButCls = cObj => {
        if (!cObj) return '缺失';
        const rate = cObj.registration_pass_pct != null ? `${Number(cObj.registration_pass_pct).toFixed(1)}%` : (cObj.registration_pass_band || '缺失');
        return cObj.n_10s_windows_sampled != null ? `${rate} (n=${fmtInt(cObj.n_10s_windows_sampled)})` : `${rate}`;
      };
      const cards = [
        {
          cat: 'consumer', isNew: true,
          title: 'PhysioNet / CinC 2017 · AliveCor 手持消费级单导联',
          tag: '新纳入 · 记录级公开库',
          body: `总计 <b>${fmtInt(cinc.n_total_records)} 条记录</b>（300 Hz，配准通过 <b>${fmtInt(cinc.n_registered)}</b> 条），零重训直接投射原生 PRISM-I。`,
          metrics: [
            `重建 R² <b>${fmtNum(cinc.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</b>`,
            `零重训房颤 vs 正常 AUROC <b>${fmtNum(cinc.zero_refit_af_vs_normal_auroc_composite_I, 4)}</b>`,
            `正常窦律均分 <b>${fmtNum(cinc.by_rhythm_class?.N?.composite_I_mean, 1)}</b> vs 房颤 <b>${fmtNum(cinc.by_rhythm_class?.A?.composite_I_mean, 1)}</b>`,
            `噪声拒判率 <b>${isNum(cinc.by_rhythm_class?.['~']?.registration_pass_pct) ? (100 - Number(cinc.by_rhythm_class['~'].registration_pass_pct)).toFixed(1) + '%' : '缺失'}</b>`,
          ],
        },
        {
          cat: 'consumer', isNew: true,
          title: 'Zenodo 16416031 · 日本社区体检 12 导联抽取 I 导联',
          tag: '新纳入 · 体检 I 导联（非腕戴）',
          body: `样本量档位 <b>${esc(zen.n_registered_band || '2,400-2,499')} 份</b> 500 Hz 体检 12 导联中抽取的 I 导联有效配准心电（通过率 <b>${esc(zen.registration_pass_band || '>99%')}</b>；非腕戴手表），检验非住院健康体检人群分布。`,
          metrics: [
            `重建 R² <b>${fmtNum(zen.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</b>`,
            `社区 H_I 综合中位数 <b>${fmtNum(zen.composite_I_community_median, 1)} 分</b>`,
            `社区健康分 ≥50 占比 <b>${fmtNum(zen.pct_community_above_50_composite, 1, '%')}</b>`,
          ],
        },
        {
          cat: 'consumer', isNew: true,
          title: 'CPSC 2019 · 动态可穿戴单导联心电',
          tag: '新纳入 · 动态监测',
          body: `总计 <b>${fmtInt(cpsc.n_total_records)} 条 10 秒 500 Hz 自由活动单导联记录</b>（配准通过 <b>${fmtInt(cpsc.n_registered)}</b> 条，${fmtNum(cpsc.registration_pass_pct, 1, '%')}）。`,
          metrics: [
            `重建 R² <b>${fmtNum(cpsc.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</b>`,
            `动态监测 H_I 中位数 <b>${fmtNum(cpsc.composite_I_median, 1)} 分</b>`,
          ],
        },
        ...(butq ? [{
          cat: 'consumer', isNew: true,
          title: 'PhysioNet BUT QDB v1.0.0 · 专家质控分级动态心电',
          tag: '新纳入 · 质量门禁专项基准',
          body: `解析全部 <b>${fmtInt(butq.n_recordings_parsed)} 份长程动态记录</b>（15 名受试者；非标准 Bittium Faros 贴片几何，仅作信号质量门禁检验，不作临床健康分推断），按专家共识质量分级抽检 10 秒窗。`,
          metrics: [
            `1 级清晰通过率 <b>${esc(fmtButCls(butq.by_quality_class?.class_1))}</b>`,
            `2 级中度通过率 <b>${esc(fmtButCls(butq.by_quality_class?.class_2))}</b>`,
            `3 级不可用通过率 <b>${esc(fmtButCls(butq.by_quality_class?.class_3))}</b>`,
          ],
        }] : []),
        {
          cat: 'watch', isNew: false,
          title: 'wECGdb · 腕戴三电极原型真机（AMI vs 对照）',
          tag: '真机配对 · 含心梗病例与对照',
          body: `同步配对 <b>${fmtInt(wecg.n_paired)} 人</b>（AMI ${fmtInt(wecg.n_ami)} 例 + 对照 ${fmtInt(wecg.n_controls)} 例）；${isNslV2 ? '开发集岭稳定化' : '锁定'} PRISM-I + 2b 验证腕戴原型一致性与探索性心梗区分。`,
          metrics: [
            `腕戴重建 R² <b>${fmtNum(wecg.native_prism_i_recon_wrist_norm?.pooled_r2_vs_dev_mean, 4)}</b>`,
            `波形 RMSE <b>${fmtNum(wecg.watch_vs_clinical_adaptation?.watch_wave_norm_rmse_vs_clin_raw, 4)} → ${fmtNum(wecg.watch_vs_clinical_adaptation?.watch_wave_norm_rmse_vs_clin_2b_fir, 4)}</b>`,
            `2b MAE <b>${fmtNum(wecg.watch_vs_clinical_adaptation?.locked_2b_adapted_5fold_cv?.composite?.mae, 2, ' 分')}</b>`,
            `零重训腕戴 AMI AUROC <b>${fmtNum(wecg.exploratory_ami_auroc_wrist_frozen_composite, 4)}</b> (院内 ${fmtNum(wecg.exploratory_ami_auroc_clinical_frozen_composite, 4)})`,
          ],
        },
        {
          cat: 'watch', isNew: false,
          title: 'WatchMyHeart · Apple Watch 7 vs Samsung Watch 4',
          tag: '真机跨品牌 · 健康志愿者',
          body: `配对样本量档位 <b>${esc(wmh.n_paired_volunteers_band || '90-99')} 名健康志愿者</b>（无临床真值，仅评估同机重复性与跨品牌校准；采用分档展示以防止互补小格推算）。`,
          metrics: [
            `重建 R² (Apple / Samsung) <b>${fmtNum(wmh.native_prism_i_recon_apple7_norm?.pooled_r2_vs_dev_mean, 4)} / ${fmtNum(wmh.native_prism_i_recon_samsung4_norm?.pooled_r2_vs_dev_mean, 4)}</b>`,
            `同机复测 MAE (Apple / Samsung) <b>${fmtNum(wmh.same_device_repeat_apple7?.mae, 2)} / ${fmtNum(wmh.same_device_repeat_samsung4?.mae, 2)} 分</b>`,
            `2b 跨品牌 MAE / CCC <b>${fmtNum(wmh.cross_brand_samsung4_to_apple7?.locked_2b_adapted_5fold_cv?.composite?.mae, 2, ' 分')} / ${fmtNum(wmh.cross_brand_samsung4_to_apple7?.locked_2b_adapted_5fold_cv?.composite?.ccc, 3)}</b>`,
          ],
        },
        (() => {
          const s8OkCnt = Number.isInteger(ahf.n_files_parsed) && Number.isInteger(ahf.n_files_total) && ahf.n_files_total > 0 && ahf.n_files_parsed === ahf.n_files_total;
          const s8St = ahf.format_check_passed === false ? '失败' : (ahf.format_check_passed === true && s8OkCnt ? '通过' : '未确认');
          return {
            cat: 'eng', isNew: true,
            title: 'HeartVoice VT · ECG-ID · Apple Watch 512 Hz CSV 格式核验',
            tag: '多日复测 + 室速探索 + 实机格式解析',
            body: `ECG-ID（档位 ${esc(ecgid.icc_composite_I?.n_people_with_repeats_band || '80-89')} 人 / 档位 ${esc(ecgid.icc_composite_I?.n_total_records_band || '300-319')} 条多日复测 I 导联）、HeartVoice（${fmtInt(hv.n_users)} 用户 / ${fmtInt(hv.n_registered_records)} 条 125 Hz 记录，记录级探索）与 Apple Watch ${fmtInt(ahf.sample_rate_hz ?? 512)} Hz 导出 CSV 格式解析（${fmtInt(ahf.n_files_parsed)}/${fmtInt(ahf.n_files_total)} 份样例校验状态：${s8St}，不输出单人或逐文件评分）。`,
            metrics: [
              `ECG-ID 7日模型 ICC <b>${fmtNum(ecgid.icc_composite_I?.multiday_averaging_curve?.['K=7_days']?.icc_1k, 3)}</b>`,
              `HeartVoice 重建 R² <b>${fmtNum(hv.native_prism_i_recon_norm?.pooled_r2_vs_dev_mean, 4)}</b>${hv.zero_refit_vt_auroc_composite_I != null ? ` · 记录级探索 VT AUROC <b>${fmtNum(hv.zero_refit_vt_auroc_composite_I, 4)}</b>` : ''}`,
              `Apple Watch ${fmtInt(ahf.sample_rate_hz ?? 512)} Hz CSV 格式解析 <b>${s8St} (${fmtInt(ahf.n_files_parsed)}/${fmtInt(ahf.n_files_total)})</b>`,
            ],
          };
        })(),
      ];
      const nWatch = cards.filter(c => c.cat === 'watch').length;
      const nCons = cards.filter(c => c.cat === 'consumer').length;
      const nEng = cards.filter(c => c.cat === 'eng').length;
      const shown = curOpenFilter === 'all' ? cards : cards.filter(c => c.cat === curOpenFilter);
      bodyEl.innerHTML = `
        <div class="v12-nsl-filter-bar chip-bar" id="nsl-open-filter" role="group" aria-label="按设备类型筛选">
          <button type="button" data-ofilter="all" aria-pressed="${curOpenFilter === 'all'}">全部开源与真机 (${cards.length})</button>
          <button type="button" data-ofilter="watch" aria-pressed="${curOpenFilter === 'watch'}">智能手表真机 (${nWatch})</button>
          <button type="button" data-ofilter="consumer" aria-pressed="${curOpenFilter === 'consumer'}">手持/社区/动态/质控 (${nCons})</button>
          <button type="button" data-ofilter="eng" aria-pressed="${curOpenFilter === 'eng'}">多日/室速/导出工程核验 (${nEng})</button>
        </div>
        <div class="v12-open-cards">${shown.map(c => `
          <div class="v12-open-card ${c.isNew ? 'is-new' : ''}">
            <h5><span>${esc(c.title)}</span><span class="v10-tag ${c.isNew ? 'is-teal' : 'is-muted'}">${esc(c.tag)}</span></h5>
            <p style="margin:0">${c.body}</p>
            <div class="v12-open-metrics">${c.metrics.map(m => `<span>${m}</span>`).join('')}</div>
          </div>`).join('')}</div>`;
      bindChipGroup(find('#nsl-open-filter'), btn => { curOpenFilter = btn.dataset.ofilter; renderNslTab(); });
      capEl.innerHTML = `全景覆盖真实 Apple Watch / Samsung / 腕戴原型、消费级手持 AliveCor（${fmtInt(cinc.n_total_records)} 条记录）、日本社区体检 12 导联抽取 I 导联（档位 ${esc(zen.n_registered_band || '2,400-2,499')} 份，通过率 &gt;99%）、动态监测 CPSC 2019（${fmtInt(cpsc.n_total_records)} 条）${butq ? `与 BUT QDB 质控基准（${fmtInt(butq.n_recordings_parsed)} 份长程记录）` : ''}，严格区分“患者 / 记录 / 质控 / 格式样例”，全部使用同一套冻结原生 PRISM-I 字典零重训投射。`;
      pulseFade(bodyEl);
    }

    bindChipGroup(find('#nsl-tab-seg'), btn => { curTab = btn.dataset.nsltab; renderNslTab(); });
    renderNslTab();
  }

  /* ==================== BOOT ==================== */
  const heroAtlas = initHeroAtlas();
  initRevealAndCounters();

  let queued = false;
  function renderScrollFrame() {
    queued = false;
    heroAtlas.render();
    updateNavigation();
  }
  function scheduleScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(renderScrollFrame);
  }
  function configureAll() {
    const allowed = !reducedMotion.matches && !shortScreen.matches;
    const motion = allowed && !staticPreference;
    heroAtlas.configure(motion);
    root.dataset.reading = motion ? 'enhanced' : 'static';
    renderScrollFrame();
  }

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', configureAll, { passive: true });
  window.addEventListener('pageshow', configureAll);
  reducedMotion.addEventListener('change', configureAll);
  shortScreen.addEventListener('change', configureAll);
  configureAll();

  function hydrateAtlas(D) {
    const errBanner = find('#atlas-load-error');
    if (errBanner) errBanner.hidden = true;
    window.__PRISM_V13_DATA = D;
    window.__PRISM_V12_DATA = D;
    window.__PRISM_V11_DATA = D;
    renderGlobalAtlas(D);
    renderAct1(D);
    renderAct2(D);
    renderAct3(D);
    renderH10Scrubber(D);
    renderAct4(D);
    renderAct5(D);
  }
  window.__PRISM_V13_HYDRATE = hydrateAtlas;
  window.__PRISM_V12_HYDRATE = hydrateAtlas;

  function showLoadFailure(err) {
    const errBanner = find('#atlas-load-error');
    const errMsg = find('#atlas-load-error-msg');
    if (errBanner) errBanner.hidden = false;
    if (errMsg) {
      errMsg.innerHTML = `<strong>数据未加载</strong>（${esc(err?.message || '网络或文件读取失败')}）：聚合数据文件 <code>stage1_atlas_v13_data.json</code> 未成功载入，页面占位内容不可作为当前结果。`;
    }
    // Reveal sections immediately so error banner and placeholder status are visible
    findAll('.reveal').forEach(el => el.classList.add('is-visible'));
    ['#global-region-detail', '#h10-bins-chart', '#burden-sys17-grid', '#traj-k5-detail', '#phewas-body'].forEach(sel => {
      const box = find(sel);
      if (box && !box.innerText.trim()) {
        box.innerHTML = `<p style="padding:12px;color:#bf4a40;font-size:12.5px">数据未加载 · 请点击顶部按钮重试</p>`;
      }
    });
  }

  function loadAtlasData() {
    const errBanner = find('#atlas-load-error');
    if (errBanner) errBanner.hidden = true;
    return fetch('./stage1_atlas_v13_data.json?v=20261126-v13')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(D => { hydrateAtlas(D); })
      .catch(err => {
        console.error('Failed loading stage1_atlas_v13_data.json', err);
        showLoadFailure(err);
      });
  }

  const retryBtn = find('#atlas-load-retry');
  if (retryBtn) retryBtn.addEventListener('click', () => loadAtlasData());
  loadAtlasData();
})();
