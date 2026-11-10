// Bilingual copy for Figure 7 (ComputeFrontier), shared by the Astro render and the script.
export interface ComputeFrontierCopy {
  sparsity: string; budget: string; scrub: string;
  base: string; loop: string; gainLine: string; extrapolated: string; zoom: string;
  yLoss: string; yGain: string; xTitle: string; extrapolationNote: string;
  ariaChart: (gain: string, budget: string, sparsity: string) => string;
  /** Label of the headline: switches wording when CE Gain is negative, and flags extrapolation. */
  statGain: (budget: string, sparsity: string, negative: boolean, extrapolated: boolean) => string;
  statReference: string; statCi: string; statCiNone: string;
  allocation: (base: { F: string; D: string; tpp: string }, loop: { F: string; D: string; tpp: string }) => string;
  whiskerTip: (budget: string, sparsity: string, point: string, low: string, high: string, extrapolated: boolean) => string;
  lensGain: (gain: string) => string;
  /** Vertical gap at SMELT's budget, in millinats (positive: SMELT lower). */
  lensGap: (mnat: number) => string;
  whiskerAction: string;
  dataTitle: string; dataCaption: string; dataBudget: string; dataTpp: string;
}

export const computeFrontierCopy: Record<'zh' | 'en', ComputeFrontierCopy> = {
  zh: {
    sparsity: '稀疏度 S ≈', budget: '预算', scrub: '训练算力 C',
    base: '基线前沿', loop: 'SMELT 前沿', gainLine: 'CE Gain', extrapolated: '拟合窗口外（外推）', zoom: '放大',
    yLoss: '计算最优损失', yGain: 'CE Gain', xTitle: '训练算力 C（FLOPs）', extrapolationNote: '外推',
    ariaChart: (gain, budget, sparsity) => `计算最优前沿：S ≈ ${sparsity}、${budget} FLOPs 时，CE Gain 为 ${gain}（正值表示 SMELT 达到同等损失所需的训练算力比基线少）。`,
    statGain: (budget, sparsity, negative, extrapolated) => `${negative ? `CE Gain 为负：S ≈ ${sparsity}、${budget} FLOPs 时 SMELT 反而需要更多训练算力` : `CE Gain：S ≈ ${sparsity}、${budget} FLOPs 时 SMELT 节省的训练算力`}${extrapolated ? '（外推）' : ''}`,
    statReference: '基线达到同一损失所需的 FLOPs',
    statCi: '95% 区间',
    statCiNone: '仅 10²⁰ / 10²¹ / 10²² 处有 95% 区间',
    allocation: (base, loop) => `同一预算下的计算最优分配：基线 F*\u00a0=\u00a0${base.F}、D*\u00a0=\u00a0${base.D}（TPP ${base.tpp}）；SMELT F*\u00a0=\u00a0${loop.F}、D*\u00a0=\u00a0${loop.D}（TPP ${loop.tpp}）。`,
    whiskerTip: (budget, sparsity, point, low, high, extrapolated) => `${budget} FLOPs · S ≈ ${sparsity}\nCE Gain ${point}\n95% 区间 [${low}, ${high}]${extrapolated ? '\n超出拟合窗口，外推' : ''}`,
    lensGain: gain => `CE Gain ${gain}`,
    lensGap: mnat => `损失${mnat >= 0 ? '低' : '高'} ${Math.abs(mnat).toFixed(1)} mnat`,
    whiskerAction: '按回车跳到该预算',
    dataTitle: '查看 CE Gain 表', dataCaption: '论文中的 CE Gain 表：SMELT 在同一损失下节省的训练算力；括号为 95% 区间。', dataBudget: 'SMELT 预算', dataTpp: '10²¹ FLOPs 处的最优 TPP（基线 / SMELT）',
  },
  en: {
    sparsity: 'Sparsity S ≈', budget: 'Budget', scrub: 'Training compute C',
    base: 'Baseline frontier', loop: 'SMELT frontier', gainLine: 'CE Gain', extrapolated: 'Outside the fitted window (extrapolated)', zoom: 'Zoom',
    yLoss: 'Compute-optimal loss', yGain: 'CE Gain', xTitle: 'Training compute C (FLOPs)', extrapolationNote: 'extrapolated',
    ariaChart: (gain, budget, sparsity) => `Compute-optimal frontiers: at S ≈ ${sparsity} and ${budget} FLOPs, CE Gain is ${gain} (positive: SMELT needs less training compute than the Baseline to reach the same loss).`,
    statGain: (budget, sparsity, negative, extrapolated) => `${negative ? `Negative CE Gain: SMELT needs more training compute at ${budget} FLOPs, S ≈ ${sparsity}` : `CE Gain: training compute SMELT saves at ${budget} FLOPs, S ≈ ${sparsity}`}${extrapolated ? ' (extrapolated)' : ''}`,
    statReference: 'FLOPs the Baseline needs for the same loss',
    statCi: '95% interval',
    statCiNone: '95% intervals at 10²⁰ / 10²¹ / 10²² only',
    allocation: (base, loop) => `Compute-optimal split at this budget: Baseline F*\u00a0=\u00a0${base.F}, D*\u00a0=\u00a0${base.D} (TPP ${base.tpp}); SMELT F*\u00a0=\u00a0${loop.F}, D*\u00a0=\u00a0${loop.D} (TPP ${loop.tpp}).`,
    whiskerTip: (budget, sparsity, point, low, high, extrapolated) => `${budget} FLOPs · S ≈ ${sparsity}\nCE Gain ${point}\n95% interval [${low}, ${high}]${extrapolated ? '\nOutside the fitted window' : ''}`,
    lensGain: gain => `CE Gain ${gain}`,
    lensGap: mnat => `${Math.abs(mnat).toFixed(1)} mnat ${mnat >= 0 ? 'lower' : 'higher'}`,
    whiskerAction: 'Press Enter to jump to this budget',
    dataTitle: 'CE Gain table', dataCaption: 'The paper\'s CE Gain table: training compute SMELT saves at equal loss; brackets are 95% intervals.', dataBudget: 'SMELT budget', dataTpp: 'Compute-optimal TPP at 10²¹ FLOPs (Baseline / SMELT)',
  },
};
