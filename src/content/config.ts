import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.string(),
    publishedDate: z.coerce.string().optional(),
    author: z.string().default('Mark Bloomfield'),
    seoDescription: z.string().optional(),
  }),
});

const industries = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    heroEyebrow: z.string(),
    heroHeadline: z.string(),
    heroDek: z.string(),
    heroCta: z.string().default('Get My Free Missed Call Audit'),
    painHeadline: z.string(),
    painPoints: z.array(z.object({ pain: z.string(), result: z.string() })),
    solutionHeadline: z.string(),
    solutionDek: z.string(),
    capabilities: z.array(z.string()),
    roiHeadline: z.string(),
    roiBody: z.string(),
    roiStats: z.array(z.object({ stat: z.string(), label: z.string() })).default([]),
    ctaHeadline: z.string(),
    ctaDek: z.string(),
  }),
});

export const collections = { blog, industries };
