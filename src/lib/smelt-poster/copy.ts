// Poster text in both languages. Wording follows the SMELT article
// (src/content/blog/{zh,en}/smelt.mdx) and its figure captions; keep the two
// versions in step. Strings marked html may contain <strong>, <var> and <sup>.
import type { Language } from '../site';

export interface PosterCopy {
  pageTitle: string;
  description: string;
  toolbar: { label: string; language: string; export: string; exportHint: string; article: string };
  kicker: string;
  title: string;
  subtitle: string;
  links: { paper: string; blog: string; qrLabel: string };
  stats: { value: string; tone: 'loop' | 'gain' | 'ink'; label: string }[];
  sections: [string, string, string, string, string];
  sectionTags: [string, string, string, string, string];
  setting: {
    question: string;
    standard: string; standardNote: string; looped: string; loopedNote: string;
    physical: string; executed: string; input: string; output: string;
    claimHtml: string;
    budgetHead: [string, string, string];
    steps: Record<'baseline' | 'loop' | 'narrow' | 'experts' | 'smelt', string>;
    budgetNote: string;
    gridHtml: string;
  };
  recipe: {
    introHtml: string;
    spanHtml: string; spanAxis: string;
    aspectHtml: string; aspectAxis: string; aspectBase: string; aspectLoop: string;
    countHtml: string; countAxis: string; countNote: string;
    deltaAxis: string; best: string;
    resultHtml: string;
  };
  scaling: {
    gridHtml: string; gridNote: string;
    lawHtml: string;
    capacity: string; data: string; irreducible: string;
    exponentHead: [string, string, string]; capacityExp: string; dataExp: string;
    frontierHtml: string; frontierAxis: string; computeAxis: string; outside: string;
  };
  downstream: {
    winsHtml: string; mmluNote: string;
    beyondHtml: string;
    domainHtml: string; domainAxis: string;
    lengthHtml: string;
    iclHtml: string; iclAxis: string; shots: string; iclMean: (zero: string, one: string) => string;
  };
  mechanism: {
    introHtml: string;
    expertsHtml: string; expertsAxis: string; measured: string; random: string;
    residualHtml: string;
    attentionHtml: string; look: string; read: string; cosineAxis: string;
    sinkHtml: string; sinkAxis: string; layerAxis: string; baseline: string; visit1: string; visit2: string;
  };
  conclusionLabel: string;
  conclusion: string;
  domainName: (family: { label: string; zh: string }) => string;
}

