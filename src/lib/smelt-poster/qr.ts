// Minimal ISO/IEC 18004 QR Code SVG path generator (Byte mode, ECC Level M, Versions 1–10).
// Generates a single crisp <path> string for static build-time rendering.

interface VersionSpec {
  size: number;
  ecPerBlock: number;
  groups: readonly [blocks: number, dataCodewords: number][];
  alignment: readonly number[];
}

// Error Correction Level M specifications for Versions 1–10.
const VERSIONS: readonly VersionSpec[] = [
  { size: 21, ecPerBlock: 10, groups: [[1, 16]], alignment: [] },
  { size: 25, ecPerBlock: 16, groups: [[1, 28]], alignment: [6, 18] },
  { size: 29, ecPerBlock: 26, groups: [[1, 44]], alignment: [6, 22] },
  { size: 33, ecPerBlock: 18, groups: [[2, 32]], alignment: [6, 26] },
  { size: 37, ecPerBlock: 24, groups: [[2, 43]], alignment: [6, 30] },
  { size: 41, ecPerBlock: 16, groups: [[4, 27]], alignment: [6, 34] },
  { size: 45, ecPerBlock: 18, groups: [[4, 31]], alignment: [6, 22, 38] },
  { size: 49, ecPerBlock: 22, groups: [[2, 38], [2, 39]], alignment: [6, 24, 42] },
  { size: 53, ecPerBlock: 22, groups: [[3, 36], [2, 37]], alignment: [6, 26, 46] },
  { size: 57, ecPerBlock: 26, groups: [[4, 43], [1, 44]], alignment: [6, 28, 50] },
];

// GF(256) with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d).
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val;
    GF_LOG[val] = i;
    val <<= 1;
    if (val & 0x100) val ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255] ?? 0;
}

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : (GF_EXP[(GF_LOG[a] ?? 0) + (GF_LOG[b] ?? 0)] ?? 0);
}

function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i] ?? 0;
    for (let j = 0; j < poly.length; j++) {
      const coeff = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ coeff;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(coeff, factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenerator(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = (data[i] ?? 0) ^ (res[0] ?? 0);
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      res[j] = (res[j] ?? 0) ^ gfMul(gen[j + 1] ?? 0, factor);
    }
  }
  return res;
}

function encodeData(bytes: Uint8Array, totalDataCodewords: number, version: number): Uint8Array {
  const bits: number[] = [];
  const pushBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  // Byte mode indicator (0100) + character count (8 bits for V1–V9, 16 bits for V10+).
  pushBits(0b0100, 4);
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  for (const byte of bytes) pushBits(byte, 8);

  const capacityBits = totalDataCodewords * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  pushBits(0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | (bits[i + b] ?? 0);
    out[i >> 3] = byte;
  }
  const padBytes = [0xec, 0x11] as const;
  for (let i = bits.length >> 3, p = 0; i < totalDataCodewords; i++, p ^= 1) {
    out[i] = padBytes[p] ?? 0xec;
  }
  return out;
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec, version: number): Uint8Array {
  const totalData = spec.groups.reduce((sum, [count, cw]) => sum + count * cw, 0);
  const raw = encodeData(bytes, totalData, version);

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const [count, cw] of spec.groups) {
    for (let i = 0; i < count; i++) {
      const block = raw.subarray(offset, offset + cw);
      offset += cw;
      dataBlocks.push(block);
      ecBlocks.push(rsRemainder(block, spec.ecPerBlock));
    }
  }

  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  const result: number[] = [];
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i] ?? 0);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of ecBlocks) result.push(block[i] ?? 0);
  }
  return new Uint8Array(result);
}

function formatBits(maskPattern: number): number {
  // ECC Level M = 00, maskPattern = 0..7 -> 5-bit data.
  const data = (0b00 << 3) | maskPattern;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function versionBits(version: number): number {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >>> i) & 1) rem ^= 0b1111100100101 << (i - 12);
  }
  return (version << 12) | rem;
}

