// The interactive Loop-μP figures by id. Every module turns a plain state
// object into markup; the figure wrapper renders the initial state at build
// time and the browser script re-renders after each control change.
import * as binomial from './binomial';
import * as cosine from './cosine-map';
import * as gradientCosine from './gradient-cosine';
import * as initNorm from './init-norm';
import * as ledger from './ledger';
import * as lrTransfer from './lr-transfer';
import type { Control, Lang, Table } from './markup';
import * as oneStep from './one-step';
import * as orthogonal from './orthogonal';
import * as passNorm from './pass-norm';
import * as paths from './paths';
import * as phase from './phase';
import * as vectorSum from './vector-sum';

export interface FigureModule {
  initial: object;
  controls(state: any, language: Lang): Control[];
  parse(key: string, value: string, state: any): object;
  view(state: any, language: Lang): string;
  table?(language: Lang): Table;
  /** Tooltip for row i, column j of a heatmap panel (0-based). */
  cell?(state: any, language: Lang, kind: any, i: number, j: number): string;
}

export const modules: Record<string, FigureModule> = {
  'vector-sum': vectorSum,
  'init-norm': initNorm,
  'init-cosine': { ...cosine, initial: cosine.initial('init') },
  ledger,
  orthogonal,
  paths,
  binomial,
  'gradient-cosine': gradientCosine,
  phase,
  'one-step': oneStep,
  'lr-transfer': lrTransfer,
  'trained-cosine': { ...cosine, initial: cosine.initial('trained') },
  'pass-norm': passNorm,
};
