// Slides of the Loop-μP + SMELT talk at /loop-science/ (Chinese) and
// /en/loop-science/ (English). Every claim, number and qualifier comes from the
// two articles in src/content/blog and their figure captions; nothing here is
// new research content. Strings use the Loop-μP label notation ($N$ italic,
// ^{…} / _{…} scripts, [l:…] loop colour) plus **bold**; notes separate
// paragraphs with a blank line.
import type loopFigures from '../loop-mup/figures.json';
import type smeltFigures from '../smelt/figures.json';

export interface Text { zh: string; en: string }
export interface List { zh: string[]; en: string[] }

/** One figure on a slide. width is the layout width the figure is rendered at
 *  (its blog column is 760); scale shrinks the rendered figure uniformly. */
export type FigureRef = { width?: number; scale?: number } & (
  | { kind: 'loop'; id: keyof typeof loopFigures }
  | { kind: 'smelt'; id: keyof typeof smeltFigures }
  | { kind: 'hero' }
  | { kind: 'formula' }
  | { kind: 'math'; name: 'multiplier' | 'conditions' }
  | { kind: 'recipe' }
);

export type Part = 'intro' | 'loop' | 'smelt';
export type Layout = 'cover' | 'section' | 'split' | 'stack' | 'cards' | 'columns' | 'end';

export interface Slide {
  part: Part;
  /** Stage in the talk's arc: question, motivation, prior work, method, results, mechanism, conclusion. */
  stage?: Text;
  title: Text;
  minutes: number;
  layout: Layout;
  lead?: Text;
  points?: List;
  numbered?: boolean;
  callout?: Text;
  stats?: { value: string; label: Text; tone?: 'loop' | 'base' | 'gain' }[];
  cards?: { title: Text; body: Text; tag?: Text }[];
  columns?: { title: Text; items: List; tone?: 'loop' | 'muted' }[];
  figures?: FigureRef[];
  /** Width of the text column in split layouts (stage pixels). */
  textWidth?: number;
  visual?: 'loop-schematic';
  foot?: Text;
  source?: Text;
  /** Material the articles do not provide; shown as a dashed “to be added” tag. */
  todo?: Text[];
  notes: Text;
}

const stage = {
  question: { zh: '研究问题', en: 'Research question' },
  motivation: { zh: '动机', en: 'Motivation' },
  prior: { zh: '已有方法', en: 'Prior methods' },
  method: { zh: '方法', en: 'Method' },
  results: { zh: '实验结果', en: 'Results' },
  mechanism: { zh: '机制分析（描述性）', en: 'Mechanism (descriptive)' },
  conclusion: { zh: '局限与结论', en: 'Limitations and conclusion' },
} satisfies Record<string, Text>;

const loopSource = (number: number) => ({ zh: `Loop-μP 博文图 ${number}`, en: `Loop-μP article, Figure ${number}` });
const smeltSource = (number: number | string) => ({ zh: `SMELT 博文图 ${number}`, en: `SMELT article, Figure ${number}` });

