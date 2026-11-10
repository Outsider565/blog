export type Language = 'zh' | 'en';
export type SiteSection = 'blog' | 'about';

export function pathTo(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function blogPath(language: Language, slug?: string): string {
  return sectionPath(language, 'blog', slug);
}

export function sectionPath(language: Language, section: SiteSection, slug?: string): string {
  return pathTo(`${language === 'en' ? 'en/' : ''}${slug ? `${slug}/` : ''}`);
}

export function assetPath(filename: string, article = 'puro'): string {
  return pathTo(`images/${article}/${filename}`);
}

export function localize<T>(values: readonly [T, T], language: Language): T {
  return values[language === 'en' ? 1 : 0];
}

export function dateLabel(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(date);
}
