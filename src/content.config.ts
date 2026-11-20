import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const orderkeeper = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/orderkeeper' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { blog, orderkeeper };
