import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(10),
    description: z.string().min(50).max(160),
    target_keyword: z.string().min(3),
    last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(z.string().url()).min(1),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([])
  })
});
export const collections = { guides };