const zh: PosterCopy = {
  pageTitle: 'SMELT 海报：预算匹配下的 Looped Transformer Scaling Law',
  description: 'SMELT 研究的 16:9 单页海报：同时对齐每 token FLOPs、非 embedding 总参数量与 KV cache 后，循环机制依然能提升稀疏 MoE 的预训练效率。可导出为 PDF。',
  toolbar: { label: 'SMELT 研究速览 · 16:9', language: '语言', export: '导出 PDF', exportHint: '在打印窗口中选择“存储为 PDF”', article: '阅读文章' },
  kicker: '模型架构 · arXiv 2609.01343',
  title: 'SMELT：预算匹配下的 Looped Transformer Scaling Law',
  subtitle: '对齐算力、参数量与 KV Cache 后，循环机制依然能提升稀疏 MoE 的预训练效率',
  links: { paper: '论文', blog: '博客', qrLabel: '扫码读博客' },
  stats: [
    { value: '16 / 16', tone: 'loop', label: '组等预算配置中，SMELT 的 validation loss 均低于 Baseline' },
    { value: '6.8%–18.0%', tone: 'gain', label: 'Compute-Optimal 前沿上，达到相同 loss 所需的训练算力减少' },
    { value: '96 / 96', tone: 'loop', label: '组配对中 SMELT 的 DCLM Completion 更优；DCLM Core 为 83 / 96' },
    { value: '29 / 30', tone: 'loop', label: '组 Baseline 显著高于随机水平的 MMLU 评测中，SMELT 胜出' },
    { value: '54B', tone: 'ink', label: '4 个模型规模 × 4 档稀疏度，最高的非 embedding 总参数量' },
  ],
  sections: ['等预算评测设定', '架构设计消融', 'Scaling Law 与前沿收益', '下游任务表现', '内部机制分析'],
  sectionTags: ['', '200M · S≈85%', '', '', '1.6B · S≈85%'],
  setting: {
    question: 'Looped Transformer 的收益，究竟来自循环结构本身，还是来自额外投入的计算量？',
    standard: '标准 Transformer', standardNote: '每层执行 1 轮',
    looped: 'Looped Transformer', loopedNote: '中间 50% 层执行 2 轮',
    physical: '物理层', executed: '执行层', input: '输入', output: '输出',
    claimHtml: '<strong>要检验循环结构本身是否有效，必须同时对齐算力、参数量与 KV cache。</strong>借助稀疏 MoE 参数量与激活计算量解耦的特性，分三步完成预算对齐：',
    budgetHead: ['每 token FLOPs', '总参数量', 'KV cache'],
    steps: { baseline: 'Baseline', loop: '中间层循环 2 轮', narrow: '缩窄模型宽度', experts: '增加专家总数', smelt: '调整 Attention 配置' },
    budgetNote: '以 200M、S≈95% 为例，数值为相对 Baseline 的比值；着色格已在容差内对齐（FLOPs、KV cache 4%，参数量 1%）。',
    gridHtml: '<strong>实验网格</strong>：4 个规模（100M–1.6B）× 4 档稀疏度（S = 0%–97%），每格独立训练预算对齐的 Baseline 与 SMELT。',
  },
  recipe: {
    introHtml: '在等预算约束下，于小规模模型上依次消融三项设计。Δ loss 为 validation loss 相对 12 层 Baseline 的变化，越低越好。',
    spanHtml: '<strong>循环中间 50% 的层时 loss 最低</strong>', spanAxis: '循环层占比',
    aspectHtml: '<strong>Looped 模型的最优有效执行深宽比更高</strong>', aspectAxis: '有效执行层数', aspectBase: 'Baseline', aspectLoop: 'Looped',
    countHtml: '<strong>循环 2 轮综合收益最佳</strong>', countAxis: '循环轮数', countNote: '3、4 轮的回退源于宽度过度压缩，但仍优于 Baseline',
    deltaAxis: 'Δ loss', best: '最优',
    resultHtml: '<strong>SMELT</strong>：在稀疏 MoE 模型中，将中间一半的层循环执行 2 轮，并采用更大的有效执行深宽比。',
  },
  scaling: {
    gridHtml: '<strong>4 个规模 × 4 档稀疏度的 16 组配对中，SMELT 的 validation loss 全部更低。</strong>',
    gridNote: '最长训练步数下 SMELT − Baseline 的 validation loss 差值',
    lawHtml: '为两种架构分别拟合含稀疏度项的 Scaling Law：',
    capacity: '容量项', data: '数据项', irreducible: '不可约损失',
    exponentHead: ['', 'Baseline', 'SMELT'], capacityExp: '容量指数 <var>a</var>', dataExp: '数据指数 <var>c</var>',
    frontierHtml: '<strong>SMELT 的 loss 随算力与数据增长下降得更快</strong>；在 Compute-Optimal 前沿上，节省的训练算力随总预算增大而扩大。',
    frontierAxis: 'Validation loss（S ≈ 85%）', computeAxis: '训练算力（×10²¹ FLOPs）', outside: '拟合区间外',
  },
  downstream: {
    winsHtml: '16 组架构配置 × 6 档训练步数，<strong>共 96 组等预算配对中 SMELT 大多更优：</strong>',
    mmluNote: 'MMLU 仅统计 Baseline 显著高于随机水平的 30 组',
    beyondHtml: '<strong>收益不只来自更低的 loss：</strong>同等 loss 下，三项评测的平均得分仍高于 Baseline 拟合曲线的预测。',
    domainHtml: '<strong>结构化程度越高的领域收益越大</strong>', domainAxis: 'CE Gain（S≈95%）',
    lengthHtml: '<strong>长样本收益更大：</strong>超过 256 tokens 的样本收益约为短样本的 <strong>1.5 倍</strong>；仅增加专家或参数没有这种分化。',
    iclHtml: '<strong>给出上下文示例后，领先优势进一步扩大</strong>', iclAxis: 'Dyck Languages 准确率', shots: '示例数',
    iclMean: (zero, one) => `16 项任务平均领先：0-shot +${zero} → 1-shot +${one} 百分点`,
  },
  mechanism: {
    introHtml: '循环层第 1 轮与第 2 轮的计算差异（1.6B，S≈85%）',
    expertsHtml: '<strong>专家路由：</strong>第 2 轮复用部分首轮专家，也调用新专家；两轮专家集合的重合度远高于独立随机路由。',
    expertsAxis: '两轮共同选中的专家数（top-8，1.6B）', measured: 'SMELT 实测', random: '随机路由期望 8²/E',
    residualHtml: '<strong>残差流：</strong>第 2 轮写入的更新范数始终更大，方向与首轮部分对齐（同层余弦约 0.56，不同层约 0.16），是在首轮信号上的放大与精化。',
    attentionHtml: '<strong>Attention：</strong>Q、K 跨轮余弦高达 0.89–0.93，两轮“看向同一位置”；变化集中在 V 及其输出，“读到的内容”已经改变。',
    look: '看向哪里', read: '读取什么', cosineAxis: '跨轮余弦相似度',
    sinkHtml: '<strong>Attention sink：</strong>Baseline 的 sink 随层深增强，SMELT 第 2 轮明显减弱；Dyck 任务中关键注意力头由 BOS 转向示例答案位置。',
    sinkAxis: 'BOS 注意力占比', layerAxis: '物理层', baseline: 'Baseline', visit1: '第 1 轮', visit2: '第 2 轮',
  },
  conclusionLabel: '总结',
  conclusion: '在严格对齐算力、参数量与 KV cache 的设定下，Scaling Law 拟合与下游评测得出一致结论：对于稀疏 MoE Transformer，循环架构依然能够带来稳定的净收益。',
  domainName: family => family.zh,
};

