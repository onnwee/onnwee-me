import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allPosts } from '../scripts/posts';
import { DESCRIPTION } from '../site';

export async function GET(context: APIContext) {
  const posts = await allPosts();
  return rss({
    title: 'onnwee',
    description: DESCRIPTION,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      categories: p.data.tags,
      link: `/blog/${p.id}/`,
    })),
  });
}
