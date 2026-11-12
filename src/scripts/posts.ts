import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'notes'>;

/** Every blog post, newest first. */
export async function allPosts(): Promise<Post[]> {
  return (await getCollection('notes')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
export const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Whole minutes to read, at 200 words a minute, never less than one. */
export const minutes = (post: Post) => Math.max(1, Math.round((post.body ?? '').split(/\s+/).filter(Boolean).length / 200));
