export const locales = {
  zh: { html: 'zh-CN', openGraph: 'zh_CN' },
  en: { html: 'en', openGraph: 'en_US' },
} as const;

export interface ArticleMetadata {
  published: Date;
  updated?: Date;
  authors: string[];
  section: string;
  tags: string[];
  citation?: string;
}
