// Slides of the Loop-μP + SMELT talk at /loop-science/ (Chinese) and
// /en/loop-science/ (English). Every claim, number and qualifier comes from the
// two articles in src/content/blog and their figure captions. Strings use the Loop-μP label notation ($N$ italic,
// ^{…} / _{…} scripts, [l:…] loop colour) plus **bold**; notes separate
// paragraphs with a blank line.
import type loopFigures from '../loop-mup/figures.json';
import type smeltFigures from '../smelt/figures.json';

export interface Text { zh: string; en: string }
export interface List { zh: string[]; en: string[] }

/** One figure on a slide. width is the layout width the figure is rendered at
 *  (its blog column is 760); scale shrinks the rendered figure uniformly. */
export type MathName = 'model' | 'expansion' | 'norms' | 'gradient' | 'update' | 'response' | 'gram' | 'total' | 'conditions' | 'compare' | 'multiplier';

/** One state of a figure's guided tour in the deck: control values to set,
 *  how long to hold this state before the next one (ms), and an optional
 *  glide into it for numeric values such as the phase-plane point "α,γ". */
export interface TourStep { set: Record<string, string>; hold?: number; glide?: number }

export type FigureRef = { width?: number; scale?: number; panel?: 'overview' | 'detail'; tour?: TourStep[] } & (
  | { kind: 'loop'; id: keyof typeof loopFigures }
  | { kind: 'smelt'; id: keyof typeof smeltFigures }
  | { kind: 'hero' }
  | { kind: 'formula' }
  | { kind: 'math'; name: MathName }
  | { kind: 'recipe' }
  | { kind: 'loop-definition' }
  | { kind: 'parametrization'; mode: 'prior' | 'loop' }
  | { kind: 'loop-problem'; view: 'question' | 'variables' | 'criteria' | 'exponents' }
);

export type Part = 'intro' | 'loop' | 'smelt' | 'closing';
export type Layout = 'cover' | 'section' | 'split' | 'derivation' | 'stack' | 'cards' | 'columns' | 'end';

export interface Slide {
  part: Part;
  /** Section-specific stage in the narrative. */
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
  presenter?: Text;
  equations?: MathName[];
  references?: string[];
  notes: Text;
}

