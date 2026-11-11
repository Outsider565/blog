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
    "lead": {
      "zh": "把同一组层重复执行多次：参数不变，执行深度增加。",
      "en": "Run the same layers several times: the same parameters, a deeper computation."
    },
    "notes": {
      "zh": "大家好，我是清华大学的王少文。今天介绍我们关于 Looped Transformer 预训练科学的两项工作：从残差缩放律 Loop-μP 到等预算混合专家扩展律 SMELT。第一部分回答怎样稳定扩展循环次数，第二部分回答预算匹配后循环是否仍有净收益。我们先从训练参数化出发，再看架构的扩展规律。",
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
      "zh": "同一组 $L$ 层共享权重，重复执行 $N$ 次。",
      "en": "Run the same $L$ layers $N$ times, with shared weights."
    },
    "figures": [
      {
        "kind": "loop-definition",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "先定义模型。上面是实际存储的网络：L 层 Transformer，每层有注意力和 MLP 两个残差分支。输出不直接读出，而是送回同一组层，一共执行 N 次。下面把计算展开：这里 L 和 N 都是 3，一共执行 9 层，参数却只有 3 层。循环在不增加参数的情况下加深了计算。",
      "en": "First, the model. The upper diagram is the stored network: L Transformer layers, each with an attention and an MLP residual branch. Instead of reading out, we feed the output back through the same layers, N passes in total. Unrolled below with L = 3 and N = 3, that is nine layer executions with only three layers of parameters. Looping deepens the computation without adding parameters."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "增加循环次数时的两个目标",
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
          "zh": "增加循环次数 $N$ 时，残差流和更新幅度保持稳定。",
          "en": "Keep residual states and update magnitudes stable as the loop count $N$ increases."
        }
      },
      {
        "tag": {
          "zh": "目标 2",
          "en": "Goal 2"
        },
        "title": {
          "zh": "超参数直接迁移",
          "en": "Hyperparameter transfer"
        },
        "body": {
          "zh": "在小 $N$ 上调好的超参数，直接用于大 $N$。",
          "en": "Reuse hyperparameters tuned at small $N$ directly at larger $N$."
        }
      }
    ],
    "notes": {
      "zh": "我们希望同时做到两件事。第一，增加循环次数时，残差流和训练更新不会越来越大。第二，在少量循环上调好的超参数，尤其是基础学习率，可以直接用到更多循环上。也就是说，模型既要稳定，又要保留有效的学习信号。",
      "en": "We want both stability and transfer. Increasing the loop count should keep residual states and training updates from growing. Hyperparameters tuned at a small loop count, especially the base learning rate, should carry over to a larger one. The model must stay stable while keeping an effective learning signal."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "已有工作如何处理宽度与深度？",
      "en": "How do prior recipes scale width and depth?"
    },
    "stage": {
      "zh": "已有参数化",
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
      "zh": "先回顾三种已有的参数化。表中每一行是一个超参数，等于基础项乘上宽度、深度、循环三个方向的因子。μP 处理宽度：隐藏层的初始化方差和学习率随宽度倍率的倒数缩放。Depth-μP 和 CompleteP 处理深度：Depth-μP 给残差分支和隐藏层学习率都乘深度倍率的负二分之一次方；CompleteP 给残差分支乘深度倍率的倒数，学习率不随深度变化。这里的深度指各有权重的独立层，所以循环这一列全是 1。",
      "en": "Let us review three existing parameterizations. Each row is one hyperparameter: a base term times a width, a depth and a loop factor. μP handles width: hidden initialization variances and learning rates scale inversely with the width multiplier. Depth-μP and CompleteP handle depth. Depth-μP multiplies residual branches and hidden learning rates by the inverse square root of the depth multiplier. CompleteP scales branches by the inverse depth multiplier and leaves the learning rate unchanged. Depth here counts layers with their own weights, so the loop column is all ones."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "独立层的结论，能直接搬到循环上吗？",
      "en": "Do the depth results carry over to loops?"
    },
    "stage": {
      "zh": "共享循环的问题",
      "en": "The shared-loop problem"
    },
    "layout": "stack",
    "minutes": 1,
    "lead": {
      "zh": "对独立层，Depth-μP 与 CompleteP 并不矛盾：它们是同一段可行区间的两端。",
      "en": "For independent layers, Depth-μP and CompleteP do not conflict: they are the two ends of one feasible interval."
    },
    "figures": [
      {
        "kind": "loop-problem",
        "view": "question",
        "width": 1120
      }
    ],
    "notes": {
      "zh": "把两种深度配方写成指数：分支系数按 L 的负 α_L 次方缩放，学习率按 L 的负 γ_L 次方缩放。Depth-μP 是 (1/2, 1/2)，CompleteP 是 (1, 0)。对独立层，从 1/2 到 1 的整段区间都能保持稳定，两种配方只是取了两端。现在把 L 个独立层换成同一组权重循环 N 次。如果循环和加深完全一样，循环方向也应该有一整段可选。我们接下来会看到，共享权重之后，这段区间只剩下一个点。",
      "en": "Write both depth recipes as exponents: the branch coefficient scales as L to the minus alpha_L, the learning rate as L to the minus gamma_L. Depth-μP is (1/2, 1/2) and CompleteP is (1, 0). For independent layers, the whole interval from 1/2 to 1 is stable; the two recipes are its ends. Now replace the L independent layers by one shared block looped N times. If looping behaved like depth, we would again have a whole interval to choose from. We will see that with shared weights, the interval shrinks to a single point."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "共享循环的问题",
      "en": "The shared-loop problem"
    },
    "layout": "split",
    "minutes": 1,
    "textWidth": 360,
    "title": {
      "zh": "共享权重让循环增量同向累加",
      "en": "Shared weights align loop increments"
    },
    "points": {
      "zh": [
        "独立层：初始化时增量近似不相关，合成幅度按 √$N$ 增长",
        "共享循环：增量正相关，合成幅度按 $N$ 增长",
        "因此 $N$^{−1/2} 压不住循环，至少需要 1/$N$"
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
      "zh": "先看原因。初始化时，独立层写入的增量方向近似不相关，相加像随机游走，总长度按平方根增长，所以负二分之一次方就够了。共享同一组权重后，每次循环写入的增量方向接近，总长度按 N 线性增长。动画先把增量个数从 1 加到 64：左边绕来绕去，右边一路向前。再依次换成 1/√N 和 1/N：1/√N 能压住左边，压不住右边；循环需要 1/N。换句话说，α_N 至少为 1，区间里小于 1 的部分在循环下都不成立。",
      "en": "Here is why. At initialization, independent layers write nearly uncorrelated increments; adding them is a random walk, so the total grows with the square root and an inverse-square-root factor suffices. With shared weights, the increments of different loops point in similar directions and the total grows linearly in N. The animation first raises the count from 1 to 64: the left path wanders, the right one marches on. Then it switches to 1/√N and 1/N: 1/√N holds the left side but not the right; loops need 1/N. In other words, alpha_N must be at least one: the rest of the interval fails for loops."
    }
  },
  {
    "part": "loop",
    "stage": {
      "zh": "共享循环的问题",
      "en": "The shared-loop problem"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "实测：初始化时，循环增量确实正相关",
      "en": "Measured: loop increments do align at initialization"
    },
    "points": {
      "zh": [
        "64 个独立块：增量两两近似正交",
        "同一块循环 64 次：增量两两正相关，平均余弦约 0.85",
        "共享权重改变了残差增量的累加方式"
      ],
      "en": [
        "64 independent blocks: nearly orthogonal increments",
        "One block looped 64 times: positively correlated increments, mean cosine ≈ 0.85",
        "Weight sharing changes how residual increments accumulate"
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
      "zh": "这个直觉可以直接测量。初始化时，64 个独立块的增量两两近似正交；同一个块执行 64 次，增量两两正相关，平均余弦约 0.85。所以共享循环的增量确实在同向累加。",
      "en": "We can measure this directly. At initialization, increments from 64 independent blocks are nearly orthogonal. When one block runs 64 times, its increments are positively correlated, with a mean cosine of about 0.85. Shared loops really do add up in a common direction."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "共享循环模型与两个缩放指数",
      "en": "The shared-loop model and its two exponents"
    },
    "stage": {
      "zh": "理论分析",
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
      "zh": "下面把直觉变成条件。r 是循环序号，t 是训练步。每次循环先用共享权重 W 算出预激活 h，再把激活后的分支乘上分支系数 c_N，加回残差流 x。最后一次循环之后，由 V 读出输出 f。请记住 h 在乘 c_N 之前，后面会用到。我们固定宽度和物理深度，只看循环方向的两个指数：α_N 决定分支系数，γ_N 决定权重更新的尺度，基础学习率另算。",
      "en": "Now we turn the intuition into conditions. Let r index loops and t training steps. Each loop computes the preactivation h with the shared W, multiplies the activated branch by the coefficient c_N and adds it to the residual state x. After the last loop, V reads out the output f. Keep in mind that h comes before c_N; we will need this. With width and physical depth fixed, we study two loop exponents: alpha_N sets the branch coefficient and gamma_N the scale of weight updates, separate from the base learning rate."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "三个条件：前向不发散、更新有界、输出更新不消失",
      "en": "Three conditions for stable, nontrivial learning"
    },
    "stage": {
      "zh": "理论分析",
      "en": "Analysis"
    },
    "layout": "stack",
    "minutes": 1.2,
    "lead": {
      "zh": "固定宽度与物理深度，要求以下条件在循环次数 $N$ 增大时都成立。",
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
      "zh": "我们要求三件事在 N 增大时都成立。第一，初始化时前向值不发散：每一轮的 x 和 h，以及输出 f，都有界。第二，训练一步之后，这些量的变化也有界。不过这只是上界，变化趋于零也算满足，只靠前两条，模型可能很稳定却学不动。所以第三条要求输出的一步更新不能消失；和第二条合起来，输出更新必须是常数量级。",
      "en": "We require three things as N grows. First, forward values at initialization stay bounded: every x and h, and the output f. Second, their changes after one training step stay bounded. That is only an upper bound, and a vanishing change also passes, so with these two alone the model could be stable yet learn nothing. The third condition therefore requires that the output update does not vanish; together with the second, it is of order one."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "把三个条件换算成指数约束",
      "en": "Turning the conditions into exponent constraints"
    },
    "stage": {
      "zh": "理论分析",
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
      "zh": "接下来算每个量随 N 的量级。初始化时，N 次写回同向累加，总量是 N 乘 c_N，也就是 N 的 1 减 α_N 次方，有界要求 α_N 至少为 1。首轮预激活 h 在乘 c_N 之前，它的更新只取决于更新尺度 s_N，有界要求 γ_N 非负。输出的更新汇集 N 次循环，每次都乘 c_N，量级是 N 的 1 减 α_N 减 γ_N 次方：条件二要求它有界，条件三要求它不消失，合起来两个指数之和恰好为 1。",
      "en": "Now compute how each quantity scales with N. At initialization the N writes add up in one direction, giving N times c_N, that is N to the one minus alpha_N; boundedness requires alpha_N of at least one. The first preactivation h comes before c_N, so its update depends only on the update scale s_N; boundedness requires nonnegative gamma_N. The output update collects N loops, each scaled by c_N, so it scales as N to the one minus alpha_N minus gamma_N. Condition two bounds it from above and condition three from below, so the two exponents must sum to exactly one."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "可行域只剩一个点：循环指数 (1, 0)",
      "en": "The loop feasible set is a single point: (1, 0)"
    },
    "stage": {
      "zh": "理论分析",
      "en": "Analysis"
    },
    "layout": "split",
    "textWidth": 330,
    "minutes": 1.25,
    "points": {
      "zh": [
        "**初始化**：$α$_{$N$} ≥ 1",
        "**首轮预激活**：$γ$_{$N$} ≥ 0",
        "**输出更新**：$α$_{$N$} + $γ$_{$N$} = 1"
      ],
      "en": [
        "**Initialization**: $α$_{$N$} ≥ 1",
        "**First preactivation**: $γ$_{$N$} ≥ 0",
        "**Output update**: $α$_{$N$} + $γ$_{$N$} = 1"
      ]
    },
    "callout": {
      "zh": "三条只交于 (1, 0)：残差分支乘 1/$N$，基础学习率不随 $N$ 调整。独立层则是一整段线段。",
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
      "zh": "把三条约束画到相图上。横轴是分支指数 α_N，纵轴是更新指数 γ_N。α_N 至少为 1 排除左边，γ_N 非负排除下面，两者之和等于 1 是这条斜线，三者只交于星号处的 (1, 0)。动画依次走过几个点：先是 (1/2, 0)，也就是照搬 Depth-μP 的负二分之一次方，初始化就发散；到 (2, 0)，内部更新有界，但输出更新按 1/N 消失；到 (2, −1)，输出更新保持常数，首轮预激活的更新却按 N 增长；最后停在 (1, 0)，右边三个量都与 N 无关。接着切到独立权重：可行集变回一整段线段，点从 Depth-μP 滑到 CompleteP，一路都可行。这就是循环和加深的根本区别：加深有选择余地，循环没有。",
      "en": "Draw the three constraints on the phase diagram. The horizontal axis is the branch exponent alpha_N, the vertical axis the update exponent gamma_N. Alpha_N of at least one removes the left side, nonnegative gamma_N removes the bottom, and the sum equal to one is this diagonal. They meet only at the star, (1, 0). The animation visits a few points. First (1/2, 0), Depth-μP's inverse square root copied over: the forward pass diverges. At (2, 0), internal updates stay bounded but the output update vanishes as 1/N. At (2, −1), the output update stays constant while the first preactivation update grows as N. It settles at (1, 0), where all three quantities on the right are independent of N. Then it switches to independent weights: the feasible set is a whole segment again, and the point slides from Depth-μP to CompleteP, feasible all the way. That is the key difference: depth leaves a choice, loops do not."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "Loop-μP 的完整配方",
      "en": "The complete Loop-μP recipe"
    },
    "stage": {
      "zh": "配方",
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
      "zh": "回到同一张表。Loop-μP 在宽度方向沿用 μP；在物理深度方向沿用 Depth-μP，即 α_L 取 1/2，这是按最大特征多样性的原则选出的端点。循环方向只改一处：注意力和 MLP 两个残差分支再乘 1/N，其余循环因子都是 1。动画先显示 Depth-μP，再切到 Loop-μP，黄色标出的只有这两行。基础学习率不随 N 改变，所以小 N 上调好的学习率可以直接用到大 N。",
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
      "zh": "残差范数：初始化时，1/$N$ 控制累积",
      "en": "Residual norms: 1/$N$ controls accumulation at initialization"
    },
    "points": {
      "zh": [
        "把 12 层 pre-norm 块循环 $N$ 次，对比串联 $m$_{$L$} 个独立 12 层块的非循环模型",
        "不缩放：循环模型的范数随 $N$ 线性增长，非循环只按 √$m$_{$L$}",
        "$N$^{−1/2} 压不住；$N$^{−3/2} 虽有界，却把循环模型推向恒等映射"
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
      "zh": "先看初始化。我们把一个 12 层 pre-norm 块循环 N 次，和串联 m_L 个独立 12 层块的非循环模型对比。不缩放时，循环模型的残差范数随 N 线性增长，非循环模型只按平方根增长。N 的负二分之一次方压不住循环；N 的负二分之三次方虽然有界，但分支贡献趋于零，模型接近恒等映射。只有 1/N 既有界又不退化。",
      "en": "First, initialization. We loop a 12-layer pre-norm block N times and compare it with untied models chaining m_L independent 12-layer blocks. Without scaling, the looped residual norm grows linearly in N, the untied one only with the square root. N to the minus one half cannot hold the loops back; N to the minus three halves bounds the norm but drives branch contributions to zero, so the model approaches the identity map. Only 1/N is both bounded and nondegenerate."
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
      "zh": "残差范数：训练后，不同 $N$ 的终点仍然接近",
      "en": "Residual norms: endpoints remain close after training"
    },
    "points": {
      "zh": [
        "记录每次循环后的残差流范数",
        "不同 $N$ 的轨迹各不相同，但同一深度的最终范数最多相差 1.32 倍",
        "与初始化处范数不随 $N$ 增长的预测一致"
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
      "zh": "训练结束后，我们记录每次循环之后的残差流范数。不同循环次数的中间轨迹并不相同，但固定物理深度时，最终范数最多相差 1.32 倍。这和初始化时的预测一致：增加循环次数不会让最终范数持续膨胀。",
      "en": "After training, we record the residual-stream norm after each loop. The intermediate trajectories differ across loop counts, but at a fixed physical depth the final norms differ by at most 1.32 times. This matches the prediction at initialization: more loops do not keep inflating the final norm."
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
      "zh": "前十步：每次更新的残差流变化保持稳定",
      "en": "The first ten steps: stable residual-stream updates"
    },
    "points": {
      "zh": [
        "所有 $N$ 使用同一基础学习率，逐步测量最终残差流的变化",
        "循环因子为 1/$N$ 时，$N$ 从 1 到 64 的第一步变化量在 0.08–0.19 之间",
        "前十步规律一致：衰减比 1/$N$ 慢则放大，快则消失"
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
      "zh": "第二组实验看训练更新。所有 N 使用同一个基础学习率，测量一个 AdamW 步之后最终残差流的变化。第一步时，1/N 让 N 从 1 到 64 的变化量保持在 0.08 到 0.19 之间。动画接着走过前十步，规律都一样：分支衰减比 1/N 慢，更新随 N 放大；比 1/N 快，更新随 N 消失。",
      "en": "The second experiment looks at training updates. All loop counts share one base learning rate, and we measure the change of the final residual stream after one AdamW step. At the first step, 1/N keeps the change between 0.08 and 0.19 for N from 1 to 64. The animation then runs through the first ten steps, and the pattern holds: branches that decay slower than 1/N amplify updates with N, faster decay makes them vanish."
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
      "zh": "训练 20,000 步后，循环增量仍然正相关",
      "en": "After 20,000 steps, loop increments remain aligned"
    },
    "points": {
      "zh": [
        "$N$ = 8，三种深度下，除末次循环外的增量仍两两正相关",
        "末次循环与其他循环弱相关或负相关",
        "非循环 $L$ = 48：主要只有相邻层增量相关"
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
      "zh": "回到前面的相关性。训练 20,000 步后，再看 N 等于 8 的模型：三种深度下，除了最后一次循环，其余循环的增量仍两两正相关；最后一次循环与其他循环弱相关，甚至负相关。非循环的 48 层模型主要只有相邻层相关。初始化时的结构在训练之后依然存在。",
      "en": "Back to the correlations. After 20,000 training steps we look at the eight-loop models again. At all three depths, increments of all but the last loop remain positively correlated; the last loop is weakly or even negatively correlated with the rest. The untied 48-layer model mainly correlates neighboring layers. The structure seen at initialization survives training."
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
      "zh": "一个学习率，适用于所有循环次数",
      "en": "One learning rate for every loop count"
    },
    "lead": {
      "zh": "FineWeb-Edu · Llama 风格 pre-norm · 每个模型 10B token · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}",
      "en": "FineWeb-Edu · Llama-style pre-norm · 10B tokens each · $L$ ∈ {12, 24, 48} · $N$ ∈ {1, 2, 4, 8}"
    },
    "points": {
      "zh": [
        "**Loop-μP**：每个 $N$ 的最优基础学习率都是 1.25×10⁻³，$L$ = 24、48 时也一样",
        "其他三种循环因子下，最优学习率都随 $N$ 移动",
        "$N$ > 1 时，Loop-μP 在每个 $N$ 上的 loss 都最低，且随 $N$ 增大下降最多"
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
      "zh": "最后看学习率迁移。我们在 FineWeb-Edu 上为每个模型训练 10B token，覆盖 12、24、48 层和 1、2、4、8 次循环。12 层时比较四种循环因子，更深的模型使用 Loop-μP 并配合深度方向的学习率缩放。所有测试的 Loop-μP 配置，最优基础学习率都是 1.25 乘十的负三次方。其他循环因子的最优学习率都会漂移；而且 N 大于 1 时，Loop-μP 的 loss 也最低。",
      "en": "Finally, learning-rate transfer. We train each model on 10B FineWeb-Edu tokens, covering 12, 24 and 48 layers with 1, 2, 4 and 8 loops. At 12 layers we compare four loop factors; deeper models use Loop-μP with depth-wise learning-rate scaling. Every tested Loop-μP configuration has the same best base learning rate, 1.25 times ten to the minus three. Under the other loop factors the optimum drifts, and for N greater than one Loop-μP also reaches the lowest loss."
    }
  },
  {
    "part": "loop",
    "title": {
      "zh": "Loop-μP：稳定扩展循环，直接迁移超参数",
      "en": "Loop-μP: stable loop scaling and hyperparameter transfer"
    },
    "stage": {
      "zh": "结论",
      "en": "Conclusion"
    },
    "layout": "cards",
    "minutes": 0.7,
    "cards": [
      {
        "tag": {
          "zh": "缩放规则",
          "en": "Scaling rule"
        },
        "title": {
          "zh": "分支乘以 1/$N$",
          "en": "Scale branches by 1/$N$"
        },
        "body": {
          "zh": "共享权重让残差增量同向累加；三个条件只留下 $α$_{$N$} = 1、$γ$_{$N$} = 0。",
          "en": "Shared weights make residual increments add up in one direction; the three conditions leave only $α$_{$N$} = 1, $γ$_{$N$} = 0."
        }
      },
      {
        "tag": {
          "zh": "实验结果",
          "en": "Empirical result"
        },
        "title": {
          "zh": "基础学习率直接迁移",
          "en": "Transfer the base learning rate"
        },
        "body": {
          "zh": "残差范数、前十步更新和增量相关性都与理论一致；在所有测试设置中，最优学习率跨 $N$ 不变，loss 也最低。",
          "en": "Residual norms, early updates and increment correlations all match the theory; in every tested setting the best learning rate stays fixed across $N$, with the lowest loss."
        }
      }
    ],
    "notes": {
      "zh": "总结 Loop-μP。共享权重改变了残差增量的累加方式，让独立层时的一整段可行区间缩成一个点。具体做法是残差分支乘 1/N，基础学习率不随 N 改变。初始化和训练后的诊断、前十步更新以及学习率扫描都支持这个结论。这回答了开头的两个目标：稳定地增加循环次数，并把小 N 上调好的超参数直接用到大 N。完整训练实验最大到 438M 参数、10B token。接下来是 SMELT：在预算匹配的条件下，循环到底能带来多少收益。",
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
      "zh": "预算匹配下的 Looped Transformer Scaling Law",
      "en": "Scaling Laws for Looped Transformers under Matched Budgets"
    },
    "notes": {
      "zh": "第二部分是 SMELT。我们把问题从训练稳定性推进到架构收益。先建立预算匹配的比较框架，再搜索循环配方，用多尺度实验衡量扩展规律，最后分析下游表现以及循环内部发生的变化。",
      "en": "The second study is SMELT. We move from training stability to architectural gains. I will first define budget-matched comparisons, then find a loop recipe, measure its scaling across model sizes, and examine downstream performance and the changes inside repeated layers."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与预算匹配",
      "en": "Question and budget matching"
    },
    "layout": "stack",
    "minutes": 0.75,
    "title": {
      "zh": "收益来自循环架构本身，还是因为多花了算力？",
      "en": "Do the gains come from looping itself, or from the extra compute?"
    },
    "lead": {
      "zh": "Looped Transformer 把一部分层重复执行，让模型在不增加参数的情况下获得更深的计算；这个想法在推理和数学等任务上已展现出不小的潜力。",
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
      "zh": "循环在不增加参数的情况下增加执行深度，但每多执行一遍都会增加计算。仅仅固定模型参数量，无法分辨收益来自架构还是额外算力。动画中的比较帮助我们明确这一点。我们的目标是在多个预算维度同时受控时，检验循环是否还有净收益。",
      "en": "Looping increases executed depth without adding parameters, but every extra visit costs compute. Fixing parameter count alone cannot distinguish an architectural gain from additional computation. The animation makes this distinction concrete. We want to test whether looping still provides a net benefit when several resource budgets are controlled together."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与预算匹配",
      "en": "Question and budget matching"
    },
    "layout": "cards",
    "minutes": 0.65,
    "title": {
      "zh": "要判断循环本身是否有用，比较必须同时对齐三项预算",
      "en": "To tell whether looping itself helps, a comparison must match three budgets at once"
    },
    "lead": {
      "zh": "多跑一遍就要多花一遍算力，而以往的比较大多只固定模型大小，把循环架构本身的优势和多花的算力混在了一起。",
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
          "zh": "决定训练和推理成本",
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
          "zh": "约束知识容量（非 embedding）",
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
          "zh": "限制可服务的上下文长度",
          "en": "Limits the context length that can be served"
        }
      }
    ],
    "notes": {
      "zh": "我们同时控制三个量：每 token FLOPs 对应计算成本，非 embedding 总参数量对应模型容量，KV cache 对应上下文服务的存储成本。只匹配其中一个量，另两个量仍可能解释性能差异。因此，我们要求每一对模型在三项预算上都尽量接近。",
      "en": "We control three quantities together. Per-token FLOPs represent computation, non-embedding total parameters represent capacity, and KV cache represents the memory needed to serve context. Matching just one leaves the other two as possible explanations for a performance difference. We therefore make all three budgets close within each model pair."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "问题与预算匹配",
      "en": "Question and budget matching"
    },
    "layout": "split",
    "minutes": 1,
    "textWidth": 330,
    "numbered": true,
    "title": {
      "zh": "预算匹配：借助 MoE 把参数量和计算量解耦",
      "en": "Budget matching: MoE decouples parameters from compute"
    },
    "points": {
      "zh": [
        "缩窄或变浅模型，抵消循环执行多出的计算",
        "增加专家数，补全总参数量",
        "调整注意力配置（GQA Ratio / Head Dim），匹配 KV cache"
      ],
      "en": [
        "Make the model narrower or shallower to offset the extra computation of the repeated passes",
        "Add experts to make up the total parameter count",
        "Adjust the attention configuration (GQA ratio and head dimension) to match the KV cache"
      ]
    },
    "foot": {
      "zh": "通过三步调整，同时近似匹配每 token FLOPs、非 embedding 总参和 KV cache。",
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
      "zh": "MoE 让总参数量与每 token 计算量可以分别调整。我们先缩窄或变浅模型，抵消重复执行多出的计算，再增加专家数补回参数，最后调整 GQA 比例或 head dimension 来匹配 KV cache。三步调整得到近似预算匹配的基线和循环模型，后续消融都沿用这套框架。",
      "en": "MoE lets us adjust total parameters separately from per-token computation. We first reduce width or depth to offset repeated execution, then add experts to restore parameter count, and finally adjust the GQA ratio or head dimension to match KV cache. These steps produce closely budget-matched baseline and looped models. We retain this framework throughout the ablations."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "最优循环配方",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "配方 ①：循环中间 50% 的层时，验证损失最低",
      "en": "Recipe ①: looping the middle 50% of layers gives the lowest loss"
    },
    "points": {
      "zh": [
        "按上述预算规则，在小规模上依次搜索循环范围、执行深宽比和循环次数",
        "循环层比例从 0%（不循环）调到 100%（全部循环），约 50% 时验证损失最低",
        "我们推测：首尾的层承担特殊功能，保留独立参数可能比参与共享更有利"
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
      "zh": "我们先搜索哪些层适合循环。在预算匹配的小规模实验中，把循环范围从零增加到全部层，中间约一半的层循环时验证损失最低。一个可能的解释是首尾层承担了较特殊的功能，保留独立参数更有利。这是基于消融结果的解释，接下来固定范围继续搜索深宽比。",
      "en": "We first search the loop span. In small-scale budget-matched experiments, varying the repeated fraction from zero to all layers gives the lowest validation loss when roughly the middle half is looped. One possible explanation is that the first and last layers benefit from independent parameters for specialized functions. We then fix the span and search the depth-to-width ratio."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "最优循环配方",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "配方 ②：Looped 模型的最优执行深宽比更高",
      "en": "Recipe ②: looped models prefer a larger effective depth-to-width ratio"
    },
    "points": {
      "zh": [
        "固定 50% 循环范围，比较不同的执行深宽比（执行深度与模型宽度之比）",
        "Looped 模型的最优执行深宽比高于非 Looped 模型",
        "我们推测与参数共享有关：额外执行深度不引入新参数，同一组共享参数同时获得来自“浅层”和“深层”的梯度信号，可能让更深的配置更容易优化"
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
      "zh": "执行深宽比使用实际执行的深度，而不是物理层数。固定中间一半循环后，我们发现循环模型的最优执行深宽比高于基线。共享参数会同时接收不同执行位置的梯度信号，可能有助于优化更深的计算。这一解释提示了后续机制研究的方向，但当前选择直接由验证损失决定。",
      "en": "The effective depth-to-width ratio uses executed depth rather than physical layer count. With the middle half looped, the looped model prefers a larger ratio than the baseline. Shared parameters receive gradients from different execution positions, which may help optimize deeper computation. That interpretation motivates further analysis; our present choice is determined directly by validation loss."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "最优循环配方",
      "en": "Finding the loop recipe"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "配方 ③：循环两次收益最大",
      "en": "Recipe ③: looping twice gives the largest gain"
    },
    "points": {
      "zh": [
        "在一到四次之间扫描循环次数，两次最优",
        "FLOPs 匹配下，每多循环一次模型就要再缩窄；三次、四次相对两次的退步归因于模型变窄，但两者仍优于基线"
      ],
      "en": [
        "Sweep the loop count from one to four: two is best",
        "With FLOPs matched, each additional loop makes the model narrower still; we attribute the regression of three and four loops to this narrowing, though both still beat the Baseline"
      ]
    },
    "callout": {
      "zh": "**SMELT**：在稀疏 MoE 模型中，将中间一半的层循环执行两次，同时采用更大的执行深宽比",
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
      "zh": "最后扫描一到四次循环，两次的收益最大。预算固定时，更多循环要求模型进一步变窄，三次和四次虽然仍优于基线，却不及两次。由此我们得到 SMELT 配方：稀疏 MoE、中间一半的层执行两次，以及更大的执行深宽比。接下来检验这套小规模得到的配方能否跨规模成立。",
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
      "zh": "16 组匹配配置中，SMELT 的验证损失全部低于基线",
      "en": "SMELT has lower validation loss in all 16 matched configurations"
    },
    "lead": {
      "zh": "4 个规模（100M / 200M / 600M / 1.6B，按基线每 token 激活的非 embedding 参数量命名）× 4 档稀疏度，最大总参 54B（不含 embedding）；每个组合训练一对匹配的基线与 SMELT。",
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
      "zh": "我们比较四个规模和四档稀疏度，共 16 组匹配配置。规模名称按基线每 token 激活的非 embedding 参数量定义，从 100M 到 1.6B，最大非 embedding 总参数量达到 54B。所有 16 组中，SMELT 的验证损失都低于对应基线。下面用拟合进一步量化这一优势随计算和数据扩展的趋势。",
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
      "zh": "分别拟合 Scaling Law：SMELT 的 loss 下降得更快",
      "en": "Separate scaling-law fits: SMELT’s loss falls faster"
    },
    "points": {
      "zh": [
        "$E$ 为不可约损失；容量项由每 token FLOPs $F$ 和稀疏度 $S$ 控制；数据项由训练 token 数 $D$ 控制",
        "基线和 SMELT 各自拥有独立的六个系数（$E$, $A$, $K$, $a$, $b$, $c$） [5]",
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
      "zh": "我们为两种架构分别拟合 Chinchilla 式关系。E 表示不可约损失，容量项由每 token FLOPs 和稀疏度控制，数据项由训练 token 数控制，两种架构各自拟合六个系数。SMELT 的容量指数为 0.3892，基线为 0.3703；数据指数为 0.7011，基线为 0.6594。两个指数都更大，对应拟合范围内更快的 loss 下降。",
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
      "zh": "计算最优前沿：达到相同 loss，SMELT 所需训练算力更少",
      "en": "On the compute-optimal frontier, SMELT needs less training compute"
    },
    "stats": [
      {
        "value": "6.8%–10.0%",
        "label": {
          "zh": "10²⁰ FLOPs 时节省",
          "en": "saved at 10²⁰ FLOPs"
        },
        "tone": "gain"
      },
      {
        "value": "14.7%–18.0%",
        "label": {
          "zh": "10²¹ FLOPs 时节省",
          "en": "saved at 10²¹ FLOPs"
        },
        "tone": "gain"
      }
    ],
    "points": {
      "zh": [
        "范围：10²⁰ FLOPs 到拟合范围上限（约 2.2×10²¹ FLOPs）",
        "数值随稀疏度 S ≈ 85%–97% 不同；S = 0 未纳入拟合",
        "按拟合的点估计，节省幅度随算力预算增大而扩大"
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
      "zh": "在计算最优前沿上，我们比较达到相同验证损失所需的训练算力。十的二十次方 FLOPs 附近，节省约 6.8% 到 10.0%；十的二十一次方附近，节省约 14.7% 到 18.0%。数值随稀疏度变化，是拟合的点估计。我们的比较范围上限约为 2.2 乘十的二十一次方 FLOPs，零稀疏度不参与这个拟合。",
      "en": "On the compute-optimal frontier, we compare the training compute needed for the same validation loss. Near ten to the twenty FLOPs, savings are about 6.8 to 10.0 percent; near ten to the twenty-one, about 14.7 to 18.0 percent. These are fitted point estimates varying with sparsity. The comparison extends to roughly 2.2 times ten to the twenty-one FLOPs, and the zero-sparsity setting is excluded from this fit."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.8,
    "textWidth": 330,
    "title": {
      "zh": "DCLM：绝大多数匹配对上 SMELT 更好",
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
      "zh": "16 个配置 × 6 个训练时长 = 96 组匹配对。",
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
      "zh": "每个配置再取六个训练时长，我们得到 96 组匹配对。DCLM Completion 上，SMELT 在全部 96 对中胜出；DCLM Core 上胜出 83 对。验证损失的优势因此也体现在大多数下游比较中。我们随后单独看 MMLU，因为低于或接近随机水平的区域需要区别理解。",
      "en": "Taking six training horizons per configuration gives 96 matched pairs. SMELT wins all 96 comparisons on DCLM Completion and 83 on DCLM Core. The validation-loss advantage therefore carries over to most downstream comparisons. I will examine MMLU separately, since scores near chance need a different interpretation."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "MMLU：高于随机水平的 30 对中胜出 29 对",
      "en": "MMLU: 29 wins in 30 pairs above chance"
    },
    "points": {
      "zh": [
        "筛选基线准确率明显高于 25% 随机水平的匹配对",
        "30 组中，SMELT 在 29 组取得更高准确率",
        "可切换查看全部 96 组，区分低分区与有效比较区"
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
      "zh": "MMLU 的随机水平是 25%。我们先看基线已经明显超过这一水平的 30 组匹配对，SMELT 在其中 29 组取得更高准确率。切换到全部 96 对，可以看到其余配置仍接近随机水平。我们把有效学习区间单独展示，以便更清楚地比较架构差异。",
      "en": "Chance performance on MMLU is 25 percent. We first examine the 30 matched pairs whose baseline is clearly above this level; SMELT has higher accuracy in 29. Switching to all 96 pairs also shows the configurations near chance. Separating the above-chance region makes the architectural comparison easier to interpret."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 360,
    "title": {
      "zh": "同一验证损失下，仍有下游收益",
      "en": "Downstream gains remain at the same validation loss"
    },
    "points": {
      "zh": [
        "用基线数据拟合“验证损失 → 下游分数”曲线",
        "三项指标、每个规模，SMELT 平均成绩均高于基线曲线预测",
        "DCLM 两项指标的偏差随规模扩大；同规模基线对合并曲线的偏差也会增大"
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
      "zh": "下游增益是否完全由更低的验证损失解释？我们先用基线拟合验证损失到下游分数的关系，再将 SMELT 放到同一关系中。三项指标、每个规模的平均成绩都高于基线曲线预测。DCLM 上相对合并曲线的偏差随规模扩大，但同规模基线的偏差也会扩大，因此这里比较的是相对这条拟合曲线的残差。",
      "en": "Are downstream gains fully explained by lower validation loss? We fit a validation-loss-to-score curve on baseline runs and compare SMELT against it. Across all three metrics and every scale, SMELT averages above the baseline prediction. DCLM residuals against the pooled curve grow with scale, but same-scale baseline residuals also grow. The comparison here is specifically against that fitted curve."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.65,
    "textWidth": 340,
    "title": {
      "zh": "领域：结构化程度越高，循环收益越大",
      "en": "Domains: larger gains on more structured text"
    },
    "points": {
      "zh": [
        "Code 收益最高，Finance 与 Math/STEM 次之",
        "Knowledge 与 Web 的收益较低",
        "在预算匹配的模型间，比较各领域验证损失的变化"
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
      "zh": "把验证集按领域拆开，收益分布并不均匀。Code 最高，Finance 和 Math/STEM 次之，Knowledge 与 Web 较低。我们观察到，结构化程度更高的领域往往获得更大收益。下一页进一步按文本长度拆分，并加入改变专家数和参数量的对照。",
      "en": "Breaking the validation set down by domain reveals uneven gains. Code gains most, followed by Finance and Math/STEM; Knowledge and Web gain less. More structured domains tend to benefit more from looping. We next split by text length and compare controls that change expert count or total parameters."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.8,
    "textWidth": 340,
    "title": {
      "zh": "长度：长样本的归一化收益约为短样本的 1.5 倍",
      "en": "Length: long samples gain about 1.5× as much"
    },
    "points": {
      "zh": [
        "以 256 token 为界，每个匹配对内归一化比较",
        "长样本收益约为短样本的 1.5 倍",
        "对照中，单独增加专家数或总参数量未产生同样的长度差异"
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
      "zh": "这里在每个匹配对内先归一化，再按 256 token 分成长短两组。长样本的收益约为短样本的 1.5 倍。单独增加专家数或参数量的对照没有表现出同样的长度差异。这支持我们将这一长度相关收益与循环计算联系起来，也引出了对上下文学习的检查。",
      "en": "We normalize gains within each matched pair and split samples at 256 tokens. Longer samples gain about 1.5 times as much as shorter ones. Controls that only add experts or total parameters do not show the same length dependence. This supports associating the length-related gain with repeated computation and motivates examining in-context learning."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "下游任务收益",
      "en": "Downstream gains"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 380,
    "title": {
      "zh": "给出上下文示例后，优势进一步扩大",
      "en": "In-context examples widen the advantage"
    },
    "points": {
      "zh": [
        "16 个任务平均：差距从 0 个示例时的 0.9 个百分点升至 1 个示例时的 1.9 个百分点，并在 8 个示例以内大致保持",
        "Dyck Languages（高度依赖示例）：4 个示例以内基本持平，差距从 8 个示例起逐渐拉开，32 个示例时为 29.8% 对 26.4%"
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
      "zh": "给出上下文示例后，16 个任务的平均优势从零样本的 0.9 个百分点增到单样本的 1.9 个百分点，并大致保持到八个示例。Dyck 的差距从八个示例开始逐渐扩大，32 个示例时是 29.8% 对 26.4%。我们接下来查看循环内部的路由和注意力变化，寻找与这些结果相关的机制线索。",
      "en": "Once examples are supplied, the average advantage across 16 tasks grows from 0.9 percentage points at zero shot to 1.9 at one shot and roughly persists through eight examples. In Dyck, the gap opens from eight examples onward, reaching 29.8 versus 26.4 percent at 32 examples. We now inspect routing and attention inside the loop for clues related to these results."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "专家路由：16 组配置的复用均高于随机水平",
      "en": "Expert reuse exceeds chance in all 16 configurations"
    },
    "points": {
      "zh": [
        "第二次执行会复用第一次的部分专家，同时选择一些新专家",
        "两次选中的专家集合重叠度远高于随机水平"
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
      "zh": "我们先比较两次执行选中的专家集合。全部 16 组配置中，第二次对第一次专家集合的复用都远高于随机路由的预期。重复执行会继续使用部分已有专家，同时引入新的专家。下一页放大到单 token 的示意和实测分布，具体看两次选择如何重叠。",
      "en": "We first compare the expert sets selected on the two visits. In all 16 configurations, reuse on the second visit is far above the random-routing expectation. Repeated execution retains some experts and introduces others. I will zoom in on a single-token illustration and the measured overlap distribution to make that pattern concrete."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.9,
    "textWidth": 280,
    "title": {
      "zh": "单 token 路由：复用旧专家，同时引入新专家",
      "en": "One token: reuse some experts and select new ones"
    },
    "points": {
      "zh": [
        "动画示意单 token 两次访问同一个专家池",
        "实测重叠分布与随机路由分布对比：复用显著更高",
        "切换规模与稀疏度，查看复用程度如何变化"
      ],
      "en": [
        "The animation illustrates two visits to one expert pool",
        "The measured overlap distribution shows more reuse than random routing",
        "Vary scale and sparsity to compare reuse patterns"
      ]
    },
    "figures": [
      {
        "kind": "smelt",
        "id": "expert-reuse",
        "width": 940,
        "panel": "detail"
      }
    ],
    "notes": {
      "zh": "左侧动画示意一个 token 两次访问同一个专家池。部分专家两次都被选中，也有只在某次执行中出现的专家。右侧是实测重叠分布与随机分布的比较。切换稀疏度和规模可以看到不同配置的差别。动画用于说明集合关系，分布图则给出实际测量的统计证据。",
      "en": "The animation illustrates one token visiting the same expert pool twice. Some experts appear on both visits, while others are selected only once. Beside it, the measured overlap distribution is compared with random routing. Changing sparsity and scale shows how the pattern varies. The animation illustrates set overlap; the distribution provides the measured statistical evidence."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 360,
    "title": {
      "zh": "残差流：第二次更新更大、方向部分对齐",
      "en": "Residual stream: larger, partly aligned second updates"
    },
    "points": {
      "zh": [
        "第二次执行的残差流更新幅度始终大于第一次",
        "1.6B、S ≈ 85%：同一物理层两次更新的余弦相似度平均约 0.56，不同层之间平均仅约 0.16",
        "这一结果支持第二次执行放大首次信号的解释"
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
      "zh": "再看每次执行写入残差流的内容。第二次更新幅度始终更大。在 1.6B、约 85% 稀疏度的模型中，同一物理层两次更新的平均余弦约为 0.56，跨层平均只有约 0.16。这个幅度与方向的组合，支持第二次执行进一步放大首次信号的解释。",
      "en": "We next inspect what each visit writes to the residual stream. The second visit consistently has a larger update. At 1.6B and about 85 percent sparsity, updates from the same physical layer have a mean cosine of about 0.56 across visits, compared with about 0.16 across layers. The combination of magnitude and direction supports an interpretation of the second visit amplifying the first signal."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.65,
    "textWidth": 360,
    "title": {
      "zh": "注意力：检索位置接近，读取内容发生变化",
      "en": "Attention: similar positions, different retrieved content"
    },
    "points": {
      "zh": [
        "两次执行中，Q 和 K 各自的余弦相似度高达 0.89–0.93：模型关注的位置大体相同",
        "变化主要发生在 V 及其后续输出"
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
      "zh": "注意力分解提供了更细的视角。两次执行的 Q 和 K 余弦都很高，约为 0.89 到 0.93，说明检索位置总体接近。更大的变化发生在 V 和最终输出，因此第二次执行主要改变从相关位置读取和写回的内容。我们再通过 Dyck 的具体注意力头观察这一过程。",
      "en": "The attention decomposition gives a finer view. Queries and keys have high between-visit cosines, about 0.89 to 0.93, indicating broadly similar retrieval positions. Larger changes occur in values and the resulting outputs, so the second visit changes the content retrieved and written back. We next inspect a concrete attention head on Dyck."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 340,
    "title": {
      "zh": "Dyck：关键注意力头从 BOS 转向示例答案",
      "en": "Dyck: a key head shifts from BOS to example answers"
    },
    "points": {
      "zh": [
        "Dyck language 是括号匹配任务：模型需要从给定示例中找到相关答案的位置，才能作出正确预测",
        "关键注意力头在第一次执行时集中关注 BOS；相同的头在第二次执行时关注答案位置"
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
      "zh": "Dyck 要求根据示例完成括号匹配。这个关键注意力头第一次执行时主要集中在 BOS，第二次执行时转向示例答案的位置。相同的物理层因重复执行而呈现出不同的检索行为。这个案例也让我们进一步考察整个模型中的 attention sink。",
      "en": "Dyck requires bracket completion using the provided examples. This key attention head concentrates on BOS during the first visit and shifts toward the example-answer positions during the second. Repeated execution gives the same physical layer a different retrieval pattern. This case also motivates examining attention sinks across the model."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "循环内部机制",
      "en": "Inside the loop"
    },
    "layout": "split",
    "minutes": 0.75,
    "textWidth": 400,
    "title": {
      "zh": "Attention sink：第二次执行后反而减弱",
      "en": "Attention sink: it weakens on the second visit"
    },
    "points": {
      "zh": [
        "基线模型中，attention sink 随深度增加而增强",
        "Loop 架构呈相反趋势：第二次执行后，attention sink 减弱",
        "Dyck 中注意力转向示例答案；这可能与上下文学习优势有关"
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
      "zh": "基线中 attention sink 随深度增强，而循环模型的第二次执行减弱了这一现象。在刚才的 Dyck 案例中，减少的 BOS 注意力转向了示例答案。我们推测这种变化可能与上下文学习优势有关，当前结果提供的是路由和注意力层面的相关线索，因果关系还需要进一步实验。",
      "en": "In the baseline, attention sinks strengthen with depth, while the second looped visit weakens them. In the Dyck case, attention moves from BOS toward example answers. We conjecture that this change may relate to the in-context learning advantage. These measurements provide routing and attention clues; establishing the causal relationship requires further experiments."
    }
  },
  {
    "part": "smelt",
    "stage": {
      "zh": "结论与展望",
      "en": "Conclusions and outlook"
    },
    "layout": "columns",
    "minutes": 0.9,
    "title": {
      "zh": "预算匹配下，循环仍能为 MoE Transformer 带来净收益",
      "en": "Under matched budgets, looping still yields a net gain for MoE Transformers"
    },
    "columns": [
      {
        "title": {
          "zh": "结论",
          "en": "Conclusion"
        },
        "tone": "loop",
        "items": {
          "zh": [
            "Scaling Law 与下游评测给出一致的结论：对 MoE Transformer，循环架构仍能带来净收益",
            "16 组匹配配置的验证损失全部更低；计算最优前沿上，达到相同损失少用 6.8%–18.0% 训练算力",
            "机制分析为这一收益提供了描述性的线索"
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
            "消融实验规模有限",
            "未涉及实际运行时间层面的系统效率优化",
            "希望预算匹配方案和 SMELT 配方为 Loop 社区提供可参考的实验设定和比较基准，在公平条件下探索更多架构变体"
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
      "zh": "SMELT 的主要结论是：同时控制计算、参数量和 KV cache 后，循环仍带来稳定的验证损失与下游收益。机制分析展示了复用专家、放大残差信号和改变注意力内容的现象。当前消融规模有限，实际运行时间的系统效率也需要继续优化。我们希望这套预算匹配框架和配方能成为社区比较更多架构变体的共同起点。",
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
      "zh": "最后用两句话收束今天的报告。Loop-μP 回答如何稳定训练：残差分支乘以 1/N，让超参数跨循环次数迁移。SMELT 回答为何值得训练：在三项预算同时受控的比较中，循环架构仍获得扩展与下游收益。两篇论文和交互页面都列在这里。谢谢大家，欢迎交流。",
      "en": "I will close with two takeaways. Loop-μP explains how to train stably: multiply residual branches by 1/N to transfer hyperparameters across loop counts. SMELT explains why looping is worthwhile: scaling and downstream gains remain when all three budgets are controlled together. Both papers and interactive pages are linked here. Thank you, and I welcome your questions."
    },
    "cards": [
      {
        "tag": {
          "zh": "01 · Loop-μP",
          "en": "01 · Loop-μP"
        },
        "title": {
          "zh": "如何稳定训",
          "en": "How to train stably"
        },
        "body": {
          "zh": "残差分支乘以 1/$N$，实现循环次数间的超参数迁移。",
          "en": "Multiply residual branches by 1/$N$ to transfer hyperparameters across loop counts."
        }
      },
      {
        "tag": {
          "zh": "02 · SMELT",
          "en": "02 · SMELT"
        },
        "title": {
          "zh": "为何值得训",
          "en": "Why looping is worthwhile"
        },
        "body": {
          "zh": "严格控制 FLOPs、总参数量与 KV cache，在近似匹配预算下验证循环架构的扩展净收益。",
          "en": "Control FLOPs, total parameters and KV cache; closely matched budgets reveal a net scaling gain from looping."
        }
      }
    ]
  }
];