function createMatrix(spec: VersionSpec, version: number) {
  const n = spec.size;
  const modules = new Uint8Array(n * n);
  const isFunc = new Uint8Array(n * n);

  const set = (r: number, c: number, dark: boolean, fn = true) => {
    modules[r * n + c] = dark ? 1 : 0;
    if (fn) isFunc[r * n + c] = 1;
  };

  const drawFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inSquare = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark = inSquare && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        set(r, c, dark);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  for (let i = 8; i < n - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  for (const r0 of spec.alignment) {
    for (const c0 of spec.alignment) {
      if (isFunc[r0 * n + c0]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          set(r0 + dr, c0 + dc, dist === 2 || dist === 0);
        }
      }
    }
  }

  // Dark module and reserved format/version areas.
  set(n - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunc[8 * n + i] = 1;
      isFunc[i * n + 8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8 * n + (n - 1 - i)] = 1;
    isFunc[(n - 1 - i) * n + 8] = 1;
  }

  if (version >= 7) {
    const vbits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = Boolean((vbits >>> i) & 1);
      const a = Math.floor(i / 3);
      const b = n - 11 + (i % 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  return { n, modules, isFunc };
}

function drawFormat(modules: Uint8Array, n: number, maskPattern: number) {
  const bits = formatBits(maskPattern);
  for (let i = 0; i < 15; i++) {
    const dark = (bits >>> i) & 1;
    if (i < 6) modules[i * n + 8] = dark;
    else if (i < 8) modules[(i + 1) * n + 8] = dark;
    else modules[(n - 15 + i) * n + 8] = dark;

    if (i < 8) modules[8 * n + (n - 1 - i)] = dark;
    else if (i < 9) modules[8 * n + 7] = dark;
    else modules[8 * n + (14 - i)] = dark;
  }
}

const MASK_FNS: readonly ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  r => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penaltyScore(modules: Uint8Array, n: number): number {
  let score = 0;

  // N1: 5+ consecutive same-color modules in row or column.
  for (let r = 0; r < n; r++) {
    let runRow = 1;
    let runCol = 1;
    for (let i = 1; i < n; i++) {
      if (modules[r * n + i] === modules[r * n + i - 1]) runRow++;
      else { if (runRow >= 5) score += 3 + (runRow - 5); runRow = 1; }
      if (modules[i * n + r] === modules[(i - 1) * n + r]) runCol++;
      else { if (runCol >= 5) score += 3 + (runCol - 5); runCol = 1; }
    }
    if (runRow >= 5) score += 3 + (runRow - 5);
    if (runCol >= 5) score += 3 + (runCol - 5);
  }

  // N2: 2×2 same-color blocks.
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r * n + c];
      if (v === modules[r * n + c + 1] && v === modules[(r + 1) * n + c] && v === modules[(r + 1) * n + c + 1]) {
        score += 3;
      }
    }
  }

  // N3: finder-like 1:1:3:1:1 patterns with 4 light modules on either side.
  const matchFinder = (get: (i: number) => number, len: number): number => {
    let hits = 0;
    for (let i = 0; i <= len - 11; i++) {
      const p1 = get(i) === 1 && get(i + 1) === 0 && get(i + 2) === 1 && get(i + 3) === 1 && get(i + 4) === 1 && get(i + 5) === 0 && get(i + 6) === 1 && get(i + 7) === 0 && get(i + 8) === 0 && get(i + 9) === 0 && get(i + 10) === 0;
      const p2 = get(i) === 0 && get(i + 1) === 0 && get(i + 2) === 0 && get(i + 3) === 0 && get(i + 4) === 1 && get(i + 5) === 0 && get(i + 6) === 1 && get(i + 7) === 1 && get(i + 8) === 1 && get(i + 9) === 0 && get(i + 10) === 1;
      if (p1 || p2) hits += 40;
    }
    return hits;
  };
  for (let r = 0; r < n; r++) {
    score += matchFinder(c => modules[r * n + c] ?? 0, n);
    score += matchFinder(c => modules[c * n + r] ?? 0, n);
  }

  // N4: dark module ratio deviation from 50%.
  let dark = 0;
  for (let i = 0; i < modules.length; i++) dark += modules[i] ?? 0;
  const pct = (dark * 100) / modules.length;
  const k = Math.min(Math.abs(Math.floor(pct / 5) * 5 - 50), Math.abs(Math.ceil(pct / 5) * 5 - 50)) / 5;
  score += k * 10;

  return score;
}

export interface QrSvgData {
  viewSize: number;
  path: string;
}

export function qrSvgPath(text: string, margin = 2): QrSvgData {
  const bytes = new TextEncoder().encode(text);
  const versionIndex = VERSIONS.findIndex((spec, idx) => {
    const version = idx + 1;
    const headerBits = 4 + (version >= 10 ? 16 : 8);
    const totalData = spec.groups.reduce((sum, [count, cw]) => sum + count * cw, 0);
    return headerBits + bytes.length * 8 <= totalData * 8;
  });
  const spec = VERSIONS[versionIndex];
  if (!spec) {
    throw new Error(`QR payload too long (${bytes.length} bytes)`);
  }

  const version = versionIndex + 1;
  const codewords = buildCodewords(bytes, spec, version);
  const { n, modules, isFunc } = createMatrix(spec, version);

  // Place data bits in zig-zag 2-column strips, skipping column 6.
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? n - 1 - vert : vert;
        if (isFunc[r * n + c]) continue;
        const bit = bitIndex < totalBits ? ((codewords[bitIndex >> 3] ?? 0) >>> (7 - (bitIndex & 7))) & 1 : 0;
        modules[r * n + c] = bit;
        bitIndex++;
      }
    }
  }

  // Evaluate all 8 mask patterns and pick the lowest penalty.
  let bestScore = Infinity;
  let bestModules = new Uint8Array(n * n);
  for (let mask = 0; mask < 8; mask++) {
    const trial = new Uint8Array(modules);
    const fn = MASK_FNS[mask]!;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!isFunc[r * n + c] && fn(r, c)) trial[r * n + c] = (trial[r * n + c] ?? 0) ^ 1;
      }
    }
    drawFormat(trial, n, mask);
    const score = penaltyScore(trial, n);
    if (score < bestScore) {
      bestScore = score;
      bestModules = trial;
    }
  }

  // Merge horizontal runs into a single SVG path.
  const segments: string[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (bestModules[r * n + c]) {
        const start = c;
        while (c < n && bestModules[r * n + c]) c++;
        segments.push(`M${start + margin},${r + margin}h${c - start}v1h${start - c}z`);
      } else {
        c++;
      }
    }
  }

  return { viewSize: n + margin * 2, path: segments.join('') };
}
