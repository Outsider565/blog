// Structure, weights and copy for Figure 17 (dyck-attention): the Dyck head's
// attention over the actual k = 4 prompt, visit 1 vs visit 2.
import data from '../../data/smelt/dyck-attention.json';

export type Language = 'zh' | 'en';
export type Visit = 1 | 2;
export type Target = 'avg' | '0' | '1' | '2';

export const tokens = data.tokens as readonly string[];
export const answers = new Set<number>(data.answers);
export const queryIndices = data.queryIndices as readonly number[];
export const targets = data.targets as readonly string[];
const rows = { 1: data.visit1 as number[][], 2: data.visit2 as number[][] } as const;
export const tokenCount = tokens.length;
/** First position whose token is a prediction target (teacher-forced continuation). */
export const firstTarget = (queryIndices[0] ?? 0) + 1;
export const targetValues: readonly Target[] = ['avg', '0', '1', '2'];

/** Attention over every key position for one visit and target (avg = mean of the three rows). */
export function attention(visit: Visit, target: Target): number[] {
  const source = rows[visit];
  if (target !== 'avg') return source[Number(target)] ?? [];
  return Array.from({ length: tokenCount }, (_, index) => source.reduce((sum, row) => sum + (row[index] ?? 0), 0) / source.length);
}

export interface Budget { bos: number; answers: number; other: number }
export function budget(weights: readonly number[]): Budget {
  const bos = weights[0] ?? 0;
  let answer = 0;
  for (const index of answers) answer += weights[index] ?? 0;
  const total = weights.reduce((sum, value) => sum + value, 0);
  return { bos, answers: answer, other: Math.max(0, total - bos - answer) };
}

/** Perceptual highlight strength in [0, 1]: square-root of the probability, saturating at 0.6. */
export const strength = (probability: number) => Math.min(1, Math.sqrt(Math.max(0, probability) / 0.6));
export const stripMax = 0.7;
/** Strip bar height in [0, 1]: square-root scale, like the token shading. */
export const stripHeight = (probability: number) => Math.sqrt(Math.min(1, Math.max(0, probability) / stripMax));
/** Position strip geometry: BOS gets a wider leading column, then a gap, then one unit per key position. */
export const stripBos = 6;
const stripGap = 2;
export const stripWidth = tokenCount - 1 + stripBos + stripGap;
export const stripX = (index: number) => index === 0 ? 0 : stripBos + stripGap + index - 1;
export const stripBarWidth = (index: number) => index === 0 ? stripBos : 1;
/** Key position under a strip coordinate (the gap counts as BOS). */
export const stripIndex = (unit: number) => unit < stripBos + stripGap ? 0 : Math.max(1, Math.min(tokenCount - 1, Math.floor(unit - stripBos - stripGap) + 1));

// ---------------------------------------------------------------- prompt layout
export type Line = { kind: 'instruction' | 'input' | 'output'; start: number; end: number };
export type Block = { index: number; kind: 'shot' | 'query'; start: number; end: number; lines: Line[] };

/** Split the prompt into the four demonstrations and the query, each with instruction / input / output lines. */
export function blocks(): Block[] {
  const starts = tokens.map((token, index) => token === 'Complete' ? index : -1).filter(index => index >= 0);
  return starts.map((start, blockIndex) => {
    const end = (starts[blockIndex + 1] ?? tokenCount) - 1;
    const lines: Line[] = [];
    let lineStart = start;
    for (let index = start; index <= end; index++) {
      const token = tokens[index] ?? '';
      if (token.includes('\n') || index === end) {
        const kind = lines.length === 0 ? 'instruction' : lines.length === 1 ? 'input' : 'output';
        lines.push({ kind, start: lineStart, end: index });
        lineStart = index + 1;
      }
    }
    return { index: blockIndex, kind: blockIndex === starts.length - 1 ? 'query' : 'shot', start, end, lines };
  });
}

/** Display text of a token: brackets without their leading space, newlines as a return glyph. */
export function display(token: string) {
  if (token === '<BOS>') return 'BOS';
  if (token.includes('\n')) return '↵';
  return token.trim() || '·';
}