export const slides: Slide[] = [
  // ───────────────────────────── Opening ─────────────────────────────
  {
    part: 'intro', layout: 'cover', minutes: 0.3,
    title: { zh: 'Looped Transformer 的两项研究', en: 'Two Studies of Looped Transformers' },
    lead: { zh: '把同一组层重复执行多次：参数不变，执行深度增加。', en: 'Run the same layers several times: the same parameters, a deeper computation.' },
    todo: [{ zh: '报告人', en: 'Speaker' }, { zh: '场合与日期', en: 'Venue and date' }],
    notes: {
      zh: '今天的报告分两部分，研究对象都是 Looped Transformer：把同一组层重复执行多次，参数量不变，执行深度增加。\n\n第一部分 Loop-μP，约 12 分：增加循环次数 $N$ 时，怎样让最小模型上调好的学习率继续最优。第二部分 SMELT，约 18 分：在同时对齐算力、参数量和 KV cache 的公平比较下，循环本身是否带来收益。\n\n两部分都按“研究问题—动机—已有方法—实验结果—局限与结论”的顺序讲。报告人、场合和日期还需补充。',
      en: 'The talk has two parts, both about Looped Transformers: running the same layers several times, which keeps the parameter count and deepens the computation.\n\nPart one, Loop-μP (about 12 minutes): how to keep the learning rate tuned on the smallest model optimal as the loop count $N$ grows. Part two, SMELT (about 18 minutes): whether looping itself helps when compute, parameters and KV cache are all matched.\n\nBoth parts follow the same arc: question, motivation, prior methods, results, limitations and conclusion. Speaker, venue and date still need to be filled in.',
    },
  },

  // ───────────────────────────── Loop-μP ─────────────────────────────
  {
    part: 'loop', layout: 'section', minutes: 0.3,
    title: { zh: 'Loop-μP', en: 'Loop-μP' },
    lead: { zh: 'Looped Transformer 的残差缩放与超参数迁移', en: 'Residual Scaling and Hyperparameter Transfer in Looped Transformers' },
    notes: {
      zh: '第一部分是 Loop-μP。一句话概括：循环不等于加深。共享权重让各次循环写入残差流的增量同向累加；把残差分支再乘以 1/$N$，学习率就能跨循环次数迁移。',
      en: 'Part one is Loop-μP. In one sentence: looping is not extra depth. Shared weights make the increments of every loop add along one direction; scale each residual branch by a further 1/$N$ and the learning rate transfers across loop counts.',
    },
  },
  {
    part: 'loop', stage: stage.question, layout: 'split', minutes: 0.9, visual: 'loop-schematic', textWidth: 600,
    title: { zh: '循环次数 $N$ 能否像宽度和深度一样，实现超参数迁移？', en: 'Can the loop count $N$ transfer hyperparameters the way width and depth do?' },
    points: {
      zh: [
        'Looped Transformer 把同一组 $L$ 层重复执行 $N$ 次：参数只有 $L$ 层，执行深度却有 $N$×$L$ 层',
        '已有研究发现，循环能帮助模型完成多步推理；语言建模中，下游准确率随 $N$ 上升，在推理类任务上尤为明显',
        '因此，增加 $N$ 是扩展循环模型的一个自然方向',
      ],
      en: [
        'A looped Transformer runs the same stack of $L$ layers $N$ times: it stores $L$ layers but executes $N$×$L$',
        'Prior work finds that looping helps multi-step reasoning; in language modeling, downstream accuracy rises with $N$, most strongly on reasoning tasks',
        'Increasing $N$ is therefore a natural way to scale a looped model',
      ],
    },
    notes: {
      zh: 'Looped Transformer 把同一组 $L$ 层重复执行 $N$ 次，参数只有 $L$ 层，执行深度却是 $N$×$L$ 层。已有研究发现循环能帮助多步推理，语言建模中下游准确率也随 $N$ 上升，推理类任务上尤为明显，所以增加 $N$ 是扩展循环模型的自然方向。\n\n我们的问题是：宽度和深度上已经有 μP、Depth-μP 让超参数迁移，循环次数 $N$ 能否同样做到？\n\n先给出答案：Loop-μP 在原有深度缩放的基础上，把每个残差分支再乘以 1/$N$，学习率不随 $N$ 改变。在语言模型实验中，最小模型上调好的基础学习率，在循环次数到 8、执行深度到 384 层时始终最优。',
      en: 'A looped Transformer runs one stack of $L$ layers $N$ times: it stores $L$ layers but executes $N$×$L$. Prior work finds that looping helps multi-step reasoning and that downstream accuracy rises with $N$, most strongly on reasoning tasks, so increasing $N$ is a natural way to scale.\n\nOur question: μP and Depth-μP already transfer hyperparameters across width and depth. Can the loop count $N$ do the same?\n\nThe answer up front: Loop-μP multiplies each residual branch by a further 1/$N$ on top of the existing depth scaling and keeps the learning rate independent of $N$. In our language-modeling experiments, the base learning rate tuned on the smallest model stays best up to 8 loops and 384 executed layers.',
    },
  },
  {
    part: 'loop', stage: stage.motivation, layout: 'cards', minutes: 0.8,
    title: { zh: '$N$ 一变大，训练就容易不稳定，最优学习率也会移动', en: 'As $N$ grows, training destabilizes and the best learning rate moves' },
    cards: [
      { title: { zh: '训练不稳定', en: 'Unstable training' }, body: { zh: '增大循环次数 $N$ 后，训练容易不稳定。', en: 'Training becomes unstable as the loop count $N$ grows.' } },
      { title: { zh: '最优学习率移动', en: 'The optimum moves' }, body: { zh: '最优学习率跟着 $N$ 移动，每换一个 $N$ 都要重新搜索。', en: 'The best learning rate moves with $N$ and must be searched again for every $N$.' } },
      { title: { zh: '例：Ouro', en: 'Example: Ouro' }, body: { zh: '训练中观察到 loss spike 后减少了循环次数；又因为算力不允许做学习率扫描，只能采用保守的学习率。', en: 'Reduced the loop count after observing loss spikes, and adopted a conservative learning rate because its compute budget did not allow a learning-rate sweep.' } },
    ],
    notes: {
      zh: '问题在于，$N$ 一变大，训练就容易不稳定，最优学习率也会跟着移动，每换一个 $N$ 都要重新搜索。\n\n一个例子是 Ouro：训练中观察到 loss spike 后减少了循环次数，又因为算力不允许做学习率扫描，只能采用保守的学习率。也就是说，调参成本直接限制了循环次数的扩展。',
      en: 'The problem: as $N$ grows, training tends to become unstable and the best learning rate moves, so it has to be searched again for every $N$.\n\nOuro is one example: it reduced the loop count after observing loss spikes, and adopted a conservative learning rate because its compute budget did not allow a learning-rate sweep. Tuning cost directly limits how far the loop count can be scaled.',
    },
  },
  {
    part: 'loop', stage: stage.prior, layout: 'cards', minutes: 0.8,
    title: { zh: 'μP 与 Depth-μP：调好小模型，直接用到大模型', en: 'μP and Depth-μP: tune a small model, reuse it on a large one' },
    lead: { zh: '残差网络的每个分支按 $x$ ← $x$ + $c$·$f$($x$) 更新残差流，$c$ 是分支系数。网络越深，累加的增量越多，深度参数化便随层数缩小 $c$。', en: 'Each residual branch updates the stream as $x$ ← $x$ + $c$·$f$($x$), with branch multiplier $c$. A deeper network adds more increments, so depthwise parameterizations shrink $c$ with depth.' },
    cards: [
      { tag: { zh: '宽度 $n$', en: 'Width $n$' }, title: { zh: 'μP', en: 'μP' }, body: { zh: '隐藏层 Adam 学习率乘以 $n$^{−1}', en: 'Hidden-layer Adam learning rate times $n$^{−1}' } },
      { tag: { zh: '深度 $L$', en: 'Depth $L$' }, title: { zh: 'Depth-μP', en: 'Depth-μP' }, body: { zh: '分支系数 $c$ ∝ $L$^{−1/2}', en: 'Branch multiplier $c$ ∝ $L$^{−1/2}' } },
      { tag: { zh: '深度 $L$', en: 'Depth $L$' }, title: { zh: 'CompleteP', en: 'CompleteP' }, body: { zh: '分支系数 $c$ ∝ $L$^{−1}', en: 'Branch multiplier $c$ ∝ $L$^{−1}' } },
    ],
    callout: { zh: '把循环当作额外深度，分支系数似乎就该再乘 $N$^{−1/2}——这样对吗？', en: 'Treat the loops as extra depth, and the branch seemingly needs another $N$^{−1/2}. Is that right?' },
    notes: {
      zh: '宽度和深度上，这个问题已经有了答案。μP 和 Depth-μP 选择合适的参数化，让最优超参数在模型变宽或变深时保持不变，于是可以在小模型上调好超参数，直接用到大模型上。\n\n深度方向：残差分支按 $x$ ← $x$ + $c$·$f$($x$) 更新，网络越深累加的增量越多，所以要随层数缩小 $c$。Depth-μP 取 $c$ ∝ $L$^{−1/2}，CompleteP 取 $c$ ∝ $L$^{−1}，两者都能让学习率跨深度迁移。宽度方向沿用标准 μP，隐藏层 Adam 学习率乘以 $n$^{−1}。\n\n循环 $N$ 次的 $L$ 层模型共执行 $N$×$L$ 层，把循环当作额外的深度似乎很自然，分支系数就该再乘 $N$^{−1/2}。接下来两页说明问题出在权重共享上。',
      en: 'For width and depth, the problem already has an answer. μP and Depth-μP choose a parameterization under which the best hyperparameters stay put as the model gets wider or deeper, so they can be tuned on a small model and reused on a large one.\n\nFor depth: each branch updates the stream as $x$ ← $x$ + $c$·$f$($x$); a deeper network adds more increments, so $c$ shrinks with depth. Depth-μP uses $c$ ∝ $L$^{−1/2} and CompleteP uses $c$ ∝ $L$^{−1}; both transfer the learning rate across depths. For width, standard μP scales the hidden-layer Adam learning rate by $n$^{−1}.\n\nA model of $L$ layers looped $N$ times executes $N$×$L$ layers, so treating loops as extra depth, with another $N$^{−1/2}, seems natural. The next two slides show that weight sharing breaks this.',
    },
  },
  {
    part: 'loop', stage: stage.prior, layout: 'split', minutes: 1.0, textWidth: 360,
    title: { zh: '循环不等于加深：共享权重让增量同向累加', en: 'Looping is not extra depth: shared weights add increments along one direction' },
    points: {
      zh: [
        '初始化时，$L$ 个独立层写入的增量方向几乎互不相关，像随机游走，总和只按 √$L$ 增长',
        '同一个块循环 $N$ 次，每次用的都是同一组权重，增量彼此正相关，总和按 $N$ 线性增长',
      ],
      en: [
        'At initialization, $L$ independent layers write increments in nearly unrelated directions; like a random walk, their sum grows only as √$L$',
        'One block looped $N$ times uses the same weights every loop; the increments are positively correlated and their sum grows linearly in $N$',
      ],
    },
    figures: [{ kind: 'loop', id: 'vector-sum', width: 760, scale: 0.98 }],
    source: loopSource(1),
    notes: {
      zh: '这张图是示意。左边是 $L$ 个独立的层：初始化时它们写入残差流的增量方向几乎互不相关，像随机游走一样首尾相接，总长度只按 √$L$ 增长。右边是同一个块循环 $N$ 次：每次循环用的都是同一组权重，增量彼此正相关，沿一条线累加，总长度按 $N$ 线性增长。\n\n可以现场切换“残差分支系数”：取 1/√$L$ 或 1/√$N$ 时，独立层的总增量保持常数量级，循环的总增量仍按 √$N$ 增长；只有 1/$N$ 才能让循环的总增量保持常数量级。',
      en: 'This is an illustration. On the left, $L$ independent layers: at initialization their increments point in nearly unrelated directions and add head to tail like a random walk, so the total grows only as √$L$. On the right, one block looped $N$ times: every loop uses the same weights, the increments are positively correlated and line up, so the total grows linearly in $N$.\n\nSwitch the branch multiplier live: with 1/√$L$ or 1/√$N$ the independent layers stay of order one while the looped total still grows as √$N$; only 1/$N$ keeps the looped total of order one.',
    },
  },
  {
    part: 'loop', stage: stage.prior, layout: 'split', minutes: 0.9, textWidth: 370,
    title: { zh: '真实 Transformer 中，只有 $N$^{−1} 能让初始化的残差流有界', en: 'In a real Transformer, only $N$^{−1} keeps the initial residual stream bounded' },
    points: {
      zh: [
        '把 12 层 pre-norm 块循环 $N$ 次，对比串联 $m$_{$L$} 个独立 12 层块的非循环模型',
        '不缩放：循环模型的范数随 $N$ 线性增长，非循环只按 √$m$_{$L$}',
        '$N$^{−1/2} 压不住；$N$^{−3/2} 虽有界，却把循环模型推向恒等映射',
        '64 次循环的增量两两正相关，平均余弦约 0.85（博文图 3）',
      ],
      en: [
        'Loop a 12-layer pre-norm stack $N$ times; compare with untied models chaining $m$_{$L$} independent 12-layer stacks',
        'Unscaled: the looped norm grows linearly in $N$, the untied norm only as √$m$_{$L$}',
        '$N$^{−1/2} is not enough; $N$^{−3/2} bounds the norm but drives the looped model toward the identity map',
        'The 64 increments of a looped stack are all positively correlated, mean cosine about 0.85 (article Figure 3)',
      ],
    },
    figures: [{ kind: 'loop', id: 'init-norm', width: 760, scale: 0.94 }],
    source: loopSource(2),
    notes: {
      zh: '真实的 Transformer 也是如此。我们把一个 12 层的 pre-norm Transformer 块循环 $N$ 次，与串联 $m$_{$L$} 个独立 12 层块的非循环模型对比（深度倍数 $m$_{$L$} = $L$/12），在初始化时测量残差流的范数。\n\n不加缩放时，循环模型的范数随 $N$ 线性增长，非循环模型只按 √$m$_{$L$} 增长。对非循环模型，$m$_{$L$}^{−1/2} 已经能让范数保持在常数量级；对循环模型，$N$^{−1/2} 仍压不住，只有 $N$^{−1} 才行。$N$^{−3/2} 虽然也能让范数有界，却会把循环模型推向恒等映射。\n\n增量之间的余弦相似度解释了这一差别（博文图 3）：64 个独立块的增量两两近似正交；循环 64 次时，所有增量两两正相关，平均余弦约为 0.85。',
      en: 'Real Transformers behave the same way. We loop a 12-layer pre-norm stack $N$ times and compare it with untied models chaining $m$_{$L$} independent 12-layer stacks (depth multiplier $m$_{$L$} = $L$/12), measuring the residual-stream norm at initialization.\n\nWithout scaling, the looped norm grows linearly in $N$ while the untied norm grows only as √$m$_{$L$}. For the untied model, $m$_{$L$}^{−1/2} already keeps the norm of order one; for the looped model, $N$^{−1/2} is not enough and only $N$^{−1} works. $N$^{−3/2} also bounds the norm, but drives the looped model toward the identity map.\n\nThe cosine similarity between increments explains the difference (article Figure 3): the increments of 64 independent stacks are nearly orthogonal, while the 64 increments of a looped stack are all positively correlated, with a mean cosine of about 0.85.',
    },
  },
  {
    part: 'loop', stage: stage.method, layout: 'split', minutes: 1.5, textWidth: 470, numbered: true,
    title: { zh: '为什么恰好是 1/$N$：三条约束只剩唯一解', en: 'Why exactly 1/$N$: three constraints leave one solution' },
    lead: { zh: '分支系数 $c$_{$N$} = $a$$N$^{−$α$_{$N$}}；一步更新的步长 ∝ $N$^{−$γ$_{$N$}}（对 Adam 即学习率随 $N$ 的缩放）', en: 'Branch multiplier $c$_{$N$} = $a$$N$^{−$α$_{$N$}}; one update step scales as $N$^{−$γ$_{$N$}} (for Adam, the learning-rate scaling)' },
    points: {
      zh: [
        '**初始化前向稳定**：总增量 $N$·$c$_{$N$} ∝ $N$^{1−$α$_{$N$}} ⟹ $α$_{$N$} ≥ 1',
        '**单次循环的特征更新有界**：∝ $N$^{−$γ$_{$N$}} ⟹ $γ$_{$N$} ≥ 0',
        '**输出变化保持常数量级**：∝ $N$^{1−$α$_{$N$}−$γ$_{$N$}} ⟹ $α$_{$N$} + $γ$_{$N$} = 1',
      ],
      en: [
        '**Stable forward pass at init**: total increment $N$·$c$_{$N$} ∝ $N$^{1−$α$_{$N$}} ⟹ $α$_{$N$} ≥ 1',
        '**Bounded feature update in one loop**: ∝ $N$^{−$γ$_{$N$}} ⟹ $γ$_{$N$} ≥ 0',
        '**Order-one change in the output**: ∝ $N$^{1−$α$_{$N$}−$γ$_{$N$}} ⟹ $α$_{$N$} + $γ$_{$N$} = 1',
      ],
    },
    callout: { zh: '上下界相遇：($α$_{$N$}, $γ$_{$N$}) = ([l:1], [l:0])', en: 'The bounds meet: ($α$_{$N$}, $γ$_{$N$}) = ([l:1], [l:0])' },
    figures: [{ kind: 'loop', id: 'ledger', width: 700, scale: 0.86 }],
    source: loopSource(4),
    notes: {
      zh: '要让同一个学习率在任意 $N$ 下都好用，$N$ 变大时模型既不能爆炸，也不能停止学习。这本“三行账本”：\n\n第一，每次循环向残差流写入量级为 $c$_{$N$} 的增量，共享权重让 $N$ 份同向叠加，总增量 ∝ $N$^{1−$α$_{$N$}}，要初始化不爆炸必须 $α$_{$N$} ≥ 1。第二，一步更新把权重改变 $N$^{−$γ$_{$N$}} 量级，单次循环的分支输出也变化这么多，要特征变化不随 $N$ 爆炸必须 $γ$_{$N$} ≥ 0。第三，更新后的权重在全部 $N$ 次循环里都被用到，每次把输出往降低损失的同一方向推 $c$_{$N$}·$N$^{−$γ$_{$N$}}，同号累加后 ∝ $N$^{1−$α$_{$N$}−$γ$_{$N$}}；它增长则学习率要随 $N$ 调小，趋于 0 则要调大，只有保持常数量级，即 $α$_{$N$} + $γ$_{$N$} = 1，同一个学习率才对所有 $N$ 合适。\n\n第二、三条给出上界 $α$_{$N$} ≤ 1，第一条给出下界 $α$_{$N$} ≥ 1，唯一解是 (1, 0)。图中每一行是由若干份拼成的横条，虚线是 $N$ = 1 时的长度；取 $c$_{$N$} = 1/$N$、学习率不变，三条横条始终停在虚线上，换成别的取法总有一条伸长或缩短。\n\n这也回答了两个问题：衰减更快的 $N$^{−3/2} 会让输出变化随 $N$ 趋于 0，网络学不动，若调大学习率补救，首轮特征变化又会爆炸；而共享权重虽然收到 $N$ 份梯度，每份已经带上 1/$N$，加起来正好是平均值，所以 Adam 和 SGD 下学习率都不需要随 $N$ 改变。',
      en: 'For one learning rate to work at every $N$, the network must neither blow up nor stall as $N$ grows. The three-line ledger:\n\nFirst, each loop writes an increment of size $c$_{$N$}; shared weights make the $N$ increments add along one direction, so the total is ∝ $N$^{1−$α$_{$N$}}, and a stable initialization needs $α$_{$N$} ≥ 1. Second, one step changes the weights by $N$^{−$γ$_{$N$}}, so the branch output of one loop changes by as much; keeping features bounded needs $γ$_{$N$} ≥ 0. Third, the updated weights are reused in all $N$ loops, each pushing the output in the loss-reducing direction by $c$_{$N$}·$N$^{−$γ$_{$N$}}; the aligned sum is ∝ $N$^{1−$α$_{$N$}−$γ$_{$N$}}. If it grew, the learning rate would have to shrink with $N$; if it vanished, it would have to grow. Only $α$_{$N$} + $γ$_{$N$} = 1 lets one learning rate suit every $N$.\n\nSteps 2 and 3 give the upper bound $α$_{$N$} ≤ 1, step 1 the lower bound $α$_{$N$} ≥ 1: the unique solution is (1, 0). In the figure each line is a bar of pieces and the dashed line marks its length at $N$ = 1; with $c$_{$N$} = 1/$N$ and a fixed learning rate all three bars stay on the line, and any other choice makes at least one grow or shrink.\n\nThis answers two questions. Decaying faster, as $N$^{−3/2}, makes the output change vanish so training stalls, and raising the learning rate to compensate blows up the first-loop feature change. And although the shared weights receive $N$ gradients, each already carries 1/$N$, so their sum is an average; under both Adam and SGD the learning rate need not change with $N$.',
    },
  },
  {
    part: 'loop', stage: stage.method, layout: 'split', minutes: 1.0, textWidth: 400,
    title: { zh: '加深允许一段区间，循环只剩一个点', en: 'Depth allows an interval; loops leave a single point' },
    points: {
      zh: [
        '训练侧约束对独立层同样成立：$γ$ ≥ 0、$α$ + $γ$ = 1 ⟹ $α$ ≤ 1',
        '独立层前向按 √$L$ 累加，只需 $α$_{$L$} ≥ 1/2：区间 [1/2, 1]，两端是 Depth-μP (1/2, 1/2) 与 CompleteP (1, 0)',
        '共享权重前向按 $N$ 累加，下界推高到 $α$_{$N$} ≥ 1，区间收缩成 (1, 0) 一个点',
      ],
      en: [
        'The training-side constraints also hold for independent layers: $γ$ ≥ 0, $α$ + $γ$ = 1 ⟹ $α$ ≤ 1',
        'Independent layers add as √$L$ forward, needing only $α$_{$L$} ≥ 1/2: the interval [1/2, 1], with Depth-μP (1/2, 1/2) and CompleteP (1, 0) at its ends',
        'A shared block adds as $N$ forward, raising the lower bound to $α$_{$N$} ≥ 1 and collapsing the interval to the point (1, 0)',
      ],
    },
    figures: [{ kind: 'loop', id: 'phase', width: 780, scale: 0.88 }],
    source: loopSource(9),
    notes: {
      zh: '对 $L$ 个权重独立的层重复同样的分析（即 Depth-μP 的分析），训练这一侧的约束完全不变：每层的更新虽然只用一次，但同样与该层输入对齐，$L$ 层对输出变化的贡献照样同号相加，因此同样要求 $γ$_{$L$} ≥ 0 且 $α$_{$L$} + $γ$_{$L$} = 1，上界 $α$_{$L$} ≤ 1。两者的差别只在前向初始化。\n\n独立的层在前向时像随机游走一样按 √$L$ 累加，只需 $α$_{$L$} ≥ 1/2，留出整段区间 [1/2, 1]，左端点 (1/2, 1/2) 是 Depth-μP，右端点 (1, 0) 是 CompleteP。共享权重按 $N$ 线性累加，把下界推高到 $α$_{$N$} ≥ 1，正好撞上训练上界，只剩 (1, 0)。\n\n现场可以把权重从“共享”切到“独立”：“初始化不稳定”的边界从 $α$ = 1 退到 1/2，可行取法从一个点变成对角线上的一段；也可以在平面上拖动查看三条约束的状态。\n\n限定条件：论文附录把结论推广为对所有 ($α$_{$N$}, $γ$_{$N$}) 的完整分类，覆盖任意有限训练步数，并扩展到含多个矩阵的残差分支；严格证明针对用 SGD 训练的线性网络，对非线性激活和 Adam 是在额外假设下给出论证。',
      en: 'Repeat the analysis for $L$ layers with independent weights (as in Depth-μP) and the training side gives exactly the same constraints: each layer\'s update is used only once, but it still aligns with that layer\'s input, and the $L$ contributions to the output change still add with one sign. So $γ$_{$L$} ≥ 0 and $α$_{$L$} + $γ$_{$L$} = 1, giving the upper bound $α$_{$L$} ≤ 1. The only difference lies in the forward pass at initialization.\n\nIndependent layers add like a random walk as √$L$, needing only $α$_{$L$} ≥ 1/2. That leaves the interval [1/2, 1], with Depth-μP at (1/2, 1/2) and CompleteP at (1, 0). A shared block adds linearly in $N$, pushing the lower bound to $α$_{$N$} ≥ 1, right onto the training upper bound: only (1, 0) remains.\n\nLive: switch the weights from shared to independent and the “unstable at init” boundary retreats from $α$ = 1 to 1/2, turning a single point into a segment of the diagonal; you can also drag in the plane to see the three constraints.\n\nQualifiers: the paper\'s appendix extends this to a full classification of all ($α$_{$N$}, $γ$_{$N$}) over any finite training horizon and to branches with several matrices. The proofs cover linear networks trained with SGD; for nonlinear activations and Adam the result is justified under additional assumptions.',
    },
  },
  {
    part: 'loop', stage: stage.method, layout: 'split', minutes: 0.9, textWidth: 430,
    title: { zh: 'Loop-μP 配方：相对非循环配方只改一处', en: 'The Loop-μP recipe: one change from the untied recipe' },
    points: {
      zh: [
        '循环 $N$：残差分支乘以 [l:$N$^{−1}]，学习率不随 $N$ 缩放',
        '深度 $L$：取区间左端点，残差分支与隐藏层学习率都乘以 $L$^{−1/2}',
        '宽度 $n$：沿用标准 μP，隐藏层 Adam 学习率乘以 $n$^{−1}',
        '初始化方差、学习率、weight decay 和 AdamW $ε$ 的规则不变：$N$ = 1 时调好的模型，残差分支除以 $N$ 就能循环更多次',
      ],
      en: [
        'Loops $N$: multiply each residual branch by [l:$N$^{−1}]; keep the learning rate free of $N$',
        'Depth $L$: take the left endpoint; multiply the residual branch and hidden-layer learning rate by $L$^{−1/2}',
        'Width $n$: standard μP, hidden-layer Adam learning rate times $n$^{−1}',
        'Initialization, learning-rate, weight-decay and AdamW $ε$ rules are unchanged: a model tuned at $N$ = 1 loops more simply by dividing its residual branches by $N$',
      ],
    },
    figures: [{ kind: 'math', name: 'multiplier', width: 720, scale: 0.94 }, { kind: 'recipe', width: 720, scale: 0.94 }],
    source: { zh: 'Loop-μP 博文“Loop-μP 配方”一节', en: 'Loop-μP article, “The Loop-μP recipe”' },
    notes: {
      zh: '真实的 Looped Transformer 同时有深度 $L$ 和循环次数 $N$：每次循环内部串联 $L$ 个权重独立的层，整组层再共享权重重复 $N$ 次。把上一节结论分别用到两个维度：\n\n循环维度唯一解是 $α$_{$N$} = 1、$γ$_{$N$} = 0，残差分支乘以 $N$^{−1}，学习率乘 $N$^{0}。深度维度可行区间是 [1/2, 1]；与 Depth-μP 一样，我们要求同一次循环内各层的特征变化尽可能充分，选出左端点，残差分支和隐藏层学习率都乘以 $L$^{−1/2}。宽度维度沿用标准 μP，隐藏层 Adam 学习率乘以 $n$^{−1}。\n\n写成 pre-LN Transformer 的完整配方，与非循环模型相比只有一处改动：注意力和 MLP 两个残差分支各自多乘一个 1/$N$（图中橙色）。初始化方差、学习率、weight decay 和 AdamW $ε$ 规则都相同，所以 $N$ = 1 时调好超参数的模型，只需把残差分支除以 $N$，就能直接循环更多次。完整配方表在博文中可以展开查看。',
      en: 'A real looped Transformer has both depth $L$ and loop count $N$: each loop runs $L$ distinct layers, and the whole stack repeats $N$ times with shared weights. Apply the previous section to each dimension.\n\nLoops: the unique exponents $α$_{$N$} = 1, $γ$_{$N$} = 0, so each residual branch is multiplied by $N$^{−1} and the learning rate by $N$^{0}. Depth: the feasible interval is [1/2, 1]; as in Depth-μP we ask every layer within a loop to evolve as much as possible, which selects the left endpoint, so the residual branch and hidden-layer learning rate are multiplied by $L$^{−1/2}. Width: standard μP scales the hidden-layer Adam learning rate by $n$^{−1}.\n\nAs a full recipe for pre-LN Transformers, Loop-μP differs from the untied recipe in only one place: the attention and MLP residual branches each get an extra 1/$N$ (orange). Initialization variances, learning rates, weight decay and AdamW $ε$ are identical, so a model tuned at $N$ = 1 loops more simply by dividing its residual branches by $N$. The full table can be expanded in the article.',
    },
  },
  {
    part: 'loop', stage: stage.results, layout: 'split', minutes: 0.8, textWidth: 380,
    title: { zh: '一步更新：只有 $α$_{$N$} = 1 时，变化与 $N$ 无关', en: 'One update step: only $α$_{$N$} = 1 gives a change independent of $N$' },
    points: {
      zh: [
        '初始化处，对所有 $N$ 用同一学习率（$γ$_{$N$} = 0）做一步 AdamW，测量最终残差流的变化',
        '推导预测：变化 ∝ $N$^{1−$α$_{$N$}}',
        '$α$_{$N$} = 0、1/2 时随 $N$ 增长；3/2 时随 $N$ 缩小',
        '$α$_{$N$} = 1：$N$ 从 1 增大到 64，第一步的变化始终在 0.08 到 0.19 之间；前十步规律相同',
      ],
      en: [
        'At initialization, one AdamW step with the same learning rate for every $N$ ($γ$_{$N$} = 0); measure the change of the final residual stream',
        'The derivation predicts a change ∝ $N$^{1−$α$_{$N$}}',
        'It grows with $N$ under $α$_{$N$} = 0 and 1/2, and shrinks under 3/2',
        'Under $α$_{$N$} = 1 the first-step change stays between 0.08 and 0.19 as $N$ grows from 1 to 64; the first ten steps agree',
      ],
    },
    figures: [{ kind: 'loop', id: 'one-step', width: 760, scale: 0.95 }],
    source: loopSource(10),
    notes: {
      zh: '先看理论预测在真实 Transformer 的一步更新中是否成立。我们在初始化处对所有 $N$ 使用同一个学习率（即 $γ$_{$N$} = 0）做一步 AdamW 更新，测量最终残差流的变化。\n\n按推导，此时变化量正比于 $N$^{1−$α$_{$N$}}：只有 $α$_{$N$} = 1 时与 $N$ 无关，更小时随 $N$ 增长，更大时随 $N$ 缩小。实测完全一致：$α$_{$N$} = 0 和 1/2 时变化随 $N$ 增长，3/2 时随 $N$ 缩小；只有 $α$_{$N$} = 1 时，$N$ 从 1 增大到 64，第一步的变化始终稳定在 0.08 到 0.19 之间。图上方可以切换步数，前十步也是同样的规律。',
      en: 'First, does the prediction hold for one optimizer step in a real Transformer? At initialization we take one AdamW step with the same learning rate for every $N$ ($γ$_{$N$} = 0) and measure the change of the final residual stream.\n\nThe derivation predicts a change proportional to $N$^{1−$α$_{$N$}}: independent of $N$ only under $α$_{$N$} = 1, growing for smaller $α$_{$N$} and shrinking for larger. The measurements agree: the change grows under $α$_{$N$} = 0 and 1/2 and shrinks under 3/2, while under $α$_{$N$} = 1 the first-step change stays between 0.08 and 0.19 as $N$ goes from 1 to 64. The control above the chart steps through the first ten steps, which show the same pattern.',
    },
  },
  {
    part: 'loop', stage: stage.results, layout: 'split', minutes: 1.5, textWidth: 380,
    title: { zh: '一个学习率，适用于所有循环次数', en: 'One learning rate for every loop count' },
    lead: { zh: 'FineWeb-Edu · Llama 风格 pre-norm · 每个模型 10B token · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}', en: 'FineWeb-Edu · Llama-style pre-norm · 10B tokens each · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}' },
    points: {
      zh: [
        '**Loop-μP**：每个 $N$ 的最优基础学习率都是 1.25×10⁻³，$L$ = 24、48 时也一样',
        '其他三种循环因子下，最优学习率都随 $N$ 移动',
        '$N$ > 1 时，Loop-μP 在每个 $N$ 上的最低 loss 都最低，且随 $N$ 增大下降得最多',
      ],
      en: [
        '**Loop-μP**: the best base learning rate is 1.25×10⁻³ for every $N$, and the same at $L$ = 24 and 48',
        'Under the other three loop factors, the optimum moves with $N$',
        'For every $N$ > 1, Loop-μP reaches the lowest loss, and it falls the most as $N$ grows',
      ],
    },
    figures: [{ kind: 'loop', id: 'lr-transfer', width: 760, scale: 0.92 }],
    source: loopSource(11),
    notes: {
      zh: '实验设置：在 FineWeb-Edu 上训练 Llama 风格的 pre-norm Looped Transformer，每个模型 10B token。词嵌入和输出层放在循环之外，中间的 $L$ 层（12、24、48）循环 $N$ 次（1、2、4、8）。每组 ($L$, $N$) 在 $L$ = 12、$N$ = 1 时调好的基础学习率附近扫描。$L$ = 12 时比较四种循环因子：不缩放（1）、把循环当深度的 $N$^{−1/2}、Loop-μP 的 $N$^{−1}，以及比理论衰减更快的 $N$^{−3/2}；$L$ = 24、48 只用 Loop-μP，并按理论把学习率再乘 ($L$/12)^{−1/2}。\n\n只有 $N$^{−1} 让最优学习率不随 $N$ 移动：$L$ = 12 时每个 $N$ 的最优基础学习率都是 1.25×10⁻³，$L$ = 24、48 也一样。不缩放时，最优学习率从 $N$ ≤ 2 的 1.25×10⁻³ 降到 $N$ = 8 的 7.5×10⁻⁴，不低于 3×10⁻³ 的训练在 $N$ ≥ 4 时发散，与一步更新随 $N$ 增长一致。$N$^{−3/2} 下，最优学习率从 1.25×10⁻³ 升到 $N$ = 8 的 3×10⁻³；理论预测此时一步更新按 $N$^{−1/2} 缩小，补回需要学习率按 $N$^{1/2} 增大，$N$ = 8 时约 3.5×10⁻³。$N$^{−1/2} 下最优学习率在 $N$ ≥ 4 时也开始移动。\n\nloss 方面，$N$ > 1 时 Loop-μP 在每个 $N$ 上的最低 loss 都低于其他三种循环因子，且随 $N$ 增大下降得最多，这与前向分析一致：不缩放和 $N$^{−1/2} 让残差流随 $N$ 增长，$N$^{−3/2} 把模型推向恒等映射。加上深度因子后，我们训练的所有 ($L$, $N$) 组合共用同一个最优基础学习率。图上可以切换循环因子和深度。',
      en: 'Setup: Llama-style pre-norm looped Transformers trained on FineWeb-Edu for 10B tokens each. The token embedding and output head stay outside the loop; a stack of $L$ layers (12, 24, 48) is looped $N$ times (1, 2, 4, 8). For every ($L$, $N$) we sweep the learning rate around the base value tuned at $L$ = 12, $N$ = 1. At $L$ = 12 we compare four loop factors: unscaled (1), $N$^{−1/2} (loops as depth), $N$^{−1} (Loop-μP) and $N$^{−3/2} (faster than the theory prescribes). At $L$ = 24 and 48 we use only Loop-μP and multiply the learning rate by ($L$/12)^{−1/2} as the theory predicts.\n\nOnly $N$^{−1} keeps the optimum fixed: under Loop-μP the best base learning rate is 1.25×10⁻³ for every $N$ at $L$ = 12, and the same at $L$ = 24 and 48. Without a loop factor, the best learning rate falls from 1.25×10⁻³ at $N$ ≤ 2 to 7.5×10⁻⁴ at $N$ = 8, and learning rates of 3×10⁻³ and above diverge at $N$ ≥ 4, matching a one-step change that grows with $N$. Under $N$^{−3/2} it rises from 1.25×10⁻³ to 3×10⁻³ at $N$ = 8; the theory predicts the one-step response shrinks as $N$^{−1/2}, so compensating needs a learning rate growing as $N$^{1/2}, about 3.5×10⁻³ at $N$ = 8. Under $N$^{−1/2} the optimum also moves at $N$ ≥ 4.\n\nFor every $N$ > 1, Loop-μP\'s best loss is lower than under the other three factors and falls the most as $N$ grows, matching the forward analysis: unscaled and $N$^{−1/2} let the residual stream grow with $N$, and $N$^{−3/2} drives the model toward the identity map. With the depth factor applied, one base learning rate is best for every ($L$, $N$) we train. The controls switch the loop factor and the depth.',
    },
  },
  {
    part: 'loop', stage: stage.results, layout: 'split', minutes: 0.8, textWidth: 400,
    title: { zh: '训练之后，循环的增量仍然同向', en: 'After training, loop increments stay aligned' },
    points: {
      zh: [
        '对 $N$ = 8 的循环模型，完整训练 20,000 步后计算每两次循环增量的余弦相似度',
        '相似度比初始化时低，但除最后一次循环外，任意两次循环的增量仍正相关，三种深度都如此',
        '非循环 $L$ = 48 模型：层增量整体相似度低，主要只与相邻层相关',
        '同一深度下，最后一次循环后的残差流范数最多相差 1.32 倍（博文图 13）',
      ],
      en: [
        'For looped models with $N$ = 8, after full training (20,000 steps), the cosine between the increments of every pair of passes',
        'Lower than at initialization, but every pair excluding the final pass stays positively correlated, at all three depths',
        'Untied $L$ = 48: layer increments have low similarity overall and align mainly with nearby layers',
        'Within each depth, the norm after the last pass varies by at most 1.32× (article Figure 13)',
      ],
    },
    figures: [{ kind: 'loop', id: 'trained-cosine', width: 760, scale: 0.88 }],
    source: loopSource(12),
    notes: {
      zh: '上面的两条预测都是在初始化时验证的，完整训练之后还成立吗？我们对 $N$ = 8 的循环模型计算每两次循环增量之间的余弦相似度，并与训练后的非循环 $L$ = 48 模型的逐层增量对比。\n\n循环增量之间的相似度比初始化时低，但除最后一次循环外，任意两次循环的增量都仍然正相关，三种深度都是如此；只有最后一次循环与其他循环弱相关或负相关。非循环模型的层增量整体相似度低，主要只与相邻的层相关。\n\n我们还记录了每次循环后残差流的范数（博文图 13）：不同 $N$ 的轨迹各不相同，但在同一深度下，最后一次循环后的范数最多相差 1.32 倍，与初始化时范数不随 $N$ 变化的结论一致。',
      en: 'Both predictions above were checked at initialization. Do they hold after full training? For looped models with $N$ = 8 we compute the cosine similarity between the increments of every pair of passes, and compare with the per-layer increments of a trained untied model with $L$ = 48.\n\nThe similarities are lower than at initialization, but every pair of passes that excludes the final pass remains positively correlated, at all three depths; only the final pass is weakly or negatively correlated with the others. The untied model\'s layer increments have low similarity overall and align mainly with nearby layers.\n\nWe also trace the residual-stream norm after every pass (article Figure 13): the trajectories differ across $N$, but within each depth the norm after the last pass varies by at most a factor of 1.32, consistent with a norm that does not change with $N$ at initialization.',
    },
  },
  {
    part: 'loop', stage: stage.conclusion, layout: 'columns', minutes: 0.8,
    title: { zh: '循环与加深的区别在于权重共享', en: 'What separates looping from depth is weight sharing' },
    columns: [
      {
        title: { zh: '结论', en: 'Conclusion' }, tone: 'loop',
        items: {
          zh: [
            '共享权重让每次循环写入残差流的增量、一步更新带来的变化，都沿同一方向累加',
            'Loop-μP：在已有深度参数化的基础上，把每个残差分支乘以 1/$N$，学习率与 $N$ 无关',
            '学习率跨循环次数（到 8）和执行深度（到 384 层）迁移；loss 低于衰减更慢或更快的循环因子',
          ],
          en: [
            'Shared weights make the increments of every loop, and the changes caused by one update, add along one direction',
            'Loop-μP: multiply each residual branch by 1/$N$ on top of an existing depth parameterization; the learning rate is independent of $N$',
            'The learning rate transfers across loop counts (up to 8) and executed depths (up to 384 layers), with lower loss than loop factors decaying more slowly or faster',
          ],
        },
      },
      {
        title: { zh: '局限', en: 'Limitations' }, tone: 'muted',
        items: {
          zh: [
            '理论沿用 Depth-μP 的设定，分析去均值的 MLP 残差块；严格证明只针对线性网络',
            '推广到非线性激活和 Adam 依赖额外假设；注意力层和归一化层还没有纳入分析',
            '受算力限制，最大模型 438M 参数、训练 10B token；更大规模留待以后验证',
          ],
          en: [
            'The theory follows Depth-μP, analyzes a mean-centered MLP residual block, and proves its results for linear networks',
            'Nonlinear activations and Adam rely on additional assumptions; attention and normalization layers are not yet analyzed',
            'Limited by compute: the largest model has 438M parameters and 10B tokens; larger scales are left to future work',
          ],
        },
      },
    ],
    notes: {
      zh: '小结：循环与加深的区别在于权重共享。共享权重让每次循环写入残差流的增量，以及一步更新带来的变化，都沿同一方向累加，而不像独立的层那样分散在互不相关的方向上。由此得到的 Loop-μP 在已有深度参数化的基础上，把每个残差分支乘以 1/$N$，学习率与 $N$ 无关。在语言模型实验中，它让学习率跨循环次数（到 8）和执行深度（到 384 层）迁移，loss 也比衰减更慢或更快的循环因子更低。\n\n局限：理论沿用 Depth-μP 的设定，分析的是去均值的 MLP 残差块，严格证明只针对线性网络；推广到非线性激活和 Adam 依赖额外假设，注意力层和归一化层也还没有纳入分析。受算力限制，最大的模型为 438M 参数、训练 10B token，更大规模上的表现留待以后验证。\n\n我们希望 Loop-μP 能为循环模型社区提供一个简单的配方，以更低的调参成本训练更好的循环模型。下面进入第二部分。',
      en: 'In summary, what separates looping from adding depth is weight sharing. Shared weights make the increments every loop writes into the residual stream, and the changes caused by one update, add along one direction instead of spreading over unrelated directions as independent layers do. Loop-μP multiplies each residual branch by 1/$N$ on top of an existing depth parameterization and keeps the learning rate independent of $N$. In our language-modeling experiments it transfers the learning rate across loop counts (up to 8) and executed depths (up to 384 layers), with lower loss than loop factors that decay more slowly or faster than 1/$N$.\n\nLimitations: following Depth-μP, the theory analyzes a mean-centered MLP residual block and proves its results for linear networks; the extension to nonlinear activations and Adam relies on additional assumptions, and attention and normalization layers are not yet part of the analysis. Limited by compute, the largest model has 438M parameters trained on 10B tokens; larger scales are left to future work.\n\nWe hope Loop-μP offers the looped-model community a simple recipe for training better looped models at a lower tuning cost. On to part two.',
    },
  },

  // ───────────────────────────── SMELT ─────────────────────────────
  {
    part: 'smelt', layout: 'section', minutes: 0.3,
    title: { zh: 'SMELT', en: 'SMELT' },
    lead: { zh: '预算匹配下的 Looped Transformer Scaling Law', en: 'Scaling Laws for Budget-Matched Looped Transformers' },
    notes: {
      zh: '第二部分是 SMELT。一句话概括：同时对齐算力、参数量和 KV cache 后，循环仍能为 MoE 模型带来净收益。',
      en: 'Part two is SMELT. In one sentence: with compute, parameters and KV cache all matched, looping still yields a net gain for MoE models.',
    },
  },
  {
    part: 'smelt', stage: stage.question, layout: 'stack', minutes: 1.0,
    title: { zh: '收益来自循环架构本身，还是因为多花了算力？', en: 'Do the gains come from looping itself, or from the extra compute?' },
    lead: { zh: 'Looped Transformer 把一部分层重复执行，让模型在不增加参数的情况下获得更深的计算；这个想法在推理和数学等任务上已展现出不小的潜力。', en: 'A Looped Transformer executes some of its layers repeatedly, giving deeper computation without adding parameters; the idea has shown considerable promise on tasks such as reasoning and math.' },
    figures: [{ kind: 'hero', width: 760, scale: 1.18 }],
    source: { zh: 'SMELT 博文开篇动画', en: 'SMELT article, opening animation' },
    notes: {
      zh: '普通 Transformer 的每一层只执行一次，而 Looped Transformer 会把其中一部分层重复执行，让模型在不增加参数的情况下获得更深的计算。动画里同样是 12 层参数：Looped Transformer 把第 4–9 层再执行一遍，共执行 18 层。动画右下角可以重播。\n\n但多跑一遍就要多花一遍算力。我们的问题是：Looped Transformer 的收益，究竟来自循环架构本身，还是因为多花了算力？\n\n先给结论：16 组匹配配置中，SMELT 的验证损失全部低于基线；在算力最优前沿上，达到相同损失所需的训练算力少 6.8%–18.0%。',
      en: 'A standard Transformer runs each layer once, whereas a Looped Transformer runs some of its layers repeatedly, giving deeper computation without adding parameters. In the animation both have the same 12 layers of parameters; the Looped Transformer runs layers 4–9 a second time and executes 18 layers. The button at the bottom right replays it.\n\nBut every extra pass costs extra compute. Our question: do the gains of Looped Transformers come from the looped architecture itself, or from the extra compute they spend?\n\nThe result up front: SMELT reaches lower validation loss than the Baseline in all 16 matched configurations, and on the compute-optimal frontier it needs 6.8%–18.0% less training compute to reach the same loss.',
    },
  },
  {
    part: 'smelt', stage: stage.motivation, layout: 'cards', minutes: 0.9,
    title: { zh: '要判断循环本身是否有用，比较必须同时对齐三项预算', en: 'To tell whether looping itself helps, a comparison must match three budgets at once' },
    lead: { zh: '多跑一遍就要多花一遍算力，而以往的比较大多只固定模型大小，把循环架构本身的优势和多花的算力混在了一起。', en: 'Every extra pass costs extra compute, and most comparisons so far fix only model size, mixing the architecture’s own advantage with the extra compute it spends.' },
    cards: [
      { tag: { zh: '算力', en: 'Compute' }, title: { zh: '每 token FLOPs', en: 'Per-token FLOPs' }, body: { zh: '决定训练和推理成本', en: 'Determine training and inference cost' } },
      { tag: { zh: '容量', en: 'Capacity' }, title: { zh: '总参数量', en: 'Total parameters' }, body: { zh: '约束知识容量（非 embedding）', en: 'Bound knowledge capacity (non-embedding)' } },
      { tag: { zh: '上下文', en: 'Context' }, title: { zh: 'KV cache', en: 'KV cache' }, body: { zh: '限制可服务的上下文长度', en: 'Limits the context length that can be served' } },
    ],
    notes: {
      zh: '多跑一遍就要多花一遍算力，而以往的比较大多只固定模型大小，把循环架构本身的优势和多花的算力混在了一起。\n\n公平比较需要同时控制三个变量：决定训练和推理成本的每 token FLOPs、约束知识容量的总参数量，以及限制可服务上下文长度的 KV cache。\n\n据我们所知，这是块级循环（block-level looping）中首个同时匹配三项预算、并为两种架构分别拟合 Scaling Law 的多尺度研究。',
      en: 'Every extra pass costs extra compute, and most comparisons so far fix only model size, mixing the architecture’s own advantage with the extra compute it spends.\n\nA fair comparison has to control three quantities at once: per-token FLOPs, which determine training and inference cost; total parameters, which bound knowledge capacity; and the KV cache, which limits the context length that can be served.\n\nTo our knowledge, this is the first multi-scale study of block-level looping that matches all three budgets at once and fits a separate scaling law to each architecture.',
    },
  },
  {
    part: 'smelt', stage: stage.method, layout: 'split', minutes: 1.3, textWidth: 330, numbered: true,
    title: { zh: '预算匹配：借助 MoE 把参数量和计算量解耦', en: 'Budget matching: MoE decouples parameters from compute' },
    points: {
      zh: [
        '缩窄或变浅模型，抵消循环执行多出的计算',
        '增加专家数，补全总参数量',
        '调整注意力配置（GQA Ratio / Head Dim），匹配 KV cache',
      ],
      en: [
        'Make the model narrower or shallower to offset the extra computation of the repeated passes',
        'Add experts to make up the total parameter count',
        'Adjust the attention configuration (GQA ratio and head dimension) to match the KV cache',
      ],
    },
    foot: { zh: '三项预算为近似对齐；动画逐步展示从基线到 SMELT 的调整。', en: 'The three budgets are closely, not exactly, matched; the animation steps from the Baseline to SMELT.' },
    figures: [{ kind: 'smelt', id: 'recipe', width: 760, scale: 0.98 }],
    source: smeltSource(1),
    notes: {
      zh: '我们利用 MoE 将参数量和计算量解耦，具体的匹配方式分三步：第一，缩窄或变浅模型，抵消 Loop 架构循环执行的计算；第二，增加专家数，补全总参数量；第三，调整注意力配置（GQA Ratio / Head Dim）来匹配 KV cache。\n\n这张图从基线一步步变到 SMELT，下方三条指示条分别跟踪每 token FLOPs、总参数量和 KV cache 相对基线的比例。可以点击上方步骤回看每一步。注意文章的说法是“近似对齐”三项预算。',
      en: 'We use MoE to decouple parameters from compute, in three steps: make the model narrower or shallower to offset the extra computation of the repeated passes; add experts to make up the total parameter count; and adjust the attention configuration (GQA ratio and head dimension) to match the KV cache.\n\nThe figure steps from the Baseline to SMELT; the three meters track per-token FLOPs, total parameters and KV cache relative to the Baseline. Click the steps at the top to revisit each one. Note that the article says the three budgets are closely matched, not exactly.',
    },
  },
  {
    part: 'smelt', stage: stage.method, layout: 'split', minutes: 0.9, textWidth: 360,
    title: { zh: '配方 ①：循环中间 50% 的层时，验证损失最低', en: 'Recipe ①: looping the middle 50% of layers gives the lowest loss' },
    points: {
      zh: [
        '按上述预算规则，在小规模上依次搜索循环范围、执行深宽比和循环次数',
        '循环层比例从 0%（不循环）调到 100%（全部循环），约 50% 时验证损失最低',
        '我们推测：首尾的层承担特殊功能，保留独立参数可能比参与共享更有利',
      ],
      en: [
        'Under the budget-matching rules, search at small scale over loop span, effective depth-to-width ratio and loop count, in that order',
        'Vary the looped fraction from 0% (no looping) to 100% (every layer looped): validation loss is lowest at around 50%',
        'We conjecture the first and last layers serve specialized roles, so keeping their parameters independent may work better than sharing them',
      ],
    },
    figures: [{ kind: 'smelt', id: 'loop-span', width: 760, scale: 0.98 }],
    source: smeltSource(2),
    notes: {
      zh: '按上述控制预算的规则，我们在小规模上依次搜索循环范围、执行深宽比和循环次数。\n\n第一条：我们把循环层比例从 0%（不循环）一路调到 100%（全部循环），比例在 50% 左右时验证损失最低。我们推测，模型首尾的层承担着特殊功能，因此这些层保留独立参数，可能比参与共享更有利。注意这是推测，文章没有对此做专门验证。图上可以切换循环比例和稀疏度。',
      en: 'Under these budget-matching rules we search at small scale over the loop span, the effective depth-to-width ratio and the loop count, in that order.\n\nFirst: we vary the fraction of looped layers from 0% (no looping) to 100% (every layer looped); validation loss is lowest at around 50%. We conjecture that the first and last layers serve specialized roles, so keeping independent parameters for them may work better than sharing them. This is a conjecture, not separately tested in the article. The controls switch the looped fraction and the sparsity.',
    },
  },
  {
    part: 'smelt', stage: stage.method, layout: 'split', minutes: 0.9, textWidth: 360,
    title: { zh: '配方 ②：Looped 模型的最优执行深宽比更高', en: 'Recipe ②: looped models prefer a larger effective depth-to-width ratio' },
    points: {
      zh: [
        '固定 50% 循环范围，比较不同的执行深宽比（执行深度与模型宽度之比）',
        'Looped 模型的最优执行深宽比高于非 Looped 模型',
        '我们推测与参数共享有关：额外执行深度不引入新参数，同一组共享参数同时获得来自“浅层”和“深层”的梯度信号，可能让更深的配置更容易优化',
      ],
      en: [
        'With the loop span fixed at 50%, compare effective depth-to-width ratios (executed depth divided by model width)',
        'The looped model’s optimal ratio is larger than the unlooped model’s',
        'We conjecture this relates to parameter sharing: extra executed depth adds no parameters, and the shared parameters get gradient signals from both “shallow” and “deep” positions, which may make deeper configurations easier to optimize',
      ],
    },
    figures: [{ kind: 'smelt', id: 'depth-width', width: 760, scale: 0.98 }],
    source: smeltSource(3),
    notes: {
      zh: '第二条：固定 50% 的循环范围后，我们比较了不同的执行深宽比，也就是执行深度与模型宽度之比。Looped 模型的最优执行深宽比更大。\n\n我们推测这可能与参数共享有关：额外的执行深度不会引入新的参数；同一组共享参数还会同时获得来自“浅层”和“深层”的梯度优化信号。这种多深度的梯度信号，可能让更深的配置比同等深度的独立参数堆叠更容易优化。同样，这是推测。',
      en: 'Second: with the loop span fixed at 50%, we compare effective depth-to-width ratios, executed depth divided by model width. The looped model’s optimal ratio is larger.\n\nWe conjecture this may relate to parameter sharing: the extra executed depth adds no new parameters, and the same shared parameters receive gradient signals from both “shallow” and “deep” positions. This multi-depth signal may make deeper configurations easier to optimize than an equally deep stack of independent layers. Again, a conjecture.',
    },
  },
  {
    part: 'smelt', stage: stage.method, layout: 'split', minutes: 0.9, textWidth: 360,
    title: { zh: '配方 ③：循环两次收益最大', en: 'Recipe ③: looping twice gives the largest gain' },
    points: {
      zh: [
        '在一到四次之间扫描循环次数，两次最优',
        'FLOPs 匹配下，每多循环一次模型就要再缩窄；三次、四次相对两次的退步归因于模型变窄，但两者仍优于基线',
      ],
      en: [
        'Sweep the loop count from one to four: two is best',
        'With FLOPs matched, each additional loop makes the model narrower still; we attribute the regression of three and four loops to this narrowing, though both still beat the Baseline',
      ],
    },
    callout: { zh: '**SMELT**：在稀疏 MoE 模型中，将中间一半的层循环执行两次，同时采用更大的执行深宽比', en: '**SMELT**: in a sparse MoE model, loop the middle half of the layers twice and use a larger effective depth-to-width ratio' },
    figures: [{ kind: 'smelt', id: 'loop-count', width: 760, scale: 0.98 }],
    source: smeltSource(4),
    notes: {
      zh: '第三条：我们在一到四次之间扫描循环次数，发现两次最优。由于 FLOPs 匹配的约束，每多循环一次模型就要再缩窄一些；我们将三次和四次相对两次的退步归因于模型变窄，但两者仍优于基线。\n\n综合三条，最终配方命名为 SMELT：在稀疏 MoE 模型中，将中间一半的层循环执行两次，同时采用更大的执行深宽比。',
      en: 'Third: we sweep the loop count from one to four and find that two is best. Because FLOPs must stay matched, each additional loop makes the model narrower still; we attribute the regression of three and four loops relative to two to this narrowing, though both still beat the Baseline.\n\nCombining the three findings, we name the final recipe SMELT: in a sparse MoE model, loop the middle half of the layers twice and use a larger effective depth-to-width ratio.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'stack', minutes: 1.1,
    title: { zh: '16 组匹配配置中，SMELT 的验证损失全部低于基线', en: 'SMELT has lower validation loss in all 16 matched configurations' },
    lead: { zh: '4 个规模（100M / 200M / 600M / 1.6B，按基线每 token 激活的非 embedding 参数量命名）× 4 档稀疏度，最大总参 54B（不含 embedding）；每个组合训练一对匹配的基线与 SMELT。', en: '4 sizes (100M / 200M / 600M / 1.6B, named after the Baseline’s active non-embedding parameters per token) × 4 sparsity levels, up to 54B total parameters (excluding embeddings); a matched Baseline and SMELT pair for each combination.' },
    figures: [{ kind: 'smelt', id: 'loss-compute', width: 980, scale: 0.87 }],
    source: smeltSource(5),
    notes: {
      zh: '我们把 SMELT 配方扩展到四个模型规模，以基线每 token 激活的非 embedding 参数量命名：100M、200M、600M、1.6B；每个规模下设置四个稀疏度级别，通过增加专家数来提高总参，同时保持每 token 激活的参数量不变，最大总参（不含 embedding）达到 54B。每个组合都训练一对匹配的基线与 SMELT。\n\n结果：在全部 16 个匹配配置上，SMELT 都取得了更低的验证损失。图中可以选择规模和稀疏度查看对应的匹配对。',
      en: 'We scale the SMELT recipe to four model sizes, named after the Baseline’s active non-embedding parameter count per token: 100M, 200M, 600M and 1.6B. Each has four sparsity levels; higher sparsity adds experts to raise total parameters while the parameters activated per token stay fixed, up to 54B total parameters excluding embeddings. For every combination we train a Baseline and a SMELT model under matched budgets.\n\nResult: SMELT reaches lower validation loss in all 16 matched configurations. The figure lets you pick a size and sparsity to inspect each pair.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'split', minutes: 1.0, textWidth: 380,
    title: { zh: '分别拟合 Scaling Law：SMELT 的 loss 下降得更快', en: 'Separate scaling-law fits: SMELT’s loss falls faster' },
    points: {
      zh: [
        '$E$ 为不可约损失；容量项由每 token FLOPs $F$ 和稀疏度 $S$ 控制；数据项由训练 token 数 $D$ 控制',
        '基线和 SMELT 各自拥有独立的六个系数（$E$, $A$, $K$, $a$, $b$, $c$）',
        '容量指数 $a$：0.3892 vs. 0.3703；数据指数 $c$：0.7011 vs. 0.6594',
      ],
      en: [
        '$E$ is the irreducible loss; the capacity term depends on per-token FLOPs $F$ and sparsity $S$; the data term on training tokens $D$',
        'The Baseline and SMELT each get their own six coefficients ($E$, $A$, $K$, $a$, $b$, $c$)',
        'Capacity exponent $a$: 0.3892 vs. 0.3703; data exponent $c$: 0.7011 vs. 0.6594',
      ],
    },
    figures: [{ kind: 'formula', width: 720, scale: 0.94 }, { kind: 'smelt', id: 'coefficients', width: 760, scale: 0.92 }],
    source: smeltSource(6),
    notes: {
      zh: '为了量化优势随规模的变化趋势，我们为两种架构分别拟合了 Chinchilla 式 Scaling Law。$E$ 是不可约损失；中间的容量项由每 token FLOPs $F$ 和稀疏度 $S$ 控制，$F$ 越大或 $S$ 越高，这一项越小；最后的数据项由训练 token 数 $D$ 控制，数据越多越小。基线和 SMELT 各自拥有独立的六个系数。\n\n拟合结果显示，SMELT 的容量指数 $a$（0.3892 vs. 0.3703）和数据指数 $c$（0.7011 vs. 0.6594）都大于基线，意味着 SMELT 的 loss 随算力和数据的增长下降得更快。悬停在公式的某一项上，会同时高亮图中对应的系数。',
      en: 'To quantify how the advantage changes with scale, we fit a separate Chinchilla-style scaling law to each architecture. $E$ is the irreducible loss. The capacity term depends on per-token FLOPs $F$ and sparsity $S$ and shrinks as $F$ grows or $S$ rises; the data term depends on training tokens $D$ and shrinks as data grows. The Baseline and SMELT each get their own six coefficients.\n\nSMELT has both a larger capacity exponent $a$ (0.3892 vs. 0.3703) and a larger data exponent $c$ (0.7011 vs. 0.6594), meaning its loss falls faster as compute and data grow. Hovering over a term of the formula highlights the matching coefficients in the figure.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'split', minutes: 1.0, textWidth: 420,
    title: { zh: '计算最优前沿：达到相同 loss，SMELT 所需训练算力更少', en: 'On the compute-optimal frontier, SMELT needs less training compute' },
    stats: [
      { value: '6.8%–10.0%', label: { zh: '10²⁰ FLOPs 时节省', en: 'saved at 10²⁰ FLOPs' }, tone: 'gain' },
      { value: '14.7%–18.0%', label: { zh: '10²¹ FLOPs 时节省', en: 'saved at 10²¹ FLOPs' }, tone: 'gain' },
    ],
    points: {
      zh: [
        '范围：10²⁰ FLOPs 到拟合范围上限（约 2.2×10²¹ FLOPs）',
        '数值随稀疏度 S ≈ 85%–97% 不同；S = 0 未纳入拟合',
        '按拟合的点估计，节省幅度随算力预算增大而扩大',
      ],
      en: [
        'Range: 10²⁰ FLOPs up to the top of the fitted range (about 2.2×10²¹ FLOPs)',
        'Values depend on sparsity, S ≈ 85%–97%; the S = 0 level is not in the fit',
        'By the fitted point estimates, the savings grow with the compute budget',
      ],
    },
    figures: [{ kind: 'smelt', id: 'frontier', width: 760, scale: 0.78 }],
    source: smeltSource(7),
    notes: {
      zh: '在 Compute-Optimal 前沿上，从 10²⁰ FLOPs 到拟合范围上限（约 2.2×10²¹ FLOPs），SMELT 达到相同 loss 所需的训练算力都更少：在 10²⁰ FLOPs 时节省 6.8%–10.0%，在 10²¹ FLOPs 时节省 14.7%–18.0%，具体数值随稀疏度 S ≈ 85%–97% 不同；S = 0 那一档未纳入拟合。按拟合的点估计，节省幅度随算力预算增大而扩大。\n\n图注中的例子：S ≈ 97%、10²¹ FLOPs 时可节省 14.7% 的训练计算量。讲的时候注意这些是拟合的点估计，不要外推到拟合范围以外。',
      en: 'On the compute-optimal frontier, from 10²⁰ FLOPs up to the top of the fitted range (about 2.2×10²¹ FLOPs), SMELT needs less training compute than the Baseline to reach the same loss: 6.8%–10.0% less at 10²⁰ FLOPs and 14.7%–18.0% less at 10²¹ FLOPs, depending on sparsity (S ≈ 85%–97%); the S = 0 level is not in the fit. By the fitted point estimates, the savings grow with the compute budget.\n\nThe caption’s example: at S ≈ 97% and 10²¹ FLOPs, SMELT saves 14.7% of training compute. These are fitted point estimates; do not extrapolate beyond the fitted range.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'split', minutes: 1.0, textWidth: 330,
    title: { zh: '下游任务：绝大多数匹配对上 SMELT 更好', en: 'Downstream, SMELT wins the vast majority of matched pairs' },
    stats: [
      { value: '96 / 96', label: { zh: 'DCLM Completion', en: 'DCLM Completion' }, tone: 'loop' },
      { value: '83 / 96', label: { zh: 'DCLM Core', en: 'DCLM Core' }, tone: 'loop' },
      { value: '29 / 30', label: { zh: 'MMLU*', en: 'MMLU*' }, tone: 'loop' },
    ],
    foot: { zh: '16 个配置 × 6 个训练时长 = 96 组匹配对。* MMLU 只统计基线明显高于随机水平的 30 组（博文图 9）。', en: '16 configurations × 6 training horizons = 96 matched pairs. * MMLU counts only the 30 pairs whose Baseline scores clearly above chance (article Figure 9).' },
    figures: [{ kind: 'smelt', id: 'dclm-core', width: 860, scale: 0.92 }],
    source: smeltSource(8),
    notes: {
      zh: '我们评测了 DCLM 和 MMLU 等下游任务。在 16 个配置 × 6 个训练时长、共 96 组匹配对上，SMELT 在绝大多数上取得更好的成绩：DCLM Completion 全部 96 组，DCLM Core 83 组；在基线明显高于随机水平的 30 组中，SMELT 在 MMLU 上赢下 29 组（博文图 9，这里没有单独放出）。\n\n图中展示的是 DCLM Core 随训练算力的变化，每一对匹配模型连成一组。',
      en: 'We evaluate downstream tasks such as DCLM and MMLU. Across 16 configurations × 6 training horizons, 96 matched pairs, SMELT does better in the vast majority: all 96 on DCLM Completion and 83 on DCLM Core. On MMLU it wins 29 of the 30 pairs whose Baseline scores clearly above chance (article Figure 9, not shown separately here).\n\nThe figure shows DCLM Core against training compute, with each matched pair grouped together.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'split', minutes: 1.0, textWidth: 360,
    title: { zh: '相同验证损失下，SMELT 的下游成绩仍高于基线预测', en: 'At the same validation loss, SMELT still beats the Baseline’s prediction' },
    points: {
      zh: [
        '先用基线数据拟合“验证损失 → 下游分数”曲线，再把 SMELT 的点放到同一张图上',
        '三项指标、每个规模上，SMELT 的平均成绩都优于基线曲线的预测',
        'DCLM Core 与 DCLM Completion：相对这条合并四个规模拟合的曲线，差距随规模增大（同规模基线自身相对曲线的残差也随规模上升）',
      ],
      en: [
        'Fit a curve from validation loss to downstream score on the Baseline runs, then place the SMELT points on the same plot',
        'On each of the three metrics, at every scale, SMELT’s mean result beats the Baseline curve’s prediction',
        'DCLM Core and DCLM Completion: against this curve fitted across all four scales, the gap widens with scale (the same-scale Baseline’s own residual also rises with scale)',
      ],
    },
    figures: [{ kind: 'smelt', id: 'beyond-loss', width: 760, scale: 0.92 }],
    source: smeltSource(10),
    notes: {
      zh: '更值得关注的是，这些下游收益不仅仅来自 loss 的降低。我们先用基线数据拟合了验证损失与下游分数的关系曲线，然后把 SMELT 的数据点放到同一张图上。\n\n结果：在相同的验证损失下，SMELT 在三项指标、每个规模上的平均成绩都优于基线曲线的预测；而且在 DCLM Core 和 DCLM Completion 上，相对这条合并四个规模拟合的曲线，这一差距随规模增大。需要同时说明限定条件：同规模基线自身相对曲线的残差也随规模上升。',
      en: 'More notably, these downstream gains do not come only from lower loss. We first fit a curve mapping validation loss to downstream score on the Baseline runs, then place the SMELT points on the same plot.\n\nAt the same validation loss, SMELT’s mean result on each of the three metrics, at every scale, is better than the Baseline curve predicts; on DCLM Core and DCLM Completion, measured against this curve fitted across all four scales, the gap widens with scale. State the qualifier as well: the same-scale Baseline’s own residual against the curve also rises with scale.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'stack', minutes: 1.0,
    title: { zh: '结构化程度越高的领域、越长的文本，收益越大', en: 'More structured domains and longer texts gain more' },
    points: {
      zh: [
        '领域：Code 领先，Finance 和 Math/STEM 次之，Knowledge 与 Web 最低',
        '长度：长于 256 token 的样本，收益约为 256 token 及以下样本的 1.5 倍',
        '对照：增加专家数或参数量不会产生这种长度差异，说明这是循环带来的特有性质',
      ],
      en: [
        'Domains: Code leads, Finance and Math/STEM follow, Knowledge and Web gain the least',
        'Length: samples longer than 256 tokens gain about 1.5× as much as samples of 256 tokens or fewer',
        'Control: adding experts or parameters does not produce this length dependence, so it is specific to looping',
      ],
    },
    figures: [{ kind: 'smelt', id: 'domain-gain', width: 640, scale: 0.86 }, { kind: 'smelt', id: 'length-gain', width: 640, scale: 0.86 }],
    source: { zh: 'SMELT 博文图 11、12', en: 'SMELT article, Figures 11 and 12' },
    notes: {
      zh: '我们进一步分析了循环的收益在不同领域和任务上的分布。\n\n在验证损失上，结构化程度越高的领域，收益越大：Code 领先，Finance 和 Math/STEM 次之，Knowledge 与 Web 最低。同时，长文本的收益也明显高于短文本：长于 256 token 的样本，收益约为 256 token 及以下样本的 1.5 倍（按各匹配对归一化后）。作为对照，增加专家数或参数量并不会产生这种长度上的差异，说明这是循环带来的特有性质。',
      en: 'We then examine how the gain from looping is distributed across domains and tasks.\n\nOn validation loss, the more structured the domain, the larger the gain: Code leads, Finance and Math/STEM follow, and Knowledge and Web gain the least. Long texts also gain noticeably more: samples longer than 256 tokens gain about 1.5× as much as samples of 256 tokens or fewer (after normalizing each matched pair). As a control, adding experts or parameters does not produce this length dependence, indicating that it is a property specific to looping.',
    },
  },
  {
    part: 'smelt', stage: stage.results, layout: 'split', minutes: 0.9, textWidth: 380,
    title: { zh: '给出 in-context 示例后，SMELT 的优势明显扩大', en: 'Once in-context examples are given, SMELT’s advantage widens' },
    points: {
      zh: [
        '16 个任务平均：差距从 0 个示例时的 0.9 个百分点升至 1 个示例时的 1.9 个百分点，并在 8 个示例以内大致保持',
        'Dyck Languages（高度依赖示例）：4 个示例以内基本持平，差距从 8 个示例起逐渐拉开，32 个示例时为 29.8% 对 26.4%',
      ],
      en: [
        '16-task average: the gap rises from 0.9 points with no examples to 1.9 points with one, and roughly holds up to 8 examples',
        'Dyck Languages, which relies heavily on its examples: roughly level up to 4 examples; the gap opens from 8 on, reaching 29.8% vs. 26.4% at 32',
      ],
    },
    figures: [{ kind: 'smelt', id: 'icl-gain', width: 760, scale: 0.95 }],
    source: smeltSource(13),
    notes: {
      zh: '在下游任务上，一旦给出 in-context 示例，SMELT 相对基线的优势就明显扩大：16 个任务平均从 0 个示例时的 0.9 个百分点升至 1 个示例时的 1.9 个百分点，并在 8 个示例以内大致保持。\n\n在高度依赖示例的 Dyck Languages 任务上，两者在 4 个示例以内基本持平，差距从 8 个示例起逐渐拉开，32 个示例时达到 29.8% 对 26.4%。后面的机制部分会再回到 Dyck 任务。',
      en: 'On downstream tasks, SMELT’s advantage over the Baseline widens markedly once in-context examples are given: on the 16-task average the gap rises from 0.9 points with no examples to 1.9 points with one, and then roughly holds up to 8 examples.\n\nOn Dyck Languages, a task that relies heavily on its examples, the two are roughly level up to 4 examples; the gap then opens gradually from 8 examples on, reaching 29.8% vs. 26.4% at 32 examples. We return to Dyck in the mechanism part.',
    },
  },
  {
    part: 'smelt', stage: stage.mechanism, layout: 'split', minutes: 0.7, textWidth: 340,
    title: { zh: '专家路由：第二次执行复用部分专家', en: 'Expert routing: the second visit reuses some experts' },
    lead: { zh: '以下从专家路由、残差流和注意力模式三个角度，比较循环层第二次执行与第一次执行的差异。', en: 'Next, how the second visit through the looped layers differs from the first: expert routing, the residual stream, and attention.' },
    points: {
      zh: [
        '第二次执行会复用第一次的部分专家，同时选择一些新专家',
        '两次选中的专家集合重叠度远高于随机水平',
      ],
      en: [
        'The second visit reuses some of the experts chosen on the first, and selects some new ones',
        'The overlap between the two visits’ expert sets is far above chance',
      ],
    },
    figures: [{ kind: 'smelt', id: 'expert-reuse', width: 760, scale: 1 }],
    source: smeltSource(14),
    notes: {
      zh: '接下来，我们从专家路由、残差流和注意力模式三个角度，分析循环层第二次执行与第一次执行的差异。这一部分是描述性分析，文章的定位是为收益提供“描述性的线索”。\n\n专家路由：第二次会复用第一次的部分专家，同时也会选择一些新专家；两次选中的专家集合重叠度远高于随机水平。',
      en: 'Next we examine how the second visit through the looped layers differs from the first, from three angles: expert routing, the residual stream, and attention patterns. This part is descriptive: the article presents it as descriptive clues to where the gain comes from.\n\nExpert routing: the second visit reuses some of the experts chosen on the first and also selects some new ones; the overlap between the two visits’ expert sets is far above chance.',
    },
  },
  {
    part: 'smelt', stage: stage.mechanism, layout: 'split', minutes: 0.7, textWidth: 360,
    title: { zh: '残差流：第二次执行的更新更大，方向部分重叠', en: 'Residual stream: the second visit writes larger, partly aligned updates' },
    points: {
      zh: [
        '第二次执行的残差流更新幅度始终大于第一次',
        '1.6B、S ≈ 85%：同一物理层两次更新的余弦相似度平均约 0.56，不同层之间平均仅约 0.16',
        '我们据此认为：第二次执行没有推翻第一次，而是放大了第一次建立的信号',
      ],
      en: [
        'The second visit consistently writes a larger update to the residual stream than the first',
        'At 1.6B and S ≈ 85%: the cosine between the two visits’ updates at the same physical layer averages about 0.56, against about 0.16 between different layers',
        'We read this as the second visit amplifying the signal the first established rather than overriding it',
      ],
    },
    figures: [{ kind: 'smelt', id: 'residual-flow', width: 760, scale: 0.9 }],
    source: smeltSource(15),
    notes: {
      zh: '残差流更新：第二次执行的残差流更新幅度始终大于第一次。两次更新的方向有所重叠，但并不相同：在 1.6B、S ≈ 85% 的模型中，同一物理层两次更新的余弦相似度平均约 0.56，不同层之间平均仅约 0.16。\n\n我们据此认为，第二次执行并没有推翻第一次，而是放大了第一次建立的信号。这是对测量结果的解读。',
      en: 'Residual-stream updates: the second visit consistently writes a larger update than the first. The two updates point in partly overlapping but different directions: at 1.6B and S ≈ 85%, the cosine between the two visits’ updates at the same physical layer averages about 0.56, against about 0.16 between different layers.\n\nWe read this as the second visit amplifying the signal the first visit established rather than overriding it. That is our interpretation of the measurements.',
    },
  },
  {
    part: 'smelt', stage: stage.mechanism, layout: 'split', minutes: 0.7, textWidth: 360,
    title: { zh: '注意力：两次执行“看向同一处”，但“读到的内容”不同', en: 'Attention: both visits look in the same place but read different content' },
    points: {
      zh: [
        '两次执行中，Q 和 K 各自的余弦相似度高达 0.89–0.93：模型关注的位置大体相同',
        '变化主要发生在 V 及其后续输出',
      ],
      en: [
        'Between the two visits, the queries (Q) and keys (K) each reach a cosine similarity of 0.89–0.93: the model attends to largely the same positions',
        'The change happens mainly in the values (V) and the outputs computed from them',
      ],
    },
    figures: [{ kind: 'smelt', id: 'attention-stages', width: 760, scale: 0.91 }],
    source: smeltSource(16),
    notes: {
      zh: '注意力检索：两次执行中，Q 和 K 各自的余弦相似度高达 0.89–0.93，说明模型关注的位置大体相同。变化主要发生在 V 及其后续输出。换句话说，第二次执行仍然“看向同一处”，但“读到的内容”已经不同。',
      en: 'Attention retrieval: between the two visits, the queries (Q) and the keys (K) each reach a cosine similarity as high as 0.89–0.93, so the model attends to largely the same positions. The change happens mainly in the values (V) and the outputs computed from them. In other words, the second visit still “looks in the same place,” but what it “reads” has changed.',
    },
  },
  {
    part: 'smelt', stage: stage.mechanism, layout: 'split', minutes: 0.7, textWidth: 340,
    title: { zh: 'Dyck 案例：关键注意力头从 BOS 转向示例答案', en: 'Dyck case study: a key head moves from BOS to the example answers' },
    points: {
      zh: [
        'Dyck language 是括号匹配任务：模型需要从给定示例中找到相关答案的位置，才能作出正确预测',
        '关键注意力头在第一次执行时集中关注 BOS；相同的头在第二次执行时关注答案位置',
      ],
      en: [
        'Dyck Languages is a bracket-matching task: the model must locate the relevant answers in the given examples to predict correctly',
        'A key attention head concentrates on the BOS token on the first visit; on the second visit the same head attends to the answer positions',
      ],
    },
    figures: [{ kind: 'smelt', id: 'dyck-attention', width: 800, scale: 0.94 }],
    source: smeltSource(17),
    notes: {
      zh: 'Case Study on Dyck Language：Dyck language 是一个括号匹配任务，模型需要从给定示例中找到相关答案的位置，才能作出正确预测。我们发现，关键注意力头在第一次执行时集中关注 BOS，而相同的头第二次执行则关注答案位置。下一页说明文章如何把这一现象与 attention sink 联系起来。',
      en: 'Case study, Dyck language: a bracket-matching task in which the model must locate the relevant answers in the given examples to predict correctly. A key attention head concentrates on the BOS token on the first visit, while on the second visit the same head attends to the answer positions. The next slide shows how the article connects this to the attention sink.',
    },
  },
  {
    part: 'smelt', stage: stage.mechanism, layout: 'split', minutes: 0.7, textWidth: 400,
    title: { zh: 'Attention sink：第二次执行后反而减弱', en: 'Attention sink: it weakens on the second visit' },
    points: {
      zh: [
        '基线模型中，attention sink 随深度增加而增强',
        'Loop 架构呈相反趋势：第二次执行后，attention sink 减弱',
        '我们认为减弱后释放的注意力转向与内容相关的位置，直接证据来自 Dyck 案例中的注意力头；进一步推测这可能与 SMELT 在 in-context learning 上的优势有关',
      ],
      en: [
        'In the Baseline, the attention sink grows stronger with depth',
        'The looped architecture shows the opposite: on the second visit, the sink weakens',
        'We believe the freed attention goes to content-relevant positions, with the Dyck head as direct evidence; we further conjecture this may relate to SMELT’s in-context learning advantage',
      ],
    },
    figures: [{ kind: 'smelt', id: 'attention-sink', width: 760, scale: 0.86 }],
    source: smeltSource(18),
    notes: {
      zh: '在基线模型中，attention sink 会随深度增加而增强。Loop 架构却呈现相反趋势：第二次执行后，attention sink 反而减弱。\n\n我们认为，第二次执行减弱 sink 后释放出的注意力会转向与内容相关的位置，直接证据来自上一页 Dyck 案例中的注意力头（注意力从 BOS 转到示例答案）；我们进一步推测，这可能与 SMELT 在 in-context learning 上的优势有关。讲的时候保留“我们认为”和“推测”这两处限定。',
      en: 'In the Baseline, the attention sink grows stronger with depth. The looped architecture shows the opposite trend: on the second visit, the attention sink weakens instead.\n\nWe believe the attention freed by the weaker sink goes to content-relevant positions; the direct evidence is the Dyck head on the previous slide, whose attention moves from BOS to the example answers. We further conjecture that this may relate to SMELT’s advantage in in-context learning. Keep the wording: “we believe” and “conjecture.”',
    },
  },
  {
    part: 'smelt', stage: stage.conclusion, layout: 'columns', minutes: 0.7,
    title: { zh: '预算匹配下，循环仍能为 MoE Transformer 带来净收益', en: 'Under matched budgets, looping still yields a net gain for MoE Transformers' },
    columns: [
      {
        title: { zh: '结论', en: 'Conclusion' }, tone: 'loop',
        items: {
          zh: [
            'Scaling Law 与下游评测给出一致的结论：对 MoE Transformer，循环架构仍能带来净收益',
            '16 组匹配配置的验证损失全部更低；计算最优前沿上，达到相同损失少用 6.8%–18.0% 训练算力',
            '机制分析为这一收益提供了描述性的线索',
          ],
          en: [
            'Scaling laws and downstream evaluations agree: for MoE Transformers, looping still yields a net gain',
            'Lower validation loss in all 16 matched configurations; 6.8%–18.0% less training compute for the same loss on the compute-optimal frontier',
            'The mechanistic analysis offers descriptive clues to where the gain comes from',
          ],
        },
      },
      {
        title: { zh: '局限与展望', en: 'Limitations and outlook' }, tone: 'muted',
        items: {
          zh: [
            '消融实验规模有限',
            '未涉及实际运行时间层面的系统效率优化',
            '希望预算匹配方案和 SMELT 配方为 Loop 社区提供可参考的实验设定和比较基准，在公平条件下探索更多架构变体',
          ],
          en: [
            'The ablations are limited in scale',
            'No system-level optimization for wall-clock efficiency',
            'We hope the budget-matching protocol and the SMELT recipe give the community a reference setup and point of comparison for exploring more variants under fair conditions',
          ],
        },
      },
    ],
    notes: {
      zh: '小结：在预算匹配的条件下，我们的 Scaling Law 与下游评测给出了一致的结论——对 MoE Transformer 而言，循环架构仍能带来净收益；机制分析则为这一收益提供了描述性的线索。\n\n现有的局限包括消融实验规模有限，以及未涉及实际运行时间层面的系统效率优化。\n\n未来，我们希望这套预算匹配方案和 SMELT 配方能为 Loop 社区提供一个可参考的实验设定和比较基准。以此为基础，后续工作可以在公平条件下继续探索更多架构变体。',
      en: 'In summary: under matched budgets, our scaling laws and downstream evaluations point to the same conclusion — for MoE Transformers, looping still yields a net gain. The mechanistic analysis offers descriptive clues to where that gain comes from.\n\nCurrent limitations include the limited scale of the ablations and the lack of system-level optimization for wall-clock efficiency.\n\nLooking ahead, we hope this budget-matching protocol and the SMELT recipe can give the looped-model community a reference experimental setup and point of comparison. Building on it, future work can explore more architectural variants under fair conditions.',
    },
  },
  {
    part: 'smelt', layout: 'end', minutes: 0.2,
    title: { zh: '谢谢，欢迎提问', en: 'Thank you. Questions welcome.' },
    notes: {
      zh: '谢谢大家。两篇论文与博文的链接在这一页。提问环节可以回到任意一页：按 O 打开页面目录，或输入页码后按 Enter 跳转。',
      en: 'Thank you. Links to both papers and articles are on this slide. During questions you can jump to any slide: press O for the slide list, or type a slide number and press Enter.',
    },
  },
];