export const slides: Slide[] = [
  {
    "part": "intro",
    "layout": "cover",
    "minutes": 0.3,
    "title": {
      "zh": "Looped Transformer 的预训练科学：从残差缩放律 (Loop-μP) 到等预算混合专家扩展律 (SMELT)",
      "en": "The Pretraining Science of Looped Transformers: From Residual Scaling Laws (Loop-μP) to Budget-Matched MoE Scaling Laws (SMELT)"
    },
    "notes": {
      "zh": "大家好，我是清华大学的王少文。今天向大家汇报我们在 Looped Transformer 预训练上的两项工作：Loop-μP 与 SMELT。第一项工作解决如何稳定扩展循环次数并实现超参数零样本迁移；第二项工作回答一个更基础的问题——在严格对齐算力、参数量与 KV cache 之后，循环架构本身是否仍有扩展优势。我们先从训练参数化讲起。",
      "en": "Hello, I am Shaowen Wang from Tsinghua University. Today I will present two studies on the pretraining science of looped Transformers: from residual scaling laws with Loop-μP to budget-matched MoE scaling laws with SMELT. First, how can we increase the loop count while preserving stable training? Second, does looping still help under matched budgets? I will begin with parameterization and then turn to architectural scaling."
    },
    "presenter": {
      "zh": "王少文 · 清华大学",
      "en": "Shaowen Wang · Tsinghua University"
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "什么是 Looped Transformer？",
      "en": "What is a looped Transformer?"
    },
    "stage": {
      "zh": "模型与目标",
      "en": "Model and goals"
    },
    "layout": "stack",
    "minutes": 0.8,
    "lead": {
      "zh": "同一组 $L$ 层共享权重，重复执行 $N$ 轮。",
      "en": "Run the same $L$ layers $N$ times, with shared weights."
    },
    "figures": [
      {
        "kind": "loop-definition",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "先明确模型形式。上方是实际存储的参数结构：一个 L 层 Transformer 块，每层包含 Attention 和 MLP 两个残差分支。前向传播时，输出不直接读出，而是送回同一组层循环执行 N 轮。下方展开后可以看到，L=3、N=3 时前向共执行 9 层计算，但参数量只有 3 层。",
      "en": "First, the model. The upper diagram is the stored network: L Transformer layers, each with an attention and an MLP residual branch. Instead of reading out, we feed the output back through the same layers, N passes in total. Unrolled below with L = 3 and N = 3, that is nine layer executions with only three layers of parameters. Looping deepens the computation without adding parameters."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "扩展循环次数 $N$ 时的两个目标",
      "en": "Two goals as the loop count grows"
    },
    "stage": {
      "zh": "模型与目标",
      "en": "Model and goals"
    },
    "layout": "cards",
    "minutes": 0.7,
    "cards": [
      {
        "tag": {
          "zh": "目标 1",
          "en": "Goal 1"
        },
        "title": {
          "zh": "训练稳定",
          "en": "Stable training"
        },
        "body": {
          "zh": "增大循环次数 $N$ 时，残差流范数与参数更新幅度保持稳定，不发散、不退化。",
          "en": "Keep residual states and update magnitudes stable as the loop count $N$ increases."
        }
      },
      {
        "tag": {
          "zh": "目标 2",
          "en": "Goal 2"
        },
        "title": {
          "zh": "超参数零样本迁移",
          "en": "Hyperparameter transfer"
        },
        "body": {
          "zh": "在小 $N$ 上调好的学习率等超参数，无需重新搜索即可直接用于大 $N$。",
          "en": "Reuse hyperparameters tuned at small $N$ directly at larger $N$."
        }
      }
    ],
    "notes": {
      "zh": "扩展循环次数 N 时，我们希望同时达成两个目标：一是训练稳定，前向激活和反向更新不会随 N 增大而失控；二是超参数迁移，在小 N 上扫出的最优基础学习率可以直接用于大 N，避免在大循环次数下重复调参。",
      "en": "We want both stability and transfer. Increasing the loop count should keep residual states and training updates from growing. Hyperparameters tuned at a small loop count, especially the base learning rate, should carry over to a larger one. The model must stay stable while keeping an effective learning signal."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "已有工作如何缩放宽度与深度？",
      "en": "How do prior recipes scale width and depth?"
    },
    "stage": {
      "zh": "已有参数化方案",
      "en": "Prior parameterizations"
    },
    "layout": "stack",
    "minutes": 1.5,
    "figures": [
      {
        "kind": "parametrization",
        "mode": "prior",
        "width": 1120,
        "tour": [
          {
            "set": {
              "recipe": "mup"
            },
            "hold": 2600
          },
          {
            "set": {
              "recipe": "depth"
            },
            "hold": 3600
          },
          {
            "set": {
              "recipe": "complete"
            }
          }
        ]
      }
    ],
    "references": [
      "[1] Yang et al. Tensor Programs V: Tuning Large Neural Networks via Zero-Shot Hyperparameter Transfer. 2022. arXiv:2203.03466.",
      "[2] Yang et al. Tensor Programs VI: Feature Learning in Infinite-Depth Neural Networks. 2023. arXiv:2310.02244.",
      "[3] CompleteP: Don't be lazy: CompleteP enables compute-efficient deep transformers. 2025. arXiv:2505.01618."
    ],
    "notes": {
      "zh": "先回顾三种已有的参数化方案。表中每一行对应一个模块或超参数，取值等于基础项乘上宽度、深度、循环三个维度的缩放因子。μP 负责宽度维度：隐藏层初始化方差与学习率按宽度倍数的倒数缩放。Depth-μP 与 CompleteP 负责深度维度：Depth-μP 将残差分支和隐藏层学习率同时乘以深度倍数的 −1/2 次方；CompleteP 将残差分支乘以深度倍数的倒数，学习率保持不变。这里的深度指各有独立权重的层，因此循环因子一列均为 1。",
      "en": "Let us review three existing parameterizations. Each row is one hyperparameter: a base term times a width, a depth and a loop factor. μP handles width: hidden initialization variances and learning rates scale inversely with the width multiplier. Depth-μP and CompleteP handle depth. Depth-μP multiplies residual branches and hidden learning rates by the inverse square root of the depth multiplier. CompleteP scales branches by the inverse depth multiplier and leaves the learning rate unchanged. Depth here counts layers with their own weights, so the loop column is all ones."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "独立层的深度缩放，能直接照搬到循环上吗？",
      "en": "Do the depth results carry over to loops?"
    },
    "stage": {
      "zh": "权重共享带来的问题",
      "en": "The shared-loop problem"
    },
    "layout": "stack",
    "minutes": 1,
    "figures": [
      {
        "kind": "loop-problem",
        "view": "question",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "把两种深度缩放方案统一写成指数形式：残差分支按 L 的 −α_L 次方缩放，学习率按 L 的 −γ_L 次方缩放。Depth-μP 对应 (1/2, 1/2)，CompleteP 对应 (1, 0)。对于独立层，α_L 从 1/2 到 1 的整段区间都是稳定的，两种方案分别对应左右端点。那么如果把 L 个独立层换成同一组权重循环 N 轮，这段可行区间还在吗？接下来我们会看到，引入权重共享后，可行域会收缩为唯一的一点。",
      "en": "Write both depth recipes as exponents: the branch coefficient scales as L to the minus alpha_L, the learning rate as L to the minus gamma_L. Depth-μP is (1/2, 1/2) and CompleteP is (1, 0). For independent layers, the whole interval from 1/2 to 1 is stable; the two recipes are its ends. Now replace the L independent layers by one shared block looped N times. If looping behaved like depth, we would again have a whole interval to choose from. We will see that with shared weights, the interval shrinks to a single point."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "权重共享带来的问题",
      "en": "The shared-loop problem"
    },
    "layout": "split",
    "minutes": 1,
    "textWidth": 360,
    "title": {
      "zh": "权重共享使各轮残差增量同向累加",
      "en": "Shared weights align loop increments"
    },
    "points": {
      "zh": [
        "独立层：初始化时各层增量近似正交，总幅度按 √$N$ 增长",
        "共享循环：各轮增量高度正相关，总幅度按 $N$ 线性增长",
        "照搬 $N$^{−1/2} 压不住残差流，分支缩放至少需要 1/$N$"
      ],
      "en": [
        "Independent layers: initial increments are nearly uncorrelated; their sum grows as √$N$",
        "Shared loops: positively correlated increments add up at order $N$",
        "So $N$^{−1/2} cannot hold loops back; they need at least 1/$N$"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "vector-sum",
        "width": 760,
        "scale": 0.98,
        "tour": [
          {
            "set": {
              "scaling": "none",
              "k": "1"
            },
            "hold": 1200
          },
          {
            "set": {
              "k": "2"
            },
            "hold": 900
          },
          {
            "set": {
              "k": "4"
            },
            "hold": 900
          },
          {
            "set": {
              "k": "8"
            },
            "hold": 900
          },
          {
            "set": {
              "k": "16"
            },
            "hold": 900
          },
          {
            "set": {
              "k": "32"
            },
            "hold": 900
          },
          {
            "set": {
              "k": "64"
            },
            "hold": 2800
          },
          {
            "set": {
              "scaling": "sqrt"
            },
            "hold": 3200
          },
          {
            "set": {
              "scaling": "linear"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "原因出在残差增量的累加方式上。初始化时，独立层权重互不相关，写入残差流的增量近似正交，叠加起来像随机游走，总长度按 √N 增长，乘 1/√N 就足够了。而共享同一组权重后，每轮写入的增量方向高度一致，总长度按 N 线性增长。图中把步数从 1 加到 64：左侧独立层在原地绕圈，右侧共享循环一路向外发散；切换成 1/√N 只能稳住左侧，循环模型必须乘 1/N 才能保持有界。这就直接要求 α_N ≥ 1，排除了小于 1 的整段区间。",
      "en": "Here is why. At initialization, independent layers write nearly uncorrelated increments; adding them is a random walk, so the total grows with the square root and an inverse-square-root factor suffices. With shared weights, the increments of different loops point in similar directions and the total grows linearly in N. The animation first raises the count from 1 to 64: the left path wanders, the right one marches on. Then it switches to 1/√N and 1/N: 1/√N holds the left side but not the right; loops need 1/N. In other words, alpha_N must be at least one: the rest of the interval fails for loops."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "权重共享带来的问题",
      "en": "The shared-loop problem"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "实测验证：初始化时各轮循环增量显著正相关",
      "en": "Measured: loop increments do align at initialization"
    },
    "lead": {
      "zh": "实验设置：Llama 风格 Pre-LN decoder-only Transformer，每块 12 层；固定随机 tokens，batch 1，序列长 128，10 个种子取平均。",
      "en": "Setup: Llama-style pre-norm decoder-only Transformer, 12 layers per stack; fixed random tokens, batch 1, sequence length 128, averaged over 10 seeds."
    },
    "points": {
      "zh": [
        "初始化、无残差缩放；测量块增量 $x$^{$r$} − $x$^{$r$−1} 的两两余弦相似度（$x$^{$r$} 为第 $r$ 个块后的残差流）",
        "串联 64 个独立块：增量两两近似正交",
        "同一块循环 64 轮：增量显著正相关，平均余弦相似度约 0.85"
      ],
      "en": [
        "At initialization, no residual scaling. Measure pairwise cosines of $x$^{$r$} − $x$^{$r$−1}, where $x$^{$r$} is the residual stream after stack $r$.",
        "64 independent stacks: nearly orthogonal increments",
        "One stack looped 64 times: positively correlated increments, mean cosine ≈ 0.85"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "init-cosine",
        "width": 800
      }
    ],
    "notes": {
      "zh": "实验使用 Llama 风格的 Pre-LN decoder-only Transformer，每个块包含 12 层。在初始化时、不加残差缩放，输入固定随机 tokens，batch size 为 1、序列长度 128，对 10 个随机种子取平均。这里 x^r 表示第 r 个 12 层块后的残差流，增量是 x^r−x^(r−1)。我们测量这些块增量的两两余弦相似度：64 个独立块之间几乎完全正交；而同一个块循环 64 轮时，任意两轮增量都显著正相关，平均余弦达到 0.85，证实了同向累加的现象。",
      "en": "We use a Llama-style pre-norm decoder-only Transformer with 12 layers per stack, fixed random token inputs, batch size 1 and sequence length 128, averaging over 10 seeds. At initialization, with no residual scaling, we measure pairwise cosines of the change in the residual stream across each 12-layer stack. Increments from 64 independent stacks are nearly orthogonal. When one block runs 64 times, its increments are positively correlated, with a mean cosine of about 0.85. Shared loops really do add up in a common direction."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "极简循环模型与两个缩放指数",
      "en": "The shared-loop model and its two exponents"
    },
    "stage": {
      "zh": "理论推导",
      "en": "Analysis"
    },
    "layout": "stack",
    "minutes": 1.2,
    "figures": [
      {
        "kind": "loop-problem",
        "view": "variables",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "下面用极简循环残差网络建立定量分析：图上方将同一个残差块展开 N 轮，所有块共享同一组 W，最后由 V 线性读出。它保留共享权重与残差累加这两个核心结构，并非完整 Transformer。下方放大单轮内部，主分支依次经过 W、激活函数和 c_N，再与恒等跳连相加。图中省略训练步下标 t，r 表示循环轮次。我们的目标是找出随 N 增大仍使激活和更新有界、输出更新不退化的缩放方式。每轮循环先经共享权重 W 得到预激活 h，激活后乘以残差分支系数 c_N 并加回残差流 x；第 N 轮结束后由读出向量 V 给出输出 f。注意预激活 h 定义在乘 c_N 之前，后面推导会用到。固定宽度与物理深度，我们考察循环维度的两个缩放指数：控制分支幅度的 α_N，以及控制单步权重更新尺度的 γ_N。",
      "en": "We analyze a minimal looped residual network, not a full Transformer. The top diagram unrolls the same block N times with one shared W and a final linear readout V. Below it, one block applies W, an activation, and c_N, then adds the identity skip. The diagram omits training-step index t; r indexes loops. We seek scaling rules that keep activations and updates bounded without making output updates vanish as N grows. Each loop computes the preactivation h with the shared W, multiplies the activated branch by the coefficient c_N and adds it to the residual state x. After the last loop, V reads out the output f. Keep in mind that h comes before c_N; we will need this. With width and physical depth fixed, we study two loop exponents: alpha_N sets the branch coefficient and gamma_N the scale of weight updates, separate from the base learning rate."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "稳定且有效学习的三个条件",
      "en": "Three conditions for stable, nontrivial learning"
    },
    "stage": {
      "zh": "理论推导",
      "en": "Analysis"
    },
    "layout": "stack",
    "minutes": 1.2,
    "lead": {
      "zh": "固定宽度与物理深度，当循环次数 $N$ 增大时需同时满足：",
      "en": "With width and physical depth fixed, all three must hold as the loop count $N$ grows."
    },
    "figures": [
      {
        "kind": "loop-problem",
        "view": "criteria",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "当 N 增大时，我们要求同时满足三条条件。第一，初始化前向不发散：每轮的残差流 x、预激活 h 以及最终输出 f 都保持 O(1) 有界。第二，一步训练更新后，这些量的变化也保持 O(1) 有界。但前两条只给了上界——如果更新全部趋于 0，模型虽然稳定却完全学不动。因此第三条要求输出的单步更新不能消失；结合第二条，输出更新必须保持 Θ(1) 常数量级。",
      "en": "We require three things as N grows. First, forward values at initialization stay bounded: every x and h, and the output f. Second, their changes after one training step stay bounded. That is only an upper bound, and a vanishing change also passes, so with these two alone the model could be stable yet learn nothing. The third condition therefore requires that the output update does not vanish; together with the second, it is of order one."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "将三个条件转化为指数约束",
      "en": "Turning the conditions into exponent constraints"
    },
    "stage": {
      "zh": "理论推导",
      "en": "Analysis"
    },
    "layout": "stack",
    "minutes": 1.2,
    "figures": [
      {
        "kind": "loop-problem",
        "view": "exponents",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "接下来计算各个量随 N 的缩放阶。初始化时，N 轮残差写入同向累加，总幅度正比于 N·c_N = N^(1 − α_N)，前向有界要求 α_N ≥ 1。首轮预激活 h^1 在乘 c_N 之前，其更新仅由更新尺度 s_N = N^(−γ_N) 决定，特征更新有界要求 γ_N ≥ 0。最终输出的单步变化汇集了全部 N 轮循环的同向贡献，每轮都带一个 c_N，因此正比于 N·c_N·s_N = N^(1 − α_N − γ_N)；既不发散也不消失，要求 α_N + γ_N = 1。",
      "en": "Now compute how each quantity scales with N. At initialization the N writes add up in one direction, giving N times c_N, that is N to the one minus alpha_N; boundedness requires alpha_N of at least one. The first preactivation h comes before c_N, so its update depends only on the update scale s_N; boundedness requires nonnegative gamma_N. The output update collects N loops, each scaled by c_N, so it scales as N to the one minus alpha_N minus gamma_N. Condition two bounds it from above and condition three from below, so the two exponents must sum to exactly one."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "可行域收缩为唯一解：($α$_{$N$}, $γ$_{$N$}) = (1, 0)",
      "en": "The loop feasible set is a single point: (1, 0)"
    },
    "stage": {
      "zh": "理论推导",
      "en": "Analysis"
    },
    "layout": "split",
    "textWidth": 330,
    "minutes": 1.25,
    "points": {
      "zh": [
        "**前向有界**：$α$_{$N$} ≥ 1",
        "**首轮特征更新有界**：$γ$_{$N$} ≥ 0",
        "**输出更新有效**：$α$_{$N$} + $γ$_{$N$} = 1"
      ],
      "en": [
        "**Initialization**: $α$_{$N$} ≥ 1",
        "**First preactivation**: $γ$_{$N$} ≥ 0",
        "**Output update**: $α$_{$N$} + $γ$_{$N$} = 1"
      ]
    },
    "callout": {
      "zh": "三条约束唯一交于 (1, 0)：残差分支乘以 1/$N$，基础学习率不随 $N$ 缩放。独立层则保留一整段可行区间。",
      "en": "They meet only at (1, 0): scale residual branches by 1/$N$ and keep the base learning rate fixed in $N$. Independent layers keep a whole segment."
    },
    "figures": [
      {
        "kind": "loop",
        "id": "phase",
        "width": 900,
        "tour": [
          {
            "set": {
              "mode": "loop",
              "point": "0.5,0"
            },
            "hold": 2600
          },
          {
            "set": {
              "point": "2,0"
            },
            "hold": 2600,
            "glide": 1000
          },
          {
            "set": {
              "point": "2,-1"
            },
            "hold": 2600,
            "glide": 700
          },
          {
            "set": {
              "point": "1,0"
            },
            "hold": 3200,
            "glide": 1000
          },
          {
            "set": {
              "mode": "depth",
              "point": "0.5,0.5"
            },
            "hold": 2600
          },
          {
            "set": {
              "point": "1,0"
            },
            "hold": 2600,
            "glide": 1000
          },
          {
            "set": {
              "mode": "loop"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "把三条约束画在 (α_N, γ_N) 相平面上：α_N ≥ 1 排除左侧，γ_N ≥ 0 排除下方，α_N + γ_N = 1 为对角斜线，三者唯一交于星号处的 (1, 0)。依次考察几个典型取法：取 (1/2, 0) 照搬 Depth-μP 的分支缩放，前向直接发散；取 (2, 0) 衰减过快，输出更新按 1/N 消失；若取 (2, −1) 靠放大步长补救，首轮预激活更新又会按 N 发散；只有 (1, 0) 能让三个量同时与 N 无关。切回独立权重时，可行域恢复为连接 Depth-μP 与 CompleteP 的整条线段。这就是循环与加深在参数化上的本质差异。",
      "en": "Draw the three constraints on the phase diagram. The horizontal axis is the branch exponent alpha_N, the vertical axis the update exponent gamma_N. Alpha_N of at least one removes the left side, nonnegative gamma_N removes the bottom, and the sum equal to one is this diagonal. They meet only at the star, (1, 0). The animation visits a few points. First (1/2, 0), Depth-μP's inverse square root copied over: the forward pass diverges. At (2, 0), internal updates stay bounded but the output update vanishes as 1/N. At (2, −1), the output update stays constant while the first preactivation update grows as N. It settles at (1, 0), where all three quantities on the right are independent of N. Then it switches to independent weights: the feasible set is a whole segment again, and the point slides from Depth-μP to CompleteP, feasible all the way. That is the key difference: depth leaves a choice, loops do not."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "Loop-μP 参数化方案",
      "en": "The complete Loop-μP recipe"
    },
    "stage": {
      "zh": "Loop-μP 方案",
      "en": "The recipe"
    },
    "layout": "stack",
    "minutes": 1.1,
    "figures": [
      {
        "kind": "parametrization",
        "mode": "loop",
        "width": 1120,
        "tour": [
          {
            "set": {
              "recipe": "depth"
            },
            "hold": 2200
          },
          {
            "set": {
              "recipe": "loop"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "回到完整的参数化表。Loop-μP 在宽度维度沿用 μP，在物理深度维度沿用 Depth-μP（α_L = 1/2），而在循环维度上只需做一处修改：将 Attention 与 MLP 两个残差分支额外乘以 1/N，其余循环因子全为 1。由于基础学习率不随 N 变化，在小 N 上调好的学习率可以直接迁移到大 N。",
      "en": "Back to the same table. Loop-μP keeps μP for width and Depth-μP for physical depth, alpha_L = 1/2, the end of the interval chosen by maximal feature diversity. Along loops it changes one thing: the attention and MLP residual branches gain an extra 1/N, and every other loop factor is one. The animation shows Depth-μP first, then switches to Loop-μP: only these two rows light up. The base learning rate does not depend on N, so a learning rate tuned at small N carries over to large N."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "实验验证",
      "en": "Experimental validation"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 370,
    "title": {
      "zh": "初始化残差范数：1/$N$ 精确控制累积幅度",
      "en": "Residual norms: 1/$N$ controls accumulation at initialization"
    },
    "lead": {
      "zh": "实验设置：Llama 风格 Pre-LN，每块 12 层；初始化，固定随机 tokens，batch 1，序列长 128，10 个种子取平均。",
      "en": "Setup: Llama-style pre-norm, 12 layers per stack; at initialization, fixed random tokens, batch 1, sequence length 128, averaged over 10 seeds."
    },
    "points": {
      "zh": [
        "对比 12 层 Pre-LN 块循环 $N$ 轮，与串联 $m$_{$L$} 个独立 12 层块的非循环模型",
        "不缩放：循环模型的残差范数随 $N$ 线性增长，非循环模型仅按 √$m$_{$L$} 增长",
        "$N$^{−1/2} 压不住循环范数；$N$^{−3/2} 虽有界，但使循环模型退化为恒等映射"
      ],
      "en": [
        "Loop a 12-layer pre-norm stack $N$ times; compare with untied models chaining $m$_{$L$} independent 12-layer stacks",
        "Unscaled: the looped norm grows linearly in $N$, the untied norm only as √$m$_{$L$}",
        "$N$^{−1/2} is not enough; $N$^{−3/2} bounds the norm but drives the looped model toward the identity map"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "init-norm",
        "width": 760,
        "scale": 0.94,
        "tour": [
          {
            "set": {
              "alpha": "0"
            },
            "hold": 2400
          },
          {
            "set": {
              "alpha": "0.5"
            },
            "hold": 2400
          },
          {
            "set": {
              "alpha": "1.5"
            },
            "hold": 2400
          },
          {
            "set": {
              "alpha": "1"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "实验设置：Llama 风格 Pre-LN，每块 12 层；初始化，固定随机 tokens，batch 1，序列长 128，10 个种子取平均。 下面看真实 Transformer 上的实验验证。初始化时，我们将一个 12 层 Pre-LN 块循环 N 轮，与串联 m_L 个独立 12 层块的非循环模型对比。不缩放时，循环模型的残差范数按 N 线性增长，非循环模型仅按平方根增长。乘 N^(−1/2) 压不住循环范数；乘 N^(−3/2) 虽有界，但残差分支贡献趋近于零，模型退化为恒等映射。只有 1/N 既保持有界又不退化。",
      "en": "Setup: Llama-style pre-norm, 12 layers per stack; at initialization, fixed random tokens, batch 1, sequence length 128, averaged over 10 seeds. First, initialization. We loop a 12-layer pre-norm block N times and compare it with untied models chaining m_L independent 12-layer blocks. Without scaling, the looped residual norm grows linearly in N, the untied one only with the square root. N to the minus one half cannot hold the loops back; N to the minus three halves bounds the norm but drives branch contributions to zero, so the model approaches the identity map. Only 1/N is both bounded and nondegenerate."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "实验验证",
      "en": "Experimental validation"
    },
    "layout": "split",
    "minutes": 0.65,
    "textWidth": 340,
    "title": {
      "zh": "训练后残差范数：不同 $N$ 的输出范数保持一致",
      "en": "Residual norms: endpoints remain close after training"
    },
    "lead": {
      "zh": "实验设置：Llama 风格 Pre-LN + Loop-μP；$L$ ∈ {12, 24, 48}，$N$ ∈ {2, 4, 8}；FineWeb-Edu 训练 10B tokens（20,000 步）后测量。",
      "en": "Setup: Llama-style pre-norm + Loop-μP; $L$ ∈ {12, 24, 48}, $N$ ∈ {2, 4, 8}; measured after 10B FineWeb-Edu tokens (20,000 steps)."
    },
    "points": {
      "zh": [
        "追踪训练完成后每轮循环输出的残差流范数",
        "不同 $N$ 的中间轨迹不同，但同深度下的最终范数相差不超过 1.32 倍",
        "验证了增大 $N$ 训练后残差流同样不会持续膨胀"
      ],
      "en": [
        "Measure the residual-stream norm after every loop",
        "Trajectories differ across $N$, but final norms at a fixed depth differ by at most 1.32×",
        "Consistent with the bounded-norm prediction at initialization"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "pass-norm",
        "width": 800,
        "tour": [
          {
            "set": {
              "layers": "12"
            },
            "hold": 2400
          },
          {
            "set": {
              "layers": "24"
            },
            "hold": 2400
          },
          {
            "set": {
              "layers": "48"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "实验设置：Llama 风格 Pre-LN + Loop-μP；$L$ ∈ {12, 24, 48}，$N$ ∈ {2, 4, 8}；FineWeb-Edu 训练 10B tokens（20,000 步）后测量。 训练完成后，我们测量每轮循环输出的残差流范数。不同循环次数的中间轨迹虽不相同，但在固定物理深度下，最后一轮输出的范数最多相差 1.32 倍，与理论预期一致，不会随循环次数增加而持续膨胀。",
      "en": "Setup: Llama-style pre-norm + Loop-μP; $L$ ∈ {12, 24, 48}, $N$ ∈ {2, 4, 8}; measured after 10B FineWeb-Edu tokens (20,000 steps). After training, we record the residual-stream norm after each loop. The intermediate trajectories differ across loop counts, but at a fixed physical depth the final norms differ by at most 1.32 times. This matches the prediction at initialization: more loops do not keep inflating the final norm."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "实验验证",
      "en": "Experimental validation"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 380,
    "title": {
      "zh": "训练前十步：单步残差流更新幅度跨 $N$ 稳定",
      "en": "The first ten steps: stable residual-stream updates"
    },
    "lead": {
      "zh": "实验设置：12 层 Llama 风格 Pre-LN 块，$N$ = 1–64；固定随机 tokens，batch 1，序列长 128，10 个种子平均；AdamW 前 10 步。",
      "en": "Setup: 12-layer Llama-style pre-norm stack, $N$ = 1–64; fixed random tokens, batch 1, sequence length 128, 10-seed average; first 10 AdamW steps."
    },
    "points": {
      "zh": [
        "固定同一基础学习率，逐步测量最终残差流的更新幅度",
        "取 1/$N$ 时，$N$ 从 1 增至 64 的首步变化量始终稳定在 0.08–0.19",
        "前十步规律一致：衰减慢于 1/$N$ 则随 $N$ 放大，快于 1/$N$ 则随 $N$ 消失"
      ],
      "en": [
        "Use the same base learning rate for all $N$ and measure the final residual-stream change at each step",
        "With 1/$N$, the first-step change stays within 0.08–0.19 as $N$ grows from 1 to 64",
        "The same holds for all ten steps: slower decay than 1/$N$ amplifies updates, faster decay suppresses them"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "one-step",
        "width": 760,
        "scale": 0.95,
        "tour": [
          {
            "set": {
              "step": "1"
            },
            "hold": 3000
          },
          {
            "set": {
              "step": "2"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "3"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "4"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "5"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "6"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "7"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "8"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "9"
            },
            "hold": 600
          },
          {
            "set": {
              "step": "10"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "实验设置：12 层 Llama 风格 Pre-LN 块，$N$ = 1–64；固定随机 tokens，batch 1，序列长 128，10 个种子平均；AdamW 前 10 步。 第二组实验考察训练初期的更新幅度。所有 N 共用同一个基础学习率，测量每一步 AdamW 更新后最终残差流的 RMS 变化。第 1 步到第 10 步规律完全一致：只有 1/N 能让 N 从 1 到 64 的变化量保持平稳；衰减慢于 1/N 时更新随 N 放大，快于 1/N 时更新随 N 消失。",
      "en": "Setup: 12-layer Llama-style pre-norm stack, $N$ = 1–64; fixed random tokens, batch 1, sequence length 128, 10-seed average; first 10 AdamW steps. The second experiment looks at training updates. All loop counts share one base learning rate, and we measure the change of the final residual stream after one AdamW step. At the first step, 1/N keeps the change between 0.08 and 0.19 for N from 1 to 64. The animation then runs through the first ten steps, and the pattern holds: branches that decay slower than 1/N amplify updates with N, faster decay makes them vanish."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "实验验证",
      "en": "Experimental validation"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 400,
    "title": {
      "zh": "训练 20,000 步后，各轮循环增量依然保持同向",
      "en": "After 20,000 steps, loop increments remain aligned"
    },
    "lead": {
      "zh": "实验设置：Llama 风格 Pre-LN + Loop-μP；$L$ ∈ {12, 24, 48}、$N$ = 8；FineWeb-Edu 训练 10B tokens 后，与非循环 $L$ = 48 对照。",
      "en": "Setup: Llama-style pre-norm + Loop-μP; $L$ ∈ {12, 24, 48}, $N$ = 8; after 10B FineWeb-Edu tokens, compared with an untied $L$ = 48 model."
    },
    "points": {
      "zh": [
        "$N$ = 8 时，三种物理深度下前 7 轮循环的增量仍两两正相关",
        "仅末轮循环与前序轮次呈弱相关或负相关",
        "对照的非循环 $L$ = 48 模型中，相关性仅出现在相邻层之间"
      ],
      "en": [
        "At $N$ = 8 and all three depths, increments remain positively correlated except at the final loop",
        "The final loop is weakly or negatively correlated with the others",
        "Untied $L$ = 48: alignment is mainly between neighboring layers"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "trained-cosine",
        "width": 760,
        "scale": 0.88,
        "tour": [
          {
            "set": {
              "layers": "12"
            },
            "hold": 2400
          },
          {
            "set": {
              "layers": "24"
            },
            "hold": 2400
          },
          {
            "set": {
              "layers": "48"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "实验设置：Llama 风格 Pre-LN + Loop-μP；$L$ ∈ {12, 24, 48}、$N$ = 8；FineWeb-Edu 训练 10B tokens 后，与非循环 $L$ = 48 对照。 再看训练后的增量相关性。训练 20,000 步后，在 N=8 的三种物理深度下，除最后一轮循环外，前 7 轮循环的增量依然两两正相关；而 48 层非循环模型只在对角线附近的相邻层之间相关。说明权重共享带来的同向累加结构贯穿了整个训练过程。",
      "en": "Setup: Llama-style pre-norm + Loop-μP; $L$ ∈ {12, 24, 48}, $N$ = 8; after 10B FineWeb-Edu tokens, compared with an untied $L$ = 48 model. Back to the correlations. After 20,000 training steps we look at the eight-loop models again. At all three depths, increments of all but the last loop remain positively correlated; the last loop is weakly or even negatively correlated with the rest. The untied 48-layer model mainly correlates neighboring layers. The structure seen at initialization survives training."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "实验验证",
      "en": "Experimental validation"
    },
    "layout": "split",
    "minutes": 1.15,
    "textWidth": 380,
    "title": {
      "zh": "同一基础学习率，直接迁移至所有循环次数与深度",
      "en": "One learning rate for every loop count"
    },
    "lead": {
      "zh": "FineWeb-Edu · Llama 风格 Pre-LN · 单模型 10B tokens · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}",
      "en": "FineWeb-Edu · Llama-style pre-norm · 10B tokens each · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}"
    },
    "points": {
      "zh": [
        "**Loop-μP**：所有 ($L$, $N$) 组合的最优基础学习率均为 1.25×10⁻³",
        "其余三种循环因子下，最优学习率均随 $N$ 发生偏移",
        "$N$ > 1 时，Loop-μP 在所有 $N$ 上均取得最低 validation loss，且随 $N$ 下降最快"
      ],
      "en": [
        "**Loop-μP**: the best base learning rate is 1.25×10⁻³ for every $N$, and the same at $L$ = 24 and 48",
        "Under the other three loop factors, the optimum moves with $N$",
        "For every $N$ > 1, Loop-μP reaches the lowest loss, and gains the most as $N$ grows"
      ]
    },
    "figures": [
      {
        "kind": "loop",
        "id": "lr-transfer",
        "width": 760,
        "scale": 0.92,
        "tour": [
          {
            "set": {
              "factor": "none",
              "layers": "12"
            },
            "hold": 2600
          },
          {
            "set": {
              "factor": "sqrt"
            },
            "hold": 2600
          },
          {
            "set": {
              "factor": "threehalves"
            },
            "hold": 2600
          },
          {
            "set": {
              "factor": "linear"
            },
            "hold": 3200
          },
          {
            "set": {
              "layers": "24"
            },
            "hold": 2400
          },
          {
            "set": {
              "layers": "48"
            }
          }
        ]
      }
    ],
    "notes": {
      "zh": "最后看端到端预训练的学习率迁移。我们在 FineWeb-Edu 上每个模型训练 10B tokens，覆盖 12、24、48 层和 1、2、4、8 轮循环。在 12 层上对比四种循环因子，更深的模型采用 Loop-μP 并配合深度方向的学习率缩放。所有 Loop-μP 配置的最优基础学习率严格停在 1.25×10^−3；其余循环因子下最优学习率均发生漂移，且当 N > 1 时，Loop-μP 取得的 validation loss 也是最低的。",
      "en": "Finally, learning-rate transfer. We train each model on 10B FineWeb-Edu tokens, covering 12, 24 and 48 layers with 1, 2, 4 and 8 loops. At 12 layers we compare four loop factors; deeper models use Loop-μP with depth-wise learning-rate scaling. Every tested Loop-μP configuration has the same best base learning rate, 1.25 times ten to the minus three. Under the other loop factors the optimum drifts, and for N greater than one Loop-μP also reaches the lowest loss."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "Loop-μP：仅需残差乘 1/$N$，即可实现跨循环次数的超参迁移",
      "en": "Loop-μP: scale residual branches by 1/$N$ for zero-shot transfer across loop counts"
    },
    "stage": {
      "zh": "总结与展望",
      "en": "Conclusions and outlook"
    },
    "layout": "columns",
    "minutes": 0.8,
    "columns": [
      {
        "title": {
          "zh": "核心结论",
          "en": "Conclusion"
        },
        "tone": "loop",
        "items": {
          "zh": [
            "权重共享使各轮残差增量同向累加，将独立层的连续可行区间收缩为唯一解 ($α$_{$N$} = 1, $γ$_{$N$} = 0)",
            "只需在残差分支额外乘以 1/$N$，基础学习率无需随循环次数 $N$ 调整",
            "最高 438M 参数、有效深度 384 层（$N$ = 8）下，最优学习率严格对齐且取得最低 validation loss"
          ],
          "en": [
            "Shared weights make residual increments accumulate coherently, shrinking the feasible interval to a unique point ($α$_{$N$} = 1, $γ$_{$N$} = 0)",
            "Simply multiply residual branches by 1/$N$; the base learning rate needs no adjustment with $N$",
            "Across settings up to 438M parameters and 384 effective layers ($N$ = 8), the optimal learning rate transfers directly and achieves the lowest loss"
          ]
        }
      },
      {
        "title": {
          "zh": "局限与展望",
          "en": "Limitations and outlook"
        },
        "tone": "muted",
        "items": {
          "zh": [
            "理论严格证明基于去均值线性 MLP 残差块，向非线性激活与 Adam 的推广依赖额外假设，Attention 与 LayerNorm 的精确动力学有待纳入",
            "受算力限制，实验验证最大规模为 438M 参数、单模型 10B tokens，更大规模下的表现仍待检验",
            "为 Looped Transformer 提供了简洁可靠的训练基准，扫清了后续等预算架构扩展研究（SMELT）的调参障碍"
          ],
          "en": [
            "Strict proofs focus on zero-mean linear MLP blocks; extensions to nonlinearities and Adam rely on extra assumptions, and exact Attention/LayerNorm dynamics remain open",
            "Empirical validation is bounded by compute at 438M parameters and 10B tokens per run",
            "Provides a clean parameterization baseline that removes tuning bottlenecks for fair architectural scaling studies (SMELT)"
          ]
        }
      }
    ],
    "notes": {
      "zh": "小结 Loop-μP：权重共享改变了残差增量的累加方式，将独立层的一整段可行区间收缩为唯一解 (1, 0)——残差分支额外乘以 1/N，基础学习率保持不变。初始化与训练后的激活诊断、单步更新测量以及最高 438M 参数、10B tokens 的学习率扫描都验证了这一结论。解决了“怎么训稳”之后，第二部分 SMELT 来回答下一个核心问题：在严格对齐各项资源预算后，循环架构到底能带来多少收益？",
      "en": "To sum up Loop-μP: shared weights change how residual increments accumulate, shrinking the feasible interval of independent layers to a single point. Concretely, scale residual branches by 1/N and keep the base learning rate fixed in N. Diagnostics at initialization and after training, the first ten updates and the learning-rate sweeps all support this. That answers both opening goals: increase the loop count stably, and reuse hyperparameters tuned at small N at large N. Full training runs reach 438M parameters and 10B tokens. Next, SMELT asks how much looping actually gains under matched budgets."
    }
  },
  {
    "part": "smelt",
    "layout": "section",
    "minutes": 0.3,
    "title": {
      "zh": "SMELT",
      "en": "SMELT"
    },
    "lead": {
      "zh": "等预算下的 MoE Looped Transformer Scaling Law",
      "en": "Scaling Laws for Looped Transformers under Matched Budgets"
    },
    "notes": {
      "zh": "第二部分介绍 SMELT。我们从训练参数化转向架构本身的扩展规律：先建立同时控制算力、参数量与 KV cache 的等预算对比框架，再通过小规模消融确定循环架构设计，最后在四个规模上拟合 Scaling Law，并剖析下游表现与内部机制。",
      "en": "The second study is SMELT. We move from training stability to architectural gains. I will first define budget-matched comparisons, then find a loop recipe, measure its scaling across model sizes, and examine downstream performance and the changes inside repeated layers."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与等预算设定",
      "en": "Question and budget matching"
    },
    "layout": "stack",
    "minutes": 0.75,
    "title": {
      "zh": "性能提升来自循环架构本身，还是多花的计算量？",
      "en": "Do the gains come from looping itself, or from the extra compute?"
    },
    "lead": {
      "zh": "Looped Transformer 通过重复执行部分层，在不增加参数量的前提下加深计算，在推理与数学等任务上表现突出。",
      "en": "A Looped Transformer executes some of its layers repeatedly, giving deeper computation without adding parameters; the idea has shown considerable promise on tasks such as reasoning and math."
    },
    "figures": [
      {
        "kind": "hero",
        "width": 760,
        "scale": 1.18
      }
    ],
    "notes": {
      "zh": "Looped Transformer 虽然不增加参数量，但每多循环一轮都会带来额外的 FLOPs 和 KV cache 开销。如果只控制参数量相等，就无法区分性能提升究竟来自循环架构本身，还是单纯因为多花了算力。因此，我们需要在多项资源预算同时对齐的前提下，检验循环架构是否仍有优势。",
      "en": "Looping increases executed depth without adding parameters, but every extra visit costs compute. Fixing parameter count alone cannot distinguish an architectural gain from additional computation. The animation makes this distinction concrete. We want to test whether looping still provides a net benefit when several resource budgets are controlled together."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与等预算设定",
      "en": "Question and budget matching"
    },
    "layout": "cards",
    "minutes": 0.65,
    "title": {
      "zh": "公平比较需要同时对齐三项核心预算",
      "en": "To tell whether looping itself helps, a comparison must match three budgets at once"
    },
    "lead": {
      "zh": "以往研究大多只固定模型参数量，将循环架构自身的优势与额外投入的算力混在了一起。",
      "en": "Every extra pass costs extra compute, and most comparisons so far fix only model size, mixing the architecture’s own advantage with the extra compute it spends."
    },
    "cards": [
      {
        "tag": {
          "zh": "算力",
          "en": "Compute"
        },
        "title": {
          "zh": "每 token FLOPs",
          "en": "Per-token FLOPs"
        },
        "body": {
          "zh": "决定训练与推理的计算开销",
          "en": "Determine training and inference cost"
        }
      },
      {
        "tag": {
          "zh": "容量",
          "en": "Capacity"
        },
        "title": {
          "zh": "总参数量",
          "en": "Total parameters"
        },
        "body": {
          "zh": "决定模型存储容量（不含 embedding）",
          "en": "Bound knowledge capacity (non-embedding)"
        }
      },
      {
        "tag": {
          "zh": "上下文",
          "en": "Context"
        },
        "title": {
          "zh": "KV cache",
          "en": "KV cache"
        },
        "body": {
          "zh": "限制推理可服务的上下文长度与并发",
          "en": "Limits the context length that can be served"
        }
      }
    ],
    "notes": {
      "zh": "具体而言，我们需要同时控制三个指标：决定训练与推理计算成本的每 token FLOPs、决定知识容量的非 embedding 总参数量，以及决定长上下文服务显存开销的 KV cache。只对齐其中一项，其余两项的差异仍会干扰结论；因此我们要求每一组配对模型在这三项预算上同时近似相等。",
      "en": "We control three quantities together. Per-token FLOPs represent computation, non-embedding total parameters represent capacity, and KV cache represents the memory needed to serve context. Matching just one leaves the other two as possible explanations for a performance difference. We therefore make all three budgets close within each model pair."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与等预算设定",
      "en": "Question and budget matching"
    },
    "layout": "split",
    "minutes": 1,
    "textWidth": 330,
    "numbered": true,
    "title": {
      "zh": "等预算对齐方案：利用 MoE 解耦参数量与计算量",
      "en": "Budget matching: MoE decouples parameters from compute"
    },
    "points": {
      "zh": [
        "缩窄或变浅模型，抵消循环执行多出的每 token FLOPs",
        "增加每层专家总数，补齐缩窄减少的总参数量",
        "调整注意力头配置（GQA ratio / head dim），对齐 KV cache"
      ],
      "en": [
        "Make the model narrower or shallower to offset the extra computation of the repeated passes",
        "Add experts to make up the total parameter count",
        "Adjust the attention configuration (GQA ratio and head dimension) to match the KV cache"
      ]
    },
    "foot": {
      "zh": "通过三步调整，使 Baseline 与循环模型的每 token FLOPs、非 embedding 总参数量及 KV cache 同时近似相等。",
      "en": "Three adjustments jointly approximate the same per-token FLOPs, non-embedding parameter count and KV cache."
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "recipe",
        "width": 760,
        "scale": 0.98
      }
    ],
    "notes": {
      "zh": "稀疏 MoE 让我们能够独立调节总参数量与每 token 计算量：第一步缩窄或变浅模型，抵消循环多出的 FLOPs；第二步增加每层专家数，把因缩窄损失的总参数量补回来；第三步调整 GQA 比例和 head dim，把每轮独立缓存的 KV cache 也对齐。后续所有消融和扩展实验均基于这套配对方案。",
      "en": "MoE lets us adjust total parameters separately from per-token computation. We first reduce width or depth to offset repeated execution, then add experts to restore parameter count, and finally adjust the GQA ratio or head dimension to match KV cache. These steps produce closely budget-matched baseline and looped models. We retain this framework throughout the ablations."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "架构设计消融",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "架构设计 ①：仅循环中间 50% 的层效果最好",
      "en": "Recipe ①: looping the middle 50% of layers gives the lowest loss"
    },
    "points": {
      "zh": [
        "在等预算约束下，于小规模模型上依次消融循环位置、执行深宽比与循环次数",
        "将循环层比例从 0%（不循环）扫至 100%（全层循环），约 50% 时 validation loss 最低",
        "推测首尾层分别承担输入编码与输出预测等特定功能，保留独立权重优于共享"
      ],
      "en": [
        "Under the budget-matching rules, search at small scale over loop span, effective depth-to-width ratio and loop count, in that order",
        "Vary the looped fraction from 0% (no looping) to 100% (every layer looped): validation loss is lowest at around 50%",
        "We conjecture the first and last layers serve specialized roles, so keeping their parameters independent may work better than sharing them"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "loop-span",
        "width": 760,
        "scale": 0.98
      }
    ],
    "notes": {
      "zh": "在等预算设定下，我们先在小规模模型上做三组架构消融。首先是循环范围：将循环层比例从 0% 扫到 100%，循环中间约一半的层时 validation loss 最低。直观上看，靠近输入和输出的层功能更为专一，保留独立权重比参与循环共享更合适。",
      "en": "We first search the loop span. In small-scale budget-matched experiments, varying the repeated fraction from zero to all layers gives the lowest validation loss when roughly the middle half is looped. One possible explanation is that the first and last layers benefit from independent parameters for specialized functions. We then fix the span and search the depth-to-width ratio."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "架构设计消融",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "架构设计 ②：循环模型的最优执行深宽比更高",
      "en": "Recipe ②: looped models prefer a larger effective depth-to-width ratio"
    },
    "points": {
      "zh": [
        "固定循环中间 50% 的层，比较不同的执行深宽比（执行层数与模型宽度之比）",
        "循环模型的最优执行深宽比显著高于非循环 Baseline",
        "推测与权重共享有关：增加执行深度不引入额外参数，且共享权重同时接收浅层与深层梯度，使更深的计算图更易优化"
      ],
      "en": [
        "With the loop span fixed at 50%, compare effective depth-to-width ratios (executed depth divided by model width)",
        "The looped model’s optimal ratio is larger than the unlooped model’s",
        "We conjecture this relates to parameter sharing: extra executed depth adds no parameters, and the shared parameters get gradient signals from both “shallow” and “deep” positions, which may make deeper configurations easier to optimize"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "depth-width",
        "width": 760,
        "scale": 0.98
      }
    ],
    "notes": {
      "zh": "接着固定中间 50% 循环，按实际执行的层数扫描深宽比。结果显示，循环模型的最优执行深宽比明显高于 Baseline。我们推测，循环加深不引入新参数，且同一组共享权重同时获得浅层与深层两个位置的梯度信号，比堆叠同等深度的独立层更容易优化。",
      "en": "The effective depth-to-width ratio uses executed depth rather than physical layer count. With the middle half looped, the looped model prefers a larger ratio than the baseline. Shared parameters receive gradients from different execution positions, which may help optimize deeper computation. That interpretation motivates further analysis; our present choice is determined directly by validation loss."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "架构设计消融",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "架构设计 ③：循环 2 次综合收益最大",
      "en": "Recipe ③: looping twice gives the largest gain"
    },
    "points": {
      "zh": [
        "扫描循环次数 1–4 次，循环 2 次时 validation loss 最低",
        "等 FLOPs 约束下，循环 3–4 次需进一步缩窄模型，性能较 2 次有所回落，但仍优于 Baseline"
      ],
      "en": [
        "Sweep the loop count from one to four: two is best",
        "With FLOPs matched, each additional loop makes the model narrower still; we attribute the regression of three and four loops to this narrowing, though both still beat the Baseline"
      ]
    },
    "callout": {
      "zh": "**SMELT 架构方案**：在稀疏 MoE 中将中间 50% 的层循环 2 轮，并采用更高的执行深宽比",
      "en": "**SMELT**: in a sparse MoE model, loop the middle half of the layers twice and use a larger effective depth-to-width ratio"
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "loop-count",
        "width": 760,
        "scale": 0.98
      }
    ],
    "notes": {
      "zh": "第三步扫描 1 到 4 轮循环，2 轮效果最好。在固定 FLOPs 下，继续增加循环轮次必须把模型压得更窄，因此 3 轮和 4 轮虽仍优于 Baseline，但不如 2 轮。综合以上三点就得到了 SMELT 架构：稀疏 MoE、中间一半层循环 2 轮、配合更高的执行深宽比。下面检验这套方案跨规模扩展的表现。",
      "en": "We finally sweep one to four loops. Two gives the largest gain. Under a fixed compute budget, additional loops require further narrowing; three and four still beat the baseline but underperform two. This gives the SMELT recipe: a sparse MoE, the middle half executed twice, and a larger effective depth-to-width ratio. We now test whether this small-scale recipe transfers across scales."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "Scaling Law",
      "en": "Scaling laws"
    },
    "layout": "stack",
    "minutes": 1,
    "title": {
      "zh": "全部 16 组等预算配置下，SMELT 的 validation loss 均低于 Baseline",
      "en": "SMELT has lower validation loss in all 16 matched configurations"
    },
    "lead": {
      "zh": "4 档激活规模（100M / 200M / 600M / 1.6B，按 Baseline 每 token 激活的非 embedding 参数量命名）× 4 档稀疏度，最大非 embedding 总参数量 54B；每组均配对训练 Baseline 与 SMELT。",
      "en": "4 sizes (100M / 200M / 600M / 1.6B, named after the Baseline’s active non-embedding parameters per token) × 4 sparsity levels, up to 54B total parameters (excluding embeddings); a matched Baseline and SMELT pair for each combination."
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "loss-compute",
        "width": 980,
        "scale": 0.87
      }
    ],
    "notes": {
      "zh": "我们将实验扩展到 4 档激活规模乘 4 档稀疏度，共 16 组等预算配置。规模按 Baseline 每 token 激活的非 embedding 参数量从 100M 到 1.6B 命名，最大非 embedding 总参数量达到 54B。在全部 16 组配置中，SMELT 的 validation loss 均低于对应的 Baseline。接下来我们通过 Scaling Law 拟合量化其随算力与数据扩展的趋势。",
      "en": "We compare four model sizes and four sparsity levels, giving 16 matched configurations. Sizes are named after the baseline active non-embedding parameters per token, from 100M to 1.6B; total non-embedding parameters reach 54B. SMELT has lower validation loss in all 16 configurations. We next fit scaling laws to quantify the trend as computation and data increase."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "Scaling Law",
      "en": "Scaling laws"
    },
    "layout": "split",
    "minutes": 1.1,
    "textWidth": 380,
    "title": {
      "zh": "独立拟合 Scaling Law：SMELT 的 loss 随规模下降更快",
      "en": "Separate scaling-law fits: SMELT’s loss falls faster"
    },
    "points": {
      "zh": [
        "$E$ 为不可约损失；容量项由每 token FLOPs $F$ 与稀疏度 $S$ 决定；数据项由训练 token 数 $D$ 决定",
        "对 Baseline 与 SMELT 分别独立拟合 6 个参数（$E$, $A$, $K$, $a$, $b$, $c$）[5]",
        "容量指数 $a$：0.3892 vs. 0.3703；数据指数 $c$：0.7011 vs. 0.6594"
      ],
      "en": [
        "$E$ is the irreducible loss; the capacity term depends on per-token FLOPs $F$ and sparsity $S$; the data term on training tokens $D$",
        "The Baseline and SMELT each get their own six coefficients ($E$, $A$, $K$, $a$, $b$, $c$) [5]",
        "Capacity exponent $a$: 0.3892 vs. 0.3703; data exponent $c$: 0.7011 vs. 0.6594"
      ]
    },
    "figures": [
      {
        "kind": "formula",
        "width": 720,
        "scale": 0.94
      },
      {
        "kind": "smelt",
        "id": "coefficients",
        "width": 760,
        "scale": 0.92
      }
    ],
    "notes": {
      "zh": "我们对两种架构分别独立拟合含稀疏度项的 Chinchilla 形式公式，各自估计 6 个参数。SMELT 的容量指数 a 为 0.3892（Baseline 为 0.3703），数据指数 c 为 0.7011（Baseline 为 0.6594）。两项幂指数同时更高，表明在拟合区间内 SMELT 随算力与数据的 loss 下降斜率更陡。",
      "en": "We fit a Chinchilla-style relation separately for each architecture. E is irreducible loss; the capacity term depends on per-token FLOPs and sparsity, and the data term depends on training tokens. Each architecture has its own six fitted coefficients. SMELT has a capacity exponent of 0.3892 versus 0.3703, and a data exponent of 0.7011 versus 0.6594. Both are larger, corresponding to faster loss reduction within the fitted range."
    },
    "references": [
      "[5] Training Compute-Optimal Large Language Models (2022)."
    ]
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "Scaling Law",
      "en": "Scaling laws"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 420,
    "title": {
      "zh": "Compute-Optimal 前沿：达到相同 loss，SMELT 所需训练算力更少",
      "en": "On the compute-optimal frontier, SMELT needs less training compute"
    },
    "stats": [
      {
        "value": "6.8%–10.0%",
        "label": {
          "zh": "10²⁰ FLOPs 处节省算力",
          "en": "saved at 10²⁰ FLOPs"
        },
        "tone": "gain"
      },
      {
        "value": "14.7%–18.0%",
        "label": {
          "zh": "10²¹ FLOPs 处节省算力",
          "en": "saved at 10²¹ FLOPs"
        },
        "tone": "gain"
      }
    ],
    "points": {
      "zh": [
        "评估区间：10²⁰ FLOPs 至拟合上限（约 2.2×10²¹ FLOPs）",
        "覆盖稀疏度 $S$ ≈ 85%–97%（稠密档 $S$ = 0 未纳入该拟合）",
        "按拟合点估计，算力预算越大，节省的训练 FLOPs 比例越高"
      ],
      "en": [
        "Range: 10²⁰ FLOPs up to the top of the fitted range (about 2.2×10²¹ FLOPs)",
        "Values depend on sparsity, S ≈ 85%–97%; the S = 0 level is not in the fit",
        "By the fitted point estimates, the savings grow with the compute budget"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "frontier",
        "width": 760,
        "scale": 0.78
      }
    ],
    "notes": {
      "zh": "在 Compute-Optimal 前沿上，我们对比达到相同 validation loss 所需的总训练算力：在 10^20 FLOPs 处 SMELT 可节省 6.8%–10.0%，到 10^21 FLOPs 处扩大至 14.7%–18.0%。具体幅度随稀疏度变化（稠密档 S=0 未纳入该拟合），在最大约 2.2×10^21 FLOPs 的拟合区间内，点估计节省比例随算力预算单调递增。",
      "en": "On the compute-optimal frontier, we compare the training compute needed for the same validation loss. Near ten to the twenty FLOPs, savings are about 6.8 to 10.0 percent; near ten to the twenty-one, about 14.7 to 18.0 percent. These are fitted point estimates varying with sparsity. The comparison extends to roughly 2.2 times ten to the twenty-one FLOPs, and the zero-sparsity setting is excluded from this fit."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.8,
    "textWidth": 330,
    "title": {
      "zh": "DCLM：绝大多数等预算配对上 SMELT 更优",
      "en": "DCLM: SMELT wins most matched pairs"
    },
    "stats": [
      {
        "value": "96 / 96",
        "label": {
          "zh": "DCLM Completion",
          "en": "DCLM Completion"
        },
        "tone": "loop"
      },
      {
        "value": "83 / 96",
        "label": {
          "zh": "DCLM Core",
          "en": "DCLM Core"
        },
        "tone": "loop"
      }
    ],
    "foot": {
      "zh": "16 组配置 × 6 个训练步数预算 = 96 组等预算配对。",
      "en": "16 configurations × 6 training horizons = 96 matched pairs."
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "dclm-core",
        "width": 860,
        "scale": 0.92
      }
    ],
    "notes": {
      "zh": "每组架构配置取 6 个训练步数预算，共构成 96 组等预算配对。在 DCLM Completion 上，SMELT 在全部 96 组中胜出；在 DCLM Core 上胜出 83 组，说明预训练 validation loss 的优势稳定传递到了下游评测。接下来单独看 MMLU，因为需要区分接近随机猜测的低分区与有效学习区间。",
      "en": "Taking six training horizons per configuration gives 96 matched pairs. SMELT wins all 96 comparisons on DCLM Completion and 83 on DCLM Core. The validation-loss advantage therefore carries over to most downstream comparisons. I will examine MMLU separately, since scores near chance need a different interpretation."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "MMLU：突破随机水平的 30 组配对中胜出 29 组",
      "en": "MMLU: 29 wins in 30 pairs above chance"
    },
    "points": {
      "zh": [
        "筛选 Baseline 准确率显著高于 25% 随机猜测水平的配对",
        "在这 30 组有效对比中，SMELT 有 29 组准确率更高",
        "切换至全部 96 组可对照观察随机猜测区与有效学习区"
      ],
      "en": [
        "Focus on pairs where Baseline accuracy is clearly above the 25% chance level",
        "SMELT is more accurate in 29 of these 30 pairs",
        "Switch to all 96 pairs to distinguish the low-score region from above-chance comparisons"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "mmlu",
        "width": 860
      }
    ],
    "notes": {
      "zh": "MMLU 四选一的随机猜测准确率为 25%。若筛选 Baseline 已明显突破随机水平的 30 组配对，SMELT 在其中 29 组取得更高准确率；切换到全部 96 组可以看到其余小规模或短训练配置仍停留在随机水平附近。",
      "en": "Chance performance on MMLU is 25 percent. We first examine the 30 matched pairs whose baseline is clearly above this level; SMELT has higher accuracy in 29. Switching to all 96 pairs also shows the configurations near chance. Separating the above-chance region makes the architectural comparison easier to interpret."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 360,
    "title": {
      "zh": "对齐 validation loss 后，下游优势依然存在",
      "en": "Downstream gains remain at the same validation loss"
    },
    "points": {
      "zh": [
        "在全部 Baseline 评测点上拟合“validation loss → 下游得分”基准曲线",
        "三项评测指标、各档模型规模下，SMELT 平均得分均高于同 loss 的 Baseline 拟合值",
        "DCLM 两项指标的正向残差随规模扩大；同规模 Baseline 相对合并拟合曲线本身也存在规模偏移"
      ],
      "en": [
        "Fit validation loss → downstream score using Baseline runs",
        "SMELT exceeds the curve on all three metrics at every scale",
        "DCLM residuals grow with scale; same-scale Baseline residuals against the pooled curve also grow"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "beyond-loss",
        "width": 760,
        "scale": 0.92
      }
    ],
    "notes": {
      "zh": "下游提升是否只是 validation loss 更低带来的自然结果？我们用全部 Baseline 实验点拟合 validation loss 到下游得分的映射曲线，再检验同 loss 下 SMELT 的表现。在全部三项指标与各档规模下，SMELT 均值都位于 Baseline 拟合曲线上方。需要注意，DCLM 上相对合并曲线的正残差随规模增大，但同规模 Baseline 相对合并曲线同样有正向偏移，因此应当结合同规模 Baseline 残差一起解读。",
      "en": "Are downstream gains fully explained by lower validation loss? We fit a validation-loss-to-score curve on baseline runs and compare SMELT against it. Across all three metrics and every scale, SMELT averages above the baseline prediction. DCLM residuals against the pooled curve grow with scale, but same-scale baseline residuals also grow. The comparison here is specifically against that fitted curve."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.65,
    "textWidth": 340,
    "title": {
      "zh": "分领域分析：结构化越强的文本，循环收益越显著",
      "en": "Domains: larger gains on more structured text"
    },
    "points": {
      "zh": [
        "Code 领域下降幅度最大，Finance 与 Math/STEM 次之",
        "Knowledge 与通用 Web 文本的改善幅度相对较小",
        "统计自等预算配对模型在各细分领域的 validation loss 差值"
      ],
      "en": [
        "Code gains the most, followed by Finance and Math/STEM",
        "Knowledge and Web show smaller gains",
        "Compare domain-level validation-loss changes between budget-matched models"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "domain-gain",
        "width": 860
      }
    ],
    "notes": {
      "zh": "将验证集按领域拆分后可以看到，循环带来的收益并不均匀：Code 领域最大，Finance 与 Math/STEM 紧随其后，而偏重事实记忆的 Knowledge 与通用 Web 文本收益较小。整体呈现出结构化与推理特征越强、循环收益越大的趋势。下一页继续从上下文长度维度拆分。",
      "en": "Breaking the validation set down by domain reveals uneven gains. Code gains most, followed by Finance and Math/STEM; Knowledge and Web gain less. More structured domains tend to benefit more from looping. We next split by text length and compare controls that change expert count or total parameters."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.8,
    "textWidth": 340,
    "title": {
      "zh": "分长度分析：长文本归一化收益约为短文本的 1.5 倍",
      "en": "Length: long samples gain about 1.5× as much"
    },
    "points": {
      "zh": [
        "以 256 tokens 为界切分长短样本，并在每组配对内部做归一化",
        "长样本上的相对 loss 降幅约为短样本的 1.5 倍",
        "单纯增加专家数或总参数量的对照组未出现类似的长度偏好"
      ],
      "en": [
        "Split at 256 tokens and normalize within each matched pair",
        "Long samples gain about 1.5× as much as short samples",
        "Controls adding experts or total parameters do not show the same length dependence"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "length-gain",
        "width": 860
      }
    ],
    "notes": {
      "zh": "在每组配对内对整体收益做归一化后，再以 256 tokens 为界划分长短样本：长样本的归一化收益约为短样本的 1.5 倍。作为对照，单纯增加专家数或总参数量的模型在长短样本上收益几乎持平。说明这种长上下文偏好源自循环计算本身，这也自然引出下一页对 In-Context Learning 的检验。",
      "en": "We normalize gains within each matched pair and split samples at 256 tokens. Longer samples gain about 1.5 times as much as shorter ones. Controls that only add experts or total parameters do not show the same length dependence. This supports associating the length-related gain with repeated computation and motivates examining in-context learning."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务表现",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 380,
    "title": {
      "zh": "In-Context Learning：提供上下文示例后优势扩大",
      "en": "In-context examples widen the advantage"
    },
    "points": {
      "zh": [
        "16 项任务平均：领先幅度从 0-shot 的 +0.9 个百分点扩大至 1-shot 的 +1.9 个百分点，并在 8-shot 内保持稳定",
        "Dyck Languages（高度依赖示例归纳）：4-shot 以内基本持平，8-shot 起差距逐步拉开，32-shot 时达到 29.8% vs. 26.4%"
      ],
      "en": [
        "16-task average: the gap rises from 0.9 points with no examples to 1.9 points with one, and roughly holds up to 8 examples",
        "Dyck Languages, which relies heavily on its examples: roughly level up to 4 examples; the gap opens from 8 on, reaching 29.8% vs. 26.4% at 32"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "icl-gain",
        "width": 760,
        "scale": 0.95
      }
    ],
    "notes": {
      "zh": "在 In-Context Learning 评测中，16 个任务的平均领先幅度从 0-shot 的 0.9 个百分点翻倍至 1-shot 的 1.9 个百分点，并稳定保持到 8-shot。在高度依赖上下文示例的 Dyck 括号匹配任务上，8-shot 之后优势持续拉开，32-shot 时达到 29.8% 对 26.4%。接下来我们深入循环层内部，从专家路由与注意力演化理解这些现象。",
      "en": "Once examples are supplied, the average advantage across 16 tasks grows from 0.9 percentage points at zero shot to 1.9 at one shot and roughly persists through eight examples. In Dyck, the gap opens from eight examples onward, reaching 29.8 versus 26.4 percent at 32 examples. We now inspect routing and attention inside the loop for clues related to these results."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "内部机制分析",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "专家路由：全部 16 组配置的跨轮专家重合度均高于随机基线",
      "en": "Expert reuse exceeds chance in all 16 configurations"
    },
    "points": {
      "zh": [
        "第 2 轮循环既会复用第 1 轮选中的部分专家，也会激活新的专家",
        "两轮路由选中的专家集合重合度显著高于独立随机路由"
      ],
      "en": [
        "The second visit reuses some of the experts chosen on the first, and selects some new ones",
        "The overlap between the two visits’ expert sets is far above chance"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "expert-reuse",
        "width": 860,
        "panel": "overview"
      }
    ],
    "notes": {
      "zh": "先考察同一 token 在两轮循环中激活的专家集合：在全部 16 组配置下，第 2 轮与第 1 轮选中专家的重合比例都远高于随机路由基线，但又并非完全照搬，而是在保留部分原专家的同时引入新专家。接下来考察两轮循环对残差流的更新。",
      "en": "We first compare the expert sets selected on the two visits. In all 16 configurations, reuse on the second visit is far above the random-routing expectation. Repeated execution retains some experts and introduces others. Next, we examine how the two visits update the residual stream."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "内部机制分析",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "残差流演化：第 2 轮更新范数更大，且与首轮部分对齐",
      "en": "Residual stream: larger, partly aligned second updates"
    },
    "points": {
      "zh": [
        "第 2 轮写入残差流的更新范数在各层均大于第 1 轮",
        "1.6B、S ≈ 85%：同一物理层两轮更新的平均余弦相似度约 0.56，跨物理层仅约 0.16",
        "第 2 轮在精炼首轮表征方向的同时给出了更强的残差修正"
      ],
      "en": [
        "The second visit consistently writes a larger update to the residual stream than the first",
        "At 1.6B and S ≈ 85%: the cosine between the two visits’ updates at the same physical layer averages about 0.56, against about 0.16 between different layers",
        "This supports an interpretation in which the second visit amplifies the first signal"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "residual-flow",
        "width": 760,
        "scale": 0.9
      }
    ],
    "notes": {
      "zh": "进一步观察每轮写入残差流的更新向量：第 2 轮的更新范数始终高于第 1 轮；在 1.6B、约 85% 稀疏度模型上，同一物理层两轮更新的平均余弦相似度达 0.56，而不同物理层之间仅为 0.16。说明第 2 轮并非无关重写，而是在首轮方向基础上做更大幅度的强化与修正。",
      "en": "We next inspect what each visit writes to the residual stream. The second visit consistently has a larger update. At 1.6B and about 85 percent sparsity, updates from the same physical layer have a mean cosine of about 0.56 across visits, compared with about 0.16 across layers. The combination of magnitude and direction supports an interpretation of the second visit amplifying the first signal."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "内部机制分析",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.65,
    "textWidth": 360,
    "title": {
      "zh": "Attention 分解：关注位置相近，读取内容改变",
      "en": "Attention: similar positions, different retrieved content"
    },
    "points": {
      "zh": [
        "两轮循环间 Q 与 K 的余弦相似度高达 0.89–0.93：模型检索的上下文位置基本一致",
        "表征差异主要集中在 V 投影及后续加权输出"
      ],
      "en": [
        "Between the two visits, the queries (Q) and keys (K) each reach a cosine similarity of 0.89–0.93: the model attends to largely the same positions",
        "The change happens mainly in the values (V) and the outputs computed from them"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "attention-stages",
        "width": 760,
        "scale": 0.91
      }
    ],
    "notes": {
      "zh": "将 Attention 各中间变量在两轮循环间做余弦对比：Q 与 K 的相似度高达 0.89–0.93，说明平均而言模型在两轮关注的位置大体一致；而相似度显著下降发生在 V 及后续输出阶段，表明第 2 轮主要改变了从目标位置提取并写回的信息内容。下一页再看特定注意力头在 Dyck 任务上的检索转移。",
      "en": "The attention decomposition gives a finer view. Queries and keys have high between-visit cosines, about 0.89 to 0.93, indicating broadly similar retrieval positions. Larger changes occur in values and the resulting outputs, so the second visit changes the content retrieved and written back. We next inspect a concrete attention head on Dyck."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "内部机制分析",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "Dyck 案例：关键注意力头从 BOS 转向示例答案位置",
      "en": "Dyck: a key head shifts from BOS to example answers"
    },
    "points": {
      "zh": [
        "Dyck 括号匹配任务依赖定位上下文示例中的闭合括号答案来完成推理",
        "同一关键注意力头在第 1 轮主要停留在 BOS，到第 2 轮精准转向各示例的答案位置"
      ],
      "en": [
        "Dyck Languages is a bracket-matching task: the model must locate the relevant answers in the given examples to predict correctly",
        "A key attention head concentrates on the BOS token on the first visit; on the second visit the same head attends to the answer positions"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "dyck-attention",
        "width": 800,
        "scale": 0.94
      }
    ],
    "notes": {
      "zh": "在 Dyck 括号匹配任务中，模型需要借助上下文示例推断闭合规则。这里展示的关键注意力头在第 1 轮循环时把大部分权重放在句首 BOS 上，而到第 2 轮循环时，同一组参数将注意力精准投向了各个示例的答案 token。这一现象引出了下一页对全模型 Attention sink 的定量统计。",
      "en": "Dyck requires bracket completion using the provided examples. This key attention head concentrates on BOS during the first visit and shifts toward the example-answer positions during the second. Repeated execution gives the same physical layer a different retrieval pattern. This case also motivates examining attention sinks across the model."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "内部机制分析",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 400,
    "title": {
      "zh": "Attention sink：进入第 2 轮循环后不增反降",
      "en": "Attention sink: it weakens on the second visit"
    },
    "points": {
      "zh": [
        "标准 Baseline 模型中，Attention sink 随网络层数加深持续增强",
        "SMELT 呈现相反规律：进入第 2 轮循环后，BOS 注意力占比显著回落",
        "从 BOS 释放出的注意力可重新分配至有效上下文（如 Dyck 中的示例答案）"
      ],
      "en": [
        "In the Baseline, the attention sink grows stronger with depth",
        "The looped architecture shows the opposite: on the second visit, the sink weakens",
        "In Dyck, attention moves to example answers; this may relate to the in-context learning advantage"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "attention-sink",
        "width": 760,
        "scale": 0.86
      }
    ],
    "notes": {
      "zh": "在标准 Baseline 中，BOS 上的 Attention sink 随深度单调增强；而在 SMELT 中，进入第 2 轮循环后 BOS 注意力占比明显回落。结合前页 Dyck 的案例，从 BOS 释放的注意力得以转向示例中的关键位置，这可能是循环架构在长文本与 In-Context Learning 上表现更优的潜在机制之一，其严格因果性仍有待后续干预实验验证。",
      "en": "In the baseline, attention sinks strengthen with depth, while the second looped visit weakens them. In the Dyck case, attention moves from BOS toward example answers. We conjecture that this change may relate to the in-context learning advantage. These measurements provide routing and attention clues; establishing the causal relationship requires further experiments."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "总结与展望",
      "en": "Conclusions and outlook"
    },
    "layout": "columns",
    "minutes": 0.9,
    "title": {
      "zh": "三项预算严格受控下，循环依然为 MoE 带来稳定的扩展净收益",
      "en": "Under matched budgets, looping still yields a net gain for MoE Transformers"
    },
    "columns": [
      {
        "title": {
          "zh": "核心结论",
          "en": "Conclusion"
        },
        "tone": "loop",
        "items": {
          "zh": [
            "Scaling Law 与下游评测一致表明：在等预算约束下，循环架构对稀疏 MoE 依然具有明确净收益",
            "16 组配对的 validation loss 全部更低；Compute-Optimal 前沿上达到相同 loss 可节省 6.8%–18.0% 训练算力",
            "内部表征上表现出跨轮专家部分复用、残差更新放大，以及第 2 轮 Attention sink 减弱等特征"
          ],
          "en": [
            "Scaling laws and downstream evaluations agree: for MoE Transformers, looping still yields a net gain",
            "Lower validation loss in all 16 matched configurations; 6.8%–18.0% less training compute for the same loss on the compute-optimal frontier",
            "The mechanistic analysis offers descriptive clues to where the gain comes from"
          ]
        }
      },
      {
        "title": {
          "zh": "局限与展望",
          "en": "Limitations and outlook"
        },
        "tone": "muted",
        "items": {
          "zh": [
            "架构消融基于单档预算完成，更大规模下的最优循环次数与深度切分仍待探索",
            "本文聚焦理论算力与容量预算对齐，尚未展开端到端 wall-clock 吞吐与系统级优化",
            "期望这套等预算评测协议与 SMELT 架构能作为公平基线，服务后续 Looped MoE 变体研究"
          ],
          "en": [
            "The ablations are limited in scale",
            "No system-level optimization for wall-clock efficiency",
            "We hope the budget-matching protocol and the SMELT recipe give the community a reference setup and point of comparison for exploring more variants under fair conditions"
          ]
        }
      }
    ],
    "notes": {
      "zh": "总结 SMELT 部分：在同时对齐训练 FLOPs、总参数量与推理 KV cache 后，循环依然为稀疏 MoE 带来一致的 validation loss 与下游任务提升，并在路由复用、残差更新和 Attention sink 上展现出清晰的跨轮演化规律。目前工作的局限在于架构消融规模相对有限，且尚未涉及底层系统吞吐优化。我们希望这套等预算对比框架能为后续循环架构研究提供干净的实验基准。",
      "en": "SMELT shows that looping retains validation-loss and downstream gains when compute, parameter count and KV cache are controlled together. The analysis reveals expert reuse, amplified residual signals and changes in attention content. The ablations remain limited in scale, and wall-clock system efficiency needs further work. We hope the budget-matching framework and recipe provide a shared starting point for comparing more architectural variants."
    }
  },
  {
    "part": "closing",
    "layout": "end",
    "minutes": 0.6,
    "title": {
      "zh": "谢谢，欢迎提问",
      "en": "Thank you. Questions welcome."
    },
    "notes": {
      "zh": "最后用两句话总结今天的报告：Loop-μP 解决了 Looped Transformer 如何稳定训练与跨循环迁移超参数的问题——只需在循环残差分支上乘以 1/N；SMELT 回答了在现代稀疏 MoE 上为何仍值得引入循环——即使三项核心预算同时对齐，循环依然带来可观的扩展与下游收益。两篇论文与交互式解读页面已附在下方，谢谢大家，欢迎提问交流。",
      "en": "I will close with two takeaways. Loop-μP explains how to train stably: multiply residual branches by 1/N to transfer hyperparameters across loop counts. SMELT explains why looping is worthwhile: scaling and downstream gains remain when all three budgets are controlled together. Both papers and interactive pages are linked here. Thank you, and I welcome your questions."
    },
    "cards": [
      {
        "tag": {
          "zh": "01 · Loop-μP",
          "en": "01 · Loop-μP"
        },
        "title": {
          "zh": "如何稳定训练",
          "en": "How to train stably"
        },
        "body": {
          "zh": "残差分支乘以 1/$N$，实现跨循环次数的零样本超参数迁移。",
          "en": "Multiply residual branches by 1/$N$ to transfer hyperparameters across loop counts."
        }
      },
      {
        "tag": {
          "zh": "02 · SMELT",
          "en": "02 · SMELT"
        },
        "title": {
          "zh": "为何值得循环",
          "en": "Why looping is worthwhile"
        },
        "body": {
          "zh": "同时对齐 FLOPs、总参数量与 KV cache 后，循环依然为稀疏 MoE 带来扩展净收益。",
          "en": "Control FLOPs, total parameters and KV cache; closely matched budgets reveal a net scaling gain from looping."
        }
      }
    ]
  }
];
