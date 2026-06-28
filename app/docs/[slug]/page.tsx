import { notFound } from 'next/navigation';
import { getDocHtml, docs } from '../../../lib/docs';

export function generateStaticParams() {
  return docs.map((d) => ({ slug: d.slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { html, found } = getDocHtml(slug);
  if (!found) notFound();
  return (
    <article className="doc-content" dangerouslySetInnerHTML={{ __html: html }} />
  );
}