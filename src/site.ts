/* The things about this site that change: where to find its author and what they are doing now.
   The address of the site itself is `site` in astro.config.mjs. */

export type LinkIcon = 'code' | 'mail' | 'feed' | 'chat' | 'video' | 'open';

/* PLACEHOLDERS: the example.com addresses below are dummies until those accounts exist.
   Replace them, or delete a line to drop that icon. The email address and the feed are real. */
export const LINKS: { label: string; href: string; icon: LinkIcon }[] = [
  { label: 'Code', href: 'https://example.com/code', icon: 'code' },
  { label: 'Email', href: 'mailto:onnwee@subcult.tv', icon: 'mail' },
  { label: 'Chat', href: 'https://example.com/chat', icon: 'chat' },
  { label: 'Video', href: 'https://example.com/video', icon: 'video' },
  { label: 'RSS feed', href: '/rss.xml', icon: 'feed' },
];

/* One sentence on what is being worked on, and the day it was written. Shown on the home page. */
export const NOW = { text: 'Adding channels to this site.', date: '2026-11-11' };

export const DESCRIPTION = 'Software by onnwee: projects and notes from an account with no person attached.';