export const copy = {
  zh: {
    visit: '执行',
    visits: { 1: '第一次执行', 2: '第二次执行' },
    play: '播放',
    target: '预测目标',
    avg: '三者平均',
    targetLabel: (index: number, token: string) => `${index + 1} · ${token}`,
    segments: { bos: 'BOS', answers: '示例答案', other: '其他 token' },
    shot: (index: number) => `示例 ${index + 1}`,
    query: '问题',
    instruction: '指令句',
    meta: (layer: number, head: number) => `1.6B · S = 85% · k = 4 · 第 ${layer} 层 · 头 ${head}（关键注意力头）`,
    strip: '313 个位置上的注意力分布',
    stripScale: '柱高 ∝ √概率',
    tipToken: (token: string, index: number) => `${token} · 位置 ${index}`,
    tipAnswer: (shot: number) => `示例 ${shot + 1} 的答案`,
    tipBos: '段首的 BOS（attention sink）',
    tipTarget: (index: number) => `预测目标 ${index + 1}`,
    tipInstruction: (count: number) => `重复的指令句（${count} 个 token 合计）`,
    tipVisit: (visit: Visit, value: string) => `${visit === 1 ? '第一次执行' : '第二次执行'} ${value}`,
    readout: (visit: Visit, target: string, bos: string, answer: string) => `<strong>${visit === 1 ? '第一次执行' : '第二次执行'}</strong>（${target}）：BOS 占 ${bos}，示例答案占 ${answer}。`,
    targetName: (target: Target) => target === 'avg' ? '三个预测目标平均' : `预测目标 ${Number(target) + 1}`,
    legendWeight: '注意力（颜色深浅 ∝ √概率）',
    legendAnswer: '示例答案',
    legendTarget: '待预测的括号',
    aria: 'Dyck 任务中关键注意力头在两次执行中的注意力分布',
    table: '查看数值',
    tableHead: { target: '预测目标', bos: 'BOS', answers: '示例答案' },
  },
  en: {
    visit: 'Visit',
    visits: { 1: 'Visit 1', 2: 'Visit 2' },
    play: 'Play',
    target: 'Target',
    avg: 'Mean of 3',
    targetLabel: (index: number, token: string) => `${index + 1} · ${token}`,
    segments: { bos: 'BOS', answers: 'Demonstration answers', other: 'Other tokens' },
    shot: (index: number) => `Shot ${index + 1}`,
    query: 'Query',
    instruction: 'instruction',
    meta: (layer: number, head: number) => `1.6B · S = 85% · k = 4 · layer ${layer}, head ${head} (the Dyck head)`,
    strip: 'Attention over all 313 positions',
    stripScale: 'bar height ∝ √probability',
    tipToken: (token: string, index: number) => `${token} · position ${index}`,
    tipAnswer: (shot: number) => `answer of shot ${shot + 1}`,
    tipBos: 'segment-start BOS (the attention sink)',
    tipTarget: (index: number) => `prediction target ${index + 1}`,
    tipInstruction: (count: number) => `repeated instruction (${count} tokens, summed)`,
    tipVisit: (visit: Visit, value: string) => `Visit ${visit}: ${value}`,
    readout: (visit: Visit, target: string, bos: string, answer: string) => `<strong>Visit ${visit}</strong> (${target}): BOS takes ${bos}, demonstration answers ${answer}.`,
    targetName: (target: Target) => target === 'avg' ? 'mean of the three targets' : `target ${Number(target) + 1}`,
    legendWeight: 'attention (shade ∝ √probability)',
    legendAnswer: 'demonstration answer',
    legendTarget: 'bracket to predict',
    aria: 'Attention of the Dyck head over the prompt on visit 1 and visit 2',
    table: 'Values',
    tableHead: { target: 'Target', bos: 'BOS', answers: 'Demonstration answers' },
  },
} as const;

export const two = (value: number) => value.toFixed(2);
export const three = (value: number) => value.toFixed(3);
