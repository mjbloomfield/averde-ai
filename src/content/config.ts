import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.string(),
    publishedDate: z.string().optional(),
    author: z.string().default('Mark Bloomfield'),
    seoDescription: z.string().optional(),
  }),
});

export const collections = { blog };
