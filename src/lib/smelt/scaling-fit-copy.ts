// Bilingual copy for Figure 6 (ScalingFit), shared by the Astro render and the script.
import type { TermKey } from './scaling-fit';

export interface ScalingFitCopy {
  base: string; loop: string; change: string; legendNote: string;
  groups: Record<TermKey | 'fit' | 'frontier', string>;
  points: string;
  playTitle: string;
  sliders: { F: string; S: string; D: string };
  reset: string;
  termNames: Record<TermKey, string>;
  total: string; barsLabel: string;
  deltaTitle: string; deltaBase: string; deltaLoop: string; deltaTotal: string; mnat: string;
  /** gap in millinats, positive when SMELT is lower. */
  readout: (base: string, loop: string, gap: number) => string;
  segmentTip: (term: TermKey, arch: string, value: string) => string;
  deltaTip: (term: TermKey | 'total', base: string, loop: string, gap: string) => string;
  dataTitle: string; dataCaption: string; arch: string;
}

export const scalingFitCopy: Record<'zh' | 'en', ScalingFitCopy> = {
  zh: {
    base: 'Baseline', loop: 'SMELT', change: 'SMELT 相对 Baseline', legendNote: '右列：SMELT 相对 Baseline 的变化',
    groups: { E: '不可约损失', capacity: '容量项', data: '数据项', fit: '拟合误差', frontier: 'Compute-Optimal 指数' },
    points: '各 72 点',
    playTitle: '交互测算：相同 (F, S, D) 下的拟合预测 loss',
    sliders: { F: '单 token FLOPs', S: '稀疏度', D: '训练 token 数' },
    reset: '恢复默认：1.6B · S≈97% · 216B',
    termNames: { E: '不可约项 E', capacity: '容量项', data: '数据项' },
    total: '预测 loss', barsLabel: '两种架构拟合公式预测的 validation loss（按三项拆分）',
    deltaTitle: 'SMELT 比 Baseline 低多少（mnat，毫纳特）', deltaBase: 'Baseline 更低', deltaLoop: 'SMELT 更低', deltaTotal: '合计', mnat: 'mnat',
    readout: (base, loop, gap) => `拟合预测 validation loss：Baseline ${base}，SMELT ${loop}（SMELT ${gap >= 0 ? '低' : '高'} ${Math.abs(gap).toFixed(1)} mnat）。`,
    segmentTip: (term, arch, value) => `${scalingFitCopy.zh.termNames[term]} · ${arch}\n${value} nats`,
    deltaTip: (term, base, loop, gap) => `${term === 'total' ? '预测 loss' : scalingFitCopy.zh.termNames[term]}\nBaseline ${base} · SMELT ${loop}\n差值 ${gap} mnat（正值表示 SMELT 更低）`,
    dataTitle: '查看全精度拟合系数', dataCaption: '论文 Scaling Law 全精度拟合系数表。', arch: '架构',
  },
  en: {
    base: 'Baseline', loop: 'SMELT', change: 'SMELT vs. Baseline', legendNote: 'Right column: change from Baseline to SMELT',
    groups: { E: 'Irreducible loss', capacity: 'Capacity term', data: 'Data term', fit: 'Fit error', frontier: 'Frontier exponent' },
    points: '72 pts each',
    playTitle: 'Plug in: predicted loss at the same F, S and D',
    sliders: { F: 'Per-token FLOPs', S: 'Sparsity', D: 'Training tokens' },
    reset: 'Reset: 1.6B · S≈97% · 216B',
    termNames: { E: 'Irreducible E', capacity: 'Capacity term', data: 'Data term' },
    total: 'Predicted loss', barsLabel: 'Validation loss predicted by the two laws, split into three terms',
    deltaTitle: 'How much lower SMELT is (millinats)', deltaBase: 'Baseline lower', deltaLoop: 'SMELT lower', deltaTotal: 'Total', mnat: 'mnat',
    readout: (base, loop, gap) => `Predicted validation loss: Baseline ${base}, SMELT ${loop}; SMELT is ${Math.abs(gap).toFixed(1)} mnat ${gap >= 0 ? 'lower' : 'higher'}.`,
    segmentTip: (term, arch, value) => `${scalingFitCopy.en.termNames[term]} · ${arch}\n${value} nats`,
    deltaTip: (term, base, loop, gap) => `${term === 'total' ? 'Predicted loss' : scalingFitCopy.en.termNames[term]}\nBaseline ${base} · SMELT ${loop}\nDifference ${gap} mnat (positive: SMELT lower)`,
    dataTitle: 'Full-precision coefficients', dataCaption: 'The paper\'s coefficient table at full precision.', arch: 'Architecture',
  },
};