const en: PosterCopy = {
  pageTitle: 'SMELT poster: Scaling Laws for Budget-Matched Looped Transformers',
  description: 'A one-page 16:9 poster of SMELT: with per-token FLOPs, total non-embedding parameters, and KV cache all matched, looping still makes MoE pretraining more efficient. Exports to PDF.',
  toolbar: { label: 'SMELT Poster · 16:9', language: 'Language', export: 'Export PDF', exportHint: 'Choose “Save as PDF” in the print dialog', article: 'Read the article' },
  kicker: 'Model Architecture · arXiv 2609.01343',
  title: 'SMELT: Scaling Laws for Budget-Matched Looped Transformers',
  subtitle: 'With compute, parameters, and KV cache all matched, looping still yields a net gain for MoE models',
  links: { paper: 'Paper', blog: 'Blog', qrLabel: 'Scan for Blog' },
  stats: [
    { value: '16 / 16', tone: 'loop', label: 'matched configurations where SMELT reaches lower validation loss' },
    { value: '6.8%–18.0%', tone: 'gain', label: 'less training compute for the same loss on the compute-optimal frontier' },
    { value: '96 / 96', tone: 'loop', label: 'matched pairs won on DCLM Completion; 83 / 96 on DCLM Core' },
    { value: '29 / 30', tone: 'loop', label: 'MMLU pairs won where the Baseline scores clearly above chance' },
    { value: '54B', tone: 'ink', label: 'largest total parameters (excl. embeddings), 4 sizes × 4 sparsity levels' },
  ],
  sections: ['Budget Matching', 'The Loop Recipe', 'Scaling Laws', 'Downstream Tasks', 'Inside the Loop'],
  sectionTags: ['', '200M · S ≈ 85%', '', '', '1.6B · S ≈ 85%'],
  setting: {
    question: 'Do Looped Transformers gain from the looped architecture itself, or from the extra compute they spend?',
    standard: 'Standard Transformer', standardNote: 'each layer runs once',
    looped: 'Looped Transformer', loopedNote: 'middle 50% runs twice',
    physical: 'Unique', executed: 'Executed', input: 'Input', output: 'Output',
    claimHtml: '<strong>To isolate looping itself, compute, parameters, and KV cache must all be matched.</strong> MoE decouples parameters from compute, so matching takes three steps:',
    budgetHead: ['FLOPs / token', 'Total params', 'KV cache'],
    steps: { baseline: 'Baseline', loop: 'Loop middle layers twice', narrow: 'Narrow the model', experts: 'Add experts', smelt: 'Retune attention' },
    budgetNote: '200M at S ≈ 95%, as ratios to the Baseline; shaded cells are matched within tolerance (4% for FLOPs and KV cache, 1% for parameters).',
    gridHtml: '<strong>Grid</strong>: 4 sizes (100M–1.6B) × 4 sparsity levels (S = 0%–97%), each with a budget-matched Baseline and SMELT.',
  },
  recipe: {
    introHtml: 'Three choices, searched in turn at small scale under matched budgets. Δ loss is validation loss minus the 12-layer Baseline; lower is better.',
    spanHtml: '<strong>Loop the middle 50% of the layers</strong>', spanAxis: 'Fraction of layers looped',
    aspectHtml: '<strong>Looping favors a larger depth-to-width ratio</strong>', aspectAxis: 'Executed layers', aspectBase: 'Baseline', aspectLoop: 'Looped',
    countHtml: '<strong>Looping twice gives the largest gain</strong>', countAxis: 'Loop count', countNote: 'Three and four loops narrow the model too much, yet still beat the Baseline',
    deltaAxis: 'Δ loss', best: 'best',
    resultHtml: '<strong>SMELT</strong>: in a sparse MoE model, loop the middle half of the layers twice and use a larger effective depth-to-width ratio.',
  },
  scaling: {
    gridHtml: '<strong>SMELT has lower validation loss in all 16 matched configurations (4 sizes × 4 sparsity levels).</strong>',
    gridNote: 'SMELT − Baseline validation loss, longest horizon',
    lawHtml: 'Each architecture gets its own scaling law, with a sparsity term:',
    capacity: 'capacity term', data: 'data term', irreducible: 'irreducible loss',
    exponentHead: ['', 'Baseline', 'SMELT'], capacityExp: 'Capacity exponent <var>a</var>', dataExp: 'Data exponent <var>c</var>',
    frontierHtml: '<strong>SMELT’s loss falls faster with compute and data</strong>, so its savings on the compute-optimal frontier grow with the budget.',
    frontierAxis: 'Validation loss (S ≈ 85%)', computeAxis: 'Training compute (×10²¹ FLOPs)', outside: 'outside fit',
  },
  downstream: {
    winsHtml: '16 configurations × 6 horizons: <strong>SMELT wins most of the 96 matched pairs.</strong>',
    mmluNote: 'MMLU: only the 30 pairs with a Baseline clearly above chance',
    beyondHtml: '<strong>Not just lower loss:</strong> at equal validation loss, SMELT still beats the Baseline curve on all three metrics.',
    domainHtml: '<strong>More structured domains gain more</strong>', domainAxis: 'CE Gain (S ≈ 95%)',
    lengthHtml: '<strong>Long texts gain more:</strong> samples over 256 tokens gain about <strong>1.5×</strong> as much as shorter ones; extra experts or parameters show no such trend.',
    iclHtml: '<strong>In-context examples widen the lead</strong>', iclAxis: 'Dyck Languages accuracy', shots: 'Examples',
    iclMean: (zero, one) => `16-task mean lead: +${zero} (0-shot) → +${one} pp (1-shot)`,
  },
  mechanism: {
    introHtml: 'Visit 2 vs. visit 1 through the looped layers (1.6B, S ≈ 85%)',
    expertsHtml: '<strong>Experts.</strong> The second visit reuses some experts and adds new ones; the overlap is far above chance.',
    expertsAxis: 'Experts shared by both visits (top-8, 1.6B)', measured: 'SMELT', random: 'Random routing, 8²/E',
    residualHtml: '<strong>Residual stream.</strong> Visit 2 writes larger updates, partly aligned with visit 1 (cosine ≈ 0.56 at the same layer, ≈ 0.16 across layers).',
    attentionHtml: '<strong>Attention.</strong> Q and K keep a cross-visit cosine of 0.89–0.93, so it “looks in the same place”; V and the outputs change more, so what it “reads” differs.',
    look: 'where it looks', read: 'what it reads', cosineAxis: 'Cross-visit cosine',
    sinkHtml: '<strong>Attention sink.</strong> It grows with depth in the Baseline but weakens on SMELT’s second visit; on Dyck, a key head shifts from BOS to the answers.',
    sinkAxis: 'BOS attention', layerAxis: 'Physical layer', baseline: 'Baseline', visit1: 'Visit 1', visit2: 'Visit 2',
  },
  conclusionLabel: 'Summary',
  conclusion: 'Under matched budgets, our scaling laws and downstream evaluations point to the same conclusion: for MoE Transformers, looping still yields a net gain.',
  domainName: family => family.label,
};

export const posterCopy: Record<Language, PosterCopy> = { zh, en };
