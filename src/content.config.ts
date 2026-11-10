import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    titleEmphasis: z.string().optional(),
    subtitle: z.string(),
    description: z.string(),
    language: z.enum(['zh', 'en']),
    urlSlug: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string(),
    translationNotice: z.string().optional(),
    paper: z.url().optional(),
    repository: z.url().optional(),
    sections: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
  }),
});

export const collections = { blog };
