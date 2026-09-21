import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { bookBySlug } from "@/lib/books";

type Params = { book: string; chapter: string };

function resolve({ book, chapter }: Params) {
  const b = bookBySlug(book);
  const c = Number(chapter);
  if (!b || !Number.isInteger(c) || c < 1 || c > b.chapters) return null;
  return { book: b, chapter: c };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = resolve(await params);
  return { title: found ? `${found.book.name} ${found.chapter}` : "Not found" };
}

export default async function ReadPage({ params }: { params: Promise<Params> }) {
  const found = resolve(await params);
  if (!found) notFound();
  // `key` resets selection, open commentary and recorder state whenever the chapter changes.
  return <Reader key={`${found.book.id}:${found.chapter}`} bookId={found.book.id} chapter={found.chapter} />;
}
