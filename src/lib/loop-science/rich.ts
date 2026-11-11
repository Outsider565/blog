// Text helpers for the talk slides: the Loop-μP label notation ($N$, ^{…},
// _{…}, [l:…]) plus **bold**, rendered to HTML, paragraphs or plain text.
import { html, plain } from '../loop-mup/markup';

/** Notation and **bold** → HTML. */
export function rich(source: string): string {
  return source.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2 ? `<strong>${html(part)}</strong>` : html(part)).join('');
}

/** Blank-line separated paragraphs → <p> elements. */
export const paragraphs = (source: string) => source.split(/\n\s*\n/).map(paragraph => `<p>${rich(paragraph.trim())}</p>`).join('');

/** Notation → plain Unicode, for aria labels, the slide list and the notes header. */
export const plainText = (source: string) => plain(source.replaceAll('**', ''));

/** Minutes → "m:ss". */
export function clock(minutes: number): string {
  const seconds = Math.round(minutes * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** One BibTeX entry's fields, enough to print a reference line. */
export function bibReference(source: string) {
  const field = (name: string) => source.match(new RegExp(`${name}\\s*=\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`))?.[1]?.trim() ?? '';
  const latex = (value: string) => value.replace(/\$\\mu\$/g, 'μ').replace(/[{}]/g, '');
  return {
    title: latex(field('title')),
    authors: field('author').split(/\s+and\s+/).map(name => name.trim()).filter(Boolean),
    year: field('year'),
    eprint: field('eprint'),
    url: field('url'),
  };
}
