import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    stack: z.string(),
    state: z.string(),
    status: z.string(),
    order: z.number(),
    /** Where the source lives, and a running copy if there is one. */
    repo: z.url().optional(),
    url: z.url().optional(),
    /** Sites or tools built on this one, listed on its page. */
    downstream: z.array(z.object({ name: z.string(), summary: z.string(), url: z.url().optional(), repo: z.url().optional() })).default([]),
    sample: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** One or two sentences for the blog list and link previews. */
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    sample: z.boolean().default(false),
  }),
});

export const collections = { projects, notes };
