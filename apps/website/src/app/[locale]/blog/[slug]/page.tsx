import { notFound } from 'next/navigation';

/** Blog posts come from the content API (not built yet), so every post URL is a 404 for now. */
export default function BlogPostPage(): never {
  notFound();
}
